"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  FaArrowRight,
  FaBed,
  FaBus,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
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
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import BackToTop from "@/components/home/BackToTop";
import MobileBottomNav from "@/components/home/MobileBottomNav";

type MarketKey =
  | "hotel"
  | "villa"
  | "tour"
  | "activity"
  | "package"
  | "yacht"
  | "transfer";

type MarketItem = {
  key: MarketKey;
  title: string;
  short: string;
  eyebrow: string;
  description: string;
  detail: string;
  seller: string;
  href: string;
  image: string;
  icon: typeof FaHotel;
};

const markets: MarketItem[] = [
  {
    key: "hotel",
    title: "Oteller",
    short: "Otel",
    eyebrow: "KONAKLAMA MARKETPLACE",
    description:
      "Şehir otellerinden resortlara, butik otellerden seçkin tesislere kadar farklı işletmelerin konaklama ürünleri.",
    detail:
      "Oda · Tarih · Müsaitlik · Fiyat",
    seller: "Otel işletmeleri",
    href: "/oteller",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=92",
    icon: FaHotel,
  },
  {
    key: "villa",
    title: "Villalar",
    short: "Villa",
    eyebrow: "VILLA MARKETPLACE",
    description:
      "Villa sahipleri ve profesyonel işletmelerin özel havuzlu, aile ve balayı villaları.",
    detail:
      "Takvim · Gecelik fiyat · Kapasite",
    seller: "Villa sahipleri & işletmeleri",
    href: "/villalar",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=92",
    icon: FaBed,
  },
  {
    key: "tour",
    title: "Turlar",
    short: "Tur",
    eyebrow: "TOUR MARKETPLACE",
    description:
      "Tur operatörlerinin otobüslü ve uçaklı yurt içi / yurt dışı programları.",
    detail:
      "Rota · Tarih · Kontenjan · Program",
    seller: "Tur operatörleri",
    href: "/turlar",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1800&q=92",
    icon: FaGlobeEurope,
  },
  {
    key: "activity",
    title: "Aktiviteler",
    short: "Aktivite",
    eyebrow: "EXPERIENCE MARKETPLACE",
    description:
      "Aktivite firmalarının deniz, doğa, macera, spor ve özel deneyimleri.",
    detail:
      "Saat · Kapasite · Deneyim · Bölge",
    seller: "Aktivite sağlayıcıları",
    href: "/aktiviteler",
    image:
      "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1800&q=92",
    icon: FaStar,
  },
  {
    key: "package",
    title: "Tatil Paketleri",
    short: "Paket",
    eyebrow: "PACKAGE MARKETPLACE",
    description:
      "Acentelerin hazırladığı yurt içi, yurt dışı, balayı, aile, villa ve seçkin tatil paketleri.",
    detail:
      "Konaklama · Ulaşım · Deneyimler",
    seller: "Seyahat acenteleri",
    href: "/paketler",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=92",
    icon: FaGift,
  },
  {
    key: "yacht",
    title: "Yat & Tekne",
    short: "Yat & Tekne",
    eyebrow: "YACHT MARKETPLACE",
    description:
      "Motor yat, gulet, katamaran, yelkenli ve günlük özel tekneler.",
    detail:
      "Marina · Tarih · Kapasite · Kiralama",
    seller: "Yat & tekne işletmeleri",
    href: "/yatlar",
    image:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1800&q=92",
    icon: FaShip,
  },
  {
    key: "transfer",
    title: "Transferler",
    short: "Transfer",
    eyebrow: "TRANSFER MARKETPLACE",
    description:
      "Havalimanı, marina, şehirler arası ve özel VIP transfer hizmetleri.",
    detail:
      "Rota · Saat · Araç · Kapasite",
    seller: "Transfer firmaları",
    href: "/transfer",
    image:
      "https://images.unsplash.com/photo-1515569067071-ec3b51335dd0?auto=format&fit=crop&w=1800&q=92",
    icon: FaCar,
  },
];

