"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaBolt, FaBuilding, FaCalendarAlt, FaChartLine, FaHouseUser, FaNetworkWired, FaPlus, FaSyncAlt, FaUsers } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { CurrentMembership, getCurrentMembership } from "@/lib/current-user";

type Villa = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  base_nightly_rate: number;
  minimum_stay: number;
};

type Access = {
  id: string;
  owner_company_id: string;
  partner_company_id: string;
  villa_id: string;
  access_role: string;
  pricing_type: string;
  net_rate: number | null;
  discount_rate: number;
  instant_confirm: boolean;
  can_view_calendar: boolean;
  can_book: boolean;
  is_active: boolean;
};

type CatalogRow = {
  access_id: string;
  owner_company_id: string;
  villa_id: string;
  villa_name: string;
  city: string | null;
  district: string | null;
  max_guests: number;
  base_nightly_rate: number;
  minimum_stay: number;
  pricing_type: string;
  net_rate: number | null;
  discount_rate: number;
  effective_nightly_rate: number;
  instant_confirm: boolean;
  can_book: boolean;
  marketplace_enabled: boolean;
  cover_url: string | null;
};

type Booking = {
  id: string;
  owner_company_id: string;
  partner_company_id: string;
  villa_id: string;
  reservation_id: string;
  customer_total: number;
  owner_total: number;
  partner_margin: number;
  currency: string;
  status: string;
  created_at: string;
};

type Tab = "share" | "market" | "sales";

const money = (value: number | null | undefined, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value ?? 0));

const today = () => new Date().toISOString().slice(0, 10);

