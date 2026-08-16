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
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaFilter,
  FaGift,
  FaHeart,
  FaHotel,
  FaMapMarkerAlt,
  FaPlane,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaSuitcase,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type PackageItem = {
  id: string;
  slug: string;
  name: string;

  package_type: string;

  city: string | null;
  district: string | null;

  short_description: string | null;

  nights: number;
  days: number;

  min_guests: number;
  max_guests: number;

  base_price: number;
  old_price: number | null;
  currency: string;

  cover_url: string | null;

  accommodation_type: string | null;
  meal_plan: string | null;

  transfer_included: boolean;

  featured: boolean;
  verified: boolean;

  next_departure: string | null;
  available_capacity: number | null;
};


type SortMode =
  | "recommended"
  | "priceAsc"
  | "priceDesc"
  | "duration";


const packageTypes = [
  {
    value: "",
    label: "Tüm Paketler",
    description:
      "Tüm seçkin tatil seçenekleri",
    icon: FaSuitcase,
  },
  {
    value: "holiday",
    label: "Tatil Paketleri",
    description:
      "Konaklama + deneyim",
    icon: FaHotel,
  },
  {
    value: "honeymoon",
    label: "Balayı Paketleri",
    description:
      "Çiftlere özel romantik deneyimler",
    icon: FaHeart,
  },
  {
    value: "family",
    label: "Aile Paketleri",
    description:
      "Ailelere özel konaklama",
    icon: FaUsers,
  },
  {
    value: "adventure",
    label: "Macera Paketleri",
    description:
      "Aktivite ve adrenalin",
    icon: FaPlane,
  },
  {
    value: "premium",
    label: "Seçkin Paketler",
    description:
      "Premium tatil deneyimi",
    icon: FaStar,
  },
];


const previewPackages = [
  {
    name:
      "Fethiye Seçkin Tatil",
    type:
      "Tatil Paketi",
    location:
      "Fethiye · Muğla",
    nights:
      4,
    days:
      5,
    guests:
      2,
    price:
      52990,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=90",
    included: [
      "Otel",
      "Transfer",
      "Tekne",
      "Aktivite",
    ],
  },
  {
    name:
      "Ölüdeniz Balayı Collection",
    type:
      "Balayı Paketi",
    location:
      "Ölüdeniz · Fethiye",
    nights:
      4,
    days:
      5,
    guests:
      2,
    price:
      69990,
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=90",
    included: [
      "Jakuzili Otel",
      "VIP Transfer",
      "Tekne",
      "SPA",
    ],
  },
  {
    name:
      "Fethiye Adventure Week",
    type:
      "Macera Paketi",
    location:
      "Fethiye · Muğla",
    nights:
      4,
    days:
      5,
    guests:
      2,
    price:
      32900,
    image:
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1400&q=90",
    included: [
      "Dalış",
      "Rafting",
      "Safari",
      "Transfer",
    ],
  },
];


const destinations = [
  "Fethiye",
  "Ölüdeniz",
  "Antalya",
  "Bodrum",
  "Marmaris",
  "Kapadokya",
  "İstanbul",
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
  ).format(
    Number(
      value || 0
    )
  );


function typeLabel(
  value: string
) {
  return (
    packageTypes.find(
      (item) =>
        item.value === value
    )?.label ??
    value
  );
}


