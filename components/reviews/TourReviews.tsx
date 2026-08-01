"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaStar,
  FaUserCircle,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  comment: string;
  verified: boolean;
  created_at: string;
};

type TourReviewsProps = {
  tourId: string;
};

export default function TourReviews({
  tourId,
}: TourReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const [form, setForm] = useState({
    reviewer_name: "",
    reviewer_email: "",
    rating: 5,
    title: "",
    comment: "",
  });

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("tour_reviews")
      .select(
        "id, reviewer_name, rating, title, comment, verified, created_at"
      )
      .eq("tour_id", tourId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Yorumlar yüklenemedi:", error);
      setLoading(false);
      return;
    }

    setReviews((data ?? []) as Review[]);
    setLoading(false);
  }, [tourId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;

    const total = reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );

    return total / reviews.length;
  }, [reviews]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (form.comment.trim().length < 10) {
      setMessage({
        type: "error",
        text: "Yorumunuz en az 10 karakter olmalıdır.",
      });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("tour_reviews")
      .insert({
        tour_id: tourId,
        reviewer_name: form.reviewer_name.trim(),
        reviewer_email:
          form.reviewer_email.trim() || null,
        rating: form.rating,
        title: form.title.trim() || null,
        comment: form.comment.trim(),
        status: "pending",
        verified: false,
      });

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "Yorum gönderilemedi: " + error.message,
      });

      setSubmitting(false);
      return;
    }

    setMessage({
      type: "success",
      text:
        "Yorumunuz alındı. Kontrol edildikten sonra yayınlanacaktır.",
    });

    setForm({
      reviewer_name: "",
      reviewer_email: "",
      rating: 5,
      title: "",
      comment: "",
    });

    setHoveredRating(0);
    setSubmitting(false);
  }

  return (
    <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-7">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-400">
            Misafir deneyimleri
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Yorumlar ve Puanlar
          </h2>

          <p className="mt-3 text-slate-400">
            Tura katılan misafirlerin değerlendirmelerini incele.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <FaStar className="text-yellow-400" />

            <span className="text-3xl font-black">
              {reviews.length > 0
                ? averageRating.toFixed(1)
                : "–"}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {reviews.length} onaylı değerlendirme
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-8 rounded-2xl bg-slate-950 p-7 text-slate-400">
          Yorumlar yükleniyor...
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="mt-8 space-y-5">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex gap-4">
                  <FaUserCircle
                    className="shrink-0 text-slate-500"
                    size={42}
                  />

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-black">
                        {review.reviewer_name}
                      </h3>

                      {review.verified && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">
                          <FaCheckCircle />
                          Doğrulanmış Misafir
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(
                        review.created_at
                      ).toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, index) => {
                    const star = index + 1;

                    return (
                      <FaStar
                        key={star}
                        className={
                          star <= review.rating
                            ? "text-yellow-400"
                            : "text-slate-700"
                        }
                      />
                    );
                  })}
                </div>
              </div>

              {review.title && (
                <h4 className="mt-5 text-lg font-black">
                  {review.title}
                </h4>
              )}

              <p className="mt-3 leading-7 text-slate-400">
                {review.comment}
              </p>
            </article>
          ))}
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950 p-8 text-center">
          <FaStar
            className="mx-auto text-orange-400"
            size={28}
          />

          <h3 className="mt-4 text-xl font-black">
            Henüz yayınlanmış yorum yok
          </h3>

          <p className="mt-2 text-slate-400">
            Bu tur hakkındaki ilk değerlendirmeyi sen gönder.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-10 border-t border-white/10 pt-8"
      >
        <h3 className="text-2xl font-black">
          Deneyimini Değerlendir
        </h3>

        <p className="mt-3 text-slate-400">
          Yorumun kontrol edildikten sonra tur sayfasında yayınlanır.
        </p>

        <div className="mt-7">
          <span className="text-sm font-black">
            Puanın
          </span>

          <div
            className="mt-3 flex w-fit gap-2"
            onMouseLeave={() => setHoveredRating(0)}
          >
            {Array.from({ length: 5 }, (_, index) => {
              const star = index + 1;
              const active =
                star <=
                (hoveredRating || form.rating);

              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} yıldız`}
                  onMouseEnter={() =>
                    setHoveredRating(star)
                  }
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      rating: star,
                    }))
                  }
                  className="text-3xl transition hover:scale-110"
                >
                  <FaStar
                    className={
                      active
                        ? "text-yellow-400"
                        : "text-slate-700"
                    }
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <label>
            <span className="text-sm font-black">
              Ad soyad
            </span>

            <input
              type="text"
              required
              value={form.reviewer_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reviewer_name: event.target.value,
                }))
              }
              placeholder="Adınız ve soyadınız"
              className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
            />
          </label>

          <label>
            <span className="text-sm font-black">
              E-posta
            </span>

            <input
              type="email"
              value={form.reviewer_email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reviewer_email: event.target.value,
                }))
              }
              placeholder="ornek@email.com"
              className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-black">
              Yorum başlığı
            </span>

            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Örnek: Harika bir deneyimdi"
              className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-black">
              Yorumun
            </span>

            <textarea
              required
              minLength={10}
              rows={5}
              value={form.comment}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  comment: event.target.value,
                }))
              }
              placeholder="Tur deneyiminizi anlatın..."
              className="mt-2 w-full rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-950 outline-none"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 min-h-14 rounded-2xl bg-orange-500 px-7 font-black transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Yorum gönderiliyor..."
            : "Yorumu Gönder"}
        </button>

        {message && (
          <div
            className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
              message.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </section>
  );
}
