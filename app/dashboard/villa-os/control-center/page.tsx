"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  FaAirbnb,
  FaBolt,
  FaCalendarAlt,
  FaCamera,
  FaChartLine,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardCheck,
  FaFileInvoice,
  FaHouseUser,
  FaLink,
  FaMoneyBillWave,
  FaPlus,
  FaSyncAlt,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { CurrentMembership, getCurrentMembership } from "@/lib/current-user";

type Villa = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  base_nightly_rate: number;
  minimum_stay: number;
  marketplace_enabled: boolean;
};

type CalendarRow = {
  id?: string;
  calendar_date: string;
  nightly_rate: number | null;
  minimum_stay: number | null;
  status: string;
  source: string;
};

type Reservation = {
  id: string;
  reservation_code: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  grand_total: number;
  paid_total: number;
  balance: number;
  currency: string;
  status: string;
};

type Payment = {
  id: string;
  reservation_id: string;
  payment_type: string;
  method: string;
  amount: number;
  currency: string;
  payment_date: string;
};

type Cleaning = {
  id: string;
  task_date: string;
  task_type: string;
  status: string;
  fee: number;
  reservation_id: string | null;
};

type Invoice = {
  id: string;
  reservation_id: string;
  invoice_status: string;
  invoice_no: string | null;
  total_amount: number;
  currency: string;
  provider: string | null;
};

type Channel = {
  id: string;
  channel: string;
  connection_type: string;
  import_url: string | null;
  export_token: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
};

type Photo = {
  id: string;
  public_url: string | null;
  caption: string | null;
  category: string | null;
  is_cover: boolean;
  sort_order: number;
};

type Tab = "calendar" | "media" | "payments" | "cleaning" | "invoices" | "channels";

