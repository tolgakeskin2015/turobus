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


type InitializeBody = {
  token?: string;
};


type Payable = {
  ok: boolean;
  link_id: string;
  booking_id: string;
  company_id: string;
  booking_code: string;
  customer_name: string;
  customer_phone:
    string | null;
  customer_email:
    string | null;
  amount: number;
  currency: string;
};


type IyzicoResponse = {
  status?:
    "success" |
    "failure";

  errorCode?: string;
  errorMessage?: string;

  conversationId?: string;
  token?: string;
  paymentPageUrl?: string;
};


function splitName(
  value: string
) {
  const parts =
    value
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
  try {

    const admin =
      getSupabaseAdmin();

    const body =
      (
        await request.json()
      ) as
        InitializeBody;

    const publicToken =
      String(
        body.token ||
        ""
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
      data,
      error,
    } =
      await admin.rpc(
        "check_yacht_payment_link_payable",
        {
          p_token:
            publicToken,
        }
      );


    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 409,
        }
      );
    }


    const payable =
      data as
        Payable;


    const amount =
      Number(
        payable.amount
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
            "Ödenecek tutar bulunamadı.",
        },
        {
          status: 409,
        }
      );
    }


    if (
      !payable.customer_phone
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
      !payable.customer_email
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
      splitName(
        payable.customer_name
      );


    const callbackUrl =
      `${baseUrl}/api/yacht-payments/iyzico/callback` +
      `?paymentLinkId=${encodeURIComponent(
        payable.link_id
      )}` +
      `&publicToken=${encodeURIComponent(
        publicToken
      )}`;


    const iyzicoBody = {

      locale:
        "tr",

      conversationId,

      price:
        amount.toFixed(
          2
        ),

      paidPrice:
        amount.toFixed(
          2
        ),

      currency:
        payable.currency ||
        "TRY",

      basketId:
        payable.booking_code,

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

      paymentSource:
        "TUROBUS_YACHT_OS",

      buyer: {
        id:
          payable.booking_id,

        name,
        surname,

        identityNumber:
          "11111111111",

        email:
          payable.customer_email,

        gsmNumber:
          phone(
            payable.customer_phone
          ),

        registrationAddress:
          "TUROBUS yat rezervasyonu",

        city:
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
          payable.customer_name,

        city:
          "Muğla",

        country:
          "Türkiye",

        address:
          "TUROBUS yat rezervasyonu",

        zipCode:
          "48300",
      },

      billingAddress: {
        contactName:
          payable.customer_name,

        city:
          "Muğla",

        country:
          "Türkiye",

        address:
          "TUROBUS yat rezervasyonu",

        zipCode:
          "48300",
      },

      basketItems: [
        {
          id:
            payable.booking_id,

          name:
            `Yat Rezervasyonu ${payable.booking_code}`,

          category1:
            "Yat ve Tekne",

          itemType:
            "VIRTUAL",

          price:
            amount.toFixed(
              2
            ),
        },
      ],
    };


    const result =
      await iyzicoPost<
        IyzicoResponse
      >({
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
      data:
        payment,
      error:
        paymentError,
    } =
      await admin
        .from(
          "yacht_os_payments"
        )
        .insert({
          company_id:
            payable.company_id,

          booking_id:
            payable.booking_id,

          payment_link_id:
            payable.link_id,

          amount,

          currency:
            payable.currency ||
            "TRY",

          payment_method:
            "iyzico",

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

    console.error(
      "Yacht iyzico initialize:",
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
