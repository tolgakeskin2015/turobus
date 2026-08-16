"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaArrowRight,
  FaBed,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaChild,
  FaHotel,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaSwimmingPool,
  FaTimes,
  FaUsers,
  FaWifi,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type Hotel = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  star_rating: number | null;
  hotel_type: string | null;
  currency: string;
  verified: boolean;
  room_type_count: number;
  max_occupancy: number;
  cover_image: string | null;
};


type OpenPanel =
  | "destination"
  | "checkIn"
  | "checkOut"
  | "guests"
  | null;


const previewHotels = [
  {
    name:
      "Turobus Beach Resort",
    location:
      "Ölüdeniz · Fethiye",
    stars: 5,
    type:
      "Resort",
    feature:
      "Her Şey Dahil",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1300&q=90",
  },
  {
    name:
      "Turobus Marina Hotel",
    location:
      "Bodrum · Muğla",
    stars: 5,
    type:
      "Luxury",
    feature:
      "Denize Sıfır",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1300&q=90",
  },
  {
    name:
      "Turobus Boutique",
    location:
      "Kaş · Antalya",
    stars: 4,
    type:
      "Boutique",
    feature:
      "Kahvaltı Dahil",
    image:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1300&q=90",
  },
  {
    name:
      "Turobus City",
    location:
      "İstanbul",
    stars: 5,
    type:
      "City Hotel",
    feature:
      "Merkezi Konum",
    image:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1300&q=90",
  },
];


const popularDestinations = [
  "Fethiye",
  "Antalya",
  "Bodrum",
  "Marmaris",
  "İstanbul",
  "Kapadokya",
];


