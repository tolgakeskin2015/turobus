"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBolt,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaHouseUser,
  FaMoneyBillWave,
  FaSyncAlt,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { CurrentMembership, getCurrentMembership } from "@/lib/current-user";

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

type CalendarDay = {
  calendar_date: string;
  is_available: boolean;
  public_rate: number;
  partner_rate: number;
  minimum_stay: number;
  availability_state: string;
};

type Quote = {
  ok: boolean;
  available: boolean;
  conflict: boolean;
  minimum_stay: number;
  nights: number;
  public_total: number;
  partner_total: number;
  suggested_customer_total: number;
  suggested_margin: number;
  currency: string;
  instant_confirm: boolean;
  pricing_type: string;
};

type BookingResult = {
  reservation_code?: string;
  owner_total?: number;
  customer_total?: number;
  partner_margin?: number;
  currency?: string;
  status?: string;
};

const money = (value: number | null | undefined, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const iso = (date: Date) => date.toISOString().slice(0, 10);

const plusDays = (value: string, days: number) => {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + days);
  return iso(d);
};

export default function VillaB2BSalesDeskPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [selectedVillaId, setSelectedVillaId] = useState("");
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const today = useMemo(() => iso(new Date()), []);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(plusDays(today, 3));
  const [customerTotal, setCustomerTotal] = useState("");
  const [guest, setGuest] = useState({
    name: "",
    phone: "",
    email: "",
    count: "2",
    reference: "",
  });

  const selectedVilla = useMemo(
    () => catalog.find((x) => x.villa_id === selectedVillaId) ?? null,
    [catalog, selectedVillaId]
  );

  const loadCalendar = useCallback(
    async (companyId: string, villaId: string) => {
      const start = today;
      const end = plusDays(today, 41);
      const { data, error: rpcError } = await supabase.rpc(
        "get_villa_b2b_sales_calendar",
        {
          p_partner_company_id: companyId,
          p_villa_id: villaId,
          p_start_date: start,
          p_end_date: end,
        }
      );
      if (rpcError) throw rpcError;
      setCalendar((data ?? []) as CalendarDay[]);
    },
    [today]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const current = await getCurrentMembership(user.id);
      if (!current) return;
      setMembership(current);

      const { data, error: catalogError } = await supabase.rpc(
        "get_villa_b2b_catalog",
        { p_partner_company_id: current.company_id }
      );
      if (catalogError) throw catalogError;

      const rows = (data ?? []) as CatalogRow[];
      setCatalog(rows);
      const firstVilla = selectedVillaId || rows[0]?.villa_id || "";
      if (firstVilla) {
        setSelectedVillaId(firstVilla);
        await loadCalendar(current.company_id, firstVilla);
      } else {
        setCalendar([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "B2B satış masası yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [loadCalendar, selectedVillaId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectVilla(villaId: string) {
    setSelectedVillaId(villaId);
    setQuote(null);
    setMessage("");
    if (membership) {
      setBusy(true);
      try {
        await loadCalendar(membership.company_id, villaId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Takvim yüklenemedi.");
      } finally {
        setBusy(false);
      }
    }
  }

  async function calculateQuote() {
    if (!membership || !selectedVillaId || !checkIn || !checkOut) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_villa_b2b_sales_quote",
        {
          p_partner_company_id: membership.company_id,
          p_villa_id: selectedVillaId,
          p_check_in: checkIn,
          p_check_out: checkOut,
        }
      );
      if (rpcError) throw rpcError;
      const result = data as Quote;
      setQuote(result);
      setCustomerTotal(String(Math.round(Number(result.suggested_customer_total || 0))));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fiyat hesaplanamadı.");
    } finally {
      setBusy(false);
    }
  }

  function pickDate(day: CalendarDay) {
    if (!day.is_available) return;
    if (!checkIn || day.calendar_date <= checkIn || quote) {
      setCheckIn(day.calendar_date);
      setCheckOut(plusDays(day.calendar_date, Math.max(day.minimum_stay || 1, 1)));
      setQuote(null);
      return;
    }
    setCheckOut(plusDays(day.calendar_date, 1));
    setQuote(null);
  }

  async function createBooking(e: FormEvent) {
    e.preventDefault();
    if (!membership || !quote || !quote.available || !guest.name || !customerTotal) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "create_villa_b2b_booking",
        {
          p_partner_company_id: membership.company_id,
          p_villa_id: selectedVillaId,
          p_guest_name: guest.name,
          p_guest_phone: guest.phone || null,
          p_guest_email: guest.email || null,
          p_guest_count: Number(guest.count || 1),
          p_check_in: checkIn,
          p_check_out: checkOut,
          p_customer_total: Number(customerTotal),
          p_partner_reference: guest.reference || null,
        }
      );
      if (rpcError) throw rpcError;
      const result = data as BookingResult;
      setMessage(
        `Rezervasyon oluşturuldu${result.reservation_code ? ` · ${result.reservation_code}` : ""}${result.partner_margin != null ? ` · Marj ${money(result.partner_margin, result.currency)}` : ""}`
      );
      setGuest({ name: "", phone: "", email: "", count: "2", reference: "" });
      setQuote(null);
      await loadCalendar(membership.company_id, selectedVillaId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rezervasyon oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  const enteredCustomerTotal = Number(customerTotal || 0);
  const currentMargin = quote ? Math.max(enteredCustomerTotal - quote.partner_total, 0) : 0;
  const marginPercent = enteredCustomerTotal > 0 ? Math.round((currentMargin / enteredCustomerTotal) * 100) : 0;

  if (loading) {
    return <main className="min-h-screen bg-[#06101b] p-8 text-white">B2B satış masası hazırlanıyor…</main>;
  }

  return (
    <main className="min-h-screen bg-[#050d17] text-white">
      <header className="border-b border-white/[.07] bg-[#081522] px-5 py-4 lg:px-7">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400 text-slate-950 shadow-lg shadow-violet-500/20"><FaBolt /></div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">TUROBUS VILLA B2B</div>
              <h1 className="text-2xl font-black">Partner Satış Masası</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/villa-os/b2b-network" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-300">← B2B Dağıtım</Link>
            <Link href="/dashboard/villa-os/b2b-network/partners" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-300">Partner Ağı</Link>
            <button onClick={() => void load()} className="flex items-center gap-2 rounded-lg bg-white/[.05] px-3 py-2 text-xs font-black"><FaSyncAlt /> Yenile</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] px-5 py-5 lg:px-7">
        {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</div>}
        {message && <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">{message}</div>}

        {!catalog.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#091724] p-12 text-center">
            <FaHouseUser className="mx-auto text-4xl text-slate-600" />
            <h2 className="mt-4 text-xl font-black">B2B portföyünüz henüz boş</h2>
            <p className="mt-2 text-sm text-slate-500">Partner daveti kabul edildiğinde villalar burada satışa açılır.</p>
            <Link href="/dashboard/villa-os/b2b-network/partners" className="mt-5 inline-flex rounded-lg bg-violet-400 px-4 py-3 text-sm font-black text-slate-950">Partner Ağına Git</Link>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
            <aside className="h-fit overflow-hidden rounded-xl border border-white/[.07] bg-[#091724] xl:sticky xl:top-4">
              <div className="border-b border-white/[.07] px-4 py-3">
                <div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">B2B PORTFÖYÜM</div>
                <div className="mt-1 text-sm font-black">Satılabilir Villalar · {catalog.length}</div>
              </div>
              <div className="max-h-[75vh] space-y-2 overflow-y-auto p-2">
                {catalog.map((villa) => {
                  const active = villa.villa_id === selectedVillaId;
                  return (
                    <button key={villa.villa_id} onClick={() => void selectVilla(villa.villa_id)} className={`w-full overflow-hidden rounded-xl border text-left transition ${active ? "border-violet-400/35 bg-violet-400/[.08]" : "border-white/[.06] bg-[#06101b] hover:border-white/15"}`}>
                      <div className="h-28 bg-white/[.03]">{villa.cover_url ? <img src={villa.cover_url} alt={villa.villa_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><FaHouseUser className="text-3xl text-slate-700" /></div>}</div>
                      <div className="p-3">
                        <div className="truncate text-sm font-black">{villa.villa_name}</div>
                        <div className="mt-1 truncate text-[10px] text-slate-500">{[villa.city, villa.district].filter(Boolean).join(" · ") || "Konum yok"}</div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-violet-200">Net {money(villa.effective_nightly_rate)}</span>
                          <span className="rounded-full bg-white/[.05] px-2 py-1 text-[9px] font-black text-slate-400">{villa.instant_confirm ? "ANINDA" : "ONAYLI"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="min-w-0 space-y-4">
              <div className="rounded-xl border border-white/[.07] bg-[#091724] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[.16em] text-violet-300">SATIŞ TAKVİMİ</div>
                    <h2 className="mt-1 text-xl font-black">{selectedVilla?.villa_name}</h2>
                    <div className="mt-1 text-xs text-slate-500">{selectedVilla ? `${selectedVilla.max_guests} misafir · minimum ${selectedVilla.minimum_stay} gece · net başlangıç ${money(selectedVilla.effective_nightly_rate)}` : ""}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <label className="text-[9px] font-black uppercase text-slate-500">Giriş<input type="date" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); setQuote(null); }} className="mt-1 block rounded-lg border border-white/10 bg-[#06101b] px-3 py-2 text-xs text-white" /></label>
                    <label className="text-[9px] font-black uppercase text-slate-500">Çıkış<input type="date" min={plusDays(checkIn, 1)} value={checkOut} onChange={(e) => { setCheckOut(e.target.value); setQuote(null); }} className="mt-1 block rounded-lg border border-white/10 bg-[#06101b] px-3 py-2 text-xs text-white" /></label>
                    <button onClick={() => void calculateQuote()} disabled={busy} className="col-span-2 rounded-lg bg-violet-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-50"><FaMoneyBillWave className="mr-2 inline" /> Fiyatla</button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/[.07] bg-[#091724]">
                <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3">
                  <div><div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">ÖNÜMÜZDEKİ 42 GÜN</div><div className="mt-1 text-sm font-black">Canlı Müsaitlik & Net B2B Fiyat</div></div>
                  <FaCalendarAlt className="text-violet-300" />
                </div>
                <div className="grid grid-cols-7 border-b border-white/[.06] text-center text-[9px] font-black uppercase text-slate-600">
                  {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((d) => <div key={d} className="py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {calendar.map((day) => {
                    const d = new Date(`${day.calendar_date}T12:00:00`);
                    const selected = day.calendar_date === checkIn || (day.calendar_date >= checkIn && day.calendar_date < checkOut);
                    return (
                      <button key={day.calendar_date} type="button" disabled={!day.is_available} onClick={() => pickDate(day)} className={`min-h-[92px] border-b border-r border-white/[.05] p-2 text-left transition ${!day.is_available ? "cursor-not-allowed bg-rose-500/[.05] opacity-55" : selected ? "bg-violet-400/[.10] ring-1 ring-inset ring-violet-400/25" : "bg-[#07131f] hover:bg-white/[.035]"}`}>
                        <div className="flex items-center justify-between"><span className="text-xs font-black">{d.getDate()}</span><span className={`h-2 w-2 rounded-full ${day.is_available ? "bg-emerald-400" : "bg-rose-400"}`} /></div>
                        <div className="mt-2 text-[10px] font-black text-violet-200">{money(day.partner_rate)}</div>
                        <div className="mt-0.5 text-[9px] text-slate-600">Public {money(day.public_rate)}</div>
                        <div className="mt-1 text-[8px] font-black uppercase text-slate-600">{day.is_available ? `Min ${day.minimum_stay} gece` : "DOLU"}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="space-y-4 xl:sticky xl:top-4 xl:h-fit">
              <section className="rounded-xl border border-white/[.07] bg-[#091724] p-4">
                <div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">TEKLİF ÖZETİ</div><div className="mt-1 text-sm font-black">Satış & Marj</div></div><FaChartLine className="text-violet-300" /></div>

                {quote ? (
                  <div className="mt-4 space-y-3">
                    <div className={`rounded-lg border p-3 ${quote.available ? "border-emerald-400/20 bg-emerald-500/[.07]" : "border-red-400/20 bg-red-500/[.07]"}`}>
                      <div className="flex items-center gap-2 text-xs font-black">{quote.available ? <FaCheckCircle className="text-emerald-300" /> : null}{quote.available ? "Tarihler satışa uygun" : quote.conflict ? "Tarihler dolu / blokeli" : `Minimum ${quote.minimum_stay} gece gerekli`}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-white/[.03] p-3"><div className="text-[9px] uppercase text-slate-600">Gece</div><div className="mt-1 text-lg font-black">{quote.nights}</div></div>
                      <div className="rounded-lg bg-white/[.03] p-3"><div className="text-[9px] uppercase text-slate-600">Public</div><div className="mt-1 text-lg font-black">{money(quote.public_total, quote.currency)}</div></div>
                    </div>
                    <div className="rounded-lg border border-violet-400/15 bg-violet-400/[.06] p-3"><div className="text-[9px] font-black uppercase text-violet-300">SİZİN NET MALİYETİNİZ</div><div className="mt-1 text-2xl font-black">{money(quote.partner_total, quote.currency)}</div></div>
                    <label className="block text-[9px] font-black uppercase text-slate-500">Müşteriye satış toplamı<input type="number" min={quote.partner_total} value={customerTotal} onChange={(e) => setCustomerTotal(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-lg font-black text-white outline-none focus:border-violet-400/40" /></label>
                    <div className="rounded-lg bg-emerald-500/[.07] p-3"><div className="flex items-center justify-between"><span className="text-xs text-slate-400">Partner marjınız</span><strong className="text-emerald-300">{money(currentMargin, quote.currency)}</strong></div><div className="mt-1 text-right text-[10px] font-black text-emerald-400">%{marginPercent}</div></div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-white/10 p-6 text-center text-xs leading-5 text-slate-500">Giriş ve çıkış tarihini seçip <strong className="text-slate-300">Fiyatla</strong> butonuna bas.</div>
                )}
              </section>

              <section className="rounded-xl border border-white/[.07] bg-[#091724] p-4">
                <div className="flex items-center gap-2"><FaUsers className="text-violet-300" /><h2 className="text-sm font-black">Hızlı Rezervasyon</h2></div>
                <form onSubmit={createBooking} className="mt-4 space-y-2.5">
                  <input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} placeholder="Misafir adı soyadı" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" />
                  <div className="grid grid-cols-2 gap-2"><input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="Telefon" className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /><input type="number" min="1" value={guest.count} onChange={(e) => setGuest({ ...guest, count: e.target.value })} placeholder="Kişi" className="rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" /></div>
                  <input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} placeholder="E-posta" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" />
                  <input value={guest.reference} onChange={(e) => setGuest({ ...guest, reference: e.target.value })} placeholder="Acenta referansı / dosya no" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm" />
                  <button disabled={busy || !quote?.available || !guest.name || enteredCustomerTotal < Number(quote?.partner_total ?? 0)} className="w-full rounded-lg bg-violet-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{quote?.instant_confirm ? "Rezervasyonu Onayla" : "Rezervasyon Talebi Oluştur"}</button>
                </form>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
