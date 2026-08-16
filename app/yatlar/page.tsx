"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  FaAnchor,
  FaArrowRight,
  FaBed,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShip,
  FaShieldAlt,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { supabase } from "@/lib/supabase";


type Yacht = {
  id: string;
  slug: string;
  name: string;
  yacht_type: string;
  city: string;
  marina: string | null;
  departure_point: string | null;
  length_m: number | null;
  cabins: number;
  bathrooms: number;
  max_guests: number;
  crew_count: number;
  captain_included: boolean;
  fuel_included: boolean;
  meals_included: boolean;
  base_daily_price: number;
  currency: string;
  minimum_days: number;
  cover_url: string | null;
  verified: boolean;
  featured: boolean;
};


type OpenPanel =
  | "location"
  | "checkIn"
  | "checkOut"
  | "guests"
  | null;


type SortMode =
  | "recommended"
  | "priceAsc"
  | "priceDesc"
  | "capacity";


const locations = [
  {
    city: "Fethiye",
    detail: "Ece Saray · Karagözler",
  },
  {
    city: "Göcek",
    detail: "D-Marin · Belediye Marina",
  },
  {
    city: "Bodrum",
    detail: "Milta · Yalıkavak",
  },
  {
    city: "Marmaris",
    detail: "Netsel · Adaköy",
  },
  {
    city: "Kaş",
    detail: "Kaş Marina",
  },
  {
    city: "Çeşme",
    detail: "Alaçatı · Çeşme Marina",
  },
];


const types = [
  {
    value: "",
    label: "Tüm Tekne Tipleri",
  },
  {
    value: "motor_yacht",
    label: "Motor Yat",
  },
  {
    value: "gulet",
    label: "Gulet",
  },
  {
    value: "catamaran",
    label: "Katamaran",
  },
  {
    value: "sailing",
    label: "Yelkenli",
  },
  {
    value: "daily_boat",
    label: "Günlük Özel Tekne",
  },
];


const preview = [
  {
    name: "Azure 52",
    type: "Motor Yat",
    city: "Göcek",
    marina: "D-Marin",
    guests: 10,
    cabins: 3,
    length: 16,
    price: 42000,
    image:
      "https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&w=1400&q=90",
  },
  {
    name: "Aegean Dream",
    type: "Gulet",
    city: "Fethiye",
    marina: "Karagözler",
    guests: 12,
    cabins: 6,
    length: 24,
    price: 68000,
    image:
      "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1400&q=90",
  },
  {
    name: "Blue Horizon",
    type: "Katamaran",
    city: "Bodrum",
    marina: "Yalıkavak",
    guests: 8,
    cabins: 4,
    length: 14,
    price: 51000,
    image:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1400&q=90",
  },
];


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


function iso(date: Date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function parseIso(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12
  );
}


function formatDate(
  value: string
) {
  if (!value) {
    return "Tarih seç";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    parseIso(value)
  );
}


function addMonths(
  date: Date,
  amount: number
) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1,
    12
  );
}


function monthDays(
  month: Date
) {
  const first =
    new Date(
      month.getFullYear(),
      month.getMonth(),
      1,
      12
    );

  const offset =
    (first.getDay() + 6) %
    7;

  const start =
    new Date(first);

  start.setDate(
    first.getDate() -
      offset
  );

  return Array.from(
    {
      length: 42,
    },
    (_, index) => {
      const date =
        new Date(start);

      date.setDate(
        start.getDate() +
          index
      );

      return date;
    }
  );
}


