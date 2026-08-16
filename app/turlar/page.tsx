"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import FavoriteButton from "@/components/favorites/FavoriteButton";

import { supabase } from "@/lib/supabase";

import {
  FaArrowRight,
  FaBusAlt,
  FaCalendarAlt,
  FaCheck,
  FaChevronDown,
  FaFilter,
  FaGlobeEurope,
  FaMapMarkerAlt,
  FaPlaneDeparture,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaTimes,
  FaUsers,
} from "react-icons/fa";


type Tour = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  city: string;
  district: string | null;
  category: string | null;
  duration: string | null;
  adult_price: number;
  old_price: number;
  cover_image: string | null;
  rating: number | null;
  review_count: number | null;
  bestseller: boolean;
  early_booking: boolean;
  featured: boolean;
  status: string;
  created_at: string;
};


type TransportMode =
  | "bus"
  | "flight";


type ScopeMode =
  | "all"
  | "domestic"
  | "international";


type SortMode =
  | "recommended"
  | "priceAsc"
  | "priceDesc"
  | "rating"
  | "newest";


const busKeywords = [
  "otobüs",
  "otobus",
  "otobüslü",
  "otobuslu",
  "karayolu",
  "coach",
];


const flightKeywords = [
  "uçak",
  "ucak",
  "uçaklı",
  "ucakli",
  "havayolu",
  "flight",
];


const excludedKeywords = [
  "paket",
  "balayı",
  "balayi",
  "honeymoon",
  "aktivite paketi",
  "otel paketi",
  "tatil paketi",
];


const internationalKeywords = [
  "yurt dışı",
  "yurtdışı",
  "yurtdisi",
  "balkan",
  "dubai",
  "bakü",
  "baku",
  "avrupa",
  "paris",
  "roma",
  "prag",
  "budapeşte",
  "italya",
  "fransa",
  "ispanya",
  "yunanistan",
  "azerbaycan",
  "gürcistan",
  "mısır",
  "tayland",
  "japonya",
  "kore",
];


const domesticCities = [
  "Fethiye",
  "Antalya",
  "Muğla",
  "Bodrum",
  "Marmaris",
  "İzmir",
  "Çeşme",
  "Kapadokya",
  "Nevşehir",
  "Pamukkale",
  "Denizli",
  "İstanbul",
  "Bursa",
  "Ankara",
  "Trabzon",
  "Rize",
  "Mardin",
  "Şanlıurfa",
  "Çanakkale",
  "Edirne",
];


const previewTours = [
  {
    title:
      "Kapadokya Kültür Turu",
    route:
      "İstanbul → Kapadokya",
    scope:
      "Yurt İçi",
    transport:
      "Otobüslü",
    duration:
      "2 Gece 3 Gün",
    price:
      8990,
    image:
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1400&q=90",
  },
  {
    title:
      "Karadeniz Yaylaları",
    route:
      "Ankara → Trabzon · Rize",
    scope:
      "Yurt İçi",
    transport:
      "Otobüslü",
    duration:
      "4 Gece 5 Gün",
    price:
      13990,
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=90",
  },
  {
    title:
      "Balkanlar Büyük Turu",
    route:
      "İstanbul → Balkanlar",
    scope:
      "Yurt Dışı",
    transport:
      "Uçaklı",
    duration:
      "6 Gece 7 Gün",
    price:
      32900,
    image:
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1400&q=90",
  },
  {
    title:
      "Dubai Şehir Turu",
    route:
      "İstanbul → Dubai",
    scope:
      "Yurt Dışı",
    transport:
      "Uçaklı",
    duration:
      "4 Gece 5 Gün",
    price:
      36900,
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=90",
  },
];


function normalize(
  value:
    | string
    | null
    | undefined
) {

  return (
    value ?? ""
  )
    .toLocaleLowerCase(
      "tr-TR"
    )
    .normalize("NFD")
    .replace(
      /\p{Diacritic}/gu,
      ""
    );

}


function tourText(
  tour: Tour
) {

  return [
    tour.title,
    tour.short_description,
    tour.city,
    tour.district,
    tour.category,
    tour.duration,
  ]
    .filter(Boolean)
    .join(" ");

}


function containsAny(
  text: string,
  keywords: string[]
) {

  const normalized =
    normalize(text);


  return keywords.some(
    (keyword) =>
      normalized.includes(
        normalize(keyword)
      )
  );

}


