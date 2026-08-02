"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FaArrowLeft,
  FaBus,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaQrcode,
  FaUser,
  FaUsers,
} from "react-icons/fa";

type OperationStatus =
  | "waiting"
  | "transfer_waiting"
  | "in_vehicle"
  | "arrived"
  | "activity_started"
  | "activity_completed"
  | "returning"
  | "completed"
  | "no_show";

type Reservation = {
  id: string;
  reservation_code: string | null;
  tour_title: string;
  tour_date: string;
  guests: number;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  payment_status: string | null;
};

type Checkin = {
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  current_status: OperationStatus;
  status_note: string | null;
  last_location_name: string | null;
  last_updated_at: string;
};

type HistoryItem = {
  id: string;
  status: OperationStatus;
  note: string | null;
  location_name: string | null;
  updated_by: string | null;
  created_at: string;
};

const labels: Record<OperationStatus, string> = {
  waiting: "Bekliyor",
  transfer_waiting: "Transfer Bekliyor",
  in_vehicle: "Araçta",
  arrived: "Bölgeye Ulaştı",
  activity_started: "Aktivite Başladı",
  activity_completed: "Aktivite Tamamlandı",
  returning: "Dönüş Yolunda",
  completed: "Tur Tamamlandı",
  no_show: "Katılmadı",
};

