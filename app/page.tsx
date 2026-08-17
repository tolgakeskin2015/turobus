"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  FaArrowRight,
  FaBed,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaClock,
  FaCompass,
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
  FaStore,
  FaSuitcase,
  FaTicketAlt,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import BackToTop from "@/components/home/BackToTop";
import MobileBottomNav from "@/components/home/MobileBottomNav";
import LiveMarketplace from "@/components/home/LiveMarketplace";


type MarketKey =
  | "hotel"
  | "villa"
  | "tour"
  | "activity"
  | "package"
  | "yacht"
  | "transfer"
  | "ticket";


type Market = {
  key: MarketKey;
  short: string;
  title: string;
  eyebrow: string;
  text: string;
  micro: string;
  seller: string;
  href: string;
  image: string;
  icon: typeof FaHotel;
};


const markets: Market[] = [
  {
    key: "hotel",
    short: "Oteller",
    title: "Otel Marketplace",
    eyebrow: "KONAKLAMA",
    text:
      "Farklı otel işletmelerinin oda, tarih, fiyat ve konaklama seçeneklerini tek pazarda keşfet.",
    micro:
      "Oda · Tarih · Pansiyon · Müsaitlik",
    seller:
      "Otel işletmeleri",
    href: "/oteller",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=92",
    icon: FaHotel,
  },
  {
    key: "villa",
    short: "Villalar",
    title: "Villa Marketplace",
    eyebrow: "ÖZEL KONAKLAMA",
    text:
      "Villa sahipleri ve işletmelerinin özel havuzlu, aile ve balayı villaları.",
    micro:
      "Takvim · Gece · Kapasite · Konum",
    seller:
      "Villa sahipleri",
    href: "/villalar",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=92",
    icon: FaBed,
  },
  {
    key: "tour",
    short: "Turlar",
    title: "Tur Marketplace",
    eyebrow: "SEYAHAT",
    text:
      "Tur operatörlerinin otobüslü ve uçaklı yurt içi / yurt dışı programları.",
    micro:
      "Rota · Tarih · Program · Kontenjan",
    seller:
      "Tur operatörleri",
    href: "/turlar",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1800&q=92",
    icon: FaGlobeEurope,
  },
  {
    key: "activity",
    short: "Aktiviteler",
    title: "Aktivite Marketplace",
    eyebrow: "DENEYİM",
    text:
      "Denizden maceraya, doğadan spora farklı sağlayıcıların turizm deneyimleri.",
    micro:
      "Saat · Bölge · Kapasite · Deneyim",
    seller:
      "Aktivite firmaları",
    href: "/aktiviteler",
    image:
      "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1800&q=92",
    icon: FaStar,
  },
  {
    key: "package",
    short: "Paketler",
    title: "Tatil Paketleri",
    eyebrow: "KOMPLE TATİL",
    text:
      "Yurt içi, yurt dışı, balayı, aile, otel ve villa tatil paketleri.",
    micro:
      "Konaklama · Ulaşım · Deneyimler",
    seller:
      "Seyahat acenteleri",
    href: "/paketler",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=92",
    icon: FaGift,
  },
  {
    key: "yacht",
    short: "Yat & Tekne",
    title: "Yat & Tekne Marketplace",
    eyebrow: "DENİZ",
    text:
      "Motor yat, gulet, katamaran, yelkenli ve özel tekne kiralama pazarı.",
    micro:
      "Marina · Tarih · Kabin · Kapasite",
    seller:
      "Yat & tekne işletmeleri",
    href: "/yatlar",
    image:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1800&q=92",
    icon: FaShip,
  },
  {
    key: "ticket",
    short: "Biletler",
    title: "Bilet Marketplace",
    eyebrow: "ULAŞIM BİLETLERİ",
    text:
      "Otobüs, uçak, feribot ve tren biletlerini tek Turobus arama deneyiminde keşfet.",
    micro:
      "Rota · Tarih · Yolcu · Sefer",
    seller:
      "Bilet sağlayıcıları & taşıyıcılar",
    href: "/biletler",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=92",
    icon: FaTicketAlt,
  },
  {
    key: "transfer",
    short: "Transfer",
    title: "Transfer Marketplace",
    eyebrow: "ULAŞIM",
    text:
      "Havalimanı, marina, şehirler arası ve VIP transfer sağlayıcıları.",
    micro:
      "Rota · Saat · Araç · Yolcu",
    seller:
      "Transfer firmaları",
    href: "/transfer",
    image:
      "https://images.unsplash.com/photo-1515569067071-ec3b51335dd0?auto=format&fit=crop&w=1800&q=92",
    icon: FaCar,
  },
];


