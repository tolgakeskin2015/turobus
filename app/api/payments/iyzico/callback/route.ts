import { NextResponse } from "next/server";
import { iyzicoPost } from "@/lib/iyzico-rest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type IyzicoRetrieveResponse = {
  status?: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  token?: string;
  paymentStatus?: "SUCCESS" | "FAILURE";
  paymentId?: string;
  fraudStatus?: number;
  price?: number;
  paidPrice?: number;
  currency?: string;
  basketId?: string;
};

function redirectUrl(
  request: Request,
  reservationId: string,
  result: "success" | "failed",
  message?: string
) {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin
  ).replace(/\/$/, "");

  const url = new URL(
    `/dashboard/rezervasyonlar/${reservationId}`,
    baseUrl
  );

  url.searchParams.set("payment", result);

  if (message) {
    url.searchParams.set("message", message);
  }

  return url;
}

async function getCallbackToken(request: Request) {
  const contentType =
    request.headers.get("content-type") || "";

  if (
    contentType.includes(
      "application/x-www-form-urlencoded"
    ) ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();

    return String(formData.get("token") || "");
  }

  try {
    const body = (await request.json()) as {
      token?: string;
    };

    return body.token || "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  let reservationId =
    new URL(request.url).searchParams.get(
      "reservationId"
    ) || "";

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const token = await getCallbackToken(request);

    if (!reservationId) {
      return NextResponse.json(
        {
          error:
            "Callback adresinde rezervasyon kimliği bulunamadı.",
        },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.redirect(
        redirectUrl(
          request,
          reservationId,
          "failed",
          "İyzico ödeme tokenı alınamadı."
        ),
        303
      );
    }

    const { data: reservation, error: reservationError } =
      await supabaseAdmin
        .from("reservations")
        .select(
          "id, reservation_code, total_price, status, payment_status"
        )
        .eq("id", reservationId)
        .maybeSingle();

    if (reservationError) {
      throw reservationError;
    }

    if (!reservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı." },
        { status: 404 }
      );
    }

    const { data: payment, error: paymentError } =
      await supabaseAdmin
        .from("payments")
        .select(
          "id, reservation_id, provider_reference, amount, status, metadata"
        )
        .eq("reservation_id", reservation.id)
        .eq("provider", "iyzico")
        .eq("provider_reference", token)
        .order("created_at", {
          ascending: false,
        })
        .maybeSingle();

    if (paymentError) {
      throw paymentError;
    }

    if (!payment) {
      return NextResponse.redirect(
        redirectUrl(
          request,
          reservation.id,
          "failed",
          "Ödeme kaydı bulunamadı."
        ),
        303
      );
    }

    const conversationId =
      typeof payment.metadata === "object" &&
      payment.metadata !== null &&
      "conversation_id" in payment.metadata
        ? String(
            (
              payment.metadata as {
                conversation_id?: string;
              }
            ).conversation_id || ""
          )
        : "";

    const retrieveResult =
      await iyzicoPost<IyzicoRetrieveResponse>({
        path:
          "/payment/iyzipos/checkoutform/auth/ecom/detail",
        body: {
          locale: "tr",
          conversationId,
          token,
        },
      });

    const expectedAmount = Number(
      reservation.total_price
    );

    const returnedAmount = Number(
      retrieveResult.paidPrice ??
        retrieveResult.price ??
        0
    );

    const amountMatches =
      Number.isFinite(returnedAmount) &&
      Math.abs(returnedAmount - expectedAmount) <
        0.01;

    const paymentSucceeded =
      retrieveResult.status === "success" &&
      retrieveResult.paymentStatus === "SUCCESS" &&
      amountMatches;

    if (!paymentSucceeded) {
      const failureMessage =
        retrieveResult.errorMessage ||
        (!amountMatches
          ? "Ödeme tutarı rezervasyon tutarıyla uyuşmuyor."
          : "Ödeme başarısız oldu.");

      await supabaseAdmin
        .from("payments")
        .update({
          status: "failed",
          provider_reference:
            retrieveResult.paymentId || token,
          metadata: {
            ...(typeof payment.metadata ===
              "object" &&
            payment.metadata !== null
              ? payment.metadata
              : {}),
            checkout_token: token,
            iyzico_payment_id:
              retrieveResult.paymentId || null,
            payment_status:
              retrieveResult.paymentStatus || null,
            fraud_status:
              retrieveResult.fraudStatus ?? null,
            error_code:
              retrieveResult.errorCode || null,
            error_message: failureMessage,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      await supabaseAdmin
        .from("reservations")
        .update({
          payment_status: "failed",
          payment_reference:
            retrieveResult.paymentId || token,
        })
        .eq("id", reservation.id);

      return NextResponse.redirect(
        redirectUrl(
          request,
          reservation.id,
          "failed",
          failureMessage
        ),
        303
      );
    }

    const now = new Date().toISOString();

    const { error: paymentUpdateError } =
      await supabaseAdmin
        .from("payments")
        .update({
          status: "paid",
          provider_reference:
            retrieveResult.paymentId || token,
          paid_at: now,
          metadata: {
            ...(typeof payment.metadata ===
              "object" &&
            payment.metadata !== null
              ? payment.metadata
              : {}),
            checkout_token: token,
            iyzico_payment_id:
              retrieveResult.paymentId || null,
            payment_status:
              retrieveResult.paymentStatus,
            fraud_status:
              retrieveResult.fraudStatus ?? null,
            paid_price: returnedAmount,
            currency:
              retrieveResult.currency || "TRY",
            basket_id:
              retrieveResult.basketId || null,
          },
          updated_at: now,
        })
        .eq("id", payment.id);

    if (paymentUpdateError) {
      throw paymentUpdateError;
    }

    const { error: reservationUpdateError } =
      await supabaseAdmin
        .from("reservations")
        .update({
          status: "confirmed",
          payment_status: "paid",
          payment_reference:
            retrieveResult.paymentId || token,
        })
        .eq("id", reservation.id);

    if (reservationUpdateError) {
      throw reservationUpdateError;
    }

    return NextResponse.redirect(
      redirectUrl(
        request,
        reservation.id,
        "success"
      ),
      303
    );
  } catch (error: unknown) {
    console.error("İyzico callback hatası:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Ödeme sonucu doğrulanamadı.";

    if (reservationId) {
      return NextResponse.redirect(
        redirectUrl(
          request,
          reservationId,
          "failed",
          message
        ),
        303
      );
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
