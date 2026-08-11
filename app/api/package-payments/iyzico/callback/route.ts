import { NextResponse } from "next/server";

import { iyzicoPost } from "@/lib/iyzico-rest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type IyzicoRetrieveResponse = {
  status?:
    | "success"
    | "failure";

  errorCode?: string;
  errorMessage?: string;

  conversationId?: string;

  token?: string;

  paymentStatus?:
    | "SUCCESS"
    | "FAILURE";

  paymentId?: string;

  fraudStatus?: number;

  price?: number;
  paidPrice?: number;

  currency?: string;
  basketId?: string;
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
      data.get("token") ||
        ""
    );
  }

  try {
    const body =
      (await request.json()) as {
        token?: string;
      };

    return body.token || "";
  } catch {
    return "";
  }
}

function paymentReturnUrl(
  request: Request,
  publicToken: string,
  result:
    | "success"
    | "failed",
  message?: string
) {
  const baseUrl = (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    new URL(
      request.url
    ).origin
  ).replace(/\/$/, "");

  const url =
    new URL(
      `/odeme/${publicToken}`,
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
  const bookingId =
    new URL(
      request.url
    ).searchParams.get(
      "bookingId"
    ) || "";

  try {
    const supabaseAdmin =
      getSupabaseAdmin();

    const token =
      await getToken(
        request
      );

    if (
      !bookingId ||
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
          currency,
          public_token,
          status
        `)
        .eq(
          "id",
          bookingId
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

    const {
      data: payment,
      error: paymentError,
    } =
      await supabaseAdmin
        .from(
          "package_customer_payments"
        )
        .select(`
          id,
          booking_id,
          amount,
          currency,
          provider_reference,
          status,
          metadata
        `)
        .eq(
          "booking_id",
          booking.id
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
            ascending: false,
          }
        )
        .maybeSingle();

    if (paymentError) {
      throw paymentError;
    }

    if (!payment) {
      return NextResponse.redirect(
        paymentReturnUrl(
          request,
          booking.public_token,
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
        ? payment.metadata as Record<
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
      await iyzicoPost<IyzicoRetrieveResponse>(
        {
          path:
            "/payment/iyzipos/checkoutform/auth/ecom/detail",

          body: {
            locale:
              "tr",

            conversationId,

            token,
          },
        }
      );

    const expectedAmount =
      Number(
        payment.amount
      );

    const returnedAmount =
      Number(
        result.paidPrice ??
          result.price ??
          0
      );

    const amountMatches =
      Number.isFinite(
        returnedAmount
      ) &&
      Math.abs(
        returnedAmount -
          expectedAmount
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

      await supabaseAdmin
        .from(
          "package_customer_payments"
        )
        .update({
          status:
            "failed",

          metadata: {
            ...metadata,

            checkout_token:
              token,

            iyzico_payment_id:
              result.paymentId ||
              null,

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
        paymentReturnUrl(
          request,
          booking.public_token,
          "failed",
          failure
        ),
        303
      );
    }

    const {
      data: finalize,
      error: finalizeError,
    } =
      await supabaseAdmin.rpc(
        "finalize_package_iyzico_payment",
        {
          p_payment_id:
            payment.id,

          p_provider_reference:
            result.paymentId ||
            token,

          p_paid_amount:
            returnedAmount,

          p_metadata: {
            checkout_token:
              token,

            iyzico_payment_id:
              result.paymentId ||
              null,

            payment_status:
              result.paymentStatus,

            fraud_status:
              result.fraudStatus ??
              null,

            paid_price:
              returnedAmount,

            currency:
              result.currency ||
              payment.currency,

            basket_id:
              result.basketId ||
              null,

            finalized_at:
              new Date().toISOString(),
          },
        }
      );

    if (finalizeError) {
      throw finalizeError;
    }

    console.log(
      "Package payment finalized:",
      finalize
    );

    return NextResponse.redirect(
      paymentReturnUrl(
        request,
        booking.public_token,
        "success"
      ),
      303
    );
  } catch (error) {
    console.error(
      "Package iyzico callback:",
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
