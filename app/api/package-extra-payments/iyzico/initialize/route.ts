import { NextResponse } from "next/server";

import {
  iyzicoPost,
} from "@/lib/iyzico-rest";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";


export const runtime =
  "nodejs";


type InitializeBody = {
  orderToken?: string;
};


type IyzicoInitializeResponse = {
  status?:
    | "success"
    | "failure";

  errorCode?: string;

  errorMessage?: string;

  conversationId?: string;

  token?: string;

  paymentPageUrl?: string;
};


function splitFullName(
  fullName: string
) {
  const parts =
    fullName
      .trim()
      .split(/\s+/);


  return {
    name:
      parts.length > 1
        ? parts
            .slice(
              0,
              -1
            )
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
    digits.startsWith(
      "90"
    )
  ) {
    return `+${digits}`;
  }


  if (
    digits.startsWith(
      "0"
    )
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
      await request.json() as InitializeBody;


    const orderToken =
      String(
        body.orderToken ||
        ""
      ).trim();


    if (!orderToken) {
      return NextResponse.json(
        {
          error:
            "Ekstra ödeme bağlantısı geçersiz.",
        },
        {
          status: 400,
        }
      );
    }


    const {
      data: order,
      error: orderError,
    } =
      await supabaseAdmin
        .from(
          "package_extra_orders"
        )
        .select(`
          id,
          company_id,
          booking_id,
          public_token,
          currency,
          sale_price,
          status,
          operation_status,
          payment_provider,
          payment_reference,
          metadata
        `)
        .eq(
          "public_token",
          orderToken
        )
        .maybeSingle();


    if (orderError) {
      throw orderError;
    }


    if (!order) {
      return NextResponse.json(
        {
          error:
            "Ekstra sipariş bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }


    if (
      order.status ===
      "paid"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu ekstra sipariş zaten ödendi.",
        },
        {
          status: 409,
        }
      );
    }


    if (
      order.status ===
        "cancelled" ||
      order.status ===
        "expired"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu ekstra sipariş ödeme için uygun değil.",
        },
        {
          status: 409,
        }
      );
    }


    const amount =
      Number(
        order.sale_price
      );


    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Ekstra sipariş tutarı geçersiz.",
        },
        {
          status: 409,
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
          booking_code,
          customer_name,
          customer_phone,
          customer_email,
          destination,
          status,
          public_token
        `)
        .eq(
          "id",
          order.booking_id
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
            "İptal edilmiş rezervasyon için ekstra ödeme yapılamaz.",
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


    const {
      data: items,
      error: itemError,
    } =
      await supabaseAdmin
        .from(
          "package_extra_order_items"
        )
        .select(`
          id,
          name,
          quantity,
          total_sale_price
        `)
        .eq(
          "order_id",
          order.id
        )
        .order(
          "created_at"
        );


    if (itemError) {
      throw itemError;
    }


    if (
      !items ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Ekstra sipariş hizmeti bulunamadı.",
        },
        {
          status: 409,
        }
      );
    }


    const baseUrl =
      (
        process.env
          .NEXT_PUBLIC_SITE_URL ||
        new URL(
          request.url
        ).origin
      ).replace(
        /\/$/,
        ""
      );


    const conversationId =
      crypto.randomUUID();


    const {
      name,
      surname,
    } =
      splitFullName(
        booking.customer_name
      );


    const callbackUrl =
      `${baseUrl}` +
      `/api/package-extra-payments/iyzico/callback` +
      `?orderId=${encodeURIComponent(
        order.id
      )}`;


    const iyzicoBody = {

      locale:
        "tr",

      conversationId,

      price:
        amount.toFixed(2),

      paidPrice:
        amount.toFixed(2),

      currency:
        order.currency ||
        "TRY",

      basketId:
        `EXTRA-${order.id}`,

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
        "TUROBUS_PACKAGE_EXTRA",

      buyer: {

        id:
          booking.id,

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
          "TUROBUS ekstra hizmet",

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
          "TUROBUS ekstra hizmet",

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
          "TUROBUS ekstra hizmet",

        zipCode:
          "48300",
      },


      basketItems:
        items.map(
          item => ({
            id:
              item.id,

            name:
              item.name,

            category1:
              "Ekstra Aktivite",

            itemType:
              "VIRTUAL",

            price:
              Number(
                item.total_sale_price
              ).toFixed(2),
          })
        ),
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
            "iyzico ekstra ödeme formu başlatılamadı.",

          code:
            result.errorCode,
        },
        {
          status: 502,
        }
      );
    }


    const previousMetadata =
      (
        typeof order.metadata ===
          "object" &&
        order.metadata !== null
      )
        ? order.metadata as Record<
            string,
            unknown
          >
        : {};


    const {
      error: updateError,
    } =
      await supabaseAdmin
        .from(
          "package_extra_orders"
        )
        .update({
          payment_provider:
            "iyzico",

          payment_reference:
            result.token,

          metadata: {
            ...previousMetadata,

            payment_conversation_id:
              conversationId,

            checkout_token:
              result.token,

            payment_page_url:
              result.paymentPageUrl,

            payment_initialized_at:
              new Date()
                .toISOString(),

            payment_source:
              "package_extra_public_payment",
          },
        })
        .eq(
          "id",
          order.id
        );


    if (updateError) {
      throw updateError;
    }


    return NextResponse.json({
      success:
        true,

      paymentPageUrl:
        result.paymentPageUrl,
    });


  } catch (error) {

    console.error(
      "Package extra iyzico initialize:",
      error
    );


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ekstra ödeme başlatılamadı.",
      },
      {
        status: 500,
      }
    );

  }
}