const collections = [
  {
    title: "Balayı",
    subtitle: "Konaklama, SPA, transfer ve romantik deneyimler",
    href: "/paketler?type=honeymoon",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=90",
    icon: FaHeart,
  },
  {
    title: "Deniz & Mavi",
    subtitle: "Villa, koylar, yat, tekne ve deniz aktiviteleri",
    href: "/yatlar",
    image:
      "https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&w=1400&q=90",
    icon: FaShip,
  },
  {
    title: "SPA & Wellness",
    subtitle: "Seçkin konaklama ve yenilenme deneyimleri",
    href: "/paketler",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=90",
    icon: FaSpa,
  },
  {
    title: "Yurt Dışı",
    subtitle: "Uçaklı turlar, oteller ve komple tatil paketleri",
    href: "/turlar",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=90",
    icon: FaPlane,
  },
];

const vendorTypes = [
  {
    icon: FaHotel,
    title: "Otel İşletmesi",
    description: "Odalarını ve konaklama ürünlerini yayınla.",
  },
  {
    icon: FaBed,
    title: "Villa İşletmesi",
    description: "Villalarını, takvimini ve fiyatlarını yönet.",
  },
  {
    icon: FaGlobeEurope,
    title: "Tur Operatörü",
    description: "Otobüslü ve uçaklı turlarını satışa aç.",
  },
  {
    icon: FaStar,
    title: "Aktivite Firması",
    description: "Aktivitelerini ve kapasiteni Marketplace'e bağla.",
  },
  {
    icon: FaShip,
    title: "Yat & Tekne",
    description: "Filo, marina, tarih ve kiralama fiyatlarını yayınla.",
  },
  {
    icon: FaCar,
    title: "Transfer Firması",
    description: "Rotalarını, araçlarını ve kapasiteni satışa aç.",
  },
  {
    icon: FaGift,
    title: "Seyahat Acentesi",
    description: "Hazır ve özel tatil paketlerini Marketplace'e çıkar.",
  },
];

const destinations = [
  {
    title: "Fethiye",
    subtitle: "Otel · Villa · Aktivite · Yat · Transfer",
    href: "/paketler?destination=Fethiye",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=90",
  },
  {
    title: "Bodrum",
    subtitle: "Otel · Villa · Yat · Paket",
    href: "/paketler?destination=Bodrum",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=90",
  },
  {
    title: "Antalya",
    subtitle: "Otel · Tur · Aktivite · Transfer",
    href: "/paketler?destination=Antalya",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1400&q=90",
  },
  {
    title: "Dubai",
    subtitle: "Otel · Tur · Paket · VIP Transfer",
    href: "/paketler?destination=Dubai",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=90",
  },
];