function CalendarPicker({
  month,
  selected,
  minimum,
  onMonth,
  onSelect,
}: {
  month: Date;
  selected: string;
  minimum: string;
  onMonth: (
    value: Date
  ) => void;
  onSelect: (
    value: string
  ) => void;
}) {

  const title =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        month: "long",
        year: "numeric",
      }
    ).format(month);


  return (
    <div className="w-[350px] max-w-[calc(100vw-32px)] rounded-[24px] border border-white/10 bg-[#0c1825] p-4 shadow-2xl shadow-black/70">

      <div className="flex items-center justify-between">

        <button
          type="button"
          onClick={() =>
            onMonth(
              addMonths(
                month,
                -1
              )
            )
          }
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
        >
          <FaChevronLeft />
        </button>

        <strong className="capitalize">
          {title}
        </strong>

        <button
          type="button"
          onClick={() =>
            onMonth(
              addMonths(
                month,
                1
              )
            )
          }
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
        >
          <FaChevronRight />
        </button>

      </div>


      <div className="mt-4 grid grid-cols-7 gap-1">

        {[
          "Pzt",
          "Sal",
          "Çar",
          "Per",
          "Cum",
          "Cmt",
          "Paz",
        ].map(
          (day) => (
            <div
              key={day}
              className="py-1 text-center text-[9px] font-black text-slate-600"
            >
              {day}
            </div>
          )
        )}


        {monthDays(
          month
        ).map(
          (date) => {

            const value =
              iso(date);

            const disabled =
              value < minimum;

            const active =
              selected === value;

            const sameMonth =
              date.getMonth() ===
              month.getMonth();


            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onSelect(value)
                }
                className={`aspect-square rounded-xl text-xs font-black transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : disabled
                      ? "cursor-not-allowed text-slate-800"
                      : sameMonth
                        ? "text-slate-300 hover:bg-orange-500/15 hover:text-orange-300"
                        : "text-slate-700"
                }`}
              >
                {date.getDate()}
              </button>
            );

          }
        )}

      </div>

    </div>
  );
}


function yachtTypeLabel(
  type: string
) {
  return (
    types.find(
      (item) =>
        item.value === type
    )?.label ?? type
  );
}


