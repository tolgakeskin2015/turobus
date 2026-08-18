import {
  NextResponse,
} from "next/server";

import {
  iyzicoPost,
} from "@/lib/iyzico-rest";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";


export const runtime =
  "nodejs";


type Body = {
  guestToken?: string;

  identityNumber?: string;

  email?: string;
  phone?: string;

  billingAddress?: string;
  billingCity?: string;
};


type InitializeResponse = {
  status?: "success" | "failure";

  errorCode?: string;
  errorMessage?: string;

  conversationId?: string;

  token?: string;

  checkoutFormContent?: string;

  paymentPageUrl?: string;
};


function splitName(
  fullName: string
) {

  const parts =
    fullName
      .trim()
      .split(
        /\s+/
      );


  return {
    name:
      parts.length > 1
        ? parts
            .slice(
              0,
              -1
            )
            .join(
              " "
            )
        : parts[0] ||
          "Misafir",

    surname:
      parts.length > 1
        ? parts.at(
            -1
          ) ||
          "TUROBUS"
        : "TUROBUS",
  };

}


function phone(
  value: string
) {

  const digits =
    value.replace(
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

  const admin =
    getSupabaseAdmin();


  let paymentId =
    "";


  try {

    const body =
      (
        await request.json()
      ) as Body;


    if (
      !body.guestToken
    ) {

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


    if (
      !body.identityNumber?.trim()
    ) {

      return NextResponse.json(
        {
          error:
            "T.C. Kimlik / Pasaport numarası zorunludur.",
        },
        {
          status: 400,
        }
      );

    }


    if (
      !body.billingAddress?.trim() ||
      !body.billingCity?.trim()
    ) {

      return NextResponse.json(
        {
          error:
            "Fatura adresi ve şehir zorunludur.",
        },
        {
          status: 400,
        }
      );

    }


    const {
      data:
        booking,
      error:
        bookingError,
    } =
      await admin
        .from(
          "activity_os_bookings"
        )
        .select(
          "id,company_id,booking_code,activity_id,customer_name,customer_email,customer_phone,sale_total,paid_total,status,payment_status,guest_token"
        )
        .eq(
          "guest_token",
          body.guestToken
        )
        .maybeSingle();


    if (
      bookingError
    ) {
      throw bookingError;
    }


    if (
      !booking
    ) {

      return NextResponse.json(
        {
          error:
            "Rezervasyon bulunamadı.",
        },
        {
          status: 404,
        }
      );

    }


    if (
      booking.status ===
        "cancelled" ||
      booking.status ===
        "no_show"
    ) {

      return NextResponse.json(
        {
          error:
            "Bu rezervasyon için ödeme alınamaz.",
        },
        {
          status: 409,
        }
      );

    }


    const remaining =
      Math.max(
        Number(
          booking.sale_total
        ) -
        Number(
          booking.paid_total
        ),
        0
      );


    if (
      remaining <= 0
    ) {

      return NextResponse.json(
        {
          error:
            "Bu rezervasyonun kalan ödemesi bulunmuyor.",
        },
        {
          status: 409,
        }
      );

    }


    const email =
      body.email?.trim() ||
      booking.customer_email;


    const rawPhone =
      body.phone?.trim() ||
      booking.customer_phone;


    if (
      !email ||
      !rawPhone
    ) {

      return NextResponse.json(
        {
          error:
            "Ödeme için e-posta ve telefon bilgisi zorunludur.",
        },
        {
          status: 400,
        }
      );

    }


    const {
      data:
        activity,
      error:
        activityError,
    } =
      await admin
        .from(
          "package_activities"
        )
        .select(
          "id,name,currency"
        )
        .eq(
          "id",
          booking.activity_id
        )
        .maybeSingle();


    if (
      activityError
    ) {
      throw activityError;
    }


    if (
      !activity
    ) {
      throw new Error(
        "Aktivite bulunamadı."
      );
    }


    const conversationId =
      crypto.randomUUID();


    const {
      data:
        payment,
      error:
        paymentError,
    } =
      await admin
        .from(
          "activity_os_payments"
        )
        .insert({
          company_id:
            booking.company_id,

          booking_id:
            booking.id,

          payment_type:
            "collection",

          payment_method:
            "online",

          amount:
            remaining,

          currency:
            activity.currency ||
            "TRY",

          provider:
            "iyzico",

          status:
            "initiating",

          metadata: {
            conversation_id:
              conversationId,

            guest_token:
              body.guestToken,
          },
        })
        .select(
          "id"
        )
        .single();


    if (
      paymentError
    ) {
      throw paymentError;
    }


    paymentId =
      payment.id;


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


    const callbackUrl =
      `${baseUrl}/api/activity-payments/iyzico/callback` +
      `?paymentId=${encodeURIComponent(
        payment.id
      )}` +
      `&guestToken=${encodeURIComponent(
        body.guestToken
      )}`;


    const {
      name,
      surname,
    } =
      splitName(
        booking.customer_name
      );


    const iyzicoBody = {
      locale:
        "tr",

      conversationId,

      price:
        remaining.toFixed(
          2
        ),

      paidPrice:
        remaining.toFixed(
          2
        ),

      currency:
        activity.currency ||
        "TRY",

      basketId:
        booking.booking_code,

      paymentGroup:
        "PRODUCT",

      callbackUrl,

      enabledInstallments:
        [
          1,
          2,
          3,
          6,
          9,
        ],

      buyer: {
        id:
          booking.id,

        name,
        surname,

        identityNumber:
          body.identityNumber.trim(),

        email,

        gsmNumber:
          phone(
            rawPhone
          ),

        registrationAddress:
          body.billingAddress.trim(),

        city:
          body.billingCity.trim(),

        country:
          "Türkiye",

        zipCode:
          "00000",

        ip:
          request.headers
            .get(
              "x-forwarded-for"
            )
            ?.split(
              ","
            )[0]
            ?.trim() ||
          "127.0.0.1",
      },

      billingAddress: {
        contactName:
          booking.customer_name,

        city:
          body.billingCity.trim(),

        country:
          "Türkiye",

        address:
          body.billingAddress.trim(),

        zipCode:
          "00000",
      },

      basketItems: [
        {
          id:
            booking.id,

          name:
            activity.name,

          category1:
            "Aktivite",

          itemType:
            "VIRTUAL",

          price:
            remaining.toFixed(
              2
            ),
        },
      ],
    };


    const result =
      await iyzicoPost<InitializeResponse>({
        path:
          "/payment/iyzipos/checkoutform/initialize/auth/ecom",

        body:
          iyzicoBody,
      });


    if (
      result.status !==
        "success" ||
      !result.token ||
      !result.paymentPageUrl
    ) {

      await admin
        .from(
          "activity_os_payments"
        )
        .update({
          status:
            "failed",

          metadata: {
            conversation_id:
              conversationId,

            guest_token:
              body.guestToken,

            error_code:
              result.errorCode,

            error_message:
              result.errorMessage,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          payment.id
        );


      return NextResponse.json(
        {
          error:
            result.errorMessage ||
            "Ödeme formu başlatılamadı.",
        },
        {
          status: 502,
        }
      );

    }


    const {
      error:
        updateError,
    } =
      await admin
        .from(
          "activity_os_payments"
        )
        .update({
          checkout_token:
            result.token,

          provider_reference:
            result.token,

          status:
            "pending",

          metadata: {
            conversation_id:
              conversationId,

            guest_token:
              body.guestToken,

            payment_page_url:
              result.paymentPageUrl,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          payment.id
        );


    if (
      updateError
    ) {
      throw updateError;
    }


    return NextResponse.json({
      success:
        true,

      paymentId:
        payment.id,

      paymentPageUrl:
        result.paymentPageUrl,
    });

  } catch (
    error
  ) {

    const message =
      error instanceof Error
        ? error.message
        : "Ödeme başlatılamadı.";


    if (
      paymentId
    ) {

      await admin
        .from(
          "activity_os_payments"
        )
        .update({
          status:
            "failed",

          metadata: {
            error_message:
              message,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          paymentId
        );

    }


    console.error(
      "Activity iyzico initialize:",
      error
    );


    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status: 500,
      }
    );

  }

}
