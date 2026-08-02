"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaCheck,
  FaSearch,
  FaStar,
  FaTimes,
  FaUserCheck,
} from "react-icons/fa";

type ReviewStatus = "pending" | "approved" | "rejected";

type Review = {
  id: string;
  tour_id: string;
  reviewer_name: string;
  reviewer_email: string | null;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  verified: boolean;
  created_at: string;
  tours: {
    title: string;
    slug: string;
  } | null;
};

function statusLabel(status: ReviewStatus) {
  if (status === "approved") return "Onaylandı";
  if (status === "rejected") return "Reddedildi";
  return "Bekliyor";
}

export default function ReviewsDashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | ReviewStatus>("all");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadReviews() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("tour_reviews")
      .select(`
        id,
        tour_id,
        reviewer_name,
        reviewer_email,
        rating,
        title,
        comment,
        status,
        verified,
        created_at,
        tours (
          title,
          slug
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage("Yorumlar yüklenemedi.");
      setLoading(false);
      return;
    }

    setReviews((data ?? []) as unknown as Review[]);
    setLoading(false);
  }

  useEffect(() => {
    loadReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return reviews.filter((review) => {
      const matchesSearch =
        !query ||
        review.reviewer_name
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        (review.reviewer_email ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        (review.tours?.title ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        review.comment
          .toLocaleLowerCase("tr-TR")
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        review.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reviews, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: reviews.length,
      pending: reviews.filter(
        (review) => review.status === "pending"
      ).length,
      approved: reviews.filter(
        (review) => review.status === "approved"
      ).length,
      rejected: reviews.filter(
        (review) => review.status === "rejected"
      ).length,
    }),
    [reviews]
  );

  async function updateReview(
    review: Review,
    changes: Partial<
      Pick<Review, "status" | "verified">
    >
  ) {
    setActionId(review.id);
    setErrorMessage("");

    const { error } = await supabase
      .from("tour_reviews")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", review.id);

    if (error) {
      console.error(error);
      setErrorMessage(
        "Yorum güncellenemedi: " + error.message
      );
      setActionId("");
      return;
    }

    await loadReviews();
    setActionId("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <div className="rounded-3xl bg-slate-900 p-8 text-slate-400">
          Yorumlar yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
            İçerik yönetimi
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Yorum Yönetimi
          </h1>

          <p className="mt-4 text-slate-400">
            Bekleyen yorumları incele, onayla veya reddet.
          </p>
        </div>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Toplam", stats.total],
            ["Bekleyen", stats.pending],
            ["Onaylanan", stats.approved],
            ["Reddedilen", stats.rejected],
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

        <section className="mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900 p-5 lg:flex-row">
          <label className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-white px-5">
            <FaSearch className="text-orange-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Müşteri, tur, e-posta veya yorum ara"
              className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "all"
                  | ReviewStatus
              )
            }
            className="min-h-14 rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
          >
            <option value="all">Tüm durumlar</option>
            <option value="pending">Bekleyen</option>
            <option value="approved">Onaylanan</option>
            <option value="rejected">Reddedilen</option>
          </select>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-400">
            {errorMessage}
          </div>
        )}

        <section className="mt-8 space-y-5">
          {filteredReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[28px] border border-white/10 bg-slate-900 p-6"
            >
              <div className="flex flex-col justify-between gap-6 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-orange-500/15 px-3 py-1.5 text-xs font-black text-orange-400">
                      {statusLabel(review.status)}
                    </span>

                    {review.verified && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-400">
                        <FaUserCheck />
                        Doğrulanmış Misafir
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-2xl font-black">
                    {review.tours?.title ??
                      "Tur bulunamadı"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {review.reviewer_name}
                    {review.reviewer_email
                      ? ` • ${review.reviewer_email}`
                      : ""}
                  </p>

                  <div className="mt-4 flex gap-1">
                    {Array.from({ length: 5 }, (_, index) => (
                      <FaStar
                        key={index}
                        className={
                          index < review.rating
                            ? "text-yellow-400"
                            : "text-slate-700"
                        }
                      />
                    ))}
                  </div>

                  {review.title && (
                    <h3 className="mt-5 text-lg font-black">
                      {review.title}
                    </h3>
                  )}

                  <p className="mt-3 leading-7 text-slate-400">
                    {review.comment}
                  </p>

                  <p className="mt-4 text-xs text-slate-600">
                    {new Date(
                      review.created_at
                    ).toLocaleString("tr-TR")}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-3 lg:w-52">
                  {review.status !== "approved" && (
                    <button
                      type="button"
                      disabled={actionId === review.id}
                      onClick={() =>
                        updateReview(review, {
                          status: "approved",
                        })
                      }
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 font-black disabled:opacity-50"
                    >
                      <FaCheck />
                      Onayla
                    </button>
                  )}

                  {review.status !== "rejected" && (
                    <button
                      type="button"
                      disabled={actionId === review.id}
                      onClick={() =>
                        updateReview(review, {
                          status: "rejected",
                        })
                      }
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 font-black text-red-400 disabled:opacity-50"
                    >
                      <FaTimes />
                      Reddet
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionId === review.id}
                    onClick={() =>
                      updateReview(review, {
                        verified: !review.verified,
                      })
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-black disabled:opacity-50"
                  >
                    <FaUserCheck />
                    {review.verified
                      ? "Doğrulamayı Kaldır"
                      : "Doğrulanmış Yap"}
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredReviews.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">
              <h2 className="text-2xl font-black">
                Yorum bulunamadı
              </h2>

              <p className="mt-3 text-slate-400">
                Arama veya durum filtresini değiştir.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