export default function VillaB2BNetworkPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<Tab>("share");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [share, setShare] = useState({ partnerCompanyId: "", villaId: "", pricingType: "discount", discount: "10", netRate: "", instant: true });
  const [booking, setBooking] = useState({ villaId: "", guestName: "", guestPhone: "", guestEmail: "", guestCount: "2", checkIn: today(), checkOut: "", customerTotal: "", reference: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const current = await getCurrentMembership(user.id);
      if (!current) return;
      setMembership(current);

      const [villaR, accessR, bookingR, catalogR] = await Promise.all([
        supabase.from("villas").select("id,name,city,district,base_nightly_rate,minimum_stay").eq("company_id", current.company_id).eq("is_active", true).order("name"),
        supabase.from("villa_b2b_access").select("id,owner_company_id,partner_company_id,villa_id,access_role,pricing_type,net_rate,discount_rate,instant_confirm,can_view_calendar,can_book,is_active").eq("owner_company_id", current.company_id).order("created_at", { ascending: false }),
        supabase.from("villa_b2b_bookings").select("id,owner_company_id,partner_company_id,villa_id,reservation_id,customer_total,owner_total,partner_margin,currency,status,created_at").or(`owner_company_id.eq.${current.company_id},partner_company_id.eq.${current.company_id}`).order("created_at", { ascending: false }).limit(100),
        supabase.rpc("get_villa_b2b_catalog", { p_partner_company_id: current.company_id }),
      ]);

      if (villaR.error) throw villaR.error;
      if (accessR.error) throw accessR.error;
      if (bookingR.error) throw bookingR.error;
      if (catalogR.error) throw catalogR.error;

      setVillas((villaR.data ?? []) as Villa[]);
      setAccesses((accessR.data ?? []) as Access[]);
      setBookings((bookingR.data ?? []) as Booking[]);
      setCatalog((catalogR.data ?? []) as CatalogRow[]);
      if (!share.villaId && villaR.data?.[0]?.id) setShare((x) => ({ ...x, villaId: villaR.data[0].id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "B2B ağı yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [share.villaId]);

  useEffect(() => { void load(); }, [load]);

  const selectedCatalog = useMemo(() => catalog.find((x) => x.villa_id === booking.villaId) ?? null, [catalog, booking.villaId]);

  async function addAccess(e: FormEvent) {
    e.preventDefault();
    if (!membership || !share.partnerCompanyId || !share.villaId) return;
    setBusy(true); setError(""); setMessage("");
    const payload = {
      owner_company_id: membership.company_id,
      partner_company_id: share.partnerCompanyId.trim(),
      villa_id: share.villaId,
      access_role: "sales",
      pricing_type: share.pricingType,
      net_rate: share.pricingType === "net_rate" && share.netRate ? Number(share.netRate) : null,
      discount_rate: share.pricingType === "discount" ? Number(share.discount || 0) / 100 : 0,
      instant_confirm: share.instant,
      can_view_calendar: true,
      can_book: true,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from("villa_b2b_access").upsert(payload, { onConflict: "partner_company_id,villa_id" });
    if (saveError) setError(saveError.message); else {
      setMessage("Villa partner satış ağına açıldı.");
      setShare((x) => ({ ...x, partnerCompanyId: "" }));
      await load();
    }
    setBusy(false);
  }

  async function toggleAccess(access: Access) {
    const { error: updateError } = await supabase.from("villa_b2b_access").update({ is_active: !access.is_active, updated_at: new Date().toISOString() }).eq("id", access.id);
    if (updateError) setError(updateError.message); else await load();
  }

  async function createBooking(e: FormEvent) {
    e.preventDefault();
    if (!membership || !booking.villaId || !booking.guestName || !booking.checkIn || !booking.checkOut) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: rpcError } = await supabase.rpc("create_villa_b2b_booking", {
      p_partner_company_id: membership.company_id,
      p_villa_id: booking.villaId,
      p_guest_name: booking.guestName,
      p_guest_phone: booking.guestPhone || null,
      p_guest_email: booking.guestEmail || null,
      p_guest_count: Number(booking.guestCount || 1),
      p_check_in: booking.checkIn,
      p_check_out: booking.checkOut,
      p_customer_total: Number(booking.customerTotal || 0),
      p_partner_reference: booking.reference || null,
    });
    if (rpcError) setError(rpcError.message); else {
      const result = data as { reservation_code?: string; partner_margin?: number; currency?: string } | null;
      setMessage(`B2B rezervasyon oluşturuldu${result?.reservation_code ? ` · ${result.reservation_code}` : ""}${result?.partner_margin != null ? ` · Marj ${money(result.partner_margin, result.currency)}` : ""}`);
      setBooking((x) => ({ ...x, guestName: "", guestPhone: "", guestEmail: "", customerTotal: "", reference: "" }));
      await load();
      setTab("sales");
    }
    setBusy(false);
  }

  if (loading) return <main className="min-h-screen bg-[#06101b] p-8 text-white">Villa B2B ağı hazırlanıyor…</main>;

  return (
    <main className="min-h-screen bg-[#06101b] text-white">
      <header className="border-b border-white/[.07] bg-[#081522] px-5 py-4 lg:px-7">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400 text-slate-950"><FaNetworkWired /></div>
            <div><div className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">TUROBUS VILLA NETWORK</div><h1 className="text-2xl font-black">B2B Dağıtım Merkezi</h1></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/villa-os/control-center" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-300">← Villa Operasyon</Link>
            <Link href="/dashboard/villa-os/b2b-network/partners" className="rounded-lg bg-violet-400 px-3 py-2 text-xs font-black text-slate-950">Partner & Davet Merkezi</Link>
            <button onClick={() => void load()} className="flex items-center gap-2 rounded-lg bg-white/[.05] px-3 py-2 text-xs font-black"><FaSyncAlt /> Yenile</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] px-5 py-5 lg:px-7">
        {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</div>}
        {message && <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">{message}</div>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ["Paylaşılan Villa", String(accesses.filter((x) => x.is_active).length), FaHouseUser],
            ["B2B Portföyüm", String(catalog.length), FaBuilding],
            ["Toplam B2B Satış", String(bookings.length), FaUsers],
            ["Partner Marjı", money(bookings.filter((x) => x.partner_company_id === membership?.company_id).reduce((s, x) => s + Number(x.partner_margin || 0), 0)), FaChartLine],
          ] as Array<[string, string, React.ComponentType<{ className?: string }>]>).map(([label, value, Icon]) => (
            <div key={String(label)} className="rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500"><Icon className="text-violet-300" />{String(label)}</div><div className="mt-2 text-2xl font-black">{String(value)}</div></div>
          ))}
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-white/[.07] pb-2">
          {([
            ["share", "Portföy Paylaş", FaHouseUser],
            ["market", "B2B Pazarım", FaNetworkWired],
            ["sales", "B2B Satışlar", FaChartLine],
          ] as Array<[Tab, string, React.ComponentType<{ className?: string }>]>).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black ${tab === id ? "bg-violet-400 text-slate-950" : "text-slate-400 hover:bg-white/[.04]"}`}><Icon /> {label}</button>
          ))}
        </div>

        {tab === "share" && (
          <div className="mt-4 grid gap-4 xl:grid-cols-[390px_1fr]">
            <section className="rounded-xl border border-white/[.07] bg-[#091724] p-4">
              <div className="flex items-center gap-2"><FaPlus className="text-violet-300" /><h2 className="font-black">Partner Satış Yetkisi</h2></div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Başka bir Turobus firmasına villa portföyünden satış yetkisi ver. Firma ID, partner şirketin Turobus company UUID bilgisidir.</p>
              <form onSubmit={addAccess} className="mt-4 space-y-3">
                <input value={share.partnerCompanyId} onChange={(e) => setShare({ ...share, partnerCompanyId: e.target.value })} placeholder="Partner Firma ID" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" />
                <select value={share.villaId} onChange={(e) => setShare({ ...share, villaId: e.target.value })} className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"><option value="">Villa seç</option>{villas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                <select value={share.pricingType} onChange={(e) => setShare({ ...share, pricingType: e.target.value })} className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"><option value="discount">İndirimli fiyat</option><option value="net_rate">Net gecelik fiyat</option><option value="public_rate">Public fiyat</option></select>
                {share.pricingType === "discount" && <input type="number" value={share.discount} onChange={(e) => setShare({ ...share, discount: e.target.value })} placeholder="İndirim %" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" />}
                {share.pricingType === "net_rate" && <input type="number" value={share.netRate} onChange={(e) => setShare({ ...share, netRate: e.target.value })} placeholder="Net gecelik fiyat" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" />}
                <label className="flex items-center gap-2 rounded-lg bg-white/[.03] p-3 text-xs font-bold"><input type="checkbox" checked={share.instant} onChange={(e) => setShare({ ...share, instant: e.target.checked })} /> Anında onay</label>
                <button disabled={busy} className="w-full rounded-lg bg-violet-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">Partner Ağına Aç</button>
              </form>
            </section>

            <section className="rounded-xl border border-white/[.07] bg-[#091724] p-4">
              <div className="flex items-center justify-between"><h2 className="font-black">Aktif Partner Dağıtımı</h2><span className="text-xs text-slate-500">{accesses.length} erişim</span></div>
              <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="py-3">Villa</th><th>Partner</th><th>Fiyatlama</th><th>Onay</th><th>Durum</th><th></th></tr></thead><tbody>{accesses.map((a) => { const v = villas.find((x) => x.id === a.villa_id); return <tr key={a.id} className="border-t border-white/[.06]"><td className="py-4 font-black">{v?.name ?? a.villa_id.slice(0,8)}</td><td className="font-mono text-[10px] text-slate-400">{a.partner_company_id}</td><td>{a.pricing_type === "discount" ? `%${Math.round(Number(a.discount_rate || 0) * 100)} indirim` : a.pricing_type === "net_rate" ? money(a.net_rate) : "Public"}</td><td>{a.instant_confirm ? "Anında" : "Talep"}</td><td><span className={`rounded-full px-2 py-1 text-[9px] font-black ${a.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{a.is_active ? "AKTİF" : "KAPALI"}</span></td><td className="text-right"><button onClick={() => void toggleAccess(a)} className="rounded-lg border border-white/10 px-3 py-2 font-black">{a.is_active ? "Kapat" : "Aç"}</button></td></tr>; })}</tbody></table></div>
            </section>
          </div>
        )}

        {tab === "market" && (
          <div className="mt-4 grid gap-4 2xl:grid-cols-[1fr_390px]">
            <section><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{catalog.map((v) => <button type="button" key={v.villa_id} onClick={() => setBooking({ ...booking, villaId: v.villa_id })} className={`overflow-hidden rounded-xl border text-left transition ${booking.villaId === v.villa_id ? "border-violet-400/50 bg-violet-400/[.06]" : "border-white/[.07] bg-[#091724] hover:border-white/15"}`}><div className="aspect-[16/9] bg-white/[.04]">{v.cover_url ? <img src={v.cover_url} alt={v.villa_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl text-slate-700"><FaHouseUser /></div>}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{v.villa_name}</h3><p className="mt-1 text-[10px] text-slate-500">{[v.city,v.district].filter(Boolean).join(" · ")}</p></div><span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-black text-violet-300">B2B</span></div><div className="mt-4 flex items-end justify-between"><div><div className="text-[9px] uppercase text-slate-600">B2B gecelik</div><div className="text-xl font-black text-emerald-300">{money(v.effective_nightly_rate)}</div></div><div className="text-right text-[10px] text-slate-500">Min {v.minimum_stay} gece<br />{v.max_guests} misafir</div></div></div></button>)}{!catalog.length && <div className="col-span-full rounded-xl border border-dashed border-white/10 p-12 text-center text-slate-500">Firmanıza açılmış B2B villa bulunmuyor.</div>}</div></section>

            <aside className="h-fit rounded-xl border border-violet-400/15 bg-[#091724] p-4 2xl:sticky 2xl:top-4"><div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">HIZLI B2B SATIŞ</div><h2 className="mt-1 text-lg font-black">Rezervasyon Oluştur</h2>{selectedCatalog && <div className="mt-3 rounded-lg bg-white/[.035] p-3 text-xs"><strong>{selectedCatalog.villa_name}</strong><div className="mt-1 text-emerald-300">Net gecelik: {money(selectedCatalog.effective_nightly_rate)}</div></div>}
              <form onSubmit={createBooking} className="mt-4 space-y-2"><select value={booking.villaId} onChange={(e) => setBooking({ ...booking, villaId: e.target.value })} className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"><option value="">Villa seç</option>{catalog.map((v) => <option key={v.villa_id} value={v.villa_id}>{v.villa_name}</option>)}</select><input value={booking.guestName} onChange={(e) => setBooking({ ...booking, guestName: e.target.value })} placeholder="Misafir adı soyadı" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /><div className="grid grid-cols-2 gap-2"><input value={booking.guestPhone} onChange={(e) => setBooking({ ...booking, guestPhone: e.target.value })} placeholder="Telefon" className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /><input type="number" value={booking.guestCount} onChange={(e) => setBooking({ ...booking, guestCount: e.target.value })} placeholder="Kişi" className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /></div><input type="email" value={booking.guestEmail} onChange={(e) => setBooking({ ...booking, guestEmail: e.target.value })} placeholder="E-posta" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /><div className="grid grid-cols-2 gap-2"><input type="date" value={booking.checkIn} onChange={(e) => setBooking({ ...booking, checkIn: e.target.value })} className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /><input type="date" value={booking.checkOut} onChange={(e) => setBooking({ ...booking, checkOut: e.target.value })} className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /></div><input type="number" value={booking.customerTotal} onChange={(e) => setBooking({ ...booking, customerTotal: e.target.value })} placeholder="Müşteriye satış toplamı" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /><input value={booking.reference} onChange={(e) => setBooking({ ...booking, reference: e.target.value })} placeholder="Partner referansı (opsiyonel)" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /><button disabled={busy || !selectedCatalog} className="w-full rounded-lg bg-violet-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40"><FaCalendarAlt className="mr-2 inline" />Rezervasyonu Kilitle</button></form>
            </aside>
          </div>
        )}

        {tab === "sales" && (
          <section className="mt-4 rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="flex items-center justify-between"><h2 className="font-black">B2B Satış Defteri</h2><span className="text-xs text-slate-500">{bookings.length} kayıt</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="py-3">Tarih</th><th>Rol</th><th>Villa</th><th>Müşteri Satışı</th><th>Villa Net</th><th>Partner Marjı</th><th>Durum</th></tr></thead><tbody>{bookings.map((b) => <tr key={b.id} className="border-t border-white/[.06]"><td className="py-4 text-slate-400">{new Date(b.created_at).toLocaleString("tr-TR")}</td><td className="font-black">{b.partner_company_id === membership?.company_id ? "PARTNER" : "SAHİP"}</td><td>{villas.find((v) => v.id === b.villa_id)?.name ?? b.villa_id.slice(0,8)}</td><td>{money(b.customer_total,b.currency)}</td><td>{money(b.owner_total,b.currency)}</td><td className="font-black text-violet-300">{money(b.partner_margin,b.currency)}</td><td><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300">{b.status}</span></td></tr>)}</tbody></table></div></section>
        )}
      </div>
    </main>
  );
}
