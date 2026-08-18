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
  status?: "success" | "failure";

  errorCode?: string;
  errorMessage?: string;

  conversationId?: string;

  token?: string;

  paymentStatus?: string;

  paymentId?: string;

  fraudStatus?: number;

  price?: number;

  paidPrice?: number;

  currency?: string;

  basketId?: string;

  itemTransactions?: Array<{
    paymentTransactionId?: string;
    price?: number;
    paidPrice?: number;
    transactionStatus?: number;
  }>;
};


async function callbackToken(
  request: Request
) {

  const type =
    request.headers.get(
      "content-type"
    ) ||
    "";


  if (
    type.includes(
      "application/x-www-form-urlencoded"
    ) ||
    type.includes(
      "multipart/form-data"
    )
  ) {

    const form =
      await request.formData();


    return String(
      form.get(
        "token"
      ) ||
      ""
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


function resultUrl(
  request: Request,
  token: string,
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
      `/activity-odeme/${token}`,
      baseUrl
    );


  url.searchParams.set(
    "payment",
    result
  );


  if (
    message
  ) {
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

  const admin =
    getSupabaseAdmin();


  const params =
    new URL(
      request.url
    ).searchParams;


  const paymentId =
    params.get(
      "paymentId"
    ) ||
    "";


  const guestToken =
    params.get(
      "guestToken"
    ) ||
    "";


  try {

    if (
      !paymentId ||
      !guestToken
    ) {

      return NextResponse.json(
        {
          error:
            "Ödeme callback bilgisi eksik.",
        },
        {
          status: 400,
        }
      );

    }


    const token =
      await callbackToken(
        request
      );


    if (
      !token
    ) {

      return NextResponse.redirect(
        resultUrl(
          request,
          guestToken,
          "failed",
          "Ödeme tokenı alınamadı."
        ),
        303
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
          "activity_os_payments"
        )
        .select(
          "id,booking_id,amount,currency,status,checkout_token,metadata"
        )
        .eq(
          "id",
          paymentId
        )
        .maybeSingle();


    if (
      paymentError
    ) {
      throw paymentError;
    }


    if (
      !payment
    ) {
      throw new Error(
        "Ödeme kaydı bulunamadı."
      );
    }


    if (
      payment.status ===
      "paid"
    ) {

      return NextResponse.redirect(
        resultUrl(
          request,
          guestToken,
          "success"
        ),
        303
      );

    }


    if (
      payment.checkout_token !==
      token
    ) {

      throw new Error(
        "Ödeme tokenı eşleşmiyor."
      );

    }


    const metadata =
      (
        typeof payment.metadata ===
          "object" &&
        payment.metadata !==
          null
      )
        ? payment.metadata as {
            conversation_id?: string;
          }
        : {};


    const retrieve =
      await iyzicoPost<RetrieveResponse>({
        path:
          "/payment/iyzipos/checkoutform/auth/ecom/detail",

        body: {
          locale:
            "tr",

          conversationId:
            metadata.conversation_id ||
            "",

          token,
        },
      });


    const expected =
      Number(
        payment.amount
      );


    const returned =
      Number(
        retrieve.paidPrice ??
        retrieve.price ??
        0
      );


    const amountMatches =
      Number.isFinite(
        returned
      ) &&
      Math.abs(
        expected -
        returned
      ) <
        0.01;


    const succeeded =
      retrieve.status ===
        "success" &&
      retrieve.paymentStatus ===
        "SUCCESS" &&
      amountMatches;


    if (
      !succeeded
    ) {

      const message =
        retrieve.errorMessage ||
        (
          !amountMatches
            ? "Ödeme tutarı eşleşmedi."
            : "Ödeme başarısız."
        );


      await admin.rpc(
        "activity_os_mark_provider_payment_failed",
        {
          p_payment_id:
            payment.id,

          p_error_message:
            message,

          p_metadata: {
            payment_status:
              retrieve.paymentStatus,

            error_code:
              retrieve.errorCode,

            fraud_status:
              retrieve.fraudStatus,

            returned_amount:
              returned,
          },
        }
      );


      return NextResponse.redirect(
        resultUrl(
          request,
          guestToken,
          "failed",
          message
        ),
        303
      );

    }


    const transactionId =
      retrieve
        .itemTransactions?.[0]
        ?.paymentTransactionId ||
      "";


    const {
      error:
        applyError,
    } =
      await admin.rpc(
        "activity_os_apply_provider_payment",
        {
          p_payment_id:
            payment.id,

          p_provider_payment_id:
            retrieve.paymentId ||
            "",

          p_provider_transaction_id:
            transactionId,

          p_provider_reference:
            retrieve.paymentId ||
            token,

          p_metadata: {
            checkout_token:
              token,

            payment_status:
              retrieve.paymentStatus,

            fraud_status:
              retrieve.fraudStatus,

            returned_amount:
              returned,

            currency:
              retrieve.currency,

            basket_id:
              retrieve.basketId,

            item_transactions:
              retrieve.itemTransactions ??
              [],
          },
        }
      );


    if (
      applyError
    ) {
      throw applyError;
    }


    return NextResponse.redirect(
      resultUrl(
        request,
        guestToken,
        "success"
      ),
      303
    );

  } catch (
    error
  ) {

    const message =
      error instanceof Error
        ? error.message
        : "Ödeme sonucu doğrulanamadı.";


    console.error(
      "Activity iyzico callback:",
      error
    );


    return NextResponse.redirect(
      resultUrl(
        request,
        guestToken ||
        "invalid",
        "failed",
        message
      ),
      303
    );

  }

}
