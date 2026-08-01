"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaClock,
  FaHeart,
  FaMapMarkerAlt,
  FaStar,
} from "react-icons/fa";
import FavoriteButton from "@/components/favorites/FavoriteButton";
import { getFavoriteUserKey } from "@/lib/favorites";
import { supabase } from "@/lib/supabase";

type FavoriteRecord = {
  id: string;
  tour_id: string;
  tours: {
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
    status: string;
  } | null;
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const userKey = getFavoriteUserKey();

    const { data, error } = await supabase
      .from("favorites")
      .select(`
        id,
        tour_id,
        tours (
          id,
          slug,
          title,
          city,
          district,
          duration,
          adult_price,
          old_price,
          cover_image,
          rating,
          review_count,
          status
        )
      `)
      .eq("user_key", userKey)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage("Favoriler yüklenemedi.");
      setLoading(false);
      return;
    }

    setFavorites((data ?? []) as unknown as FavoriteRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFavorites();

    function refreshFavorites() {
      loadFavorites();
    }

    window.addEventListener(
      "favorites-updated",
      refreshFavorites
    );

    return () => {
      window.removeEventListener(
        "favorites-updated",
        refreshFavorites
      );
    };
  }, [loadFavorites]);

  const activeFavorites = favorites.filter(
    (favorite) =>
      favorite.tours && favorite.tours.status === "active"
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black">
              T
            </div>

            <div>
              <div className="text-xl font-black">TUROBUS</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-orange-400">
                Marketplace
              </div>
            </div>
          </Link>

          <Link
            href="/turlar"
            className="flex items-center gap-2 text-sm font-black text-slate-300 transition hover:text-orange-400"
          >
            <FaArrowLeft />
            Turlara Dön
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
            Kaydettiğin deneyimler
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Favorilerim
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Beğendiğin turları burada sakla ve daha sonra kolayca
            karşılaştır.
          </p>
        </div>

        {loading && (
          <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[470px] animate-pulse rounded-3xl bg-slate-900"
              />
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="mt-10 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
            {errorMessage}
          </div>
        )}

        {!loading &&
          !errorMessage &&
          activeFavorites.length > 0 && (
            <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {activeFavorites.map(({ id, tours: tour }) => {
                if (!tour) return null;

                return (
                  <article
                    key={id}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900 transition hover:-translate-y-2 hover:border-orange-500/40"
                  >
                    <div className="relative h-64 overflow-hidden bg-slate-800">
                      {tour.cover_image ? (
                        <img
                          src={tour.cover_image}
                          alt={tour.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500">
                          Görsel eklenmedi
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                      <FavoriteButton
                        tourId={tour.id}
                        className="absolute right-5 top-5 h-11 w-11 rounded-full bg-white text-slate-950 shadow-lg"
                      />
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <FaMapMarkerAlt className="text-orange-400" />
                          {tour.city}
                          {tour.district
                            ? `, ${tour.district}`
                            : ""}
                        </div>

                        <div className="flex items-center gap-1 font-black">
                          <FaStar className="text-yellow-400" />
                          {tour.rating ?? 5}
                          <span className="ml-1 text-xs text-slate-500">
                            ({tour.review_count ?? 0})
                          </span>
                        </div>
                      </div>

                      <h2 className="mt-4 text-2xl font-black">
                        {tour.title}
                      </h2>

                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                        <FaClock />
                        {tour.duration || "Süre belirtilmedi"}
                      </div>

                      <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
                        <div>
                          {tour.old_price > 0 && (
                            <p className="text-sm text-slate-500 line-through">
                              {tour.old_price.toLocaleString(
                                "tr-TR"
                              )}{" "}
                              TL
                            </p>
                          )}

                          <p className="text-3xl font-black text-orange-500">
                            {tour.adult_price.toLocaleString(
                              "tr-TR"
                            )}{" "}
                            TL
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
                  </article>
                );
              })}
            </div>
          )}

        {!loading &&
          !errorMessage &&
          activeFavorites.length === 0 && (
            <div className="mt-10 rounded-[30px] border border-white/10 bg-slate-900 p-12 text-center">
              <FaHeart
                className="mx-auto text-orange-400"
                size={34}
              />

              <h2 className="mt-5 text-3xl font-black">
                Henüz favorin yok
              </h2>

              <p className="mt-3 text-slate-400">
                Beğendiğin turlardaki kalp simgesine dokunarak
                buraya ekleyebilirsin.
              </p>

              <Link
                href="/turlar"
                className="mt-7 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-black"
              >
                Turları Keşfet
              </Link>
            </div>
          )}
      </section>
    </main>
  );
}
