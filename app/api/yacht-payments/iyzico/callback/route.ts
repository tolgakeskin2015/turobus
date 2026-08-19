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


type RetrieveResponse = {
  status?:
    "success" |
    "failure";

  errorCode?: string;
  errorMessage?: string;

  conversationId?: string;

  token?: string;

  paymentStatus?:
    "SUCCESS" |
    "FAILURE";

  paymentId?: string;

  fraudStatus?: number;

  price?: number;
  paidPrice?: number;

  currency?: string;
  basketId?: string;

  itemTransactions?:
    Array<{
      paymentTransactionId?: string;
    }>;
};


async function getToken(
  request: Request
) {
  const contentType =
    request.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/x-www-form-urlencoded"
    ) ||
    contentType.includes(
      "multipart/form-data"
    )
  ) {
    const data =
      await request.formData();

    return String(
      data.get(
        "token"
      ) || ""
    );
  }


  try {
    const body =
      (
        await request.json()
      ) as {
        token?: string;
      };

    return body.token ||
      "";
  } catch {
    return "";
  }
}


function returnUrl(
  request: Request,
  publicToken: string,
  result:
    "success" |
    "failed",
  message?: string
) {
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

  const url =
    new URL(
      `/yat-odeme/${publicToken}`,
      baseUrl
    );

  url.searchParams.set(
    "result",
    result
  );

  if (message) {
    url.searchParams.set(
      "message",
      message
    );
  }

  return url;
}


export async function POST(
  request: Request
) {
  const url =
    new URL(
      request.url
    );

  const paymentLinkId =
    url.searchParams.get(
      "paymentLinkId"
    ) || "";

  const publicToken =
    url.searchParams.get(
      "publicToken"
    ) || "";


  try {

    const admin =
      getSupabaseAdmin();

    const token =
      await getToken(
        request
      );


    if (
      !paymentLinkId ||
      !publicToken ||
      !token
    ) {
      return NextResponse.json(
        {
          error:
            "Ödeme callback bilgileri eksik.",
        },
        {
          status: 400,
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
        .select(
          "id,booking_id,payment_link_id,amount,currency,provider_reference,status,metadata"
        )
        .eq(
          "payment_link_id",
          paymentLinkId
        )
        .eq(
          "provider",
          "iyzico"
        )
        .eq(
          "provider_reference",
          token
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .maybeSingle();


    if (
      paymentError
    ) {
      throw paymentError;
    }


    if (!payment) {
      return NextResponse.redirect(
        returnUrl(
          request,
          publicToken,
          "failed",
          "Ödeme kaydı bulunamadı."
        ),
        303
      );
    }


    const metadata =
      typeof payment.metadata ===
        "object" &&
      payment.metadata !== null
        ? payment.metadata as
            Record<
              string,
              unknown
            >
        : {};


    const conversationId =
      String(
        metadata.conversation_id ||
        ""
      );


    const result =
      await iyzicoPost<
        RetrieveResponse
      >({
        path:
          "/payment/iyzipos/checkoutform/auth/ecom/detail",

        body: {
          locale:
            "tr",

          conversationId,

          token,
        },
      });


    const expected =
      Number(
        payment.amount
      );

    const returned =
      Number(
        result.paidPrice ??
        result.price ??
        0
      );


    const amountMatches =
      Number.isFinite(
        returned
      ) &&
      Math.abs(
        returned -
        expected
      ) < 0.01;


    const succeeded =
      result.status ===
        "success" &&
      result.paymentStatus ===
        "SUCCESS" &&
      amountMatches;


    if (!succeeded) {

      const failure =
        result.errorMessage ||
        (
          !amountMatches
            ? "Ödeme tutarı beklenen tutarla uyuşmuyor."
            : "Ödeme başarısız."
        );


      await admin
        .from(
          "yacht_os_payments"
        )
        .update({
          status:
            "failed",

          metadata: {
            ...metadata,

            payment_status:
              result.paymentStatus ||
              null,

            fraud_status:
              result.fraudStatus ??
              null,

            error_code:
              result.errorCode ||
              null,

            error_message:
              failure,
          },
        })
        .eq(
          "id",
          payment.id
        );


      return NextResponse.redirect(
        returnUrl(
          request,
          publicToken,
          "failed",
          failure
        ),
        303
      );
    }


    const transactionId =
      result
        .itemTransactions
        ?.[0]
        ?.paymentTransactionId ||
      "";


    const {
      error:
        finalizeError,
    } =
      await admin.rpc(
        "finalize_yacht_iyzico_payment",
        {
          p_payment_id:
            payment.id,

          p_provider_payment_id:
            result.paymentId ||
            token,

          p_provider_transaction_id:
            transactionId,

          p_paid_amount:
            returned,

          p_metadata: {
            checkout_token:
              token,

            iyzico_payment_id:
              result.paymentId ||
              null,

            payment_transaction_id:
              transactionId ||
              null,

            fraud_status:
              result.fraudStatus ??
              null,

            paid_price:
              returned,

            currency:
              result.currency ||
              payment.currency,

            basket_id:
              result.basketId ||
              null,

            finalized_at:
              new Date()
                .toISOString(),
          },
        }
      );


    if (
      finalizeError
    ) {
      console.error(
        "Yacht payment finalize failed:",
        finalizeError
      );

      return NextResponse.redirect(
        returnUrl(
          request,
          publicToken,
          "failed",
          "Ödeme alındı. Finans ekibimiz işlemi doğruluyor."
        ),
        303
      );
    }


    return NextResponse.redirect(
      returnUrl(
        request,
        publicToken,
        "success"
      ),
      303
    );

  } catch (
    error
  ) {

    console.error(
      "Yacht iyzico callback:",
      error
    );


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ödeme sonucu doğrulanamadı.",
      },
      {
        status: 500,
      }
    );

  }
}
