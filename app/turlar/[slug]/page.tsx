"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaHeart,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaStar,
  FaTimesCircle,
  FaUserFriends,
} from "react-icons/fa";

type Tour = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  city: string;
  district: string | null;
  category: string | null;
  duration: string | null;
  meeting_point: string | null;
  adult_price: number;
  child_price: number;
  old_price: number;
  currency: string;
  cover_image: string | null;
  gallery: string[] | null;
  included: string[] | null;
  excluded: string[] | null;
  highlights: string[] | null;
  itinerary: string[] | null;
  agency_name: string | null;
  rating: number | null;
  review_count: number | null;
  max_people: number | null;
  featured: boolean;
  bestseller: boolean;
  early_booking: boolean;
  status: string;
};

export default function TourDetailPage() {
  const params = useParams<{ slug: string }>();

  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTour() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("slug", params.slug)
        .eq("status", "active")
        .single();

      if (error || !data) {
        console.error(error);
        setErrorMessage("Tur bulunamadı veya yayından kaldırılmış.");
        setLoading(false);
        return;
      }

      setTour(data as Tour);
      setLoading(false);
    }

    if (params.slug) {
      loadTour();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-500/20 border-t-orange-500" />

          <p className="mt-5 font-bold text-slate-400">
            Tur bilgileri yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage || !tour) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-10 text-center">
          <h1 className="text-4xl font-black">Tur bulunamadı</h1>

          <p className="mt-4 leading-7 text-slate-400">
            {errorMessage}
          </p>

          <Link
            href="/turlar"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-black transition hover:bg-orange-600"
          >
            <FaArrowLeft />
            Turlara Dön
          </Link>
        </div>
      </main>
    );
  }

  const included =
    tour.included && tour.included.length > 0
      ? tour.included
      : [
          "Aktivite transferleri",
          "Profesyonel rehber",
          "Gerekli ekipmanlar",
          "Seyahat sigortası",
        ];

  const excluded =
    tour.excluded && tour.excluded.length > 0
      ? tour.excluded
      : [
          "Kişisel harcamalar",
          "Fotoğraf ve video hizmetleri",
          "İçecekler",
          "Opsiyonel etkinlikler",
        ];

  const itinerary =
    tour.itinerary && tour.itinerary.length > 0
      ? tour.itinerary
      : [
          "Buluşma noktasından hareket",
          "Tur programının başlaması",
          "Aktivite ve serbest zaman",
          "Programın devamı",
          "Dönüş transferi",
        ];

  const itineraryTimes = ["08:30", "10:00", "12:30", "15:00", "17:30"];

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

      <section className="relative h-[520px] overflow-hidden bg-slate-900">
        {tour.cover_image ? (
          <img
            src={tour.cover_image}
            alt={tour.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            Kapak görseli eklenmedi
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
              {tour.bestseller && (
                <span className="rounded-full bg-orange-500 px-4 py-2 font-black">
                  Çok Satan
                </span>
              )}

              {tour.early_booking && (
                <span className="rounded-full bg-purple-600 px-4 py-2 font-black">
                  Erken Rezervasyon
                </span>
              )}

              {tour.featured && (
                <span className="rounded-full bg-blue-600 px-4 py-2 font-black">
                  Öne Çıkan
                </span>
              )}

              <span className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-orange-400" />
                {tour.city}
                {tour.district ? `, ${tour.district}` : ""}
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              {tour.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <FaStar className="text-yellow-400" />

                <span className="font-black">{tour.rating ?? 5}</span>

                <span className="text-slate-400">
                  ({tour.review_count ?? 0} değerlendirme)
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <FaClock />
                {tour.duration || "Süre belirtilmedi"}
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <FaUserFriends />
                Maksimum {tour.max_people ?? 40} kişi
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1fr_390px] lg:px-8">
        <div>
          <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
            <h2 className="text-3xl font-black">Tur hakkında</h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              {tour.description ||
                tour.short_description ||
                "Bu tur için detaylı açıklama henüz eklenmedi."}
            </p>

            {tour.highlights && tour.highlights.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-black">Öne çıkanlar</h3>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {tour.highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300"
                    >
                      <FaCheckCircle className="mt-1 shrink-0 text-orange-400" />
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <FaClock className="text-orange-400" />

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Süre
                </p>

                <p className="mt-2 font-black">
                  {tour.duration || "Belirtilmedi"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <FaMapMarkerAlt className="text-orange-400" />

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Buluşma
                </p>

                <p className="mt-2 font-black">
                  {tour.meeting_point || "Daha sonra bildirilecek"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <FaUserFriends className="text-orange-400" />

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Kapasite
                </p>

                <p className="mt-2 font-black">
                  Maksimum {tour.max_people ?? 40} kişi
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-7">
            <h2 className="text-3xl font-black">Tur programı</h2>

            <div className="mt-8 space-y-6">
              {itinerary.map((item, index) => (
                <div key={`${item}-${index}`} className="flex gap-5">
                  <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl bg-orange-500 font-black">
                    {itineraryTimes[index] || `${index + 1}. adım`}
                  </div>

                  <div className="border-l border-white/10 pl-5">
                    <p className="pt-3 font-bold text-slate-300">
                      {item}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">Fiyata dahil</h2>

              <div className="mt-6 space-y-4">
                {included.map((item) => (
                  <div key={item} className="flex gap-3 text-slate-300">
                    <FaCheckCircle className="mt-1 shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">
                Fiyata dahil değil
              </h2>

              <div className="mt-6 space-y-4">
                {excluded.map((item) => (
                  <div key={item} className="flex gap-3 text-slate-300">
                    <FaTimesCircle className="mt-1 shrink-0 text-red-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {tour.gallery && tour.gallery.length > 0 && (
            <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-3xl font-black">Tur galerisi</h2>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {tour.gallery.map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${tour.title} galeri ${index + 1}`}
                    className="h-64 w-full rounded-2xl object-cover"
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[30px] border border-orange-500/20 bg-slate-900 p-7 shadow-2xl shadow-orange-500/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                {tour.old_price > 0 && (
                  <p className="text-sm text-slate-500 line-through">
                    {tour.old_price.toLocaleString("tr-TR")} TL
                  </p>
                )}

                <p className="mt-1 text-4xl font-black text-orange-500">
                  {tour.adult_price.toLocaleString("tr-TR")} TL
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  kişi başı başlangıç fiyatı
                </p>
              </div>

              <button
                type="button"
                aria-label="Favorilere ekle"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-orange-500"
              >
                <FaHeart />
              </button>
            </div>

            {tour.child_price > 0 && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Çocuk fiyatı
                </p>

                <p className="mt-2 text-xl font-black">
                  {tour.child_price.toLocaleString("tr-TR")} TL
                </p>
              </div>
            )}

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Tur tarihi</span>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                  <FaCalendarAlt className="text-orange-500" />

                  <input
                    type="date"
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-black">Kişi sayısı</span>

                <select className="mt-2 min-h-14 w-full rounded-2xl bg-white px-4 text-sm font-bold text-slate-950 outline-none">
                  <option>1 kişi</option>
                  <option>2 kişi</option>
                  <option>3 kişi</option>
                  <option>4 kişi</option>
                  <option>5+ kişi</option>
                </select>
              </label>
            </div>

            <Link
              href={`/rezervasyon?tour=${tour.slug}`}
              className="mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-orange-500 px-6 font-black transition hover:bg-orange-600"
            >
              Rezervasyon Yap
            </Link>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <FaShieldAlt className="shrink-0" />
              Güvenli rezervasyon ve ücretsiz iptal seçeneği
            </div>

            {tour.agency_name && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tur sağlayıcısı
                </p>

                <p className="mt-2 font-black">{tour.agency_name}</p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