export default function YachtsPage() {

  const resultsRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const [
    yachts,
    setYachts,
  ] =
    useState<Yacht[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    openPanel,
    setOpenPanel,
  ] =
    useState<OpenPanel>(
      null
    );


  const [
    calendarMonth,
    setCalendarMonth,
  ] =
    useState(
      new Date()
    );


  const [
    sort,
    setSort,
  ] =
    useState<SortMode>(
      "recommended"
    );


  const [
    mobileFilters,
    setMobileFilters,
  ] =
    useState(false);


  const [
    filters,
    setFilters,
  ] =
    useState({
      location: "",
      type: "",
      checkIn: "",
      checkOut: "",
      guests: 2,
      minCabins: 0,
      maxPrice: "",
    });


  const load =
    useCallback(
      async (
        next = filters
      ) => {

        setLoading(true);
        setError("");


        const {
          data,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "get_public_yacht_marketplace",
            {
              p_location:
                next.location ||
                null,

              p_yacht_type:
                next.type ||
                null,

              p_guests:
                next.guests ||
                null,

              p_check_in:
                next.checkIn ||
                null,

              p_check_out:
                next.checkOut ||
                null,
            }
          );


        if (rpcError) {

          setError(
            rpcError.message
          );

          setYachts([]);

        } else {

          setYachts(
            (data ??
              []) as Yacht[]
          );

        }


        setLoading(false);

      },
      [
        filters,
      ]
    );


  useEffect(
    () => {

      void load();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );


  useEffect(
    () => {

      function close(
        event:
          MouseEvent
      ) {

        const target =
          event.target as HTMLElement;


        if (
          !target.closest(
            "[data-yacht-search]"
          )
        ) {

          setOpenPanel(null);

        }

      }


      document.addEventListener(
        "mousedown",
        close
      );


      return () =>
        document.removeEventListener(
          "mousedown",
          close
        );

    },
    []
  );


  const results =
    useMemo(
      () => {

        let rows =
          yachts.filter(
            (yacht) => {

              const cabins =
                filters.minCabins <=
                  0 ||
                yacht.cabins >=
                  filters.minCabins;


              const price =
                !filters.maxPrice ||
                yacht.base_daily_price <=
                  Number(
                    filters.maxPrice
                  );


              return (
                cabins &&
                price
              );

            }
          );


        if (
          sort ===
          "priceAsc"
        ) {

          rows =
            [...rows].sort(
              (
                first,
                second
              ) =>
                first.base_daily_price -
                second.base_daily_price
            );

        }


        if (
          sort ===
          "priceDesc"
        ) {

          rows =
            [...rows].sort(
              (
                first,
                second
              ) =>
                second.base_daily_price -
                first.base_daily_price
            );

        }


        if (
          sort ===
          "capacity"
        ) {

          rows =
            [...rows].sort(
              (
                first,
                second
              ) =>
                second.max_guests -
                first.max_guests
            );

        }


        if (
          sort ===
          "recommended"
        ) {

          rows =
            [...rows].sort(
              (
                first,
                second
              ) =>
                Number(
                  second.featured
                ) *
                  10 +
                Number(
                  second.verified
                ) *
                  5 -
                (
                  Number(
                    first.featured
                  ) *
                    10 +
                  Number(
                    first.verified
                  ) *
                    5
                )
            );

        }


        return rows;

      },
      [
        yachts,
        filters.minCabins,
        filters.maxPrice,
        sort,
      ]
    );


  async function search() {

    if (
      filters.checkIn &&
      filters.checkOut &&
      filters.checkOut <=
        filters.checkIn
    ) {

      setError(
        "Dönüş tarihi başlangıç tarihinden sonra olmalıdır."
      );

      return;

    }


    setOpenPanel(null);

    await load();


    window.setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior:
            "smooth",
          block:
            "start",
        }),
      100
    );

  }


  function checkIn(
    value: string
  ) {

    setFilters(
      (
        current
      ) => ({
        ...current,
        checkIn:
          value,
        checkOut:
          current.checkOut >
          value
            ? current.checkOut
            : "",
      })
    );


    setCalendarMonth(
      parseIso(value)
    );

    setOpenPanel(
      "checkOut"
    );

  }


  function checkOut(
    value: string
  ) {

    setFilters(
      (
        current
      ) => ({
        ...current,
        checkOut:
          value,
      })
    );

    setOpenPanel(null);

  }


  function clear() {

    const next = {
      location: "",
      type: "",
      checkIn: "",
      checkOut: "",
      guests: 2,
      minCabins: 0,
      maxPrice: "",
    };


    setFilters(next);
    setSort("recommended");

    void load(next);

  }


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* HERO */}

      <section className="relative overflow-visible border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=2200&q=92")',
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/84 to-[#06101b]/25" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/25" />


        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">

          <div className="grid items-end gap-10 lg:grid-cols-[1fr_.72fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200 backdrop-blur-xl">

                <FaAnchor />

                Turobus Yacht Marketplace

              </div>


              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.93] tracking-tight md:text-7xl">

                Denizi Seç.

                <span className="mt-3 block text-orange-500">
                  Rotanı Kendin Belirle.
                </span>

              </h1>


              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Motor yat, gulet,
                katamaran ve özel
                tekneleri gerçek tarih
                müsaitliğiyle keşfet.

              </p>

            </div>


            <div className="hidden lg:block">

              <div className="ml-auto max-w-[420px] rounded-[30px] border border-white/15 bg-black/30 p-6 backdrop-blur-2xl">

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
                  Turobus Yacht
                </div>

                <div className="mt-4 text-3xl font-black">
                  Tekne ilanı değil. Kiralama operasyonu.
                </div>


                <div className="mt-6 space-y-3">

                  {[
                    "Gerçek tarih müsaitliği",
                    "Sezonluk fiyat sistemi",
                    "Çakışan rezervasyon koruması",
                    "Marketplace rezervasyon kaydı",
                  ].map(
                    (item) => (

                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-bold"
                      >
                        <FaCheck className="text-emerald-400" />
                        {item}
                      </div>

                    )
                  )}

                </div>

              </div>

            </div>

          </div>


          {/* SEARCH */}

          <div
            data-yacht-search
            className="relative z-40 mt-10 grid rounded-[24px] border border-white/15 bg-[#081522]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid-cols-[1.2fr_1fr_1fr_.85fr_auto]"
          >

            {/* LOCATION */}

            <div className="relative border-b border-white/10 lg:border-b-0 lg:border-r">

              <button
                type="button"
                onClick={() =>
                  setOpenPanel(
                    openPanel ===
                      "location"
                      ? null
                      : "location"
                  )
                }
                className="flex min-h-[86px] w-full items-center justify-between px-5 text-left"
              >

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                    <FaMapMarkerAlt />
                    Kalkış Bölgesi
                  </div>

                  <div className={`mt-2 text-sm font-black ${
                    filters.location
                      ? "text-white"
                      : "text-slate-500"
                  }`}>
                    {filters.location ||
                      "Marina veya bölge seç"}
                  </div>

                </div>

                <FaChevronDown className="text-xs text-slate-600" />

              </button>


              {openPanel ===
                "location" && (

                <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[370px] max-w-[calc(100vw-32px)] rounded-[24px] border border-white/10 bg-[#0c1825] p-2 shadow-2xl">

                  {locations.map(
                    (item) => (

                      <button
                        key={item.city}
                        type="button"
                        onClick={() => {

                          setFilters({
                            ...filters,
                            location:
                              item.city,
                          });

                          setOpenPanel(null);

                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-white/[.05]"
                      >

                        <div>

                          <div className="text-sm font-black">
                            {item.city}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-500">
                            {item.detail}
                          </div>

                        </div>

                        {filters.location ===
                          item.city && (
                          <FaCheck className="text-emerald-400" />
                        )}

                      </button>

                    )
                  )}

                </div>

              )}

            </div>


            {/* CHECK IN */}

            <div className="relative border-b border-white/10 lg:border-b-0 lg:border-r">

              <button
                type="button"
                onClick={() => {

                  setCalendarMonth(
                    filters.checkIn
                      ? parseIso(
                          filters.checkIn
                        )
                      : new Date()
                  );

                  setOpenPanel(
                    "checkIn"
                  );

                }}
                className="min-h-[86px] w-full px-5 text-left"
              >

                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                  <FaCalendarAlt />
                  Başlangıç
                </div>

                <div className={`mt-2 text-sm font-black ${
                  filters.checkIn
                    ? "text-white"
                    : "text-slate-500"
                }`}>
                  {formatDate(
                    filters.checkIn
                  )}
                </div>

              </button>


              {openPanel ===
                "checkIn" && (

                <div className="absolute left-0 top-[calc(100%+10px)] z-50">

                  <CalendarPicker
                    month={
                      calendarMonth
                    }
                    selected={
                      filters.checkIn
                    }
                    minimum={
                      iso(
                        new Date()
                      )
                    }
                    onMonth={
                      setCalendarMonth
                    }
                    onSelect={
                      checkIn
                    }
                  />

                </div>

              )}

            </div>


            {/* CHECK OUT */}

            <div className="relative border-b border-white/10 lg:border-b-0 lg:border-r">

              <button
                type="button"
                onClick={() => {

                  setCalendarMonth(
                    filters.checkOut
                      ? parseIso(
                          filters.checkOut
                        )
                      : filters.checkIn
                        ? parseIso(
                            filters.checkIn
                          )
                        : new Date()
                  );

                  setOpenPanel(
                    "checkOut"
                  );

                }}
                className="min-h-[86px] w-full px-5 text-left"
              >

                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                  <FaCalendarAlt />
                  Dönüş
                </div>

                <div className={`mt-2 text-sm font-black ${
                  filters.checkOut
                    ? "text-white"
                    : "text-slate-500"
                }`}>
                  {formatDate(
                    filters.checkOut
                  )}
                </div>

              </button>


              {openPanel ===
                "checkOut" && (

                <div className="absolute right-0 top-[calc(100%+10px)] z-50">

                  <CalendarPicker
                    month={
                      calendarMonth
                    }
                    selected={
                      filters.checkOut
                    }
                    minimum={
                      filters.checkIn
                        ? iso(
                            new Date(
                              parseIso(
                                filters.checkIn
                              ).getTime() +
                                86400000
                            )
                          )
                        : iso(
                            new Date()
                          )
                    }
                    onMonth={
                      setCalendarMonth
                    }
                    onSelect={
                      checkOut
                    }
                  />

                </div>

              )}

            </div>


            {/* GUESTS */}

            <div className="relative border-b border-white/10 lg:border-b-0 lg:border-r">

              <button
                type="button"
                onClick={() =>
                  setOpenPanel(
                    openPanel ===
                      "guests"
                      ? null
                      : "guests"
                  )
                }
                className="min-h-[86px] w-full px-5 text-left"
              >

                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                  <FaUsers />
                  Misafir
                </div>

                <div className="mt-2 text-sm font-black">
                  {filters.guests} Misafir
                </div>

              </button>


              {openPanel ===
                "guests" && (

                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] rounded-[24px] border border-white/10 bg-[#0c1825] p-4 shadow-2xl">

                  <div className="text-sm font-black">
                    Misafir Sayısı
                  </div>


                  <div className="mt-5 flex items-center justify-between">

                    <button
                      type="button"
                      disabled={
                        filters.guests <=
                        1
                      }
                      onClick={() =>
                        setFilters({
                          ...filters,
                          guests:
                            Math.max(
                              1,
                              filters.guests -
                                1
                            ),
                        })
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 disabled:opacity-30"
                    >
                      <FaMinus />
                    </button>


                    <div className="text-center">

                      <div className="text-3xl font-black">
                        {filters.guests}
                      </div>

                      <div className="text-[9px] text-slate-600">
                        Misafir
                      </div>

                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        setFilters({
                          ...filters,
                          guests:
                            Math.min(
                              30,
                              filters.guests +
                                1
                            ),
                        })
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500"
                    >
                      <FaPlus />
                    </button>

                  </div>

                </div>

              )}

            </div>


            <div className="flex items-center p-3">

              <button
                type="button"
                onClick={() =>
                  void search()
                }
                className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black hover:bg-orange-600"
              >
                <FaSearch />
                Yat Ara
              </button>

            </div>

          </div>


          {/* TYPE */}

          <div className="mt-4 flex flex-wrap gap-2">

            {types.map(
              (item) => (

                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() => {

                    setFilters({
                      ...filters,
                      type:
                        item.value,
                    });

                  }}
                  className={`rounded-xl border px-4 py-2.5 text-xs font-black transition ${
                    filters.type ===
                    item.value
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-white/10 bg-black/30 text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>

              )
            )}

          </div>


          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              "Gerçek Tarih Müsaitliği",
              "Çakışma Koruması",
              "Sezonluk Fiyat",
              "Güvenli Rezervasyon",
            ].map(
              (text) => (

                <div
                  key={text}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <FaShieldAlt className="text-emerald-400" />
                  <div className="text-xs font-black">
                    {text}
                  </div>
                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* DISCOVERY */}

      <section className="px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
            Deniz Deneyimini Seç
          </div>

          <h2 className="mt-2 text-3xl font-black">
            Nasıl Bir Tekne Arıyorsun?
          </h2>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              [
                "motor_yacht",
                "Motor Yat",
                "Konfor ve performans",
              ],
              [
                "gulet",
                "Gulet",
                "Mavi yolculuk deneyimi",
              ],
              [
                "catamaran",
                "Katamaran",
                "Geniş yaşam alanı",
              ],
              [
                "daily_boat",
                "Günlük Tekne",
                "Özel gün ve koy turu",
              ],
            ].map(
              ([
                value,
                title,
                description,
              ]) => (

                <button
                  key={value}
                  type="button"
                  onClick={() => {

                    setFilters({
                      ...filters,
                      type:
                        value,
                    });

                    resultsRef.current?.scrollIntoView({
                      behavior:
                        "smooth",
                    });

                  }}
                  className="group rounded-[24px] border border-white/10 bg-[#0b1825] p-5 text-left transition hover:-translate-y-1 hover:border-orange-500/30"
                >

                  <div className="flex items-center justify-between">

                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                      <FaShip />
                    </div>

                    <FaArrowRight className="text-slate-700 group-hover:text-orange-400" />

                  </div>

                  <div className="mt-4 font-black">
                    {title}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {description}
                  </div>

                </button>

              )
            )}

          </div>

        </div>

      </section>


      {/* RESULTS */}

      <section
        ref={resultsRef}
        className="scroll-mt-24 border-t border-white/10 bg-[#091522] px-5 py-14 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Yacht Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Müsait Yat & Tekneler
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Yat ağı kontrol ediliyor..."
                  : `${results.length} sonuç bulundu`}
              </p>

            </div>


            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  setMobileFilters(
                    true
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black lg:hidden"
              >
                <FaFilter />
                Filtre
              </button>


              <div className="relative">

                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(
                      event.target
                        .value as SortMode
                    )
                  }
                  className="appearance-none rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 pr-9 text-xs font-black"
                >
                  <option value="recommended">
                    Önerilen
                  </option>
                  <option value="priceAsc">
                    Fiyat Artan
                  </option>
                  <option value="priceDesc">
                    Fiyat Azalan
                  </option>
                  <option value="capacity">
                    Kapasite
                  </option>
                </select>

                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

              </div>

            </div>

          </div>


          <div className="mt-7 grid gap-7 lg:grid-cols-[270px_1fr]">

            <aside className="hidden lg:block">

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#07111f] p-5">

                <h3 className="font-black">
                  Yat Filtreleri
                </h3>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Minimum Kabin
                  </span>

                  <select
                    value={
                      filters.minCabins
                    }
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        minCabins:
                          Number(
                            event.target.value
                          ),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3"
                  >
                    <option value="0">
                      Tümü
                    </option>
                    <option value="2">
                      2+ Kabin
                    </option>
                    <option value="3">
                      3+ Kabin
                    </option>
                    <option value="4">
                      4+ Kabin
                    </option>
                    <option value="5">
                      5+ Kabin
                    </option>
                  </select>

                </label>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Maksimum Günlük Fiyat
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={
                      filters.maxPrice
                    }
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        maxPrice:
                          event.target.value,
                      })
                    }
                    placeholder="Örn. 50000"
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3"
                  />

                </label>


                <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] p-4">

                  <div className="text-xs font-black text-emerald-300">
                    Gerçek Stok
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Tarih araması rezervasyon ve kapalı günleri kontrol eder.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={clear}
                  className="mt-5 w-full rounded-xl border border-white/10 py-3 text-xs font-black text-slate-400"
                >
                  Filtreleri Temizle
                </button>

              </div>

            </aside>


            <div>

              {error && (

                <div className="mb-5 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">

                  {error}

                  <button
                    type="button"
                    onClick={() =>
                      setError("")
                    }
                  >
                    <FaTimes />
                  </button>

                </div>

              )}


              {loading ? (

                <div className="space-y-5">

                  {[1,2,3].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-[310px] animate-pulse rounded-[28px] bg-white/[.04]"
                      />
                    )
                  )}

                </div>

              ) : results.length ? (

                <div className="space-y-5">

                  {results.map(
                    (yacht) => (

                      <article
                        key={yacht.id}
                        className="group grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:border-orange-500/30 hover:shadow-2xl md:grid-cols-[350px_1fr]"
                      >

                        <div className="relative min-h-[300px] overflow-hidden bg-slate-900">

                          {yacht.cover_url ? (

                            <img
                              src={yacht.cover_url}
                              alt={yacht.name}
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />

                          ) : (

                            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-slate-600">
                              <FaShip className="text-5xl" />
                              <span className="mt-3 text-xs">
                                Görsel hazırlanıyor
                              </span>
                            </div>

                          )}


                          {yacht.verified && (

                            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">
                              <FaCheckCircle />
                              DOĞRULANMIŞ
                            </div>

                          )}

                        </div>


                        <div className="flex flex-col p-5 md:p-6">

                          <div className="flex flex-wrap items-start justify-between gap-4">

                            <div>

                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <FaMapMarkerAlt className="text-orange-400" />
                                {yacht.city}
                                {yacht.marina
                                  ? ` · ${yacht.marina}`
                                  : ""}
                              </div>


                              <h3 className="mt-3 text-2xl font-black">
                                {yacht.name}
                              </h3>


                              <div className="mt-2 text-xs font-black text-cyan-300">
                                {yachtTypeLabel(
                                  yacht.yacht_type
                                )}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

                              <div className="text-[9px] uppercase text-slate-600">
                                Günlük
                              </div>

                              <div className="mt-1 text-xl font-black text-orange-400">
                                {money(
                                  yacht.base_daily_price,
                                  yacht.currency
                                )}
                              </div>

                            </div>

                          </div>


                          <div className="mt-5 grid gap-2 sm:grid-cols-4">

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                              <div className="text-[9px] uppercase text-slate-600">
                                Misafir
                              </div>
                              <div className="mt-1 font-black">
                                {yacht.max_guests}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                              <div className="text-[9px] uppercase text-slate-600">
                                Kabin
                              </div>
                              <div className="mt-1 font-black">
                                {yacht.cabins}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                              <div className="text-[9px] uppercase text-slate-600">
                                Uzunluk
                              </div>
                              <div className="mt-1 font-black">
                                {yacht.length_m
                                  ? `${yacht.length_m} m`
                                  : "-"}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                              <div className="text-[9px] uppercase text-slate-600">
                                Kaptan
                              </div>
                              <div className="mt-1 font-black">
                                {yacht.captain_included
                                  ? "Dahil"
                                  : "Opsiyonel"}
                              </div>
                            </div>

                          </div>


                          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">

                            <div>

                              <div className="text-[9px] uppercase text-slate-600">
                                Kiralama
                              </div>

                              <div className="mt-1 text-xs font-black text-slate-300">
                                Minimum {yacht.minimum_days} gün
                              </div>

                            </div>


                            <Link
                              href={{
                                pathname:
                                  `/yatlar/${yacht.slug}`,
                                query: {
                                  ...(filters.checkIn
                                    ? {
                                        checkIn:
                                          filters.checkIn,
                                      }
                                    : {}),
                                  ...(filters.checkOut
                                    ? {
                                        checkOut:
                                          filters.checkOut,
                                      }
                                    : {}),
                                  guests:
                                    String(
                                      filters.guests
                                    ),
                                },
                              }}
                              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black hover:bg-orange-600"
                            >
                              Yatı İncele
                              <FaArrowRight />
                            </Link>

                          </div>

                        </div>

                      </article>

                    )
                  )}

                </div>

              ) : (

                <div>

                  <div className="rounded-[24px] border border-orange-500/15 bg-orange-500/[.04] p-5">

                    <div className="font-black text-orange-300">
                      Marketplace Tasarım Önizlemesi
                    </div>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      Gerçek yatlar sisteme eklenene kadar aşağıdaki örnekler yalnızca tasarımı gösterir ve rezervasyon alınmaz.
                    </p>

                  </div>


                  <div className="mt-5 grid gap-5 md:grid-cols-3">

                    {preview.map(
                      (yacht) => (

                        <article
                          key={yacht.name}
                          className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1825]"
                        >

                          <div className="relative aspect-[4/3] overflow-hidden">

                            <img
                              src={yacht.image}
                              alt={yacht.name}
                              className="h-full w-full object-cover"
                            />

                            <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-[8px] font-black text-orange-300">
                              TASARIM ÖNİZLEME
                            </div>

                          </div>


                          <div className="p-4">

                            <div className="text-[9px] text-cyan-300">
                              {yacht.type}
                            </div>

                            <h3 className="mt-2 text-lg font-black">
                              {yacht.name}
                            </h3>

                            <div className="mt-1 text-[10px] text-slate-500">
                              {yacht.city} · {yacht.marina}
                            </div>

                            <div className="mt-4 flex gap-2 text-[9px] text-slate-400">

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {yacht.guests} kişi
                              </span>

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {yacht.cabins} kabin
                              </span>

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {yacht.length} m
                              </span>

                            </div>

                            <div className="mt-4 text-xl font-black text-orange-400">
                              {money(yacht.price)}
                            </div>

                            <div className="text-[9px] text-slate-600">
                              örnek günlük fiyat
                            </div>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      </section>


      {/* NETWORK */}

      <section className="border-t border-white/10 px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.8fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Turobus Yacht Network
            </div>

            <h2 className="mt-2 max-w-2xl text-3xl font-black">
              Tekne ilan sitesi değil. Kiralama, stok ve rezervasyon altyapısı.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Merkezi Takvim",
                  "Rezervasyon ve kapalı tarihler aynı müsaitlik motorunda kontrol edilir.",
                ],
                [
                  "Sezonluk Fiyat",
                  "Yüksek sezon ve özel dönem fiyatları ayrı yönetilebilir.",
                ],
                [
                  "Rezervasyon Kilidi",
                  "Aynı yat için eş zamanlı çifte rezervasyon engellenir.",
                ],
                [
                  "Marketplace Komisyonu",
                  "Turobus komisyonu yalnızca Turobus Marketplace kaynaklı satışta oluşur.",
                ],
              ].map(
                ([
                  title,
                  description,
                ]) => (

                  <div
                    key={title}
                    className="rounded-[22px] border border-white/10 bg-white/[.025] p-5"
                  >
                    <FaShieldAlt className="text-orange-400" />
                    <div className="mt-4 font-black">
                      {title}
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {description}
                    </p>
                  </div>

                )
              )}

            </div>

          </div>


          <div className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-7">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS YACHT
            </div>

            <div className="mt-4 text-4xl font-black leading-tight">
              Yat.
              <br />
              Takvim.
              <br />
              Fiyat.
              <br />
              Rezervasyon.
            </div>

          </div>

        </div>

      </section>


      {mobileFilters && (

        <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-md">

          <div className="absolute inset-x-0 bottom-0 rounded-t-[30px] border-t border-white/10 bg-[#091522] p-5">

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-black">
                Yat Filtreleri
              </h3>

              <button
                type="button"
                onClick={() =>
                  setMobileFilters(false)
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
              >
                <FaTimes />
              </button>

            </div>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Minimum Kabin
              </span>

              <select
                value={filters.minCabins}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    minCabins:
                      Number(
                        event.target.value
                      ),
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              >
                <option value="0">Tümü</option>
                <option value="2">2+ Kabin</option>
                <option value="3">3+ Kabin</option>
                <option value="4">4+ Kabin</option>
                <option value="5">5+ Kabin</option>
              </select>

            </label>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Maksimum Günlük Fiyat
              </span>

              <input
                type="number"
                value={filters.maxPrice}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    maxPrice:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              />

            </label>


            <button
              type="button"
              onClick={() => {
                setMobileFilters(false);
                resultsRef.current?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              className="mt-6 w-full rounded-xl bg-orange-500 py-4 font-black"
            >
              Sonuçları Göster
            </button>

          </div>

        </div>

      )}


      <Footer />

    </main>
  );
}
