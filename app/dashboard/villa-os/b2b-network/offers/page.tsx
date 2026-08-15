"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaCopy, FaEnvelopeOpenText, FaExternalLinkAlt, FaPaperPlane, FaSyncAlt, FaWhatsapp } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { CurrentMembership, getCurrentMembership } from "@/lib/current-user";

type Catalog = { villa_id: string; villa_name: string; city: string | null; district: string | null; effective_nightly_rate: number; base_nightly_rate: number; cover_url: string | null };
type Offer = { id: string; offer_code: string; villa_id: string; customer_name: string; customer_phone: string | null; customer_email: string | null; check_in: string; check_out: string; nights: number; currency: string; customer_total: number; partner_total: number; partner_margin: number; status: string; view_count: number; public_token: string; expires_at: string | null; created_at: string; reservation_id: string | null };
type Quote = { available: boolean; partner_total: number; public_total: number; suggested_customer_total: number; suggested_margin: number; currency: string; nights: number };

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number, currency = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));

export default function VillaB2BOfferCenterPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ villaId: "", customerName: "", customerPhone: "", customerEmail: "", guestCount: "2", checkIn: today(), checkOut: "", customerTotal: "", note: "", validHours: "48" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const current = await getCurrentMembership(user.id);
      if (!current) return;
      setMembership(current);
      const [catalogR, offerR] = await Promise.all([
        supabase.rpc("get_villa_b2b_catalog", { p_partner_company_id: current.company_id }),
        supabase.from("villa_b2b_offers").select("id,offer_code,villa_id,customer_name,customer_phone,customer_email,check_in,check_out,nights,currency,customer_total,partner_total,partner_margin,status,view_count,public_token,expires_at,created_at,reservation_id").eq("partner_company_id", current.company_id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (catalogR.error) throw catalogR.error;
      if (offerR.error) throw offerR.error;
      const rows = (catalogR.data ?? []) as Catalog[];
      setCatalog(rows);
      setOffers((offerR.data ?? []) as Offer[]);
      setForm((x) => ({ ...x, villaId: x.villaId || rows[0]?.villa_id || "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "Teklif merkezi yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function calculate() {
    if (!membership || !form.villaId || !form.checkIn || !form.checkOut) return;
    setBusy(true); setError("");
    const { data, error: rpcError } = await supabase.rpc("get_villa_b2b_sales_quote", { p_partner_company_id: membership.company_id, p_villa_id: form.villaId, p_check_in: form.checkIn, p_check_out: form.checkOut });
    if (rpcError) setError(rpcError.message); else {
      const q = data as Quote;
      setQuote(q);
      if (q.available) setForm((x) => ({ ...x, customerTotal: x.customerTotal || String(q.suggested_customer_total) }));
    }
    setBusy(false);
  }

  async function createOffer(e: FormEvent) {
    e.preventDefault();
    if (!membership || !form.villaId || !form.customerName || !form.checkIn || !form.checkOut) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: rpcError } = await supabase.rpc("create_villa_b2b_offer", {
      p_partner_company_id: membership.company_id,
      p_villa_id: form.villaId,
      p_customer_name: form.customerName,
      p_customer_phone: form.customerPhone || null,
      p_customer_email: form.customerEmail || null,
      p_guest_count: Number(form.guestCount || 1),
      p_check_in: form.checkIn,
      p_check_out: form.checkOut,
      p_customer_total: Number(form.customerTotal || 0),
      p_note: form.note || null,
      p_valid_hours: Number(form.validHours || 48),
    });
    if (rpcError) setError(rpcError.message); else {
      const result = data as { offer_code?: string };
      setMessage(`Teklif oluşturuldu${result?.offer_code ? ` · ${result.offer_code}` : ""}`);
      setForm((x) => ({ ...x, customerName: "", customerPhone: "", customerEmail: "", customerTotal: "", note: "" }));
      setQuote(null);
      await load();
    }
    setBusy(false);
  }

  async function convert(offer: Offer) {
    if (!membership) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: rpcError } = await supabase.rpc("convert_villa_b2b_offer_to_booking", { p_partner_company_id: membership.company_id, p_offer_id: offer.id });
    if (rpcError) setError(rpcError.message); else {
      const result = data as { reservation_code?: string };
      setMessage(`Rezervasyon oluşturuldu${result?.reservation_code ? ` · ${result.reservation_code}` : ""}`);
      await load();
    }
    setBusy(false);
  }

  const acceptedCount = useMemo(() => offers.filter((x) => x.status === "accepted").length, [offers]);
  const viewedCount = useMemo(() => offers.filter((x) => x.view_count > 0).length, [offers]);
  const totalMargin = useMemo(() => offers.filter((x) => x.status === "converted").reduce((s, x) => s + Number(x.partner_margin || 0), 0), [offers]);

  const offerUrl = (token: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/villa-teklif/${token}`;
  const whatsappUrl = (offer: Offer) => {
    const url = offerUrl(offer.public_token);
    const msg = `Merhaba ${offer.customer_name}, size özel villa teklifinizi buradan inceleyebilirsiniz: ${url}`;
    const phone = (offer.customer_phone || "").replace(/[^0-9]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) return <main className="min-h-screen bg-[#06101b] p-8 text-white">B2B teklif merkezi hazırlanıyor…</main>;

  return (
    <main className="min-h-screen bg-[#06101b] text-white">
      <header className="border-b border-white/[.07] bg-[#081522] px-5 py-4 lg:px-7"><div className="mx-auto flex max-w-[1700px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">TUROBUS VILLA B2B</div><h1 className="text-2xl font-black">Teklif & Satış Takip Merkezi</h1></div><div className="flex flex-wrap gap-2"><Link href="/dashboard/villa-os/b2b-network/sales-desk" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-300">← Satış Masası</Link><button onClick={() => void load()} className="flex items-center gap-2 rounded-lg bg-white/[.05] px-3 py-2 text-xs font-black"><FaSyncAlt /> Yenile</button></div></div></header>
      <div className="mx-auto max-w-[1700px] px-5 py-5 lg:px-7">
        {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</div>}
        {message && <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">{message}</div>}
        <div className="grid gap-3 sm:grid-cols-4">{[["Teklif", offers.length],["Görüntülenen", viewedCount],["Kabul Bekleyen", acceptedCount],["Kesinleşen Marj", money(totalMargin)]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="text-[9px] font-black uppercase text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{String(value)}</div></div>)}</div>

        <div className="mt-4 grid gap-4 2xl:grid-cols-[390px_1fr]">
          <section className="h-fit rounded-xl border border-white/[.07] bg-[#091724] p-4 2xl:sticky 2xl:top-4">
            <div className="flex items-center gap-2"><FaPaperPlane className="text-violet-300" /><h2 className="font-black">Yeni Müşteri Teklifi</h2></div>
            <form onSubmit={createOffer} className="mt-4 space-y-3">
              <select value={form.villaId} onChange={(e) => setForm({ ...form, villaId: e.target.value })} className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"><option value="">Villa seç</option>{catalog.map((v) => <option key={v.villa_id} value={v.villa_id}>{v.villa_name}</option>)}</select>
              <div className="grid grid-cols-2 gap-2"><input type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/><input type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/></div>
              <button type="button" onClick={() => void calculate()} disabled={busy} className="w-full rounded-lg border border-violet-400/20 bg-violet-400/[.06] px-3 py-2.5 text-xs font-black text-violet-200">Müsaitlik & Maliyeti Hesapla</button>
              {quote && <div className={`rounded-xl border p-3 ${quote.available ? "border-emerald-400/20 bg-emerald-500/[.06]" : "border-red-400/20 bg-red-500/[.06]"}`}><div className="text-xs font-black">{quote.available ? "✓ Tarihler müsait" : "Tarihler müsait değil"}</div>{quote.available && <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]"><div><span className="text-slate-500">Net maliyet</span><div className="font-black">{money(quote.partner_total, quote.currency)}</div></div><div><span className="text-slate-500">Public</span><div className="font-black">{money(quote.public_total, quote.currency)}</div></div></div>}</div>}
              <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Müşteri adı soyadı" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/>
              <div className="grid grid-cols-2 gap-2"><input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Telefon" className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/><input type="number" min="1" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} placeholder="Misafir" className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/></div>
              <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="E-posta" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/>
              <input type="number" value={form.customerTotal} onChange={(e) => setForm({ ...form, customerTotal: e.target.value })} placeholder="Müşteriye satış toplamı" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/>
              {quote?.available && form.customerTotal && <div className="rounded-lg bg-cyan-500/[.06] p-3 text-xs"><span className="text-slate-500">Tahmini marj: </span><strong className="text-cyan-300">{money(Number(form.customerTotal) - quote.partner_total, quote.currency)}</strong></div>}
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Teklif notu" className="min-h-20 w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/>
              <select value={form.validHours} onChange={(e) => setForm({ ...form, validHours: e.target.value })} className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"><option value="24">24 saat geçerli</option><option value="48">48 saat geçerli</option><option value="72">72 saat geçerli</option><option value="168">7 gün geçerli</option></select>
              <button disabled={busy || !quote?.available} className="w-full rounded-lg bg-violet-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40">Teklif Linki Oluştur</button>
            </form>
          </section>

          <section className="rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="flex items-center gap-2"><FaEnvelopeOpenText className="text-violet-300" /><h2 className="font-black">Teklif Akışı</h2></div><div className="mt-4 space-y-2">{offers.map((offer) => <div key={offer.id} className="rounded-xl border border-white/[.06] bg-[#06101b] p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-black">{offer.customer_name}</span><span className="rounded-full bg-white/[.05] px-2 py-1 text-[9px] font-black uppercase text-slate-400">{offer.status}</span>{offer.view_count > 0 && <span className="text-[10px] text-cyan-300">{offer.view_count} görüntüleme</span>}</div><div className="mt-1 text-xs text-slate-500">{offer.offer_code} · {offer.check_in} → {offer.check_out} · {offer.nights} gece</div><div className="mt-2 flex flex-wrap gap-4 text-xs"><span>Müşteri <strong>{money(offer.customer_total, offer.currency)}</strong></span><span className="text-slate-500">Net {money(offer.partner_total, offer.currency)}</span><span className="text-emerald-300">Marj {money(offer.partner_margin, offer.currency)}</span></div></div><div className="flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(offerUrl(offer.public_token))} className="rounded-lg bg-white/[.05] px-3 py-2 text-xs font-black"><FaCopy /></button><a href={offerUrl(offer.public_token)} target="_blank" className="rounded-lg bg-white/[.05] px-3 py-2 text-xs font-black"><FaExternalLinkAlt /></a>{offer.customer_phone && <a href={whatsappUrl(offer)} target="_blank" className="flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950"><FaWhatsapp /> WhatsApp</a>}{!offer.reservation_id && ["accepted","viewed","sent"].includes(offer.status) && <button disabled={busy} onClick={() => void convert(offer)} className="flex items-center gap-2 rounded-lg bg-violet-400 px-3 py-2 text-xs font-black text-slate-950"><FaCheckCircle /> Rezervasyona Çevir</button>}</div></div></div>)}{!offers.length && <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">Henüz teklif oluşturulmadı.</div>}</div></section>
        </div>
      </div>
    </main>
  );
}
