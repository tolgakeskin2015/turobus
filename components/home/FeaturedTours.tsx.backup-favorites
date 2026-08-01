"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaClock,
  FaHeart,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";

type Tour = {
  id: string;
  slug: string;
  title: string;
  city: string;
  district: string | null;
  duration: string | null;
  adult_price: number;
  old_price: number;
  cover_image: string | null;
  rating: number | null;
  review_count: number | null;
  bestseller: boolean;
  early_booking: boolean;
};

export default function FeaturedTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTours() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("tours")
        .select(
          "id, slug, title, city, district, duration, adult_price, old_price, cover_image, rating, review_count, bestseller, early_booking"
        )
        .eq("status", "active")
        .order("bestseller", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error(error);
        setErrorMessage("Turlar yüklenemedi.");
        setLoading(false);
        return;
      }

      setTours((data ?? []) as Tour[]);
      setLoading(false);
    }

    loadTours();
  }, []);

  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-orange-400">
              Misafirlerin favorileri
            </p>

            <h2 className="text-4xl font-black md:text-5xl">
              En Çok Satan Turlar
            </h2>

            <p className="mt-4 text-lg text-slate-400">
              Supabase’e eklenen aktif tur ve deneyimleri keşfet.
            </p>
          </div>

          <Link
            href="/turlar"
            className="text-sm font-black text-orange-400 transition hover:text-orange-300"
          >
            Tüm turları gör →
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[500px] animate-pulse rounded-3xl bg-slate-900"
              />
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && tours.length > 0 && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <article
                key={tour.id}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900 transition duration-300 hover:-translate-y-2 hover:border-orange-500/40"
              >
                <div className="relative h-64 overflow-hidden bg-slate-800">
                  {tour.cover_image ? (
                    <img
                      src={tour.cover_image}
                      alt={tour.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">
                      Kapak görseli eklenmedi
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                  <div className="absolute left-5 top-5 flex gap-2">
                    {tour.bestseller && (
                      <span className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black">
                        Çok Satan
                      </span>
                    )}

                    {tour.early_booking && (
                      <span className="rounded-full bg-purple-600 px-4 py-2 text-xs font-black">
                        Erken Rezervasyon
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label="Favorilere ekle"
                    className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
                  >
                    <FaHeart />
                  </button>
                </div>

                <div className="p-6">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <FaMapMarkerAlt className="text-orange-500" />
                      {tour.city}
                      {tour.district ? `, ${tour.district}` : ""}
                    </div>

                    <div className="flex items-center gap-2">
                      <FaStar className="text-yellow-400" />

                      <span className="font-bold">
                        {tour.rating ?? 5}
                      </span>

                      <span className="text-xs text-slate-500">
                        ({tour.review_count ?? 0})
                      </span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black">
                    {tour.title}
                  </h3>

                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                    <FaClock />
                    {tour.duration || "Süre belirtilmedi"}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                    <FaShieldAlt className="text-emerald-400" />
                    Güvenli rezervasyon
                  </div>

                  <div className="mt-6 border-t border-white/10 pt-5">
                    {tour.old_price > 0 && (
                      <p className="text-sm text-slate-500 line-through">
                        {tour.old_price.toLocaleString("tr-TR")} TL
                      </p>
                    )}

                    <div className="mt-1 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-black text-orange-500">
                          {tour.adult_price.toLocaleString("tr-TR")} TL
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          kişi başı
                        </p>
                      </div>

                      <Link
                        href={`/turlar/${tour.slug}`}
                        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black transition hover:bg-orange-600"
                      >
                        İncele
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !errorMessage && tours.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">
            <h3 className="text-2xl font-black">
              Henüz aktif tur bulunmuyor
            </h3>

            <p className="mt-3 text-slate-400">
              Dashboard’dan aktif bir tur eklediğinde burada görünecek.
            </p>

            <Link
              href="/dashboard/tur-ekle"
              className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-black"
            >
              Yeni Tur Ekle
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
