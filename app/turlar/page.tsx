"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaArrowLeft,
  FaChevronDown,
  FaClock,
  FaHeart,
  FaMapMarkerAlt,
  FaSearch,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";

type Tour = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  city: string;
  district: string | null;
  category: string | null;
  duration: string | null;
  adult_price: number;
  old_price: number;
  cover_image: string | null;
  rating: number | null;
  review_count: number | null;
  bestseller: boolean;
  early_booking: boolean;
  featured: boolean;
  status: string;
  created_at: string;
};

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [sort, setSort] = useState("Önerilen");

  useEffect(() => {
    async function loadTours() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("tours")
        .select(
          "id, slug, title, short_description, city, district, category, duration, adult_price, old_price, cover_image, rating, review_count, bestseller, early_booking, featured, status, created_at"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);

        setErrorMessage(
          "Turlar yüklenemedi. Lütfen daha sonra tekrar deneyin."
        );

        setLoading(false);
        return;
      }

      setTours((data ?? []) as Tour[]);
      setLoading(false);
    }

    loadTours();
  }, []);

  const categories = useMemo(() => {
    const values = tours
      .map((tour) => tour.category)
      .filter((value): value is string => Boolean(value));

    return ["Tümü", ...Array.from(new Set(values))];
  }, [tours]);

  const filteredTours = useMemo(() => {
    let result = tours.filter((tour) => {
      const query = search.trim().toLocaleLowerCase("tr-TR");

      const matchesSearch =
        !query ||
        tour.title.toLocaleLowerCase("tr-TR").includes(query) ||
        tour.city.toLocaleLowerCase("tr-TR").includes(query) ||
        (tour.district ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        (tour.category ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(query);

      const matchesCategory =
        category === "Tümü" || tour.category === category;

      return matchesSearch && matchesCategory;
    });

    if (sort === "Fiyat: Artan") {
      result = [...result].sort(
        (first, second) =>
          first.adult_price - second.adult_price
      );
    }

    if (sort === "Fiyat: Azalan") {
      result = [...result].sort(
        (first, second) =>
          second.adult_price - first.adult_price
      );
    }

    if (sort === "En Yüksek Puan") {
      result = [...result].sort(
        (first, second) =>
          Number(second.rating ?? 0) -
          Number(first.rating ?? 0)
      );
    }

    if (sort === "En Yeniler") {
      result = [...result].sort(
        (first, second) =>
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime()
      );
    }

    if (sort === "Önerilen") {
      result = [...result].sort((first, second) => {
        const firstScore =
          Number(first.featured) * 3 +
          Number(first.bestseller) * 2 +
          Number(first.early_booking);

        const secondScore =
          Number(second.featured) * 3 +
          Number(second.bestseller) * 2 +
          Number(second.early_booking);

        return secondScore - firstScore;
      });
    }

    return result;
  }, [category, search, sort, tours]);

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
            href="/"
            className="flex items-center gap-2 text-sm font-black text-slate-300 transition hover:text-orange-400"
          >
            <FaArrowLeft />
            Ana Sayfa
          </Link>
        </div>
      </header>

      <section className="border-b border-white/10 bg-slate-900/40 px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
            Doğrulanmış acentelerden deneyimler
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Turları keşfet
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Supabase’e eklenen güncel turları karşılaştır ve sana uygun
            deneyimi güvenle seç.
          </p>

          <div className="mt-9 flex max-w-3xl items-center gap-3 rounded-2xl bg-white p-3">
            <FaSearch className="ml-3 shrink-0 text-orange-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tur, şehir, bölge veya kategori ara"
              className="min-h-12 flex-1 bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
            />

            <button
              type="button"
              className="min-h-12 rounded-xl bg-orange-500 px-6 text-sm font-black text-white"
            >
              Ara
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
                  category === item
                    ? "bg-orange-500 text-white"
                    : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-orange-500/30"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="relative flex min-h-12 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="appearance-none bg-transparent pr-8 text-sm font-bold text-white outline-none"
            >
              <option className="bg-slate-900">Önerilen</option>
              <option className="bg-slate-900">En Yeniler</option>
              <option className="bg-slate-900">Fiyat: Artan</option>
              <option className="bg-slate-900">Fiyat: Azalan</option>
              <option className="bg-slate-900">
                En Yüksek Puan
              </option>
            </select>

            <FaChevronDown className="pointer-events-none absolute right-4 text-xs text-slate-500" />
          </label>
        </div>

        {!loading && !errorMessage && (
          <p className="mb-8 text-sm text-slate-400">
            <span className="font-black text-white">
              {filteredTours.length}
            </span>{" "}
            tur bulundu
          </p>
        )}

        {loading && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-[520px] animate-pulse rounded-[28px] bg-slate-900"
              />
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-400">
            {errorMessage}
          </div>
        )}

        {!loading &&
          !errorMessage &&
          filteredTours.length > 0 && (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredTours.map((tour) => (
                <article
                  key={tour.id}
                  className="group overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 transition duration-300 hover:-translate-y-2 hover:border-orange-500/40"
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

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
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

                      {tour.featured && (
                        <span className="rounded-full bg-blue-600 px-4 py-2 text-xs font-black">
                          Öne Çıkan
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label="Favorilere ekle"
                      className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition hover:bg-white hover:text-slate-950"
                    >
                      <FaHeart />
                    </button>
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

                        <span className="ml-1 text-xs font-medium text-slate-500">
                          ({tour.review_count ?? 0})
                        </span>
                      </div>
                    </div>

                    <h2 className="mt-4 text-2xl font-black">
                      {tour.title}
                    </h2>

                    {tour.short_description && (
                      <p className="mt-3 line-clamp-2 leading-7 text-slate-400">
                        {tour.short_description}
                      </p>
                    )}

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
                            {tour.adult_price.toLocaleString(
                              "tr-TR"
                            )}{" "}
                            TL
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

        {!loading &&
          !errorMessage &&
          filteredTours.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">
              <h2 className="text-2xl font-black">
                Tur bulunamadı
              </h2>

              <p className="mt-3 text-slate-400">
                Arama kelimesini veya kategoriyi değiştirmeyi dene.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("Tümü");
                }}
                className="mt-6 rounded-xl bg-orange-500 px-6 py-3 font-black"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
      </section>
    </main>
  );
}
