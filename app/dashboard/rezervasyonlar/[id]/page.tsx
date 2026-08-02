"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaTimesCircle,
  FaUser,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

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
  status: "pending" | "confirmed" | "cancelled";
  payment_status: string | null;
  created_at: string;
};

function statusLabel(status: Reservation["status"]) {
  if (status === "confirmed") return "Onaylandı";
  if (status === "cancelled") return "İptal";
  return "Bekliyor";
}

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadReservation() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !data) {
      console.error(error);
      setErrorMessage("Rezervasyon bulunamadı.");
      setLoading(false);
      return;
    }

    setReservation(data as Reservation);
    setLoading(false);
  }

  useEffect(() => {
    if (params.id) {
      loadReservation();
    }
  }, [params.id]);

  async function updateStatus(
    nextStatus: Reservation["status"]
  ) {
    if (!reservation) return;

    if (nextStatus === "cancelled") {
      const approved = window.confirm(
        "Rezervasyon iptal edilsin mi? Kontenjan geri yüklenecek."
      );

      if (!approved) return;
    }

    setActionLoading(true);
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
      setErrorMessage(error.message);
      setActionLoading(false);
      return;
    }

    await loadReservation();
    setActionLoading(false);
  }

  async function startIyzicoPayment() {
    if (!reservation) return;

    setPaymentLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/payments/iyzico/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservationId: reservation.id,
          }),
        }
      );

      const responseText = await response.text();

      let result: {
        error?: string;
        paymentPageUrl?: string;
      } = {};

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Ödeme API hatası (${response.status}): ` +
            responseText.slice(0, 180)
        );
      }

      if (!response.ok || !result.paymentPageUrl) {
        throw new Error(
          result.error || "Ödeme sayfası başlatılamadı."
        );
      }

      window.location.href = result.paymentPageUrl;
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ödeme başlatılamadı."
      );

      setPaymentLoading(false);
    }
  }

  function openWhatsApp() {
    if (!reservation) return;

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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-slate-400">
          Rezervasyon yükleniyor...
        </div>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-red-500/20 bg-slate-900 p-10 text-center">
          <h1 className="text-3xl font-black">
            Rezervasyon bulunamadı
          </h1>

          <p className="mt-4 text-slate-400">
            {errorMessage}
          </p>

          <Link
            href="/dashboard/rezervasyonlar"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-black"
          >
            <FaArrowLeft />
            Rezervasyonlara Dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
              Rezervasyon detayı
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              {reservation.reservation_code ?? "Rezervasyon"}
            </h1>

            <p className="mt-4 text-slate-400">
              Oluşturulma:{" "}
              {new Date(reservation.created_at).toLocaleString(
                "tr-TR"
              )}
            </p>
          </div>

          <Link
            href="/dashboard/rezervasyonlar"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black"
          >
            <FaArrowLeft />
            Rezervasyonlara Dön
          </Link>
        </div>

        {errorMessage && (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-black">
                  Tur bilgileri
                </h2>

                <span className="rounded-full bg-orange-500/15 px-4 py-2 text-sm font-black text-orange-400">
                  {statusLabel(reservation.status)}
                </span>
              </div>

              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-xs text-slate-500">
                    Tur
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {reservation.tour_title}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-xs text-slate-500">
                    Tur tarihi
                  </p>

                  <p className="mt-2 flex items-center gap-2 font-black">
                    <FaCalendarAlt className="text-orange-400" />
                    {new Date(
                      `${reservation.tour_date}T00:00:00`
                    ).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-xs text-slate-500">
                    Kişi sayısı
                  </p>

                  <p className="mt-2 flex items-center gap-2 font-black">
                    <FaUsers className="text-orange-400" />
                    {reservation.guests} kişi
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-xs text-slate-500">
                    Toplam tutar
                  </p>

                  <p className="mt-2 text-2xl font-black text-orange-500">
                    {Number(
                      reservation.total_price
                    ).toLocaleString("tr-TR")}{" "}
                    TL
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">
                Müşteri bilgileri
              </h2>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5">
                  <FaUser className="text-orange-400" />
                  {reservation.full_name}
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5">
                  <FaPhone className="text-orange-400" />
                  {reservation.phone}
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5 md:col-span-2">
                  <FaEnvelope className="text-orange-400" />
                  {reservation.email}
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[30px] border border-orange-500/20 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">
                İşlemler
              </h2>

              <div className="mt-6 space-y-3">
                {reservation.status !== "confirmed" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => updateStatus("confirmed")}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-black"
                  >
                    <FaCheckCircle />
                    Rezervasyonu Onayla
                  </button>
                )}

                {reservation.status !== "cancelled" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => updateStatus("cancelled")}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 font-black text-red-400"
                  >
                    <FaTimesCircle />
                    Rezervasyonu İptal Et
                  </button>
                )}

                {reservation.status === "cancelled" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => updateStatus("pending")}
                    className="min-h-14 w-full rounded-2xl border border-white/10 bg-white/[0.04] font-black"
                  >
                    Rezervasyonu Yeniden Aç
                  </button>
                )}

                {reservation.payment_status !== "paid" && (
                  <button
                    type="button"
                    disabled={paymentLoading}
                    onClick={startIyzicoPayment}
                    className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 font-black transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {paymentLoading
                      ? "Ödeme sayfası hazırlanıyor..."
                      : "İyzico ile Ödemeye Geç"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 font-black"
                >
                  <FaWhatsapp />
                  WhatsApp Gönder
                </button>

                <Link
                  href={`/dashboard/rezervasyonlar/${reservation.id}/voucher`}
                  className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-orange-500 px-5 font-black transition hover:bg-orange-600"
                >
                  Voucher Görüntüle
                </Link>
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-xs text-slate-500">
                  Kişi başı
                </p>

                <p className="mt-2 text-xl font-black">
                  {Number(
                    reservation.unit_price
                  ).toLocaleString("tr-TR")}{" "}
                  TL
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