const discover = [
  {
    title: "Balayı Dünyası",
    text:
      "Villa, otel, SPA, yat, transfer ve çiftlere özel deneyimler.",
    href:
      "/paketler?type=honeymoon",
    icon: FaHeart,
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1500&q=92",
  },
  {
    title: "Mavi Yolculuk",
    text:
      "Yatlar, guletler, tekneler ve deniz aktiviteleri.",
    href:
      "/yatlar",
    icon: FaShip,
    image:
      "https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&w=1500&q=92",
  },
  {
    title: "Wellness",
    text:
      "SPA, wellness ve yenilenme odaklı tatil deneyimleri.",
    href:
      "/paketler",
    icon: FaSpa,
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1500&q=92",
  },
  {
    title: "Dünya Rotaları",
    text:
      "Yurt dışı turlar ve uluslararası tatil paketleri.",
    href:
      "/turlar",
    icon: FaPlane,
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1500&q=92",
  },
];


const destinations = [
  {
    city: "Fethiye",
    products:
      "Otel · Villa · Aktivite · Yat · Transfer · Paket",
    href:
      "/paketler?destination=Fethiye",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=92",
  },
  {
    city: "Bodrum",
    products:
      "Otel · Villa · Yat · Transfer · Paket",
    href:
      "/paketler?destination=Bodrum",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=92",
  },
  {
    city: "Antalya",
    products:
      "Otel · Tur · Aktivite · Transfer · Paket",
    href:
      "/paketler?destination=Antalya",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1400&q=92",
  },
  {
    city: "Dubai",
    products:
      "Otel · Tur · Transfer · Yurt Dışı Paket",
    href:
      "/paketler?destination=Dubai",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=92",
  },
];


const sellers = [
  {
    title:
      "Otel İşletmeleri",
    icon:
      FaHotel,
    text:
      "Oda ve konaklama satışı",
  },
  {
    title:
      "Villa Sahipleri",
    icon:
      FaBed,
    text:
      "Villa ve müsaitlik yönetimi",
  },
  {
    title:
      "Tur Operatörleri",
    icon:
      FaGlobeEurope,
    text:
      "Tur programı ve kontenjan",
  },
  {
    title:
      "Aktivite Firmaları",
    icon:
      FaStar,
    text:
      "Deneyim ve kapasite satışı",
  },
  {
    title:
      "Yat İşletmeleri",
    icon:
      FaShip,
    text:
      "Yat, tekne ve filo kiralama",
  },
  {
    title:
      "Transfer Firmaları",
    icon:
      FaCar,
    text:
      "Rota ve araç kapasitesi",
  },
  {
    title:
      "Seyahat Acenteleri",
    icon:
      FaGift,
    text:
      "Tatil ve balayı paketleri",
  },
  {
    title:
      "Bilet Sağlayıcıları",
    icon:
      FaTicketAlt,
    text:
      "Otobüs, uçak, feribot ve tren bilet ağı",
  },
];


function today() {
  const date =
    new Date();

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
}


