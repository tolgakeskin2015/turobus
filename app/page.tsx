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


type MarketplaceKey =
  | "package"
  | "hotel"
  | "villa"
  | "tour"
  | "activity"
  | "yacht"
  | "transfer";


type MarketplaceProduct = {
  key: MarketplaceKey;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  image: string;
  icon: typeof FaGift;
  detail: string;
};


const products: MarketplaceProduct[] = [
  {
    key: "package",
    label: "Tatil Paketleri",
    shortLabel: "Paket",
    description:
      "Konaklama, ulaşım ve deneyimlerin tamamı tek rezervasyonda.",
    href: "/paketler",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=90",
    icon: FaGift,
    detail:
      "Yurt içi · Yurt dışı · Balayı · Aile · Seçkin",
  },
  {
    key: "hotel",
    label: "Oteller",
    shortLabel: "Otel",
    description:
      "Gerçek müsaitlik ve profesyonel konaklama seçenekleri.",
    href: "/oteller",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=90",
    icon: FaHotel,
    detail:
      "Şehir · Resort · Butik · Premium",
  },
  {
    key: "villa",
    label: "Villalar",
    shortLabel: "Villa",
    description:
      "Özel havuzlu ve seçkin villaları merkezi takvimle keşfet.",
    href: "/villalar",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=90",
    icon: FaBed,
    detail:
      "Özel havuz · Aile · Balayı · Premium",
  },
  {
    key: "tour",
    label: "Turlar",
    shortLabel: "Tur",
    description:
      "Otobüslü ve uçaklı yurt içi / yurt dışı seyahat rotaları.",
    href: "/turlar",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=90",
    icon: FaGlobeEurope,
    detail:
      "Otobüslü · Uçaklı · Yurt içi · Yurt dışı",
  },
  {
    key: "activity",
    label: "Aktiviteler",
    shortLabel: "Aktivite",
    description:
      "Macera, deniz, doğa ve özel deneyimleri tek yerde seç.",
    href: "/aktiviteler",
    image:
      "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1400&q=90",
    icon: FaStar,
    detail:
      "Dalış · Safari · Rafting · Yamaç paraşütü",
  },
  {
    key: "yacht",
    label: "Yat & Tekne",
    shortLabel: "Yat",
    description:
      "Motor yat, gulet, katamaran ve özel deniz deneyimleri.",
    href: "/yatlar",
    image:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1400&q=90",
    icon: FaShip,
    detail:
      "Motor yat · Gulet · Katamaran · Günlük tekne",
  },
  {
    key: "transfer",
    label: "Transfer",
    shortLabel: "Transfer",
    description:
      "Havalimanı, marina ve şehirler arası VIP ulaşım.",
    href: "/transfer",
    image:
      "https://images.unsplash.com/photo-1515569067071-ec3b51335dd0?auto=format&fit=crop&w=1400&q=90",
    icon: FaCar,
    detail:
      "Havalimanı · VIP · Marina · Şehirler arası",
  },
];


const experienceIdeas = [
  {
    title: "Balayı",
    subtitle:
      "Konaklama + transfer + SPA + özel deneyimler",
    href:
      "/paketler",
    icon:
      FaHeart,
  },
  {
    title: "Deniz Tatili",
    subtitle:
      "Villa veya otel + yat + aktiviteler",
    href:
      "/paketler",
    icon:
      FaShip,
  },
  {
    title: "Macera",
    subtitle:
      "Safari + rafting + dalış + konaklama",
    href:
      "/paketler",
    icon:
      FaStar,
  },
  {
    title: "Yurt Dışı",
    subtitle:
      "Uçuş + konaklama + transfer + deneyim",
    href:
      "/paketler",
    icon:
      FaPlane,
  },
];


const destinations = [
  {
    title: "Fethiye",
    subtitle:
      "Villa · Otel · Aktivite · Yat",
    image:
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1200&q=90",
  },
  {
    title: "Bodrum",
    subtitle:
      "Otel · Villa · Yat · Transfer",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=90",
  },
  {
    title: "Antalya",
    subtitle:
      "Otel · Tur · Aktivite",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=90",
  },
  {
    title: "Dubai",
    subtitle:
      "Uçuş · Otel · Transfer · Deneyim",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=90",
  },
];


