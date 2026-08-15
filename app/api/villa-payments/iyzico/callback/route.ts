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

async function getToken(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const data = await request.formData();
    return String(data.get("token") || "");
  }

  try {
    const body = (await request.json()) as { token?: string };
    return body.token || "";
  } catch {
    return "";
  }
}

function returnUrl(request: Request, publicToken: string, result: "success" | "failed", message?: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const url = new URL(`/villa-odeme/${publicToken}`, baseUrl);
  url.searchParams.set("result", result);
  if (message) url.searchParams.set("message", message);
  return url;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const offerId = url.searchParams.get("offerId") || "";
  const publicToken = url.searchParams.get("publicToken") || "";

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const token = await getToken(request);

    if (!offerId || !publicToken || !token) {
      return NextResponse.json({ error: "Ödeme callback bilgileri eksik." }, { status: 400 });
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("villa_b2b_offer_payments")
      .select("id,offer_id,amount,currency,provider_reference,status,metadata")
      .eq("offer_id", offerId)
      .eq("provider", "iyzico")
      .eq("provider_reference", token)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (paymentError) throw paymentError;

    if (!payment) {
      return NextResponse.redirect(returnUrl(request, publicToken, "failed", "Ödeme kaydı bulunamadı."), 303);
    }

    const metadata = typeof payment.metadata === "object" && payment.metadata !== null
      ? (payment.metadata as Record<string, unknown>)
      : {};

    const conversationId = String(metadata.conversation_id || "");

    const result = await iyzicoPost<IyzicoRetrieveResponse>({
      path: "/payment/iyzipos/checkoutform/auth/ecom/detail",
      body: { locale: "tr", conversationId, token },
    });

    const expectedAmount = Number(payment.amount);
    const returnedAmount = Number(result.paidPrice ?? result.price ?? 0);
    const amountMatches = Number.isFinite(returnedAmount) && Math.abs(returnedAmount - expectedAmount) < 0.01;
    const succeeded = result.status === "success" && result.paymentStatus === "SUCCESS" && amountMatches;

    if (!succeeded) {
      const failure = result.errorMessage || (!amountMatches
        ? "Ödeme tutarı beklenen tutarla uyuşmuyor."
        : "Ödeme başarısız.");

      await supabaseAdmin
        .from("villa_b2b_offer_payments")
        .update({
          status: "failed",
          metadata: {
            ...metadata,
            checkout_token: token,
            iyzico_payment_id: result.paymentId || null,
            payment_status: result.paymentStatus || null,
            fraud_status: result.fraudStatus ?? null,
            error_code: result.errorCode || null,
            error_message: failure,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      await supabaseAdmin
        .from("villa_b2b_offers")
        .update({ payment_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", offerId);

      return NextResponse.redirect(returnUrl(request, publicToken, "failed", failure), 303);
    }

    const { data: finalize, error: finalizeError } = await supabaseAdmin.rpc(
      "finalize_villa_b2b_iyzico_payment",
      {
        p_payment_id: payment.id,
        p_provider_payment_id: result.paymentId || token,
        p_paid_amount: returnedAmount,
        p_metadata: {
          checkout_token: token,
          iyzico_payment_id: result.paymentId || null,
          payment_status: result.paymentStatus,
          fraud_status: result.fraudStatus ?? null,
          paid_price: returnedAmount,
          currency: result.currency || payment.currency,
          basket_id: result.basketId || null,
          finalized_at: new Date().toISOString(),
        },
      }
    );

    if (finalizeError) {
      await supabaseAdmin
        .from("villa_b2b_offer_payments")
        .update({
          metadata: {
            ...metadata,
            iyzico_payment_id: result.paymentId || null,
            payment_received_but_finalize_failed: true,
            finalize_error: finalizeError.message,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      console.error("Villa payment received but finalize failed:", finalizeError);
      return NextResponse.redirect(
        returnUrl(request, publicToken, "failed", "Ödeme alındı. Rezervasyon doğrulaması için ekibimiz işlemi kontrol ediyor."),
        303
      );
    }

    console.log("Villa B2B payment finalized:", finalize);
    return NextResponse.redirect(returnUrl(request, publicToken, "success"), 303);
  } catch (error) {
    console.error("Villa iyzico callback:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ödeme sonucu doğrulanamadı." },
      { status: 500 }
    );
  }
}
