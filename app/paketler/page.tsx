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
  FaBus,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaFilter,
  FaGift,
  FaGlobeEurope,
  FaHeart,
  FaHotel,
  FaMapMarkerAlt,
  FaPlane,
  FaSearch,
  FaShip,
  FaShieldAlt,
  FaSpa,
  FaStar,
  FaSuitcase,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type ComponentPreview = {
  id: string;
  component_key: string;
  component_type: string;
  title: string;
  image_url: string | null;
  is_included: boolean;
  is_optional: boolean;
  is_gift_option: boolean;
};


type PackageItem = {
  id: string;
  slug: string;
  name: string;

  package_type: string;
  travel_scope: string;

  country: string | null;
  destination_region: string | null;

  city: string | null;
  district: string | null;

  accommodation_mode: string;
  transport_mode: string;
  package_mode: string;
  experience_theme: string | null;

  short_description: string | null;
  hero_caption: string | null;

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

  gift_choice_count: number;
  customizable: boolean;

  badge_labels: string[];

  featured: boolean;
  verified: boolean;

  next_departure: string | null;
  available_capacity: number | null;

  included_component_count: number;
  optional_component_count: number;
  gift_component_count: number;

  component_preview: ComponentPreview[];
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
    icon: FaSuitcase,
  },
  {
    value: "holiday",
    label: "Tatil",
    icon: FaHotel,
  },
  {
    value: "honeymoon",
    label: "Balayı",
    icon: FaHeart,
  },
  {
    value: "family",
    label: "Aile",
    icon: FaUsers,
  },
  {
    value: "adventure",
    label: "Macera",
    icon: FaPlane,
  },
  {
    value: "premium",
    label: "Seçkin",
    icon: FaStar,
  },
];


const scopeOptions = [
  {
    value: "",
    label: "Yurt İçi & Yurt Dışı",
  },
  {
    value: "domestic",
    label: "Yurt İçi",
  },
  {
    value: "international",
    label: "Yurt Dışı",
  },
];


const accommodationOptions = [
  {
    value: "",
    label: "Otel & Villa",
  },
  {
    value: "hotel",
    label: "Otel Paketleri",
  },
  {
    value: "villa",
    label: "Villa Paketleri",
  },
  {
    value: "mixed",
    label: "Karma Konaklama",
  },
];


const previewPackages = [
  {
    name:
      "Fethiye Seçkin Deneyim",
    subtitle:
      "Tatil Paketi",
    location:
      "Fethiye · Türkiye",
    nights:
      4,
    days:
      5,
    price:
      52990,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=90",
    experiences: [
      "Seçkin Otel",
      "VIP Transfer",
      "Tekne Turu",
      "SPA & Wellness",
    ],
  },
  {
    name:
      "Ölüdeniz Balayı Collection",
    subtitle:
      "Balayı Paketi",
    location:
      "Ölüdeniz · Türkiye",
    nights:
      4,
    days:
      5,
    price:
      69990,
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=90",
    experiences: [
      "Jakuzili Otel",
      "VIP Havalimanı",
      "Gün Batımı Yatı",
      "Profesyonel Çekim",
    ],
  },
  {
    name:
      "Dubai Signature Escape",
    subtitle:
      "Yurt Dışı Paket",
    location:
      "Dubai · BAE",
    nights:
      4,
    days:
      5,
    price:
      89900,
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=90",
    experiences: [
      "Uçuş",
      "5★ Otel",
      "Havalimanı Transfer",
      "Çöl Deneyimi",
    ],
  },
];


const componentIcons:
  Record<string, typeof FaGift> = {
    accommodation:
      FaHotel,

    flight:
      FaPlane,

    bus:
      FaBus,

    transfer:
      FaSuitcase,

    activity:
      FaStar,

    tour:
      FaMapMarkerAlt,

    yacht:
      FaShip,

    boat:
      FaShip,

    spa:
      FaSpa,

    wellness:
      FaSpa,

    dining:
      FaGift,

    photography:
      FaGift,

    guide:
      FaMapMarkerAlt,

    gift:
      FaGift,

    insurance:
      FaShieldAlt,

    other:
      FaGift,
};


const money = (
  value: number,
  currency = "TRY"
) =>
  new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency,

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value || 0
    )
  );


function packageLabel(
  type: string
) {
  return (
    packageTypes.find(
      (
        item
      ) =>
        item.value ===
        type
    )?.label ??
    type
  );
}


