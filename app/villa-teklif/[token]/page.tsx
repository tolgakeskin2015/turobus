"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Offer = {
  offer_code: string;
  customer_name: string;
  villa_name: string;
  city: string | null;
  district: string | null;
  max_guests: number;
  check_in: string;
  check_out: string;
  nights: number;
  guest_count: number;
  currency: string;
  customer_total: number;
  note: string | null;
  status: string;
  expires_at: string | null;
  cover_url: string | null;
};

const money = (value: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));

export default function VillaOfferPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token ?? "");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc("get_villa_b2b_offer_public", { p_token: token });
    if (rpcError) setError(rpcError.message);
    else setOffer(data as Offer);
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function accept() {
    setBusy(true); setError("");
    const { error: rpcError } = await supabase.rpc("accept_villa_b2b_offer_public", { p_token: token });
    if (rpcError) setError(rpcError.message);
    else setOffer((x) => x ? { ...x, status: "accepted" } : x);
    setBusy(false);
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#06101b] p-8 text-white">Villa teklifiniz hazırlanıyor…</main>;
  if (!offer) return <main className="flex min-h-screen items-center justify-center bg-[#06101b] p-8 text-white"><div className="max-w-xl rounded-3xl border border-red-400/20 bg-[#091724] p-8 text-center"><h1 className="text-2xl font-black">Teklif görüntülenemedi</h1><p className="mt-3 text-red-300">{error || "Teklif bulunamadı."}</p></div></main>;

  const accepted = offer.status === "accepted" || offer.status === "converted";

  return (
    <main className="min-h-screen bg-[#06101b] text-white">
      <section className="border-b border-white/[.07] bg-gradient-to-b from-violet-500/15 to-[#06101b] px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-[10px] font-black uppercase tracking-[.28em] text-violet-300">TUROBUS VILLA</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">Size Özel Villa Teklifi</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Sayın <strong>{offer.customer_name}</strong>, seçtiğiniz tarihler için hazırlanan villa teklifinizi inceleyebilirsiniz.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full border border-white/10 px-4 py-2">{offer.offer_code}</span><span className="rounded-full border border-white/10 px-4 py-2">{offer.nights} gece</span><span className="rounded-full border border-white/10 px-4 py-2">{offer.guest_count} misafir</span></div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {offer.cover_url && <div className="overflow-hidden rounded-3xl border border-white/[.07]"><img src={offer.cover_url} alt={offer.villa_name} className="h-[330px] w-full object-cover" /></div>}
          <section className="rounded-3xl border border-white/[.07] bg-[#091724] p-6">
            <div className="text-[10px] font-black uppercase tracking-wider text-violet-300">KONAKLAMA</div>
            <h2 className="mt-2 text-2xl font-black">{offer.villa_name}</h2>
            <p className="mt-2 text-sm text-slate-500">{[offer.district, offer.city].filter(Boolean).join(" / ")}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#06101b] p-4"><div className="text-[10px] text-slate-500">GİRİŞ</div><div className="mt-1 font-black">{dateLabel(offer.check_in)}</div></div>
              <div className="rounded-2xl bg-[#06101b] p-4"><div className="text-[10px] text-slate-500">ÇIKIŞ</div><div className="mt-1 font-black">{dateLabel(offer.check_out)}</div></div>
              <div className="rounded-2xl bg-[#06101b] p-4"><div className="text-[10px] text-slate-500">SÜRE</div><div className="mt-1 font-black">{offer.nights} gece · {offer.nights + 1} gün</div></div>
              <div className="rounded-2xl bg-[#06101b] p-4"><div className="text-[10px] text-slate-500">KAPASİTE</div><div className="mt-1 font-black">{offer.guest_count} misafir{offer.max_guests ? ` · Max ${offer.max_guests}` : ""}</div></div>
            </div>
            {offer.note && <div className="mt-5 rounded-2xl border border-white/[.06] bg-white/[.02] p-4 text-sm leading-6 text-slate-400">{offer.note}</div>}
          </section>
        </div>

        <aside className="h-fit rounded-3xl border border-violet-400/20 bg-[#091724] p-6 lg:sticky lg:top-6">
          <div className="text-[10px] font-black uppercase tracking-wider text-violet-300">TEKLİF TOPLAMI</div>
          <div className="mt-3 text-4xl font-black">{money(offer.customer_total, offer.currency)}</div>
          <p className="mt-3 text-sm leading-6 text-slate-500">Fiyat seçilen villa ve belirtilen konaklama tarihleri için hazırlanmıştır.</p>
          {offer.expires_at && <div className="mt-4 rounded-xl bg-amber-500/[.08] p-3 text-xs text-amber-200">Teklif geçerlilik: {new Date(offer.expires_at).toLocaleString("tr-TR")}</div>}
          {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

          {accepted ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="font-black text-emerald-300">✓ Teklif kabul edildi</div>
                <p className="mt-2 text-xs leading-5 text-slate-400">Şimdi güvenli ödeme adımına geçerek rezervasyonunuzu kesinleştirebilirsiniz.</p>
              </div>
              <a href={`/villa-odeme/${token}`} className="block w-full rounded-2xl bg-emerald-400 px-5 py-4 text-center text-base font-black text-slate-950">Güvenli Ödemeye Geç</a>
            </div>
          ) : (
            <button disabled={busy} onClick={() => void accept()} className="mt-5 w-full rounded-2xl bg-violet-400 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50">{busy ? "İşleniyor…" : "Teklifi Kabul Et"}</button>
          )}

          <div className="mt-5 border-t border-white/[.07] pt-4 text-[11px] leading-5 text-slate-600">Ödeme tamamlandığında sistem rezervasyonu otomatik kesinleştirir, merkezi villa takvimini kapatır ve finans kayıtlarını oluşturur.</div>
        </aside>
      </div>
    </main>
  );
}
