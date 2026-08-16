"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheck,
  FaChevronDown,
  FaFilter,
  FaMapMarkerAlt,
  FaMountain,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaTimes,
  FaUsers,
  FaWater,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";


type CategoryKey =
  | "all"
  | "air"
  | "water"
  | "safari"
  | "adventure"
  | "boat";


type SortMode =
  | "recommended"
  | "priceAsc"
  | "priceDesc"
  | "rating";


type PreviewActivity = {
  id: string;
  title: string;
  location: string;
  category: CategoryKey;
  duration: string;
  price: number;
  rating: number;
  image: string;
  feature: string;
};


const categories = [
  {
    key: "all" as CategoryKey,
    title: "Tüm Aktiviteler",
    subtitle: "Tüm deneyimleri keşfet",
    icon: FaStar,
  },
  {
    key: "air" as CategoryKey,
    title: "Hava",
    subtitle: "Yamaç paraşütü ve hava deneyimleri",
    icon: FaMountain,
  },
  {
    key: "water" as CategoryKey,
    title: "Su Sporları",
    subtitle: "Dalış ve rafting",
    icon: FaWater,
  },
  {
    key: "safari" as CategoryKey,
    title: "Safari",
    subtitle: "Jeep, Monster ve doğa rotaları",
    icon: FaMountain,
  },
  {
    key: "adventure" as CategoryKey,
    title: "Macera",
    subtitle: "ATV, zipline ve adrenalin",
    icon: FaStar,
  },
  {
    key: "boat" as CategoryKey,
    title: "Deniz",
    subtitle: "Tekne ve koy deneyimleri",
    icon: FaWater,
  },
];


const locations = [
  "Fethiye",
  "Ölüdeniz",
  "Saklıkent",
  "Dalaman",
  "Kaş",
  "Marmaris",
];


const previewActivities: PreviewActivity[] = [
  {
    id: "paragliding",
    title: "Babadağ Yamaç Paraşütü",
    location: "Ölüdeniz · Fethiye",
    category: "air",
    duration: "Yaklaşık 2 Saat",
    price: 6250,
    rating: 4.9,
    feature: "Babadağ Kalkış",
    image:
      "https://images.unsplash.com/photo-1521673252667-e05da380b252?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "diving",
    title: "Fethiye Tüplü Dalış",
    location: "Fethiye",
    category: "water",
    duration: "Yarım Gün",
    price: 3500,
    rating: 4.8,
    feature: "2 Dalış Noktası",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "jeep",
    title: "Saklıkent Jeep Safari",
    location: "Saklıkent · Fethiye",
    category: "safari",
    duration: "Tam Gün",
    price: 1000,
    rating: 4.8,
    feature: "Su Savaşları & Kanyon",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "rafting",
    title: "Dalaman Rafting",
    location: "Dalaman · Muğla",
    category: "water",
    duration: "Tam Gün",
    price: 3000,
    rating: 4.9,
    feature: "Profesyonel Rehber",
    image:
      "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "atv",
    title: "ATV Safari",
    location: "Fethiye",
    category: "adventure",
    duration: "Yaklaşık 2 Saat",
    price: 1750,
    rating: 4.7,
    feature: "Orman & Arazi Parkuru",
    image:
      "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "boat",
    title: "12 Adalar Tekne Deneyimi",
    location: "Fethiye",
    category: "boat",
    duration: "Tam Gün",
    price: 1750,
    rating: 4.8,
    feature: "Öğle Yemeği Dahil",
    image:
      "https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&w=1400&q=90",
  },
];


function money(
  value: number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }
  ).format(value);
}


