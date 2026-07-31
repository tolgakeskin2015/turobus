"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaCalendarAlt,
  FaCheck,
  FaEnvelope,
  FaPhone,
  FaSearch,
  FaTimes,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";

type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled";

type Reservation = {
  id: string;
  reservation_code: string | null;
  departure_id: string | null;
  tour_title: string;
  tour_date: string;
  guests: number;
  full_name: string;
  email: string;
  phone: string;
  unit_price: number;
  total_price: number;
  status: ReservationStatus;
  created_at: string;
};

function statusLabel(status: ReservationStatus) {
  if (status === "confirmed") return "Onaylandı";
  if (status === "cancelled") return "İptal";
  return "Bekliyor";
}

function statusClasses(status: ReservationStatus) {
  if (status === "confirmed") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "cancelled") {
    return "bg-red-500/15 text-red-400";
  }

  return "bg-orange-500/15 text-orange-400";
}

export default function ReservationsList() {
  const [reservations, setReservations] = useState<Reservation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | ReservationStatus>("all");

  async function loadReservations() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("reservations")
      .select(
        "id, reservation_code, departure_id, tour_title, tour_date, guests, full_name, email, phone, unit_price, total_price, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage("Rezervasyonlar yüklenemedi.");
      setLoading(false);
      return;
    }

    setReservations((data ?? []) as Reservation[]);
    setLoading(false);
  }

  useEffect(() => {
    loadReservations();
  }, []);

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return reservations.filter((reservation) => {
      const matchesSearch =
        !query ||
        reservation.full_name
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        reservation.tour_title
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        reservation.phone.includes(query) ||
        reservation.email
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        (reservation.reservation_code ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        reservation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reservations, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: reservations.length,
      pending: reservations.filter(
        (reservation) => reservation.status === "pending"
      ).length,
      confirmed: reservations.filter(
        (reservation) => reservation.status === "confirmed"
      ).length,
      cancelled: reservations.filter(
        (reservation) => reservation.status === "cancelled"
      ).length,
    }),
    [reservations]
  );

  async function updateStatus(
    reservation: Reservation,
    nextStatus: ReservationStatus
  ) {
    if (nextStatus === "cancelled") {
      const approved = window.confirm(
        `${reservation.reservation_code ?? "Bu rezervasyon"} iptal edilsin mi? Kontenjan geri yüklenecek.`
      );

      if (!approved) return;
    }

    setActionId(reservation.id);
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "update_reservation_status",
      {
        p_reservation_id: reservation.id,
        p_new_status: nextStatus,
      }
    );

    if (error) {
      console.error(error);
      setErrorMessage(
        "Rezervasyon durumu değiştirilemedi: " + error.message
      );
      setActionId("");
      return;
    }

    await loadReservations();
    setActionId("");
  }

  function openWhatsApp(reservation: Reservation) {
    const phone = reservation.phone.replace(/\D/g, "");

    const normalizedPhone = phone.startsWith("0")
      ? `90${phone.slice(1)}`
      : phone.startsWith("90")
        ? phone
        : `90${phone}`;

    const text = encodeURIComponent(
      `Merhaba ${reservation.full_name}, ` +
        `${reservation.tour_title} rezervasyonunuz hakkında iletişime geçiyoruz. ` +
        `Rezervasyon kodunuz: ${
          reservation.reservation_code ?? "-"
        }.`
    );

    window.open(
      `https://wa.me/${normalizedPhone}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-slate-900 p-8 text-slate-400">
        Rezervasyonlar yükleniyor...
      </div>
    );
  }

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-orange-400">
          Operasyon yönetimi
        </p>

        <h2 className="mt-3 text-3xl font-black">
          Rezervasyonlar
        </h2>

        <p className="mt-3 text-slate-400">
          Rezervasyonları ara, onayla veya iptal et.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Toplam", stats.total],
          ["Bekleyen", stats.pending],
          ["Onaylanan", stats.confirmed],
          ["İptal", stats.cancelled],
        ].map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-2xl border border-white/10 bg-slate-900 p-5"
          >
            <p className="text-sm font-bold text-slate-500">
              {label}
            </p>

            <p className="mt-2 text-3xl font-black">
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900 p-5 lg:flex-row">
        <label className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-white px-5">
          <FaSearch className="text-orange-500" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kod, müşteri, telefon, e-posta veya tur ara"
            className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as
                | "all"
                | ReservationStatus
            )
          }
          className="min-h-14 rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
        >
          <option value="all">Tüm durumlar</option>
          <option value="pending">Bekleyen</option>
          <option value="confirmed">Onaylanan</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm font-bold text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {filteredReservations.map((reservation) => (
          <article
            key={reservation.id}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex flex-col justify-between gap-6 xl:flex-row">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-orange-400">
                    {reservation.reservation_code ??
                      "Kod oluşturulmadı"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
                      reservation.status
                    )}`}
                  >
                    {statusLabel(reservation.status)}
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-black">
                  {reservation.tour_title}
                </h3>

                <div className="mt-5 grid gap-3 text-sm text-slate-400 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-orange-400" />
                    {reservation.full_name}
                  </div>

                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-orange-400" />
                    {new Date(
                      `${reservation.tour_date}T00:00:00`
                    ).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-orange-400" />
                    {reservation.email}
                  </div>

                  <div className="flex items-center gap-2">
                    <FaPhone className="text-orange-400" />
                    {reservation.phone}
                  </div>
                </div>
              </div>

              <div className="min-w-52 rounded-2xl bg-slate-950 p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Toplam
                </p>

                <p className="mt-2 text-2xl font-black text-orange-500">
                  {Number(
                    reservation.total_price
                  ).toLocaleString("tr-TR")}{" "}
                  TL
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {reservation.guests} kişi •{" "}
                  {Number(
                    reservation.unit_price
                  ).toLocaleString("tr-TR")}{" "}
                  TL kişi başı
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
              <Link
                href={`/dashboard/rezervasyonlar/${reservation.id}`}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black transition hover:bg-orange-500"
              >
                Detay
              </Link>
              {reservation.status !== "confirmed" && (
                <button
                  type="button"
                  disabled={actionId === reservation.id}
                  onClick={() =>
                    updateStatus(reservation, "confirmed")
                  }
                  className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  <FaCheck />
                  Onayla
                </button>
              )}

              {reservation.status !== "cancelled" && (
                <button
                  type="button"
                  disabled={actionId === reservation.id}
                  onClick={() =>
                    updateStatus(reservation, "cancelled")
                  }
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-black text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                >
                  <FaTimes />
                  İptal Et
                </button>
              )}

              {reservation.status === "cancelled" && (
                <button
                  type="button"
                  disabled={actionId === reservation.id}
                  onClick={() =>
                    updateStatus(reservation, "pending")
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black transition hover:bg-orange-500"
                >
                  Yeniden Aç
                </button>
              )}

              <button
                type="button"
                onClick={() => openWhatsApp(reservation)}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-black text-white transition hover:bg-green-700"
              >
                <FaWhatsapp />
                WhatsApp
              </button>
            </div>
          </article>
        ))}

        {filteredReservations.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">
            <h3 className="text-2xl font-black">
              Rezervasyon bulunamadı
            </h3>

            <p className="mt-3 text-slate-400">
              Arama kelimesini veya durum filtresini değiştir.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
