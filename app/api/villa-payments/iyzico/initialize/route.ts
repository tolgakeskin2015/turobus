import { NextResponse } from "next/server";

import { iyzicoPost } from "@/lib/iyzico-rest";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type InitializeBody = { token?: string };

type Payable = {
  ok?: boolean;
  already_paid?: boolean;
  offer_id: string;
  partner_company_id: string;
  owner_company_id: string;
  villa_id: string;
  offer_code: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  amount: number;
  currency: string;
  reservation_id: string | null;
};

type IyzicoInitializeResponse = {
  status?: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  token?: string;
  paymentPageUrl?: string;
};

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    name: parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] || "Misafir",
    surname: parts.length > 1 ? parts.at(-1) || "TUROBUS" : "TUROBUS",
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
    const publicToken = String(body.token || "").trim();

    if (!publicToken) {
      return NextResponse.json({ error: "Ödeme bağlantısı geçersiz." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("check_villa_b2b_offer_payable", {
      p_token: publicToken,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    const payable = data as Payable;

    if (payable.already_paid) {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    const amount = Number(payable.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Ödenecek tutar bulunamadı." }, { status: 409 });
    }

    if (!payable.customer_phone) {
      return NextResponse.json({ error: "Online ödeme için müşteri telefonu eksik." }, { status: 400 });
    }

    if (!payable.customer_email) {
      return NextResponse.json({ error: "Online ödeme için müşteri e-postası eksik." }, { status: 400 });
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const conversationId = crypto.randomUUID();
    const { name, surname } = splitFullName(payable.customer_name);

    const callbackUrl = `${baseUrl}/api/villa-payments/iyzico/callback?offerId=${encodeURIComponent(payable.offer_id)}&publicToken=${encodeURIComponent(publicToken)}`;

    const iyzicoBody = {
      locale: "tr",
      conversationId,
      price: amount.toFixed(2),
      paidPrice: amount.toFixed(2),
      currency: payable.currency || "TRY",
      basketId: payable.offer_code,
      paymentGroup: "PRODUCT",
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      paymentSource: "TUROBUS_VILLA_B2B",
      buyer: {
        id: payable.offer_id,
        name,
        surname,
        identityNumber: "11111111111",
        email: payable.customer_email,
        gsmNumber: normalizePhone(payable.customer_phone),
        registrationAddress: "TUROBUS villa rezervasyonu",
        city: "Muğla",
        country: "Türkiye",
        zipCode: "48300",
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
      },
      shippingAddress: {
        contactName: payable.customer_name,
        city: "Muğla",
        country: "Türkiye",
        address: "TUROBUS villa rezervasyonu",
        zipCode: "48300",
      },
      billingAddress: {
        contactName: payable.customer_name,
        city: "Muğla",
        country: "Türkiye",
        address: "TUROBUS villa rezervasyonu",
        zipCode: "48300",
      },
      basketItems: [
        {
          id: payable.offer_id,
          name: `Villa Rezervasyonu ${payable.offer_code}`,
          category1: "Villa Konaklama",
          itemType: "VIRTUAL",
          price: amount.toFixed(2),
        },
      ],
    };

    const result = await iyzicoPost<IyzicoInitializeResponse>({
      path: "/payment/iyzipos/checkoutform/initialize/auth/ecom",
      body: iyzicoBody,
    });

    if (result.status !== "success" || !result.token || !result.paymentPageUrl) {
      return NextResponse.json(
        { error: result.errorMessage || "iyzico ödeme formu başlatılamadı.", code: result.errorCode },
        { status: 502 }
      );
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("villa_b2b_offer_payments")
      .insert({
        offer_id: payable.offer_id,
        partner_company_id: payable.partner_company_id,
        owner_company_id: payable.owner_company_id,
        reservation_id: payable.reservation_id,
        amount,
        currency: payable.currency || "TRY",
        provider: "iyzico",
        provider_reference: result.token,
        status: "pending",
        metadata: {
          conversation_id: conversationId,
          checkout_token: result.token,
          payment_page_url: result.paymentPageUrl,
          source: "villa_b2b_public_payment",
        },
      })
      .select("id")
      .single();

    if (paymentError) throw paymentError;

    await supabaseAdmin
      .from("villa_b2b_offers")
      .update({ payment_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", payable.offer_id);

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      paymentPageUrl: result.paymentPageUrl,
    });
  } catch (error) {
    console.error("Villa iyzico initialize:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ödeme başlatılamadı." },
      { status: 500 }
    );
  }
}
