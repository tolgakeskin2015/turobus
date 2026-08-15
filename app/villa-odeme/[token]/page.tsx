"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PaymentOffer = {
  offer_code: string;
  customer_name: string;
  villa_name: string;
  city: string | null;
  district: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guest_count: number;
  currency: string;
  customer_total: number;
  offer_status: string;
  payment_status: string;
  paid_amount: number;
  paid_at: string | null;
  reservation_id: string | null;
  cover_url: string | null;
};

const money = (value: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));

export default function VillaPaymentPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = String(params?.token ?? "");
  const result = searchParams.get("result");
  const resultMessage = searchParams.get("message");

  const [offer, setOffer] = useState<PaymentOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc("get_villa_b2b_payment_public", { p_token: token });
    if (rpcError) setError(rpcError.message);
    else setOffer(data as PaymentOffer);
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function startPayment() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/villa-payments/iyzico/initialize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        alreadyPaid?: boolean;
        paymentPageUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Ödeme başlatılamadı.");
      }

      if (data.alreadyPaid) {
        await load();
        return;
      }

      if (!data.paymentPageUrl) {
        throw new Error("Ödeme sayfası bağlantısı alınamadı.");
      }

      window.location.href = data.paymentPageUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ödeme başlatılamadı.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#06101b] p-8 text-white">Ödeme bilgileriniz hazırlanıyor…</main>;
  }

  if (!offer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06101b] p-8 text-white">
        <div className="max-w-xl rounded-3xl border border-red-400/20 bg-[#091724] p-8 text-center">
          <h1 className="text-2xl font-black">Ödeme görüntülenemedi</h1>
          <p className="mt-3 text-red-300">{error || "Teklif bulunamadı."}</p>
        </div>
      </main>
    );
  }

  const paid = offer.payment_status === "paid";
  const accepted = ["accepted", "converted"].includes(offer.offer_status);

  return (
    <main className="min-h-screen bg-[#06101b] text-white">
      <section className="border-b border-white/[.07] bg-gradient-to-b from-emerald-500/15 to-[#06101b] px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">TUROBUS GÜVENLİ ÖDEME</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">Villa Rezervasyon Ödemesi</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Sayın <strong>{offer.customer_name}</strong>, rezervasyonunuzu güvenli ödeme ile kesinleştirebilirsiniz.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {offer.cover_url && (
            <div className="overflow-hidden rounded-3xl border border-white/[.07]">
              <img src={offer.cover_url} alt={offer.villa_name} className="h-[330px] w-full object-cover" />
            </div>
          )}

          <section className="rounded-3xl border border-white/[.07] bg-[#091724] p-6">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">REZERVASYON ÖZETİ</div>
            <h2 className="mt-2 text-2xl font-black">{offer.villa_name}</h2>
            <p className="mt-2 text-sm text-slate-500">{[offer.district, offer.city].filter(Boolean).join(" / ")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#06101b] p-4"><div className="text-[10px] text-slate-500">GİRİŞ</div><div className="mt-1 font-black">{dateLabel(offer.check_in)}</div></div>
              <div className="rounded-2xl bg-[#06101b] p-4"><div className="text-[10px] text-slate-500">ÇIKIŞ</div><div className="mt-1 font-black">{dateLabel(offer.check_out)}</div></div>
              <div className="rounded-2xl bg-[#06101b] p-4"><div className="text-[10px] text-slate-500">KONAKLAMA</div><div className="mt-1 font-black">{offer.nights} gece · {offer.nights + 1} gün</div></div>
              <div className="rounded-2xl bg-[#06101b] p-4"><div className="text-[10px] text-slate-500">MİSAFİR</div><div className="mt-1 font-black">{offer.guest_count} kişi</div></div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-3xl border border-emerald-400/20 bg-[#091724] p-6 lg:sticky lg:top-6">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">ÖDENECEK TUTAR</div>
          <div className="mt-3 text-4xl font-black">{money(offer.customer_total, offer.currency)}</div>
          <div className="mt-2 text-xs text-slate-500">Teklif: {offer.offer_code}</div>

          {result === "success" && (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              ✓ Ödemeniz başarıyla alındı ve rezervasyonunuz kesinleştirildi.
            </div>
          )}

          {result === "failed" && (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {resultMessage || "Ödeme işlemi tamamlanamadı."}
            </div>
          )}

          {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

          {paid ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="font-black text-emerald-300">✓ Ödeme Tamamlandı</div>
              <p className="mt-2 text-xs leading-5 text-slate-400">Rezervasyonunuz merkezi villa takviminde kesinleştirildi.</p>
              {offer.paid_at && <div className="mt-2 text-[10px] text-slate-500">{new Date(offer.paid_at).toLocaleString("tr-TR")}</div>}
            </div>
          ) : accepted ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startPayment()}
              className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50"
            >
              {busy ? "Ödeme hazırlanıyor…" : "Güvenli Ödemeye Geç"}
            </button>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-200">
              Ödeme yapabilmek için teklifin önce kabul edilmesi gerekir.
            </div>
          )}

          <div className="mt-5 border-t border-white/[.07] pt-4 text-[11px] leading-5 text-slate-600">
            Kart bilgileriniz TUROBUS tarafından saklanmaz. Ödeme iyzico güvenli ödeme altyapısı üzerinden gerçekleştirilir.
          </div>
        </aside>
      </div>
    </main>
  );
}