function getTransport(
  tour: Tour
):
  | TransportMode
  | null {

  const text =
    tourText(tour);


  if (
    containsAny(
      text,
      flightKeywords
    )
  ) {
    return "flight";
  }


  if (
    containsAny(
      text,
      busKeywords
    )
  ) {
    return "bus";
  }


  return null;

}


function isExcluded(
  tour: Tour
) {

  return containsAny(
    tourText(tour),
    excludedKeywords
  );

}


function getScope(
  tour: Tour
):
  | "domestic"
  | "international" {

  const text =
    tourText(tour);


  if (
    containsAny(
      text,
      internationalKeywords
    )
  ) {
    return "international";
  }


  const domestic =
    domesticCities.some(
      (city) =>
        normalize(
          tour.city
        ).includes(
          normalize(city)
        ) ||
        normalize(
          tour.title
        ).includes(
          normalize(city)
        )
    );


  return domestic
    ? "domestic"
    : "international";

}


function scopeLabel(
  value:
    | "domestic"
    | "international"
) {

  return value ===
    "domestic"
    ? "Yurt İçi"
    : "Yurt Dışı";

}


function transportLabel(
  value: TransportMode
) {

  return value ===
    "bus"
    ? "Otobüslü"
    : "Uçaklı";

}


export default function ToursPage() {

  const resultsRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const [
    tours,
    setTours,
  ] =
    useState<Tour[]>([]);


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
    transport,
    setTransport,
  ] =
    useState<TransportMode>(
      "bus"
    );


  const [
    scope,
    setScope,
  ] =
    useState<ScopeMode>(
      "all"
    );


  const [
    departure,
    setDeparture,
  ] =
    useState("Tümü");


  const [
    destination,
    setDestination,
  ] =
    useState("");


  const [
    maxPrice,
    setMaxPrice,
  ] =
    useState("");


  const [
    duration,
    setDuration,
  ] =
    useState("all");


  const [
    sort,
    setSort,
  ] =
    useState<SortMode>(
      "recommended"
    );


  const [
    guests,
    setGuests,
  ] =
    useState(2);


  const [
    mobileFilters,
    setMobileFilters,
  ] =
    useState(false);


  useEffect(
    () => {

      async function load() {

        setLoading(true);
        setError("");


        const {
          data,
          error:
            loadError,
        } =
          await supabase
            .from("tours")
            .select(
              "id,slug,title,short_description,city,district,category,duration,adult_price,old_price,cover_image,rating,review_count,bestseller,early_booking,featured,status,created_at"
            )
            .eq(
              "status",
              "active"
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );


        if (loadError) {

          setError(
            "Turlar yüklenemedi."
          );

          setTours([]);

        } else {

          setTours(
            (data ??
              []) as Tour[]
          );

        }


        setLoading(false);

      }


      void load();

    },
    []
  );


  const validTours =
    useMemo(
      () =>
        tours.filter(
          (tour) =>
            !isExcluded(
              tour
            ) &&
            getTransport(
              tour
            ) !==
              null
        ),
      [
        tours,
      ]
    );


  const departureCities =
    useMemo(
      () => [
        "Tümü",
        ...Array.from(
          new Set(
            validTours
              .map(
                (tour) =>
                  tour.city
              )
              .filter(Boolean)
          )
        ).sort(),
      ],
      [
        validTours,
      ]
    );


  const busCount =
    validTours.filter(
      (tour) =>
        getTransport(
          tour
        ) ===
        "bus"
    ).length;


  const flightCount =
    validTours.filter(
      (tour) =>
        getTransport(
          tour
        ) ===
        "flight"
    ).length;


  const resultTours =
    useMemo(
      () => {

        let result =
          validTours.filter(
            (tour) => {

              const mode =
                getTransport(
                  tour
                );


              const tourScope =
                getScope(
                  tour
                );


              const text =
                normalize(
                  tourText(
                    tour
                  )
                );


              const destinationMatch =
                !destination ||
                text.includes(
                  normalize(
                    destination
                  )
                );


              const departureMatch =
                departure ===
                  "Tümü" ||
                tour.city ===
                  departure;


              const transportMatch =
                mode ===
                transport;


              const scopeMatch =
                scope ===
                  "all" ||
                scope ===
                  tourScope;


              const priceMatch =
                !maxPrice ||
                Number(
                  tour.adult_price
                ) <=
                  Number(
                    maxPrice
                  );


              let durationMatch =
                true;


              const durationText =
                normalize(
                  tour.duration
                );


              if (
                duration ===
                "short"
              ) {

                durationMatch =
                  durationText.includes(
                    "1 gun"
                  ) ||
                  durationText.includes(
                    "2 gun"
                  ) ||
                  durationText.includes(
                    "1 gece"
                  );

              }


              if (
                duration ===
                "medium"
              ) {

                durationMatch =
                  durationText.includes(
                    "3 gun"
                  ) ||
                  durationText.includes(
                    "4 gun"
                  ) ||
                  durationText.includes(
                    "5 gun"
                  ) ||
                  durationText.includes(
                    "2 gece"
                  ) ||
                  durationText.includes(
                    "3 gece"
                  ) ||
                  durationText.includes(
                    "4 gece"
                  );

              }


              if (
                duration ===
                "long"
              ) {

                durationMatch =
                  durationText.includes(
                    "6 gun"
                  ) ||
                  durationText.includes(
                    "7 gun"
                  ) ||
                  durationText.includes(
                    "8 gun"
                  ) ||
                  durationText.includes(
                    "5 gece"
                  ) ||
                  durationText.includes(
                    "6 gece"
                  ) ||
                  durationText.includes(
                    "7 gece"
                  );

              }


              return (
                transportMatch &&
                scopeMatch &&
                departureMatch &&
                destinationMatch &&
                priceMatch &&
                durationMatch
              );

            }
          );


        if (
          sort ===
          "priceAsc"
        ) {

          result =
            [...result].sort(
              (
                first,
                second
              ) =>
                first.adult_price -
                second.adult_price
            );

        }


        if (
          sort ===
          "priceDesc"
        ) {

          result =
            [...result].sort(
              (
                first,
                second
              ) =>
                second.adult_price -
                first.adult_price
            );

        }


        if (
          sort ===
          "rating"
        ) {

          result =
            [...result].sort(
              (
                first,
                second
              ) =>
                Number(
                  second.rating ??
                    0
                ) -
                Number(
                  first.rating ??
                    0
                )
            );

        }


        if (
          sort ===
          "newest"
        ) {

          result =
            [...result].sort(
              (
                first,
                second
              ) =>
                new Date(
                  second.created_at
                ).getTime() -
                new Date(
                  first.created_at
                ).getTime()
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
                    first.featured
                  ) *
                    4 +
                  Number(
                    first.bestseller
                  ) *
                    3 +
                  Number(
                    first.early_booking
                  ) *
                    2 +
                  Number(
                    first.rating ??
                      0
                  );


                const secondScore =
                  Number(
                    second.featured
                  ) *
                    4 +
                  Number(
                    second.bestseller
                  ) *
                    3 +
                  Number(
                    second.early_booking
                  ) *
                    2 +
                  Number(
                    second.rating ??
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
        validTours,
        transport,
        scope,
        departure,
        destination,
        maxPrice,
        duration,
        sort,
      ]
    );


  const heroImage =
    transport ===
    "bus"
      ? "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=2200&q=92"
      : "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2200&q=92";


  function clearFilters() {

    setScope("all");
    setDeparture("Tümü");
    setDestination("");
    setMaxPrice("");
    setDuration("all");
    setSort("recommended");
    setGuests(2);

  }


  function scrollResults() {

    window.setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      50
    );

  }


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* ====================================================
          HERO
      ==================================================== */}

      <section className="relative overflow-hidden border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              `url("${heroImage}")`,
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/88 to-[#06101b]/35" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/30" />


        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pb-20 lg:pt-24">

          <div className="grid items-end gap-10 lg:grid-cols-[1fr_.72fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-300 backdrop-blur-xl">

                <FaShieldAlt />

                Turobus Tur Network

              </div>


              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.93] tracking-tight md:text-7xl">

                Rotanı Seç.

                <span className="mt-3 block text-orange-500">
                  Yolculuğa Başla.
                </span>

              </h1>


              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Otobüslü ve uçaklı
                yurt içi/yurt dışı
                turları tek profesyonel
                marketplace üzerinden
                keşfet.

              </p>

            </div>


            <div className="hidden lg:block">

              <div className="ml-auto max-w-[420px] rounded-[30px] border border-white/15 bg-black/30 p-6 backdrop-blur-2xl">

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
                  Turobus Tur
                </div>

                <div className="mt-4 text-3xl font-black">
                  Paket değil. Gerçek tur ürünleri.
                </div>


                <div className="mt-6 space-y-3">

                  {[
                    "Otobüslü tur programları",
                    "Uçaklı tur programları",
                    "Yurt içi ve yurt dışı ayrımı",
                    "Gerçek tur detayına direkt erişim",
                  ].map(
                    (
                      item
                    ) => (

                      <div
                        key={
                          item
                        }
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
              TRANSPORT MODE
          ==================================================== */}

          <div className="mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">

            <button
              type="button"
              onClick={() => {
                setTransport(
                  "bus"
                );
                scrollResults();
              }}
              className={`flex items-center justify-between rounded-[24px] border p-5 text-left transition ${
                transport ===
                "bus"
                  ? "border-orange-500/50 bg-orange-500/15 shadow-xl shadow-orange-500/10"
                  : "border-white/10 bg-black/35 hover:border-orange-500/30"
              }`}
            >

              <div className="flex items-center gap-4">

                <div className={`grid h-13 w-13 place-items-center rounded-2xl p-4 ${
                  transport ===
                  "bus"
                    ? "bg-orange-500 text-white"
                    : "bg-white/[.05] text-slate-400"
                }`}>
                  <FaBusAlt className="text-xl" />
                </div>


                <div>

                  <div className="text-lg font-black">
                    Otobüslü Turlar
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    Yurt içi ve yurt dışı karayolu rotaları
                  </div>

                </div>

              </div>


              <div className="rounded-full bg-white/[.06] px-3 py-1.5 text-[10px] font-black">
                {busCount}
              </div>

            </button>


            <button
              type="button"
              onClick={() => {
                setTransport(
                  "flight"
                );
                scrollResults();
              }}
              className={`flex items-center justify-between rounded-[24px] border p-5 text-left transition ${
                transport ===
                "flight"
                  ? "border-cyan-400/50 bg-cyan-400/10 shadow-xl shadow-cyan-400/10"
                  : "border-white/10 bg-black/35 hover:border-cyan-400/30"
              }`}
            >

              <div className="flex items-center gap-4">

                <div className={`grid h-13 w-13 place-items-center rounded-2xl p-4 ${
                  transport ===
                  "flight"
                    ? "bg-cyan-300 text-slate-950"
                    : "bg-white/[.05] text-slate-400"
                }`}>
                  <FaPlaneDeparture className="text-xl" />
                </div>


                <div>

                  <div className="text-lg font-black">
                    Uçaklı Turlar
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    Türkiye ve dünya uçuşlu tur programları
                  </div>

                </div>

              </div>


              <div className="rounded-full bg-white/[.06] px-3 py-1.5 text-[10px] font-black">
                {flightCount}
              </div>

            </button>

          </div>


          {/* ====================================================
              SEARCH BAR
          ==================================================== */}

          <div className="mt-5 grid overflow-hidden rounded-[24px] border border-white/15 bg-[#081522]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid-cols-[1fr_1.3fr_.7fr_auto]">

            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                <FaMapMarkerAlt />
                Kalkış Noktası
              </span>


              <select
                value={
                  departure
                }
                onChange={(event) =>
                  setDeparture(
                    event.target.value
                  )
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              >

                {departureCities.map(
                  (
                    city
                  ) => (

                    <option
                      key={
                        city
                      }
                      value={
                        city
                      }
                      className="bg-slate-950"
                    >
                      {city ===
                      "Tümü"
                        ? "Tüm kalkış noktaları"
                        : city}
                    </option>

                  )
                )}

              </select>

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                <FaSearch />
                Tur / Destinasyon
              </span>


              <input
                value={
                  destination
                }
                onChange={(event) =>
                  setDestination(
                    event.target.value
                  )
                }
                placeholder={
                  transport ===
                  "bus"
                    ? "Kapadokya, Karadeniz, Balkanlar..."
                    : "Dubai, Avrupa, Balkanlar..."
                }
                className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-600"
              />

            </label>


            <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                <FaUsers />
                Kişi
              </div>


              <div className="flex items-center gap-3">

                <button
                  type="button"
                  disabled={
                    guests <= 1
                  }
                  onClick={() =>
                    setGuests(
                      Math.max(
                        1,
                        guests - 1
                      )
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 disabled:opacity-30"
                >
                  -
                </button>


                <strong className="min-w-12 text-center text-sm">
                  {guests} Kişi
                </strong>


                <button
                  type="button"
                  onClick={() =>
                    setGuests(
                      Math.min(
                        20,
                        guests + 1
                      )
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500"
                >
                  +
                </button>

              </div>

            </div>


            <div className="flex items-center p-3">

              <button
                type="button"
                onClick={
                  scrollResults
                }
                className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                <FaSearch />
                Turları Göster
              </button>

            </div>

          </div>


          {/* TRUST */}

          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              "Doğrulanmış Tur Ürünleri",
              "Paketlerden Ayrı",
              "Yurt İçi & Yurt Dışı",
              "Gerçek Tur Detayı",
            ].map(
              (
                text
              ) => (

                <div
                  key={
                    text
                  }
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

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Turunu Şekillendir
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Nasıl Yolculuk Etmek İstiyorsun?
            </h2>

          </div>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              {
                title:
                  "Yurt İçi",
                text:
                  "Türkiye'nin seçkin rotaları",
                scope:
                  "domestic" as ScopeMode,
                icon:
                  FaMapMarkerAlt,
              },
              {
                title:
                  "Yurt Dışı",
                text:
                  "Avrupa ve dünya turları",
                scope:
                  "international" as ScopeMode,
                icon:
                  FaGlobeEurope,
              },
              {
                title:
                  "Kısa Kaçamak",
                text:
                  "1-2 günlük tur programları",
                duration:
                  "short",
                icon:
                  FaCalendarAlt,
              },
              {
                title:
                  "Uzun Rota",
                text:
                  "6 gün ve üzeri programlar",
                duration:
                  "long",
                icon:
                  FaStar,
              },
            ].map(
              (
                item
              ) => {

                const Icon =
                  item.icon;


                return (
                  <button
                    key={
                      item.title
                    }
                    type="button"
                    onClick={() => {

                      if (
                        item.scope
                      ) {
                        setScope(
                          item.scope
                        );
                      }

                      if (
                        item.duration
                      ) {
                        setDuration(
                          item.duration
                        );
                      }

                      scrollResults();

                    }}
                    className="group rounded-[24px] border border-white/10 bg-[#0b1825] p-5 text-left transition hover:-translate-y-1 hover:border-orange-500/30"
                  >

                    <div className="flex items-center justify-between">

                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                        <Icon />
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
                );

              }
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
        id="tour-results"
        className="scroll-mt-24 border-t border-white/10 bg-[#091522] px-5 py-14 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className={`text-[10px] font-black uppercase tracking-[.2em] ${
                transport ===
                "bus"
                  ? "text-orange-400"
                  : "text-cyan-300"
              }`}>
                {transport ===
                "bus"
                  ? "Otobüslü Turlar"
                  : "Uçaklı Turlar"}
              </div>


              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                {transport ===
                "bus"
                  ? "Otobüsle Yeni Rotalar"
                  : "Uçakla Yeni Dünyalar"}
              </h2>


              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Tur ağı kontrol ediliyor..."
                  : `${resultTours.length} uygun tur bulundu`}
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              {[
                [
                  "all",
                  "Tümü",
                ],
                [
                  "domestic",
                  "Yurt İçi",
                ],
                [
                  "international",
                  "Yurt Dışı",
                ],
              ].map(
                ([
                  key,
                  label,
                ]) => (

                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setScope(
                        key as ScopeMode
                      )
                    }
                    className={`rounded-xl px-4 py-3 text-xs font-black transition ${
                      scope ===
                      key
                        ? "bg-orange-500 text-white"
                        : "border border-white/10 bg-white/[.03] text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>

                )
              )}


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

                  <option value="newest">
                    En Yeniler
                  </option>

                  <option value="priceAsc">
                    Fiyat Artan
                  </option>

                  <option value="priceDesc">
                    Fiyat Azalan
                  </option>

                  <option value="rating">
                    En Yüksek Puan
                  </option>

                </select>


                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

              </div>

            </div>

          </div>


          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-[#07111f] px-5 py-4">

            <div>

              <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                Arama Özeti
              </div>

              <div className="mt-1 text-xs font-black text-slate-300">
                {transportLabel(
                  transport
                )} · {scope ===
                "all"
                  ? "Yurt İçi & Yurt Dışı"
                  : scopeLabel(
                      scope
                    )} · {departure ===
                "Tümü"
                  ? "Tüm Kalkışlar"
                  : departure} · {guests} Kişi
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

            {/* FILTERS */}

            <aside className="hidden lg:block">

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#07111f] p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-black">
                    Tur Filtreleri
                  </h3>

                  <FaFilter className="text-slate-600" />

                </div>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Maksimum Fiyat
                  </span>


                  <input
                    type="number"
                    min="0"
                    value={
                      maxPrice
                    }
                    onChange={(event) =>
                      setMaxPrice(
                        event.target.value
                      )
                    }
                    placeholder="Örn. 25000"
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3 text-sm outline-none"
                  />

                </label>


                <label className="mt-4 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Tur Süresi
                  </span>


                  <select
                    value={
                      duration
                    }
                    onChange={(event) =>
                      setDuration(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3 text-sm font-bold outline-none"
                  >

                    <option value="all">
                      Tüm Süreler
                    </option>

                    <option value="short">
                      1-2 Gün
                    </option>

                    <option value="medium">
                      3-5 Gün
                    </option>

                    <option value="long">
                      6+ Gün
                    </option>

                  </select>

                </label>


                <div className="mt-5">

                  <div className="text-[9px] font-black uppercase text-slate-600">
                    Pazar
                  </div>


                  <div className="mt-3 space-y-1">

                    {[
                      [
                        "all",
                        "Tüm Turlar",
                      ],
                      [
                        "domestic",
                        "Yurt İçi",
                      ],
                      [
                        "international",
                        "Yurt Dışı",
                      ],
                    ].map(
                      ([
                        key,
                        label,
                      ]) => (

                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setScope(
                              key as ScopeMode
                            )
                          }
                          className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-black ${
                            scope ===
                            key
                              ? "bg-orange-500 text-white"
                              : "text-slate-400 hover:bg-white/[.04]"
                          }`}
                        >
                          {label}
                        </button>

                      )
                    )}

                  </div>

                </div>


                <div className="mt-5 rounded-xl border border-orange-500/15 bg-orange-500/[.04] p-4">

                  <div className="text-xs font-black text-orange-300">
                    Tur Marketplace
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Bu alanda yalnızca otobüslü ve uçaklı gerçek tur ürünleri listelenir. Paketler ayrı sistemde tutulur.
                  </p>

                </div>

              </div>

            </aside>


            {/* RESULTS */}

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
                        className="h-[300px] animate-pulse rounded-[28px] bg-white/[.04]"
                      />

                    )
                  )}

                </div>

              ) : resultTours.length >
                0 ? (

                <div className="space-y-5">

                  {resultTours.map(
                    (
                      tour
                    ) => {

                      const mode =
                        getTransport(
                          tour
                        )!;

                      const tourScope =
                        getScope(
                          tour
                        );


                      return (
                        <article
                          key={
                            tour.id
                          }
                          className="group grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:border-orange-500/30 hover:shadow-2xl hover:shadow-black/30 md:grid-cols-[330px_1fr]"
                        >

                          {/* IMAGE */}

                          <div className="relative min-h-[280px] overflow-hidden bg-slate-900">

                            {tour.cover_image ? (

                              <img
                                src={
                                  tour.cover_image
                                }
                                alt={
                                  tour.title
                                }
                                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                              />

                            ) : (

                              <div className="flex h-full min-h-[280px] items-center justify-center text-xs text-slate-600">
                                Tur görseli hazırlanıyor
                              </div>

                            )}


                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />


                            <div className="absolute left-4 top-4 flex flex-wrap gap-2">

                              <span className={`rounded-full px-3 py-1.5 text-[8px] font-black ${
                                mode ===
                                "bus"
                                  ? "bg-orange-500 text-white"
                                  : "bg-cyan-300 text-slate-950"
                              }`}>

                                {mode ===
                                "bus" ? (
                                  <>
                                    <FaBusAlt className="mr-1 inline" />
                                    OTOBÜSLÜ
                                  </>
                                ) : (
                                  <>
                                    <FaPlaneDeparture className="mr-1 inline" />
                                    UÇAKLI
                                  </>
                                )}

                              </span>


                              <span className="rounded-full bg-black/65 px-3 py-1.5 text-[8px] font-black backdrop-blur">
                                {scopeLabel(
                                  tourScope
                                ).toUpperCase()}
                              </span>


                              {tour.bestseller && (

                                <span className="rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">
                                  ÇOK SATAN
                                </span>

                              )}

                            </div>


                            <FavoriteButton
                              tourId={
                                tour.id
                              }
                              className="absolute right-4 top-4 h-10 w-10 rounded-full bg-black/60 text-white backdrop-blur"
                            />

                          </div>


                          {/* INFO */}

                          <div className="flex min-w-0 flex-col p-5 md:p-6">

                            <div className="flex flex-wrap items-start justify-between gap-4">

                              <div className="min-w-0">

                                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">

                                  <span className="flex items-center gap-1.5">
                                    <FaMapMarkerAlt className="text-orange-400" />
                                    {tour.city}
                                    {tour.district
                                      ? ` · ${tour.district}`
                                      : ""}
                                  </span>


                                  {tour.duration && (

                                    <span className="flex items-center gap-1.5">
                                      <FaCalendarAlt className="text-slate-600" />
                                      {tour.duration}
                                    </span>

                                  )}

                                </div>


                                <h3 className="mt-4 text-2xl font-black">
                                  {tour.title}
                                </h3>


                                {tour.short_description && (

                                  <p className="mt-3 line-clamp-2 max-w-2xl text-xs leading-6 text-slate-500">
                                    {tour.short_description}
                                  </p>

                                )}

                              </div>


                              <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

                                <div className="flex items-center justify-end gap-1 text-sm font-black">
                                  <FaStar className="text-yellow-400" />

                                  {tour.rating ??
                                    5}
                                </div>

                                <div className="mt-1 text-[9px] text-slate-600">
                                  {tour.review_count ??
                                    0} değerlendirme
                                </div>

                              </div>

                            </div>


                            <div className="mt-5 grid gap-2 sm:grid-cols-3">

                              <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                                <div className="text-[9px] font-black uppercase text-slate-600">
                                  Ulaşım
                                </div>

                                <div className="mt-1 text-sm font-black">
                                  {transportLabel(
                                    mode
                                  )}
                                </div>

                              </div>


                              <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                                <div className="text-[9px] font-black uppercase text-slate-600">
                                  Tur Bölgesi
                                </div>

                                <div className="mt-1 text-sm font-black">
                                  {scopeLabel(
                                    tourScope
                                  )}
                                </div>

                              </div>


                              <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                                <div className="text-[9px] font-black uppercase text-slate-600">
                                  Kişi
                                </div>

                                <div className="mt-1 text-sm font-black">
                                  {guests} kişi
                                </div>

                              </div>

                            </div>


                            <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-5">

                              <div>

                                {tour.old_price >
                                tour.adult_price && (

                                  <div className="text-xs text-slate-600 line-through">
                                    {tour.old_price.toLocaleString(
                                      "tr-TR"
                                    )} TL
                                  </div>

                                )}


                                <div className="mt-1 text-3xl font-black text-orange-400">
                                  {tour.adult_price.toLocaleString(
                                    "tr-TR"
                                  )} TL
                                </div>

                                <div className="text-[9px] text-slate-600">
                                  kişi başı başlangıç fiyatı
                                </div>

                              </div>


                              <div className="flex flex-wrap gap-2">

                                <Link
                                  href={`/turlar/${tour.slug}`}
                                  className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[.05]"
                                >
                                  Tur Detayı
                                </Link>


                                <Link
                                  href={`/turlar/${tour.slug}`}
                                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black transition hover:bg-orange-600"
                                >
                                  Turu İncele
                                  <FaArrowRight />
                                </Link>

                              </div>

                            </div>

                          </div>

                        </article>
                      );

                    }
                  )}

                </div>

              ) : (

                <div>

                  <div className="rounded-[24px] border border-orange-500/15 bg-orange-500/[.04] p-5">

                    <div className="font-black text-orange-300">
                      Marketplace Tasarım Önizlemesi
                    </div>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      Bu filtrede gerçek tur bulunmadığı için yalnızca tasarım örnekleri gösteriliyor. Tour OS&apos;a uygun otobüslü veya uçaklı tur geldiğinde bu kartlar otomatik olarak kaybolur.
                    </p>

                  </div>


                  <div className="mt-5 grid gap-5 md:grid-cols-2">

                    {previewTours
                      .filter(
                        (
                          tour
                        ) =>
                          transport ===
                          "bus"
                            ? tour.transport ===
                              "Otobüslü"
                            : tour.transport ===
                              "Uçaklı"
                      )
                      .map(
                        (
                          tour
                        ) => (

                          <article
                            key={
                              tour.title
                            }
                            className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1825]"
                          >

                            <div className="relative aspect-[16/9] overflow-hidden">

                              <img
                                src={
                                  tour.image
                                }
                                alt={
                                  tour.title
                                }
                                className="h-full w-full object-cover"
                              />


                              <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-[8px] font-black text-orange-300 backdrop-blur">
                                TASARIM ÖNİZLEME
                              </div>

                            </div>


                            <div className="p-5">

                              <div className="text-[10px] text-slate-500">
                                {tour.scope} · {tour.transport}
                              </div>


                              <h3 className="mt-2 text-xl font-black">
                                {tour.title}
                              </h3>


                              <div className="mt-2 text-xs text-slate-500">
                                {tour.route}
                              </div>


                              <div className="mt-2 text-xs text-slate-500">
                                {tour.duration}
                              </div>


                              <div className="mt-5 border-t border-white/10 pt-4">

                                <div className="text-2xl font-black text-orange-400">
                                  {tour.price.toLocaleString(
                                    "tr-TR"
                                  )} TL
                                </div>

                                <div className="text-[9px] text-slate-600">
                                  örnek kişi başı fiyat
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


      {/* ====================================================
          NETWORK
      ==================================================== */}

      <section className="border-t border-white/10 px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.8fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Turobus Tour Network
            </div>


            <h2 className="mt-2 max-w-2xl text-3xl font-black">
              Tur listesi değil. Gerçek seyahat ürünlerini yöneten pazar yeri.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Otobüslü Turlar",
                  "Kalkış noktası ve tur rotasına göre gerçek tur ürünleri.",
                ],
                [
                  "Uçaklı Turlar",
                  "Yurt içi ve yurt dışı uçuşlu tur programları.",
                ],
                [
                  "Paketlerden Ayrı",
                  "Balayı ve tatil paketleri bu sayfada karışmaz.",
                ],
                [
                  "Gerçek Tur Detayı",
                  "Kartlar doğrudan mevcut tur detay sayfasına bağlanır.",
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


          <div className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-orange-500/[.03] to-transparent p-7">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS TOUR
            </div>


            <div className="mt-4 text-4xl font-black leading-tight">
              Rota.
              <br />
              Ulaşım.
              <br />
              Program.
              <br />
              Rezervasyon.
            </div>


            <p className="mt-6 text-sm leading-7 text-slate-400">
              Otobüslü ve uçaklı seyahat ürünleri, Tour OS ile Marketplace arasında profesyonel bir satış deneyimine dönüşür.
            </p>

          </div>

        </div>

      </section>


      {/* ====================================================
          MOBILE FILTER
      ==================================================== */}

      {mobileFilters && (

        <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-md">

          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#091522] p-5">

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-black">
                Tur Filtreleri
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


            <div className="mt-5 grid grid-cols-2 gap-2">

              {[
                [
                  "all",
                  "Tümü",
                ],
                [
                  "domestic",
                  "Yurt İçi",
                ],
                [
                  "international",
                  "Yurt Dışı",
                ],
              ].map(
                ([
                  key,
                  label,
                ]) => (

                  <button
                    key={
                      key
                    }
                    type="button"
                    onClick={() =>
                      setScope(
                        key as ScopeMode
                      )
                    }
                    className={`rounded-xl border px-3 py-3 text-xs font-black ${
                      scope ===
                      key
                        ? "border-orange-500 bg-orange-500"
                        : "border-white/10"
                    }`}
                  >
                    {label}
                  </button>

                )
              )}

            </div>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Maksimum Fiyat
              </span>


              <input
                type="number"
                value={
                  maxPrice
                }
                onChange={(event) =>
                  setMaxPrice(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              />

            </label>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Süre
              </span>


              <select
                value={
                  duration
                }
                onChange={(event) =>
                  setDuration(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              >

                <option value="all">
                  Tüm Süreler
                </option>

                <option value="short">
                  1-2 Gün
                </option>

                <option value="medium">
                  3-5 Gün
                </option>

                <option value="long">
                  6+ Gün
                </option>

              </select>

            </label>


            <button
              type="button"
              onClick={() => {

                setMobileFilters(
                  false
                );

                scrollResults();

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
