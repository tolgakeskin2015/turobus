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
  FaFilter,
  FaHotel,
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


type HotelRoom = {
  id: string;
  name: string;
  currency: string;
  max_adults: string | null;
  max_children: string | null;
  max_occupancy: string | null;
  total_rooms: string | null;
  bed_type: string | null;
  stop_sell: string | null;
};


type HotelDetail = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  star_rating: string | null;
  hotel_type: string | null;
  currency: string;
  verified: boolean;
  cover_image: string | null;
  rooms: HotelRoom[];
};


type OpenPanel =
  | "destination"
  | "checkIn"
  | "checkOut"
  | "guests"
  | null;


type SortMode =
  | "recommended"
  | "stars"
  | "name";


const previewHotels = [
  {
    name: "Azure Bay Resort",
    location: "Ölüdeniz · Fethiye",
    stars: 5,
    type: "Resort",
    feature: "Her Şey Dahil",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=90",
  },
  {
    name: "Marina Collection",
    location: "Yalıkavak · Bodrum",
    stars: 5,
    type: "Luxury Hotel",
    feature: "Denize Sıfır",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=90",
  },
  {
    name: "Stone Boutique",
    location: "Kaş · Antalya",
    stars: 4,
    type: "Boutique",
    feature: "Kahvaltı Dahil",
    image:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=90",
  },
];


