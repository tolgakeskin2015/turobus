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
  sales_channel: string;
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

const channelMeta: Record<
  string,
  {
    label: string;
    pill: string;
    dot: string;
  }
> = {
  airbnb: {
    label: "Airbnb",
    pill: "border-rose-400/25 bg-rose-500/15 text-rose-200",
    dot: "bg-rose-400",
  },

  booking: {
    label: "Booking",
    pill: "border-blue-400/25 bg-blue-500/15 text-blue-200",
    dot: "bg-blue-400",
  },

  vrbo: {
    label: "VRBO",
    pill: "border-indigo-400/25 bg-indigo-500/15 text-indigo-200",
    dot: "bg-indigo-400",
  },

  turobus_marketplace: {
    label: "Turobus",
    pill: "border-emerald-400/25 bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-400",
  },

  direct: {
    label: "Direkt",
    pill: "border-cyan-400/25 bg-cyan-500/15 text-cyan-200",
    dot: "bg-cyan-400",
  },

  agency: {
    label: "Acenta",
    pill: "border-amber-400/25 bg-amber-500/15 text-amber-200",
    dot: "bg-amber-400",
  },

  b2b: {
    label: "B2B",
    pill: "border-violet-400/25 bg-violet-500/15 text-violet-200",
    dot: "bg-violet-400",
  },

  external: {
    label: "Harici",
    pill: "border-slate-400/25 bg-slate-500/15 text-slate-200",
    dot: "bg-slate-400",
  },
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
      supabase.from("villa_reservations").select("id,reservation_code,sales_channel,guest_name,check_in,check_out,grand_total,paid_total,balance,currency,status").eq("company_id", membership.company_id).eq("villa_id", villaId).order("check_in", { ascending: false }).limit(100),
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
    const blocked = calendar.filter((d) =>
      ["reserved", "blocked", "owner_use", "maintenance"].includes(d.status)
    ).length;

    return total ? Math.round((blocked / total) * 100) : 0;
  }, [calendar, month]);

  const reservationForDate = useCallback(
    (date: string) => {
      return reservations.find(
        (reservation) =>
          reservation.status !== "cancelled" &&
          date >= reservation.check_in &&
          date < reservation.check_out
      );
    },
    [reservations]
  );

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

  async function syncChannel(channel: Channel) {
    if (!membership) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        throw new Error("Oturum bulunamadı.");
      }

      const response = await fetch(
        "/api/villa-os/ical/import",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            companyId: membership.company_id,
            connectionId: channel.id,
          }),
        }
      );

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        events?: number;
        created?: number;
        updated?: number;
        removed?: number;
      };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            "iCal senkronizasyonu başarısız."
        );
      }

      setMessage(
        `Senkron tamamlandı · ${result.events ?? 0} kayıt · ${result.created ?? 0} yeni · ${result.updated ?? 0} güncellendi · ${result.removed ?? 0} kaldırıldı`
      );

      await loadVillaData();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "iCal senkronizasyonu başarısız."
      );
    } finally {
      setBusy(false);
    }
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
    <main className="min-h-screen bg-[#060d17] text-white">
      <div className="sticky top-0 z-30 border-b border-white/[.07] bg-[#081320]/95 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl lg:px-6">
        <div className="mx-auto max-w-[1700px]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"><FaBolt /></div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.26em] text-emerald-400">TUROBUS VILLA OS</div>
                  <h1 className="text-xl font-black tracking-tight lg:text-2xl">Operasyon Merkezi</h1>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/villa-os" className="rounded-lg border border-white/10 bg-white/[.035] px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[.06]">← Portföy</Link>
              <select value={villaId} onChange={(e) => setVillaId(e.target.value)} className="min-w-[260px] rounded-lg border border-white/10 bg-[#0c1928] px-3 py-2 text-sm font-black outline-none ring-emerald-400/30 focus:ring-2">
                <option value="">Villa seç</option>
                {villas.map((villa) => <option key={villa.id} value={villa.id}>{villa.name}</option>)}
              </select>
            </div>
          </div>

          {selectedVilla && (
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              {([
                ["Villa", selectedVilla.name, FaHouseUser],
                ["Aylık Doluluk", `%${occupancy}`, FaChartLine],
                ["Gece Fiyatı", money(selectedVilla.base_nightly_rate), FaMoneyBillWave],
                ["Rezervasyon", String(reservations.length), FaUsers],
                ["Bekleyen Temizlik", String(cleaning.filter((x) => !["completed", "inspected"].includes(x.status)).length), FaClipboardCheck],
                ["Marketplace", selectedVilla.marketplace_enabled ? "Yayında" : "Kapalı", FaBolt],
              ] as Array<[string, string, React.ComponentType<{ className?: string }>]>
              ).map(([label, value, Icon]) => (
                <div key={String(label)} className="group rounded-xl border border-white/[.07] bg-[#0b1826] px-3 py-2.5 transition hover:border-emerald-400/20 hover:bg-[#0e1d2d]">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.13em] text-slate-500"><Icon className="text-emerald-400" /> {label}</div>
                  <div className="mt-1 truncate text-base font-black">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-4 py-4 lg:px-6">
        {error && <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}
        {message && <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">{message}</div>}

        <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">

          <aside className="h-fit overflow-hidden rounded-xl border border-white/[.07] bg-[#091522] shadow-xl shadow-black/20 xl:sticky xl:top-[150px]">
            <div className="border-b border-white/[.07] px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.18em] text-slate-500">
                    PORTFÖY
                  </div>
                  <div className="mt-1 text-sm font-black">
                    Villalar
                  </div>
                </div>

                <Link
                  href="/dashboard/villa-os"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 text-slate-950"
                  title="Villa ekle"
                >
                  <FaPlus />
                </Link>
              </div>
            </div>

            <div className="max-h-[62vh] space-y-1 overflow-y-auto p-2">
              {villas.map((villa) => {
                const selected = villa.id === villaId;

                return (
                  <button
                    key={villa.id}
                    type="button"
                    onClick={() => setVillaId(villa.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      selected
                        ? "border-emerald-400/30 bg-emerald-400/[.09]"
                        : "border-transparent hover:border-white/[.07] hover:bg-white/[.035]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          selected
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-white/[.05] text-slate-400"
                        }`}
                      >
                        <FaHouseUser />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-black">
                          {villa.name}
                        </div>

                        <div className="mt-1 truncate text-[10px] text-slate-500">
                          {[villa.city, villa.district].filter(Boolean).join(" · ") || "Konum yok"}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400">
                            {money(villa.base_nightly_rate)}
                          </span>

                          <span
                            className={`h-2 w-2 rounded-full ${
                              villa.marketplace_enabled
                                ? "bg-emerald-400"
                                : "bg-slate-600"
                            }`}
                            title={villa.marketplace_enabled ? "Turobus'ta yayında" : "Marketplace kapalı"}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!villas.length && (
                <div className="rounded-lg border border-dashed border-white/10 p-5 text-center">
                  <FaHouseUser className="mx-auto text-2xl text-slate-600" />
                  <div className="mt-2 text-xs font-bold text-slate-400">
                    Henüz villa yok
                  </div>
                  <Link
                    href="/dashboard/villa-os"
                    className="mt-3 inline-flex rounded-lg bg-emerald-400 px-3 py-2 text-[10px] font-black text-slate-950"
                  >
                    Villa Oluştur
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t border-white/[.07] p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/[.025] p-2.5">
                  <div className="text-[9px] uppercase text-slate-600">Toplam</div>
                  <div className="mt-1 text-sm font-black">{villas.length}</div>
                </div>

                <div className="rounded-lg bg-white/[.025] p-2.5">
                  <div className="text-[9px] uppercase text-slate-600">Yayında</div>
                  <div className="mt-1 text-sm font-black text-emerald-300">
                    {villas.filter((v) => v.marketplace_enabled).length}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0">
        <div className="flex gap-1 overflow-x-auto border-b border-white/[.07] bg-transparent pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition ${activeTab === id ? "bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/15" : "text-slate-400 hover:bg-white/[.04] hover:text-white"}`}>
              <Icon /> {label}
            </button>
          ))}
        </div>

        {!villaId && (
          <div className="mt-4">
            <div className="overflow-hidden rounded-xl border border-white/[.07] bg-[#091522]">
              <div className="border-b border-white/[.07] bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.12),transparent_35%)] p-6">
                <div className="max-w-2xl">
                  <div className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-400">
                    TUROBUS VILLA NETWORK
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    Portföyünden bir villa seç
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Takvim, fiyat, rezervasyon, ödeme, temizlik, fatura,
                    Airbnb ve Turobus dağıtımını tek çalışma alanından yönet.
                  </p>
                </div>
              </div>

              <div className="grid gap-px bg-white/[.06] sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ["Merkezi Takvim", "Airbnb, direkt, acenta ve Turobus satışlarını tek stoktan yönet.", FaCalendarAlt],
                  ["Gelir Yönetimi", "Günlük fiyat ve minimum gece kurallarını tarih aralığına uygula.", FaChartLine],
                  ["Finans", "Tahsilat, bakiye, depozito ve iadeleri rezervasyon bazında takip et.", FaMoneyBillWave],
                  ["Housekeeping", "Çıkış sonrası temizliği başlat, tamamlat ve kontrol onayı ver.", FaClipboardCheck],
                  ["Channel Manager", "iCal bağlantıları ve kanal senkron durumunu tek yerde izle.", FaAirbnb],
                  ["Marketplace", "İstediğin villayı Turobus.com satışına aç veya kapat.", FaBolt],
                ] as Array<[string, string, React.ComponentType<{ className?: string }>]>
                ).map(([title, description, Icon]) => (
                  <div key={String(title)} className="bg-[#091522] p-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[.04] text-emerald-400">
                      <Icon />
                    </div>
                    <div className="mt-4 text-sm font-black">{title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {villaId && activeTab === "calendar" && (
          <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded-xl border border-white/[.07] bg-[#091522] shadow-xl shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-4 py-3">
                <div><h2 className="text-base font-black">Aylık Takvim & Fiyat</h2><p className="text-[10px] text-slate-500">Fiyat · müsaitlik · kanal · minimum gece</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-xl border border-white/10 p-3 hover:bg-white/5"><FaChevronLeft /></button>
                  <div className="min-w-[160px] text-center font-black">{month.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</div>
                  <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-xl border border-white/10 p-3 hover:bg-white/5"><FaChevronRight /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-b border-white/[.06] bg-black/10 px-4 py-2">
                {[
                  ["Airbnb", "bg-rose-400"],
                  ["Turobus", "bg-emerald-400"],
                  ["Direkt", "bg-cyan-400"],
                  ["Acenta", "bg-amber-400"],
                  ["B2B", "bg-violet-400"],
                  ["Booking", "bg-blue-400"],
                ].map(([label, dot]) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500"
                  >
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 border-b border-white/10 bg-white/[.02] text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => <div key={d} className="p-3">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((cell, index) => {
                  if (!cell.date) return <div key={`blank-${index}`} className="min-h-[82px] border-b border-r border-white/[.05] bg-black/10" />;
                  const row = calendarMap.get(cell.date);
                  const reservation = reservationForDate(cell.date);

                  const status =
                    reservation
                      ? "reserved"
                      : row?.status ?? "available";

                  const price =
                    row?.nightly_rate ??
                    selectedVilla?.base_nightly_rate ??
                    0;

                  const channel =
                    reservation
                      ? channelMeta[reservation.sales_channel] ??
                        channelMeta.external
                      : null;

                  const isCheckIn =
                    reservation?.check_in === cell.date;

                  const tomorrow = new Date(`${cell.date}T12:00:00`);
                  tomorrow.setDate(tomorrow.getDate() + 1);

                  const tomorrowIso = iso(tomorrow);

                  const isLastNight =
                    Boolean(
                      reservation &&
                      tomorrowIso === reservation.check_out
                    );

                  const accent =
                    reservation
                      ? "bg-white/[.018]"
                      : status === "available"
                        ? "bg-emerald-500/[.025]"
                        : "bg-amber-500/[.05]";

                  return (
                    <div
                      key={cell.date}
                      className={`relative min-h-[100px] overflow-hidden border-b border-r border-white/[.05] p-2 ${accent} transition hover:bg-white/[.04]`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-black">
                          {cell.day}
                        </div>

                        <span
                          className={`h-2 w-2 rounded-full ${
                            reservation
                              ? channel?.dot
                              : status === "available"
                                ? "bg-emerald-400"
                                : "bg-amber-400"
                          }`}
                        />
                      </div>

                      <div className="mt-1.5 text-[11px] font-black text-slate-300">
                        {money(price)}
                      </div>

                      {reservation ? (
                        <div
                          className={`mt-2 border px-2 py-1.5 text-[9px] font-black shadow-lg ${
                            channel?.pill
                          } ${
                            isCheckIn
                              ? "rounded-l-lg"
                              : "border-l-0"
                          } ${
                            isLastNight
                              ? "rounded-r-lg"
                              : "border-r-0"
                          }`}
                          title={`${reservation.guest_name} · ${reservation.check_in} / ${reservation.check_out}`}
                        >
                          <div className="truncate">
                            {isCheckIn
                              ? reservation.guest_name
                              : "•••"}
                          </div>

                          {isCheckIn && (
                            <div className="mt-0.5 truncate text-[8px] opacity-70">
                              {channel?.label} · {reservation.reservation_code}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="mt-1 truncate text-[9px] font-bold text-slate-500">
                            {statusLabel[status] ?? status}
                          </div>

                          <div className="mt-0.5 text-[8px] uppercase tracking-wider text-slate-600">
                            {row?.source ?? "varsayılan"}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-xl border border-white/[.07] bg-[#091522] p-4 shadow-xl shadow-black/20">
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
          <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]"><section className="rounded-3xl border border-white/10 bg-[#0a1626] p-5"><div className="flex items-center gap-2"><FaLink className="text-emerald-400"/><h2 className="text-lg font-black">Yeni Kanal Bağlantısı</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">Airbnb/VRBO gibi kanallardan iCal adresini ekle. Villa OS export adresini de karşı kanala yapıştır.</p><form onSubmit={addChannel} className="mt-5 space-y-3"><select value={channelForm.channel} onChange={(e) => setChannelForm({ ...channelForm, channel: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"><option value="airbnb">Airbnb</option><option value="booking">Booking</option><option value="vrbo">VRBO</option><option value="google">Google</option><option value="other">Diğer</option></select><input value={channelForm.importUrl} onChange={(e) => setChannelForm({ ...channelForm, importUrl: e.target.value })} placeholder="https://.../calendar.ics" className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"/><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950"><FaPlus /> Kanalı Ekle</button></form></section><section className="rounded-3xl border border-white/10 bg-[#0a1626] p-5"><h2 className="text-xl font-black">Channel Manager</h2><div className="mt-5 space-y-3">{channels.map((channel) => <div key={channel.id} className="rounded-2xl border border-white/10 bg-[#07111f] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-black uppercase">{channel.channel}</div><div className="mt-1 text-xs text-slate-500">{channel.connection_type} · {channel.is_active ? "aktif" : "kapalı"}</div></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-300">{channel.last_sync_status ?? "Bağlantı hazır"}</span></div>{channel.import_url && <div className="mt-4 truncate rounded-lg bg-white/[.03] p-2 text-[11px] text-slate-500">IMPORT: {channel.import_url}</div>}<div className="mt-2 break-all rounded-lg bg-emerald-500/[.06] p-2 text-[11px] text-emerald-300">EXPORT: {typeof window !== "undefined" ? window.location.origin : ""}/api/villa-os/ical/{channel.export_token}</div>

{channel.import_url && (
  <button
    type="button"
    disabled={busy}
    onClick={() => void syncChannel(channel)}
    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
  >
    <FaSyncAlt />
    Şimdi Senkronize Et
  </button>
)}

{channel.last_sync_at && (
  <div className="mt-2 text-[9px] text-slate-600">
    Son senkron: {new Date(channel.last_sync_at).toLocaleString("tr-TR")}
  </div>
)}
</div>)}{!channels.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">Bağlı kanal yok.</div>}</div></section></div>
        )}

          </section>

          <aside className="space-y-4 xl:sticky xl:top-[150px] xl:h-fit">

            <section className="overflow-hidden rounded-xl border border-white/[.07] bg-[#091522] shadow-xl shadow-black/20">
              <div className="border-b border-white/[.07] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">
                      CANLI OPERASYON
                    </div>
                    <div className="mt-1 text-sm font-black">
                      Bugün
                    </div>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                    <FaBolt />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-px bg-white/[.06]">
                <div className="bg-[#091522] p-3 text-center">
                  <div className="text-xl font-black">
                    {reservations.filter((r) => r.check_in === iso(new Date())).length}
                  </div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                    Giriş
                  </div>
                </div>

                <div className="bg-[#091522] p-3 text-center">
                  <div className="text-xl font-black">
                    {reservations.filter((r) => r.check_out === iso(new Date())).length}
                  </div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                    Çıkış
                  </div>
                </div>

                <div className="bg-[#091522] p-3 text-center">
                  <div className="text-xl font-black text-amber-300">
                    {cleaning.filter((x) => !["completed", "inspected"].includes(x.status)).length}
                  </div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                    Temizlik
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-3">
                {reservations
                  .filter((r) => r.check_in === iso(new Date()) || r.check_out === iso(new Date()))
                  .slice(0, 5)
                  .map((r) => (
                    <div key={r.id} className="rounded-lg border border-white/[.06] bg-white/[.025] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black">{r.guest_name}</span>
                        <span className="text-[9px] font-black text-slate-500">
                          {r.check_in === iso(new Date()) ? "GİRİŞ" : "ÇIKIŞ"}
                        </span>
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {r.reservation_code}
                      </div>
                    </div>
                  ))}

                {!reservations.some(
                  (r) => r.check_in === iso(new Date()) || r.check_out === iso(new Date())
                ) && (
                  <div className="rounded-lg border border-dashed border-white/[.07] p-4 text-center text-[10px] text-slate-500">
                    Bugün giriş veya çıkış yok.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-white/[.07] bg-[#091522] p-4 shadow-xl shadow-black/20">
              <div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">
                FİNANS DURUMU
              </div>

              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Rezervasyon Cirosu</span>
                  <span className="text-sm font-black">
                    {money(reservations.reduce((sum, r) => sum + Number(r.grand_total || 0), 0))}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Tahsil Edilen</span>
                  <span className="text-sm font-black text-emerald-300">
                    {money(reservations.reduce((sum, r) => sum + Number(r.paid_total || 0), 0))}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Bekleyen Bakiye</span>
                  <span className="text-sm font-black text-amber-300">
                    {money(reservations.reduce((sum, r) => sum + Number(r.balance || 0), 0))}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("payments")}
                disabled={!villaId}
                className="mt-4 w-full rounded-lg border border-white/[.08] bg-white/[.035] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[.06] disabled:opacity-40"
              >
                Finans Merkezini Aç
              </button>
            </section>

            <section className="rounded-xl border border-white/[.07] bg-[#091522] p-4 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">
                  DAĞITIM AĞI
                </div>
                <FaAirbnb className="text-slate-500" />
              </div>

              <div className="mt-3 space-y-2">
                {[
                  ["Turobus Marketplace", selectedVilla?.marketplace_enabled ?? false],
                  ["Airbnb / iCal", channels.some((x) => x.channel === "airbnb" && x.is_active)],
                  ["Aktif Kanal", channels.some((x) => x.is_active)],
                ].map(([label, active]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-lg bg-white/[.025] px-3 py-2.5">
                    <span className="text-xs text-slate-400">{String(label)}</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        active ? "bg-emerald-400" : "bg-slate-600"
                      }`}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("channels")}
                disabled={!villaId}
                className="mt-3 w-full rounded-lg border border-white/[.08] px-3 py-2 text-xs font-black text-slate-300 hover:bg-white/[.04] disabled:opacity-40"
              >
                Kanal Merkezini Aç
              </button>
            </section>

            <section className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.045] p-4">
              <div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-400">
                HIZLI İŞLEMLER
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/villa-os"
                  className="rounded-lg bg-emerald-400 px-3 py-2.5 text-center text-[10px] font-black text-slate-950"
                >
                  + Rezervasyon
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveTab("calendar")}
                  disabled={!villaId}
                  className="rounded-lg bg-white/[.06] px-3 py-2.5 text-[10px] font-black text-white disabled:opacity-40"
                >
                  Fiyat Güncelle
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cleaning")}
                  disabled={!villaId}
                  className="rounded-lg bg-white/[.06] px-3 py-2.5 text-[10px] font-black text-white disabled:opacity-40"
                >
                  Temizlik
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("invoices")}
                  disabled={!villaId}
                  className="rounded-lg bg-white/[.06] px-3 py-2.5 text-[10px] font-black text-white disabled:opacity-40"
                >
                  Fatura
                </button>
              </div>
            </section>

          </aside>

        </div>

      </div>
    </main>
  );
}