function dateToday() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function Home() {
  const router = useRouter();

  const [activeKey, setActiveKey] =
    useState<MarketKey>("hotel");

  const [origin, setOrigin] =
    useState("");

  const [destination, setDestination] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [guests, setGuests] =
    useState(2);

  const activeMarket = useMemo(
    () =>
      markets.find(
        (item) =>
          item.key === activeKey
      ) ?? markets[0],
    [activeKey]
  );

  function searchMarket() {
    const params =
      new URLSearchParams();

    if (activeKey === "transfer") {
      if (origin.trim()) {
        params.set(
          "origin",
          origin.trim()
        );
      }

      if (destination.trim()) {
        params.set(
          "destination",
          destination.trim()
        );
      }

      if (startDate) {
        params.set(
          "date",
          startDate
        );
      }

      if (endDate) {
        params.set(
          "time",
          endDate
        );
      }
    } else {
      if (destination.trim()) {
        params.set(
          "destination",
          destination.trim()
        );
      }

      if (startDate) {
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
        endDate &&
        activeKey !== "tour" &&
        activeKey !== "activity"
      ) {
        params.set(
          "checkOut",
          endDate
        );
      }
    }

    params.set(
      "guests",
      String(guests)
    );

    const query =
      params.toString();

    router.push(
      query
        ? `${activeMarket.href}?${query}`
        : activeMarket.href
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050d16] text-white">
      <Navbar />

      {/* HERO */}

      <section className="relative min-h-[860px] overflow-hidden pt-20">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=94"
          alt="Turobus Turizm Marketplace"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#050d16] via-[#050d16]/91 to-[#050d16]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050d16] via-transparent to-[#050d16]/20" />
        <div className="absolute right-[8%] top-[16%] h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-[1450px] px-5 pb-20 pt-20 lg:px-8 lg:pt-28">
          <div className="grid gap-12 xl:grid-cols-[1fr_.66fr] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 backdrop-blur-xl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>

                <span className="text-[10px] font-black uppercase tracking-[.22em] text-slate-200">
                  Türkiye&apos;nin Turizm Marketplace&apos;i
                </span>
              </div>

              <h1 className="mt-8 max-w-5xl text-[58px] font-black leading-[.9] tracking-[-.055em] sm:text-7xl lg:text-[100px]">
                Turizmin
                <span className="block bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300 bg-clip-text text-transparent">
                  Tek Pazaryeri.
                </span>
              </h1>

              <p className="mt-8 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Oteller, villalar, turlar,
                aktiviteler, tatil paketleri,
                yat &amp; tekneler ve
                transfer hizmetleri.
                <strong className="text-white">
                  {" "}
                  Farklı turizm işletmeleri,
                  tek Turobus Marketplace.
                </strong>
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#market"
                  className="flex items-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black shadow-xl shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  Marketplace&apos;i Keşfet
                  <FaArrowRight />
                </a>

                <Link
                  href="/acente-basvuru"
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 px-6 py-4 text-sm font-black backdrop-blur-xl transition hover:bg-white/10"
                >
                  Ürününü Yayınla
                </Link>
              </div>
            </div>

            <div className="hidden xl:block">
              <div className="rounded-[34px] border border-white/15 bg-black/40 p-6 shadow-2xl backdrop-blur-2xl">
                <div className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                  TUROBUS NETWORK
                </div>

                <div className="mt-3 text-2xl font-black">
                  Turizmin tüm satıcıları
                  aynı pazarda.
                </div>

                <div className="mt-6 space-y-2">
                  {[
                    ["Oteller", "Otel işletmeleri"],
                    ["Villalar", "Villa sahipleri"],
                    ["Turlar", "Tur operatörleri"],
                    ["Aktiviteler", "Aktivite firmaları"],
                    ["Yat & Tekne", "Deniz işletmeleri"],
                    ["Transfer", "Transfer firmaları"],
                    ["Paketler", "Seyahat acenteleri"],
                  ].map(
                    ([
                      product,
                      supplier,
                    ]) => (
                      <div
                        key={product}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.045] px-4 py-3"
                      >
                        <div className="text-xs font-black">
                          {product}
                        </div>

                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                          {supplier}
                          <FaCheckCircle className="text-emerald-400" />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH ENGINE */}

          <div className="relative z-30 mt-14 rounded-[32px] border border-white/15 bg-[#07131f]/95 p-3 shadow-[0_35px_90px_rgba(0,0,0,.55)] backdrop-blur-2xl">
            <div className="flex gap-1 overflow-x-auto pb-3">
              {markets.map(
                (market) => {
                  const Icon =
                    market.icon;

                  const active =
                    activeKey ===
                    market.key;

                  return (
                    <button
                      key={market.key}
                      type="button"
                      onClick={() => {
                        setActiveKey(
                          market.key
                        );

                        setOrigin("");
                        setDestination("");
                        setStartDate("");
                        setEndDate("");
                      }}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-[11px] font-black transition ${
                        active
                          ? "bg-white text-slate-950"
                          : "text-slate-400 hover:bg-white/[.05] hover:text-white"
                      }`}
                    >
                      <Icon
                        className={
                          active
                            ? "text-orange-500"
                            : ""
                        }
                      />

                      {market.short}
                    </button>
                  );
                }
              )}
            </div>

            <div
              className={`grid overflow-hidden rounded-[22px] border border-white/10 bg-[#050e18] ${
                activeKey === "transfer"
                  ? "lg:grid-cols-[1fr_1fr_.75fr_.65fr_.6fr_auto]"
                  : "lg:grid-cols-[1.2fr_.8fr_.8fr_.65fr_auto]"
              }`}
            >
              {activeKey ===
                "transfer" && (
                <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                  <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                    <FaMapMarkerAlt />
                    Nereden?
                  </span>

                  <input
                    value={origin}
                    onChange={(event) =>
                      setOrigin(
                        event.target
                          .value
                      )
                    }
                    placeholder="Dalaman Havalimanı..."
                    className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-700"
                  />
                </label>
              )}

              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                  <FaMapMarkerAlt />

                  {activeKey === "transfer"
                    ? "Nereye?"
                    : activeKey === "yacht"
                      ? "Marina / Bölge"
                      : "Nereye?"}
                </span>

                <input
                  value={destination}
                  onChange={(event) =>
                    setDestination(
                      event.target.value
                    )
                  }
                  placeholder={
                    activeKey ===
                    "yacht"
                      ? "Göcek, Fethiye..."
                      : activeKey ===
                          "transfer"
                        ? "Ölüdeniz, Fethiye..."
                        : "Fethiye, Antalya, Dubai..."
                  }
                  className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-700"
                />
              </label>

              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                  <FaCalendarAlt />

                  {activeKey ===
                  "transfer"
                    ? "Tarih"
                    : activeKey ===
                          "tour" ||
                        activeKey ===
                          "activity"
                      ? "Tarih"
                      : "Başlangıç"}
                </span>

                <input
                  type="date"
                  min={dateToday()}
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target
                        .value
                    )
                  }
                  className="w-full bg-transparent text-sm font-black outline-none"
                />
              </label>

              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
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
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full bg-transparent text-sm font-black outline-none"
                  />
                ) : (
                  <input
                    type="date"
                    min={
                      startDate ||
                      dateToday()
                    }
                    disabled={
                      activeKey ===
                        "tour" ||
                      activeKey ===
                        "activity"
                    }
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full bg-transparent text-sm font-black outline-none disabled:cursor-not-allowed disabled:opacity-30"
                  />
                )}
              </label>

              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                  <FaUsers />

                  {activeKey ===
                  "transfer"
                    ? "Yolcu"
                    : "Kişi"}
                </span>

                <select
                  value={guests}
                  onChange={(event) =>
                    setGuests(
                      Number(
                        event.target
                          .value
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
                    (count) => (
                      <option
                        key={count}
                        value={count}
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
                    searchMarket
                  }
                  className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 font-black transition hover:bg-orange-600"
                >
                  <FaSearch />
                  Ara
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <FaShieldAlt className="text-emerald-400" />

                <span className="font-black text-white">
                  {activeMarket.title}
                </span>

                <span className="hidden md:inline">
                  · {activeMarket.detail}
                </span>
              </div>

              <Link
                href={
                  activeMarket.href
                }
                className="flex items-center gap-2 text-[10px] font-black text-orange-400"
              >
                Tüm {activeMarket.title}
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7 MAIN MARKETPLACES */}

      <section
        id="market"
        className="px-5 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-[1450px]">
          <div className="max-w-4xl">
            <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
              TUROBUS MARKETPLACE
            </div>

            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Turizmin Bütün
              <span className="text-slate-500">
                {" "}
                Pazarları Tek Çatı Altında.
              </span>
            </h2>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400">
              Her kategori kendi gerçek
              işletmeleri, ürünleri,
              fiyatları, stokları ve
              rezervasyon yapısıyla
              çalışır.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-12">
            {markets.map(
              (
                market,
                index
              ) => {
                const Icon =
                  market.icon;

                const span =
                  index === 0
                    ? "xl:col-span-7"
                    : index === 1
                      ? "xl:col-span-5"
                      : index === 2
                        ? "xl:col-span-5"
                        : index === 3
                          ? "xl:col-span-7"
                          : index === 4
                            ? "xl:col-span-4"
                            : index === 5
                              ? "xl:col-span-4"
                              : "xl:col-span-4";

                const height =
                  index < 4
                    ? "min-h-[470px]"
                    : "min-h-[390px]";

                return (
                  <Link
                    key={market.key}
                    href={market.href}
                    className={`group relative overflow-hidden rounded-[32px] border border-white/10 ${span} ${height}`}
                  >
                    <img
                      src={market.image}
                      alt={market.title}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#050d16] via-[#050d16]/55 to-transparent" />

                    <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-[8px] font-black tracking-[.15em] backdrop-blur-xl">
                      {market.eyebrow}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                      <div className="flex items-end justify-between gap-5">
                        <div className="max-w-xl">
                          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg text-orange-400 backdrop-blur-xl">
                            <Icon />
                          </div>

                          <h3 className="mt-5 text-3xl font-black">
                            {market.title}
                          </h3>

                          <p className="mt-3 text-sm leading-7 text-slate-300">
                            {market.description}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[9px] font-black text-slate-300">
                              {market.detail}
                            </span>

                            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black text-orange-300">
                              {market.seller}
                            </span>
                          </div>
                        </div>

                        <div className="grid h-13 w-13 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 transition group-hover:border-orange-500 group-hover:bg-orange-500">
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
      </section>

      {/* SHOP BY PURPOSE */}

      <section className="border-y border-white/10 bg-[#08131f] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="grid gap-10 lg:grid-cols-[.62fr_1.38fr]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-orange-400">
                KEŞFET
              </div>

              <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
                Ürüne Göre Değil,
                <span className="block text-slate-500">
                  Tatil Tarzına Göre.
                </span>
              </h2>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">
                Aynı Marketplace içinde
                farklı satıcıların farklı
                ürünlerini keşfedebilirsin.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {collections.map(
                (collection) => {
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
                      className="group relative min-h-[400px] overflow-hidden rounded-[30px] border border-white/10"
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

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-black/40 text-orange-400 backdrop-blur-xl">
                          <Icon />
                        </div>

                        <h3 className="mt-4 text-2xl font-black">
                          {collection.title}
                        </h3>

                        <p className="mt-2 max-w-md text-xs leading-6 text-slate-300">
                          {collection.subtitle}
                        </p>

                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-orange-300">
                          Keşfet
                          <FaArrowRight />
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

      {/* DESTINATION MARKETPLACE */}

      <section className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-orange-400">
                DESTINATION MARKETPLACE
              </div>

              <h2 className="mt-3 text-4xl font-black md:text-5xl">
                Bir Destinasyon.
                <span className="text-slate-500">
                  {" "}
                  Tüm Turizm Ürünleri.
                </span>
              </h2>
            </div>

            <Link
              href="/paketler"
              className="flex items-center gap-2 text-xs font-black text-orange-400"
            >
              Daha Fazla Keşfet
              <FaArrowRight />
            </Link>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {destinations.map(
              (item) => (
                <Link
                  key={
                    item.title
                  }
                  href={
                    item.href
                  }
                  className="group relative min-h-[430px] overflow-hidden rounded-[30px] border border-white/10"
                >
                  <img
                    src={
                      item.image
                    }
                    alt={
                      item.title
                    }
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="text-3xl font-black">
                      {item.title}
                    </div>

                    <div className="mt-2 text-[10px] leading-5 text-slate-300">
                      {item.subtitle}
                    </div>

                    <div className="mt-5 flex items-center gap-2 text-[10px] font-black text-orange-300">
                      Marketplace&apos;i Aç
                      <FaArrowRight />
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* MULTI VENDOR */}

      <section className="border-y border-white/10 bg-[#08131f] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="grid gap-12 xl:grid-cols-[.65fr_1.35fr]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-orange-400">
                MULTI-VENDOR NETWORK
              </div>

              <h2 className="mt-4 text-4xl font-black leading-[1.05] md:text-5xl">
                Her İşletme
                <span className="block text-slate-500">
                  Kendi Ürününü Satar.
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400">
                Turobus tek bir acentenin
                vitrini değildir. Turizm
                sektöründeki farklı
                işletmelerin kendi
                ürünlerini yayınladığı
                ortak pazaryeridir.
              </p>

              <Link
                href="/acente-basvuru"
                className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black hover:bg-orange-600"
              >
                Marketplace&apos;e Katıl
                <FaArrowRight />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {vendorTypes.map(
                (vendor) => {
                  const Icon =
                    vendor.icon;

                  return (
                    <Link
                      key={
                        vendor.title
                      }
                      href="/acente-basvuru"
                      className="group rounded-[24px] border border-white/10 bg-[#050e18] p-5 transition hover:-translate-y-1 hover:border-orange-500/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                          <Icon />
                        </div>

                        <FaArrowRight className="text-slate-700 transition group-hover:text-orange-400" />
                      </div>

                      <div className="mt-5 text-lg font-black">
                        {vendor.title}
                      </div>

                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        {vendor.description}
                      </p>
                    </Link>
                  );
                }
              )}

              <div className="rounded-[24px] border border-orange-500/20 bg-orange-500/[.07] p-5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 text-white">
                  <FaRoute />
                </div>

                <div className="mt-5 text-lg font-black">
                  Turobus Network
                </div>

                <p className="mt-2 text-xs leading-6 text-slate-400">
                  Farklı işletmeler.
                  Farklı ürünler.
                  Tek Marketplace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INFRASTRUCTURE */}

      <section className="relative overflow-hidden px-5 py-24 lg:px-8">
        <div className="absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[.05] blur-[120px]" />

        <div className="relative mx-auto max-w-[1450px]">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
              MARKETPLACE + OPERATING SYSTEM
            </div>

            <h2 className="mx-auto mt-4 max-w-5xl text-4xl font-black leading-tight md:text-6xl">
              Ön Yüzde Büyük Bir Pazaryeri.
              <span className="block text-slate-500">
                Arkada Gerçek Turizm Operasyonu.
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-slate-400">
              Satıcı ürününü yayınlar,
              müşteri keşfeder,
              rezervasyon yapılır ve
              operasyon ilgili işletmenin
              sisteminde yürür.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-4">
            {[
              {
                title: "1. İşletme",
                text: "Ürün ve stok yayınlar",
                icon: FaHotel,
              },
              {
                title: "2. Marketplace",
                text: "Müşteri ürünü keşfeder",
                icon: FaGlobeEurope,
              },
              {
                title: "3. Rezervasyon",
                text: "Satış güvenli şekilde oluşur",
                icon: FaShieldAlt,
              },
              {
                title: "4. Operasyon",
                text: "Gerçek hizmet süreci başlar",
                icon: FaRoute,
              },
            ].map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <div
                    key={
                      item.title
                    }
                    className="rounded-[26px] border border-white/10 bg-[#08131f] p-6 text-center"
                  >
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/10 text-xl text-orange-400">
                      <Icon />
                    </div>

                    <div className="mt-5 font-black">
                      {item.title}
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500">
                      {item.text}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* FINAL MARKET CTA */}

      <section className="px-5 pb-24 lg:px-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="relative overflow-hidden rounded-[42px] border border-white/10">
            <img
              src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2200&q=92"
              alt="Turobus Marketplace"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#050d16]/98 via-[#050d16]/82 to-[#050d16]/30" />

            <div className="relative max-w-5xl p-8 md:p-14 lg:p-16">
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">
                TUROBUS
              </div>

              <h2 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                Turizmde Ne Arıyorsan
                <span className="block text-orange-500">
                  Aynı Pazarda.
                </span>
              </h2>

              <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-300">
                Otel bul. Villa kirala.
                Tura katıl. Aktivite seç.
                Tatil paketi al. Yat kirala.
                Transferini ayarla.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#market"
                  className="flex items-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black hover:bg-orange-600"
                >
                  Marketplace&apos;i Keşfet
                  <FaArrowRight />
                </a>

                <Link
                  href="/acente-basvuru"
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 px-6 py-4 text-sm font-black backdrop-blur-xl hover:bg-white/10"
                >
                  Satıcı Olarak Katıl
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