export default function Home() {

  const router =
    useRouter();


  const [
    activeKey,
    setActiveKey,
  ] =
    useState<MarketKey>(
      "hotel"
    );


  const [
    origin,
    setOrigin,
  ] =
    useState("");


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
    secondValue,
    setSecondValue,
  ] =
    useState("");


  const [
    guests,
    setGuests,
  ] =
    useState(2);


  const active =
    useMemo(
      () =>
        markets.find(
          (
            item
          ) =>
            item.key ===
            activeKey
        ) ??
        markets[0],
      [
        activeKey,
      ]
    );


  function changeMarket(
    key: MarketKey
  ) {

    setActiveKey(key);

    setOrigin("");
    setDestination("");
    setStartDate("");
    setSecondValue("");

  }


  function search() {

    const params =
      new URLSearchParams();


    if (
      activeKey ===
      "transfer" ||
      activeKey ===
      "ticket"
    ) {

      if (
        origin.trim()
      ) {

        params.set(
          "origin",
          origin.trim()
        );

      }


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

      }


      if (
        secondValue
      ) {

        params.set(
          activeKey === "ticket"
            ? "returnDate"
            : "time",
          secondValue
        );

      }

    } else {

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
        secondValue &&
        activeKey !==
          "tour" &&
        activeKey !==
          "activity"
      ) {

        params.set(
          "checkOut",
          secondValue
        );

      }

    }


    params.set(
      "guests",
      String(
        guests
      )
    );


    const query =
      params.toString();


    const targetHref =
      activeKey === "ticket"
        ? "/biletler/sonuclar"
        : active.href;

    router.push(
      query
        ? `${targetHref}?${query}`
        : targetHref
    );

  }


  return (
    <main className="min-h-screen overflow-x-hidden bg-[#040b12] text-white">

      <Navbar />


      {/* ===================================================
          GLOBAL MARKET HERO
      =================================================== */}

      <section className="relative min-h-[920px] overflow-hidden pt-20">

        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=94"
          alt="Turobus Turizm Marketplace"
          className="absolute inset-0 h-full w-full object-cover"
        />


        <div className="absolute inset-0 bg-[#040b12]/25" />

        <div className="absolute inset-0 bg-gradient-to-r from-[#040b12] via-[#040b12]/92 to-[#040b12]/30" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#040b12] via-transparent to-[#040b12]/35" />

        <div className="absolute -right-24 top-20 h-[600px] w-[600px] rounded-full bg-orange-500/[.11] blur-[140px]" />


        <div className="relative mx-auto max-w-[1500px] px-5 pb-20 pt-20 lg:px-8 lg:pt-28">

          <div className="grid gap-12 xl:grid-cols-[1.08fr_.62fr] xl:items-end">

            <div>

              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 shadow-xl backdrop-blur-2xl">

                <div className="relative h-2.5 w-2.5">

                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />

                  <span className="absolute inset-0 rounded-full bg-emerald-400" />

                </div>


                <span className="text-[10px] font-black uppercase tracking-[.24em]">
                  TUROBUS · TOURISM MARKETPLACE
                </span>

              </div>


              <h1 className="mt-8 max-w-6xl text-[58px] font-black leading-[.86] tracking-[-.06em] sm:text-7xl lg:text-[104px]">

                Turizmin

                <span className="block bg-gradient-to-r from-orange-300 via-orange-500 to-amber-300 bg-clip-text text-transparent">
                  Tek Pazaryeri.
                </span>

              </h1>


              <p className="mt-8 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">

                Bir otelin sitesi değil.
                Bir acentenin vitrini değil.

                <strong className="text-white">
                  {" "}
                  Turizm sektöründeki farklı işletmelerin ürünlerini aynı pazarda buluşturan Marketplace.
                </strong>

              </p>


              <div className="mt-8 flex flex-wrap gap-2">

                {markets.map(
                  (
                    market
                  ) => {

                    const Icon =
                      market.icon;


                    return (
                      <Link
                        key={
                          market.key
                        }
                        href={
                          market.href
                        }
                        className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-[10px] font-black backdrop-blur-xl transition hover:border-orange-500 hover:bg-orange-500"
                      >

                        <Icon />

                        {market.short}

                      </Link>
                    );

                  }
                )}

              </div>

            </div>


            {/* MARKET CONTROL CARD */}

            <div className="hidden xl:block">

              <div className="relative ml-auto max-w-[460px]">

                <div className="absolute -inset-14 rounded-full bg-orange-500/10 blur-3xl" />


                <div className="relative overflow-hidden rounded-[36px] border border-white/15 bg-black/45 p-6 shadow-2xl backdrop-blur-2xl">

                  <div className="flex items-center justify-between">

                    <div>

                      <div className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                        MARKET STATUS
                      </div>

                      <div className="mt-2 text-2xl font-black">
                        8 turizm pazarı
                      </div>

                    </div>


                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-xl shadow-lg shadow-orange-500/20">

                      <FaStore />

                    </div>

                  </div>


                  <div className="mt-7 grid grid-cols-2 gap-2">

                    {markets.map(
                      (
                        market
                      ) => {

                        const Icon =
                          market.icon;


                        return (
                          <Link
                            key={
                              market.key
                            }
                            href={
                              market.href
                            }
                            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-3 transition hover:border-orange-500/30"
                          >

                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                              <Icon />
                            </div>

                            <div className="text-[10px] font-black">
                              {market.short}
                            </div>

                          </Link>
                        );

                      }
                    )}

                  </div>


                  <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-4">

                    <FaCheckCircle className="text-emerald-400" />

                    <div>

                      <div className="text-xs font-black">
                        Multi-vendor altyapı
                      </div>

                      <div className="mt-1 text-[9px] text-slate-500">
                        Her işletme kendi ürününü yayınlar.
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* MARKET SEARCH ENGINE */}

          <div className="relative z-30 mt-14">

            <div className="rounded-[34px] border border-white/15 bg-[#07131f]/95 p-3 shadow-[0_40px_100px_rgba(0,0,0,.6)] backdrop-blur-2xl">

              <div className="flex gap-1 overflow-x-auto pb-3">

                {markets.map(
                  (
                    market
                  ) => {

                    const Icon =
                      market.icon;

                    const selected =
                      activeKey ===
                      market.key;


                    return (
                      <button
                        key={
                          market.key
                        }
                        type="button"
                        onClick={() =>
                          changeMarket(
                            market.key
                          )
                        }
                        className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-[11px] font-black transition ${
                          selected
                            ? "bg-white text-slate-950 shadow-xl"
                            : "text-slate-400 hover:bg-white/[.05] hover:text-white"
                        }`}
                      >

                        <Icon
                          className={
                            selected
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
                className={`grid overflow-hidden rounded-[24px] border border-white/10 bg-[#030a11] ${
                  activeKey ===
                  "transfer"
                    ? "lg:grid-cols-[1fr_1fr_.75fr_.65fr_.65fr_auto]"
                    : "lg:grid-cols-[1.25fr_.85fr_.85fr_.65fr_auto]"
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
                      value={
                        origin
                      }
                      onChange={(event) =>
                        setOrigin(
                          event.target.value
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

                    {activeKey ===
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
                      "yacht"
                        ? "Göcek, Bodrum, Fethiye..."
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
                      ? "Transfer Tarihi"
                      : activeKey ===
                          "tour"
                        ? "Tur Tarihi"
                        : activeKey ===
                            "activity"
                          ? "Aktivite Tarihi"
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
                      value={
                        secondValue
                      }
                      onChange={(event) =>
                        setSecondValue(
                          event.target.value
                        )
                      }
                      className="w-full bg-transparent text-sm font-black outline-none"
                    />

                  ) : (

                    <input
                      type="date"
                      disabled={
                        activeKey ===
                          "tour" ||
                        activeKey ===
                          "activity"
                      }
                      min={
                        startDate ||
                        today()
                      }
                      value={
                        secondValue
                      }
                      onChange={(event) =>
                        setSecondValue(
                          event.target.value
                        )
                      }
                      className="w-full bg-transparent text-sm font-black outline-none disabled:cursor-not-allowed disabled:opacity-25"
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
                    className="group flex min-h-[66px] w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-8 font-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >

                    <FaSearch />

                    Ara

                    <FaArrowRight className="text-xs transition group-hover:translate-x-1" />

                  </button>

                </div>

              </div>


              <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">

                <div className="flex items-center gap-3">

                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/10 text-xs text-orange-400">

                    <active.icon />

                  </div>

                  <div>

                    <div className="text-[10px] font-black">
                      {active.title}
                    </div>

                    <div className="mt-0.5 text-[8px] text-slate-600">
                      {active.micro}
                    </div>

                  </div>

                </div>


                <Link
                  href={
                    active.href
                  }
                  className="flex items-center gap-2 text-[10px] font-black text-orange-400"
                >
                  Pazarı Aç
                  <FaArrowRight />
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ===================================================
          MARKET DEPARTMENTS
      =================================================== */}

      <section
        id="marketplace"
        className="px-5 py-24 lg:px-8"
      >

        <div className="mx-auto max-w-[1500px]">

          <div className="flex flex-wrap items-end justify-between gap-7">

            <div className="max-w-4xl">

              <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
                MARKET DEPARTMENTS
              </div>


              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">

                Tek Site.

                <span className="text-slate-500">
                  {" "}
                  Sekiz Büyük Turizm Pazarı.
                </span>

              </h2>

            </div>


            <div className="max-w-sm text-sm leading-7 text-slate-500">
              Her pazar kendi sektörünün işletmeleri ve ürünleriyle çalışır.
            </div>

          </div>


          {/* PREMIUM ASYMMETRIC WALL */}

          <div className="mt-12 grid gap-5 xl:grid-cols-12">

            {markets.map(
              (
                market,
                index
              ) => {

                const Icon =
                  market.icon;


                const layout =
                  index === 0
                    ? "xl:col-span-7 min-h-[520px]"
                    : index === 1
                      ? "xl:col-span-5 min-h-[520px]"
                      : index === 2
                        ? "xl:col-span-4 min-h-[420px]"
                        : index === 3
                          ? "xl:col-span-4 min-h-[420px]"
                          : index === 4
                            ? "xl:col-span-4 min-h-[420px]"
                            : index === 5
                              ? "xl:col-span-7 min-h-[480px]"
                              : "xl:col-span-5 min-h-[480px]";


                return (
                  <Link
                    key={
                      market.key
                    }
                    href={
                      market.href
                    }
                    className={`group relative overflow-hidden rounded-[34px] border border-white/10 ${layout}`}
                  >

                    <img
                      src={
                        market.image
                      }
                      alt={
                        market.title
                      }
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />


                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />


                    <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-xl">

                      <Icon className="text-orange-400" />

                      <span className="text-[8px] font-black uppercase tracking-[.16em]">
                        {market.eyebrow}
                      </span>

                    </div>


                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">

                      <div className="flex items-end justify-between gap-5">

                        <div className="max-w-2xl">

                          <h3 className="text-3xl font-black md:text-4xl">
                            {market.short}
                          </h3>


                          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                            {market.text}
                          </p>


                          <div className="mt-5 flex flex-wrap gap-2">

                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[9px] font-black">
                              {market.micro}
                            </span>

                            <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-[9px] font-black text-orange-300">
                              {market.seller}
                            </span>

                          </div>

                        </div>


                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-lg backdrop-blur-xl transition group-hover:border-orange-500 group-hover:bg-orange-500">

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


      {/* ===================================================
          SHOPPING MALL STRIP
      =================================================== */}

      <section className="border-y border-white/10 bg-[#07131f]">

        <div className="mx-auto grid max-w-[1500px] md:grid-cols-2 xl:grid-cols-4">

          {[
            {
              icon:
                FaStore,
              title:
                "Farklı Satıcılar",
              text:
                "Turizm sektöründeki bağımsız işletmeler",
            },
            {
              icon:
                FaCompass,
              title:
                "Tek Keşif Alanı",
              text:
                "Bütün turizm ürünleri aynı Marketplace'te",
            },
            {
              icon:
                FaShieldAlt,
              title:
                "Tek Rezervasyon Deneyimi",
              text:
                "Müşteri Turobus üzerinden ilerler",
            },
            {
              icon:
                FaRoute,
              title:
                "Gerçek Operasyon",
              text:
                "Sipariş ilgili işletmenin operasyonuna düşer",
            },
          ].map(
            (
              item
            ) => {

              const Icon =
                item.icon;


              return (
                <div
                  key={
                    item.title
                  }
                  className="border-b border-white/10 p-7 md:border-r xl:border-b-0"
                >

                  <Icon className="text-xl text-orange-400" />


                  <div className="mt-4 text-lg font-black">
                    {item.title}
                  </div>


                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {item.text}
                  </p>

                </div>
              );

            }
          )}

        </div>

      </section>


            <LiveMarketplace />


{/* ===================================================
          DISCOVER BY EXPERIENCE
      =================================================== */}

      <section className="px-5 py-24 lg:px-8">

        <div className="mx-auto max-w-[1500px]">

          <div className="grid gap-10 xl:grid-cols-[.55fr_1.45fr]">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
                DISCOVER
              </div>


              <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">

                Aradığın Şeyi Değil,

                <span className="block text-slate-500">
                  Yaşamak İstediğini Seç.
                </span>

              </h2>


              <p className="mt-6 max-w-lg text-sm leading-7 text-slate-500">
                Bir tatil fikri birden fazla Marketplace ürününü bir araya getirebilir.
              </p>

            </div>


            <div className="grid gap-5 md:grid-cols-2">

              {discover.map(
                (
                  item,
                  index
                ) => {

                  const Icon =
                    item.icon;


                  return (
                    <Link
                      key={
                        item.title
                      }
                      href={
                        item.href
                      }
                      className={`group relative overflow-hidden rounded-[32px] border border-white/10 ${
                        index ===
                          0 ||
                        index ===
                          3
                          ? "min-h-[500px]"
                          : "min-h-[390px]"
                      }`}
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


                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />


                      <div className="absolute inset-x-0 bottom-0 p-7">

                        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-black/40 text-orange-400 backdrop-blur-xl">

                          <Icon />

                        </div>


                        <h3 className="mt-5 text-3xl font-black">
                          {item.title}
                        </h3>


                        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                          {item.text}
                        </p>


                        <div className="mt-5 flex items-center gap-2 text-xs font-black text-orange-300">
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


      {/* ===================================================
          DESTINATION MALL
      =================================================== */}

      <section className="border-y border-white/10 bg-[#07131f] px-5 py-24 lg:px-8">

        <div className="mx-auto max-w-[1500px]">

          <div className="flex flex-wrap items-end justify-between gap-6">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
                DESTINATION MALL
              </div>


              <h2 className="mt-4 text-4xl font-black md:text-5xl">

                Destinasyonu Aç.

                <span className="text-slate-500">
                  {" "}
                  Her Şeyi Gör.
                </span>

              </h2>

            </div>


            <p className="max-w-sm text-sm leading-7 text-slate-500">
              Bir bölgede bulunan farklı satıcıların tüm turizm ürünlerine ulaş.
            </p>

          </div>


          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

            {destinations.map(
              (
                item
              ) => (

                <Link
                  key={
                    item.city
                  }
                  href={
                    item.href
                  }
                  className="group relative min-h-[480px] overflow-hidden rounded-[32px] border border-white/10"
                >

                  <img
                    src={
                      item.image
                    }
                    alt={
                      item.city
                    }
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />


                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />


                  <div className="absolute bottom-0 left-0 right-0 p-6">

                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-orange-300">

                      <FaMapMarkerAlt />

                      DESTINATION MARKET

                    </div>


                    <div className="mt-2 text-4xl font-black">
                      {item.city}
                    </div>


                    <div className="mt-3 text-[10px] leading-5 text-slate-300">
                      {item.products}
                    </div>


                    <div className="mt-5 flex items-center gap-2 text-[10px] font-black">
                      Bölgeyi Aç
                      <FaArrowRight />
                    </div>

                  </div>

                </Link>

              )
            )}

          </div>

        </div>

      </section>


      {/* ===================================================
          SELLER MARKET
      =================================================== */}

      <section className="px-5 py-24 lg:px-8">

        <div className="mx-auto max-w-[1500px]">

          <div className="grid gap-12 xl:grid-cols-[.66fr_1.34fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-orange-300">

                <FaStore />

                SELL ON TUROBUS

              </div>


              <h2 className="mt-5 text-4xl font-black leading-[1.04] md:text-6xl">

                Turizm İşletmeni

                <span className="block text-orange-500">
                  Pazara Aç.
                </span>

              </h2>


              <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400">

                Otelciysen otelini.
                Villa işletiyorsan villanı.
                Turcuysan turunu.
                Aktiviteciysen aktiviteni.
                Yat işletiyorsan filonu.
                Transferciysen araçlarını.
                Acenteysen paketlerini yayınla.

              </p>


              <Link
                href="/acente-basvuru"
                className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600"
              >
                Satıcı Olarak Katıl
                <FaArrowRight />
              </Link>

            </div>


            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              {sellers.map(
                (
                  seller
                ) => {

                  const Icon =
                    seller.icon;


                  return (
                    <Link
                      key={
                        seller.title
                      }
                      href="/acente-basvuru"
                      className="group rounded-[26px] border border-white/10 bg-[#07131f] p-5 transition hover:-translate-y-1 hover:border-orange-500/30"
                    >

                      <div className="flex items-start justify-between">

                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-lg text-orange-400">

                          <Icon />

                        </div>


                        <FaArrowRight className="text-slate-700 transition group-hover:text-orange-400" />

                      </div>


                      <div className="mt-5 text-lg font-black">
                        {seller.title}
                      </div>


                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        {seller.text}
                      </p>

                    </Link>
                  );

                }
              )}


              <div className="rounded-[26px] border border-orange-500/20 bg-gradient-to-br from-orange-500/15 to-orange-500/[.03] p-5">

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 text-lg">

                  <FaRoute />

                </div>


                <div className="mt-5 text-lg font-black">
                  Turobus Network
                </div>


                <p className="mt-2 text-xs leading-6 text-slate-400">
                  Farklı satıcılar. Farklı sektörler. Aynı turizm pazarı.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ===================================================
          MARKETPLACE TECHNOLOGY
      =================================================== */}

      <section className="relative overflow-hidden border-y border-white/10 bg-[#07131f] px-5 py-24 lg:px-8">

        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[.05] blur-[140px]" />


        <div className="relative mx-auto max-w-[1500px]">

          <div className="mx-auto max-w-5xl text-center">

            <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
              TUROBUS COMMERCE NETWORK
            </div>


            <h2 className="mt-4 text-4xl font-black leading-tight md:text-6xl">

              Müşteriye Marketplace.

              <span className="block text-slate-500">
                İşletmeye Operasyon Sistemi.
              </span>

            </h2>


            <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-slate-400">
              Ön tarafta müşteri farklı satıcıların ürünlerini keşfeder.
              Arkada rezervasyon ilgili işletmenin gerçek operasyon akışına bağlanır.
            </p>

          </div>


          <div className="mx-auto mt-16 grid max-w-6xl gap-4 md:grid-cols-4">

            {[
              {
                number:
                  "01",
                icon:
                  FaStore,
                title:
                  "Satıcı",
                text:
                  "Ürününü yayınlar",
              },
              {
                number:
                  "02",
                icon:
                  FaGlobeEurope,
                title:
                  "Marketplace",
                text:
                  "Müşteri keşfeder",
              },
              {
                number:
                  "03",
                icon:
                  FaSuitcase,
                title:
                  "Rezervasyon",
                text:
                  "Satış oluşur",
              },
              {
                number:
                  "04",
                icon:
                  FaRoute,
                title:
                  "Operasyon",
                text:
                  "Hizmet tamamlanır",
              },
            ].map(
              (
                item
              ) => {

                const Icon =
                  item.icon;


                return (
                  <div
                    key={
                      item.number
                    }
                    className="relative rounded-[28px] border border-white/10 bg-[#030a11] p-6"
                  >

                    <div className="text-[9px] font-black text-slate-700">
                      {item.number}
                    </div>


                    <div className="mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/10 text-xl text-orange-400">

                      <Icon />

                    </div>


                    <div className="mt-5 text-xl font-black">
                      {item.title}
                    </div>


                    <div className="mt-2 text-xs text-slate-500">
                      {item.text}
                    </div>

                  </div>
                );

              }
            )}

          </div>

        </div>

      </section>


      {/* ===================================================
          FINAL MASSIVE CTA
      =================================================== */}

      <section className="px-5 py-24 lg:px-8">

        <div className="mx-auto max-w-[1500px]">

          <div className="relative min-h-[650px] overflow-hidden rounded-[44px] border border-white/10">

            <img
              src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2400&q=94"
              alt="Turobus"
              className="absolute inset-0 h-full w-full object-cover"
            />


            <div className="absolute inset-0 bg-gradient-to-r from-[#030a11]/98 via-[#030a11]/78 to-[#030a11]/20" />


            <div className="relative flex min-h-[650px] max-w-5xl flex-col justify-center p-8 md:p-14 lg:p-16">

              <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300">
                ONE TOURISM MARKETPLACE
              </div>


              <h2 className="mt-5 text-5xl font-black leading-[.98] tracking-tight md:text-7xl">

                Otelden Yata.

                <span className="block">
                  Villadan Aktiviteye.
                </span>

                <span className="block text-orange-500">
                  Turizmin Tamamı.
                </span>

              </h2>


              <p className="mt-7 max-w-2xl text-sm leading-7 text-slate-300">

                Otel bul.
                Villa kirala.
                Tur seç.
                Aktivite satın al.
                Tatil paketi keşfet.
                Yat kirala.
                Transferini ayarla.

              </p>


              <div className="mt-9 flex flex-wrap gap-3">

                <a
                  href="#marketplace"
                  className="flex items-center gap-3 rounded-2xl bg-orange-500 px-7 py-4 text-sm font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600"
                >
                  Marketplace&apos;i Aç
                  <FaArrowRight />
                </a>


                <Link
                  href="/acente-basvuru"
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 px-7 py-4 text-sm font-black backdrop-blur-xl hover:bg-white/10"
                >
                  Ürününü Yayınla
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