function accommodationLabel(
  mode: string
) {

  const labels:
    Record<string,string> = {
      hotel:
        "Otel",

      villa:
        "Villa",

      mixed:
        "Otel / Villa",

      none:
        "Konaklamasız",
  };


  return (
    labels[mode] ??
    mode
  );

}


function transportLabel(
  mode: string
) {

  const labels:
    Record<string,string> = {
      flight:
        "Uçaklı",

      bus:
        "Otobüslü",

      mixed:
        "Karma Ulaşım",

      own:
        "Kendi Ulaşımı",

      none:
        "Ulaşım Hariç",
  };


  return (
    labels[mode] ??
    mode
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
      destination:
        "",

      packageType:
        "",

      travelScope:
        "",

      accommodationMode:
        "",

      guests:
        2,

      startDate:
        "",

      maxPrice:
        "",

      minNights:
        0,
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
            "get_public_package_marketplace_v2",
            {
              p_destination:
                next.destination ||
                null,

              p_package_type:
                next.packageType ||
                null,

              p_travel_scope:
                next.travelScope ||
                null,

              p_accommodation_mode:
                next.accommodationMode ||
                null,

              p_guests:
                next.guests ||
                null,

              p_start_date:
                next.startDate ||
                null,
            }
          );


        if (
          rpcError
        ) {

          setError(
            rpcError.message
          );

          setPackages([]);

        } else {

          setPackages(
            (
              data ??
              []
            ) as PackageItem[]
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
                    5 +
                  Number(
                    a.customizable
                  ) *
                    2;


                const bScore =
                  Number(
                    b.featured
                  ) *
                    10 +
                  Number(
                    b.verified
                  ) *
                    5 +
                  Number(
                    b.customizable
                  ) *
                    2;


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
      destination:
        "",

      packageType:
        "",

      travelScope:
        "",

      accommodationMode:
        "",

      guests:
        2,

      startDate:
        "",

      maxPrice:
        "",

      minNights:
        0,
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


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/87 to-[#06101b]/30" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/25" />


        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">

          <div className="grid items-end gap-10 lg:grid-cols-[1fr_.72fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-300 backdrop-blur-xl">

                <FaGift />

                Turobus Experience Packages

              </div>


              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.93] tracking-tight md:text-7xl">

                Bir Paket Değil.

                <span className="mt-3 block text-orange-500">
                  Tatilin Tamamı.
                </span>

              </h1>


              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Yurt içi veya yurt dışı.
                Otel veya villa.
                Ulaşım, VIP transfer,
                aktiviteler, SPA, yat ve
                özel deneyimler tek
                rezervasyonda.

              </p>

            </div>


            <div className="hidden lg:block">

              <div className="ml-auto max-w-[430px] rounded-[30px] border border-white/15 bg-black/30 p-6 backdrop-blur-2xl">

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
                  Turobus Paket
                </div>


                <div className="mt-4 text-3xl font-black">
                  Tatilin her parçası tek deneyimde.
                </div>


                <div className="mt-6 grid grid-cols-2 gap-2">

                  {[
                    "Otel / Villa",
                    "Uçak / Otobüs",
                    "VIP Transfer",
                    "Aktiviteler",
                    "SPA & Wellness",
                    "Tekne / Yat",
                    "Özel Yemek",
                    "Hediye Seçimi",
                  ].map(
                    (
                      item
                    ) => (

                      <div
                        key={
                          item
                        }
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-[10px] font-bold"
                      >

                        <FaCheck className="shrink-0 text-emerald-400" />

                        {item}

                      </div>

                    )
                  )}

                </div>

              </div>

            </div>

          </div>


          {/* MAIN SEARCH */}

          <div className="mt-10 grid overflow-hidden rounded-[24px] border border-white/15 bg-[#081522]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid-cols-[1.2fr_.85fr_.8fr_.75fr_auto]">

            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">

                <FaMapMarkerAlt />

                Destinasyon

              </span>


              <input
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
                placeholder="Fethiye, Dubai, Paris..."
                className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-600"
              />

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">

                <FaGlobeEurope />

                Bölge

              </span>


              <select
                value={
                  filters.travelScope
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,

                    travelScope:
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              >

                {scopeOptions.map(
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

                Paket Bul

              </button>

            </div>

          </div>


          {/* QUICK FILTERS */}

          <div className="mt-4 flex flex-wrap gap-2">

            {packageTypes.map(
              (
                type
              ) => {

                const Icon =
                  type.icon;


                return (
                  <button
                    key={
                      type.value
                    }
                    type="button"
                    onClick={() =>
                      setFilters({
                        ...filters,

                        packageType:
                          type.value,
                      })
                    }
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition ${
                      filters.packageType ===
                      type.value
                        ? "border-orange-500 bg-orange-500"
                        : "border-white/10 bg-black/30 text-slate-400"
                    }`}
                  >

                    <Icon />

                    {type.label}

                  </button>
                );

              }
            )}

          </div>


          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              "Tek Rezervasyon",
              "Yurt İçi & Yurt Dışı",
              "Otel veya Villa",
              "Deneyimler Dahil",
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


      {/* DISCOVERY */}

      <section className="px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
            Paket Dünyası
          </div>


          <h2 className="mt-2 text-3xl font-black">
            Tatilini Nasıl Yaşamak İstersin?
          </h2>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              {
                title:
                  "Yurt İçi Paketler",

                description:
                  "Türkiye'nin en iyi destinasyonları",

                scope:
                  "domestic",

                accommodation:
                  "",

                icon:
                  FaMapMarkerAlt,
              },
              {
                title:
                  "Yurt Dışı Paketler",

                description:
                  "Uçuş, otel ve deneyim bir arada",

                scope:
                  "international",

                accommodation:
                  "",

                icon:
                  FaGlobeEurope,
              },
              {
                title:
                  "Otel Paketleri",

                description:
                  "Otel + deneyimler + transfer",

                scope:
                  "",

                accommodation:
                  "hotel",

                icon:
                  FaHotel,
              },
              {
                title:
                  "Villa Paketleri",

                description:
                  "Özel villa + seçkin deneyimler",

                scope:
                  "",

                accommodation:
                  "villa",

                icon:
                  FaBed,
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

                      setFilters({
                        ...filters,

                        travelScope:
                          item.scope,

                        accommodationMode:
                          item.accommodation,
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
                      {item.title}
                    </div>


                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {item.description}
                    </div>

                  </button>
                );

              }
            )}

          </div>


          {/* EXPERIENCE CATEGORIES */}

          <div className="mt-10 rounded-[30px] border border-white/10 bg-[#0b1825] p-6">

            <div className="flex flex-wrap items-end justify-between gap-4">

              <div>

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-400">
                  Bir Paketin İçinde
                </div>

                <h3 className="mt-2 text-2xl font-black">
                  Tatilin Tüm Deneyimleri
                </h3>

              </div>


              <div className="text-xs text-slate-500">
                Pakete göre dahil veya opsiyonel
              </div>

            </div>


            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">

              {[
                [
                  "Otel / Villa",
                  FaHotel,
                ],
                [
                  "Uçak / Otobüs",
                  FaPlane,
                ],
                [
                  "VIP Transfer",
                  FaSuitcase,
                ],
                [
                  "Aktiviteler",
                  FaStar,
                ],
                [
                  "SPA & Wellness",
                  FaSpa,
                ],
                [
                  "Tekne / Yat",
                  FaShip,
                ],
                [
                  "Özel Akşam Yemeği",
                  FaGift,
                ],
                [
                  "Profesyonel Çekim",
                  FaGift,
                ],
              ].map(
                ([
                  label,
                  Icon,
                ]) => {

                  const TypedIcon =
                    Icon as typeof FaGift;


                  return (
                    <div
                      key={
                        String(
                          label
                        )
                      }
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"
                    >

                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                        <TypedIcon />
                      </div>

                      <span className="text-xs font-black">
                        {String(
                          label
                        )}
                      </span>

                    </div>
                  );

                }
              )}

            </div>

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
                Experience Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Tatil Deneyimleri
              </h2>

              <p className="mt-2 text-sm text-slate-500">

                {loading
                  ? "Package Network kontrol ediliyor..."
                  : `${results.length} uygun paket bulundu`}

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

            {/* FILTER SIDEBAR */}

            <aside className="hidden lg:block">

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#07111f] p-5">

                <h3 className="font-black">
                  Paket Filtreleri
                </h3>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Konaklama
                  </span>


                  <select
                    value={
                      filters.accommodationMode
                    }
                    onChange={(event) =>
                      setFilters({
                        ...filters,

                        accommodationMode:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3 text-sm"
                  >

                    {accommodationOptions.map(
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
                        >
                          {item.label}
                        </option>

                      )
                    )}

                  </select>

                </label>


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
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3 text-sm"
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

                    <option value="7">
                      7+ Gece
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
                    placeholder="Örn. 100000"
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3 text-sm"
                  />

                </label>


                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="mt-5 w-full rounded-xl border border-white/10 py-3 text-xs font-black text-slate-400"
                >
                  Filtreleri Temizle
                </button>


                <div className="mt-5 rounded-xl border border-orange-500/15 bg-orange-500/[.04] p-4">

                  <div className="text-xs font-black text-orange-300">
                    Deneyim Paketi
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Bir paket; konaklama, ulaşım, transfer ve birden fazla deneyimi tek rezervasyonda birleştirebilir.
                  </p>

                </div>

              </div>

            </aside>


            {/* PACKAGE LIST */}

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
                        className="h-[330px] animate-pulse rounded-[28px] bg-white/[.04]"
                      />

                    )
                  )}

                </div>

              ) : results.length >
                0 ? (

                <div className="space-y-5">

                  {results.map(
                    (
                      item
                    ) => (

                      <article
                        key={
                          item.id
                        }
                        className="group grid overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1825] transition hover:border-orange-500/30 hover:shadow-2xl md:grid-cols-[370px_1fr]"
                      >

                        {/* IMAGE */}

                        <div className="relative min-h-[330px] overflow-hidden bg-slate-900">

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

                            <div className="flex h-full min-h-[330px] items-center justify-center text-slate-700">

                              <FaGift className="text-6xl" />

                            </div>

                          )}


                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />


                          <div className="absolute left-4 top-4 flex flex-wrap gap-2">

                            <span className="rounded-full bg-orange-500 px-3 py-1.5 text-[8px] font-black">

                              {item.travel_scope ===
                              "international"
                                ? "YURT DIŞI"
                                : "YURT İÇİ"}

                            </span>


                            {item.verified && (

                              <span className="flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">

                                <FaCheckCircle />

                                DOĞRULANMIŞ

                              </span>

                            )}


                            {item.customizable && (

                              <span className="rounded-full bg-white/90 px-3 py-1.5 text-[8px] font-black text-slate-950">
                                ÖZELLEŞTİRİLEBİLİR
                              </span>

                            )}

                          </div>


                          <div className="absolute bottom-4 left-4 right-4">

                            <div className="text-[9px] font-black uppercase tracking-[.14em] text-orange-300">
                              {packageLabel(
                                item.package_type
                              )} Paketi
                            </div>

                            <div className="mt-1 text-xl font-black">
                              {item.hero_caption ||
                                "Tatilin tamamı tek deneyimde"}
                            </div>

                          </div>

                        </div>


                        {/* CONTENT */}

                        <div className="flex flex-col p-5 md:p-6">

                          <div className="flex flex-wrap items-start justify-between gap-5">

                            <div>

                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">

                                <span className="flex items-center gap-1.5">

                                  <FaMapMarkerAlt className="text-orange-400" />

                                  {[
                                    item.district,
                                    item.city,
                                    item.country,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}

                                </span>

                              </div>


                              <h3 className="mt-3 text-2xl font-black">
                                {item.name}
                              </h3>


                              {item.short_description && (

                                <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-6 text-slate-500">
                                  {item.short_description}
                                </p>

                              )}

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

                              {item.old_price &&
                                item.old_price >
                                  item.base_price && (

                                <div className="text-xs text-slate-600 line-through">
                                  {money(
                                    item.old_price,
                                    item.currency
                                  )}
                                </div>

                              )}


                              <div className="text-2xl font-black text-orange-400">
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


                          {/* PRODUCT INFO */}

                          <div className="mt-5 grid gap-2 sm:grid-cols-4">

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] uppercase text-slate-600">
                                Süre
                              </div>

                              <div className="mt-1 text-xs font-black">
                                {item.nights} Gece · {item.days} Gün
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] uppercase text-slate-600">
                                Konaklama
                              </div>

                              <div className="mt-1 text-xs font-black">
                                {accommodationLabel(
                                  item.accommodation_mode
                                )}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] uppercase text-slate-600">
                                Ulaşım
                              </div>

                              <div className="mt-1 text-xs font-black">
                                {transportLabel(
                                  item.transport_mode
                                )}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <div className="text-[9px] uppercase text-slate-600">
                                Deneyim
                              </div>

                              <div className="mt-1 text-xs font-black">
                                {item.included_component_count} dahil
                              </div>

                            </div>

                          </div>


                          {/* EXPERIENCES */}

                          {item.component_preview?.length >
                            0 && (

                            <div className="mt-5">

                              <div className="mb-2 text-[9px] font-black uppercase text-slate-600">
                                Paket Deneyimleri
                              </div>


                              <div className="flex flex-wrap gap-2">

                                {item.component_preview
                                  .slice(
                                    0,
                                    6
                                  )
                                  .map(
                                    (
                                      component
                                    ) => {

                                      const Icon =
                                        componentIcons[
                                          component.component_type
                                        ] ??
                                        FaGift;


                                      return (
                                        <span
                                          key={
                                            component.id
                                          }
                                          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-2 text-[9px] font-bold text-slate-300"
                                        >

                                          <Icon className="text-orange-400" />

                                          {component.title}

                                          {component.is_gift_option && (
                                            <FaGift className="text-emerald-400" />
                                          )}

                                        </span>
                                      );

                                    }
                                  )}

                              </div>

                            </div>

                          )}


                          <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-5">

                            <div>

                              <div className="text-[9px] uppercase text-slate-600">
                                Paket Avantajları
                              </div>


                              <div className="mt-2 flex flex-wrap gap-3 text-[9px] font-black">

                                {item.gift_choice_count >
                                  0 && (

                                  <span className="text-emerald-300">
                                    🎁 {item.gift_choice_count} hediye seçimi
                                  </span>

                                )}


                                {item.optional_component_count >
                                  0 && (

                                  <span className="text-cyan-300">
                                    + {item.optional_component_count} opsiyonel deneyim
                                  </span>

                                )}


                                {item.next_departure && (

                                  <span className="text-slate-400">
                                    📅 {new Date(
                                      `${item.next_departure}T12:00:00`
                                    ).toLocaleDateString(
                                      "tr-TR"
                                    )}
                                  </span>

                                )}

                              </div>

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

                              Deneyimi İncele

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
                      Turobus Experience Marketplace
                    </div>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      Gerçek Package OS ürünleri Marketplace&apos;e açıldığında aşağıdaki tasarım örneklerinin yerine otomatik olarak gerçek paketler gelir.
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
                          className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825]"
                        >

                          <div className="relative aspect-[4/3] overflow-hidden">

                            <img
                              src={
                                item.image
                              }
                              alt={
                                item.name
                              }
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />


                            <div className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1.5 text-[8px] font-black text-orange-300">
                              TASARIM ÖNİZLEME
                            </div>

                          </div>


                          <div className="p-5">

                            <div className="text-[9px] font-black uppercase text-orange-400">
                              {item.subtitle}
                            </div>

                            <h3 className="mt-2 text-xl font-black">
                              {item.name}
                            </h3>

                            <div className="mt-2 text-[10px] text-slate-500">
                              {item.location}
                            </div>


                            <div className="mt-4 flex flex-wrap gap-2">

                              {item.experiences.map(
                                (
                                  experience
                                ) => (

                                  <span
                                    key={
                                      experience
                                    }
                                    className="rounded-full bg-white/[.05] px-3 py-1.5 text-[8px] text-slate-400"
                                  >
                                    {experience}
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


      {/* EXPERIENCE NETWORK */}

      <section className="border-t border-white/10 px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.8fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Turobus Experience Engine
            </div>

            <h2 className="mt-2 max-w-3xl text-3xl font-black">
              Otel satmıyoruz. Villa satmıyoruz. Aktivite satmıyoruz. Tatilin tamamını bir araya getiriyoruz.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Konaklama",
                  "Hotel OS veya Villa OS kaynağından paket konaklaması.",
                ],
                [
                  "Ulaşım",
                  "Uçaklı, otobüslü veya ulaşım hariç paket.",
                ],
                [
                  "Deneyimler",
                  "Aktivite, SPA, wellness, tekne, yat, yemek ve özel hizmetler.",
                ],
                [
                  "Tek Rezervasyon",
                  "Tüm tatil bileşenleri tek paket ve tek müşteri akışında.",
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


          <div className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-orange-500/[.03] to-transparent p-7">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS PACKAGE
            </div>

            <div className="mt-4 text-4xl font-black leading-tight">

              Konakla.
              <br />

              Keşfet.
              <br />

              Deneyimle.
              <br />

              Tek Pakette.

            </div>

          </div>

        </div>

      </section>


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
                Bölge
              </span>

              <select
                value={
                  filters.travelScope
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,

                    travelScope:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              >

                {scopeOptions.map(
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
                    >
                      {item.label}
                    </option>

                  )
                )}

              </select>

            </label>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Konaklama
              </span>

              <select
                value={
                  filters.accommodationMode
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,

                    accommodationMode:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              >

                {accommodationOptions.map(
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
                    >
                      {item.label}
                    </option>

                  )
                )}

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