export default function PackagesPage() {

  const resultsRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const [
    packages,
    setPackages,
  ] =
    useState<PackageItem[]>([]);


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
    mobileFilters,
    setMobileFilters,
  ] =
    useState(false);


  const [
    sort,
    setSort,
  ] =
    useState<SortMode>(
      "recommended"
    );


  const [
    filters,
    setFilters,
  ] =
    useState({
      destination: "",
      packageType: "",
      guests: 2,
      startDate: "",
      maxPrice: "",
      minNights: 0,
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
            "get_public_package_marketplace",
            {
              p_destination:
                next.destination ||
                null,

              p_package_type:
                next.packageType ||
                null,

              p_guests:
                next.guests ||
                null,

              p_start_date:
                next.startDate ||
                null,
            }
          );


        if (rpcError) {

          setError(
            rpcError.message
          );

          setPackages([]);

        } else {

          setPackages(
            (data ??
              []) as PackageItem[]
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


  const results =
    useMemo(
      () => {

        let rows =
          packages.filter(
            (
              item
            ) => {

              const priceMatch =
                !filters.maxPrice ||
                item.base_price <=
                  Number(
                    filters.maxPrice
                  );


              const nightMatch =
                filters.minNights <=
                  0 ||
                item.nights >=
                  filters.minNights;


              return (
                priceMatch &&
                nightMatch
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
                a,
                b
              ) =>
                a.base_price -
                b.base_price
            );

        }


        if (
          sort ===
          "priceDesc"
        ) {

          rows =
            [...rows].sort(
              (
                a,
                b
              ) =>
                b.base_price -
                a.base_price
            );

        }


        if (
          sort ===
          "duration"
        ) {

          rows =
            [...rows].sort(
              (
                a,
                b
              ) =>
                b.days -
                a.days
            );

        }


        if (
          sort ===
          "recommended"
        ) {

          rows =
            [...rows].sort(
              (
                a,
                b
              ) => {

                const aScore =
                  Number(
                    a.featured
                  ) *
                    10 +
                  Number(
                    a.verified
                  ) *
                    5;


                const bScore =
                  Number(
                    b.featured
                  ) *
                    10 +
                  Number(
                    b.verified
                  ) *
                    5;


                return (
                  bScore -
                  aScore
                );

              }
            );

        }


        return rows;

      },
      [
        packages,
        filters.maxPrice,
        filters.minNights,
        sort,
      ]
    );


  async function searchPackages() {

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


  function clearFilters() {

    const next = {
      destination: "",
      packageType: "",
      guests: 2,
      startDate: "",
      maxPrice: "",
      minNights: 0,
    };


    setFilters(next);

    setSort(
      "recommended"
    );

    void load(next);

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
              'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2200&q=92")',
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/86 to-[#06101b]/30" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/30" />


        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">

          <div className="grid items-end gap-10 lg:grid-cols-[1fr_.72fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-300 backdrop-blur-xl">

                <FaGift />

                Turobus Package Marketplace

              </div>


              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.93] tracking-tight md:text-7xl">

                Tatilini Tek Tek Alma.

                <span className="mt-3 block text-orange-500">
                  Deneyimi Birlikte Seç.
                </span>

              </h1>


              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Otel, villa, transfer,
                aktivite, tur ve özel
                deneyimleri tek seçkin
                tatil paketinde birleştir.

              </p>

            </div>


            <div className="hidden lg:block">

              <div className="ml-auto max-w-[420px] rounded-[30px] border border-white/15 bg-black/30 p-6 backdrop-blur-2xl">

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
                  Turobus Paket
                </div>

                <div className="mt-4 text-3xl font-black">
                  Bir rezervasyon. Birden fazla deneyim.
                </div>


                <div className="mt-6 space-y-3">

                  {[
                    "Tatil & balayı paketleri",
                    "Konaklama + aktivite",
                    "Transfer ve özel deneyimler",
                    "Tek rezervasyon akışı",
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


          {/* SEARCH */}

          <div className="mt-10 grid overflow-hidden rounded-[24px] border border-white/15 bg-[#081522]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid-cols-[1.1fr_1fr_.8fr_.75fr_auto]">

            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                <FaMapMarkerAlt />
                Nereye?
              </span>


              <select
                value={
                  filters.destination
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    destination:
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              >

                <option
                  value=""
                  className="bg-slate-950"
                >
                  Tüm destinasyonlar
                </option>


                {destinations.map(
                  (
                    destination
                  ) => (

                    <option
                      key={
                        destination
                      }
                      value={
                        destination
                      }
                      className="bg-slate-950"
                    >
                      {destination}
                    </option>

                  )
                )}

              </select>

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                <FaGift />
                Paket Tipi
              </span>


              <select
                value={
                  filters.packageType
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    packageType:
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              >

                {packageTypes.map(
                  (
                    item
                  ) => (

                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                      className="bg-slate-950"
                    >
                      {item.label}
                    </option>

                  )
                )}

              </select>

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                <FaCalendarAlt />
                Başlangıç
              </span>


              <input
                type="date"
                value={
                  filters.startDate
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    startDate:
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              />

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                <FaUsers />
                Misafir
              </span>


              <select
                value={
                  filters.guests
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    guests:
                      Number(
                        event.target.value
                      ),
                  })
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              >

                {Array.from(
                  {
                    length: 10,
                  },
                  (
                    _,
                    index
                  ) =>
                    index + 1
                ).map(
                  (
                    count
                  ) => (

                    <option
                      key={
                        count
                      }
                      value={
                        count
                      }
                      className="bg-slate-950"
                    >
                      {count} Kişi
                    </option>

                  )
                )}

              </select>

            </label>


            <div className="flex items-center p-3">

              <button
                type="button"
                onClick={() =>
                  void searchPackages()
                }
                className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black hover:bg-orange-600"
              >
                <FaSearch />
                Paket Ara
              </button>

            </div>

          </div>


          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              "Tek Rezervasyon",
              "Seçkin Konaklama",
              "Aktivite & Transfer",
              "Doğrulanmış Paket",
            ].map(
              (
                item
              ) => (

                <div
                  key={
                    item
                  }
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <FaShieldAlt className="text-emerald-400" />
                  <div className="text-xs font-black">
                    {item}
                  </div>
                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* PACKAGE TYPES */}

      <section className="px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
            Tatilini Seç
          </div>

          <h2 className="mt-2 text-3xl font-black">
            Nasıl Bir Paket Arıyorsun?
          </h2>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            {packageTypes
              .filter(
                (
                  item
                ) =>
                  item.value
              )
              .map(
                (
                  item
                ) => {

                  const Icon =
                    item.icon;


                  return (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      onClick={() => {

                        setFilters({
                          ...filters,
                          packageType:
                            item.value,
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
                          <Icon />
                        </div>

                        <FaArrowRight className="text-slate-700 group-hover:text-orange-400" />

                      </div>


                      <div className="mt-4 font-black">
                        {item.label}
                      </div>


                      <div className="mt-1 text-[10px] leading-5 text-slate-500">
                        {item.description}
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
        ref={
          resultsRef
        }
        className="scroll-mt-24 border-t border-white/10 bg-[#091522] px-5 py-14 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Package Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Tatil Paketleri
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Paket ağı kontrol ediliyor..."
                  : `${results.length} paket bulundu`}
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
                  value={
                    sort
                  }
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

                  <option value="duration">
                    Süre Uzun
                  </option>
                </select>

                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

              </div>

            </div>

          </div>


          <div className="mt-7 grid gap-7 lg:grid-cols-[270px_1fr]">

            {/* FILTERS */}

            <aside className="hidden lg:block">

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#07111f] p-5">

                <h3 className="font-black">
                  Paket Filtreleri
                </h3>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Minimum Gece
                  </span>


                  <select
                    value={
                      filters.minNights
                    }
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        minNights:
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
                      2+ Gece
                    </option>

                    <option value="3">
                      3+ Gece
                    </option>

                    <option value="4">
                      4+ Gece
                    </option>

                    <option value="5">
                      5+ Gece
                    </option>
                  </select>

                </label>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Maksimum Fiyat
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
                    placeholder="Örn. 75000"
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3"
                  />

                </label>


                <div className="mt-5 rounded-xl border border-orange-500/15 bg-orange-500/[.04] p-4">

                  <div className="text-xs font-black text-orange-300">
                    Paket Mantığı
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Konaklama, tur, aktivite, transfer ve özel deneyimler tek ürün altında birleştirilebilir.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="mt-5 w-full rounded-xl border border-white/10 py-3 text-xs font-black text-slate-400"
                >
                  Filtreleri Temizle
                </button>

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
                    (
                      item
                    ) => (
                      <div
                        key={
                          item
                        }
                        className="h-[310px] animate-pulse rounded-[28px] bg-white/[.04]"
                      />
                    )
                  )}

                </div>

              ) : results.length ? (

                <div className="space-y-5">

                  {results.map(
                    (
                      item
                    ) => (

                      <article
                        key={
                          item.id
                        }
                        className="group grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:border-orange-500/30 hover:shadow-2xl md:grid-cols-[350px_1fr]"
                      >

                        <div className="relative min-h-[300px] overflow-hidden bg-slate-900">

                          {item.cover_url ? (

                            <img
                              src={
                                item.cover_url
                              }
                              alt={
                                item.name
                              }
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />

                          ) : (

                            <div className="flex h-full min-h-[300px] items-center justify-center text-slate-700">
                              <FaGift className="text-6xl" />
                            </div>

                          )}


                          {item.verified && (

                            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">
                              <FaCheckCircle />
                              DOĞRULANMIŞ
                            </div>

                          )}

                        </div>


                        <div className="flex flex-col p-5 md:p-6">

                          <div className="flex flex-wrap items-start justify-between gap-4">

                            <div>

                              <div className="text-[10px] font-black uppercase text-orange-400">
                                {typeLabel(
                                  item.package_type
                                )}
                              </div>


                              <h3 className="mt-2 text-2xl font-black">
                                {item.name}
                              </h3>


                              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">

                                <FaMapMarkerAlt className="text-orange-400" />

                                {[item.city, item.district]
                                  .filter(Boolean)
                                  .join(" · ")}

                              </div>


                              {item.short_description && (

                                <p className="mt-3 line-clamp-2 text-xs leading-6 text-slate-500">
                                  {item.short_description}
                                </p>

                              )}

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

                              {item.old_price &&
                                item.old_price >
                                  item.base_price && (

                                <div className="text-[10px] text-slate-600 line-through">
                                  {money(
                                    item.old_price,
                                    item.currency
                                  )}
                                </div>

                              )}


                              <div className="mt-1 text-2xl font-black text-orange-400">
                                {money(
                                  item.base_price,
                                  item.currency
                                )}
                              </div>


                              <div className="text-[9px] text-slate-600">
                                kişi başı başlangıç
                              </div>

                            </div>

                          </div>


                          <div className="mt-5 grid gap-2 sm:grid-cols-4">

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] uppercase text-slate-600">
                                Süre
                              </div>

                              <div className="mt-1 font-black">
                                {item.nights} Gece · {item.days} Gün
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] uppercase text-slate-600">
                                Konaklama
                              </div>

                              <div className="mt-1 font-black">
                                {item.accommodation_type ||
                                  "Paket Konaklama"}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] uppercase text-slate-600">
                                Pansiyon
                              </div>

                              <div className="mt-1 font-black">
                                {item.meal_plan ||
                                  "Programa Göre"}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] uppercase text-slate-600">
                                Transfer
                              </div>

                              <div className={`mt-1 font-black ${
                                item.transfer_included
                                  ? "text-emerald-300"
                                  : ""
                              }`}>
                                {item.transfer_included
                                  ? "Dahil"
                                  : "Programa Göre"}
                              </div>

                            </div>

                          </div>


                          <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-5">

                            <div>

                              <div className="text-[9px] uppercase text-slate-600">
                                Sonraki Tarih
                              </div>

                              <div className="mt-1 text-xs font-black text-slate-300">
                                {item.next_departure
                                  ? new Date(
                                      `${item.next_departure}T12:00:00`
                                    ).toLocaleDateString(
                                      "tr-TR",
                                      {
                                        day:
                                          "2-digit",
                                        month:
                                          "long",
                                        year:
                                          "numeric",
                                      }
                                    )
                                  : "Tarih yakında açıklanacak"}
                              </div>

                              {item.available_capacity !==
                                null && (

                                <div className="mt-1 text-[9px] font-black text-emerald-300">
                                  {item.available_capacity} kişilik kontenjan
                                </div>

                              )}

                            </div>


                            <Link
                              href={{
                                pathname:
                                  `/paketler/${item.slug}`,

                                query: {
                                  guests:
                                    String(
                                      filters.guests
                                    ),
                                },
                              }}
                              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black hover:bg-orange-600"
                            >
                              Paketi İncele
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
                      Gerçek paketler Marketplace&apos;e açılana kadar aşağıdaki örnek paketler yalnızca tasarımı gösterir ve satışa açık değildir.
                    </p>

                  </div>


                  <div className="mt-5 grid gap-5 md:grid-cols-3">

                    {previewPackages.map(
                      (
                        item
                      ) => (

                        <article
                          key={
                            item.name
                          }
                          className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1825]"
                        >

                          <div className="relative aspect-[4/3] overflow-hidden">

                            <img
                              src={
                                item.image
                              }
                              alt={
                                item.name
                              }
                              className="h-full w-full object-cover"
                            />


                            <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-[8px] font-black text-orange-300">
                              TASARIM ÖNİZLEME
                            </div>

                          </div>


                          <div className="p-4">

                            <div className="text-[9px] text-orange-400">
                              {item.type}
                            </div>


                            <h3 className="mt-2 text-lg font-black">
                              {item.name}
                            </h3>


                            <div className="mt-2 text-[10px] text-slate-500">
                              {item.location}
                            </div>


                            <div className="mt-4 flex flex-wrap gap-2">

                              {item.included.map(
                                (
                                  included
                                ) => (

                                  <span
                                    key={
                                      included
                                    }
                                    className="rounded-full bg-white/[.05] px-3 py-1.5 text-[8px] text-slate-400"
                                  >
                                    {included}
                                  </span>

                                )
                              )}

                            </div>


                            <div className="mt-5 border-t border-white/10 pt-4">

                              <div className="text-[9px] text-slate-600">
                                {item.nights} Gece · {item.days} Gün
                              </div>

                              <div className="mt-1 text-xl font-black text-orange-400">
                                {money(
                                  item.price
                                )}
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
              Turobus Package Network
            </div>


            <h2 className="mt-2 max-w-2xl text-3xl font-black">
              Tek ürün değil. Tatilin tamamını tek rezervasyonda birleştiren sistem.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Konaklama",
                  "Otel veya villa paket bileşeni olabilir.",
                ],
                [
                  "Aktivite & Tur",
                  "Deneyimler tek paket altında birleştirilebilir.",
                ],
                [
                  "Transfer & Yat",
                  "VIP transfer ve özel deniz deneyimi eklenebilir.",
                ],
                [
                  "Tek Rezervasyon",
                  "Müşteri bütün tatil deneyimini tek rezervasyon üzerinden satın alır.",
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


          <div className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-7">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS PACKAGE
            </div>

            <div className="mt-4 text-4xl font-black leading-tight">
              Konaklama.
              <br />
              Deneyim.
              <br />
              Transfer.
              <br />
              Tek Paket.
            </div>

          </div>

        </div>

      </section>


      {/* MOBILE FILTER */}

      {mobileFilters && (

        <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-md">

          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#091522] p-5">

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-black">
                Paket Filtreleri
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
                Minimum Gece
              </span>

              <select
                value={
                  filters.minNights
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    minNights:
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
                  2+ Gece
                </option>
                <option value="3">
                  3+ Gece
                </option>
                <option value="4">
                  4+ Gece
                </option>
                <option value="5">
                  5+ Gece
                </option>
              </select>

            </label>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Maksimum Fiyat
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
