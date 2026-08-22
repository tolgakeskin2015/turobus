import { NextResponse } from "next/server";
import { iyzicoPost } from "@/lib/iyzico-rest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Body = {
  refundId?: string;
};

type JsonObject = Record<string, unknown>;

type RetrieveItem = {
  itemId?: string;
  paymentTransactionId?: string;
  price?: number;
  paidPrice?: number;
};

type RetrieveResponse = {
  status?: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  paymentStatus?: string;
  paymentId?: string;
  price?: number;
  paidPrice?: number;
  currency?: string;
  basketId?: string;
  paymentItems?: RetrieveItem[];
  paymentTransactions?: RetrieveItem[];
};

type RefundResponse = {
  status?: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  paymentId?: string;
  paymentTransactionId?: string;
  price?: number;
  currency?: string;
  hostReference?: string;
};

function objectValue(value: unknown): JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();

  let claimedRefundId = "";
  let attemptId = "";
  let actorId = "";

  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
    }

    const { data: userData, error: userError } = await admin.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
    }

    actorId = userData.user.id;

    const body = (await request.json()) as Body;

    if (!body.refundId) {
      return NextResponse.json({ error: "İade kaydı zorunludur." }, { status: 400 });
    }

    const { data: refund, error: refundError } = await admin
      .from("tour_change_refunds")
      .select(
        "id,company_id,case_id,tour_id,reservation_id,amount,currency,method,provider,status,provider_reference,provider_attempt_id,provider_started_at,metadata"
      )
      .eq("id", body.refundId)
      .maybeSingle();

    if (refundError) throw refundError;
    if (!refund) {
      return NextResponse.json({ error: "İade kaydı bulunamadı." }, { status: 404 });
    }

    const { data: membership } = await admin
      .from("company_members")
      .select("id,role,is_active")
      .eq("company_id", refund.company_id)
      .eq("user_id", actorId)
      .eq("is_active", true)
      .maybeSingle();

    if (
      !membership ||
      !["super_admin", "company_owner", "operation_manager", "accounting"].includes(
        membership.role
      )
    ) {
      return NextResponse.json(
        { error: "İade için finans yetkisi gerekli." },
        { status: 403 }
      );
    }

    if (refund.status === "paid") {
      return NextResponse.json({
        success: true,
        idempotent: true,
        refundId: refund.id,
        amount: Number(refund.amount),
        status: "paid",
      });
    }

    if (refund.method !== "provider" || refund.provider !== "iyzico") {
      return NextResponse.json(
        { error: "Bu kayıt iyzico provider iadesi değildir." },
        { status: 409 }
      );
    }

    if (refund.status === "processing" && refund.provider_attempt_id) {
      return NextResponse.json(
        {
          error:
            "Bu iade daha önce provider işlemine alınmış. Çift iade riskini önlemek için otomatik tekrar yapılmadı.",
        },
        { status: 409 }
      );
    }

    if (refund.status !== "approved") {
      return NextResponse.json(
        { error: "Provider iadesi finans onayında değil." },
        { status: 409 }
      );
    }

    if (!refund.reservation_id) {
      return NextResponse.json(
        { error: "İade kaydında rezervasyon bağlantısı yok." },
        { status: 409 }
      );
    }

    const amount = Number(refund.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "İade tutarı geçersiz." }, { status: 409 });
    }

    attemptId = crypto.randomUUID();

    const { data: claimed, error: claimError } = await admin
      .from("tour_change_refunds")
      .update({
        status: "processing",
        provider_attempt_id: attemptId,
        provider_started_at: new Date().toISOString(),
        provider_error: null,
      })
      .eq("id", refund.id)
      .eq("company_id", refund.company_id)
      .eq("status", "approved")
      .is("provider_attempt_id", null)
      .select("id")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return NextResponse.json(
        { error: "İade başka bir işlem tarafından alınmış. Çift provider çağrısı engellendi." },
        { status: 409 }
      );
    }

    claimedRefundId = refund.id;

    const { data: reservation, error: reservationError } = await admin
      .from("reservations")
      .select("id,company_id,reservation_code,total_price,payment_status,payment_reference")
      .eq("id", refund.reservation_id)
      .eq("company_id", refund.company_id)
      .maybeSingle();

    if (reservationError) throw reservationError;
    if (!reservation) throw new Error("Rezervasyon bulunamadı.");

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id,reservation_id,provider,provider_reference,amount,currency,status,metadata")
      .eq("reservation_id", reservation.id)
      .eq("provider", "iyzico")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) throw new Error("İyzico ile ödenmiş ödeme kaydı bulunamadı.");

    const paymentMetadata = objectValue(payment.metadata);
    const checkoutToken =
      stringValue(paymentMetadata.checkout_token) || stringValue(paymentMetadata.token);

    if (!checkoutToken) {
      throw new Error(
        "Ödeme kaydında iyzico checkout token bulunamadı. Güvenli transaction eşleştirmesi yapılamadı."
      );
    }

    const originalConversationId = stringValue(paymentMetadata.conversation_id);
    const retrieveConversationId = originalConversationId || crypto.randomUUID();

    const retrieve = await iyzicoPost<RetrieveResponse>({
      path: "/payment/iyzipos/checkoutform/auth/ecom/detail",
      body: {
        locale: "tr",
        conversationId: retrieveConversationId,
        token: checkoutToken,
      },
    });

    if (retrieve.status !== "success" || retrieve.paymentStatus !== "SUCCESS") {
      throw new Error(retrieve.errorMessage || "İyzico ödeme detayı doğrulanamadı.");
    }

    const expectedPaymentId =
      stringValue(paymentMetadata.iyzico_payment_id) || String(payment.provider_reference || "");

    if (
      expectedPaymentId &&
      retrieve.paymentId &&
      expectedPaymentId !== retrieve.paymentId
    ) {
      throw new Error("İyzico paymentId ödeme kaydıyla uyuşmuyor.");
    }

    const candidates = [
      ...(retrieve.paymentItems ?? []),
      ...(retrieve.paymentTransactions ?? []),
    ].filter((item) => Boolean(item.paymentTransactionId));

    const matching = candidates.find((item) => item.itemId === reservation.id);
    const uniqueTransactionIds = [
      ...new Set(
        candidates
          .map((item) => item.paymentTransactionId)
          .filter((value): value is string => Boolean(value))
      ),
    ];

    const transactionId =
      matching?.paymentTransactionId ||
      (uniqueTransactionIds.length === 1 ? uniqueTransactionIds[0] : "");

    if (!transactionId) {
      throw new Error(
        "İyzico paymentTransactionId kesin olarak eşleştirilemedi. Otomatik iade durduruldu."
      );
    }

    const originalPaidAmount = Number(
      retrieve.paidPrice ?? retrieve.price ?? payment.amount
    );

    if (!Number.isFinite(originalPaidAmount) || originalPaidAmount <= 0) {
      throw new Error("Orijinal iyzico ödeme tutarı doğrulanamadı.");
    }

    if (amount > originalPaidAmount + 0.01) {
      throw new Error("İade tutarı orijinal iyzico ödeme tutarını aşıyor.");
    }

    const currency = String(retrieve.currency || payment.currency || refund.currency || "TRY");

    if (currency !== String(refund.currency || "TRY")) {
      throw new Error("İade para birimi ile ödeme para birimi uyuşmuyor.");
    }

    const refundConversationId = crypto.randomUUID();

    const result = await iyzicoPost<RefundResponse>({
      path: "/payment/refund",
      body: {
        locale: "tr",
        conversationId: refundConversationId,
        paymentTransactionId: transactionId,
        price: amount.toFixed(2),
        currency,
        ip: clientIp(request),
      },
    });

    if (result.status !== "success") {
      const failure = result.errorMessage || "İyzico iadesi başarısız.";

      const { error: failureFinalizeError } = await admin.rpc(
        "fail_provider_tour_change_refund",
        {
          p_refund_id: refund.id,
          p_attempt_id: attemptId,
          p_actor_id: actorId,
          p_error: failure,
          p_metadata: {
            provider: "iyzico",
            error_code: result.errorCode || null,
            conversation_id: refundConversationId,
            payment_transaction_id: transactionId,
          },
        }
      );

      if (failureFinalizeError) {
        console.error("Provider refund failure finalizer:", failureFinalizeError);
      }

      claimedRefundId = "";

      return NextResponse.json(
        { error: failure, code: result.errorCode || null },
        { status: 502 }
      );
    }

    const providerReference =
      result.hostReference || result.paymentTransactionId || refundConversationId;

    const externalPaymentReference =
      result.paymentId || retrieve.paymentId || expectedPaymentId;

    const { data: finalized, error: finalizeError } = await admin.rpc(
      "finalize_provider_tour_change_refund",
      {
        p_refund_id: refund.id,
        p_attempt_id: attemptId,
        p_actor_id: actorId,
        p_provider_reference: providerReference,
        p_external_payment_reference: externalPaymentReference,
        p_metadata: {
          provider: "iyzico",
          conversation_id: refundConversationId,
          retrieve_conversation_id: retrieveConversationId,
          payment_transaction_id: transactionId,
          iyzico_payment_id: externalPaymentReference,
          returned_price: result.price ?? amount,
          currency: result.currency || currency,
          generic_payment_id: payment.id,
          checkout_token: checkoutToken,
          provider_success: true,
        },
      }
    );

    if (finalizeError) {
      console.error(
        "CRITICAL: iyzico refund succeeded but DB finalization failed:",
        finalizeError
      );

      return NextResponse.json(
        {
          error:
            "İyzico iadesi gerçekleşti fakat finans defteri kapanamadı. Aynı iadeyi tekrar ÇALIŞTIRMAYIN; manuel mutabakat gerekli.",
          providerRefundSucceeded: true,
          refundId: refund.id,
          providerReference,
          externalPaymentReference,
        },
        { status: 500 }
      );
    }

    claimedRefundId = "";

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount,
      currency,
      provider: "iyzico",
      providerReference,
      result: finalized,
    });
  } catch (error) {
    console.error("Tour iyzico refund:", error);

    const message =
      error instanceof Error ? error.message : "İade gerçekleştirilemedi.";

    if (claimedRefundId && attemptId && actorId) {
      try {
        await admin.rpc("fail_provider_tour_change_refund", {
          p_refund_id: claimedRefundId,
          p_attempt_id: attemptId,
          p_actor_id: actorId,
          p_error: message,
          p_metadata: {
            failure_source: "tour_iyzico_refund_api",
            failure_before_confirmed_provider_success: true,
          },
        });
      } catch (finalizeFailure) {
        console.error("Tour refund failure finalizer failed:", finalizeFailure);
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
