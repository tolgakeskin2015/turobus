"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  FaBed,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSearch,
  FaShieldAlt,
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
  new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(Number(value || 0));


export default function VillasPage() {

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
    error,
    setError,
  ] =
    useState("");

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


  const load =
    useCallback(
      async () => {

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
                filters.destination ||
                null,

              p_guests:
                Number(
                  filters.guests ||
                    0
                ) || null,

              p_check_in:
                filters.checkIn ||
                null,

              p_check_out:
                filters.checkOut ||
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


  function submit(
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

    void load();

  }


  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <Navbar />


      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 px-5 pb-16 pt-32">

        <div className="mx-auto max-w-7xl">

          <div className="max-w-3xl">

            <div className="text-sm font-black uppercase tracking-[.25em] text-orange-400">
              TUROBUS VILLA
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              Sana uygun villayı bul.
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              Gerçek müsaitlik, merkezi stok ve
              Turobus güvencesiyle seçkin villa
              portföyünü keşfet.
            </p>

          </div>


          <form
            onSubmit={submit}
            className="mt-9 grid gap-3 rounded-[28px] border border-white/10 bg-white/[.05] p-4 shadow-2xl backdrop-blur-xl md:grid-cols-[1.2fr_1fr_1fr_.65fr_auto]"
          >

            <label>
              <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Nereye?
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
                placeholder="Fethiye, Ölüdeniz..."
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 outline-none focus:border-orange-400/50"
              />
            </label>


            <label>
              <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Giriş
              </span>

              <input
                type="date"
                value={filters.checkIn}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    checkIn:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 outline-none focus:border-orange-400/50"
              />
            </label>


            <label>
              <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Çıkış
              </span>

              <input
                type="date"
                value={filters.checkOut}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    checkOut:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 outline-none focus:border-orange-400/50"
              />
            </label>


            <label>
              <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Misafir
              </span>

              <input
                type="number"
                min="1"
                value={filters.guests}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    guests:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 outline-none focus:border-orange-400/50"
              />
            </label>


            <button
              type="submit"
              className="mt-auto flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 font-black transition hover:bg-orange-600"
            >
              <FaSearch />
              Ara
            </button>

          </form>

        </div>

      </section>


      <section className="px-5 py-12">

        <div className="mx-auto max-w-7xl">

          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">

            <div>
              <h2 className="text-2xl font-black">
                Müsait Villalar
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Portföy kontrol ediliyor..."
                  : `${villas.length} villa bulundu`}
              </p>
            </div>


            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs font-black text-emerald-300">
              <FaShieldAlt />
              Merkezi müsaitlik kontrolü
            </div>

          </div>


          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}


          {loading ? (

            <div className="py-24 text-center text-slate-500">
              Villalar yükleniyor...
            </div>

          ) : villas.length === 0 ? (

            <div className="rounded-[28px] border border-dashed border-white/10 py-24 text-center">

              <FaCalendarAlt className="mx-auto text-3xl text-slate-700" />

              <div className="mt-4 text-lg font-black">
                Bu kriterlerde müsait villa bulunamadı.
              </div>

              <div className="mt-2 text-sm text-slate-500">
                Tarih veya misafir sayısını değiştirerek tekrar ara.
              </div>

            </div>

          ) : (

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

              {villas.map(
                (villa) => (

                  <Link
                    key={villa.slug}
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
                    className="group overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 transition duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-2xl"
                  >

                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">

                      {villa.cover_url ? (
                        <img
                          src={
                            villa.cover_url
                          }
                          alt={villa.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-600">
                          Fotoğraf hazırlanıyor
                        </div>
                      )}

                      <div className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-black backdrop-blur">
                        DOĞRULANMIŞ VİLLA
                      </div>

                    </div>


                    <div className="p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <h3 className="text-xl font-black">
                            {villa.name}
                          </h3>

                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <FaMapMarkerAlt />
                            {[villa.city, villa.district]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>

                        </div>

                        <div className="text-right">
                          <div className="text-lg font-black text-orange-400">
                            {money(
                              villa.base_nightly_rate,
                              villa.currency
                            )}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            / gece
                          </div>
                        </div>

                      </div>


                      <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black text-slate-400">

                        <span className="flex items-center gap-1.5 rounded-full bg-white/[.05] px-3 py-2">
                          <FaUsers />
                          {villa.max_guests} kişi
                        </span>

                        <span className="flex items-center gap-1.5 rounded-full bg-white/[.05] px-3 py-2">
                          <FaBed />
                          {villa.bedrooms} yatak odası
                        </span>

                        <span className="rounded-full bg-white/[.05] px-3 py-2">
                          Min. {villa.minimum_stay} gece
                        </span>

                      </div>


                      <div className="mt-5 border-t border-white/10 pt-4 text-sm font-black text-orange-400">
                        Villayı incele →
                      </div>

                    </div>

                  </Link>

                )
              )}

            </div>

          )}

        </div>

      </section>


      <Footer />

    </main>
  );
}
