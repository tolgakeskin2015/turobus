import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PaymentRequest = {
  reservationId?: string;
  result?: "success" | "failed";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PaymentRequest;

    if (!body.reservationId) {
      return NextResponse.json(
        { error: "Rezervasyon kimliği zorunludur." },
        { status: 400 }
      );
    }

    const paymentResult = body.result ?? "success";

    const { data: reservation, error: reservationError } =
      await supabaseAdmin
        .from("reservations")
        .select("id, total_price, status, payment_status")
        .eq("id", body.reservationId)
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

    if (reservation.payment_status === "paid") {
      return NextResponse.json(
        { error: "Bu rezervasyon daha önce ödenmiş." },
        { status: 409 }
      );
    }

    const paid = paymentResult === "success";
    const providerReference = `TEST-${Date.now()}`;

    const { data: payment, error: paymentError } =
      await supabaseAdmin
        .from("payments")
        .insert({
          reservation_id: reservation.id,
          provider: "manual",
          provider_reference: providerReference,
          amount: Number(reservation.total_price),
          currency: "TRY",
          status: paid ? "paid" : "failed",
          payment_method: "test_card",
          paid_at: paid ? new Date().toISOString() : null,
          metadata: {
            environment: "test",
            requested_result: paymentResult,
          },
        })
        .select("id, status, provider_reference")
        .single();

    if (paymentError) {
      throw paymentError;
    }

    const { error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({
        payment_status: paid ? "paid" : "failed",
        payment_reference: providerReference,
        status: paid ? "confirmed" : reservation.status,
      })
      .eq("id", reservation.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: paid,
      payment,
      message: paid
        ? "Test ödemesi başarıyla tamamlandı."
        : "Test ödemesi başarısız olarak kaydedildi.",
    });
  } catch (error) {
    console.error("Test ödeme hatası:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ödeme işlemi tamamlanamadı.",
      },
      { status: 500 }
    );
  }
}