export default function ActivitiesPage() {

  const resultsRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const [
    category,
    setCategory,
  ] =
    useState<CategoryKey>(
      "all"
    );


  const [
    location,
    setLocation,
  ] =
    useState("Tümü");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    date,
    setDate,
  ] =
    useState("");


  const [
    guests,
    setGuests,
  ] =
    useState(2);


  const [
    maxPrice,
    setMaxPrice,
  ] =
    useState("");


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


  const filtered =
    useMemo(
      () => {

        let result =
          previewActivities.filter(
            (
              activity
            ) => {

              const categoryMatch =
                category ===
                  "all" ||
                activity.category ===
                  category;


              const locationMatch =
                location ===
                  "Tümü" ||
                activity.location
                  .toLocaleLowerCase(
                    "tr-TR"
                  )
                  .includes(
                    location.toLocaleLowerCase(
                      "tr-TR"
                    )
                  );


              const searchMatch =
                !search ||
                (
                  activity.title +
                  " " +
                  activity.location +
                  " " +
                  activity.feature
                )
                  .toLocaleLowerCase(
                    "tr-TR"
                  )
                  .includes(
                    search.toLocaleLowerCase(
                      "tr-TR"
                    )
                  );


              const priceMatch =
                !maxPrice ||
                activity.price <=
                  Number(
                    maxPrice
                  );


              return (
                categoryMatch &&
                locationMatch &&
                searchMatch &&
                priceMatch
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
                first.price -
                second.price
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
                second.price -
                first.price
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
                second.rating -
                first.rating
            );

        }


        return result;

      },
      [
        category,
        location,
        search,
        maxPrice,
        sort,
      ]
    );


  function clearFilters() {

    setCategory("all");
    setLocation("Tümü");
    setSearch("");
    setDate("");
    setGuests(2);
    setMaxPrice("");
    setSort("recommended");

  }


  function scrollResults() {

    resultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

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
              'url("https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=2200&q=92")',
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/87 to-[#06101b]/30" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/30" />


        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">

          <div className="grid items-end gap-10 lg:grid-cols-[1fr_.75fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-300 backdrop-blur-xl">

                <FaShieldAlt />

                Turobus Activity Network

              </div>


              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.93] tracking-tight md:text-7xl">

                Tatili İzleme.

                <span className="mt-3 block text-orange-500">
                  Deneyimin İçinde Ol.
                </span>

              </h1>


              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Adrenalin, deniz,
                doğa ve macera
                aktivitelerini tek
                profesyonel Marketplace
                üzerinden keşfet.

              </p>

            </div>


            <div className="hidden lg:block">

              <div className="ml-auto max-w-[420px] rounded-[30px] border border-white/15 bg-black/30 p-6 backdrop-blur-2xl">

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
                  Turobus Aktivite
                </div>

                <div className="mt-4 text-3xl font-black">
                  Tek sağlayıcı değil. Aktivite ağı.
                </div>


                <div className="mt-6 space-y-3">

                  {[
                    "Bir aktivite birden fazla sağlayıcı",
                    "Operasyonda gerçek sağlayıcı ataması",
                    "Merkezi kapasite yönetimi",
                    "Turobus Marketplace satış kanalı",
                  ].map(
                    (
                      item
                    ) => (

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

          <div className="mt-10 grid overflow-hidden rounded-[24px] border border-white/15 bg-[#081522]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid-cols-[1fr_1.3fr_.85fr_.7fr_auto]">

            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                <FaMapMarkerAlt />
                Bölge
              </span>


              <select
                value={location}
                onChange={(event) =>
                  setLocation(
                    event.target.value
                  )
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              >

                <option
                  value="Tümü"
                  className="bg-slate-950"
                >
                  Tüm bölgeler
                </option>

                {locations.map(
                  (
                    item
                  ) => (

                    <option
                      key={item}
                      value={item}
                      className="bg-slate-950"
                    >
                      {item}
                    </option>

                  )
                )}

              </select>

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                <FaSearch />
                Aktivite
              </span>


              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Yamaç paraşütü, dalış, rafting..."
                className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-600"
              />

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                <FaCalendarAlt />
                Tarih
              </span>


              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
                className="w-full bg-transparent text-sm font-black outline-none"
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
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 disabled:opacity-30"
                >
                  -
                </button>

                <strong className="text-sm">
                  {guests}
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
                Aktivite Ara
              </button>

            </div>

          </div>


          {/* TRUST */}

          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              "Activity Network",
              "Merkezi Kapasite",
              "Doğrulanmış Sağlayıcı",
              "Güvenli Rezervasyon",
            ].map(
              (
                text
              ) => (

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


      {/* CATEGORY DISCOVERY */}

      <section className="px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Deneyimini Seç
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Bugün Ne Yapmak İstersin?
            </h2>

          </div>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">

            {categories.map(
              (
                item
              ) => {

                const Icon =
                  item.icon;

                const active =
                  category ===
                  item.key;


                return (
                  <button
                    key={
                      item.key
                    }
                    type="button"
                    onClick={() => {

                      setCategory(
                        item.key
                      );

                      scrollResults();

                    }}
                    className={`group rounded-[22px] border p-5 text-left transition hover:-translate-y-1 ${
                      active
                        ? "border-orange-500/50 bg-orange-500/10"
                        : "border-white/10 bg-[#0b1825] hover:border-orange-500/30"
                    }`}
                  >

                    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${
                      active
                        ? "bg-orange-500 text-white"
                        : "bg-white/[.05] text-orange-400"
                    }`}>
                      <Icon />
                    </div>


                    <div className="mt-4 text-sm font-black">
                      {item.title}
                    </div>

                    <div className="mt-1 text-[9px] leading-4 text-slate-500">
                      {item.subtitle}
                    </div>

                  </button>
                );

              }
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
                Aktivite Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Deneyimleri Keşfet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {filtered.length} aktivite bulundu
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
                  <option value="rating">
                    En Yüksek Puan
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
                {location ===
                "Tümü"
                  ? "Tüm Bölgeler"
                  : location} · {guests} Kişi · {date ||
                  "Tarih seçilmedi"}
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

            {/* FILTER */}

            <aside className="hidden lg:block">

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#07111f] p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-black">
                    Aktivite Filtreleri
                  </h3>

                  <FaFilter className="text-slate-600" />

                </div>


                <div className="mt-5">

                  <div className="text-[9px] font-black uppercase text-slate-600">
                    Kategori
                  </div>


                  <div className="mt-3 space-y-1">

                    {categories.map(
                      (
                        item
                      ) => (

                        <button
                          key={
                            item.key
                          }
                          type="button"
                          onClick={() =>
                            setCategory(
                              item.key
                            )
                          }
                          className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-black ${
                            category ===
                            item.key
                              ? "bg-orange-500 text-white"
                              : "text-slate-400 hover:bg-white/[.04]"
                          }`}
                        >
                          {item.title}
                        </button>

                      )
                    )}

                  </div>

                </div>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
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
                    placeholder="Örn. 5000"
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3 text-sm"
                  />

                </label>


                <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] p-4">

                  <div className="text-xs font-black text-emerald-300">
                    Activity Network
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Aynı aktivite birden fazla sağlayıcıdan sunulabilir. Gerçek operasyonda sağlayıcı daha sonra atanır.
                  </p>

                </div>

              </div>

            </aside>


            {/* CARDS */}

            <div className="space-y-5">

              {filtered.map(
                (
                  activity
                ) => (

                  <article
                    key={
                      activity.id
                    }
                    className="group grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:border-orange-500/30 hover:shadow-2xl hover:shadow-black/30 md:grid-cols-[330px_1fr]"
                  >

                    <div className="relative min-h-[280px] overflow-hidden">

                      <img
                        src={
                          activity.image
                        }
                        alt={
                          activity.title
                        }
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />


                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />


                      <div className="absolute left-4 top-4 rounded-full bg-orange-500 px-3 py-1.5 text-[8px] font-black">
                        TASARIM ÖNİZLEME
                      </div>

                    </div>


                    <div className="flex flex-col p-5 md:p-6">

                      <div className="flex flex-wrap items-start justify-between gap-4">

                        <div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <FaMapMarkerAlt className="text-orange-400" />
                            {activity.location}
                          </div>


                          <h3 className="mt-3 text-2xl font-black">
                            {activity.title}
                          </h3>


                          <div className="mt-3 text-xs text-slate-500">
                            {activity.feature}
                          </div>

                        </div>


                        <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

                          <div className="flex items-center gap-1 text-sm font-black">
                            <FaStar className="text-yellow-400" />
                            {activity.rating}
                          </div>

                          <div className="mt-1 text-[9px] text-slate-600">
                            örnek puan
                          </div>

                        </div>

                      </div>


                      <div className="mt-5 grid gap-2 sm:grid-cols-3">

                        <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                          <div className="text-[9px] font-black uppercase text-slate-600">
                            Süre
                          </div>

                          <div className="mt-1 text-sm font-black">
                            {activity.duration}
                          </div>

                        </div>


                        <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                          <div className="text-[9px] font-black uppercase text-slate-600">
                            Katılım
                          </div>

                          <div className="mt-1 text-sm font-black">
                            {guests} kişi
                          </div>

                        </div>


                        <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                          <div className="text-[9px] font-black uppercase text-slate-600">
                            Kaynak
                          </div>

                          <div className="mt-1 text-sm font-black text-emerald-300">
                            Activity Network
                          </div>

                        </div>

                      </div>


                      <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-5">

                        <div>

                          <div className="text-3xl font-black text-orange-400">
                            {money(
                              activity.price
                            )}
                          </div>

                          <div className="text-[9px] text-slate-600">
                            örnek kişi başı fiyat
                          </div>

                        </div>


                        <button
                          type="button"
                          disabled
                          className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-xs font-black text-slate-600"
                        >
                          Gerçek Ürün Bekleniyor
                          <FaArrowRight />
                        </button>

                      </div>

                    </div>

                  </article>

                )
              )}


              {filtered.length ===
                0 && (

                <div className="rounded-[30px] border border-dashed border-white/10 bg-[#07111f] py-20 text-center">

                  <FaSearch className="mx-auto text-3xl text-slate-700" />

                  <h3 className="mt-5 text-xl font-black">
                    Bu filtrelerde aktivite bulunamadı.
                  </h3>

                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black"
                  >
                    Filtreleri Temizle
                  </button>

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
              Turobus Activity Network
            </div>

            <h2 className="mt-2 max-w-2xl text-3xl font-black">
              Aktivite listesi değil. Sağlayıcıları ve kapasiteyi yöneten satış ağı.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Çoklu Sağlayıcı",
                  "Tek aktivite farklı sağlayıcılardan satışa sunulabilir.",
                ],
                [
                  "Operasyon Ataması",
                  "Rezervasyondan sonra gerçek sağlayıcı operasyon tarafından atanır.",
                ],
                [
                  "Merkezi Kapasite",
                  "Tüm acenteler aynı gerçek kapasite üzerinden satış yapar.",
                ],
                [
                  "Marketplace Ayrımı",
                  "Turobus komisyonu sadece Turobus Marketplace satışında oluşur.",
                ],
              ].map(
                ([
                  title,
                  text,
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
                      {text}
                    </p>
                  </div>

                )
              )}

            </div>

          </div>


          <div className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-orange-500/[.03] to-transparent p-7">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS ACTIVITY
            </div>

            <div className="mt-4 text-4xl font-black leading-tight">
              Aktivite.
              <br />
              Sağlayıcı.
              <br />
              Kapasite.
              <br />
              Operasyon.
            </div>

            <p className="mt-6 text-sm leading-7 text-slate-400">
              Aktivite sağlayıcıları ve acenteler tek Turobus Network altyapısında buluşur.
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
                Aktivite Filtreleri
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

              {categories.map(
                (
                  item
                ) => (

                  <button
                    key={
                      item.key
                    }
                    type="button"
                    onClick={() =>
                      setCategory(
                        item.key
                      )
                    }
                    className={`rounded-xl border px-3 py-3 text-xs font-black ${
                      category ===
                      item.key
                        ? "border-orange-500 bg-orange-500"
                        : "border-white/10"
                    }`}
                  >
                    {item.title}
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
                value={maxPrice}
                onChange={(event) =>
                  setMaxPrice(
                    event.target.value
                  )
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
