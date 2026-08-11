import { NextResponse } from "next/server";

import { iyzicoPost } from "@/lib/iyzico-rest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type InitializeBody = {
  token?: string;
};

type IyzicoInitializeResponse = {
  status?: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
};

function splitFullName(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/);

  return {
    name:
      parts.length > 1
        ? parts
            .slice(0, -1)
            .join(" ")
        : parts[0] ||
          "Misafir",

    surname:
      parts.length > 1
        ? parts.at(-1) ||
          "TUROBUS"
        : "TUROBUS",
  };
}

function normalizePhone(
  phone: string
) {
  const digits =
    phone.replace(
      /\D/g,
      ""
    );

  if (
    digits.startsWith("90")
  ) {
    return `+${digits}`;
  }

  if (
    digits.startsWith("0")
  ) {
    return `+90${digits.slice(
      1
    )}`;
  }

  return `+90${digits}`;
}

export async function POST(
  request: Request
) {
  try {
    const supabaseAdmin =
      getSupabaseAdmin();

    const body =
      (await request.json()) as InitializeBody;

    const publicToken =
      String(
        body.token || ""
      ).trim();

    if (!publicToken) {
      return NextResponse.json(
        {
          error:
            "Ödeme bağlantısı geçersiz.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: booking,
      error: bookingError,
    } =
      await supabaseAdmin
        .from(
          "package_bookings"
        )
        .select(`
          id,
          company_id,
          booking_code,
          customer_name,
          customer_phone,
          customer_email,
          destination,
          currency,
          sale_price,
          paid_amount,
          balance_amount,
          payment_status,
          status,
          public_token
        `)
        .eq(
          "public_token",
          publicToken
        )
        .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Paket rezervasyonu bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      booking.status ===
      "cancelled"
    ) {
      return NextResponse.json(
        {
          error:
            "İptal edilmiş rezervasyon ödenemez.",
        },
        {
          status: 409,
        }
      );
    }

    const balance =
      Number(
        booking.balance_amount
      );

    if (
      !Number.isFinite(
        balance
      ) ||
      balance <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Bu rezervasyonda ödenecek bakiye bulunmuyor.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      !booking.customer_phone
    ) {
      return NextResponse.json(
        {
          error:
            "Online ödeme için müşteri telefonu eksik.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !booking.customer_email
    ) {
      return NextResponse.json(
        {
          error:
            "Online ödeme için müşteri e-postası eksik.",
        },
        {
          status: 400,
        }
      );
    }

    const baseUrl = (
      process.env
        .NEXT_PUBLIC_SITE_URL ||
      new URL(
        request.url
      ).origin
    ).replace(/\/$/, "");

    const conversationId =
      crypto.randomUUID();

    const {
      name,
      surname,
    } = splitFullName(
      booking.customer_name
    );

    const callbackUrl =
      `${baseUrl}` +
      `/api/package-payments/iyzico/callback` +
      `?bookingId=${encodeURIComponent(
        booking.id
      )}`;

    const iyzicoBody = {
      locale: "tr",

      conversationId,

      price:
        balance.toFixed(2),

      paidPrice:
        balance.toFixed(2),

      currency:
        booking.currency ||
        "TRY",

      basketId:
        booking.booking_code,

      paymentGroup:
        "PRODUCT",

      callbackUrl,

      enabledInstallments: [
        1,
        2,
        3,
        6,
        9,
      ],

      paymentSource:
        "TUROBUS_PACKAGE_OS",

      buyer: {
        id: booking.id,

        name,
        surname,

        identityNumber:
          "11111111111",

        email:
          booking.customer_email,

        gsmNumber:
          normalizePhone(
            booking.customer_phone
          ),

        registrationAddress:
          "TUROBUS paket rezervasyonu",

        city:
          booking.destination ||
          "Muğla",

        country:
          "Türkiye",

        zipCode:
          "48300",

        ip:
          request.headers
            .get(
              "x-forwarded-for"
            )
            ?.split(",")[0]
            ?.trim() ||
          "127.0.0.1",
      },

      shippingAddress: {
        contactName:
          booking.customer_name,

        city:
          booking.destination ||
          "Muğla",

        country:
          "Türkiye",

        address:
          "TUROBUS paket rezervasyonu",

        zipCode:
          "48300",
      },

      billingAddress: {
        contactName:
          booking.customer_name,

        city:
          booking.destination ||
          "Muğla",

        country:
          "Türkiye",

        address:
          "TUROBUS paket rezervasyonu",

        zipCode:
          "48300",
      },

      basketItems: [
        {
          id:
            booking.id,

          name:
            `${booking.destination || "Tatil"} Paket Rezervasyonu`,

          category1:
            "Tatil Paketi",

          itemType:
            "VIRTUAL",

          price:
            balance.toFixed(2),
        },
      ],
    };

    const result =
      await iyzicoPost<IyzicoInitializeResponse>(
        {
          path:
            "/payment/iyzipos/checkoutform/initialize/auth/ecom",

          body:
            iyzicoBody,
        }
      );

    if (
      result.status !==
        "success" ||
      !result.token ||
      !result.paymentPageUrl
    ) {
      return NextResponse.json(
        {
          error:
            result.errorMessage ||
            "iyzico ödeme formu başlatılamadı.",

          code:
            result.errorCode,
        },
        {
          status: 502,
        }
      );
    }

    const {
      data: payment,
      error: paymentError,
    } =
      await supabaseAdmin
        .from(
          "package_customer_payments"
        )
        .insert({
          company_id:
            booking.company_id,

          booking_id:
            booking.id,

          amount:
            balance,

          currency:
            booking.currency ||
            "TRY",

          payment_method:
            "checkout_form",

          provider:
            "iyzico",

          provider_reference:
            result.token,

          status:
            "pending",

          metadata: {
            conversation_id:
              conversationId,

            checkout_token:
              result.token,

            payment_page_url:
              result.paymentPageUrl,

            source:
              "package_public_payment",
          },
        })
        .select(
          "id"
        )
        .single();

    if (paymentError) {
      throw paymentError;
    }

    return NextResponse.json({
      success: true,

      paymentId:
        payment.id,

      paymentPageUrl:
        result.paymentPageUrl,
    });
  } catch (error) {
    console.error(
      "Package iyzico initialize:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ödeme başlatılamadı.",
      },
      {
        status: 500,
      }
    );
  }
}
