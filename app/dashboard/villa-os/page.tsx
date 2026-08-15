"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CurrentMembership, getCurrentMembership } from "@/lib/current-user";

type Villa = {
  id: string; name: string; city: string | null; district: string | null; bedrooms: number; bathrooms: number;
  max_guests: number; base_nightly_rate: number; cleaning_fee: number; cleaning_fee_under_nights: number | null;
  security_deposit: number; minimum_stay: number; marketplace_enabled: boolean; marketplace_commission_rate: number;
};

type Reservation = {
  id: string; reservation_code: string; guest_name: string; guest_phone: string | null; check_in: string; check_out: string;
  grand_total: number; paid_total: number; balance: number; status: string; cleaning_status: string; sales_channel: string; guest_token: string | null;
};

type Cleaning = { id: string; task_date: string; status: string; task_type: string; fee: number; villa_id: string; reservation_id: string | null };

type Metrics = { occupancy_rate?: number; revenue?: number; paid?: number; balance?: number; today_checkins?: number; today_checkouts?: number; cleaning_pending?: number; villa_count?: number };

const money = (v: number | null | undefined) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number(v ?? 0));

export default function VillaOsPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cleaning, setCleaning] = useState<Cleaning[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({});
  const [selectedVillaId, setSelectedVillaId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", city: "Fethiye", district: "", bedrooms: "2", bathrooms: "2", maxGuests: "4", nightly: "0", cleaning: "0", cleaningUnder: "4", deposit: "0", minimumStay: "2", commission: "15" });
  const [reservationForm, setReservationForm] = useState({ guestName: "", phone: "", email: "", guestCount: "2", checkIn: "", checkOut: "", channel: "direct" });

  const load = useCallback(async (companyId: string) => {
    const [villaR, reservationR, cleaningR, metricsR] = await Promise.all([
      supabase.from("villas").select("id,name,city,district,bedrooms,bathrooms,max_guests,base_nightly_rate,cleaning_fee,cleaning_fee_under_nights,security_deposit,minimum_stay,marketplace_enabled,marketplace_commission_rate").eq("company_id", companyId).eq("is_active", true).order("name"),
      supabase.from("villa_reservations").select("id,reservation_code,guest_name,guest_phone,check_in,check_out,grand_total,paid_total,balance,status,cleaning_status,sales_channel,guest_token").eq("company_id", companyId).order("check_in", { ascending: true }).limit(100),
      supabase.from("villa_cleaning_tasks").select("id,task_date,status,task_type,fee,villa_id,reservation_id").eq("company_id", companyId).order("task_date").limit(100),
      supabase.rpc("get_villa_os_dashboard", { p_company_id: companyId, p_month: new Date().toISOString().slice(0, 10) }),
    ]);
    for (const r of [villaR, reservationR, cleaningR, metricsR]) if (r.error) throw new Error(r.error.message);
    setVillas((villaR.data ?? []) as Villa[]);
    setReservations((reservationR.data ?? []) as Reservation[]);
    setCleaning((cleaningR.data ?? []) as Cleaning[]);
    setMetrics((metricsR.data ?? {}) as Metrics);
    if (!selectedVillaId && villaR.data?.[0]?.id) setSelectedVillaId(villaR.data[0].id);
  }, [selectedVillaId]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const m = await getCurrentMembership(user.id);
        if (!m) return;
        setMembership(m);
        await load(m.company_id);
      } catch (e) { setError(e instanceof Error ? e.message : "Villa OS yüklenemedi"); }
    })();
  }, [load]);

  async function addVilla(e: FormEvent) {
    e.preventDefault(); if (!membership || !form.name.trim()) return; setError(""); setMessage("");
    const slug = `${form.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error: insertError } = await supabase.from("villas").insert({ company_id: membership.company_id, name: form.name.trim(), slug, city: form.city || null, district: form.district || null, bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms), max_guests: Number(form.maxGuests), base_nightly_rate: Number(form.nightly), cleaning_fee: Number(form.cleaning), cleaning_fee_under_nights: form.cleaningUnder ? Number(form.cleaningUnder) : null, security_deposit: Number(form.deposit), minimum_stay: Number(form.minimumStay), marketplace_commission_rate: Number(form.commission) });
    if (insertError) return setError(insertError.message);
    await supabase.rpc("sync_turobus_villa_network"); setMessage("Villa oluşturuldu."); setForm({ ...form, name: "" }); await load(membership.company_id);
  }

  async function toggleMarketplace(villa: Villa) {
    if (!membership) return;
    const { error: e } = await supabase.from("villas").update({ marketplace_enabled: !villa.marketplace_enabled, updated_at: new Date().toISOString() }).eq("id", villa.id).eq("company_id", membership.company_id);
    if (e) return setError(e.message);
    await supabase.rpc("sync_turobus_villa_network"); await load(membership.company_id);
  }

  async function createReservation(e: FormEvent) {
    e.preventDefault(); if (!membership || !selectedVillaId) return; setError(""); setMessage("");
    const { data, error: rpcError } = await supabase.rpc("create_villa_reservation", { p_company_id: membership.company_id, p_villa_id: selectedVillaId, p_guest_name: reservationForm.guestName, p_guest_phone: reservationForm.phone || null, p_guest_email: reservationForm.email || null, p_guest_count: Number(reservationForm.guestCount), p_check_in: reservationForm.checkIn, p_check_out: reservationForm.checkOut, p_sales_channel: reservationForm.channel });
    if (rpcError) return setError(rpcError.message);
    const result = data as { reservation_code?: string; guest_token?: string };
    setMessage(`Rezervasyon oluşturuldu: ${result.reservation_code ?? ""}`); setReservationForm({ ...reservationForm, guestName: "", phone: "", email: "" }); await load(membership.company_id);
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-[1500px]">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.25em] text-emerald-400">TUROBUS VILLA OS</div><h1 className="mt-2 text-3xl font-black">Villa Yönetim Merkezi</h1><p className="mt-2 text-sm text-slate-400">Rezervasyon · ödeme · temizlik · fatura · kanal · B2B · marketplace · misafir uygulaması</p></div><div className="flex gap-2"><Link href="/dashboard/activity-network" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black">Activity Network</Link><Link href="/dashboard/package-os/builder" className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950">Package Builder</Link></div></div>

    {error && <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-red-300">{error}</div>}{message && <div className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-emerald-300">{message}</div>}

    <div className="mt-8 grid gap-3 md:grid-cols-4 xl:grid-cols-7">{[
      ["Doluluk", `%${metrics.occupancy_rate ?? 0}`],["Aylık Gelir", money(metrics.revenue)],["Tahsilat", money(metrics.paid)],["Kalan", money(metrics.balance)],["Bugün Giriş", metrics.today_checkins ?? 0],["Bugün Çıkış", metrics.today_checkouts ?? 0],["Temizlik", metrics.cleaning_pending ?? 0]
    ].map(([k,v]) => <div key={String(k)} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{k}</div><div className="mt-2 text-xl font-black">{v}</div></div>)}</div>

    <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-xl font-black">Yeni Villa</h2><form onSubmit={addVilla} className="mt-5 space-y-3">
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Villa adı" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />
        <div className="grid grid-cols-2 gap-2"><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Şehir" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/><input value={form.district} onChange={e=>setForm({...form,district:e.target.value})} placeholder="Bölge" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/></div>
        <div className="grid grid-cols-3 gap-2"><input type="number" value={form.bedrooms} onChange={e=>setForm({...form,bedrooms:e.target.value})} placeholder="Yatak" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3"/><input type="number" value={form.bathrooms} onChange={e=>setForm({...form,bathrooms:e.target.value})} placeholder="Banyo" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3"/><input type="number" value={form.maxGuests} onChange={e=>setForm({...form,maxGuests:e.target.value})} placeholder="Kişi" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3"/></div>
        <input type="number" value={form.nightly} onChange={e=>setForm({...form,nightly:e.target.value})} placeholder="Gece fiyatı" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/>
        <div className="grid grid-cols-2 gap-2"><input type="number" value={form.cleaning} onChange={e=>setForm({...form,cleaning:e.target.value})} placeholder="Temizlik ücreti" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/><input type="number" value={form.cleaningUnder} onChange={e=>setForm({...form,cleaningUnder:e.target.value})} placeholder="Kaç gece altı" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/></div>
        <div className="grid grid-cols-3 gap-2"><input type="number" value={form.deposit} onChange={e=>setForm({...form,deposit:e.target.value})} placeholder="Depozito" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3"/><input type="number" value={form.minimumStay} onChange={e=>setForm({...form,minimumStay:e.target.value})} placeholder="Min gece" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3"/><input type="number" value={form.commission} onChange={e=>setForm({...form,commission:e.target.value})} placeholder="Turobus %" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3"/></div>
        <button className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Villayı Oluştur</button>
      </form></section>

      <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Villa Portföyü</h2><div className="text-sm text-slate-500">{villas.length} villa</div></div><div className="mt-5 grid gap-3 md:grid-cols-2">{villas.map(v => <div key={v.id} className="rounded-2xl border border-white/10 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{v.name}</div><div className="mt-1 text-xs text-slate-500">{[v.city,v.district].filter(Boolean).join(" · ")}</div></div><button type="button" onClick={()=>toggleMarketplace(v)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black ${v.marketplace_enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>{v.marketplace_enabled ? "TUROBUS AÇIK" : "TUROBUS KAPALI"}</button></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div className="rounded-lg bg-white/[.03] p-2">{v.bedrooms} yatak</div><div className="rounded-lg bg-white/[.03] p-2">{v.max_guests} kişi</div><div className="rounded-lg bg-white/[.03] p-2">{money(v.base_nightly_rate)}</div></div><div className="mt-3 text-xs text-slate-500">{v.cleaning_fee_under_nights ? `${v.cleaning_fee_under_nights} gece altı ${money(v.cleaning_fee)} temizlik` : `Temizlik ${money(v.cleaning_fee)}`}</div></div>)}</div></section>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-xl font-black">Yeni Rezervasyon</h2><form onSubmit={createReservation} className="mt-5 space-y-3"><select value={selectedVillaId} onChange={e=>setSelectedVillaId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"><option value="">Villa seç</option>{villas.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><input value={reservationForm.guestName} onChange={e=>setReservationForm({...reservationForm,guestName:e.target.value})} placeholder="Misafir adı" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/><input value={reservationForm.phone} onChange={e=>setReservationForm({...reservationForm,phone:e.target.value})} placeholder="Telefon" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/></div><div className="grid grid-cols-2 gap-2"><input type="date" value={reservationForm.checkIn} onChange={e=>setReservationForm({...reservationForm,checkIn:e.target.value})} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/><input type="date" value={reservationForm.checkOut} onChange={e=>setReservationForm({...reservationForm,checkOut:e.target.value})} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/></div><div className="grid grid-cols-2 gap-2"><input type="number" value={reservationForm.guestCount} onChange={e=>setReservationForm({...reservationForm,guestCount:e.target.value})} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"/><select value={reservationForm.channel} onChange={e=>setReservationForm({...reservationForm,channel:e.target.value})} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"><option value="direct">Direkt</option><option value="agency">Acenta</option><option value="b2b">B2B</option><option value="airbnb">Airbnb</option><option value="booking">Booking</option><option value="turobus_marketplace">Turobus.com</option></select></div><button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950">Rezervasyonu Oluştur</button></form></section>

      <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-xl font-black">Yaklaşan Rezervasyonlar</h2><div className="mt-5 space-y-3">{reservations.slice(0,12).map(r=><div key={r.id} className="rounded-xl border border-white/10 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{r.guest_name}</div><div className="mt-1 text-xs text-slate-500">{r.check_in} → {r.check_out} · {r.sales_channel}</div></div><div className="text-right"><div className="font-black">{money(r.grand_total)}</div><div className="text-xs text-amber-300">Kalan {money(r.balance)}</div></div></div>{r.guest_token && <div className="mt-3 text-xs text-cyan-300">Misafir: /villa-misafir/{r.guest_token}</div>}</div>)}</div></section>
    </div>

    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-xl font-black">Temizlik Operasyonu</h2><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{cleaning.slice(0,16).map(t=><div key={t.id} className="rounded-xl border border-white/10 bg-slate-950 p-4"><div className="text-xs font-black uppercase text-emerald-300">{t.task_type}</div><div className="mt-2 font-black">{t.task_date}</div><div className="mt-1 text-xs text-slate-500">{t.status} · {money(t.fee)}</div></div>)}</div></section>
  </div></main>;
}
