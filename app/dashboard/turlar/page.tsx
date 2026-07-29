"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaArrowLeft,
  FaEdit,
  FaEye,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaStar,
} from "react-icons/fa";

type Tour = {
  id: string;
  slug: string;
  title: string;
  city: string;
  district: string | null;
  category: string | null;
  duration: string | null;
  adult_price: number;
  old_price: number;
  cover_image: string | null;
  agency_name: string | null;
  rating: number;
  review_count: number;
  featured: boolean;
  bestseller: boolean;
  early_booking: boolean;
  status: string;
  created_at: string;
};

function statusLabel(status: string) {
  if (status === "active") return "Aktif";
  if (status === "draft") return "Taslak";
  if (status === "passive") return "Pasif";
  return status;
}

export default function DashboardToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    async function loadTours() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .order("created_at", { ascending: false });

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

  const filteredTours = useMemo(() => {
    return tours.filter((tour) => {
      const query = search.toLocaleLowerCase("tr-TR");

      const matchesSearch =
        tour.title.toLocaleLowerCase("tr-TR").includes(query) ||
        tour.city.toLocaleLowerCase("tr-TR").includes(query) ||
        (tour.agency_name ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(query);

      const matchesStatus =
        status === "all" || tour.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [search, status, tours]);

  const activeCount = tours.filter(
    (tour) => tour.status === "active"
  ).length;

  const draftCount = tours.filter(
    (tour) => tour.status === "draft"
  ).length;

  const featuredCount = tours.filter(
    (tour) => tour.featured
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
              Tur yönetimi
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Turlarım
            </h1>

            <p className="mt-4 text-slate-400">
              Supabase’e kaydedilen tüm tur ve deneyimleri yönet.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black transition hover:border-orange-500/30"
            >
              <FaArrowLeft />
              Dashboard
            </Link>

            <Link
              href="/dashboard/tur-ekle"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black transition hover:bg-orange-600"
            >
              <FaPlus />
              Yeni Tur Ekle
            </Link>
          </div>
        </div>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Toplam Tur", tours.length],
            ["Aktif Tur", activeCount],
            ["Taslak", draftCount],
            ["Öne Çıkan", featuredCount],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <p className="text-sm font-bold text-slate-500">
                {label}
              </p>

              <p className="mt-3 text-4xl font-black">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 lg:flex-row">
            <label className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-white px-5">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tur, şehir veya acente ara"
                className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="min-h-14 rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
            >
              <option value="all">Tüm durumlar</option>
              <option value="active">Aktif</option>
              <option value="draft">Taslak</option>
              <option value="passive">Pasif</option>
            </select>
          </div>
        </section>

        {loading && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Turlar yükleniyor...
          </div>
        )}

        {errorMessage && (
          <div className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && (
          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredTours.map((tour) => (
              <article
                key={tour.id}
                className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-900 transition hover:-translate-y-1 hover:border-orange-500/30"
              >
                <div className="relative h-52 overflow-hidden bg-slate-800">
                  {tour.cover_image ? (
                    <img
                      src={tour.cover_image}
                      alt={tour.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">
                      Kapak görseli eklenmedi
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${
                        tour.status === "active"
                          ? "bg-emerald-500 text-white"
                          : tour.status === "draft"
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-600 text-white"
                      }`}
                    >
                      {statusLabel(tour.status)}
                    </span>

                    {tour.bestseller && (
                      <span className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-black">
                        Çok Satan
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <FaMapMarkerAlt className="text-orange-400" />
                      {tour.city}
                      {tour.district ? `, ${tour.district}` : ""}
                    </div>

                    <div className="flex items-center gap-1 text-sm font-black">
                      <FaStar className="text-yellow-400" />
                      {tour.rating ?? 5}
                    </div>
                  </div>

                  <h2 className="mt-4 text-2xl font-black">
                    {tour.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {tour.category || "Kategori belirtilmedi"}
                    {tour.duration ? ` • ${tour.duration}` : ""}
                  </p>

                  <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
                    <div>
                      {tour.old_price > 0 && (
                        <p className="text-sm text-slate-500 line-through">
                          {tour.old_price.toLocaleString("tr-TR")} TL
                        </p>
                      )}

                      <p className="text-3xl font-black text-orange-500">
                        {tour.adult_price.toLocaleString("tr-TR")} TL
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        kişi başı
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/turlar/${tour.slug}`}
                        aria-label="Turu görüntüle"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition hover:bg-orange-500"
                      >
                        <FaEye />
                      </Link>

                      <Link
                        href={`/dashboard/turlar/${tour.id}/duzenle`}
                        aria-label="Turu düzenle"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 transition hover:bg-orange-600"
                      >
                        <FaEdit />
                      </Link>
                    </div>
                  </div>

                  {tour.agency_name && (
                    <p className="mt-5 text-xs text-slate-500">
                      Acente: {tour.agency_name}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        {!loading &&
          !errorMessage &&
          filteredTours.length === 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">
              <h2 className="text-2xl font-black">
                Tur bulunamadı
              </h2>

              <p className="mt-3 text-slate-400">
                Filtreleri değiştir veya yeni bir tur ekle.
              </p>
            </div>
          )}
      </div>
    </main>
  );
}
