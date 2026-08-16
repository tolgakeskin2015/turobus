"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

import {
  FaArrowRight,
  FaBed,
  FaBus,
  FaCalendarAlt,
  FaCar,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaGift,
  FaGlobeEurope,
  FaHeart,
  FaHotel,
  FaMapMarkerAlt,
  FaPlane,
  FaRoute,
  FaSearch,
  FaShip,
  FaShieldAlt,
  FaSpa,
  FaStar,
  FaSuitcase,
  FaUsers,
  FaWater,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import BackToTop from "@/components/home/BackToTop";
import MobileBottomNav from "@/components/home/MobileBottomNav";


type ProductKey =
  | "package"
  | "hotel"
  | "villa"
  | "tour"
  | "activity"
  | "yacht"
  | "transfer";


type Product = {
  key: ProductKey;
  title: string;
  short: string;
  subtitle: string;
  href: string;
  image: string;
  icon: typeof FaGift;
  badge: string;
};


const products: Product[] = [
  {
    key: "package",
    title: "Tatil Paketleri",
    short: "Paket",
    subtitle:
      "Konaklama, ulaşım ve deneyimlerin tamamı tek rezervasyonda.",
    href: "/paketler",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=92",
    icon: FaGift,
    badge: "TATİLİN TAMAMI",
  },
  {
    key: "hotel",
    title: "Oteller",
    short: "Otel",
    subtitle:
      "Şehir, resort, butik ve seçkin oteller.",
    href: "/oteller",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=92",
    icon: FaHotel,
    badge: "KONAKLAMA",
  },
  {
    key: "villa",
    title: "Villalar",
    short: "Villa",
    subtitle:
      "Özel havuzlu, aile ve balayı villaları.",
    href: "/villalar",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=92",
    icon: FaBed,
    badge: "ÖZEL YAŞAM",
  },
  {
    key: "tour",
    title: "Turlar",
    short: "Tur",
    subtitle:
      "Otobüslü ve uçaklı yurt içi / yurt dışı rotalar.",
    href: "/turlar",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=92",
    icon: FaGlobeEurope,
    badge: "ROTA",
  },
  {
    key: "activity",
    title: "Aktiviteler",
    short: "Aktivite",
    subtitle:
      "Deniz, doğa, macera ve adrenalin deneyimleri.",
    href: "/aktiviteler",
    image:
      "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1600&q=92",
    icon: FaStar,
    badge: "DENEYİM",
  },
  {
    key: "yacht",
    title: "Yat & Tekne",
    short: "Yat",
    subtitle:
      "Motor yat, gulet, katamaran ve özel tekneler.",
    href: "/yatlar",
    image:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1600&q=92",
    icon: FaShip,
    badge: "DENİZ",
  },
  {
    key: "transfer",
    title: "VIP Transfer",
    short: "Transfer",
    subtitle:
      "Havalimanı, marina ve şehirler arası özel transfer.",
    href: "/transfer",
    image:
      "https://images.unsplash.com/photo-1515569067071-ec3b51335dd0?auto=format&fit=crop&w=1600&q=92",
    icon: FaCar,
    badge: "ULAŞIM",
  },
];


const collections = [
  {
    kicker: "JUST FOR TWO",
    title: "Balayı Collection",
    text:
      "Jakuzili konaklama, VIP transfer, SPA, gün batımı yatı ve çiftlere özel deneyimler.",
    href:
      "/paketler?packageType=honeymoon",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=92",
    icon: FaHeart,
  },
  {
    kicker: "BLUE EXPERIENCE",
    title: "Sea Collection",
    text:
      "Villa, koylar, yat, tekne ve Akdeniz deneyimlerini tek tatilde birleştir.",
    href:
      "/paketler",
    image:
      "https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&w=1600&q=92",
    icon: FaShip,
  },
  {
    kicker: "RESET YOURSELF",
    title: "Wellness Collection",
    text:
      "SPA, wellness, seçkin otel ve kişisel yenilenme deneyimleri.",
    href:
      "/paketler",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=92",
    icon: FaSpa,
  },
  {
    kicker: "WORLD JOURNEYS",
    title: "International Collection",
    text:
      "Uçuş, otel, transfer ve destinasyon deneyimleriyle yurt dışı tatilleri.",
    href:
      "/paketler?travelScope=international",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=92",
    icon: FaPlane,
  },
];


const destinations = [
  {
    name: "Fethiye",
    country: "Türkiye",
    text: "Villa · Aktivite · Yat · Transfer",
    href: "/paketler?destination=Fethiye",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=92",
  },
  {
    name: "Bodrum",
    country: "Türkiye",
    text: "Otel · Villa · Yat",
    href: "/paketler?destination=Bodrum",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=92",
  },
  {
    name: "Antalya",
    country: "Türkiye",
    text: "Otel · Tur · Aktivite",
    href: "/paketler?destination=Antalya",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=92",
  },
  {
    name: "Dubai",
    country: "BAE",
    text: "Uçuş · Otel · VIP Transfer",
    href: "/paketler?destination=Dubai",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=92",
  },
];


function today() {
  const value =
    new Date();

  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      value.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}


export default function Home() {

  const router =
    useRouter();


  const [
    activeKey,
    setActiveKey,
  ] =
    useState<ProductKey>(
      "package"
    );


  const [
    destination,
    setDestination,
  ] =
    useState("");


  const [
    startDate,
    setStartDate,
  ] =
    useState("");


  const [
    endDate,
    setEndDate,
  ] =
    useState("");


  const [
    guests,
    setGuests,
  ] =
    useState(2);


  const [
    tripStyle,
    setTripStyle,
  ] =
    useState("all");


  const active =
    useMemo(
      () =>
        products.find(
          (
            item
          ) =>
            item.key ===
            activeKey
        ) ??
        products[0],
      [
        activeKey,
      ]
    );


  function search() {

    const params =
      new URLSearchParams();


    if (
      destination.trim()
    ) {

      params.set(
        "destination",
        destination.trim()
      );

    }


    if (
      startDate
    ) {

      params.set(
        "date",
        startDate
      );

      params.set(
        "checkIn",
        startDate
      );

    }


    if (
      endDate
    ) {

      params.set(
        "checkOut",
        endDate
      );

    }


    if (
      guests
    ) {

      params.set(
        "guests",
        String(
          guests
        )
      );

    }


    if (
      tripStyle !==
      "all"
    ) {

      params.set(
        "type",
        tripStyle
      );

    }


    const query =
      params.toString();


    router.push(
      query
        ? `${active.href}?${query}`
        : active.href
    );

  }


  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050d16] text-white">

      <Navbar />


      {/* ==================================================
          CINEMATIC MARKETPLACE HERO
      ================================================== */}

      <section className="relative min-h-[900px] overflow-hidden pt-20">

        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=94"
          alt="Turobus Travel Marketplace"
          className="absolute inset-0 h-full w-full object-cover"
        />


        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(249,115,22,.15),transparent_35%)]" />

        <div className="absolute inset-0 bg-gradient-to-r from-[#050d16] via-[#050d16]/94 to-[#050d16]/30" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050d16] via-transparent to-[#050d16]/30" />


        <div className="relative mx-auto max-w-[1450px] px-5 pb-20 pt-14 lg:px-8 lg:pt-24">

          <div className="grid items-end gap-10 xl:grid-cols-[1.15fr_.65fr]">

            <div>

              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 backdrop-blur-xl">

                <span className="relative flex h-2.5 w-2.5">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />

                </span>

                <span className="text-[10px] font-black uppercase tracking-[.22em] text-slate-200">
                  One Travel Marketplace
                </span>

              </div>


              <h1 className="mt-8 max-w-5xl text-[56px] font-black leading-[.88] tracking-[-.055em] sm:text-7xl lg:text-[96px]">

                Bir Yere

                <span className="block">
                  Gitmek Değil.
                </span>

                <span className="mt-3 block bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300 bg-clip-text text-transparent">
                  Bir Deneyim Yaşamak.
                </span>

              </h1>


              <p className="mt-8 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Otel, villa, tur,
                aktivite, yat, transfer
                ve komple tatil
                paketlerini ayrı
                sitelerde arama.

                <strong className="font-black text-white">
                  {" "}
                  Turobus seyahatin bütün parçalarını
                  tek Marketplace&apos;te birleştirir.
                </strong>

              </p>


              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  href="/paketler"
                  className="group flex items-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black shadow-2xl shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  Tatilini Oluştur

                  <FaArrowRight className="transition group-hover:translate-x-1" />
                </Link>


                <a
                  href="#marketplace"
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-6 py-4 text-sm font-black backdrop-blur-xl transition hover:bg-white/10"
                >
                  Marketplace&apos;i Keşfet
                </a>

              </div>

            </div>


            {/* RIGHT FLOATING SYSTEM CARD */}

            <div className="hidden xl:block">

              <div className="relative ml-auto w-full max-w-[430px]">

                <div className="absolute -inset-10 rounded-full bg-orange-500/10 blur-3xl" />


                <div className="relative rounded-[34px] border border-white/15 bg-black/35 p-6 shadow-2xl backdrop-blur-2xl">

                  <div className="flex items-center justify-between">

                    <div>

                      <div className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                        TUROBUS EXPERIENCE OS
                      </div>

                      <div className="mt-2 text-xl font-black">
                        Tatilinin parçaları
                      </div>

                    </div>


                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500">
                      <FaRoute />
                    </div>

                  </div>


                  <div className="mt-6 space-y-2">

                    {[
                      [
                        FaHotel,
                        "Konaklama",
                        "Otel veya villa",
                      ],
                      [
                        FaPlane,
                        "Ulaşım",
                        "Uçak / otobüs / transfer",
                      ],
                      [
                        FaStar,
                        "Deneyimler",
                        "Tur ve aktiviteler",
                      ],
                      [
                        FaSpa,
                        "Özel Hizmetler",
                        "SPA & wellness",
                      ],
                      [
                        FaShip,
                        "Deniz",
                        "Yat & özel tekne",
                      ],
                    ].map(
                      ([
                        Icon,
                        title,
                        description,
                      ]) => {

                        const TypedIcon =
                          Icon as typeof FaHotel;


                        return (
                          <div
                            key={
                              String(
                                title
                              )
                            }
                            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.045] p-3.5"
                          >

                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                              <TypedIcon />
                            </div>


                            <div>

                              <div className="text-xs font-black">
                                {String(
                                  title
                                )}
                              </div>

                              <div className="mt-0.5 text-[9px] text-slate-500">
                                {String(
                                  description
                                )}
                              </div>

                            </div>


                            <FaCheckCircle className="ml-auto text-emerald-400" />

                          </div>
                        );

                      }
                    )}

                  </div>


                  <div className="mt-5 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">

                    <div className="text-[9px] font-black uppercase text-orange-300">
                      SONUÇ
                    </div>

                    <div className="mt-1 text-sm font-black">
                      Tek tatil · Tek rezervasyon · Tek sistem
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              SMART MARKETPLACE SEARCH
          ================================================== */}

          <div className="relative z-30 mt-14">

            <div className="rounded-[32px] border border-white/15 bg-[#07131f]/95 p-3 shadow-[0_30px_80px_rgba(0,0,0,.5)] backdrop-blur-2xl">

              {/* PRODUCT SELECTOR */}

              <div className="flex gap-2 overflow-x-auto px-1 pb-3">

                {products.map(
                  (
                    product
                  ) => {

                    const Icon =
                      product.icon;

                    const selected =
                      product.key ===
                      activeKey;


                    return (
                      <button
                        key={
                          product.key
                        }
                        type="button"
                        onClick={() =>
                          setActiveKey(
                            product.key
                          )
                        }
                        className={`flex min-w-fit items-center gap-2 rounded-xl px-4 py-3 text-[11px] font-black transition ${
                          selected
                            ? "bg-white text-slate-950"
                            : "text-slate-400 hover:bg-white/[.05] hover:text-white"
                        }`}
                      >

                        <Icon className={
                          selected
                            ? "text-orange-500"
                            : ""
                        } />

                        {product.short}

                      </button>
                    );

                  }
                )}

              </div>


              {/* SEARCH FORM */}

              <div className="grid overflow-visible rounded-[23px] border border-white/10 bg-[#050e18] lg:grid-cols-[1.25fr_.8fr_.8fr_.7fr_auto]">

                <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

                  <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-600">

                    <FaMapMarkerAlt />

                    {activeKey ===
                    "transfer"
                      ? "Nereden?"
                      : activeKey ===
                          "yacht"
                        ? "Marina / Bölge"
                        : "Nereye?"}

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
                      activeKey ===
                      "transfer"
                        ? "Dalaman Havalimanı..."
                        : activeKey ===
                            "yacht"
                          ? "Göcek, Fethiye..."
                          : "Fethiye, Bodrum, Dubai..."
                    }
                    className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-700"
                  />

                </label>


                <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

                  <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-600">

                    <FaCalendarAlt />

                    {activeKey ===
                    "tour"
                      ? "Tur Tarihi"
                      : activeKey ===
                          "activity"
                        ? "Aktivite Tarihi"
                        : activeKey ===
                            "transfer"
                          ? "Transfer Tarihi"
                          : "Başlangıç"}

                  </span>


                  <input
                    type="date"
                    min={
                      today()
                    }
                    value={
                      startDate
                    }
                    onChange={(event) =>
                      setStartDate(
                        event.target.value
                      )
                    }
                    className="w-full bg-transparent text-sm font-black outline-none"
                  />

                </label>


                <label className={`border-b border-white/10 p-5 lg:border-b-0 lg:border-r ${
                  activeKey ===
                    "tour" ||
                  activeKey ===
                    "activity"
                    ? "opacity-40"
                    : ""
                }`}>

                  <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-600">

                    {activeKey ===
                    "transfer"
                      ? (
                        <FaClock />
                      )
                      : (
                        <FaCalendarAlt />
                      )}

                    {activeKey ===
                    "transfer"
                      ? "Saat"
                      : activeKey ===
                            "tour" ||
                          activeKey ===
                            "activity"
                        ? "Tek Tarih"
                        : "Bitiş"}

                  </span>


                  {activeKey ===
                  "transfer" ? (

                    <input
                      type="time"
                      value={
                        endDate
                      }
                      onChange={(event) =>
                        setEndDate(
                          event.target.value
                        )
                      }
                      className="w-full bg-transparent text-sm font-black outline-none"
                    />

                  ) : (

                    <input
                      type="date"
                      min={
                        startDate ||
                        today()
                      }
                      disabled={
                        activeKey ===
                          "tour" ||
                        activeKey ===
                          "activity"
                      }
                      value={
                        endDate
                      }
                      onChange={(event) =>
                        setEndDate(
                          event.target.value
                        )
                      }
                      className="w-full bg-transparent text-sm font-black outline-none disabled:cursor-not-allowed"
                    />

                  )}

                </label>


                <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

                  <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-600">

                    <FaUsers />

                    {activeKey ===
                    "transfer"
                      ? "Yolcu"
                      : "Misafir"}

                  </span>


                  <select
                    value={
                      guests
                    }
                    onChange={(event) =>
                      setGuests(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-full bg-transparent text-sm font-black outline-none"
                  >

                    {Array.from(
                      {
                        length: 16,
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
                    onClick={
                      search
                    }
                    className="group flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-8 font-black transition hover:bg-orange-600"
                  >

                    <FaSearch />

                    Ara

                    <FaArrowRight className="text-xs transition group-hover:translate-x-1" />

                  </button>

                </div>

              </div>


              <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">

                <div className="flex items-center gap-2 text-[10px] text-slate-500">

                  <FaShieldAlt className="text-emerald-400" />

                  <strong className="text-slate-300">
                    {active.title}
                  </strong>

                  <span className="hidden sm:inline">
                    · {active.subtitle}
                  </span>

                </div>


                <Link
                  href={
                    active.href
                  }
                  className="flex items-center gap-2 text-[10px] font-black text-orange-400"
                >
                  Tümünü Gör
                  <FaArrowRight />
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          MARKETPLACE MAP
      ================================================== */}

      <section
        id="marketplace"
        className="relative px-5 py-24 lg:px-8"
      >

        <div className="mx-auto max-w-[1450px]">

          <div className="grid gap-12 xl:grid-cols-[.72fr_1.28fr]">

            <div className="xl:sticky xl:top-28 xl:self-start">

              <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
                MARKETPLACE UNIVERSE
              </div>


              <h2 className="mt-4 max-w-xl text-4xl font-black leading-[1.02] tracking-tight md:text-5xl">

                Seyahatin Her Parçası

                <span className="block text-slate-500">
                  Birbirine Bağlı.
                </span>

              </h2>


              <p className="mt-6 max-w-lg text-sm leading-7 text-slate-400">

                Turobus&apos;ta ürünler birbirinden kopuk değildir.
                Villa müşterisine transfer,
                otel müşterisine aktivite,
                yat müşterisine VIP ulaşım,
                hepsine komple paket sunulabilir.

              </p>


              <div className="mt-8 rounded-[26px] border border-orange-500/20 bg-orange-500/[.06] p-5">

                <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-300">
                  TUROBUS FARKI
                </div>

                <div className="mt-3 text-xl font-black">
                  Ürün Marketplace&apos;i değil,
                  deneyim ekosistemi.
                </div>

              </div>

            </div>


            {/* ASYMMETRIC PRODUCT WALL */}

            <div className="grid gap-4 md:grid-cols-2">

              {products.map(
                (
                  product,
                  index
                ) => {

                  const Icon =
                    product.icon;

                  const big =
                    index === 0 ||
                    index === 3 ||
                    index === 5;


                  return (
                    <Link
                      key={
                        product.key
                      }
                      href={
                        product.href
                      }
                      className={`group relative overflow-hidden rounded-[30px] border border-white/10 ${
                        big
                          ? "min-h-[470px]"
                          : "min-h-[330px]"
                      }`}
                    >

                      <img
                        src={
                          product.image
                        }
                        alt={
                          product.title
                        }
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />


                      <div className="absolute inset-0 bg-gradient-to-t from-[#050d16] via-[#050d16]/55 to-transparent" />


                      <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[8px] font-black tracking-[.16em] backdrop-blur-xl">
                        {product.badge}
                      </div>


                      <div className="absolute inset-x-0 bottom-0 p-6">

                        <div className="flex items-end justify-between gap-4">

                          <div>

                            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-orange-400 backdrop-blur-xl">
                              <Icon />
                            </div>


                            <h3 className="mt-4 text-2xl font-black">
                              {product.title}
                            </h3>


                            <p className="mt-2 max-w-md text-xs leading-6 text-slate-300">
                              {product.subtitle}
                            </p>

                          </div>


                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 transition group-hover:border-orange-500 group-hover:bg-orange-500">
                            <FaArrowRight />
                          </div>

                        </div>

                      </div>

                    </Link>
                  );

                }
              )}

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          TRAVEL BUILDER
      ================================================== */}

      <section className="border-y border-white/10 bg-[#08131f] px-5 py-24 lg:px-8">

        <div className="mx-auto max-w-[1450px]">

          <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[#050e18]">

            <div className="grid xl:grid-cols-[.95fr_1.05fr]">

              <div className="p-7 md:p-12 xl:p-14">

                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-[.18em] text-orange-300">

                  <FaGift />

                  EXPERIENCE BUILDER

                </div>


                <h2 className="mt-6 max-w-2xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">

                  Tatilini

                  <span className="block text-orange-500">
                    Kendin Oluştur.
                  </span>

                </h2>


                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">

                  Hazır paket seçebilir veya tatilin parçalarını
                  kendin birleştirebilirsin.

                </p>


                <div className="mt-9 space-y-2">

                  {[
                    [
                      FaMapMarkerAlt,
                      "01",
                      "Destinasyonu seç",
                      "Yurt içi veya yurt dışı",
                    ],
                    [
                      FaHotel,
                      "02",
                      "Konaklamanı seç",
                      "Otel veya özel villa",
                    ],
                    [
                      FaPlane,
                      "03",
                      "Ulaşımı ekle",
                      "Uçak, otobüs veya VIP transfer",
                    ],
                    [
                      FaStar,
                      "04",
                      "Deneyimini oluştur",
                      "Aktivite, SPA, tur, tekne veya yat",
                    ],
                    [
                      FaGift,
                      "05",
                      "Tek rezervasyonda tamamla",
                      "Bütün tatilin tek akışta",
                    ],
                  ].map(
                    ([
                      Icon,
                      number,
                      title,
                      description,
                    ]) => {

                      const TypedIcon =
                        Icon as typeof FaGift;


                      return (
                        <div
                          key={
                            String(
                              number
                            )
                          }
                          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-orange-500/30 hover:bg-white/[.05]"
                        >

                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                            <TypedIcon />
                          </div>


                          <div className="w-7 text-[10px] font-black text-slate-700">
                            {String(
                              number
                            )}
                          </div>


                          <div>

                            <div className="text-sm font-black">
                              {String(
                                title
                              )}
                            </div>

                            <div className="mt-1 text-[9px] text-slate-500">
                              {String(
                                description
                              )}
                            </div>

                          </div>


                          <FaCheck className="ml-auto text-emerald-400/70" />

                        </div>
                      );

                    }
                  )}

                </div>


                <Link
                  href="/paketler"
                  className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black transition hover:bg-orange-600"
                >
                  Tatilimi Oluştur
                  <FaArrowRight />
                </Link>

              </div>


              <div className="relative min-h-[650px] overflow-hidden">

                <img
                  src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=92"
                  alt="Turobus Experience Builder"
                  className="absolute inset-0 h-full w-full object-cover"
                />


                <div className="absolute inset-0 bg-gradient-to-r from-[#050e18] via-transparent to-transparent" />


                {/* FLOATING TRIP RECEIPT */}

                <div className="absolute bottom-6 left-6 right-6 max-w-[480px] rounded-[28px] border border-white/15 bg-black/55 p-5 backdrop-blur-2xl md:left-auto md:right-8">

                  <div className="flex items-start justify-between">

                    <div>

                      <div className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">
                        ÖRNEK TATİL DENEYİMİ
                      </div>

                      <div className="mt-2 text-xl font-black">
                        Fethiye Signature Escape
                      </div>

                    </div>


                    <div className="rounded-xl bg-emerald-400 px-3 py-2 text-[8px] font-black text-slate-950">
                      5 PARÇA
                    </div>

                  </div>


                  <div className="mt-5 grid grid-cols-2 gap-2">

                    {[
                      [
                        FaHotel,
                        "Seçkin Otel",
                      ],
                      [
                        FaCar,
                        "VIP Transfer",
                      ],
                      [
                        FaSpa,
                        "SPA & Wellness",
                      ],
                      [
                        FaShip,
                        "Gün Batımı Yatı",
                      ],
                      [
                        FaStar,
                        "Özel Aktivite",
                      ],
                      [
                        FaGift,
                        "Hediye Seçimi",
                      ],
                    ].map(
                      ([
                        Icon,
                        label,
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
                            className="flex items-center gap-2 rounded-xl bg-white/[.08] p-3"
                          >

                            <TypedIcon className="text-orange-400" />

                            <span className="text-[9px] font-black">
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

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          COLLECTIONS
      ================================================== */}

      <section className="px-5 py-24 lg:px-8">

        <div className="mx-auto max-w-[1450px]">

          <div className="flex flex-wrap items-end justify-between gap-6">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
                TUROBUS COLLECTIONS
              </div>

              <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                Paket Değil.
                <span className="text-slate-500">
                  {" "}Yaşam Tarzı.
                </span>
              </h2>

            </div>


            <Link
              href="/paketler"
              className="flex items-center gap-2 text-xs font-black text-orange-400"
            >
              Tüm Koleksiyonlar
              <FaArrowRight />
            </Link>

          </div>


          <div className="mt-9 grid gap-5 lg:grid-cols-2">

            {collections.map(
              (
                collection,
                index
              ) => {

                const Icon =
                  collection.icon;


                return (
                  <Link
                    key={
                      collection.title
                    }
                    href={
                      collection.href
                    }
                    className={`group relative overflow-hidden rounded-[32px] border border-white/10 ${
                      index === 0 ||
                      index === 3
                        ? "min-h-[500px]"
                        : "min-h-[390px]"
                    }`}
                  >

                    <img
                      src={
                        collection.image
                      }
                      alt={
                        collection.title
                      }
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />


                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />


                    <div className="absolute bottom-0 left-0 right-0 p-7">

                      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-black/35 text-orange-400 backdrop-blur-xl">
                        <Icon />
                      </div>


                      <div className="mt-5 text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                        {collection.kicker}
                      </div>


                      <h3 className="mt-2 text-3xl font-black">
                        {collection.title}
                      </h3>


                      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                        {collection.text}
                      </p>


                      <div className="mt-5 flex items-center gap-2 text-xs font-black">
                        Koleksiyonu Keşfet
                        <FaArrowRight className="transition group-hover:translate-x-1" />
                      </div>

                    </div>

                  </Link>
                );

              }
            )}

          </div>

        </div>

      </section>


      {/* ==================================================
          DESTINATIONS
      ================================================== */}

      <section className="border-y border-white/10 bg-[#08131f] px-5 py-24 lg:px-8">

        <div className="mx-auto max-w-[1450px]">

          <div className="grid gap-8 lg:grid-cols-[.55fr_1.45fr]">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.22em] text-orange-400">
                DESTINATIONS
              </div>


              <h2 className="mt-3 text-4xl font-black leading-tight">
                Bir Şehir
                <span className="block text-slate-500">
                  Birçok Deneyim.
                </span>
              </h2>


              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
                Destinasyonu seç.
                Nerede kalacağını,
                nasıl ulaşacağını ve
                ne yaşayacağını Turobus
                üzerinden tamamla.
              </p>

            </div>


            <div className="grid gap-4 sm:grid-cols-2">

              {destinations.map(
                (
                  item
                ) => (

                  <Link
                    key={
                      item.name
                    }
                    href={
                      item.href
                    }
                    className="group relative min-h-[360px] overflow-hidden rounded-[28px] border border-white/10"
                  >

                    <img
                      src={
                        item.image
                      }
                      alt={
                        item.name
                      }
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />


                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />


                    <div className="absolute bottom-0 left-0 right-0 p-5">

                      <div className="text-[9px] font-black uppercase tracking-[.15em] text-orange-300">
                        {item.country}
                      </div>

                      <div className="mt-1 text-3xl font-black">
                        {item.name}
                      </div>

                      <div className="mt-2 text-[10px] text-slate-300">
                        {item.text}
                      </div>


                      <div className="mt-5 flex items-center gap-2 text-[10px] font-black">
                        Tüm Deneyimleri Aç
                        <FaArrowRight />
                      </div>

                    </div>

                  </Link>

                )
              )}

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          THE NETWORK
      ================================================== */}

      <section className="relative overflow-hidden px-5 py-24 lg:px-8">

        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[.05] blur-3xl" />


        <div className="relative mx-auto max-w-[1450px]">

          <div className="text-center">

            <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
              THE TUROBUS NETWORK
            </div>

            <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Ön Yüzde Marketplace.
              <span className="block text-slate-500">
                Arkada Gerçek Operasyon.
              </span>
            </h2>

          </div>


          <div className="relative mx-auto mt-14 max-w-5xl">

            <div className="absolute left-1/2 top-1/2 hidden h-[1px] w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent lg:block" />


            <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {[
                [
                  "Marketplace",
                  "Müşteri satın alır",
                  FaGlobeEurope,
                ],
                [
                  "Network",
                  "İşletmeler bağlanır",
                  FaRoute,
                ],
                [
                  "Operation OS",
                  "Rezervasyon yürür",
                  FaShieldAlt,
                ],
                [
                  "Experience",
                  "Ürünler birleşir",
                  FaGift,
                ],
              ].map(
                ([
                  title,
                  description,
                  Icon,
                ]) => {

                  const TypedIcon =
                    Icon as typeof FaGift;


                  return (
                    <div
                      key={
                        String(
                          title
                        )
                      }
                      className="relative rounded-[25px] border border-white/10 bg-[#08131f] p-6 text-center shadow-xl"
                    >

                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-xl text-orange-400">
                        <TypedIcon />
                      </div>


                      <div className="mt-5 font-black">
                        {String(
                          title
                        )}
                      </div>


                      <div className="mt-2 text-[10px] text-slate-500">
                        {String(
                          description
                        )}
                      </div>

                    </div>
                  );

                }
              )}

            </div>

          </div>


          <div className="mx-auto mt-12 max-w-4xl rounded-[32px] border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-orange-500/[.03] to-orange-500/10 p-8 text-center md:p-10">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">
              ONE SYSTEM
            </div>


            <div className="mt-4 text-3xl font-black md:text-4xl">
              Otel + Villa + Tur + Aktivite + Yat + Transfer
            </div>


            <div className="mt-3 text-sm text-slate-400">
              Ayrı ürünler. Aynı seyahat ekosistemi.
            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          FINAL CTA
      ================================================== */}

      <section className="px-5 pb-24 lg:px-8">

        <div className="mx-auto max-w-[1450px]">

          <div className="relative overflow-hidden rounded-[40px] border border-white/10">

            <img
              src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2200&q=92"
              alt="Turobus"
              className="absolute inset-0 h-full w-full object-cover"
            />


            <div className="absolute inset-0 bg-gradient-to-r from-[#050d16]/98 via-[#050d16]/80 to-[#050d16]/20" />


            <div className="relative max-w-4xl p-8 md:p-14 lg:p-16">

              <div className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">
                READY TO TRAVEL?
              </div>


              <h2 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                Nerede Kalacağını Değil,
                <span className="block text-orange-500">
                  Nasıl Bir Tatil Yaşayacağını Seç.
                </span>
              </h2>


              <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300">
                Tek bir ürünle başlayabilir veya tatilinin bütün parçalarını
                Turobus üzerinden bir deneyime dönüştürebilirsin.
              </p>


              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  href="/paketler"
                  className="flex items-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black hover:bg-orange-600"
                >
                  Tatilimi Oluştur
                  <FaArrowRight />
                </Link>


                <Link
                  href="/oteller"
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-6 py-4 text-sm font-black backdrop-blur-xl hover:bg-white/10"
                >
                  Marketplace&apos;i Keşfet
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>


      <Footer />

      <BackToTop />

      <MobileBottomNav />

    </main>
  );
}
