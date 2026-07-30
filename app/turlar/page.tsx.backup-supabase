"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaChevronDown,
  FaClock,
  FaHeart,
  FaMapMarkerAlt,
  FaSearch,
  FaShieldAlt,
  FaSlidersH,
  FaStar,
} from "react-icons/fa";

const tours = [
  {
    id: 1,
    title: "Fethiye Jeep Safari",
    location: "Fethiye, Muğla",
    category: "Macera",
    duration: "Tam Gün",
    rating: 4.9,
    reviews: 1284,
    oldPrice: 3250,
    price: 2490,
    badge: "Çok Satan",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 2,
    title: "Ölüdeniz Tekne Turu",
    location: "Ölüdeniz, Fethiye",
    category: "Tekne",
    duration: "8 Saat",
    rating: 4.8,
    reviews: 936,
    oldPrice: 2450,
    price: 1990,
    badge: "Erken Rezervasyon",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 3,
    title: "Kapadokya Balon Turu",
    location: "Göreme, Nevşehir",
    category: "Aktivite",
    duration: "3 Saat",
    rating: 4.9,
    reviews: 2147,
    oldPrice: 5750,
    price: 4990,
    badge: "Premium",
    image:
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 4,
    title: "Dalaman Çayı Rafting",
    location: "Dalaman, Muğla",
    category: "Macera",
    duration: "Tam Gün",
    rating: 4.8,
    reviews: 742,
    oldPrice: 2900,
    price: 2350,
    badge: "Popüler",
    image:
      "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 5,
    title: "Antalya Şehir ve Şelale Turu",
    location: "Antalya",
    category: "Günübirlik",
    duration: "9 Saat",
    rating: 4.7,
    reviews: 584,
    oldPrice: 2250,
    price: 1850,
    badge: "Yeni",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: 6,
    title: "Pamukkale ve Hierapolis Turu",
    location: "Pamukkale, Denizli",
    category: "Kültür",
    duration: "Tam Gün",
    rating: 4.9,
    reviews: 1186,
    oldPrice: 3100,
    price: 2690,
    badge: "Önerilen",
    image:
      "https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?auto=format&fit=crop&w=1200&q=85",
  },
];

const categories = [
  "Tümü",
  "Macera",
  "Tekne",
  "Aktivite",
  "Günübirlik",
  "Kültür",
];

export default function ToursPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [sort, setSort] = useState("Önerilen");
  const [mobileFilters, setMobileFilters] = useState(false);

  const filteredTours = useMemo(() => {
    let result = tours.filter((tour) => {
      const matchesSearch =
        tour.title.toLocaleLowerCase("tr-TR").includes(
          search.toLocaleLowerCase("tr-TR")
        ) ||
        tour.location.toLocaleLowerCase("tr-TR").includes(
          search.toLocaleLowerCase("tr-TR")
        );

      const matchesCategory =
        category === "Tümü" || tour.category === category;

      return matchesSearch && matchesCategory;
    });

    if (sort === "Fiyat: Artan") {
      result = [...result].sort((a, b) => a.price - b.price);
    }

    if (sort === "Fiyat: Azalan") {
      result = [...result].sort((a, b) => b.price - a.price);
    }

    if (sort === "En Yüksek Puan") {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [search, category, sort]);

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
            className="text-sm font-bold text-slate-300 transition hover:text-orange-400"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </header>

      <section className="border-b border-white/10 bg-slate-900/40 px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
            Türkiye’nin en seçkin deneyimleri
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Turları keşfet
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Doğrulanmış acentelerin sunduğu turları karşılaştır ve sana en
            uygun deneyimi güvenle seç.
          </p>

          <div className="mt-9 flex max-w-3xl items-center gap-3 rounded-2xl bg-white p-3">
            <FaSearch className="ml-3 text-orange-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tur, şehir veya bölge ara"
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

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMobileFilters((value) => !value)}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-bold lg:hidden"
            >
              <FaSlidersH />
              Filtreler
            </button>

            <label className="relative flex min-h-12 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="appearance-none bg-transparent pr-7 text-sm font-bold text-white outline-none"
              >
                <option className="bg-slate-900">Önerilen</option>
                <option className="bg-slate-900">Fiyat: Artan</option>
                <option className="bg-slate-900">Fiyat: Azalan</option>
                <option className="bg-slate-900">En Yüksek Puan</option>
              </select>

              <FaChevronDown className="pointer-events-none absolute right-4 text-xs text-slate-500" />
            </label>
          </div>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            <span className="font-black text-white">
              {filteredTours.length}
            </span>{" "}
            tur bulundu
          </p>
        </div>

        {mobileFilters && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900 p-6 lg:hidden">
            <p className="font-black">Gelişmiş filtreler yakında burada olacak.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredTours.map((tour) => (
            <article
              key={tour.id}
              className="group overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 transition duration-300 hover:-translate-y-2 hover:border-orange-500/40"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={tour.image}
                  alt={tour.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                <div className="absolute left-5 top-5 rounded-full bg-orange-500 px-4 py-2 text-xs font-black">
                  {tour.badge}
                </div>

                <button
                  type="button"
                  aria-label="Favorilere ekle"
                  className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md"
                >
                  <FaHeart />
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <FaMapMarkerAlt className="text-orange-400" />
                    {tour.location}
                  </div>

                  <div className="flex items-center gap-1 font-black">
                    <FaStar className="text-yellow-400" />
                    {tour.rating}
                  </div>
                </div>

                <h2 className="mt-4 text-2xl font-black">
                  {tour.title}
                </h2>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <FaClock />
                  {tour.duration}
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <FaShieldAlt className="text-emerald-400" />
                  Ücretsiz iptal seçeneği
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-sm text-slate-500 line-through">
                    {tour.oldPrice.toLocaleString("tr-TR")} TL
                  </p>

                  <div className="mt-1 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black text-orange-500">
                        {tour.price.toLocaleString("tr-TR")} TL
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        kişi başı
                      </p>
                    </div>

                    <Link
                      href={`/turlar/${tour.id}`}
                      className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black transition hover:bg-orange-600"
                    >
                      İncele
                    </Link>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    {tour.reviews.toLocaleString("tr-TR")} doğrulanmış yorum
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredTours.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">
            <h2 className="text-2xl font-black">Sonuç bulunamadı</h2>
            <p className="mt-3 text-slate-400">
              Arama kelimelerini veya kategoriyi değiştirmeyi dene.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
