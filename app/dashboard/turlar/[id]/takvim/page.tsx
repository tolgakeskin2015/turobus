"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaPlus,
  FaSave,
  FaTrash,
  FaUsers,
} from "react-icons/fa";

type Tour = {
  id: string;
  title: string;
  adult_price: number;
  child_price: number;
};

type Departure = {
  id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
  adult_price: number | null;
  child_price: number | null;
  status: "active" | "full" | "cancelled";
};

export default function TourCalendarPage() {
  const params = useParams<{ id: string }>();

  const [tour, setTour] = useState<Tour | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    departure_date: "",
    capacity: "20",
    adult_price: "",
    child_price: "",
    status: "active",
  });

  const [companyId, setCompanyId] =
    useState<string | null>(null);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage({
        type: "error",
        text: "Oturum bulunamadı.",
      });
      setLoading(false);
      return;
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      setMessage({
        type: "error",
        text: "Firma üyeliği bulunamadı.",
      });
      setLoading(false);
      return;
    }

    const currentCompanyId =
      membership.company_id;

    setCompanyId(currentCompanyId);

    const [
      { data: tourData, error: tourError },
      { data: departureData, error: departureError },
    ] = await Promise.all([
      supabase
        .from("tours")
        .select("id, title, adult_price, child_price")
        .eq("id", params.id)
        .single(),

      supabase
        .from("tour_departures")
        .select("*")
        .eq("tour_id", params.id)
        .eq("company_id", currentCompanyId)
        .order("departure_date", { ascending: true }),
    ]);

    if (tourError || departureError || !tourData) {
      console.error({ tourError, departureError });

      setMessage({
        type: "error",
        text: "Tur veya tarih bilgileri yüklenemedi.",
      });

      setLoading(false);
      return;
    }

    setTour(tourData as Tour);
    setDepartures((departureData ?? []) as Departure[]);
    setLoading(false);
  }

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  const totalCapacity = useMemo(
    () =>
      departures.reduce(
        (total, departure) => total + departure.capacity,
        0
      ),
    [departures]
  );

  const totalReserved = useMemo(
    () =>
      departures.reduce(
        (total, departure) => total + departure.reserved_count,
        0
      ),
    [departures]
  );

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!companyId) {
      setMessage({
        type: "error",
        text: "Şirket bilgisi bulunamadı.",
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("tour_departures")
      .insert({
        company_id: companyId,
        tour_id: params.id,
        departure_date: form.departure_date,
        capacity: Number(form.capacity),
        reserved_count: 0,
        adult_price: form.adult_price
          ? Number(form.adult_price)
          : null,
        child_price: form.child_price
          ? Number(form.child_price)
          : null,
        status: form.status,
      });

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error.code === "23505"
            ? "Bu tarih daha önce eklenmiş."
            : "Tarih eklenemedi: " + error.message,
      });

      setSaving(false);
      return;
    }

    setForm({
      departure_date: "",
      capacity: "20",
      adult_price: "",
      child_price: "",
      status: "active",
    });

    setMessage({
      type: "success",
      text: "Tur tarihi başarıyla eklendi.",
    });

    await loadData();
    setSaving(false);
  }

  async function deleteDeparture(id: string) {
    const approved = window.confirm(
      "Bu tur tarihini silmek istediğinize emin misiniz?"
    );

    if (!approved) {
      return;
    }

    const { error } = await supabase
      .from("tour_departures")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      setMessage({
        type: "error",
        text: "Tarih silinemedi: " + error.message,
      });

      return;
    }

    setMessage({
      type: "success",
      text: "Tur tarihi silindi.",
    });

    await loadData();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-slate-400">
          Takvim yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
              Kontenjan yönetimi
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              {tour?.title}
            </h1>

            <p className="mt-4 text-slate-400">
              Tur tarihlerini, fiyatlarını ve kontenjanlarını yönet.
            </p>
          </div>

          <Link
            href="/dashboard/turlar"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black transition hover:border-orange-500/30"
          >
            <FaArrowLeft />
            Turlarıma Dön
          </Link>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-bold text-slate-500">
              Toplam Tarih
            </p>

            <p className="mt-3 text-4xl font-black">
              {departures.length}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-bold text-slate-500">
              Toplam Kontenjan
            </p>

            <p className="mt-3 text-4xl font-black">
              {totalCapacity}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm font-bold text-slate-500">
              Rezerve Edilen
            </p>

            <p className="mt-3 text-4xl font-black">
              {totalReserved}
            </p>
          </article>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-[30px] border border-orange-500/20 bg-slate-900 p-7 lg:sticky lg:top-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                <FaPlus />
              </div>

              <div>
                <h2 className="text-2xl font-black">
                  Yeni tarih ekle
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Tarih ve kontenjan oluştur.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="text-sm font-black">Tur tarihi</span>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                  <FaCalendarAlt className="text-orange-500" />

                  <input
                    type="date"
                    required
                    value={form.departure_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        departure_date: event.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-black">Kontenjan</span>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                  <FaUsers className="text-orange-500" />

                  <input
                    type="number"
                    min="1"
                    required
                    value={form.capacity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        capacity: event.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-black">
                  Yetişkin fiyatı
                </span>

                <input
                  type="number"
                  min="0"
                  value={form.adult_price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      adult_price: event.target.value,
                    }))
                  }
                  placeholder={`${tour?.adult_price ?? 0}`}
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black">
                  Çocuk fiyatı
                </span>

                <input
                  type="number"
                  min="0"
                  value={form.child_price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      child_price: event.target.value,
                    }))
                  }
                  placeholder={`${tour?.child_price ?? 0}`}
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black">Durum</span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                >
                  <option value="active">Aktif</option>
                  <option value="full">Dolu</option>
                  <option value="cancelled">İptal</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 font-black transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave />
              {saving ? "Kaydediliyor..." : "Tarihi Kaydet"}
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

          <section>
            <div className="mb-6">
              <h2 className="text-3xl font-black">
                Tur tarihleri
              </h2>

              <p className="mt-2 text-slate-400">
                Aktif, dolu ve iptal edilmiş kalkışları görüntüle.
              </p>
            </div>

            <div className="space-y-5">
              {departures.map((departure) => {
                const remaining =
                  departure.capacity - departure.reserved_count;

                return (
                  <article
                    key={departure.id}
                    className="rounded-[28px] border border-white/10 bg-slate-900 p-6"
                  >
                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-black">
                            {new Date(
                              departure.departure_date + "T00:00:00"
                            ).toLocaleDateString("tr-TR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              departure.status === "active"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : departure.status === "full"
                                  ? "bg-orange-500/15 text-orange-400"
                                  : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {departure.status === "active"
                              ? "Aktif"
                              : departure.status === "full"
                                ? "Dolu"
                                : "İptal"}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-3">
                          <div className="rounded-2xl bg-slate-950 p-4">
                            <p className="text-xs text-slate-500">
                              Kontenjan
                            </p>

                            <p className="mt-2 text-xl font-black">
                              {departure.capacity}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-950 p-4">
                            <p className="text-xs text-slate-500">
                              Rezerve
                            </p>

                            <p className="mt-2 text-xl font-black">
                              {departure.reserved_count}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-950 p-4">
                            <p className="text-xs text-slate-500">
                              Kalan
                            </p>

                            <p className="mt-2 text-xl font-black text-orange-400">
                              {remaining}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-400">
                          <span>
                            Yetişkin:{" "}
                            <strong className="text-white">
                              {(
                                departure.adult_price ??
                                tour?.adult_price ??
                                0
                              ).toLocaleString("tr-TR")}{" "}
                              TL
                            </strong>
                          </span>

                          <span>
                            Çocuk:{" "}
                            <strong className="text-white">
                              {(
                                departure.child_price ??
                                tour?.child_price ??
                                0
                              ).toLocaleString("tr-TR")}{" "}
                              TL
                            </strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteDeparture(departure.id)}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 font-black text-red-400 transition hover:bg-red-500 hover:text-white"
                      >
                        <FaTrash />
                        Sil
                      </button>
                    </div>
                  </article>
                );
              })}

              {departures.length === 0 && (
                <div className="rounded-[28px] border border-white/10 bg-slate-900 p-12 text-center">
                  <FaCalendarAlt
                    className="mx-auto text-orange-400"
                    size={30}
                  />

                  <h3 className="mt-5 text-2xl font-black">
                    Henüz tur tarihi yok
                  </h3>

                  <p className="mt-3 text-slate-400">
                    Sol taraftaki formdan ilk kalkış tarihini ekle.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
