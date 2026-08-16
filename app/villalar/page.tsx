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
  FaArrowRight,
  FaBed,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaHome,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type Villa = {
  slug: string;
  name: string;
  city: string | null;
  district: string | null;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_nightly_rate: number;
  currency: string;
  minimum_stay: number;
  cleaning_fee: number;
  security_deposit: number;
  cover_url: string | null;
};


type SearchPanel =
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


const destinations = [
  {
    city: "Fethiye",
    region: "Muğla",
    detail: "Ölüdeniz · Kayaköy · Çalış · Hisarönü",
  },
  {
    city: "Kalkan",
    region: "Antalya",
    detail: "İslamlar · Üzümlü · Kalamar",
  },
  {
    city: "Kaş",
    region: "Antalya",
    detail: "Patara · Çukurbağ · Kalkan",
  },
  {
    city: "Bodrum",
    region: "Muğla",
    detail: "Yalıkavak · Türkbükü · Gümüşlük",
  },
  {
    city: "Marmaris",
    region: "Muğla",
    detail: "Selimiye · Bozburun · Hisarönü",
  },
  {
    city: "Çeşme",
    region: "İzmir",
    detail: "Alaçatı · Ilıca · Dalyan",
  },
];


const previewVillas = [
  {
    name: "Villa Azure",
    location: "Ölüdeniz · Fethiye",
    guests: 6,
    bedrooms: 3,
    bathrooms: 3,
    price: 14500,
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=90",
  },
  {
    name: "Villa Infinity",
    location: "Kalkan · Antalya",
    guests: 8,
    bedrooms: 4,
    bathrooms: 4,
    price: 18900,
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=90",
  },
  {
    name: "Villa Sunset",
    location: "Yalıkavak · Bodrum",
    guests: 10,
    bedrooms: 5,
    bathrooms: 5,
    price: 24900,
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=90",
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
    { length: 42 },
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
  value,
  minimum,
  onMonth,
  onSelect,
}: {
  month: Date;
  value: string;
  minimum: string;
  onMonth: (
    value: Date
  ) => void;
  onSelect: (
    value: string
  ) => void;
}) {

  const label =
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
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
        >
          <FaChevronLeft />
        </button>

        <strong className="capitalize">
          {label}
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
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
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
              className="py-1 text-center text-[9px] font-black uppercase text-slate-600"
            >
              {day}
            </div>
          )
        )}


        {monthDays(
          month
        ).map(
          (date) => {

            const day =
              iso(date);

            const disabled =
              day < minimum;

            const active =
              day === value;

            const sameMonth =
              date.getMonth() ===
              month.getMonth();


            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onSelect(day)
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


export default function VillasPage() {

  const resultsRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const [
    villas,
    setVillas,
  ] =
    useState<Villa[]>([]);


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
    useState<SearchPanel>(
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
      destination: "",
      checkIn: "",
      checkOut: "",
      guests: 2,
      bedrooms: 0,
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
            "get_public_villa_marketplace",
            {
              p_city:
                next.destination ||
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

          setVillas([]);

        } else {

          setVillas(
            (data ??
              []) as Villa[]
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
        event: MouseEvent
      ) {

        const target =
          event.target as HTMLElement;

        if (
          !target.closest(
            "[data-villa-search]"
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
          villas.filter(
            (villa) => {

              const bedroomMatch =
                filters.bedrooms <=
                  0 ||
                villa.bedrooms >=
                  filters.bedrooms;


              const priceMatch =
                !filters.maxPrice ||
                villa.base_nightly_rate <=
                  Number(
                    filters.maxPrice
                  );


              return (
                bedroomMatch &&
                priceMatch
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
                first.base_nightly_rate -
                second.base_nightly_rate
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
                second.base_nightly_rate -
                first.base_nightly_rate
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


        return rows;

      },
      [
        villas,
        filters.bedrooms,
        filters.maxPrice,
        sort,
      ]
    );


  const heroImage =
    villas.find(
      (villa) =>
        Boolean(
          villa.cover_url
        )
    )?.cover_url ??
    previewVillas[0].image;


  function selectCheckIn(
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


  function selectCheckOut(
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


  async function searchVillas() {

    if (
      filters.checkIn &&
      filters.checkOut &&
      filters.checkOut <=
        filters.checkIn
    ) {

      setError(
        "Çıkış tarihi giriş tarihinden sonra olmalıdır."
      );

      return;
    }


    setOpenPanel(null);

    await load();


    window.setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100
    );
  }


  async function selectDestination(
    city: string
  ) {

    const next = {
      ...filters,
      destination:
        city,
    };

    setFilters(next);

    setOpenPanel(null);

    await load(next);
  }


  function clearFilters() {

    const next = {
      destination: "",
      checkIn: "",
      checkOut: "",
      guests: 2,
      bedrooms: 0,
      maxPrice: "",
    };

    setFilters(next);
    setSort("recommended");

    void load(next);
  }


  const summary =
    [
      filters.destination ||
        "Tüm bölgeler",

      filters.checkIn &&
      filters.checkOut
        ? `${formatDate(
            filters.checkIn
          )} → ${formatDate(
            filters.checkOut
          )}`
        : "Tarih seçilmedi",

      `${filters.guests} misafir`,

      filters.bedrooms
        ? `${filters.bedrooms}+ yatak odası`
        : "Tüm villa tipleri",
    ].join(" · ");


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* HERO */}

      <section className="relative overflow-visible border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              `url("${heroImage}")`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/86 to-[#06101b]/30" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/20" />


        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">

          <div className="grid items-end gap-10 lg:grid-cols-[1fr_.75fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300 backdrop-blur-xl">

                <FaCheckCircle />

                Villa OS Canlı Marketplace

              </div>


              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.93] tracking-tight md:text-7xl">

                Villanı Bul.

                <span className="mt-3 block text-orange-500">
                  Tatilini Özgürce Yaşa.
                </span>

              </h1>


              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Gerçek müsaitlik,
                merkezi takvim ve
                Villa OS bağlantısıyla
                seçkin villa portföyünü
                keşfet.

              </p>

            </div>


            <div className="hidden lg:block">

              <div className="ml-auto max-w-[420px] rounded-[30px] border border-white/15 bg-black/30 p-6 backdrop-blur-2xl">

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
                  Turobus Villa
                </div>

                <div className="mt-4 text-3xl font-black">
                  Villa sahibinden Marketplace&apos;e tek sistem.
                </div>


                <div className="mt-6 space-y-3">

                  {[
                    "Canlı villa müsaitliği",
                    "Çifte rezervasyon koruması",
                    "Villa OS gerçek stok bağlantısı",
                    "Doğrudan villa detay & rezervasyon",
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
            data-villa-search
            className="relative z-40 mt-10 grid rounded-[24px] border border-white/15 bg-[#081522]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid-cols-[1.25fr_1fr_1fr_.85fr_auto]"
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
                className="flex min-h-[86px] w-full items-center justify-between gap-3 px-5 text-left"
              >

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                    <FaMapMarkerAlt />
                    Lokasyon
                  </div>

                  <div className={`mt-2 text-sm font-black ${
                    filters.destination
                      ? "text-white"
                      : "text-slate-500"
                  }`}>
                    {filters.destination ||
                      "Villa bölgesi seç"}
                  </div>

                </div>

                <FaChevronDown className="text-xs text-slate-600" />

              </button>


              {openPanel ===
                "location" && (

                <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[24px] border border-white/10 bg-[#0c1825] shadow-2xl shadow-black/70">

                  <div className="border-b border-white/10 p-4">

                    <div className="text-sm font-black">
                      Popüler Villa Bölgeleri
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500">
                      Tatil yapmak istediğin bölgeyi seç
                    </div>

                  </div>


                  <div className="p-2">

                    {destinations.map(
                      (
                        destination
                      ) => (

                        <button
                          key={
                            destination.city
                          }
                          type="button"
                          onClick={() =>
                            void selectDestination(
                              destination.city
                            )
                          }
                          className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition hover:bg-white/[.05]"
                        >

                          <div className="flex items-start gap-3">

                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                              <FaMapMarkerAlt />
                            </div>

                            <div>

                              <div className="text-sm font-black">
                                {destination.city}
                              </div>

                              <div className="mt-1 text-[10px] text-slate-500">
                                {destination.region} · {destination.detail}
                              </div>

                            </div>

                          </div>


                          {filters.destination ===
                            destination.city && (
                            <FaCheck className="text-emerald-400" />
                          )}

                        </button>

                      )
                    )}

                  </div>

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

                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                  <FaCalendarAlt />
                  Giriş
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
                    value={
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
                      selectCheckIn
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

                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                  <FaCalendarAlt />
                  Çıkış
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
                    value={
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
                      selectCheckOut
                    }
                  />

                </div>

              )}

            </div>


            {/* GUEST */}

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

                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                  <FaUsers />
                  Misafir
                </div>

                <div className="mt-2 text-sm font-black">
                  {filters.guests} Misafir
                </div>

              </button>


              {openPanel ===
                "guests" && (

                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[290px] rounded-[24px] border border-white/10 bg-[#0c1825] p-4 shadow-2xl">

                  <div>

                    <div className="text-sm font-black">
                      Misafir Sayısı
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500">
                      Villada konaklayacak toplam kişi
                    </div>

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
                              20,
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


                  <button
                    type="button"
                    onClick={() =>
                      setOpenPanel(null)
                    }
                    className="mt-5 w-full rounded-xl bg-white/[.06] py-3 text-xs font-black"
                  >
                    Uygula
                  </button>

                </div>

              )}

            </div>


            <div className="flex items-center p-3">

              <button
                type="button"
                onClick={() =>
                  void searchVillas()
                }
                className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                <FaSearch />
                Villa Ara
              </button>

            </div>

          </div>


          {/* TRUST */}

          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              "Gerçek Müsaitlik",
              "Merkezi Villa Stoğu",
              "Çifte Satış Koruması",
              "Villa OS Bağlantısı",
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

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Villa Seçimini Kolaylaştır
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Nasıl Bir Villa Arıyorsun?
            </h2>

          </div>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              {
                title:
                  "2+ Yatak Odası",
                text:
                  "Çift ve küçük aileler",
                bedrooms:
                  2,
              },
              {
                title:
                  "3+ Yatak Odası",
                text:
                  "Aile ve arkadaş grupları",
                bedrooms:
                  3,
              },
              {
                title:
                  "4+ Yatak Odası",
                text:
                  "Geniş gruplar",
                bedrooms:
                  4,
              },
              {
                title:
                  "8+ Misafir",
                text:
                  "Kalabalık tatiller",
                guests:
                  8,
              },
            ].map(
              (item) => (

                <button
                  key={
                    item.title
                  }
                  type="button"
                  onClick={() => {

                    setFilters({
                      ...filters,
                      bedrooms:
                        item.bedrooms ??
                        filters.bedrooms,
                      guests:
                        item.guests ??
                        filters.guests,
                    });

                    window.setTimeout(
                      () =>
                        resultsRef.current?.scrollIntoView({
                          behavior:
                            "smooth",
                        }),
                      100
                    );

                  }}
                  className="group rounded-[24px] border border-white/10 bg-[#0b1825] p-5 text-left transition hover:-translate-y-1 hover:border-orange-500/30"
                >

                  <div className="flex items-center justify-between">

                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                      <FaHome />
                    </div>

                    <FaArrowRight className="text-slate-700 transition group-hover:text-orange-400" />

                  </div>


                  <div className="mt-4 font-black">
                    {item.title}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {item.text}
                  </div>

                </button>

              )
            )}

          </div>

        </div>

      </section>


      {/* RESULTS */}

      <section
        ref={
          resultsRef
        }
        className="scroll-mt-24 border-t border-white/10 bg-[#091522] px-5 py-14 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Canlı Villa Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Müsait Villalar
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Villa OS kontrol ediliyor..."
                  : `${results.length} uygun villa bulundu`}
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
                  className="appearance-none rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 pr-9 text-xs font-black outline-none"
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
                    Kapasite Yüksek
                  </option>
                </select>

                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

              </div>

            </div>

          </div>


          {/* SUMMARY */}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-[#07111f] px-5 py-4">

            <div>

              <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                Arama Özeti
              </div>

              <div className="mt-1 text-xs font-black text-slate-300">
                {summary}
              </div>

            </div>


            <button
              type="button"
              onClick={
                clearFilters
              }
              className="text-[10px] font-black text-orange-400"
            >
              Filtreleri Temizle
            </button>

          </div>


          <div className="mt-7 grid gap-7 lg:grid-cols-[270px_1fr]">

            {/* SIDEBAR */}

            <aside className="hidden lg:block">

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#07111f] p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-black">
                    Villa Filtreleri
                  </h3>

                  <FaFilter className="text-slate-600" />

                </div>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Yatak Odası
                  </span>

                  <select
                    value={
                      filters.bedrooms
                    }
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        bedrooms:
                          Number(
                            event.target.value
                          ),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3 text-sm font-bold"
                  >
                    <option value="0">
                      Tümü
                    </option>
                    <option value="1">
                      1+ Oda
                    </option>
                    <option value="2">
                      2+ Oda
                    </option>
                    <option value="3">
                      3+ Oda
                    </option>
                    <option value="4">
                      4+ Oda
                    </option>
                    <option value="5">
                      5+ Oda
                    </option>
                  </select>

                </label>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Maksimum Gecelik Fiyat
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
                    placeholder="Örn. 20000"
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3 text-sm"
                  />

                </label>


                <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] p-4">

                  <div className="text-xs font-black text-emerald-300">
                    Canlı Müsaitlik
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Tarih seçildiğinde Villa OS rezervasyon ve kapalı günleri kontrol edilir.
                  </p>

                </div>

              </div>

            </aside>


            {/* LIST */}

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
                        className="h-[300px] animate-pulse rounded-[28px] bg-white/[.04]"
                      />
                    )
                  )}

                </div>

              ) : results.length >
                0 ? (

                <div className="space-y-5">

                  {results.map(
                    (villa) => (

                      <article
                        key={
                          villa.slug
                        }
                        className="group grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:border-orange-500/30 hover:shadow-2xl hover:shadow-black/30 md:grid-cols-[340px_1fr]"
                      >

                        {/* IMAGE */}

                        <div className="relative min-h-[290px] overflow-hidden bg-slate-900">

                          {villa.cover_url ? (

                            <img
                              src={
                                villa.cover_url
                              }
                              alt={
                                villa.name
                              }
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />

                          ) : (

                            <div className="flex h-full min-h-[290px] flex-col items-center justify-center text-slate-600">

                              <FaHome className="text-5xl" />

                              <div className="mt-3 text-xs">
                                Villa görseli hazırlanıyor
                              </div>

                            </div>

                          )}


                          <div className="absolute left-4 top-4 flex gap-2">

                            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">
                              <FaCheckCircle />
                              CANLI MÜSAİTLİK
                            </span>

                          </div>

                        </div>


                        {/* INFO */}

                        <div className="flex min-w-0 flex-col p-5 md:p-6">

                          <div className="flex flex-wrap items-start justify-between gap-4">

                            <div>

                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <FaMapMarkerAlt className="text-orange-400" />
                                {[villa.district, villa.city]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>


                              <h3 className="mt-3 text-2xl font-black">
                                {villa.name}
                              </h3>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Gecelik
                              </div>

                              <div className="mt-1 text-xl font-black text-orange-400">
                                {money(
                                  villa.base_nightly_rate,
                                  villa.currency
                                )}
                              </div>

                            </div>

                          </div>


                          <div className="mt-5 grid gap-2 sm:grid-cols-4">

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Misafir
                              </div>

                              <div className="mt-1 font-black">
                                {villa.max_guests}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Yatak Odası
                              </div>

                              <div className="mt-1 font-black">
                                {villa.bedrooms}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Banyo
                              </div>

                              <div className="mt-1 font-black">
                                {villa.bathrooms}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Min. Konaklama
                              </div>

                              <div className="mt-1 font-black">
                                {villa.minimum_stay} gece
                              </div>

                            </div>

                          </div>


                          <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-5">

                            <div>

                              <div className="text-[9px] uppercase text-slate-600">
                                Seçilen Tarih
                              </div>

                              <div className="mt-1 text-xs font-black text-slate-300">
                                {filters.checkIn &&
                                filters.checkOut
                                  ? `${formatDate(
                                      filters.checkIn
                                    )} → ${formatDate(
                                      filters.checkOut
                                    )}`
                                  : "Tarih seçerek canlı müsaitliği filtrele"}
                              </div>

                            </div>


                            <Link
                              href={{
                                pathname:
                                  `/villalar/${villa.slug}`,
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
                              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black transition hover:bg-orange-600"
                            >
                              Villa ve Tarihleri İncele
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
                      Henüz kriterlere uygun gerçek Marketplace villası olmadığı için tasarım örnekleri gösteriliyor. Villa OS&apos;ta Marketplace açılan villalar otomatik olarak bunların yerine gelir.
                    </p>

                  </div>


                  <div className="mt-5 grid gap-5 md:grid-cols-3">

                    {previewVillas.map(
                      (villa) => (

                        <article
                          key={
                            villa.name
                          }
                          className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1825]"
                        >

                          <div className="relative aspect-[4/3] overflow-hidden">

                            <img
                              src={
                                villa.image
                              }
                              alt={
                                villa.name
                              }
                              className="h-full w-full object-cover"
                            />

                            <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-[8px] font-black text-orange-300 backdrop-blur">
                              TASARIM ÖNİZLEME
                            </div>

                          </div>


                          <div className="p-4">

                            <h3 className="text-lg font-black">
                              {villa.name}
                            </h3>

                            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                              <FaMapMarkerAlt />
                              {villa.location}
                            </div>


                            <div className="mt-4 flex gap-2 text-[9px] text-slate-400">

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {villa.guests} kişi
                              </span>

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {villa.bedrooms} oda
                              </span>

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {villa.bathrooms} banyo
                              </span>

                            </div>


                            <div className="mt-5 border-t border-white/10 pt-4">

                              <div className="text-xl font-black text-orange-400">
                                {money(
                                  villa.price
                                )}
                              </div>

                              <div className="text-[9px] text-slate-600">
                                örnek gecelik fiyat
                              </div>

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
              Turobus Villa Network
            </div>

            <h2 className="mt-2 max-w-2xl text-3xl font-black">
              Villa ilan sitesi değil. Gerçek operasyon sistemine bağlı Marketplace.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Villa OS Entegrasyonu",
                  "Villa, fiyat ve rezervasyon bilgisi operasyon sistemine bağlıdır.",
                ],
                [
                  "Canlı Müsaitlik",
                  "Seçilen tarihler gerçek merkezi takvim üzerinden kontrol edilir.",
                ],
                [
                  "Çifte Satış Koruması",
                  "Airbnb, B2B, direkt ve Marketplace aynı stokta birleşir.",
                ],
                [
                  "Gerçek Rezervasyon",
                  "Villa detayındaki rezervasyon doğrudan Villa OS operasyonuna düşer.",
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


          <div className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-orange-500/[.03] to-transparent p-7">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS VILLA
            </div>

            <div className="mt-4 text-4xl font-black leading-tight">
              Villa.
              <br />
              Takvim.
              <br />
              Stok.
              <br />
              Rezervasyon.
            </div>

            <p className="mt-6 text-sm leading-7 text-slate-400">
              Villa sahibi, acenta, Airbnb ve Turobus Marketplace tek merkezi sistemde buluşur.
            </p>

          </div>

        </div>

      </section>


      {/* MOBILE FILTER */}

      {mobileFilters && (

        <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-md">

          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#091522] p-5">

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-black">
                Villa Filtreleri
              </h3>

              <button
                type="button"
                onClick={() =>
                  setMobileFilters(
                    false
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
              >
                <FaTimes />
              </button>

            </div>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Yatak Odası
              </span>

              <select
                value={
                  filters.bedrooms
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    bedrooms:
                      Number(
                        event.target.value
                      ),
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              >
                <option value="0">
                  Tümü
                </option>
                <option value="2">
                  2+ Oda
                </option>
                <option value="3">
                  3+ Oda
                </option>
                <option value="4">
                  4+ Oda
                </option>
                <option value="5">
                  5+ Oda
                </option>
              </select>

            </label>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Maksimum Gecelik Fiyat
              </span>

              <input
                type="number"
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
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              />

            </label>


            <button
              type="button"
              onClick={() => {

                setMobileFilters(
                  false
                );

                resultsRef.current?.scrollIntoView({
                  behavior:
                    "smooth",
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
