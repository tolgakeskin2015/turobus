"use client";

import {
  useEffect,
  useMemo,
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
  FaChevronDown,
  FaGlobeEurope,
  FaMapMarkerAlt,
  FaPlaneDeparture,
  FaSearch,
  FaShieldAlt,
  FaStar,
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


const packageKeywords = [
  "paket",
  "balayı",
  "balayi",
  "honeymoon",
  "otel paketi",
  "tatil paketi",
  "aktivite paketi",
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
      "Kapadokya Otobüslü Kültür Turu",
    location:
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
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=90",
  },
  {
    title:
      "Karadeniz Yaylalar Turu",
    location:
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
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=90",
  },
  {
    title:
      "Balkanlar Uçaklı Turu",
    location:
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
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=90",
  },
  {
    title:
      "Dubai Uçaklı Şehir Turu",
    location:
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
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=90",
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


function isPackage(
  tour: Tour
) {

  return containsAny(
    tourText(tour),
    packageKeywords
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


function transportLabel(
  mode: TransportMode
) {

  return mode ===
    "bus"
    ? "Otobüslü"
    : "Uçaklı";

}


function scopeLabel(
  scope:
    | "domestic"
    | "international"
) {

  return scope ===
    "domestic"
    ? "Yurt İçi"
    : "Yurt Dışı";

}


export default function ToursPage() {

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
    search,
    setSearch,
  ] =
    useState("");


  const [
    departure,
    setDeparture,
  ] =
    useState("Tümü");


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


        if (
          loadError
        ) {

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
            !isPackage(
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
      () => {

        const values =
          validTours
            .map(
              (tour) =>
                tour.city
            )
            .filter(Boolean);


        return [
          "Tümü",
          ...Array.from(
            new Set(
              values
            )
          ).sort(),
        ];

      },
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


  const filteredTours =
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


              const query =
                normalize(
                  search
                );


              const matchesTransport =
                mode ===
                transport;


              const matchesScope =
                scope ===
                  "all" ||
                scope ===
                  tourScope;


              const matchesSearch =
                !query ||
                text.includes(
                  query
                );


              const matchesDeparture =
                departure ===
                  "Tümü" ||
                tour.city ===
                  departure;


              const matchesPrice =
                !maxPrice ||
                Number(
                  tour.adult_price
                ) <=
                  Number(
                    maxPrice
                  );


              let matchesDuration =
                true;


              const normalizedDuration =
                normalize(
                  tour.duration
                );


              if (
                duration ===
                "short"
              ) {

                matchesDuration =
                  normalizedDuration.includes(
                    "1 gun"
                  ) ||
                  normalizedDuration.includes(
                    "2 gun"
                  ) ||
                  normalizedDuration.includes(
                    "1 gece"
                  );

              }


              if (
                duration ===
                "medium"
              ) {

                matchesDuration =
                  normalizedDuration.includes(
                    "3 gun"
                  ) ||
                  normalizedDuration.includes(
                    "4 gun"
                  ) ||
                  normalizedDuration.includes(
                    "5 gun"
                  ) ||
                  normalizedDuration.includes(
                    "2 gece"
                  ) ||
                  normalizedDuration.includes(
                    "3 gece"
                  ) ||
                  normalizedDuration.includes(
                    "4 gece"
                  );

              }


              if (
                duration ===
                "long"
              ) {

                matchesDuration =
                  normalizedDuration.includes(
                    "6 gun"
                  ) ||
                  normalizedDuration.includes(
                    "7 gun"
                  ) ||
                  normalizedDuration.includes(
                    "8 gun"
                  ) ||
                  normalizedDuration.includes(
                    "5 gece"
                  ) ||
                  normalizedDuration.includes(
                    "6 gece"
                  ) ||
                  normalizedDuration.includes(
                    "7 gece"
                  );

              }


              return (
                matchesTransport &&
                matchesScope &&
                matchesSearch &&
                matchesDeparture &&
                matchesPrice &&
                matchesDuration
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
                a,
                b
              ) =>
                a.adult_price -
                b.adult_price
            );

        }


        if (
          sort ===
          "priceDesc"
        ) {

          result =
            [...result].sort(
              (
                a,
                b
              ) =>
                b.adult_price -
                a.adult_price
            );

        }


        if (
          sort ===
          "rating"
        ) {

          result =
            [...result].sort(
              (
                a,
                b
              ) =>
                Number(
                  b.rating ??
                    0
                ) -
                Number(
                  a.rating ??
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
                a,
                b
              ) =>
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
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
                a,
                b
              ) => {

                const aScore =
                  Number(
                    a.featured
                  ) *
                    3 +
                  Number(
                    a.bestseller
                  ) *
                    2 +
                  Number(
                    a.early_booking
                  );


                const bScore =
                  Number(
                    b.featured
                  ) *
                    3 +
                  Number(
                    b.bestseller
                  ) *
                    2 +
                  Number(
                    b.early_booking
                  );


                return (
                  bScore -
                  aScore
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
        search,
        departure,
        maxPrice,
        duration,
        sort,
      ]
    );


  function clearFilters() {

    setScope(
      "all"
    );

    setSearch("");

    setDeparture(
      "Tümü"
    );

    setMaxPrice("");

    setDuration(
      "all"
    );

    setSort(
      "recommended"
    );

  }


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              transport ===
              "bus"
                ? 'url("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=2200&q=90")'
                : 'url("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2200&q=90")',
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/86 to-[#06101b]/45" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-transparent" />


        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pt-24">

          <div className="max-w-4xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-300 backdrop-blur">

              <FaShieldAlt />

              Turobus Tur Marketplace

            </div>


            <h1 className="mt-6 text-5xl font-black leading-[.95] tracking-tight md:text-7xl">

              Yolculuğunu

              <span className="mt-2 block text-orange-500">
                Turobus ile Seç
              </span>

            </h1>


            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

              Türkiye ve dünya rotalarında
              yalnızca otobüslü ve uçaklı
              turları karşılaştır.

            </p>

          </div>


          {/* PRIMARY TRANSPORT */}

          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">

            <button
              type="button"
              onClick={() =>
                setTransport(
                  "bus"
                )
              }
              className={`flex items-center justify-between rounded-[24px] border p-5 text-left transition ${
                transport ===
                "bus"
                  ? "border-orange-500/50 bg-orange-500/15 shadow-xl shadow-orange-500/5"
                  : "border-white/10 bg-black/35 hover:border-orange-500/30"
              }`}
            >

              <div className="flex items-center gap-4">

                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${
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
                    Yurt içi ve yurt dışı karayolu turları
                  </div>

                </div>

              </div>


              <div className="rounded-full bg-white/[.05] px-3 py-1.5 text-[10px] font-black">
                {busCount}
              </div>

            </button>


            <button
              type="button"
              onClick={() =>
                setTransport(
                  "flight"
                )
              }
              className={`flex items-center justify-between rounded-[24px] border p-5 text-left transition ${
                transport ===
                "flight"
                  ? "border-cyan-400/50 bg-cyan-400/10 shadow-xl shadow-cyan-500/5"
                  : "border-white/10 bg-black/35 hover:border-cyan-400/30"
              }`}
            >

              <div className="flex items-center gap-4">

                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${
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


              <div className="rounded-full bg-white/[.05] px-3 py-1.5 text-[10px] font-black">
                {flightCount}
              </div>

            </button>

          </div>


          {/* SEARCH */}

          <div className="mt-5 grid overflow-hidden rounded-[22px] border border-white/15 bg-[#07131f]/95 shadow-2xl backdrop-blur-xl md:grid-cols-[1fr_1.3fr_.7fr_auto]">

            <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                Kalkış Noktası
              </span>

              <select
                value={departure}
                onChange={(event) =>
                  setDeparture(
                    event.target.value
                  )
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              >

                {departureCities.map(
                  (city) => (
                    <option
                      key={city}
                      value={city}
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


            <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                Tur / Destinasyon
              </span>

              <div className="flex items-center gap-2">

                <FaSearch className="text-slate-600" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder={
                    transport ===
                    "bus"
                      ? "Kapadokya, Karadeniz, Balkanlar..."
                      : "Dubai, Paris, Balkanlar..."
                  }
                  className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-600"
                />

              </div>

            </label>


            <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                Kişi
              </span>

              <div className="flex items-center gap-2">

                <FaUsers className="text-slate-600" />

                <span className="text-sm font-black">
                  2 Kişi
                </span>

              </div>

            </label>


            <div className="flex items-center p-3">

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      "tour-results"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                    })
                }
                className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black transition hover:bg-orange-600"
              >
                <FaSearch />
                Turları Göster
              </button>

            </div>

          </div>


          {/* TRUST */}

          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur sm:grid-cols-2 xl:grid-cols-4">

            {[
              "Doğrulanmış Acenteler",
              "Güvenli Rezervasyon",
              "Şeffaf Fiyat",
              "Tek Marketplace",
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


      {/* CONTENT */}

      <section
        id="tour-results"
        className="scroll-mt-24 px-5 py-14 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          {/* HEADER */}

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                {transport ===
                "bus"
                  ? "Otobüslü Turlar"
                  : "Uçaklı Turlar"}
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                {transport ===
                "bus"
                  ? "Otobüsle Yeni Rotalar Keşfet"
                  : "Uçakla Dünyayı Keşfet"}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {filteredTours.length} uygun tur bulundu
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  setScope(
                    "all"
                  )
                }
                className={`rounded-xl px-4 py-2.5 text-xs font-black ${
                  scope ===
                  "all"
                    ? "bg-orange-500"
                    : "border border-white/10 bg-white/[.03] text-slate-400"
                }`}
              >
                Tümü
              </button>


              <button
                type="button"
                onClick={() =>
                  setScope(
                    "domestic"
                  )
                }
                className={`rounded-xl px-4 py-2.5 text-xs font-black ${
                  scope ===
                  "domestic"
                    ? "bg-orange-500"
                    : "border border-white/10 bg-white/[.03] text-slate-400"
                }`}
              >
                Yurt İçi
              </button>


              <button
                type="button"
                onClick={() =>
                  setScope(
                    "international"
                  )
                }
                className={`rounded-xl px-4 py-2.5 text-xs font-black ${
                  scope ===
                  "international"
                    ? "bg-orange-500"
                    : "border border-white/10 bg-white/[.03] text-slate-400"
                }`}
              >
                Yurt Dışı
              </button>

            </div>

          </div>


          <div className="mt-8 grid gap-7 lg:grid-cols-[270px_1fr]">

            {/* FILTERS */}

            <aside>

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#091522] p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-black">
                    Filtreler
                  </h3>

                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="text-[9px] font-black text-orange-400"
                  >
                    Temizle
                  </button>

                </div>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Maksimum Fiyat
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(event) =>
                      setMaxPrice(
                        event.target.value
                      )
                    }
                    placeholder="Örn. 25000"
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm outline-none"
                  />

                </label>


                <label className="mt-4 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Tur Süresi
                  </span>

                  <select
                    value={duration}
                    onChange={(event) =>
                      setDuration(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm font-bold outline-none"
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


                <label className="mt-4 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Sıralama
                  </span>

                  <div className="relative">

                    <select
                      value={sort}
                      onChange={(event) =>
                        setSort(
                          event.target
                            .value as SortMode
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 pr-10 text-sm font-bold outline-none"
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

                    <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

                  </div>

                </label>


                <div className="mt-5 rounded-xl border border-orange-500/15 bg-orange-500/[.04] p-4">

                  <div className="text-xs font-black text-orange-300">
                    Paketlerden Ayrı
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Bu ekranda yalnızca otobüslü ve uçaklı turlar listelenir. Tatil ve balayı paketleri ayrı Marketplace bölümünde tutulur.
                  </p>

                </div>

              </div>

            </aside>


            {/* RESULTS */}

            <div>

              {loading && (

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                  {[1,2,3,4,5,6].map(
                    (item) => (

                      <div
                        key={item}
                        className="h-[500px] animate-pulse rounded-[28px] bg-white/[.04]"
                      />

                    )
                  )}

                </div>

              )}


              {error && (

                <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-7 text-red-300">
                  {error}
                </div>

              )}


              {!loading &&
                !error &&
                filteredTours.length >
                  0 && (

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                    {filteredTours.map(
                      (tour) => {

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
                            className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition duration-300 hover:-translate-y-1 hover:border-orange-500/35 hover:shadow-2xl"
                          >

                            <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">

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

                                <div className="flex h-full items-center justify-center text-xs text-slate-600">
                                  Tur görseli hazırlanıyor
                                </div>

                              )}


                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />


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


                                <span className="rounded-full bg-black/60 px-3 py-1.5 text-[8px] font-black text-white backdrop-blur">
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


                            <div className="p-5">

                              <div className="flex items-center justify-between gap-3">

                                <div className="flex items-center gap-2 text-[10px] text-slate-500">

                                  <FaMapMarkerAlt className="text-orange-400" />

                                  {tour.city}

                                  {tour.district
                                    ? ` · ${tour.district}`
                                    : ""}

                                </div>


                                <div className="flex items-center gap-1 text-xs font-black">

                                  <FaStar className="text-yellow-400" />

                                  {tour.rating ??
                                    5}

                                  <span className="text-[9px] font-normal text-slate-600">
                                    ({tour.review_count ??
                                      0})
                                  </span>

                                </div>

                              </div>


                              <h3 className="mt-4 line-clamp-2 min-h-[56px] text-xl font-black">
                                {tour.title}
                              </h3>


                              {tour.short_description && (

                                <p className="mt-3 line-clamp-2 min-h-[48px] text-xs leading-6 text-slate-500">
                                  {tour.short_description}
                                </p>

                              )}


                              <div className="mt-4 flex flex-wrap gap-2">

                                <span className="rounded-full bg-white/[.05] px-3 py-2 text-[9px] font-black text-slate-400">
                                  {transportLabel(
                                    mode
                                  )}
                                </span>

                                <span className="rounded-full bg-white/[.05] px-3 py-2 text-[9px] font-black text-slate-400">
                                  {scopeLabel(
                                    tourScope
                                  )}
                                </span>

                                {tour.duration && (
                                  <span className="rounded-full bg-white/[.05] px-3 py-2 text-[9px] font-black text-slate-400">
                                    {tour.duration}
                                  </span>
                                )}

                              </div>


                              <div className="mt-5 border-t border-white/10 pt-4">

                                {tour.old_price >
                                  tour.adult_price && (

                                  <div className="text-xs text-slate-600 line-through">
                                    {tour.old_price.toLocaleString(
                                      "tr-TR"
                                    )} TL
                                  </div>

                                )}


                                <div className="mt-1 flex items-end justify-between gap-4">

                                  <div>

                                    <div className="text-2xl font-black text-orange-400">
                                      {tour.adult_price.toLocaleString(
                                        "tr-TR"
                                      )} TL
                                    </div>

                                    <div className="text-[9px] text-slate-600">
                                      kişi başı
                                    </div>

                                  </div>


                                  <Link
                                    href={`/turlar/${tour.slug}`}
                                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-black transition hover:bg-orange-600"
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

                )}


              {!loading &&
                !error &&
                filteredTours.length ===
                  0 && (

                  <div>

                    <div className="rounded-[28px] border border-white/10 bg-[#091522] p-6">

                      <div className="text-xs font-black text-orange-300">
                        Henüz bu filtrelerde gerçek tur yok
                      </div>

                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        Aşağıdaki kartlar yalnızca tasarım önizlemesidir. Gerçek otobüslü/uçaklı turlar Tour OS&apos;a eklendikçe otomatik olarak bunların yerine gelir.
                      </p>

                    </div>


                    <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                      {previewTours
                        .filter(
                          (tour) =>
                            transport ===
                            "bus"
                              ? tour.transport ===
                                "Otobüslü"
                              : tour.transport ===
                                "Uçaklı"
                        )
                        .map(
                          (tour) => (

                            <div
                              key={
                                tour.title
                              }
                              className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825]"
                            >

                              <div className="relative aspect-[16/10] overflow-hidden">

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

                                <h3 className="mt-2 text-lg font-black">
                                  {tour.title}
                                </h3>

                                <div className="mt-2 text-xs text-slate-500">
                                  {tour.location}
                                </div>

                                <div className="mt-2 text-xs text-slate-500">
                                  {tour.duration}
                                </div>

                                <div className="mt-5 text-2xl font-black text-orange-400">
                                  {tour.price.toLocaleString(
                                    "tr-TR"
                                  )} TL
                                </div>

                                <div className="text-[9px] text-slate-600">
                                  örnek kişi başı fiyat
                                </div>

                              </div>

                            </div>

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

      <section className="border-t border-white/10 bg-[#091522] px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">

          {[
            [
              "Sadece Gerçek Turlar",
              "Paket ve aktivite ürünleri tur listesinden ayrıdır.",
              FaShieldAlt,
            ],
            [
              "Otobüslü Turlar",
              "Kalkış noktasından rota ve program bazlı tur satışı.",
              FaBusAlt,
            ],
            [
              "Uçaklı Turlar",
              "Yurt içi ve yurt dışı uçuşlu tur programları.",
              FaPlaneDeparture,
            ],
            [
              "Yurt İçi / Yurt Dışı",
              "Turun destinasyon yapısına göre profesyonel ayrım.",
              FaGlobeEurope,
            ],
          ].map(
            ([
              title,
              description,
              Icon,
            ]) => {

              const TypedIcon =
                Icon as typeof FaShieldAlt;


              return (
                <div
                  key={
                    String(title)
                  }
                  className="rounded-[22px] border border-white/10 bg-white/[.025] p-5"
                >

                  <TypedIcon className="text-orange-400" />

                  <div className="mt-4 font-black">
                    {String(
                      title
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {String(
                      description
                    )}
                  </p>

                </div>
              );

            }
          )}

        </div>

      </section>


      <Footer />

    </main>
  );
}