function iso(
  date: Date
) {

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


function getMonthDays(
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
    (
      _,
      index
    ) => {

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


function Calendar({
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
    <div className="w-[340px] max-w-[calc(100vw-32px)] rounded-[24px] border border-white/10 bg-[#0b1724] p-4 shadow-2xl shadow-black/70">

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
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 hover:text-white"
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
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 hover:text-white"
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


        {getMonthDays(
          month
        ).map(
          (date) => {

            const day =
              iso(date);

            const active =
              day === value;

            const disabled =
              day < minimum;

            const sameMonth =
              date.getMonth() ===
              month.getMonth();


            return (
              <button
                key={day}
                type="button"
                disabled={
                  disabled
                }
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


export default function HotelsPage() {

  const searchRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const [
    hotels,
    setHotels,
  ] =
    useState<Hotel[]>([]);


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
    filters,
    setFilters,
  ] =
    useState({
      destination: "",
      checkIn: "",
      checkOut: "",
      adults: 2,
      children: 0,
      rooms: 1,
      stars: 0,
      hotelType: "Tümü",
    });


  const load =
    useCallback(
      async () => {

        setLoading(true);
        setError("");


        const {
          data,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "get_public_hotel_marketplace",
            {
              p_destination:
                filters.destination ||
                null,

              p_guests:
                filters.adults +
                filters.children,

              p_star:
                filters.stars ||
                null,
            }
          );


        if (
          rpcError
        ) {

          setError(
            rpcError.message
          );

          setHotels([]);

        } else {

          setHotels(
            (data ??
              []) as Hotel[]
          );

        }


        setLoading(false);

      },
      [
        filters.destination,
        filters.adults,
        filters.children,
        filters.stars,
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

      const close =
        (
          event:
            MouseEvent
        ) => {

          const target =
            event.target as HTMLElement;


          if (
            !target.closest(
              "[data-hotel-search]"
            )
          ) {

            setOpenPanel(
              null
            );

          }

        };


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


  const hotelTypes =
    useMemo(
      () => [
        "Tümü",
        ...Array.from(
          new Set(
            hotels
              .map(
                (hotel) =>
                  hotel.hotel_type
              )
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(value)
              )
          )
        ),
      ],
      [
        hotels,
      ]
    );


  const filteredHotels =
    useMemo(
      () =>
        hotels.filter(
          (hotel) =>
            filters.hotelType ===
              "Tümü" ||
            hotel.hotel_type ===
              filters.hotelType
        ),
      [
        hotels,
        filters.hotelType,
      ]
    );


  function selectCheckIn(
    value: string
  ) {

    setFilters(
      (current) => ({
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

    setOpenPanel(null);

  }


  function searchHotels() {

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


    void load();


    window.setTimeout(
      () =>
        searchRef.current?.scrollIntoView({
          behavior:
            "smooth",
          block:
            "start",
        }),
      100
    );

  }


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* HERO */}

      <section className="relative min-h-[740px] overflow-visible border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=90")',
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/96 via-[#06101b]/78 to-[#06101b]/25" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/20" />


        <div className="relative mx-auto flex min-h-[660px] max-w-7xl flex-col justify-center px-5 py-16 lg:px-8">

          <div className="max-w-4xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300 backdrop-blur">

              <FaCheckCircle />

              Turobus Hotel Network

            </div>


            <h1 className="mt-6 text-5xl font-black leading-[.94] tracking-tight md:text-7xl">

              Otelini Bul.

              <span className="mt-2 block text-orange-500">
                Konaklamanı Akıllıca Seç.
              </span>

            </h1>


            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

              Hotel OS bağlantılı otelleri,
              oda seçeneklerini ve konaklama
              tercihlerini tek ekrandan keşfet.

            </p>

          </div>


          {/* SEARCH */}

          <div
            data-hotel-search
            className="relative z-30 mt-10 grid rounded-[22px] border border-white/15 bg-[#07131f]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl lg:grid-cols-[1.25fr_1fr_1fr_.85fr_auto]"
          >

            {/* DESTINATION */}

            <div className="relative border-b border-white/10 lg:border-b-0 lg:border-r">

              <button
                type="button"
                onClick={() =>
                  setOpenPanel(
                    openPanel ===
                      "destination"
                      ? null
                      : "destination"
                  )
                }
                className="flex min-h-[82px] w-full items-center justify-between px-5 text-left"
              >

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-slate-500">
                    <FaMapMarkerAlt />
                    Nereye?
                  </div>

                  <div className={`mt-2 text-sm font-black ${
                    filters.destination
                      ? "text-white"
                      : "text-slate-500"
                  }`}>
                    {filters.destination ||
                      "Şehir veya bölge seç"}
                  </div>

                </div>

                <FaChevronDown className="text-xs text-slate-600" />

              </button>


              {openPanel ===
                "destination" && (

                <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[330px] rounded-[22px] border border-white/10 bg-[#0b1724] p-3 shadow-2xl shadow-black/70">

                  <div className="px-2 py-2 text-xs font-black">
                    Popüler Destinasyonlar
                  </div>


                  {popularDestinations.map(
                    (destination) => (

                      <button
                        key={destination}
                        type="button"
                        onClick={() => {

                          setFilters({
                            ...filters,
                            destination,
                          });

                          setOpenPanel(
                            null
                          );

                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-black hover:bg-white/[.05]"
                      >

                        <span className="flex items-center gap-3">

                          <FaMapMarkerAlt className="text-orange-400" />

                          {destination}

                        </span>


                        {filters.destination ===
                          destination && (
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
                className="min-h-[82px] w-full px-5 text-left"
              >

                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                  <FaCalendarAlt />
                  Giriş
                </div>

                <div className="mt-2 text-sm font-black">
                  {formatDate(
                    filters.checkIn
                  )}
                </div>

              </button>


              {openPanel ===
                "checkIn" && (

                <div className="absolute left-0 top-[calc(100%+10px)] z-50">

                  <Calendar
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
                className="min-h-[82px] w-full px-5 text-left"
              >

                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                  <FaCalendarAlt />
                  Çıkış
                </div>

                <div className="mt-2 text-sm font-black">
                  {formatDate(
                    filters.checkOut
                  )}
                </div>

              </button>


              {openPanel ===
                "checkOut" && (

                <div className="absolute right-0 top-[calc(100%+10px)] z-50">

                  <Calendar
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
                className="min-h-[82px] w-full px-5 text-left"
              >

                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                  <FaUsers />
                  Misafir & Oda
                </div>

                <div className="mt-2 text-sm font-black">
                  {filters.adults + filters.children} Misafir · {filters.rooms} Oda
                </div>

              </button>


              {openPanel ===
                "guests" && (

                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] rounded-[22px] border border-white/10 bg-[#0b1724] p-4 shadow-2xl">

                  {[
                    [
                      "Yetişkin",
                      filters.adults,
                      (delta: number) =>
                        setFilters({
                          ...filters,
                          adults:
                            Math.max(
                              1,
                              filters.adults +
                                delta
                            ),
                        }),
                      FaUsers,
                    ],
                    [
                      "Çocuk",
                      filters.children,
                      (delta: number) =>
                        setFilters({
                          ...filters,
                          children:
                            Math.max(
                              0,
                              filters.children +
                                delta
                            ),
                        }),
                      FaChild,
                    ],
                    [
                      "Oda",
                      filters.rooms,
                      (delta: number) =>
                        setFilters({
                          ...filters,
                          rooms:
                            Math.max(
                              1,
                              filters.rooms +
                                delta
                            ),
                        }),
                      FaBed,
                    ],
                  ].map(
                    ([
                      label,
                      value,
                      update,
                      Icon,
                    ]) => {

                      const TypedIcon =
                        Icon as typeof FaUsers;

                      const updater =
                        update as (
                          delta: number
                        ) => void;


                      return (
                        <div
                          key={
                            String(label)
                          }
                          className="flex items-center justify-between border-b border-white/10 py-4 last:border-0"
                        >

                          <div className="flex items-center gap-3">

                            <TypedIcon className="text-orange-400" />

                            <strong className="text-sm">
                              {String(label)}
                            </strong>

                          </div>


                          <div className="flex items-center gap-3">

                            <button
                              type="button"
                              onClick={() =>
                                updater(-1)
                              }
                              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10"
                            >
                              <FaMinus />
                            </button>

                            <strong className="w-5 text-center">
                              {Number(value)}
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                updater(1)
                              }
                              className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500"
                            >
                              <FaPlus />
                            </button>

                          </div>

                        </div>
                      );

                    }
                  )}


                  <button
                    type="button"
                    onClick={() =>
                      setOpenPanel(
                        null
                      )
                    }
                    className="mt-3 w-full rounded-xl bg-white/[.05] py-3 text-xs font-black"
                  >
                    Tamam
                  </button>

                </div>

              )}

            </div>


            <div className="flex items-center p-3">

              <button
                type="button"
                onClick={
                  searchHotels
                }
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                <FaSearch />
                Otel Ara
              </button>

            </div>

          </div>


          {/* TRUST */}

          <div className="relative z-10 mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur sm:grid-cols-2 xl:grid-cols-4">

            {[
              [
                "Hotel OS Bağlantısı",
                FaHotel,
              ],
              [
                "Doğrulanmış Oteller",
                FaShieldAlt,
              ],
              [
                "Merkezi Oda Stoğu",
                FaBed,
              ],
              [
                "Güvenli Rezervasyon",
                FaCheckCircle,
              ],
            ].map(
              ([
                title,
                Icon,
              ]) => {

                const TypedIcon =
                  Icon as typeof FaHotel;


                return (
                  <div
                    key={
                      String(title)
                    }
                    className="flex items-center gap-3 px-5 py-4"
                  >

                    <TypedIcon className="text-orange-400" />

                    <strong className="text-xs">
                      {String(title)}
                    </strong>

                  </div>
                );

              }
            )}

          </div>

        </div>

      </section>


      {/* PREMIUM FEATURES */}

      <section className="px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="grid gap-4 md:grid-cols-4">

            {[
              [
                "Her Şey Dahil",
                "Resort & aile otelleri",
                FaSwimmingPool,
              ],
              [
                "Denize Sıfır",
                "Plaj erişimli oteller",
                FaHotel,
              ],
              [
                "Şehir Otelleri",
                "Merkezi konaklama",
                FaMapMarkedAlt,
              ],
              [
                "Wi-Fi & Konfor",
                "Doğrulanmış imkanlar",
                FaWifi,
              ],
            ].map(
              ([
                title,
                text,
                Icon,
              ]) => {

                const TypedIcon =
                  Icon as typeof FaHotel;


                return (
                  <div
                    key={
                      String(title)
                    }
                    className="rounded-[22px] border border-white/10 bg-[#0b1825] p-5"
                  >

                    <TypedIcon className="text-xl text-orange-400" />

                    <div className="mt-4 font-black">
                      {String(title)}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {String(text)}
                    </div>

                  </div>
                );

              }
            )}

          </div>

        </div>

      </section>


      {/* RESULTS */}

      <section
        ref={
          searchRef
        }
        className="scroll-mt-24 border-t border-white/10 bg-[#091522] px-5 py-16 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Turobus Hotel Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Konaklama Seçenekleri
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Hotel OS ağı kontrol ediliyor..."
                  : `${filteredHotels.length} otel bulundu`}
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              {[0,3,4,5].map(
                (star) => (

                  <button
                    key={star}
                    type="button"
                    onClick={() => {

                      setFilters({
                        ...filters,
                        stars:
                          star,
                      });

                      window.setTimeout(
                        () =>
                          void load(),
                        0
                      );

                    }}
                    className={`rounded-xl px-4 py-2.5 text-xs font-black ${
                      filters.stars ===
                      star
                        ? "bg-orange-500"
                        : "border border-white/10 bg-white/[.03] text-slate-400"
                    }`}
                  >
                    {star === 0
                      ? "Tümü"
                      : `${star}+ ★`}
                  </button>

                )
              )}


              <div className="relative">

                <select
                  value={
                    filters.hotelType
                  }
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      hotelType:
                        event.target.value,
                    })
                  }
                  className="appearance-none rounded-xl border border-white/10 bg-[#07111f] px-4 py-2.5 pr-9 text-xs font-black outline-none"
                >

                  {hotelTypes.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}

                </select>

                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

              </div>

            </div>

          </div>


          {error && (

            <div className="mt-5 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">

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

            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

              {[1,2,3,4,5,6].map(
                (item) => (
                  <div
                    key={item}
                    className="h-[450px] animate-pulse rounded-[28px] bg-white/[.04]"
                  />
                )
              )}

            </div>

          ) : filteredHotels.length ? (

            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

              {filteredHotels.map(
                (hotel) => (

                  <article
                    key={
                      hotel.id
                    }
                    className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-2xl"
                  >

                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">

                      {hotel.cover_image ? (

                        <img
                          src={
                            hotel.cover_image
                          }
                          alt={
                            hotel.name
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />

                      ) : (

                        <div className="flex h-full flex-col items-center justify-center text-slate-600">

                          <FaHotel className="text-4xl" />

                          <span className="mt-3 text-xs">
                            Otel görseli hazırlanıyor
                          </span>

                        </div>

                      )}


                      {hotel.verified && (

                        <div className="absolute left-4 top-4 rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">
                          DOĞRULANMIŞ
                        </div>

                      )}

                    </div>


                    <div className="p-5">

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <h3 className="text-xl font-black">
                            {hotel.name}
                          </h3>

                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">

                            <FaMapMarkerAlt className="text-orange-400" />

                            {[hotel.city, hotel.district]
                              .filter(Boolean)
                              .join(" · ")}

                          </div>

                        </div>


                        {hotel.star_rating ? (

                          <div className="flex gap-0.5 text-[10px] text-yellow-400">

                            {Array.from({
                              length:
                                Math.min(
                                  hotel.star_rating,
                                  5
                                ),
                            }).map(
                              (
                                _,
                                index
                              ) => (
                                <FaStar
                                  key={
                                    index
                                  }
                                />
                              )
                            )}

                          </div>

                        ) : null}

                      </div>


                      <div className="mt-5 flex flex-wrap gap-2">

                        {hotel.hotel_type && (

                          <span className="rounded-full bg-white/[.05] px-3 py-2 text-[9px] font-black text-slate-400">
                            {hotel.hotel_type}
                          </span>

                        )}

                        <span className="rounded-full bg-white/[.05] px-3 py-2 text-[9px] font-black text-slate-400">
                          {hotel.room_type_count} Oda Tipi
                        </span>

                        {hotel.max_occupancy >
                          0 && (

                          <span className="rounded-full bg-white/[.05] px-3 py-2 text-[9px] font-black text-slate-400">
                            {hotel.max_occupancy} Kişiye Kadar
                          </span>

                        )}

                      </div>


                      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">

                        <div>

                          <div className="text-[9px] uppercase text-slate-600">
                            Seçilen Konaklama
                          </div>

                          <div className="mt-1 text-xs font-black text-emerald-300">
                            Hotel OS Canlı Kaynak
                          </div>

                        </div>


                        <button
                          type="button"
                          onClick={() =>
                            alert(
                              `${hotel.name} detay ve oda seçim ekranı sonraki gerçek rezervasyon testinde açılacak.`
                            )
                          }
                          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-black transition hover:bg-orange-600"
                        >
                          Oteli İncele
                          <FaArrowRight />
                        </button>

                      </div>

                    </div>

                  </article>

                )
              )}

            </div>

          ) : (

            <>

              <div className="mt-8 rounded-[24px] border border-orange-500/15 bg-orange-500/[.04] p-5">

                <div className="font-black text-orange-300">
                  Tasarım Önizleme Portföyü
                </div>

                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Hotel OS üzerinden Marketplace&apos;e açılan gerçek oteller geldiğinde aşağıdaki önizleme kartları otomatik olarak yerini gerçek otel kayıtlarına bırakacak.
                </p>

              </div>


              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

                {previewHotels.map(
                  (hotel) => (

                    <article
                      key={
                        hotel.name
                      }
                      className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1825]"
                    >

                      <div className="relative aspect-[4/3] overflow-hidden">

                        <img
                          src={
                            hotel.image
                          }
                          alt={
                            hotel.name
                          }
                          className="h-full w-full object-cover"
                        />

                        <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-[8px] font-black text-orange-300 backdrop-blur">
                          TASARIM ÖNİZLEME
                        </div>

                      </div>


                      <div className="p-4">

                        <div className="flex gap-0.5 text-[9px] text-yellow-400">

                          {Array.from({
                            length:
                              hotel.stars,
                          }).map(
                            (
                              _,
                              index
                            ) => (
                              <FaStar
                                key={
                                  index
                                }
                              />
                            )
                          )}

                        </div>

                        <h3 className="mt-3 font-black">
                          {hotel.name}
                        </h3>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {hotel.location}
                        </div>


                        <div className="mt-4 flex gap-2">

                          <span className="rounded-full bg-white/[.05] px-2.5 py-1.5 text-[8px] text-slate-400">
                            {hotel.type}
                          </span>

                          <span className="rounded-full bg-white/[.05] px-2.5 py-1.5 text-[8px] text-slate-400">
                            {hotel.feature}
                          </span>

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>

            </>

          )}

        </div>

      </section>


      {/* WHY */}

      <section className="border-t border-white/10 px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.8fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Turobus Hotel
            </div>

            <h2 className="mt-2 max-w-2xl text-3xl font-black">
              Sadece otel listeleyen değil, otelle gerçekten konuşan bir Marketplace.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Hotel OS Bağlantısı",
                  "Otel bilgisi doğrudan operasyon sisteminden gelir.",
                ],
                [
                  "Oda Tipi Ağı",
                  "Oda kapasiteleri merkezi Network yapısında tutulur.",
                ],
                [
                  "Doğrulanmış Portföy",
                  "Marketplace'e yalnızca yayınlanan kaynaklar çıkar.",
                ],
                [
                  "Tek Ekosistem",
                  "Otel, villa ve turlar aynı Turobus altyapısında birleşir.",
                ],
              ].map(
                ([
                  title,
                  description,
                ]) => (

                  <div
                    key={
                      title
                    }
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
              TUROBUS HOTEL NETWORK
            </div>

            <div className="mt-4 text-4xl font-black">
              Otel.
              <br />
              Oda.
              <br />
              Operasyon.
              <br />
              Marketplace.
            </div>

            <p className="mt-6 text-sm leading-7 text-slate-400">
              Hotel OS'ta yönetilen kaynaklar merkezi Turobus Network üzerinden satış kanalına bağlanır.
            </p>

          </div>

        </div>

      </section>


      <Footer />

    </main>
  );
}
