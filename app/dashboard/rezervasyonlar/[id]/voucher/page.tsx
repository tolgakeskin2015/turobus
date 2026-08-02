"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateQRCode } from "@/lib/qrcode";
import VoucherPdfButton from "@/components/voucher/VoucherPdfButton";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaPrint,
  FaShieldAlt,
  FaUser,
  FaUsers,
} from "react-icons/fa";

type Reservation = {
  id: string;
  reservation_code: string | null;
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
  if (status === "cancelled") return "İptal Edildi";
  return "Onay Bekliyor";
}

function statusClasses(status: Reservation["status"]) {
  if (status === "confirmed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  return "bg-orange-100 text-orange-700";
}

export default function VoucherPage() {
  const params = useParams<{ id: string }>();

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadVoucher() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("reservations")
        .select(
          "id, reservation_code, tour_title, tour_date, guests, full_name, email, phone, unit_price, total_price, status, payment_status, created_at"
        )
        .eq("id", params.id)
        .maybeSingle();

      if (error || !data) {
        console.error(error);
        setErrorMessage("Voucher bilgileri bulunamadı.");
        setLoading(false);
        return;
      }

      const loadedReservation = data as Reservation;
      setReservation(loadedReservation);

      const verificationUrl =
        `${window.location.origin}/rezervasyon-dogrula` +
        `?code=${encodeURIComponent(
          loadedReservation.reservation_code ?? loadedReservation.id
        )}`;

      try {
        const generatedQrCode =
          await generateQRCode(verificationUrl);

        setQrCode(generatedQrCode);

        await supabase
          .from("reservations")
          .update({
            qr_code: verificationUrl,
          })
          .eq("id", loadedReservation.id);
      } catch (qrError) {
        console.error(qrError);
        setErrorMessage("QR kod oluşturulamadı.");
      }

      setLoading(false);
    }

    if (params.id) {
      loadVoucher();
    }
  }, [params.id]);

  function printVoucher() {
    window.print();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-slate-400">
          Voucher hazırlanıyor...
        </div>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-lg rounded-3xl border border-red-500/20 bg-slate-900 p-10 text-center">
          <h1 className="text-3xl font-black">
            Voucher oluşturulamadı
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
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center print:hidden">
          <Link
            href={`/dashboard/rezervasyonlar/${reservation.id}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black"
          >
            <FaArrowLeft />
            Rezervasyon Detayına Dön
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row">
            <VoucherPdfButton
              targetId="voucher-document"
              fileName={`TUROBUS-${
                reservation.reservation_code ??
                reservation.id
              }`}
            />

            <button
              type="button"
              onClick={printVoucher}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-black transition hover:bg-orange-600"
            >
              <FaPrint />
              Yazdır
            </button>
          </div>
        </div>

        <article
          id="voucher-document"
          className="overflow-hidden rounded-[32px] bg-white text-slate-950 shadow-2xl print:rounded-none print:shadow-none"
        >
          <header className="bg-slate-950 px-8 py-8 text-white sm:px-12">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-black">
                  T
                </div>

                <div>
                  <h1 className="text-3xl font-black">
                    TUROBUS
                  </h1>

                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-orange-400">
                    Tur Voucher
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rezervasyon Kodu
                </p>

                <p className="mt-2 text-2xl font-black text-orange-400">
                  {reservation.reservation_code ??
                    reservation.id.slice(0, 12)}
                </p>
              </div>
            </div>
          </header>

          <section className="px-8 py-8 sm:px-12">
            <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-start">
              <div>
                <span
                  className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${statusClasses(
                    reservation.status
                  )}`}
                >
                  {statusLabel(reservation.status)}
                </span>

                <h2 className="mt-5 text-3xl font-black">
                  {reservation.tour_title}
                </h2>

                <p className="mt-3 flex items-center gap-2 text-slate-500">
                  <FaMapMarkerAlt className="text-orange-500" />
                  TUROBUS doğrulanmış tur sağlayıcısı
                </p>
              </div>

              {qrCode && (
                <div className="rounded-2xl border border-slate-200 p-3">
                  <img
                    src={qrCode}
                    alt="Rezervasyon doğrulama QR kodu"
                    className="h-36 w-36"
                  />

                  <p className="mt-2 text-center text-xs font-bold text-slate-500">
                    Doğrulamak için okut
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-5 border-b border-slate-200 py-8 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-100 p-5">
                <FaCalendarAlt className="text-orange-500" />

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tur Tarihi
                </p>

                <p className="mt-2 font-black">
                  {new Date(
                    `${reservation.tour_date}T00:00:00`
                  ).toLocaleDateString("tr-TR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-5">
                <FaUsers className="text-orange-500" />

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Katılımcı
                </p>

                <p className="mt-2 font-black">
                  {reservation.guests} kişi
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-5">
                <FaShieldAlt className="text-orange-500" />

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ödeme
                </p>

                <p className="mt-2 font-black">
                  {reservation.payment_status === "paid"
                    ? "Ödendi"
                    : "Ödeme Bekliyor"}
                </p>
              </div>
            </div>

            <div className="grid gap-8 border-b border-slate-200 py-8 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-black">
                  Misafir Bilgileri
                </h3>

                <div className="mt-5 space-y-4 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <FaUser className="text-orange-500" />
                    {reservation.full_name}
                  </div>

                  <div className="flex items-center gap-3">
                    <FaPhone className="text-orange-500" />
                    {reservation.phone}
                  </div>

                  <div className="flex items-center gap-3">
                    <FaEnvelope className="text-orange-500" />
                    {reservation.email}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black">
                  Ücret Bilgileri
                </h3>

                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Kişi başı
                    </span>

                    <strong>
                      {Number(
                        reservation.unit_price
                      ).toLocaleString("tr-TR")}{" "}
                      TL
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Kişi sayısı
                    </span>

                    <strong>
                      {reservation.guests}
                    </strong>
                  </div>

                  <div className="flex justify-between border-t border-slate-200 pt-4">
                    <span className="font-black">
                      Toplam
                    </span>

                    <strong className="text-2xl text-orange-500">
                      {Number(
                        reservation.total_price
                      ).toLocaleString("tr-TR")}{" "}
                      TL
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="py-8">
              <h3 className="text-xl font-black">
                Katılım Bilgileri
              </h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  "Tur başlangıcından en az 15 dakika önce hazır olun.",
                  "Voucher veya rezervasyon kodunu görevliye gösterin.",
                  "Kimlik belgenizi yanınızda bulundurun.",
                  "İptal ve değişiklik için TUROBUS ile iletişime geçin.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600"
                  >
                    <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <footer className="border-t border-slate-200 bg-slate-100 px-8 py-6 text-center text-xs leading-6 text-slate-500 sm:px-12">
            Bu belge TUROBUS rezervasyon sistemi tarafından
            oluşturulmuştur. Rezervasyon kodu ve QR kod yalnızca bu
            rezervasyon için geçerlidir.
          </footer>
        </article>
      </div>
    </main>
  );
}
