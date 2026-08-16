"use client";

import {
  FormEvent,
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
  FaHeart,
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


type DemoVilla = {
  name: string;
  location: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  price: number;
  image: string;
  badge: string;
};


const money = (
  value: number,
  currency = "TRY"
) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));


const dateToIso = (
  date: Date
) => {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};


const today = () =>
  dateToIso(
    new Date()
  );


const isoToDate = (
  value: string
) => {

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

};


const formatDate = (
  value: string
) => {

  if (!value) {
    return "Tarih seçin";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    isoToDate(
      value
    )
  );

};


const destinations = [
  {
    city: "Fethiye",
    region: "Muğla",
    detail:
      "Ölüdeniz · Hisarönü · Kayaköy · Çalış",
  },
  {
    city: "Kalkan",
    region: "Antalya",
    detail:
      "İslamlar · Üzümlü · Kalamar",
  },
  {
    city: "Kaş",
    region: "Antalya",
    detail:
      "Çukurbağ · Patara · Kalkan",
  },
  {
    city: "Bodrum",
    region: "Muğla",
    detail:
      "Yalıkavak · Türkbükü · Gümüşlük",
  },
  {
    city: "Marmaris",
    region: "Muğla",
    detail:
      "Selimiye · Bozburun · Hisarönü",
  },
  {
    city: "Çeşme",
    region: "İzmir",
    detail:
      "Alaçatı · Ilıca · Dalyan",
  },
];


const destinationCards = [
  {
    name: "Fethiye",
    subtitle:
      "Ölüdeniz · Kayaköy · Çalış",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Kalkan",
    subtitle:
      "İslamlar · Üzümlü",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Kaş",
    subtitle:
      "Patara · Çukurbağ",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Bodrum",
    subtitle:
      "Yalıkavak · Gümüşlük",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Marmaris",
    subtitle:
      "Selimiye · Bozburun",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Çeşme",
    subtitle:
      "Alaçatı · Ilıca",
    image:
      "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=900&q=85",
  },
];


const demoVillas: DemoVilla[] = [
  {
    name: "Villa Azure",
    location:
      "Ölüdeniz · Fethiye",
    guests: 6,
    bedrooms: 3,
    bathrooms: 3,
    price: 14500,
    badge:
      "TASARIM ÖNİZLEME",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=90",
  },
  {
    name: "Villa Liora",
    location:
      "Kalkan · Antalya",
    guests: 8,
    bedrooms: 4,
    bathrooms: 4,
    price: 18900,
    badge:
      "TASARIM ÖNİZLEME",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1000&q=90",
  },
  {
    name: "Villa Sunset",
    location:
      "Yalıkavak · Bodrum",
    guests: 6,
    bedrooms: 3,
    bathrooms: 3,
    price: 16750,
    badge:
      "TASARIM ÖNİZLEME",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=90",
  },
  {
    name: "Villa Infinity",
    location:
      "Kaş · Antalya",
    guests: 10,
    bedrooms: 5,
    bathrooms: 5,
    price: 24900,
    badge:
      "TASARIM ÖNİZLEME",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=90",
  },
];


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