const money = (value: number | null | undefined, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const iso = (date: Date) => date.toISOString().slice(0, 10);

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function dateRange(start: string, end: string) {
  const out: string[] = [];
  if (!start || !end) return out;
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last) {
    out.push(iso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

const statusLabel: Record<string, string> = {
  available: "Müsait",
  reserved: "Dolu",
  blocked: "Blokeli",
  maintenance: "Bakım",
  owner_use: "Ev Sahibi",
};

export default function VillaControlCenterPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [villaId, setVillaId] = useState("");
  const [month, setMonth] = useState(monthStart(new Date()));
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [calendar, setCalendar] = useState<CalendarRow[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cleaning, setCleaning] = useState<Cleaning[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [rateForm, setRateForm] = useState({ start: iso(new Date()), end: iso(new Date()), rate: "", minimumStay: "2", status: "available" });
  const [paymentForm, setPaymentForm] = useState({ reservationId: "", amount: "", type: "payment", method: "transfer" });
  const [channelForm, setChannelForm] = useState({ channel: "airbnb", importUrl: "" });

  const selectedVilla = useMemo(() => villas.find((v) => v.id === villaId) ?? null, [villas, villaId]);

  const loadBase = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const current = await getCurrentMembership(user.id);
      if (!current) return;
      setMembership(current);

      const { data, error: villaError } = await supabase
        .from("villas")
        .select("id,name,city,district,base_nightly_rate,minimum_stay,marketplace_enabled")
        .eq("company_id", current.company_id)
        .eq("is_active", true)
        .order("name");
      if (villaError) throw villaError;
      const rows = (data ?? []) as Villa[];
      setVillas(rows);
      if (!villaId && rows[0]?.id) setVillaId(rows[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Villa OS yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [villaId]);

  const loadVillaData = useCallback(async () => {
    if (!membership || !villaId) return;
    setError("");
    const start = iso(monthStart(month));
    const end = iso(monthEnd(month));
    const [calendarR, reservationR, cleaningR, channelR, photoR] = await Promise.all([
      supabase.from("villa_calendar").select("id,calendar_date,nightly_rate,minimum_stay,status,source").eq("company_id", membership.company_id).eq("villa_id", villaId).gte("calendar_date", start).lte("calendar_date", end).order("calendar_date"),
      supabase.from("villa_reservations").select("id,reservation_code,guest_name,check_in,check_out,grand_total,paid_total,balance,currency,status").eq("company_id", membership.company_id).eq("villa_id", villaId).order("check_in", { ascending: false }).limit(100),
      supabase.from("villa_cleaning_tasks").select("id,task_date,task_type,status,fee,reservation_id").eq("company_id", membership.company_id).eq("villa_id", villaId).order("task_date", { ascending: false }).limit(100),
      supabase.from("villa_channel_connections").select("id,channel,connection_type,import_url,export_token,is_active,last_sync_at,last_sync_status").eq("company_id", membership.company_id).eq("villa_id", villaId).order("created_at"),
      supabase.from("villa_photos").select("id,public_url,caption,category,is_cover,sort_order").eq("company_id", membership.company_id).eq("villa_id", villaId).order("sort_order"),
    ]);
    for (const result of [calendarR, reservationR, cleaningR, channelR, photoR]) {
      if (result.error) return setError(result.error.message);
    }
    setCalendar((calendarR.data ?? []) as CalendarRow[]);
    const reservationRows = (reservationR.data ?? []) as Reservation[];
    setReservations(reservationRows);
    setCleaning((cleaningR.data ?? []) as Cleaning[]);
    setChannels((channelR.data ?? []) as Channel[]);
    setPhotos((photoR.data ?? []) as Photo[]);

    const reservationIds = reservationRows.map((r) => r.id);
    if (reservationIds.length) {
      const [paymentR, invoiceR] = await Promise.all([
        supabase.from("villa_payments").select("id,reservation_id,payment_type,method,amount,currency,payment_date").eq("company_id", membership.company_id).in("reservation_id", reservationIds).order("payment_date", { ascending: false }).limit(100),
        supabase.from("villa_invoices").select("id,reservation_id,invoice_status,invoice_no,total_amount,currency,provider").eq("company_id", membership.company_id).in("reservation_id", reservationIds).order("created_at", { ascending: false }).limit(100),
      ]);
      if (paymentR.error) setError(paymentR.error.message); else setPayments((paymentR.data ?? []) as Payment[]);
      if (invoiceR.error) setError(invoiceR.error.message); else setInvoices((invoiceR.data ?? []) as Invoice[]);
    } else {
      setPayments([]);
      setInvoices([]);
    }
  }, [membership, villaId, month]);

  useEffect(() => { void loadBase(); }, [loadBase]);
  useEffect(() => { void loadVillaData(); }, [loadVillaData]);

  const calendarMap = useMemo(() => new Map(calendar.map((row) => [row.calendar_date, row])), [calendar]);

  const monthDays = useMemo(() => {
    const first = monthStart(month);
    const last = monthEnd(month);
    const cells: Array<{ date: string | null; day: number | null }> = [];
    const mondayIndex = (first.getDay() + 6) % 7;
    for (let i = 0; i < mondayIndex; i += 1) cells.push({ date: null, day: null });
    for (let day = 1; day <= last.getDate(); day += 1) {
      const d = new Date(first.getFullYear(), first.getMonth(), day, 12);
      cells.push({ date: iso(d), day });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [month]);

  const occupancy = useMemo(() => {
    const total = monthEnd(month).getDate();
    const blocked = calendar.filter((d) => ["reserved", "blocked", "owner_use", "maintenance"].includes(d.status)).length;
    return total ? Math.round((blocked / total) * 100) : 0;
  }, [calendar, month]);

  async function applyRate(e: FormEvent) {
    e.preventDefault();
    if (!membership || !villaId) return;
    const dates = dateRange(rateForm.start, rateForm.end);
    if (!dates.length) return setError("Geçerli tarih aralığı seç.");
    setBusy(true); setError(""); setMessage("");
    const payload = dates.map((calendar_date) => ({
      company_id: membership.company_id,
      villa_id: villaId,
      calendar_date,
      nightly_rate: rateForm.rate ? Number(rateForm.rate) : selectedVilla?.base_nightly_rate ?? 0,
      minimum_stay: rateForm.minimumStay ? Number(rateForm.minimumStay) : selectedVilla?.minimum_stay ?? 1,
      status: rateForm.status,
      source: "villa_os",
      updated_at: new Date().toISOString(),
    }));
    const { error: upsertError } = await supabase.from("villa_calendar").upsert(payload, { onConflict: "villa_id,calendar_date" });
    if (upsertError) setError(upsertError.message); else {
      setMessage(`${dates.length} gün güncellendi.`);
      await loadVillaData();
    }
    setBusy(false);
  }

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    if (!membership || !paymentForm.reservationId || !paymentForm.amount) return;
    setBusy(true); setError(""); setMessage("");
    const { error: rpcError } = await supabase.rpc("record_villa_payment", {
      p_company_id: membership.company_id,
      p_reservation_id: paymentForm.reservationId,
      p_payment_type: paymentForm.type,
      p_method: paymentForm.method,
      p_amount: Number(paymentForm.amount),
      p_reference: null,
      p_note: "Villa OS Control Center",
    });
    if (rpcError) setError(rpcError.message); else {
      setMessage("Ödeme kaydedildi, bakiye güncellendi.");
      setPaymentForm({ ...paymentForm, amount: "" });
      await loadVillaData();
    }
    setBusy(false);
  }

  async function updateCleaning(task: Cleaning, status: string) {
    if (!membership) return;
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "in_progress") patch.started_at = new Date().toISOString();
    if (status === "completed") patch.completed_at = new Date().toISOString();
    if (status === "inspected") patch.inspected_at = new Date().toISOString();
    const { error: updateError } = await supabase.from("villa_cleaning_tasks").update(patch).eq("id", task.id).eq("company_id", membership.company_id);
    if (updateError) setError(updateError.message); else await loadVillaData();
  }

  async function createInvoice(reservation: Reservation) {
    if (!membership) return;
    setBusy(true);
    const { error: invoiceError } = await supabase.from("villa_invoices").insert({
      company_id: membership.company_id,
      reservation_id: reservation.id,
      invoice_status: "queued",
      invoice_type: "e_archive",
      total_amount: reservation.grand_total,
      currency: reservation.currency,
      provider: "pending_api_connector",
    });
    if (invoiceError) setError(invoiceError.message); else {
      setMessage("Fatura kuyruğa alındı. API bağlandığında otomatik gönderilecek.");
      await loadVillaData();
    }
    setBusy(false);
  }

  async function addChannel(e: FormEvent) {
    e.preventDefault();
    if (!membership || !villaId) return;
    setBusy(true); setError("");
    const { error: channelError } = await supabase.from("villa_channel_connections").insert({
      company_id: membership.company_id,
      villa_id: villaId,
      channel: channelForm.channel,
      connection_type: "ical",
      import_url: channelForm.importUrl || null,
      is_active: true,
    });
    if (channelError) setError(channelError.message); else {
      setMessage("Kanal bağlantısı eklendi.");
      setChannelForm({ ...channelForm, importUrl: "" });
      await loadVillaData();
    }
    setBusy(false);
  }

  async function uploadPhotos(files: FileList | null) {
    if (!membership || !villaId || !files?.length) return;
    setBusy(true); setError(""); setMessage("");
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${membership.company_id}/${villaId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("villa-media").upload(path, file, { upsert: false });
      if (uploadError) { setError(uploadError.message); continue; }
      const { data: urlData } = supabase.storage.from("villa-media").getPublicUrl(path);
      const { error: insertError } = await supabase.from("villa_photos").insert({
        company_id: membership.company_id,
        villa_id: villaId,
        storage_path: path,
        public_url: urlData.publicUrl,
        category: "gallery",
        sort_order: photos.length,
        is_cover: photos.length === 0,
      });
      if (insertError) setError(insertError.message);
    }
    setMessage("Fotoğraflar yüklendi.");
    await loadVillaData();
    setBusy(false);
  }

  async function setCover(photo: Photo) {
    if (!membership) return;
    await supabase.from("villa_photos").update({ is_cover: false }).eq("company_id", membership.company_id).eq("villa_id", villaId);
    const { error: coverError } = await supabase.from("villa_photos").update({ is_cover: true }).eq("id", photo.id).eq("company_id", membership.company_id);
    if (coverError) setError(coverError.message); else await loadVillaData();
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof FaCalendarAlt }> = [
    { id: "calendar", label: "Takvim & Fiyat", icon: FaCalendarAlt },
    { id: "media", label: "Fotoğraflar", icon: FaCamera },
    { id: "payments", label: "Ödeme", icon: FaMoneyBillWave },
    { id: "cleaning", label: "Temizlik", icon: FaClipboardCheck },
    { id: "invoices", label: "Fatura", icon: FaFileInvoice },
    { id: "channels", label: "Airbnb & Kanallar", icon: FaAirbnb },
  ];

  if (loading) return <main className="min-h-screen bg-[#07111f] p-8 text-white">Villa OS hazırlanıyor…</main>;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.18),transparent_35%),linear-gradient(180deg,#0b1728_0%,#07111f_100%)] px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-[1700px]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.28em] text-emerald-400"><FaBolt /> Turobus Villa OS</div>
              <h1 className="mt-3 text-3xl font-black tracking-tight lg:text-4xl">Villa Operasyon Stüdyosu</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">Takvim, fiyat, fotoğraf, ödeme, temizlik, fatura ve kanal yönetimi tek profesyonel merkezde.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/villa-os" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold">← Ana Merkez</Link>
              <select value={villaId} onChange={(e) => setVillaId(e.target.value)} className="min-w-[240px] rounded-xl border border-white/10 bg-[#0d1b2d] px-4 py-3 text-sm font-bold outline-none">
                <option value="">Villa seç</option>
                {villas.map((villa) => <option key={villa.id} value={villa.id}>{villa.name}</option>)}
              </select>
            </div>
          </div>

          {selectedVilla && (
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {([
                ["Villa", selectedVilla.name, FaHouseUser],
                ["Aylık Doluluk", `%${occupancy}`, FaChartLine],
                ["Gece Fiyatı", money(selectedVilla.base_nightly_rate), FaMoneyBillWave],
                ["Rezervasyon", String(reservations.length), FaUsers],
                ["Bekleyen Temizlik", String(cleaning.filter((x) => !["completed", "inspected"].includes(x.status)).length), FaClipboardCheck],
                ["Marketplace", selectedVilla.marketplace_enabled ? "Yayında" : "Kapalı", FaBolt],
              ] as Array<[string, string, React.ComponentType<{ className?: string }>]>
              ).map(([label, value, Icon]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 shadow-2xl shadow-black/10">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><Icon className="text-emerald-400" /> {label}</div>
                  <div className="mt-3 truncate text-lg font-black">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1700px] px-5 py-6 lg:px-8">
        {error && <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}
        {message && <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">{message}</div>}

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.025] p-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex min-w-max items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${activeTab === id ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:bg-white/[.05] hover:text-white"}`}>
              <Icon /> {label}
            </button>
          ))}
        </div>

        {!villaId && <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-12 text-center text-slate-400">Önce bir villa oluştur veya yukarıdan villa seç.</div>}

        {villaId && activeTab === "calendar" && (
          <div className="mt-6 grid gap-6 2xl:grid-cols-[1fr_360px]">
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1626] shadow-2xl shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
                <div><h2 className="text-xl font-black">Aylık Takvim</h2><p className="mt-1 text-xs text-slate-500">Fiyat, müsaitlik ve kaynak durumunu günlük yönet.</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-xl border border-white/10 p-3 hover:bg-white/5"><FaChevronLeft /></button>
                  <div className="min-w-[160px] text-center font-black">{month.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</div>
                  <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-xl border border-white/10 p-3 hover:bg-white/5"><FaChevronRight /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 border-b border-white/10 bg-white/[.02] text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => <div key={d} className="p-3">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((cell, index) => {
                  if (!cell.date) return <div key={`blank-${index}`} className="min-h-[116px] border-b border-r border-white/[.05] bg-black/10" />;
                  const row = calendarMap.get(cell.date);
                  const status = row?.status ?? "available";
                  const price = row?.nightly_rate ?? selectedVilla?.base_nightly_rate ?? 0;
                  const accent = status === "reserved" ? "bg-rose-500/10 border-rose-400/20" : status === "available" ? "bg-emerald-500/[.035]" : "bg-amber-500/[.06] border-amber-400/10";
                  return (
                    <div key={cell.date} className={`min-h-[116px] border-b border-r border-white/[.05] p-3 ${accent}`}>
                      <div className="flex items-start justify-between gap-2"><div className="text-sm font-black">{cell.day}</div><span className={`h-2.5 w-2.5 rounded-full ${status === "reserved" ? "bg-rose-400" : status === "available" ? "bg-emerald-400" : "bg-amber-400"}`} /></div>
                      <div className="mt-4 text-sm font-black">{money(price)}</div>
                      <div className="mt-1 truncate text-[10px] font-bold text-slate-500">{statusLabel[status] ?? status}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">{row?.source ?? "varsayılan"}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-3xl border border-white/10 bg-[#0a1626] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-2"><FaCalendarAlt className="text-emerald-400" /><h2 className="text-lg font-black">Toplu Güncelleme</h2></div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Bir tarih aralığının fiyatını, minimum konaklamasını ve satış durumunu tek seferde değiştir.</p>
              <form onSubmit={applyRate} className="mt-5 space-y-3">
                <label className="block text-xs font-bold text-slate-400">Başlangıç<input type="date" value={rateForm.start} onChange={(e) => setRateForm({ ...rateForm, start: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-white" /></label>
                <label className="block text-xs font-bold text-slate-400">Bitiş<input type="date" value={rateForm.end} onChange={(e) => setRateForm({ ...rateForm, end: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-white" /></label>
                <label className="block text-xs font-bold text-slate-400">Gecelik fiyat<input type="number" value={rateForm.rate} onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })} placeholder={String(selectedVilla?.base_nightly_rate ?? 0)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-white" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-bold text-slate-400">Min gece<input type="number" value={rateForm.minimumStay} onChange={(e) => setRateForm({ ...rateForm, minimumStay: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-white" /></label>
                  <label className="block text-xs font-bold text-slate-400">Durum<select value={rateForm.status} onChange={(e) => setRateForm({ ...rateForm, status: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-white"><option value="available">Müsait</option><option value="blocked">Blokeli</option><option value="maintenance">Bakım</option><option value="owner_use">Ev sahibi</option></select></label>
                </div>
                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 disabled:opacity-50"><FaSyncAlt /> Günleri Güncelle</button>
              </form>
            </aside>
          </div>
        )}

        {villaId && activeTab === "media" && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0a1626] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Villa Fotoğraf Stüdyosu</h2><p className="mt-1 text-xs text-slate-500">Marketplace ve misafir portalında kullanılacak görseller.</p></div><label className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950"><FaCamera /> Fotoğraf Yükle<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void uploadPhotos(e.target.files)} /></label></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {photos.map((photo) => <div key={photo.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]"><div className="relative aspect-[4/3] bg-white/5">{photo.public_url ? <img src={photo.public_url} alt="Villa" className="h-full w-full object-cover" /> : null}{photo.is_cover && <div className="absolute left-3 top-3 rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-black text-slate-950">KAPAK</div>}</div><div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-xs text-slate-400">{photo.category ?? "Galeri"}</span>{!photo.is_cover && <button onClick={() => void setCover(photo)} className="text-xs font-black text-emerald-400">Kapak Yap</button>}</div></div>)}
              {!photos.length && <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">Henüz fotoğraf yok.</div>}
            </div>
          </section>
        )}

        {villaId && activeTab === "payments" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
            <section className="rounded-3xl border border-white/10 bg-[#0a1626] p-5"><h2 className="text-lg font-black">Ödeme / Tahsilat Gir</h2><form onSubmit={recordPayment} className="mt-5 space-y-3"><select value={paymentForm.reservationId} onChange={(e) => setPaymentForm({ ...paymentForm, reservationId: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"><option value="">Rezervasyon seç</option>{reservations.map((r) => <option key={r.id} value={r.id}>{r.reservation_code} · {r.guest_name} · kalan {money(r.balance, r.currency)}</option>)}</select><input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="Tutar" className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"/><div className="grid grid-cols-2 gap-2"><select value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })} className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"><option value="payment">Tahsilat</option><option value="extra">Ek ödeme</option><option value="refund">İade</option><option value="deposit">Depozito</option><option value="deposit_refund">Depozito iade</option></select><select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"><option value="transfer">Havale</option><option value="cash">Nakit</option><option value="card">Kart</option><option value="agency">Acenta</option></select></div><button disabled={busy} className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Ödemeyi Kaydet</button></form></section>
            <section className="rounded-3xl border border-white/10 bg-[#0a1626] p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Finans Hareketleri</h2><span className="text-xs text-slate-500">{payments.length} hareket</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="py-3">Tarih</th><th>Rezervasyon</th><th>Tür</th><th>Yöntem</th><th className="text-right">Tutar</th></tr></thead><tbody>{payments.map((p) => { const r = reservations.find((x) => x.id === p.reservation_id); return <tr key={p.id} className="border-t border-white/[.06]"><td className="py-4 text-slate-400">{new Date(p.payment_date).toLocaleDateString("tr-TR")}</td><td className="font-bold">{r?.reservation_code ?? "-"}</td><td>{p.payment_type}</td><td>{p.method}</td><td className="text-right font-black text-emerald-300">{money(p.amount, p.currency)}</td></tr>; })}</tbody></table></div></section>
          </div>
        )}

        {villaId && activeTab === "cleaning" && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0a1626] p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Temizlik Operasyon Merkezi</h2><p className="mt-1 text-xs text-slate-500">Çıkış sonrası görevleri başlat, tamamla ve kontrol et.</p></div><FaClipboardCheck className="text-3xl text-emerald-400" /></div><div className="mt-6 grid gap-3 xl:grid-cols-2">{cleaning.map((task) => <div key={task.id} className="rounded-2xl border border-white/10 bg-[#07111f] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{new Date(`${task.task_date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</div><div className="mt-1 text-xs text-slate-500">{task.task_type} · {money(task.fee)}</div></div><span className="rounded-full bg-white/[.05] px-3 py-1 text-[10px] font-black uppercase text-slate-300">{task.status}</span></div><div className="mt-4 flex flex-wrap gap-2">{task.status === "pending" && <button onClick={() => void updateCleaning(task, "in_progress")} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950">Başlat</button>}{task.status === "in_progress" && <button onClick={() => void updateCleaning(task, "completed")} className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-slate-950">Temizlik Tamam</button>}{task.status === "completed" && <button onClick={() => void updateCleaning(task, "inspected")} className="flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950"><FaCheckCircle /> Kontrol Onayı</button>}</div></div>)}{!cleaning.length && <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">Temizlik görevi bulunmuyor.</div>}</div></section>
        )}

        {villaId && activeTab === "invoices" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]"><section className="rounded-3xl border border-white/10 bg-[#0a1626] p-5"><h2 className="text-xl font-black">Fatura Merkezi</h2><div className="mt-5 space-y-3">{invoices.map((invoice) => { const r = reservations.find((x) => x.id === invoice.reservation_id); return <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#07111f] p-4"><div><div className="font-black">{invoice.invoice_no ?? r?.reservation_code ?? "Fatura"}</div><div className="mt-1 text-xs text-slate-500">{r?.guest_name} · {invoice.provider ?? "API bekliyor"}</div></div><div className="text-right"><div className="font-black">{money(invoice.total_amount, invoice.currency)}</div><div className="mt-1 text-[10px] font-black uppercase text-amber-300">{invoice.invoice_status}</div></div></div>; })}{!invoices.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">Henüz fatura kaydı yok.</div>}</div></section><aside className="rounded-3xl border border-white/10 bg-[#0a1626] p-5"><h2 className="text-lg font-black">Fatura Oluştur</h2><p className="mt-2 text-xs leading-5 text-slate-500">Şimdilik kuyruğa kaydeder. E-Fatura / E-Arşiv API bağlandığında aynı kayıtlar otomatik gönderilecek.</p><div className="mt-5 space-y-2">{reservations.filter((r) => !invoices.some((i) => i.reservation_id === r.id)).slice(0, 8).map((r) => <button key={r.id} onClick={() => void createInvoice(r)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#07111f] p-3 text-left hover:border-emerald-400/30"><span><strong className="block text-sm">{r.reservation_code}</strong><small className="text-slate-500">{r.guest_name}</small></span><span className="font-black">{money(r.grand_total, r.currency)}</span></button>)}</div></aside></div>
        )}

        {villaId && activeTab === "channels" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]"><section className="rounded-3xl border border-white/10 bg-[#0a1626] p-5"><div className="flex items-center gap-2"><FaLink className="text-emerald-400"/><h2 className="text-lg font-black">Yeni Kanal Bağlantısı</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">Airbnb/VRBO gibi kanallardan iCal adresini ekle. Villa OS export adresini de karşı kanala yapıştır.</p><form onSubmit={addChannel} className="mt-5 space-y-3"><select value={channelForm.channel} onChange={(e) => setChannelForm({ ...channelForm, channel: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"><option value="airbnb">Airbnb</option><option value="booking">Booking</option><option value="vrbo">VRBO</option><option value="google">Google</option><option value="other">Diğer</option></select><input value={channelForm.importUrl} onChange={(e) => setChannelForm({ ...channelForm, importUrl: e.target.value })} placeholder="https://.../calendar.ics" className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"/><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950"><FaPlus /> Kanalı Ekle</button></form></section><section className="rounded-3xl border border-white/10 bg-[#0a1626] p-5"><h2 className="text-xl font-black">Channel Manager</h2><div className="mt-5 space-y-3">{channels.map((channel) => <div key={channel.id} className="rounded-2xl border border-white/10 bg-[#07111f] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-black uppercase">{channel.channel}</div><div className="mt-1 text-xs text-slate-500">{channel.connection_type} · {channel.is_active ? "aktif" : "kapalı"}</div></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-300">{channel.last_sync_status ?? "Bağlantı hazır"}</span></div>{channel.import_url && <div className="mt-4 truncate rounded-lg bg-white/[.03] p-2 text-[11px] text-slate-500">IMPORT: {channel.import_url}</div>}<div className="mt-2 break-all rounded-lg bg-emerald-500/[.06] p-2 text-[11px] text-emerald-300">EXPORT: {typeof window !== "undefined" ? window.location.origin : ""}/api/villa-os/ical/{channel.export_token}</div></div>)}{!channels.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">Bağlı kanal yok.</div>}</div></section></div>
        )}
      </div>
    </main>
  );
}
