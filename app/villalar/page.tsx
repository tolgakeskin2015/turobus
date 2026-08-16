"use client";

import {
  FormEvent,
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
  FaCalendarAlt,
  FaCheckCircle,
  FaHeart,
  FaMapMarkerAlt,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type Villa = {
  slug: string;
  name: string;
  city: string | null;
  district: string | null;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_nightly_rate: number;
  currency: string;
  minimum_stay: number;
  cleaning_fee: number;
  security_deposit: number;
  cover_url: string | null;
};


const money = (
  value: number,
  currency = "TRY"
) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));


const today = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


const locations = [
  {
    name: "Fethiye",
    subtitle: "Ölüdeniz · Kayaköy · Çalış",
    image:
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Kaş",
    subtitle: "Kalkan · Patara",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Bodrum",
    subtitle: "Yalıkavak · Türkbükü",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Antalya",
    subtitle: "Kaş · Kemer · Belek",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Marmaris",
    subtitle: "Selimiye · Bozburun",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Çeşme",
    subtitle: "Alaçatı · Ilıca",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
  },
];


export default function VillasPage() {

  const resultsRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    villas,
    setVillas,
  ] =
    useState<Villa[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    searching,
    setSearching,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    favorites,
    setFavorites,
  ] =
    useState<Set<string>>(
      new Set()
    );

  const [
    filters,
    setFilters,
  ] =
    useState({
      destination: "",
      checkIn: "",
      checkOut: "",
      guests: "2",
    });


  const load = useCallback(
    async (
      nextFilters = filters
    ) => {

      setLoading(true);
      setError("");

      const {
        data,
        error: rpcError,
      } =
        await supabase.rpc(
          "get_public_villa_marketplace",
          {
            p_city:
              nextFilters.destination ||
              null,

            p_guests:
              Number(
                nextFilters.guests ||
                  0
              ) || null,

            p_check_in:
              nextFilters.checkIn ||
              null,

            p_check_out:
              nextFilters.checkOut ||
              null,
          }
        );


      if (rpcError) {

        setError(
          rpcError.message
        );

        setVillas([]);

      } else {

        setVillas(
          (data ??
            []) as Villa[]
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
      // ilk açılış
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );


  const heroImage =
    useMemo(
      () =>
        villas.find(
          (villa) =>
            Boolean(
              villa.cover_url
            )
        )?.cover_url ??
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=2000&q=90",
      [
        villas,
      ]
    );


  const featured =
    villas.slice(
      0,
      4
    );


  async function submit(
    event: FormEvent
  ) {

    event.preventDefault();

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


    setSearching(true);

    await load(
      filters
    );

    setSearching(false);


    window.setTimeout(
      () => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      },
      120
    );

  }


  async function selectLocation(
    location: string
  ) {

    const next = {
      ...filters,
      destination:
        location,
    };

    setFilters(
      next
    );

    await load(
      next
    );

    window.setTimeout(
      () => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      },
      100
    );

  }


  function toggleFavorite(
    slug: string
  ) {

    setFavorites(
      (current) => {

        const next =
          new Set(
            current
          );

        if (
          next.has(slug)
        ) {
          next.delete(
            slug
          );
        } else {
          next.add(
            slug
          );
        }

        return next;

      }
    );

  }


  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07111c] text-white">

      <Navbar />


      {/* ======================================================
          PREMIUM HERO
      ====================================================== */}

      <section className="relative min-h-[760px] overflow-hidden border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              `url("${heroImage}")`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06111d]/95 via-[#06111d]/75 to-[#06111d]/25" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#07111c] via-transparent to-[#07111c]/30" />


        <div className="relative mx-auto flex min-h-[680px] max-w-7xl flex-col justify-center px-5 py-16 lg:px-8">

          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-emerald-300 backdrop-blur-xl">

              <FaCheckCircle />

              Gerçek Müsaitlik

            </div>


            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[.95] tracking-tight md:text-7xl">

              Size Uygun

              <span className="mt-2 block text-orange-500">
                Lüks Villayı Bul
              </span>

            </h1>


            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 md:text-lg">

              Gerçek müsaitlik, merkezi stok
              ve güvenli rezervasyon ile
              hayalinizdeki tatili kolayca
              planlayın.

            </p>

          </div>


          {/* SEARCH BAR */}

          <form
            onSubmit={submit}
            className="mt-10 grid overflow-hidden rounded-[22px] border border-white/15 bg-[#07111c]/90 shadow-2xl shadow-black/40 backdrop-blur-2xl md:grid-cols-[1.25fr_1fr_1fr_.7fr_auto]"
          >

            <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r">

              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <FaMapMarkerAlt />
                Lokasyon
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
                placeholder="Nereye gitmek istersiniz?"
                className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600"
              />

            </label>


            <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r">

              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <FaCalendarAlt />
                Giriş
              </span>

              <input
                type="date"
                min={today()}
                value={
                  filters.checkIn
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    checkIn:
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-bold text-white outline-none"
              />

            </label>


            <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r">

              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <FaCalendarAlt />
                Çıkış
              </span>

              <input
                type="date"
                min={
                  filters.checkIn ||
                  today()
                }
                value={
                  filters.checkOut
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    checkOut:
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-bold text-white outline-none"
              />

            </label>


            <label className="border-b border-white/10 p-4 md:border-b-0 md:border-r">

              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
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
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-bold text-white outline-none"
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
                  (count) => (

                    <option
                      key={count}
                      value={count}
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
                type="submit"
                disabled={searching}
                className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50"
              >

                <FaSearch />

                {searching
                  ? "Aranıyor"
                  : "Ara"}

              </button>

            </div>

          </form>


          {/* TRUST STRIP */}

          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              [
                "Canlı Müsaitlik",
                "Gerçek takvim kontrolü",
              ],
              [
                "Tek Stok",
                "Çifte satış koruması",
              ],
              [
                "Güvenli Rezervasyon",
                "Merkezi kayıt sistemi",
              ],
              [
                "Doğrulanmış Portföy",
                "Villa OS bağlantılı",
              ],
            ].map(
              ([
                title,
                description,
              ]) => (

                <div
                  key={title}
                  className="flex items-center gap-3 border-white/10 px-5 py-4 xl:border-r last:border-r-0"
                >

                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-400">

                    <FaShieldAlt />

                  </div>

                  <div>

                    <div className="text-xs font-black">
                      {title}
                    </div>

                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {description}
                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* ======================================================
          FEATURED VILLAS
      ====================================================== */}

      <section className="px-5 py-16 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Seçkin Portföy
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Öne Çıkan Villalar
              </h2>

            </div>


            <button
              type="button"
              onClick={() =>
                resultsRef.current?.scrollIntoView({
                  behavior: "smooth",
                })
              }
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-black text-slate-300 transition hover:border-orange-500/30 hover:text-white"
            >
              Tüm Villaları Gör
              <FaArrowRight />
            </button>

          </div>


          {featured.length > 0 ? (

            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {featured.map(
                (
                  villa,
                  index
                ) => (

                  <div
                    key={
                      villa.slug
                    }
                    className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1825] transition hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-black/40"
                  >

                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">

                      {villa.cover_url ? (

                        <img
                          src={
                            villa.cover_url
                          }
                          alt={
                            villa.name
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />

                      ) : (

                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-xs text-slate-600">
                          Villa görseli hazırlanıyor
                        </div>

                      )}


                      <div className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-[9px] font-black text-white">
                        {index === 0
                          ? "ÖNE ÇIKAN"
                          : "VİLLA OS"}
                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          toggleFavorite(
                            villa.slug
                          )
                        }
                        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur"
                        aria-label="Favoriye ekle"
                      >

                        <FaHeart
                          className={
                            favorites.has(
                              villa.slug
                            )
                              ? "text-red-400"
                              : "text-white"
                          }
                        />

                      </button>

                    </div>


                    <div className="p-4">

                      <h3 className="truncate text-base font-black">
                        {villa.name}
                      </h3>


                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">

                        <FaMapMarkerAlt />

                        {[villa.district, villa.city]
                          .filter(Boolean)
                          .join(", ")}

                      </div>


                      <div className="mt-4 flex items-center gap-3 border-b border-white/10 pb-4 text-[9px] font-bold text-slate-500">

                        <span>
                          {villa.max_guests} Misafir
                        </span>

                        <span>
                          {villa.bedrooms} Oda
                        </span>

                        <span>
                          {villa.bathrooms} Banyo
                        </span>

                      </div>


                      <div className="mt-4 flex items-center justify-between gap-3">

                        <div>

                          <div className="text-lg font-black text-white">
                            {money(
                              villa.base_nightly_rate,
                              villa.currency
                            )}
                          </div>

                          <div className="text-[9px] text-slate-600">
                            / gece
                          </div>

                        </div>


                        <Link
                          href={{
                            pathname:
                              `/villalar/${villa.slug}`,
                            query: {
                              ...(filters.checkIn
                                ? {
                                    checkIn:
                                      filters.checkIn,
                                  }
                                : {}),
                              ...(filters.checkOut
                                ? {
                                    checkOut:
                                      filters.checkOut,
                                  }
                                : {}),
                              guests:
                                filters.guests,
                            },
                          }}
                          className="rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-black transition hover:bg-orange-600"
                        >
                          İncele
                        </Link>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          ) : (

            <div className="mt-8 rounded-[28px] border border-dashed border-white/10 bg-white/[.02] p-12 text-center">

              <FaShieldAlt className="mx-auto text-3xl text-orange-500/50" />

              <div className="mt-4 text-lg font-black">
                Marketplace villaları burada görünecek
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Villa OS üzerinden Marketplace&apos;e açılan villalar otomatik olarak bu alana gelir.
              </p>

            </div>

          )}

        </div>

      </section>


      {/* ======================================================
          POPULAR DESTINATIONS
      ====================================================== */}

      <section className="border-y border-white/10 bg-[#091522] px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Türkiye&apos;nin Seçkin Rotaları
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Öne Çıkan Lokasyonlar
            </h2>

          </div>


          <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">

            {locations.map(
              (
                location
              ) => (

                <button
                  key={
                    location.name
                  }
                  type="button"
                  onClick={() =>
                    void selectLocation(
                      location.name
                    )
                  }
                  className="group relative min-h-[150px] overflow-hidden rounded-[20px] border border-white/10 text-left"
                >

                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage:
                        `url("${location.image}")`,
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />


                  <div className="absolute inset-x-0 bottom-0 p-4">

                    <div className="font-black">
                      {location.name}
                    </div>

                    <div className="mt-1 text-[9px] text-slate-300">
                      {location.subtitle}
                    </div>

                  </div>

                </button>

              )
            )}

          </div>

        </div>

      </section>


      {/* ======================================================
          SEARCH RESULTS
      ====================================================== */}

      <section
        ref={resultsRef}
        className="scroll-mt-24 px-5 py-16 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">


          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Canlı Sonuçlar
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Müsait Villalar
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Portföy kontrol ediliyor..."
                  : `${villas.length} uygun villa bulundu`}
              </p>

            </div>


            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-2 text-[10px] font-black text-emerald-300">

              <FaCheckCircle />

              Merkezi stok doğrulandı

            </div>

          </div>


          {error && (

            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>

          )}


          {loading ? (

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {[1, 2, 3].map(
                (item) => (

                  <div
                    key={item}
                    className="h-[420px] animate-pulse rounded-[26px] bg-white/[.04]"
                  />

                )
              )}

            </div>

          ) : villas.length === 0 ? (

            <div className="mt-8 rounded-[30px] border border-dashed border-white/10 bg-[#0b1825] px-5 py-20 text-center">

              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/10 text-2xl text-orange-400">
                <FaSearch />
              </div>

              <h3 className="mt-5 text-xl font-black">
                Bu kriterlerde müsait villa bulunamadı.
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Tarih, lokasyon veya misafir sayısını değiştirerek yeni bir arama yapabilirsin.
              </p>

            </div>

          ) : (

            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

              {villas.map(
                (villa) => (

                  <Link
                    key={
                      villa.slug
                    }
                    href={{
                      pathname:
                        `/villalar/${villa.slug}`,
                      query: {
                        ...(filters.checkIn
                          ? {
                              checkIn:
                                filters.checkIn,
                            }
                          : {}),
                        ...(filters.checkOut
                          ? {
                              checkOut:
                                filters.checkOut,
                            }
                          : {}),
                        guests:
                          filters.guests,
                      },
                    }}
                    className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-black/30"
                  >

                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">

                      {villa.cover_url ? (

                        <img
                          src={
                            villa.cover_url
                          }
                          alt={
                            villa.name
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />

                      ) : (

                        <div className="flex h-full items-center justify-center text-sm text-slate-600">
                          Fotoğraf hazırlanıyor
                        </div>

                      )}


                      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[9px] font-black backdrop-blur">
                        DOĞRULANMIŞ VİLLA
                      </div>

                    </div>


                    <div className="p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <h3 className="truncate text-xl font-black">
                            {villa.name}
                          </h3>

                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">

                            <FaMapMarkerAlt />

                            {[villa.city, villa.district]
                              .filter(Boolean)
                              .join(" · ")}

                          </div>

                        </div>


                        <div className="shrink-0 text-right">

                          <div className="text-lg font-black text-orange-400">
                            {money(
                              villa.base_nightly_rate,
                              villa.currency
                            )}
                          </div>

                          <div className="text-[9px] text-slate-600">
                            / gece
                          </div>

                        </div>

                      </div>


                      <div className="mt-5 flex flex-wrap gap-2">

                        <span className="flex items-center gap-1.5 rounded-full bg-white/[.05] px-3 py-2 text-[10px] font-black text-slate-400">
                          <FaUsers />
                          {villa.max_guests} kişi
                        </span>

                        <span className="flex items-center gap-1.5 rounded-full bg-white/[.05] px-3 py-2 text-[10px] font-black text-slate-400">
                          <FaBed />
                          {villa.bedrooms} oda
                        </span>

                        <span className="rounded-full bg-white/[.05] px-3 py-2 text-[10px] font-black text-slate-400">
                          {villa.bathrooms} banyo
                        </span>

                        <span className="rounded-full bg-white/[.05] px-3 py-2 text-[10px] font-black text-slate-400">
                          Min. {villa.minimum_stay} gece
                        </span>

                      </div>


                      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">

                        <div className="flex items-center gap-1 text-[10px] font-black text-amber-300">
                          <FaStar />
                          Canlı müsaitlik
                        </div>

                        <div className="flex items-center gap-2 text-xs font-black text-orange-400">
                          Villayı İncele
                          <FaArrowRight />
                        </div>

                      </div>

                    </div>

                  </Link>

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* ======================================================
          WHY TUROBUS
      ====================================================== */}

      <section className="border-t border-white/10 bg-[#091522] px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.75fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Neden Turobus Villa?
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Rezervasyondan operasyona tek sistem.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Gerçek Müsaitlik",
                  "Villa OS merkezi takvimindeki gerçek stok kullanılır.",
                ],
                [
                  "Çifte Satış Koruması",
                  "Aynı tarih iki farklı kanaldan tekrar satılamaz.",
                ],
                [
                  "Canlı Fiyat",
                  "Günlük fiyat ve minimum gece kuralları doğrudan uygulanır.",
                ],
                [
                  "Tek Operasyon",
                  "Rezervasyon doğrudan Villa OS operasyonuna düşer.",
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

                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                      <FaShieldAlt />
                    </div>

                    <h3 className="mt-4 font-black">
                      {title}
                    </h3>

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
              Turobus Villa Network
            </div>

            <div className="mt-4 text-4xl font-black">
              Tek Takvim.
              <br />
              Tek Stok.
              <br />
              Tek Operasyon.
            </div>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Direkt satış, B2B, Airbnb ve Turobus Marketplace aynı merkezi villa stokunda birleşir.
            </p>

            <div className="mt-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.05] p-4 text-xs font-bold text-emerald-300">
              ✓ Marketplace satışları otomatik olarak Villa OS&apos;a aktarılır.
            </div>

          </div>

        </div>

      </section>


      <Footer />

    </main>
  );
}