function calendarDays(
  month: Date
) {

  const first =
    new Date(
      month.getFullYear(),
      month.getMonth(),
      1,
      12
    );

  const startOffset =
    (first.getDay() + 6) % 7;

  const gridStart =
    new Date(first);

  gridStart.setDate(
    first.getDate() -
      startOffset
  );

  return Array.from(
    {
      length: 42,
    },
    (
      _,
      index
    ) => {

      const date =
        new Date(
          gridStart
        );

      date.setDate(
        gridStart.getDate() +
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
  onMonthChange,
  onSelect,
}: {
  month: Date;
  selected: string;
  minimum: string;
  onMonthChange: (
    month: Date
  ) => void;
  onSelect: (
    value: string
  ) => void;
}) {

  const days =
    calendarDays(
      month
    );

  const label =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        month: "long",
        year: "numeric",
      }
    ).format(month);


  return (
    <div className="w-[330px] max-w-[calc(100vw-40px)] rounded-[22px] border border-white/10 bg-[#0b1724] p-4 shadow-2xl shadow-black/60">

      <div className="flex items-center justify-between">

        <button
          type="button"
          onClick={() =>
            onMonthChange(
              addMonths(
                month,
                -1
              )
            )
          }
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[.05] hover:text-white"
        >
          <FaChevronLeft />
        </button>


        <div className="text-sm font-black capitalize text-white">
          {label}
        </div>


        <button
          type="button"
          onClick={() =>
            onMonthChange(
              addMonths(
                month,
                1
              )
            )
          }
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[.05] hover:text-white"
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


        {days.map(
          (
            date
          ) => {

            const value =
              dateToIso(
                date
              );

            const currentMonth =
              date.getMonth() ===
              month.getMonth();

            const disabled =
              value < minimum;

            const active =
              value === selected;


            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onSelect(
                    value
                  )
                }
                className={`aspect-square rounded-xl text-xs font-black transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : disabled
                      ? "cursor-not-allowed text-slate-800"
                      : currentMonth
                        ? "text-slate-300 hover:bg-orange-500/15 hover:text-orange-300"
                        : "text-slate-700 hover:bg-white/[.03]"
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
    searching,
    setSearching,
  ] =
    useState(false);


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
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
        12
      )
    );


  const [
    favorites,
    setFavorites,
  ] =
    useState<Set<string>>(
      new Set()
    );


  const [
    filters,
    setFilters,
  ] =
    useState({
      destination: "",
      checkIn: "",
      checkOut: "",
      guests: "2",
    });


  const load =
    useCallback(
      async (
        nextFilters = filters
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
                nextFilters.destination ||
                null,

              p_guests:
                Number(
                  nextFilters.guests ||
                    0
                ) || null,

              p_check_in:
                nextFilters.checkIn ||
                null,

              p_check_out:
                nextFilters.checkOut ||
                null,

            }
          );


        if (
          rpcError
        ) {

          setError(
            rpcError.message
          );

          setVillas(
            []
          );

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

          setOpenPanel(
            null
          );

        }

      }


      document.addEventListener(
        "mousedown",
        close
      );


      return () => {

        document.removeEventListener(
          "mousedown",
          close
        );

      };

    },
    []
  );


  const heroImage =
    useMemo(
      () =>
        villas.find(
          (
            villa
          ) =>
            Boolean(
              villa.cover_url
            )
        )?.cover_url ??
        demoVillas[0].image,
      [
        villas,
      ]
    );


  const featured =
    villas.length
      ? villas.slice(
          0,
          4
        )
      : [];


  async function submit(
    event:
      FormEvent
  ) {

    event.preventDefault();

    setOpenPanel(
      null
    );


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


    setSearching(
      true
    );


    await load(
      filters
    );


    setSearching(
      false
    );


    window.setTimeout(
      () => {

        resultsRef.current?.scrollIntoView({
          behavior:
            "smooth",
          block:
            "start",
        });

      },
      120
    );

  }


  async function selectLocation(
    city: string
  ) {

    const next = {
      ...filters,
      destination:
        city,
    };


    setFilters(
      next
    );

    setOpenPanel(
      null
    );


    await load(
      next
    );


    window.setTimeout(
      () => {

        resultsRef.current?.scrollIntoView({
          behavior:
            "smooth",
          block:
            "start",
        });

      },
      120
    );

  }


  function selectCheckIn(
    value: string
  ) {

    setFilters(
      (current) => ({
        ...current,
        checkIn:
          value,
        checkOut:
          current.checkOut &&
          current.checkOut >
            value
            ? current.checkOut
            : "",
      })
    );


    setCalendarMonth(
      new Date(
        isoToDate(value)
      )
    );


    setOpenPanel(
      "checkOut"
    );

  }


  function selectCheckOut(
    value: string
  ) {

    setFilters(
      (current) => ({
        ...current,
        checkOut:
          value,
      })
    );


    setOpenPanel(
      null
    );

  }


  function changeGuests(
    delta: number
  ) {

    setFilters(
      (current) => {

        const next =
          Math.min(
            20,
            Math.max(
              1,
              Number(
                current.guests
              ) +
                delta
            )
          );


        return {
          ...current,
          guests:
            String(next),
        };

      }
    );

  }


  function toggleFavorite(
    slug: string
  ) {

    setFavorites(
      (current) => {

        const next =
          new Set(
            current
          );


        if (
          next.has(slug)
        ) {

          next.delete(
            slug
          );

        } else {

          next.add(
            slug
          );

        }


        return next;

      }
    );

  }


  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06101b] text-white">

      <Navbar />


      {/* HERO */}

      <section className="relative min-h-[760px] overflow-visible border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              `url("${heroImage}")`,
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/95 via-[#06101b]/80 to-[#06101b]/30" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/25" />


        <div className="relative mx-auto flex min-h-[680px] max-w-7xl flex-col justify-center px-5 py-16 lg:px-8">

          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300 backdrop-blur-xl">

              <FaCheckCircle />

              Gerçek Müsaitlik

            </div>


            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[.94] tracking-tight md:text-7xl">

              Size Uygun

              <span className="mt-2 block text-orange-500">
                Lüks Villayı Bul
              </span>

            </h1>


            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 md:text-lg">

              Gerçek müsaitlik,
              merkezi stok ve güvenli
              rezervasyon altyapısıyla
              villanı seç.

            </p>

          </div>


          {/* PROFESSIONAL SEARCH */}

          <form
            data-villa-search
            onSubmit={
              submit
            }
            className="relative z-30 mt-10 grid rounded-[22px] border border-white/15 bg-[#07131f]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl md:grid-cols-[1.25fr_1fr_1fr_.75fr_auto]"
          >

            {/* LOCATION */}

            <div className="relative border-b border-white/10 md:border-b-0 md:border-r">

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
                className="flex h-full min-h-[76px] w-full items-center justify-between gap-3 px-5 text-left"
              >

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-slate-500">
                    <FaMapMarkerAlt />
                    Lokasyon
                  </div>

                  <div className={`mt-2 text-sm font-black ${
                    filters.destination
                      ? "text-white"
                      : "text-slate-500"
                  }`}>
                    {filters.destination ||
                      "Nereye gitmek istersiniz?"}
                  </div>

                </div>

                <FaChevronDown className="shrink-0 text-xs text-slate-600" />

              </button>


              {openPanel ===
                "location" && (

                <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[370px] max-w-[calc(100vw-40px)] overflow-hidden rounded-[22px] border border-white/10 bg-[#0b1724] shadow-2xl shadow-black/70">

                  <div className="border-b border-white/10 p-4">

                    <div className="text-xs font-black">
                      Popüler Lokasyonlar
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500">
                      Villa bölgesini seç
                    </div>

                  </div>


                  <div className="max-h-[360px] overflow-y-auto p-2">

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
                            void selectLocation(
                              destination.city
                            )
                          }
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-white/[.05]"
                        >

                          <div>

                            <div className="text-sm font-black">
                              {destination.city}
                            </div>

                            <div className="mt-1 text-[10px] text-slate-500">
                              {destination.region} · {destination.detail}
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

            <div className="relative border-b border-white/10 md:border-b-0 md:border-r">

              <button
                type="button"
                onClick={() => {

                  setCalendarMonth(
                    filters.checkIn
                      ? isoToDate(
                          filters.checkIn
                        )
                      : new Date()
                  );

                  setOpenPanel(
                    openPanel ===
                      "checkIn"
                      ? null
                      : "checkIn"
                  );

                }}
                className="flex h-full min-h-[76px] w-full items-center justify-between gap-3 px-5 text-left"
              >

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-slate-500">
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

                </div>

                <FaChevronDown className="text-xs text-slate-600" />

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
                      today()
                    }
                    onMonthChange={
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

            <div className="relative border-b border-white/10 md:border-b-0 md:border-r">

              <button
                type="button"
                onClick={() => {

                  const base =
                    filters.checkOut ||
                    filters.checkIn ||
                    today();

                  setCalendarMonth(
                    isoToDate(
                      base
                    )
                  );

                  setOpenPanel(
                    openPanel ===
                      "checkOut"
                      ? null
                      : "checkOut"
                  );

                }}
                className="flex h-full min-h-[76px] w-full items-center justify-between gap-3 px-5 text-left"
              >

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-slate-500">
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

                </div>

                <FaChevronDown className="text-xs text-slate-600" />

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
                        ? dateToIso(
                            new Date(
                              isoToDate(
                                filters.checkIn
                              ).getTime() +
                                86400000
                            )
                          )
                        : today()
                    }
                    onMonthChange={
                      setCalendarMonth
                    }
                    onSelect={
                      selectCheckOut
                    }
                  />

                </div>

              )}

            </div>


            {/* GUESTS */}

            <div className="relative border-b border-white/10 md:border-b-0 md:border-r">

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
                className="flex h-full min-h-[76px] w-full items-center justify-between gap-3 px-5 text-left"
              >

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-slate-500">
                    <FaUsers />
                    Misafir
                  </div>

                  <div className="mt-2 text-sm font-black">
                    {filters.guests} Misafir
                  </div>

                </div>

                <FaChevronDown className="text-xs text-slate-600" />

              </button>


              {openPanel ===
                "guests" && (

                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] rounded-[22px] border border-white/10 bg-[#0b1724] p-4 shadow-2xl shadow-black/70">

                  <div className="text-sm font-black">
                    Misafir Sayısı
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    Konaklayacak toplam kişi
                  </div>


                  <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[.025] p-3">

                    <button
                      type="button"
                      onClick={() =>
                        changeGuests(
                          -1
                        )
                      }
                      className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[.05] hover:text-white"
                    >
                      <FaMinus />
                    </button>

                    <div className="text-center">

                      <div className="text-2xl font-black">
                        {filters.guests}
                      </div>

                      <div className="text-[9px] uppercase text-slate-600">
                        Misafir
                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        changeGuests(
                          1
                        )
                      }
                      className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600"
                    >
                      <FaPlus />
                    </button>

                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      setOpenPanel(
                        null
                      )
                    }
                    className="mt-3 w-full rounded-xl bg-white/[.05] py-3 text-xs font-black text-slate-300"
                  >
                    Tamam
                  </button>

                </div>

              )}

            </div>


            {/* SEARCH */}

            <div className="flex items-center p-3">

              <button
                type="submit"
                disabled={
                  searching
                }
                className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50"
              >

                <FaSearch />

                {searching
                  ? "Aranıyor"
                  : "Ara"}

              </button>

            </div>

          </form>


          {error && (

            <div className="relative z-20 mt-3 flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">

              <span>
                {error}
              </span>

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


          {/* TRUST */}

          <div className="relative z-10 mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              [
                "Canlı Müsaitlik",
                "Gerçek takvim kontrolü",
              ],
              [
                "Tek Stok",
                "Çifte satış koruması",
              ],
              [
                "Güvenli Rezervasyon",
                "Merkezi kayıt sistemi",
              ],
              [
                "Doğrulanmış Portföy",
                "Villa OS bağlantılı",
              ],
            ].map(
              ([
                title,
                description,
              ]) => (

                <div
                  key={title}
                  className="flex items-center gap-3 border-white/10 px-5 py-4 xl:border-r last:border-r-0"
                >

                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                    <FaShieldAlt />
                  </div>

                  <div>

                    <div className="text-xs font-black">
                      {title}
                    </div>

                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {description}
                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* FEATURED */}

      <section className="px-5 py-16 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Seçkin Portföy
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Öne Çıkan Villalar
              </h2>

              {!villas.length &&
                !loading && (

                <p className="mt-2 text-xs text-slate-500">
                  Gerçek Marketplace villaları açılana kadar tasarım önizleme portföyü gösteriliyor.
                </p>

              )}

            </div>


            <button
              type="button"
              onClick={() =>
                resultsRef.current?.scrollIntoView({
                  behavior:
                    "smooth",
                })
              }
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-black text-slate-300 transition hover:border-orange-500/30 hover:text-white"
            >
              Tüm Villaları Gör
              <FaArrowRight />
            </button>

          </div>


          {featured.length ? (

            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {featured.map(
                (
                  villa
                ) => (

                  <div
                    key={
                      villa.slug
                    }
                    className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1825] transition hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-2xl"
                  >

                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">

                      {villa.cover_url ? (

                        <img
                          src={
                            villa.cover_url
                          }
                          alt={
                            villa.name
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />

                      ) : (

                        <div className="flex h-full items-center justify-center text-xs text-slate-600">
                          Villa görseli hazırlanıyor
                        </div>

                      )}


                      <div className="absolute left-3 top-3 rounded-full bg-emerald-400 px-3 py-1 text-[9px] font-black text-slate-950">
                        CANLI
                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          toggleFavorite(
                            villa.slug
                          )
                        }
                        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 backdrop-blur"
                      >
                        <FaHeart
                          className={
                            favorites.has(
                              villa.slug
                            )
                              ? "text-red-400"
                              : "text-white"
                          }
                        />
                      </button>

                    </div>


                    <div className="p-4">

                      <h3 className="text-base font-black">
                        {villa.name}
                      </h3>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {[villa.district, villa.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>


                      <div className="mt-4 flex gap-3 border-b border-white/10 pb-4 text-[9px] text-slate-500">

                        <span>
                          {villa.max_guests} Misafir
                        </span>

                        <span>
                          {villa.bedrooms} Oda
                        </span>

                        <span>
                          {villa.bathrooms} Banyo
                        </span>

                      </div>


                      <div className="mt-4 flex items-center justify-between gap-3">

                        <div>

                          <div className="text-lg font-black">
                            {money(
                              villa.base_nightly_rate,
                              villa.currency
                            )}
                          </div>

                          <div className="text-[9px] text-slate-600">
                            / gece
                          </div>

                        </div>


                        <Link
                          href={`/villalar/${villa.slug}`}
                          className="rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-black hover:bg-orange-600"
                        >
                          İncele
                        </Link>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          ) : (

            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {demoVillas.map(
                (
                  villa
                ) => (

                  <div
                    key={
                      villa.name
                    }
                    className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1825]"
                  >

                    <div className="relative aspect-[4/3] overflow-hidden">

                      <img
                        src={
                          villa.image
                        }
                        alt={
                          villa.name
                        }
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute left-3 top-3 rounded-full border border-orange-400/30 bg-black/70 px-3 py-1 text-[8px] font-black text-orange-300 backdrop-blur">
                        {villa.badge}
                      </div>

                    </div>


                    <div className="p-4">

                      <h3 className="font-black">
                        {villa.name}
                      </h3>

                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <FaMapMarkerAlt />
                        {villa.location}
                      </div>


                      <div className="mt-4 flex gap-3 border-b border-white/10 pb-4 text-[9px] text-slate-500">

                        <span>
                          {villa.guests} Misafir
                        </span>

                        <span>
                          {villa.bedrooms} Oda
                        </span>

                        <span>
                          {villa.bathrooms} Banyo
                        </span>

                      </div>


                      <div className="mt-4 flex items-center justify-between">

                        <div>

                          <div className="text-lg font-black">
                            {money(
                              villa.price
                            )}
                          </div>

                          <div className="text-[9px] text-slate-600">
                            örnek / gece
                          </div>

                        </div>


                        <div className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black text-slate-500">
                          Önizleme
                        </div>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* LOCATIONS */}

      <section className="border-y border-white/10 bg-[#091522] px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
            Türkiye&apos;nin Seçkin Rotaları
          </div>

          <h2 className="mt-2 text-3xl font-black">
            Öne Çıkan Lokasyonlar
          </h2>


          <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">

            {destinationCards.map(
              (
                location
              ) => (

                <button
                  key={
                    location.name
                  }
                  type="button"
                  onClick={() =>
                    void selectLocation(
                      location.name
                    )
                  }
                  className="group relative min-h-[160px] overflow-hidden rounded-[20px] border border-white/10 text-left transition hover:-translate-y-1 hover:border-orange-500/40"
                >

                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage:
                        `url("${location.image}")`,
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />


                  <div className="absolute inset-x-0 bottom-0 p-4">

                    <div className="font-black">
                      {location.name}
                    </div>

                    <div className="mt-1 text-[9px] text-slate-300">
                      {location.subtitle}
                    </div>

                  </div>

                </button>

              )
            )}

          </div>

        </div>

      </section>


      {/* REAL RESULTS */}

      <section
        ref={
          resultsRef
        }
        className="scroll-mt-24 px-5 py-16 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Canlı Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Müsait Villalar
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Villa OS stokları kontrol ediliyor..."
                  : villas.length
                    ? `${villas.length} gerçek villa bulundu`
                    : "Henüz Marketplace'e açık gerçek villa bulunmuyor"}
              </p>

            </div>


            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-2 text-[10px] font-black text-emerald-300">
              <FaShieldAlt />
              Villa OS Canlı Stok
            </div>

          </div>


          {loading ? (

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {[1,2,3].map(
                (
                  item
                ) => (

                  <div
                    key={
                      item
                    }
                    className="h-[420px] animate-pulse rounded-[28px] bg-white/[.04]"
                  />

                )
              )}

            </div>

          ) : villas.length ? (

            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

              {villas.map(
                (
                  villa
                ) => (

                  <Link
                    key={
                      villa.slug
                    }
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
                          filters.guests,
                      },
                    }}
                    className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-2xl"
                  >

                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">

                      {villa.cover_url ? (

                        <img
                          src={
                            villa.cover_url
                          }
                          alt={
                            villa.name
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />

                      ) : (

                        <div className="flex h-full items-center justify-center text-xs text-slate-600">
                          Fotoğraf hazırlanıyor
                        </div>

                      )}


                      <div className="absolute left-4 top-4 rounded-full bg-emerald-400 px-3 py-1.5 text-[9px] font-black text-slate-950">
                        CANLI MÜSAİTLİK
                      </div>

                    </div>


                    <div className="p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <h3 className="text-xl font-black">
                            {villa.name}
                          </h3>

                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <FaMapMarkerAlt />
                            {[villa.city, villa.district]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>

                        </div>


                        <div className="text-right">

                          <div className="text-lg font-black text-orange-400">
                            {money(
                              villa.base_nightly_rate,
                              villa.currency
                            )}
                          </div>

                          <div className="text-[9px] text-slate-600">
                            / gece
                          </div>

                        </div>

                      </div>


                      <div className="mt-5 flex flex-wrap gap-2">

                        <span className="flex items-center gap-2 rounded-full bg-white/[.05] px-3 py-2 text-[10px] font-black text-slate-400">
                          <FaUsers />
                          {villa.max_guests} kişi
                        </span>

                        <span className="flex items-center gap-2 rounded-full bg-white/[.05] px-3 py-2 text-[10px] font-black text-slate-400">
                          <FaBed />
                          {villa.bedrooms} oda
                        </span>

                        <span className="rounded-full bg-white/[.05] px-3 py-2 text-[10px] font-black text-slate-400">
                          Min. {villa.minimum_stay} gece
                        </span>

                      </div>


                      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">

                        <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-300">
                          <FaStar />
                          Doğrulanmış Villa
                        </span>

                        <span className="flex items-center gap-2 text-xs font-black text-orange-400">
                          İncele
                          <FaArrowRight />
                        </span>

                      </div>

                    </div>

                  </Link>

                )
              )}

            </div>

          ) : (

            <div className="mt-8 rounded-[30px] border border-orange-500/15 bg-gradient-to-br from-orange-500/[.06] to-transparent p-8 md:p-12">

              <div className="flex flex-col items-center text-center">

                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/10 text-2xl text-orange-400">
                  <FaShieldAlt />
                </div>

                <h3 className="mt-5 text-xl font-black">
                  Marketplace bağlantısı hazır
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">
                  Villa OS&apos;ta Marketplace&apos;e açacağın ilk gerçek villa, otomatik olarak bu tasarımın içine gelecek. Demo kartlar gerçek satışa açık değildir.
                </p>

              </div>

            </div>

          )}

        </div>

      </section>


      {/* WHY */}

      <section className="border-t border-white/10 bg-[#091522] px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.75fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Neden Turobus Villa?
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Villa rezervasyonunda profesyonel altyapı.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Gerçek Müsaitlik",
                  "Villa OS merkezi takvimindeki gerçek müsaitlik kullanılır.",
                ],
                [
                  "Çifte Satış Koruması",
                  "Aynı villa aynı tarihte ikinci kez satılamaz.",
                ],
                [
                  "Canlı Fiyat Yönetimi",
                  "Tarih bazlı fiyat ve minimum gece kuralları uygulanır.",
                ],
                [
                  "Tek Operasyon Merkezi",
                  "Marketplace rezervasyonu doğrudan Villa OS'a düşer.",
                ],
              ].map(
                ([
                  title,
                  text,
                ]) => (

                  <div
                    key={
                      title
                    }
                    className="rounded-[22px] border border-white/10 bg-white/[.025] p-5"
                  >

                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                      <FaShieldAlt />
                    </div>

                    <h3 className="mt-4 font-black">
                      {title}
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {text}
                    </p>

                  </div>

                )
              )}

            </div>

          </div>


          <div className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-7">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS VILLA NETWORK
            </div>

            <div className="mt-4 text-4xl font-black">
              Tek Takvim.
              <br />
              Tek Stok.
              <br />
              Tek Operasyon.
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Direkt, B2B, Airbnb ve Turobus Marketplace satışları aynı merkezi stoktan yönetilir.
            </p>

            <div className="mt-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.05] p-4 text-xs font-bold text-emerald-300">
              ✓ Marketplace villaları gerçek Villa OS stok ve fiyat bilgisiyle otomatik yayınlanır.
            </div>

          </div>

        </div>

      </section>


      <Footer />

    </main>
  );
}
