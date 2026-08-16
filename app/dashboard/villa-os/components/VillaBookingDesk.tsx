"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaCircle,
  FaClock,
  FaHotel,
  FaMoneyBillWave,
  FaShieldAlt,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";


type Villa = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  max_guests: number;
  base_nightly_rate: number;
  cleaning_fee: number;
  cleaning_fee_under_nights: number | null;
  security_deposit: number;
  minimum_stay: number;
};

type CalendarDay = {
  calendar_date: string;
  status: string;
  nightly_rate: number;
  minimum_stay: number;
  is_arrival: boolean;
  is_departure: boolean;
  sales_channel: string | null;
};

type Quote = {
  available: boolean;
  nights: number;
  guest_count: number;
  max_guests: number;
  minimum_stay: number;
  nightly_total: number;
  cleaning_fee: number;
  security_deposit: number;
  grand_total: number;
  currency: string;
};

type Props = {
  companyId: string;
  villas: Villa[];
  selectedVillaId: string;
  onVillaChange: (villaId: string) => void;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

const iso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const fromIso = (value: string) => {
  const [year, month, day] =
    value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12
  );
};

const addDays = (
  date: Date,
  amount: number
) => {
  const next = new Date(date);
  next.setDate(
    next.getDate() + amount
  );
  return next;
};

const monthStart = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    12
  );

const monthEnd = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    12
  );

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat(
    "tr-TR",
    {
      month: "long",
      year: "numeric",
    }
  ).format(date);

const shortDate = (value: string) =>
  new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "short",
    }
  ).format(fromIso(value));

const money = (
  value: number,
  currency = "TRY"
) =>
  new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(Number(value || 0));

const channelLabel = (
  value: string | null
) => {
  const labels: Record<string, string> = {
    direct: "Direkt",
    agency: "Acenta",
    b2b: "B2B",
    airbnb: "Airbnb",
    booking: "Booking",
    vrbo: "Vrbo",
    external: "Harici",
    turobus_marketplace: "Turobus",
  };

  return value
    ? labels[value] ?? value
    : "";
};

function makeMonthDays(
  month: Date
) {
  const first =
    monthStart(month);

  const firstWeekday =
    (first.getDay() + 6) % 7;

  const gridStart =
    addDays(
      first,
      -firstWeekday
    );

  return Array.from(
    { length: 42 },
    (_, index) =>
      addDays(
        gridStart,
        index
      )
  );
}