export default function CheckinDetailPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code);

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [checkin, setCheckin] =
    useState<Checkin | null>(null);

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedStatus, setSelectedStatus] =
    useState<OperationStatus>("waiting");
  const [locationName, setLocationName] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const isUuid = /^[0-9a-f-]{36}$/i.test(code);

    let query = supabase
      .from("reservations")
      .select(
        "id, reservation_code, tour_title, tour_date, guests, full_name, email, phone, status, payment_status"
      );

    query = isUuid
      ? query.eq("id", code)
      : query.eq("reservation_code", code);

    const {
      data: reservationData,
      error: reservationError,
    } = await query.maybeSingle();

    if (reservationError || !reservationData) {
      console.error(reservationError);
      setErrorMessage("Rezervasyon bulunamadı.");
      setLoading(false);
      return;
    }

    setReservation(reservationData as Reservation);

    const [
      { data: checkinData, error: checkinError },
      { data: historyData, error: historyError },
    ] = await Promise.all([
      supabase
        .from("tour_checkins")
        .select(
          "checked_in, checked_in_at, checked_in_by, current_status, status_note, last_location_name, last_updated_at"
        )
        .eq("reservation_id", reservationData.id)
        .maybeSingle(),

      supabase
        .from("tour_status_history")
        .select(
          "id, status, note, location_name, updated_by, created_at"
        )
        .eq("reservation_id", reservationData.id)
        .order("created_at", { ascending: false }),
    ]);

    if (checkinError) {
      console.error(checkinError);
    }

    if (historyError) {
      console.error(historyError);
    }

    const loadedCheckin =
      (checkinData as Checkin | null) ?? null;

    setCheckin(loadedCheckin);
    setSelectedStatus(
      loadedCheckin?.current_status ?? "waiting"
    );
    setLocationName(
      loadedCheckin?.last_location_name ?? ""
    );
    setStatusNote(
      loadedCheckin?.status_note ?? ""
    );
    setHistory((historyData as HistoryItem[] | null) ?? []);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function saveOperationUpdate() {
    if (!reservation) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const now = new Date().toISOString();

      const shouldCheckIn =
        checkin?.checked_in ||
        selectedStatus === "in_vehicle" ||
        selectedStatus === "arrived" ||
        selectedStatus === "activity_started" ||
        selectedStatus === "activity_completed" ||
        selectedStatus === "returning" ||
        selectedStatus === "completed";

      const { error: checkinError } = await supabase
        .from("tour_checkins")
        .upsert(
          {
            reservation_id: reservation.id,
            current_status: selectedStatus,
            status_note: statusNote.trim() || null,
            last_location_name:
              locationName.trim() || null,
            last_updated_at: now,
            updated_at: now,
            checked_in: Boolean(shouldCheckIn),
            checked_in_at:
              checkin?.checked_in_at ||
              (shouldCheckIn ? now : null),
            checked_in_by:
              checkin?.checked_in_by ||
              (shouldCheckIn
                ? "Operasyon Detayı"
                : null),
          },
          {
            onConflict: "reservation_id",
          }
        );

      if (checkinError) {
        throw checkinError;
      }

      const { error: historyError } = await supabase
        .from("tour_status_history")
        .insert({
          reservation_id: reservation.id,
          status: selectedStatus,
          note:
            statusNote.trim() ||
            `${labels[selectedStatus]} olarak güncellendi.`,
          location_name:
            locationName.trim() || null,
          updated_by: "Operasyon Detayı",
        });

      if (historyError) {
        throw historyError;
      }

      setSuccessMessage(
        "Operasyon durumu başarıyla güncellendi."
      );

      await loadDetail();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Operasyon güncellenemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">
          Detay yükleniyor...
        </div>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
          {errorMessage}
        </div>
      </main>
    );
  }

  const currentStatus =
    checkin?.current_status ?? "waiting";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard/operasyon"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-orange-400"
        >
          <FaArrowLeft />
          Operasyon Paneline Dön
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
              QR / Operasyon detayı
            </p>

            <h1 className="mt-3 text-4xl font-black">
              {reservation.reservation_code ??
                reservation.id.slice(0, 12)}
            </h1>

            <p className="mt-3 text-slate-400">
              {reservation.tour_title}
            </p>
          </div>

          <div className="rounded-2xl bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-400">
            {labels[currentStatus]}
          </div>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-7">
            <h2 className="text-2xl font-black">
              Misafir Bilgileri
            </h2>

            <div className="mt-6 space-y-4 text-slate-300">
              <p className="flex items-center gap-3">
                <FaUser className="text-orange-400" />
                {reservation.full_name}
              </p>

              <p className="flex items-center gap-3">
                <FaPhone className="text-orange-400" />
                {reservation.phone}
              </p>

              <p className="flex items-center gap-3">
                <FaEnvelope className="text-orange-400" />
                {reservation.email}
              </p>

              <p className="flex items-center gap-3">
                <FaUsers className="text-orange-400" />
                {reservation.guests} kişi
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-7">
            <h2 className="text-2xl font-black">
              Tur Durumu
            </h2>

            <div className="mt-6 space-y-4 text-slate-300">
              <p className="flex items-center gap-3">
                <FaCalendarAlt className="text-orange-400" />
                {new Date(
                  `${reservation.tour_date}T00:00:00`
                ).toLocaleDateString("tr-TR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>

              <p className="flex items-center gap-3">
                <FaCheckCircle className="text-orange-400" />
                {checkin?.checked_in
                  ? "Check-in yapıldı"
                  : "Check-in bekliyor"}
              </p>

              <p className="flex items-center gap-3">
                <FaClock className="text-orange-400" />
                {checkin?.checked_in_at
                  ? new Date(
                      checkin.checked_in_at
                    ).toLocaleString("tr-TR")
                  : "Henüz giriş yapılmadı"}
              </p>

              {checkin?.last_location_name && (
                <p className="flex items-center gap-3">
                  <FaMapMarkerAlt className="text-orange-400" />
                  {checkin.last_location_name}
                </p>
              )}

              <p className="flex items-center gap-3">
                <FaBus className="text-orange-400" />
                {labels[currentStatus]}
              </p>
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7">
          <h2 className="text-2xl font-black">
            Operasyonu Güncelle
          </h2>

          <p className="mt-3 text-slate-400">
            Misafirin mevcut durumunu, bulunduğu yeri ve
            operasyon notunu kaydet.
          </p>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-black">
                Operasyon durumu
              </span>

              <select
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(
                    event.target.value as OperationStatus
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
              >
                {Object.entries(labels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Son bilinen konum
              </span>

              <input
                value={locationName}
                onChange={(event) =>
                  setLocationName(event.target.value)
                }
                placeholder="Örnek: Saklıkent Kanyonu"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-black">
                Operasyon notu
              </span>

              <textarea
                value={statusNote}
                onChange={(event) =>
                  setStatusNote(event.target.value)
                }
                rows={4}
                placeholder="Örnek: Tüm misafirler araca alındı."
                className="mt-2 w-full rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-950 outline-none"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={saveOperationUpdate}
            className="mt-6 min-h-14 rounded-2xl bg-orange-500 px-7 font-black transition hover:bg-orange-600 disabled:opacity-50"
          >
            {saving
              ? "Güncelleniyor..."
              : "Operasyonu Güncelle"}
          </button>

          {successMessage && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-400">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
              {errorMessage}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7">
          <div className="flex items-center gap-3">
            <FaQrcode className="text-orange-400" />

            <h2 className="text-2xl font-black">
              Operasyon Geçmişi
            </h2>
          </div>

          <div className="mt-7 space-y-4">
            {history.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-slate-950 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <p className="font-black text-orange-400">
                      {labels[item.status]}
                    </p>

                    {item.note && (
                      <p className="mt-2 text-sm text-slate-300">
                        {item.note}
                      </p>
                    )}

                    {item.location_name && (
                      <p className="mt-2 text-sm text-slate-500">
                        Konum: {item.location_name}
                      </p>
                    )}
                  </div>

                  <div className="text-sm text-slate-500 md:text-right">
                    <p>
                      {new Date(
                        item.created_at
                      ).toLocaleString("tr-TR")}
                    </p>

                    {item.updated_by && (
                      <p className="mt-1">
                        Güncelleyen: {item.updated_by}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {history.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-950 p-8 text-center text-slate-400">
                Henüz operasyon geçmişi yok.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