function today() {
  const date =
    new Date();

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


export default function Home() {

  const router =
    useRouter();


  const [
    activeProduct,
    setActiveProduct,
  ] =
    useState<MarketplaceKey>(
      "package"
    );


  const [
    destination,
    setDestination,
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


  const active =
    useMemo(
      () =>
        products.find(
          (
            item
          ) =>
            item.key ===
            activeProduct
        ) ??
        products[0],
      [
        activeProduct,
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


    if (date) {

      params.set(
        "date",
        date
      );

    }


    if (
      guests > 0
    ) {

      params.set(
        "guests",
        String(
          guests
        )
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
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* ====================================================
          HERO / MARKETPLACE COMMAND CENTER
      ==================================================== */}

      <section className="relative min-h-[760px] overflow-hidden border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=92")',
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/86 to-[#06101b]/28" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-[#06101b]/30 to-transparent" />


        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 lg:px-8 lg:pt-24">

          <div className="max-w-5xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300 backdrop-blur-xl">

              <FaCheckCircle />

              Turobus Travel Marketplace

            </div>


            <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[.92] tracking-[-.045em] md:text-7xl lg:text-[88px]">

              Tatili Arama.

              <span className="mt-2 block text-orange-500">
                Tatilini Oluştur.
              </span>

            </h1>


            <p className="mt-7 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">

              Tur, otel, villa, aktivite,
              yat, transfer ve komple tatil
              paketlerini tek Marketplace
              üzerinden keşfet.

              <strong className="text-white">
                {" "}
                İstersen tek ürün al,
                istersen tatilin tamamını
                tek deneyime dönüştür.
              </strong>

            </p>

          </div>


          {/* PRODUCT SWITCHER */}

          <div className="mt-10">

            <div className="flex max-w-full gap-2 overflow-x-auto pb-2">

              {products.map(
                (
                  product
                ) => {

                  const Icon =
                    product.icon;

                  const activeTab =
                    activeProduct ===
                    product.key;


                  return (
                    <button
                      key={
                        product.key
                      }
                      type="button"
                      onClick={() =>
                        setActiveProduct(
                          product.key
                        )
                      }
                      className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black transition ${
                        activeTab
                          ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "border-white/10 bg-black/35 text-slate-300 backdrop-blur-xl hover:border-orange-500/30"
                      }`}
                    >

                      <Icon />

                      {product.shortLabel}

                    </button>
                  );

                }
              )}

            </div>

          </div>


          {/* UNIVERSAL SEARCH */}

          <div className="mt-3 overflow-hidden rounded-[26px] border border-white/15 bg-[#07131f]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">

            <div className="grid lg:grid-cols-[1.3fr_.8fr_.65fr_auto]">

              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">

                  <FaMapMarkerAlt />

                  Nereye?

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
                  placeholder="Fethiye, Bodrum, Dubai..."
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
                  min={
                    today()
                  }
                  value={
                    date
                  }
                  onChange={(event) =>
                    setDate(
                      event.target.value
                    )
                  }
                  className="w-full bg-transparent text-sm font-black outline-none"
                />

              </label>


              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">

                  <FaUsers />

                  Misafir

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
                      length: 12,
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
                        {count} Misafir
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
                  className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                >

                  <FaSearch />

                  {active.shortLabel} Ara

                </button>

              </div>

            </div>


            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4">

              <div>

                <div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                  Şu an
                </div>

                <div className="mt-1 text-xs font-black text-white">
                  {active.label}
                </div>

              </div>


              <div className="hidden max-w-2xl text-right text-[10px] leading-5 text-slate-500 md:block">
                {active.description}
              </div>

            </div>

          </div>


          {/* TRUST BAR */}

          <div className="mt-4 grid overflow-hidden rounded-[20px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">

            {[
              [
                "Tek Marketplace",
                "Tüm tatil ürünleri",
              ],
              [
                "Gerçek Stok",
                "Bağlı operasyon sistemleri",
              ],
              [
                "Tek Rezervasyon",
                "Paket deneyimlerinde",
              ],
              [
                "Doğrulanmış Ürün",
                "Profesyonel sağlayıcılar",
              ],
            ].map(
              ([
                title,
                subtitle,
              ]) => (

                <div
                  key={
                    title
                  }
                  className="flex items-center gap-3 px-5 py-4"
                >

                  <FaShieldAlt className="text-emerald-400" />

                  <div>

                    <div className="text-xs font-black">
                      {title}
                    </div>

                    <div className="mt-0.5 text-[9px] text-slate-500">
                      {subtitle}
                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* ====================================================
          MARKETPLACE UNIVERSE
      ==================================================== */}

      <section className="px-5 py-16 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-6">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Turobus Marketplace
              </div>

              <h2 className="mt-2 max-w-3xl text-3xl font-black md:text-4xl">
                Tatil İçin İhtiyacın Olan Her Şey
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                Her kategori ayrı bir profesyonel satış sistemi.
                Paketler ise hepsini tek deneyimde birleştirir.
              </p>

            </div>


            <Link
              href="/paketler"
              className="flex items-center gap-2 text-xs font-black text-orange-400"
            >
              Tatil Paketlerini Gör
              <FaArrowRight />
            </Link>

          </div>


          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {products.map(
              (
                product,
                index
              ) => {

                const Icon =
                  product.icon;


                return (
                  <Link
                    key={
                      product.key
                    }
                    href={
                      product.href
                    }
                    className={`group relative min-h-[390px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1825] ${
                      index ===
                      0
                        ? "md:col-span-2 xl:col-span-1"
                        : ""
                    }`}
                  >

                    <img
                      src={
                        product.image
                      }
                      alt={
                        product.label
                      }
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />


                    <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-[#06101b]/65 to-transparent" />


                    <div className="absolute inset-x-0 bottom-0 p-6">

                      <div className="flex items-center justify-between">

                        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-black/40 text-orange-400 backdrop-blur-xl">

                          <Icon />

                        </div>


                        <div className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-xl transition group-hover:bg-orange-500">

                          <FaArrowRight />

                        </div>

                      </div>


                      <h3 className="mt-5 text-2xl font-black">
                        {product.label}
                      </h3>


                      <p className="mt-2 max-w-sm text-xs leading-6 text-slate-300">
                        {product.description}
                      </p>


                      <div className="mt-4 text-[9px] font-black uppercase tracking-[.1em] text-orange-300">
                        {product.detail}
                      </div>

                    </div>

                  </Link>
                );

              }
            )}

          </div>

        </div>

      </section>


      {/* ====================================================
          EXPERIENCE FIRST
      ==================================================== */}

      <section className="border-y border-white/10 bg-[#091522] px-5 py-16 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Yeni Tatil Mantığı
              </div>


              <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
                Ürün Seçmek Yerine
                <span className="block text-orange-500">
                  Deneyim Seç.
                </span>
              </h2>


              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">

                “Otel nereden bulurum,
                transferi nereden alırım,
                aktiviteyi kimden alırım?”
                sorularını ortadan kaldırıyoruz.

                <strong className="text-white">
                  {" "}
                  Turobus bunların tamamını
                  tek seyahat deneyiminde
                  birleştirebilir.
                </strong>

              </p>


              <Link
                href="/paketler"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-4 text-sm font-black hover:bg-orange-600"
              >
                Paketleri Keşfet
                <FaArrowRight />
              </Link>

            </div>


            <div className="grid gap-4 sm:grid-cols-2">

              {experienceIdeas.map(
                (
                  idea
                ) => {

                  const Icon =
                    idea.icon;


                  return (
                    <Link
                      key={
                        idea.title
                      }
                      href={
                        idea.href
                      }
                      className="group rounded-[26px] border border-white/10 bg-[#07111f] p-6 transition hover:-translate-y-1 hover:border-orange-500/30"
                    >

                      <div className="flex items-center justify-between">

                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                          <Icon />
                        </div>

                        <FaArrowRight className="text-slate-700 transition group-hover:text-orange-400" />

                      </div>


                      <h3 className="mt-6 text-xl font-black">
                        {idea.title}
                      </h3>


                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        {idea.subtitle}
                      </p>

                    </Link>
                  );

                }
              )}

            </div>

          </div>

        </div>

      </section>


      {/* ====================================================
          BUILD YOUR HOLIDAY
      ==================================================== */}

      <section className="px-5 py-16 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="overflow-hidden rounded-[36px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-[#0b1825] to-[#07111f]">

            <div className="grid lg:grid-cols-[1fr_.9fr]">

              <div className="p-7 md:p-10 lg:p-12">

                <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                  Turobus Experience Builder
                </div>


                <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight md:text-5xl">
                  Tatilini Parça Parça Değil,
                  <span className="block">
                    Tek Akışta Oluştur.
                  </span>
                </h2>


                <div className="mt-8 space-y-3">

                  {[
                    [
                      "1",
                      "Destinasyonu seç",
                    ],
                    [
                      "2",
                      "Otel veya villanı seç",
                    ],
                    [
                      "3",
                      "Uçak / otobüs / transfer ekle",
                    ],
                    [
                      "4",
                      "Aktivite, SPA veya yat deneyimi ekle",
                    ],
                    [
                      "5",
                      "Tek rezervasyonda tatilini tamamla",
                    ],
                  ].map(
                    ([
                      number,
                      text,
                    ]) => (

                      <div
                        key={
                          number
                        }
                        className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/15 p-4"
                      >

                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500 text-xs font-black">
                          {number}
                        </div>

                        <div className="text-sm font-black">
                          {text}
                        </div>

                      </div>

                    )
                  )}

                </div>


                <Link
                  href="/paketler"
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-orange-500 hover:text-white"
                >
                  Tatil Deneyimini Başlat
                  <FaArrowRight />
                </Link>

              </div>


              <div className="relative min-h-[500px]">

                <img
                  src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=90"
                  alt="Turobus tatil deneyimi"
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-[#0b1825] via-transparent to-transparent lg:block" />


                <div className="absolute bottom-6 left-6 right-6 rounded-[24px] border border-white/15 bg-black/55 p-5 backdrop-blur-xl">

                  <div className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">
                    Örnek Deneyim
                  </div>


                  <div className="mt-2 text-xl font-black">
                    Fethiye Seçkin Tatil
                  </div>


                  <div className="mt-4 flex flex-wrap gap-2">

                    {[
                      "Otel",
                      "VIP Transfer",
                      "SPA",
                      "Tekne",
                      "Aktivite",
                    ].map(
                      (
                        item
                      ) => (

                        <span
                          key={
                            item
                          }
                          className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-bold"
                        >
                          {item}
                        </span>

                      )
                    )}

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ====================================================
          DESTINATIONS
      ==================================================== */}

      <section className="border-y border-white/10 bg-[#091522] px-5 py-16 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Destinasyonlar
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Bir Şehirden Fazlasını Keşfet
              </h2>

            </div>


            <Link
              href="/paketler"
              className="flex items-center gap-2 text-xs font-black text-orange-400"
            >
              Tüm Tatil Paketleri
              <FaArrowRight />
            </Link>

          </div>


          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {destinations.map(
              (
                destination
              ) => (

                <Link
                  key={
                    destination.title
                  }
                  href={`/paketler?destination=${encodeURIComponent(
                    destination.title
                  )}`}
                  className="group relative min-h-[350px] overflow-hidden rounded-[28px] border border-white/10"
                >

                  <img
                    src={
                      destination.image
                    }
                    alt={
                      destination.title
                    }
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />


                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />


                  <div className="absolute bottom-0 left-0 right-0 p-5">

                    <h3 className="text-2xl font-black">
                      {destination.title}
                    </h3>


                    <div className="mt-1 text-[10px] text-slate-300">
                      {destination.subtitle}
                    </div>


                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-orange-300">
                      Deneyimleri Gör
                      <FaArrowRight />
                    </div>

                  </div>

                </Link>

              )
            )}

          </div>

        </div>

      </section>


      {/* ====================================================
          NETWORK
      ==================================================== */}

      <section className="px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.85fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Turobus Network
            </div>


            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight">
              Ön Yüzde Marketplace.
              <span className="block text-slate-500">
                Arkada Gerçek Turizm Operasyonu.
              </span>
            </h2>


            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400">
              Turobus ürünleri yalnızca vitrine koymak için tasarlanmıyor.
              Otel, villa, aktivite, paket, yat ve transfer sistemleri
              kendi operasyon yapılarına bağlanabilecek şekilde çalışıyor.
            </p>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Marketplace",
                  "Müşteri ürünleri tek merkezde keşfeder.",
                ],
                [
                  "Operasyon",
                  "Rezervasyon arka tarafta gerçek iş akışına dönüşür.",
                ],
                [
                  "Network",
                  "İşletmeler ve sağlayıcılar ortak satış ağına bağlanır.",
                ],
                [
                  "Paket Motoru",
                  "Farklı ürünler tek tatil deneyiminde birleşir.",
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
                    className="rounded-[22px] border border-white/10 bg-[#0b1825] p-5"
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


          <div className="rounded-[32px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-[#0b1825] to-[#07111f] p-7 md:p-9">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              ONE TRAVEL MARKETPLACE
            </div>


            <div className="mt-5 text-5xl font-black leading-[1.05]">

              Tur.
              <br />

              Otel.
              <br />

              Villa.
              <br />

              Aktivite.
              <br />

              Yat.
              <br />

              Transfer.
              <br />

              <span className="text-orange-500">
                Tek Deneyim.
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* ====================================================
          B2B CTA
      ==================================================== */}

      <section className="border-t border-white/10 bg-[#091522] px-5 py-16 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-col items-start justify-between gap-8 rounded-[32px] border border-white/10 bg-[#07111f] p-7 md:flex-row md:items-center md:p-10">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-400">
                Turizm İşletmeleri İçin
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Ürününü Turobus Network&apos;e Bağla.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                Otel, villa, tur, aktivite, yat veya transfer hizmetini
                işletme sisteminden yönet ve Marketplace&apos;te satışa aç.
              </p>

            </div>


            <Link
              href="/acente-basvuru"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-6 py-4 text-sm font-black hover:bg-orange-600"
            >
              Ürününü Yayınla
              <FaArrowRight />
            </Link>

          </div>

        </div>

      </section>


      <Footer />

      <BackToTop />

      <MobileBottomNav />

    </main>
  );
}
