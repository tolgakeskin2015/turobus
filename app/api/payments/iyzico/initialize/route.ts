import { NextResponse } from "next/server";
import { iyzicoPost } from "@/lib/iyzico-rest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type InitializeBody = {
  reservationId?: string;
};

type IyzicoInitializeResponse = {
  status?: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
};

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  return {
    name:
      parts.length > 1
        ? parts.slice(0, -1).join(" ")
        : parts[0] || "Misafir",
    surname:
      parts.length > 1
        ? parts.at(-1) || "TUROBUS"
        : "TUROBUS",
  };
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("90")) return `+${digits}`;
  if (digits.startsWith("0")) return `+90${digits.slice(1)}`;

  return `+90${digits}`;
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await request.json()) as InitializeBody;

    if (!body.reservationId) {
      return NextResponse.json(
        { error: "Rezervasyon kimliği zorunludur." },
        { status: 400 }
      );
    }

    const { data: reservation, error: reservationError } =
      await supabaseAdmin
        .from("reservations")
        .select(
          "id, reservation_code, tour_title, full_name, email, phone, total_price, status, payment_status"
        )
        .eq("id", body.reservationId)
        .maybeSingle();

    if (reservationError) throw reservationError;

    if (!reservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı." },
        { status: 404 }
      );
    }

    if (reservation.status === "cancelled") {
      return NextResponse.json(
        { error: "İptal edilmiş rezervasyon ödenemez." },
        { status: 409 }
      );
    }

    if (reservation.payment_status === "paid") {
      return NextResponse.json(
        { error: "Bu rezervasyon daha önce ödenmiş." },
        { status: 409 }
      );
    }

    const totalPrice = Number(reservation.total_price);

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return NextResponse.json(
        { error: "Rezervasyon tutarı geçersiz." },
        { status: 400 }
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin
    ).replace(/\/$/, "");

    const conversationId = crypto.randomUUID();
    const { name, surname } = splitFullName(
      reservation.full_name
    );

    const callbackUrl =
      `${baseUrl}/api/payments/iyzico/callback` +
      `?reservationId=${encodeURIComponent(reservation.id)}`;

    const iyzicoBody = {
      locale: "tr",
      conversationId,
      price: totalPrice.toFixed(2),
      paidPrice: totalPrice.toFixed(2),
      currency: "TRY",
      basketId:
        reservation.reservation_code || reservation.id,
      paymentGroup: "PRODUCT",
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      paymentSource: "TUROBUS",

      buyer: {
        id: reservation.id,
        name,
        surname,
        identityNumber: "11111111111",
        email: reservation.email,
        gsmNumber: normalizePhone(reservation.phone),
        registrationAddress:
          "TUROBUS online tur rezervasyonu",
        city: "Muğla",
        country: "Türkiye",
        zipCode: "48300",
        ip:
          request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() || "127.0.0.1",
      },

      shippingAddress: {
        contactName: reservation.full_name,
        city: "Muğla",
        country: "Türkiye",
        address: "TUROBUS online tur rezervasyonu",
        zipCode: "48300",
      },

      billingAddress: {
        contactName: reservation.full_name,
        city: "Muğla",
        country: "Türkiye",
        address: "TUROBUS online tur rezervasyonu",
        zipCode: "48300",
      },

      basketItems: [
        {
          id: reservation.id,
          name: reservation.tour_title,
          category1: "Tur ve Aktivite",
          itemType: "VIRTUAL",
          price: totalPrice.toFixed(2),
        },
      ],
    };

    const result =
      await iyzicoPost<IyzicoInitializeResponse>({
        path:
          "/payment/iyzipos/checkoutform/initialize/auth/ecom",
        body: iyzicoBody,
      });

    if (
      result.status !== "success" ||
      !result.token ||
      !result.paymentPageUrl
    ) {
      return NextResponse.json(
        {
          error:
            result.errorMessage ||
            "iyzico ödeme formu başlatılamadı.",
          code: result.errorCode,
        },
        { status: 502 }
      );
    }

    const { data: payment, error: paymentError } =
      await supabaseAdmin
        .from("payments")
        .insert({
          reservation_id: reservation.id,
          provider: "iyzico",
          provider_reference: result.token,
          amount: totalPrice,
          currency: "TRY",
          status: "pending",
          payment_method: "checkout_form",
          metadata: {
            conversation_id: conversationId,
            token: result.token,
            payment_page_url: result.paymentPageUrl,
          },
        })
        .select("id")
        .single();

    if (paymentError) throw paymentError;

    const { error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({
        payment_status: "pending",
        payment_reference: result.token,
      })
      .eq("id", reservation.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      token: result.token,
      paymentPageUrl: result.paymentPageUrl,
    });
  } catch (error: unknown) {
    console.error("iyzico REST başlatma hatası:", error);

    let errorMessage = "Ödeme başlatılamadı.";
    let details: unknown = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      details = error.stack;
    } else if (
      typeof error === "object" &&
      error !== null
    ) {
      const objectError = error as {
        message?: string;
        code?: string;
        details?: unknown;
        hint?: unknown;
      };

      errorMessage =
        objectError.message ||
        JSON.stringify(error);

      details = {
        code: objectError.code,
        details: objectError.details,
        hint: objectError.hint,
      };
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details,
      },
      { status: 500 }
    );
  }
}