const destinations = [
  {
    city: "Fethiye",
    region: "Muğla",
    detail: "Ölüdeniz · Çalış · Hisarönü",
  },
  {
    city: "Antalya",
    region: "Antalya",
    detail: "Lara · Belek · Kemer",
  },
  {
    city: "Bodrum",
    region: "Muğla",
    detail: "Yalıkavak · Türkbükü · Gümbet",
  },
  {
    city: "Marmaris",
    region: "Muğla",
    detail: "İçmeler · Turunç · Siteler",
  },
  {
    city: "İstanbul",
    region: "İstanbul",
    detail: "Taksim · Sultanahmet · Beşiktaş",
  },
  {
    city: "Kapadokya",
    region: "Nevşehir",
    detail: "Göreme · Uçhisar · Ürgüp",
  },
];


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
    date: Date
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
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[.05] hover:text-white"
        >
          <FaChevronLeft />
        </button>


        <div className="text-sm font-black capitalize">
          {label}
        </div>


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
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[.05] hover:text-white"
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
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
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

  const resultsRef =
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
    selectedHotel,
    setSelectedHotel,
  ] =
    useState<HotelDetail | null>(
      null
    );


  const [
    detailLoading,
    setDetailLoading,
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
      adults: 2,
      children: 0,
      rooms: 1,
      stars: 0,
      hotelType: "Tümü",
      verifiedOnly: false,
    });


  const load =
    useCallback(
      async (
        destination =
          filters.destination,
        star =
          filters.stars,
        adults =
          filters.adults,
        children =
          filters.children
      ) => {

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
                destination ||
                null,

              p_guests:
                adults +
                children,

              p_star:
                star ||
                null,
            }
          );


        if (rpcError) {

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
        filters.stars,
        filters.adults,
        filters.children,
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

      function handleOutside(
        event:
          MouseEvent
      ) {

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

      }


      document.addEventListener(
        "mousedown",
        handleOutside
      );


      return () =>
        document.removeEventListener(
          "mousedown",
          handleOutside
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


  const resultHotels =
    useMemo(
      () => {

        let result =
          hotels.filter(
            (hotel) => {

              const typeMatch =
                filters.hotelType ===
                  "Tümü" ||
                hotel.hotel_type ===
                  filters.hotelType;


              const verifiedMatch =
                !filters.verifiedOnly ||
                hotel.verified;


              return (
                typeMatch &&
                verifiedMatch
              );

            }
          );


        if (
          sort === "stars"
        ) {

          result =
            [...result].sort(
              (
                first,
                second
              ) =>
                Number(
                  second.star_rating ??
                    0
                ) -
                Number(
                  first.star_rating ??
                    0
                )
            );

        }


        if (
          sort === "name"
        ) {

          result =
            [...result].sort(
              (
                first,
                second
              ) =>
                first.name.localeCompare(
                  second.name,
                  "tr"
                )
            );

        }


        if (
          sort ===
          "recommended"
        ) {

          result =
            [...result].sort(
              (
                first,
                second
              ) => {

                const firstScore =
                  Number(
                    first.verified
                  ) *
                    10 +
                  Number(
                    first.star_rating ??
                      0
                  ) *
                    2 +
                  Number(
                    first.room_type_count ??
                      0
                  );


                const secondScore =
                  Number(
                    second.verified
                  ) *
                    10 +
                  Number(
                    second.star_rating ??
                      0
                  ) *
                    2 +
                  Number(
                    second.room_type_count ??
                      0
                  );


                return (
                  secondScore -
                  firstScore
                );

              }
            );

        }


        return result;

      },
      [
        hotels,
        filters.hotelType,
        filters.verifiedOnly,
        sort,
      ]
    );


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


  async function searchHotels() {

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
      120
    );

  }


  async function selectDestination(
    city: string
  ) {

    setFilters(
      (
        current
      ) => ({
        ...current,
        destination:
          city,
      })
    );


    setOpenPanel(null);

    await load(
      city
    );

  }


  async function setStarFilter(
    stars: number
  ) {

    setFilters(
      (
        current
      ) => ({
        ...current,
        stars,
      })
    );


    await load(
      filters.destination,
      stars
    );

  }


  async function openHotelDetail(
    hotelId: string
  ) {

    setDetailLoading(
      true
    );

    setError("");


    const {
      data,
      error:
        detailError,
    } =
      await supabase.rpc(
        "get_public_hotel_marketplace_detail",
        {
          p_resource_id:
            hotelId,
        }
      );


    if (detailError) {

      setError(
        detailError.message
      );

    } else {

      setSelectedHotel(
        data as HotelDetail
      );

    }


    setDetailLoading(
      false
    );

  }


  function clearFilters() {

    setFilters({
      destination: "",
      checkIn: "",
      checkOut: "",
      adults: 2,
      children: 0,
      rooms: 1,
      stars: 0,
      hotelType: "Tümü",
      verifiedOnly: false,
    });

    setSort(
      "recommended"
    );

    void load(
      "",
      0,
      2,
      0
    );

  }


  const searchSummary =
    [
      filters.destination ||
        "Tüm destinasyonlar",

      filters.checkIn &&
      filters.checkOut
        ? `${formatDate(
            filters.checkIn
          )} → ${formatDate(
            filters.checkOut
          )}`
        : "Tarih seçilmedi",

      `${filters.adults +
        filters.children} misafir`,

      `${filters.rooms} oda`,
    ].join(" · ");


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* ====================================================
          HERO
      ==================================================== */}

      <section className="relative overflow-visible border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=92")',
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/88 to-[#06101b]/35" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/30" />


        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pb-20 lg:pt-24">

          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.75fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300 backdrop-blur-xl">

                <FaCheckCircle />

                Turobus Hotel Network

              </div>


              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.93] tracking-tight md:text-7xl">

                Sadece Otel Arama.

                <span className="mt-3 block text-orange-500">
                  Doğru Konaklamayı Bul.
                </span>

              </h1>


              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Hotel OS bağlantılı
                doğrulanmış tesisler,
                oda tipleri ve merkezi
                konaklama altyapısı tek
                Turobus deneyiminde.

              </p>

            </div>


            <div className="hidden lg:block">

              <div className="ml-auto max-w-[420px] rounded-[30px] border border-white/15 bg-black/30 p-6 backdrop-blur-2xl">

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
                  Turobus Farkı
                </div>

                <div className="mt-4 text-3xl font-black">
                  Otelle doğrudan konuşan Marketplace.
                </div>

                <div className="mt-6 space-y-3">

                  {[
                    "Hotel OS bağlantılı tesis",
                    "Merkezi oda tipi altyapısı",
                    "Doğrulanmış portföy",
                    "Tek operasyon ekosistemi",
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


          {/* ====================================================
              SEARCH ENGINE
          ==================================================== */}

          <div
            data-hotel-search
            className="relative z-40 mt-10 grid rounded-[24px] border border-white/15 bg-[#081522]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid-cols-[1.25fr_1fr_1fr_.95fr_auto]"
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
                className="flex min-h-[86px] w-full items-center justify-between gap-3 px-5 text-left"
              >

                <div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                    <FaMapMarkerAlt />
                    Destinasyon
                  </div>

                  <div className={`mt-2 text-sm font-black ${
                    filters.destination
                      ? "text-white"
                      : "text-slate-500"
                  }`}>
                    {filters.destination ||
                      "Nerede kalmak istersiniz?"}
                  </div>

                </div>

                <FaChevronDown className="text-xs text-slate-600" />

              </button>


              {openPanel ===
                "destination" && (

                <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[390px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[24px] border border-white/10 bg-[#0c1825] shadow-2xl shadow-black/70">

                  <div className="border-b border-white/10 p-4">

                    <div className="text-sm font-black">
                      Popüler Destinasyonlar
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500">
                      Şehir veya tatil bölgesi seçin
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

                            <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
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
                className="min-h-[86px] w-full px-5 text-left"
              >

                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                  <FaUsers />
                  Misafir & Oda
                </div>

                <div className="mt-2 text-sm font-black">
                  {filters.adults +
                    filters.children} Misafir · {filters.rooms} Oda
                </div>

              </button>


              {openPanel ===
                "guests" && (

                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[330px] rounded-[24px] border border-white/10 bg-[#0c1825] p-4 shadow-2xl shadow-black/70">

                  {[
                    {
                      label:
                        "Yetişkin",
                      subtitle:
                        "18 yaş ve üzeri",
                      value:
                        filters.adults,
                      icon:
                        FaUsers,
                      min:
                        1,
                      update:
                        (
                          delta:
                            number
                        ) =>
                          setFilters({
                            ...filters,
                            adults:
                              Math.max(
                                1,
                                filters.adults +
                                  delta
                              ),
                          }),
                    },
                    {
                      label:
                        "Çocuk",
                      subtitle:
                        "0-17 yaş",
                      value:
                        filters.children,
                      icon:
                        FaChild,
                      min:
                        0,
                      update:
                        (
                          delta:
                            number
                        ) =>
                          setFilters({
                            ...filters,
                            children:
                              Math.max(
                                0,
                                filters.children +
                                  delta
                              ),
                          }),
                    },
                    {
                      label:
                        "Oda",
                      subtitle:
                        "Rezervasyon oda sayısı",
                      value:
                        filters.rooms,
                      icon:
                        FaBed,
                      min:
                        1,
                      update:
                        (
                          delta:
                            number
                        ) =>
                          setFilters({
                            ...filters,
                            rooms:
                              Math.max(
                                1,
                                filters.rooms +
                                  delta
                              ),
                          }),
                    },
                  ].map(
                    (item) => {

                      const Icon =
                        item.icon;


                      return (
                        <div
                          key={
                            item.label
                          }
                          className="flex items-center justify-between gap-4 border-b border-white/10 py-4 last:border-0"
                        >

                          <div className="flex items-center gap-3">

                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                              <Icon />
                            </div>

                            <div>

                              <div className="text-sm font-black">
                                {item.label}
                              </div>

                              <div className="mt-0.5 text-[9px] text-slate-600">
                                {item.subtitle}
                              </div>

                            </div>

                          </div>


                          <div className="flex items-center gap-3">

                            <button
                              type="button"
                              disabled={
                                item.value <=
                                item.min
                              }
                              onClick={() =>
                                item.update(
                                  -1
                                )
                              }
                              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 disabled:opacity-30"
                            >
                              <FaMinus />
                            </button>

                            <strong className="w-5 text-center">
                              {item.value}
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                item.update(
                                  1
                                )
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
                    className="mt-3 w-full rounded-xl bg-white/[.06] py-3 text-xs font-black transition hover:bg-white/[.1]"
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
                  void searchHotels()
                }
                className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                <FaSearch />
                Otel Ara
              </button>

            </div>

          </div>


          {/* SEARCH TRUST */}

          <div className="relative z-10 mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              "Doğrulanmış Otel",
              "Hotel OS Bağlantısı",
              "Merkezi Oda Tipleri",
              "Turobus Güvencesi",
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


      {/* ====================================================
          DISCOVERY
      ==================================================== */}

      <section className="px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Konaklamanı Şekillendir
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Nasıl Bir Otel Arıyorsun?
              </h2>

            </div>

          </div>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              {
                title:
                  "5 Yıldızlı",
                text:
                  "Üst segment konaklama",
                stars:
                  5,
              },
              {
                title:
                  "4+ Yıldız",
                text:
                  "Konforlu seçkin tesisler",
                stars:
                  4,
              },
              {
                title:
                  "3+ Yıldız",
                text:
                  "Fiyat / performans",
                stars:
                  3,
              },
              {
                title:
                  "Doğrulanmış",
                text:
                  "Turobus doğrulamalı tesisler",
                stars:
                  null,
              },
            ].map(
              (
                item
              ) => (

                <button
                  key={
                    item.title
                  }
                  type="button"
                  onClick={() => {

                    if (
                      item.stars ===
                      null
                    ) {

                      setFilters({
                        ...filters,
                        verifiedOnly:
                          !filters.verifiedOnly,
                      });

                    } else {

                      void setStarFilter(
                        item.stars
                      );

                    }

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
                      <FaHotel />
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


      {/* ====================================================
          RESULTS
      ==================================================== */}

      <section
        ref={
          resultsRef
        }
        className="scroll-mt-24 border-t border-white/10 bg-[#091522] px-5 py-14 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          {/* RESULT HEADER */}

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Canlı Hotel Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Konaklama Seçenekleri
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Hotel Network kontrol ediliyor..."
                  : `${resultHotels.length} uygun otel bulundu`}
              </p>

            </div>


            <div className="flex flex-wrap items-center gap-2">

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
                Filtreler
              </button>


              <div className="relative">

                <select
                  value={
                    sort
                  }
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

                  <option value="stars">
                    Yıldız: Yüksek
                  </option>

                  <option value="name">
                    İsme Göre
                  </option>

                </select>

                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

              </div>

            </div>

          </div>


          {/* SEARCH SUMMARY */}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-[#07111f] px-5 py-4">

            <div>

              <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                Arama Özeti
              </div>

              <div className="mt-1 text-xs font-black text-slate-300">
                {searchSummary}
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

            {/* FILTER SIDEBAR */}

            <aside className="hidden lg:block">

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#07111f] p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-black">
                    Otel Filtreleri
                  </h3>

                  <FaFilter className="text-slate-600" />

                </div>


                <div className="mt-5">

                  <div className="text-[9px] font-black uppercase text-slate-600">
                    Yıldız
                  </div>


                  <div className="mt-3 space-y-1">

                    {[0,5,4,3].map(
                      (
                        star
                      ) => (

                        <button
                          key={
                            star
                          }
                          type="button"
                          onClick={() =>
                            void setStarFilter(
                              star
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-black ${
                            filters.stars ===
                            star
                              ? "bg-orange-500 text-white"
                              : "text-slate-400 hover:bg-white/[.04]"
                          }`}
                        >

                          <span>
                            {star ===
                            0
                              ? "Tüm Yıldızlar"
                              : `${star}+ Yıldız`}
                          </span>


                          {star >
                            0 && (
                            <FaStar className="text-yellow-400" />
                          )}

                        </button>

                      )
                    )}

                  </div>

                </div>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Tesis Tipi
                  </span>


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
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-3 py-3 text-xs font-bold outline-none"
                  >

                    {hotelTypes.map(
                      (
                        type
                      ) => (
                        <option
                          key={
                            type
                          }
                          value={
                            type
                          }
                        >
                          {type}
                        </option>
                      )
                    )}

                  </select>

                </label>


                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      verifiedOnly:
                        !filters.verifiedOnly,
                    })
                  }
                  className={`mt-5 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-xs font-black ${
                    filters.verifiedOnly
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 text-slate-400"
                  }`}
                >

                  <span>
                    Sadece Doğrulanmış
                  </span>

                  {filters.verifiedOnly && (
                    <FaCheck />
                  )}

                </button>

              </div>

            </aside>


            {/* HOTEL RESULTS */}

            <div>

              {error && (

                <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">

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


              {loading ? (

                <div className="space-y-5">

                  {[1,2,3].map(
                    (
                      item
                    ) => (

                      <div
                        key={
                          item
                        }
                        className="h-[290px] animate-pulse rounded-[28px] bg-white/[.04]"
                      />

                    )
                  )}

                </div>

              ) : resultHotels.length >
                0 ? (

                <div className="space-y-5">

                  {resultHotels.map(
                    (
                      hotel
                    ) => (

                      <article
                        key={
                          hotel.id
                        }
                        className="group grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:border-orange-500/30 hover:shadow-2xl hover:shadow-black/30 md:grid-cols-[300px_1fr]"
                      >

                        {/* PHOTO */}

                        <div className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">

                          {hotel.cover_image ? (

                            <img
                              src={
                                hotel.cover_image
                              }
                              alt={
                                hotel.name
                              }
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />

                          ) : (

                            <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-slate-600">

                              <FaHotel className="text-5xl" />

                              <div className="mt-3 text-xs">
                                Otel görseli hazırlanıyor
                              </div>

                            </div>

                          )}


                          {hotel.verified && (

                            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">
                              <FaCheckCircle />
                              DOĞRULANMIŞ
                            </div>

                          )}

                        </div>


                        {/* HOTEL INFO */}

                        <div className="flex min-w-0 flex-col p-5 md:p-6">

                          <div className="flex flex-wrap items-start justify-between gap-4">

                            <div className="min-w-0">

                              <div className="flex items-center gap-2">

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


                                {hotel.hotel_type && (

                                  <span className="rounded-full bg-white/[.05] px-2.5 py-1 text-[8px] font-black uppercase text-slate-400">
                                    {hotel.hotel_type}
                                  </span>

                                )}

                              </div>


                              <h3 className="mt-3 text-2xl font-black">
                                {hotel.name}
                              </h3>


                              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">

                                <FaMapMarkerAlt className="text-orange-400" />

                                {[hotel.city, hotel.district]
                                  .filter(Boolean)
                                  .join(" · ")}

                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Kaynak
                              </div>

                              <div className="mt-1 text-xs font-black text-emerald-300">
                                Hotel OS
                              </div>

                            </div>

                          </div>


                          <div className="mt-5 grid gap-2 sm:grid-cols-3">

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Oda Tipi
                              </div>

                              <div className="mt-1 font-black">
                                {hotel.room_type_count}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Kapasite
                              </div>

                              <div className="mt-1 font-black">
                                {hotel.max_occupancy >
                                0
                                  ? `${hotel.max_occupancy} kişiye kadar`
                                  : "Oda bazlı"}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Durum
                              </div>

                              <div className="mt-1 font-black text-emerald-300">
                                Marketplace
                              </div>

                            </div>

                          </div>


                          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">

                            <div>

                              <div className="text-[9px] font-black uppercase text-slate-600">
                                Konaklama
                              </div>

                              <div className="mt-1 text-xs font-black text-slate-300">
                                {filters.checkIn &&
                                filters.checkOut
                                  ? `${formatDate(
                                      filters.checkIn
                                    )} → ${formatDate(
                                      filters.checkOut
                                    )}`
                                  : "Tarih seçerek oda seçeneklerini incele"}
                              </div>

                            </div>


                            <button
                              type="button"
                              disabled={
                                detailLoading
                              }
                              onClick={() =>
                                void openHotelDetail(
                                  hotel.id
                                )
                              }
                              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black transition hover:bg-orange-600 disabled:opacity-50"
                            >
                              {detailLoading
                                ? "Açılıyor..."
                                : "Oda ve Otel Detayı"}
                              <FaArrowRight />
                            </button>

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
                      Hotel OS üzerinden Marketplace&apos;e açılan gerçek oteller geldikçe aşağıdaki önizleme tesisleri otomatik olarak kaldırılır.
                    </p>

                  </div>


                  <div className="mt-5 grid gap-5 md:grid-cols-3">

                    {previewHotels.map(
                      (
                        hotel
                      ) => (

                        <article
                          key={
                            hotel.name
                          }
                          className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1825]"
                        >

                          <div className="relative aspect-[4/3] overflow-hidden">

                            <img
                              src={
                                hotel.image
                              }
                              alt={
                                hotel.name
                              }
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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


                            <h3 className="mt-3 text-lg font-black">
                              {hotel.name}
                            </h3>


                            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                              <FaMapMarkerAlt />
                              {hotel.location}
                            </div>


                            <div className="mt-4 flex gap-2">

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-[8px] text-slate-400">
                                {hotel.type}
                              </span>

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-[8px] text-slate-400">
                                {hotel.feature}
                              </span>

                            </div>


                            <div className="mt-4 border-t border-white/10 pt-4 text-[10px] font-black text-slate-600">
                              Gerçek satışa açık değildir
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


      {/* ====================================================
          NETWORK
      ==================================================== */}

      <section className="border-t border-white/10 px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.8fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Turobus Hotel Network
            </div>

            <h2 className="mt-2 max-w-2xl text-3xl font-black">
              Listeleme sitesi değil. Gerçek otel işletim sistemine bağlı pazar yeri.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Hotel OS Entegrasyonu",
                  "Tesis ve oda tipleri merkezi operasyon kaynağından gelir.",
                ],
                [
                  "Marketplace Kontrolü",
                  "Sadece satışa açılan oteller halka açık katalogda görünür.",
                ],
                [
                  "Oda Tipi Yapısı",
                  "Oda kapasitesi ve oda türleri gerçek Hotel OS verisine bağlıdır.",
                ],
                [
                  "Tek Turobus Ekosistemi",
                  "Otel, villa ve turlar aynı altyapıda birbirine bağlanır.",
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
              TUROBUS HOTEL
            </div>

            <div className="mt-4 text-4xl font-black leading-tight">
              Tesis.
              <br />
              Oda.
              <br />
              Stok.
              <br />
              Operasyon.
            </div>

            <p className="mt-6 text-sm leading-7 text-slate-400">
              Turobus&apos;un otel tarafı yalnızca vitrin değil; Hotel OS ve ortak Network altyapısının satış yüzüdür.
            </p>

          </div>

        </div>

      </section>


      {/* ====================================================
          HOTEL DETAIL MODAL
      ==================================================== */}

      {selectedHotel && (

        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/80 p-3 backdrop-blur-md md:p-6">

          <div className="mx-auto max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#091522] shadow-2xl">

            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  {selectedHotel.verified && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">
                      <FaCheckCircle />
                      DOĞRULANMIŞ
                    </span>
                  )}


                  {selectedHotel.star_rating &&
                    Number(
                      selectedHotel.star_rating
                    ) >
                      0 && (

                    <div className="flex gap-0.5 text-[10px] text-yellow-400">

                      {Array.from({
                        length:
                          Math.min(
                            Number(
                              selectedHotel.star_rating
                            ),
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

                  )}

                </div>


                <h2 className="mt-3 text-3xl font-black">
                  {selectedHotel.name}
                </h2>


                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <FaMapMarkerAlt className="text-orange-400" />

                  {[selectedHotel.city, selectedHotel.district]
                    .filter(Boolean)
                    .join(" · ")}
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelectedHotel(
                    null
                  )
                }
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[.05] hover:text-white"
              >
                <FaTimes />
              </button>

            </header>


            <div className="grid lg:grid-cols-[.75fr_1.25fr]">

              <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">

                <div className="overflow-hidden rounded-[24px] bg-slate-900">

                  {selectedHotel.cover_image ? (

                    <img
                      src={
                        selectedHotel.cover_image
                      }
                      alt={
                        selectedHotel.name
                      }
                      className="aspect-[4/3] h-full w-full object-cover"
                    />

                  ) : (

                    <div className="flex aspect-[4/3] flex-col items-center justify-center text-slate-600">

                      <FaHotel className="text-5xl" />

                      <div className="mt-3 text-xs">
                        Otel görseli hazırlanıyor
                      </div>

                    </div>

                  )}

                </div>


                <div className="mt-4 grid grid-cols-2 gap-2">

                  <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                    <div className="text-[9px] font-black uppercase text-slate-600">
                      Tesis Tipi
                    </div>

                    <div className="mt-1 text-sm font-black">
                      {selectedHotel.hotel_type ||
                        "Otel"}
                    </div>

                  </div>


                  <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                    <div className="text-[9px] font-black uppercase text-slate-600">
                      Oda Tipi
                    </div>

                    <div className="mt-1 text-sm font-black">
                      {selectedHotel.rooms?.length ??
                        0}
                    </div>

                  </div>

                </div>


                <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/[.04] p-4">

                  <div className="flex items-start gap-3">

                    <FaShieldAlt className="mt-0.5 text-emerald-300" />

                    <div>

                      <div className="text-xs font-black text-emerald-300">
                        Hotel OS Kaynağı
                      </div>

                      <p className="mt-1 text-[10px] leading-5 text-slate-500">
                        Buradaki oda türleri Turobus Hotel Network üzerinden gerçek otel kaynağına bağlıdır.
                      </p>

                    </div>

                  </div>

                </div>

              </div>


              <div className="p-5 md:p-6">

                <div>

                  <div className="text-[10px] font-black uppercase tracking-[.15em] text-orange-400">
                    Oda Seçenekleri
                  </div>

                  <h3 className="mt-2 text-2xl font-black">
                    Konaklama Tipini Seç
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    Oda stokları Hotel OS&apos;ta yönetilir. Fiyat ve tarih bazlı canlı rezervasyon zinciri bir sonraki gerçek Hotel Marketplace rezervasyon adımına bağlanacaktır.
                  </p>

                </div>


                {selectedHotel.rooms &&
                selectedHotel.rooms.length >
                  0 ? (

                  <div className="mt-6 space-y-3">

                    {selectedHotel.rooms.map(
                      (
                        room
                      ) => {

                        const stopSell =
                          room.stop_sell ===
                          "true";


                        return (
                          <div
                            key={
                              room.id
                            }
                            className="rounded-[20px] border border-white/10 bg-[#07111f] p-4"
                          >

                            <div className="flex flex-wrap items-start justify-between gap-4">

                              <div>

                                <div className="flex items-center gap-2">

                                  <FaBed className="text-orange-400" />

                                  <h4 className="font-black">
                                    {room.name}
                                  </h4>

                                </div>


                                <div className="mt-3 flex flex-wrap gap-2">

                                  {room.bed_type && (
                                    <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-[9px] text-slate-400">
                                      {room.bed_type}
                                    </span>
                                  )}

                                  {room.max_occupancy && (
                                    <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-[9px] text-slate-400">
                                      Maks. {room.max_occupancy} kişi
                                    </span>
                                  )}

                                  {room.max_adults && (
                                    <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-[9px] text-slate-400">
                                      {room.max_adults} yetişkin
                                    </span>
                                  )}

                                  {room.max_children && (
                                    <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-[9px] text-slate-400">
                                      {room.max_children} çocuk
                                    </span>
                                  )}

                                </div>

                              </div>


                              <div className={`rounded-full px-3 py-1.5 text-[8px] font-black ${
                                stopSell
                                  ? "bg-red-500/10 text-red-300"
                                  : "bg-emerald-500/10 text-emerald-300"
                              }`}>
                                {stopSell
                                  ? "SATIŞ KAPALI"
                                  : "AKTİF ODA TİPİ"}
                              </div>

                            </div>

                          </div>
                        );

                      }
                    )}

                  </div>

                ) : (

                  <div className="mt-6 rounded-[22px] border border-dashed border-white/10 p-10 text-center">

                    <FaBed className="mx-auto text-3xl text-slate-700" />

                    <div className="mt-4 font-black">
                      Henüz oda tipi yayınlanmamış
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Hotel OS üzerinden aktif oda tipi geldiğinde burada otomatik gösterilecek.
                    </p>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      )}


      {/* MOBILE FILTER */}

      {mobileFilters && (

        <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-md">

          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#091522] p-5">

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-black">
                Otel Filtreleri
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


            <div className="mt-5">

              <div className="text-[9px] font-black uppercase text-slate-600">
                Yıldız
              </div>


              <div className="mt-3 grid grid-cols-2 gap-2">

                {[0,3,4,5].map(
                  (
                    star
                  ) => (

                    <button
                      key={
                        star
                      }
                      type="button"
                      onClick={() =>
                        void setStarFilter(
                          star
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-xs font-black ${
                        filters.stars ===
                        star
                          ? "border-orange-500 bg-orange-500"
                          : "border-white/10"
                      }`}
                    >
                      {star ===
                      0
                        ? "Tümü"
                        : `${star}+ Yıldız`}
                    </button>

                  )
                )}

              </div>

            </div>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Tesis Tipi
              </span>

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
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              >

                {hotelTypes.map(
                  (
                    type
                  ) => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {type}
                    </option>
                  )
                )}

              </select>

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