export default function VillaBookingDesk({
  companyId,
  villas,
  selectedVillaId,
  onVillaChange,
  onClose,
  onCreated,
}: Props) {

  const [
    viewMonth,
    setViewMonth,
  ] =
    useState(
      monthStart(
        new Date()
      )
    );

  const [
    days,
    setDays,
  ] =
    useState<CalendarDay[]>(
      []
    );

  const [
    checkIn,
    setCheckIn,
  ] =
    useState("");

  const [
    checkOut,
    setCheckOut,
  ] =
    useState("");

  const [
    quote,
    setQuote,
  ] =
    useState<Quote | null>(
      null
    );

  const [
    loadingCalendar,
    setLoadingCalendar,
  ] =
    useState(false);

  const [
    quoting,
    setQuoting,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState({
      guestName: "",
      phone: "",
      email: "",
      guestCount: "2",
      channel: "direct",
    });


  const selectedVilla =
    useMemo(
      () =>
        villas.find(
          (villa) =>
            villa.id ===
            selectedVillaId
        ) ?? null,
      [
        villas,
        selectedVillaId,
      ]
    );


  const secondMonth =
    useMemo(
      () =>
        new Date(
          viewMonth.getFullYear(),
          viewMonth.getMonth() + 1,
          1,
          12
        ),
      [
        viewMonth,
      ]
    );


  const dayMap =
    useMemo(
      () =>
        new Map(
          days.map(
            (day) => [
              day.calendar_date,
              day,
            ]
          )
        ),
      [
        days,
      ]
    );


  const loadCalendar =
    useCallback(
      async () => {

        if (
          !companyId ||
          !selectedVillaId
        ) {
          setDays([]);
          return;
        }

        setLoadingCalendar(true);
        setError("");

        const start =
          monthStart(
            viewMonth
          );

        const end =
          monthEnd(
            secondMonth
          );

        const {
          data,
          error: rpcError,
        } =
          await supabase.rpc(
            "get_villa_booking_calendar",
            {
              p_company_id:
                companyId,
              p_villa_id:
                selectedVillaId,
              p_start:
                iso(start),
              p_end:
                iso(end),
            }
          );

        if (rpcError) {

          setError(
            rpcError.message
          );

        } else {

          setDays(
            (data ??
              []) as CalendarDay[]
          );

        }

        setLoadingCalendar(
          false
        );

      },
      [
        companyId,
        selectedVillaId,
        viewMonth,
        secondMonth,
      ]
    );


  useEffect(
    () => {
      void loadCalendar();
    },
    [
      loadCalendar,
    ]
  );


  useEffect(
    () => {
      setCheckIn("");
      setCheckOut("");
      setQuote(null);
      setError("");
    },
    [
      selectedVillaId,
    ]
  );


  async function requestQuote(
    start: string,
    end: string
  ) {

    if (
      !selectedVillaId ||
      !start ||
      !end
    ) {
      return;
    }

    setQuoting(true);
    setError("");
    setQuote(null);

    const {
      data,
      error: rpcError,
    } =
      await supabase.rpc(
        "quote_villa_booking",
        {
          p_company_id:
            companyId,
          p_villa_id:
            selectedVillaId,
          p_guest_count:
            Number(
              form.guestCount ||
                1
            ),
          p_check_in:
            start,
          p_check_out:
            end,
          p_sales_channel:
            form.channel,
        }
      );

    if (rpcError) {

      setError(
        rpcError.message
      );

      setCheckOut("");

    } else {

      setQuote(
        data as Quote
      );

    }

    setQuoting(false);

  }


  function selectDay(
    dateString: string
  ) {

    const day =
      dayMap.get(
        dateString
      );

    const status =
      day?.status ??
      "available";

    if (
      status !== "available"
    ) {
      return;
    }

    setError("");

    if (
      !checkIn ||
      checkOut ||
      dateString <= checkIn
    ) {

      setCheckIn(
        dateString
      );

      setCheckOut("");
      setQuote(null);

      return;
    }

    const start =
      fromIso(checkIn);

    const end =
      fromIso(dateString);

    let cursor =
      new Date(start);

    while (
      cursor < end
    ) {

      const key =
        iso(cursor);

      const item =
        dayMap.get(key);

      if (
        item &&
        item.status !==
          "available"
      ) {

        setError(
          `${shortDate(
            key
          )} müsait değil. Tarih aralığı seçilemez.`
        );

        return;
      }

      cursor =
        addDays(
          cursor,
          1
        );
    }

    setCheckOut(
      dateString
    );

    void requestQuote(
      checkIn,
      dateString
    );

  }


  useEffect(
    () => {

      if (
        checkIn &&
        checkOut
      ) {
        void requestQuote(
          checkIn,
          checkOut
        );
      }

      // guest/channel değişince fiyatı yeniden doğrula
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      form.guestCount,
      form.channel,
    ]
  );


  function isRangeDay(
    dateString: string
  ) {

    if (
      !checkIn
    ) {
      return false;
    }

    if (
      !checkOut
    ) {
      return (
        dateString ===
        checkIn
      );
    }

    return (
      dateString >=
        checkIn &&
      dateString <=
        checkOut
    );

  }


  async function saveBooking() {

    if (
      !selectedVillaId
    ) {
      setError(
        "Önce villa seç."
      );
      return;
    }

    if (
      !form.guestName.trim()
    ) {
      setError(
        "Misafir adı zorunludur."
      );
      return;
    }

    if (
      !checkIn ||
      !checkOut ||
      !quote
    ) {
      setError(
        "Müsait giriş ve çıkış tarihlerini takvimden seç."
      );
      return;
    }

    setSaving(true);
    setError("");

    const {
      data,
      error: rpcError,
    } =
      await supabase.rpc(
        "create_villa_reservation_pro",
        {
          p_company_id:
            companyId,
          p_villa_id:
            selectedVillaId,
          p_guest_name:
            form.guestName.trim(),
          p_guest_phone:
            form.phone ||
            null,
          p_guest_email:
            form.email ||
            null,
          p_guest_count:
            Number(
              form.guestCount ||
                1
            ),
          p_check_in:
            checkIn,
          p_check_out:
            checkOut,
          p_sales_channel:
            form.channel,
        }
      );

    if (rpcError) {

      setError(
        rpcError.message
      );

      await loadCalendar();

    } else {

      const result =
        data as {
          reservation_code?: string;
        };

      await onCreated();

      alert(
        `Rezervasyon oluşturuldu: ${
          result.reservation_code ??
          ""
        }`
      );

      onClose();

    }

    setSaving(false);

  }


  function renderMonth(
    month: Date
  ) {

    const monthDays =
      makeMonthDays(
        month
      );

    return (
      <div className="rounded-[24px] border border-white/10 bg-[#07111f] p-4">

        <div className="mb-4 text-center text-sm font-black capitalize text-white">
          {monthLabel(month)}
        </div>

        <div className="grid grid-cols-7 gap-1">

          {[
            "Pzt",
            "Sal",
            "Çar",
            "Per",
            "Cum",
            "Cmt",
            "Paz",
          ].map(
            (label) => (
              <div
                key={label}
                className="py-1 text-center text-[9px] font-black uppercase text-slate-600"
              >
                {label}
              </div>
            )
          )}

          {monthDays.map(
            (date) => {

              const key =
                iso(date);

              const row =
                dayMap.get(key);

              const inMonth =
                date.getMonth() ===
                month.getMonth();

              const status =
                row?.status ??
                "available";

              const disabled =
                !inMonth ||
                status !==
                  "available" ||
                key <
                  iso(
                    new Date()
                  );

              const selected =
                isRangeDay(
                  key
                );

              const arrival =
                Boolean(
                  row?.is_arrival
                );

              const departure =
                Boolean(
                  row?.is_departure
                );

              const background =
                selected
                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                  : status ===
                      "reserved"
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : status ===
                        "blocked" ||
                      status ===
                        "maintenance" ||
                      status ===
                        "owner_use"
                      ? "border-slate-700 bg-slate-800/70 text-slate-600"
                      : "border-white/[.06] bg-white/[.025] text-slate-300 hover:border-emerald-400/30 hover:bg-emerald-500/[.06]";

              return (
                <button
                  key={key}
                  type="button"
                  disabled={
                    disabled
                  }
                  onClick={() =>
                    selectDay(
                      key
                    )
                  }
                  className={`relative min-h-[64px] rounded-xl border p-1.5 text-left transition ${background} ${
                    !inMonth
                      ? "opacity-20"
                      : ""
                  } disabled:cursor-not-allowed`}
                  title={
                    status ===
                    "available"
                      ? `${money(
                          Number(
                            row?.nightly_rate ??
                              selectedVilla?.base_nightly_rate ??
                              0
                          )
                        )} · Müsait`
                      : `${
                          status ===
                          "reserved"
                            ? "Dolu"
                            : "Kapalı"
                        } ${
                          row?.sales_channel
                            ? `· ${channelLabel(
                                row.sales_channel
                              )}`
                            : ""
                        }`
                  }
                >

                  <div className="text-xs font-black">
                    {date.getDate()}
                  </div>

                  {inMonth && (
                    <>
                      <div className="mt-1 truncate text-[8px] font-bold opacity-70">
                        {status ===
                        "available"
                          ? money(
                              Number(
                                row?.nightly_rate ??
                                  selectedVilla?.base_nightly_rate ??
                                  0
                              )
                            )
                          : status ===
                              "reserved"
                            ? "DOLU"
                            : "KAPALI"}
                      </div>

                      {(arrival ||
                        departure) && (
                        <div className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                      )}
                    </>
                  )}

                </button>
              );
            }
          )}

        </div>

      </div>
    );

  }


  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 p-3 backdrop-blur-md lg:p-6">

      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[30px] border border-white/10 bg-[#09131f] shadow-2xl">

        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-5 lg:px-7">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-300">
              TUROBUS VILLA OS · BOOKING DESK
            </div>

            <h2 className="mt-1 text-2xl font-black lg:text-3xl">
              Canlı Rezervasyon Masası
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Gerçek müsaitlik, canlı fiyat ve merkezi stok kontrolü.
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[.05] hover:text-white"
          >
            <FaTimes />
          </button>

        </header>


        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300 lg:mx-7">
            {error}
          </div>
        )}


        <div className="grid xl:grid-cols-[1fr_380px]">

          <div className="min-w-0 p-5 lg:p-7">

            <section className="rounded-[24px] border border-white/10 bg-white/[.025] p-4">

              <label className="block">

                <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Rezervasyon Yapılacak Villa
                </span>

                <select
                  value={selectedVillaId}
                  onChange={(event) =>
                    onVillaChange(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 font-black text-white outline-none focus:border-cyan-400/50"
                >

                  <option value="">
                    Villa seçin
                  </option>

                  {villas.map(
                    (villa) => (
                      <option
                        key={villa.id}
                        value={villa.id}
                      >
                        {villa.name}
                        {villa.city
                          ? ` · ${villa.city}`
                          : ""}
                        {villa.district
                          ? ` / ${villa.district}`
                          : ""}
                      </option>
                    )
                  )}

                </select>

              </label>

              {selectedVilla && (
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black">

                  <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-slate-400">
                    Maks. {selectedVilla.max_guests} kişi
                  </span>

                  <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-slate-400">
                    Min. {selectedVilla.minimum_stay} gece
                  </span>

                  <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-slate-400">
                    Başlangıç {money(selectedVilla.base_nightly_rate)}
                  </span>

                </div>
              )}

            </section>


            <section className="mt-4">

              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

                <div>
                  <div className="text-sm font-black">
                    Müsaitlik Takvimi
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Önce giriş gününü, sonra çıkış gününü seç.
                  </div>
                </div>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth(
                        new Date(
                          viewMonth.getFullYear(),
                          viewMonth.getMonth() - 1,
                          1,
                          12
                        )
                      )
                    }
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400 hover:text-white"
                  >
                    <FaArrowLeft />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth(
                        new Date(
                          viewMonth.getFullYear(),
                          viewMonth.getMonth() + 1,
                          1,
                          12
                        )
                      )
                    }
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400 hover:text-white"
                  >
                    <FaArrowRight />
                  </button>

                </div>

              </div>


              <div className="mb-3 flex flex-wrap gap-4 text-[10px] font-black uppercase">

                <span className="flex items-center gap-1.5 text-emerald-300">
                  <FaCircle className="text-[7px]" />
                  Müsait
                </span>

                <span className="flex items-center gap-1.5 text-red-300">
                  <FaCircle className="text-[7px]" />
                  Dolu
                </span>

                <span className="flex items-center gap-1.5 text-slate-500">
                  <FaCircle className="text-[7px]" />
                  Kapalı
                </span>

                <span className="flex items-center gap-1.5 text-amber-300">
                  <FaCircle className="text-[7px]" />
                  Giriş / Çıkış
                </span>

              </div>


              {loadingCalendar ? (
                <div className="flex min-h-[430px] items-center justify-center rounded-[24px] border border-white/10 bg-[#07111f] text-sm text-slate-500">
                  Müsaitlik kontrol ediliyor…
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {renderMonth(viewMonth)}
                  {renderMonth(secondMonth)}
                </div>
              )}

            </section>


            <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[.025] p-5">

              <div className="flex items-center gap-2">
                <FaUsers className="text-cyan-300" />
                <h3 className="font-black">
                  Misafir Bilgileri
                </h3>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">

                <label className="md:col-span-2 block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">
                    Ad Soyad
                  </span>
                  <input
                    value={form.guestName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        guestName:
                          event.target.value,
                      })
                    }
                    placeholder="Örn. Ali Doğan"
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 font-bold outline-none focus:border-cyan-400/50"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">
                    Telefon
                  </span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone:
                          event.target.value,
                      })
                    }
                    placeholder="0532 000 00 00"
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none focus:border-cyan-400/50"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">
                    E-posta
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        email:
                          event.target.value,
                      })
                    }
                    placeholder="misafir@email.com"
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none focus:border-cyan-400/50"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">
                    Misafir Sayısı
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={
                      selectedVilla?.max_guests ??
                      99
                    }
                    value={form.guestCount}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        guestCount:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none focus:border-cyan-400/50"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">
                    Satış Kanalı
                  </span>
                  <select
                    value={form.channel}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        channel:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none focus:border-cyan-400/50"
                  >
                    <option value="direct">Direkt</option>
                    <option value="agency">Acenta</option>
                    <option value="b2b">B2B</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="booking">Booking</option>
                    <option value="vrbo">Vrbo</option>
                    <option value="external">Harici</option>
                    <option value="turobus_marketplace">Turobus Marketplace</option>
                  </select>
                </label>

              </div>

            </section>

          </div>


          <aside className="border-t border-white/10 bg-[#07111f] p-5 xl:border-l xl:border-t-0 lg:p-6">

            <div className="xl:sticky xl:top-5">

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">
                Rezervasyon Özeti
              </div>

              <h3 className="mt-2 text-xl font-black">
                {selectedVilla?.name ??
                  "Villa seçilmedi"}
              </h3>


              <div className="mt-5 grid grid-cols-2 gap-2">

                <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                  <FaCalendarAlt className="text-cyan-300" />
                  <div className="mt-2 text-[9px] uppercase text-slate-600">
                    Giriş
                  </div>
                  <div className="mt-1 text-sm font-black">
                    {checkIn
                      ? shortDate(checkIn)
                      : "Seçilmedi"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                  <FaCalendarAlt className="text-violet-300" />
                  <div className="mt-2 text-[9px] uppercase text-slate-600">
                    Çıkış
                  </div>
                  <div className="mt-1 text-sm font-black">
                    {checkOut
                      ? shortDate(checkOut)
                      : "Seçilmedi"}
                  </div>
                </div>

              </div>


              {quoting && (
                <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-500/[.04] p-4 text-xs text-cyan-300">
                  Fiyat ve müsaitlik doğrulanıyor…
                </div>
              )}


              {quote && (
                <div className="mt-4 space-y-3 rounded-[22px] border border-white/10 bg-white/[.025] p-4">

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-500">
                      {quote.nights} gece
                    </span>
                    <strong>
                      {money(
                        quote.nightly_total,
                        quote.currency
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-500">
                      Temizlik
                    </span>
                    <strong>
                      {money(
                        quote.cleaning_fee,
                        quote.currency
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-500">
                      Hasar Depozitosu
                    </span>
                    <strong>
                      {money(
                        quote.security_deposit,
                        quote.currency
                      )}
                    </strong>
                  </div>

                  <div className="border-t border-white/10 pt-3">

                    <div className="text-[9px] font-black uppercase text-slate-600">
                      Konaklama Toplamı
                    </div>

                    <div className="mt-1 text-3xl font-black text-emerald-300">
                      {money(
                        quote.grand_total,
                        quote.currency
                      )}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-600">
                      Depozito ayrı takip edilir.
                    </div>

                  </div>

                </div>
              )}


              <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/[.04] p-4">

                <div className="flex items-start gap-3">

                  <FaShieldAlt className="mt-0.5 text-emerald-300" />

                  <div>
                    <div className="text-xs font-black text-emerald-300">
                      Merkezi stok koruması
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      Kaydetme anında müsaitlik tekrar kontrol edilir. Airbnb, B2B, direkt ve Turobus satışlarının çakışması engellenir.
                    </p>
                  </div>

                </div>

              </div>


              <div className="mt-4 rounded-xl border border-white/10 p-4">

                <div className="flex items-center gap-2 text-xs font-black">
                  <FaClock className="text-amber-300" />
                  Rezervasyon Kuralları
                </div>

                <div className="mt-3 space-y-2 text-[10px] text-slate-500">
                  <div>
                    ✓ Dolu tarihe satış yapılamaz
                  </div>
                  <div>
                    ✓ Bakım / owner use günleri kapalıdır
                  </div>
                  <div>
                    ✓ Minimum gece otomatik kontrol edilir
                  </div>
                  <div>
                    ✓ Maksimum misafir kapasitesi kontrol edilir
                  </div>
                  <div>
                    ✓ Fiyatlar günlük takvimden hesaplanır
                  </div>
                </div>

              </div>


              <button
                type="button"
                disabled={
                  saving ||
                  quoting ||
                  !quote ||
                  !form.guestName.trim()
                }
                onClick={() =>
                  void saveBooking()
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-5 py-4 font-black text-slate-950 shadow-lg shadow-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaCheckCircle />
                {saving
                  ? "Rezervasyon Kaydediliyor..."
                  : "Rezervasyonu Kesinleştir"}
              </button>


              <button
                type="button"
                onClick={() => {
                  setCheckIn("");
                  setCheckOut("");
                  setQuote(null);
                  setError("");
                }}
                className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-slate-500 transition hover:bg-white/[.04] hover:text-white"
              >
                Tarih Seçimini Temizle
              </button>

            </div>

          </aside>

        </div>

      </div>

    </div>
  );
}
