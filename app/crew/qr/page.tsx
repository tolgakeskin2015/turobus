"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import {
  FaArrowLeft,
  FaCamera,
  FaCheckCircle,
  FaQrcode,
  FaTimesCircle,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";

type Reservation = {
  id: string;
  reservation_code: string | null;
  tour_title: string;
  tour_date: string;
  full_name: string;
  guests: number;
  payment_status: string | null;
  status: string;
};

function extractReservationCode(value: string) {
  const decoded = decodeURIComponent(value.trim());

  const trbMatch = decoded.match(/TRB-[A-Z0-9]+/i);

  if (trbMatch) {
    return trbMatch[0].toUpperCase();
  }

  const uuidMatch = decoded.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  );

  if (uuidMatch) {
    return uuidMatch[0];
  }

  const pathParts = decoded
    .split(/[/?#]/)
    .filter(Boolean);

  return pathParts.at(-1) ?? decoded;
}

export default function CrewQrScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [reservation, setReservation] =
    useState<Reservation | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function stopScanner() {
    const scanner = scannerRef.current;

    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }

      scanner.clear();
    } catch (error) {
      console.error("QR tarayıcı durdurma hatası:", error);
    }

    scannerRef.current = null;
    setScanning(false);
  }

  async function processQrValue(rawValue: string) {
    if (processingRef.current) return;

    processingRef.current = true;
    setProcessing(true);
    setMessage("");
    setErrorMessage("");

    await stopScanner();

    try {
      const code = extractReservationCode(rawValue);
      const isUuid = /^[0-9a-f-]{36}$/i.test(code);

      let query = supabase
        .from("reservations")
        .select(
          "id, reservation_code, tour_title, tour_date, full_name, guests, payment_status, status"
        );

      query = isUuid
        ? query.eq("id", code)
        : query.eq("reservation_code", code);

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          `QR koduna ait rezervasyon bulunamadı: ${code}`
        );
      }

      const foundReservation = data as Reservation;

      if (foundReservation.status === "cancelled") {
        throw new Error(
          "Bu rezervasyon iptal edilmiş. Check-in yapılamaz."
        );
      }

      if (foundReservation.payment_status !== "paid") {
        throw new Error(
          "Bu rezervasyonun ödemesi tamamlanmamış."
        );
      }

      const now = new Date().toISOString();

      const { data: existingCheckin } = await supabase
        .from("tour_checkins")
        .select("checked_in, current_status")
        .eq("reservation_id", foundReservation.id)
        .maybeSingle();

      if (existingCheckin?.checked_in) {
        setReservation(foundReservation);
        setMessage(
          "Bu misafir daha önce check-in yapmış."
        );
        return;
      }

      const { error: checkinError } = await supabase
        .from("tour_checkins")
        .upsert(
          {
            reservation_id: foundReservation.id,
            checked_in: true,
            checked_in_at: now,
            checked_in_by: "QR Kamera",
            current_status:
              existingCheckin?.current_status ===
              "transfer_waiting"
                ? "in_vehicle"
                : existingCheckin?.current_status ??
                  "in_vehicle",
            last_updated_at: now,
            updated_at: now,
          },
          {
            onConflict: "reservation_id",
          }
        );

      if (checkinError) throw checkinError;

      const { error: historyError } = await supabase
        .from("tour_status_history")
        .insert({
          reservation_id: foundReservation.id,
          status: "in_vehicle",
          note: "Voucher QR kodu okutularak check-in yapıldı.",
          updated_by: "QR Kamera",
        });

      if (historyError) throw historyError;

      setReservation(foundReservation);
      setMessage("Check-in başarıyla tamamlandı.");
    } catch (error) {
      console.error(error);

      setReservation(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "QR kodu işlenemedi."
      );
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }

  async function startScanner() {
    setReservation(null);
    setMessage("");
    setErrorMessage("");

    try {
      const scanner = new Html5Qrcode(
        "crew-qr-reader"
      );

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await processQrValue(decodedText);
        },
        () => {
          // QR bulunamadığı karelerde hata göstermiyoruz.
        }
      );

      setScanning(true);
    } catch (error) {
      console.error(error);

      scannerRef.current = null;
      setScanning(false);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kamera başlatılamadı. Kamera iznini kontrol edin."
      );
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-xl">
        <Link
          href="/dashboard/operasyon"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-orange-400"
        >
          <FaArrowLeft />
          Operasyon Paneline Dön
        </Link>

        <header className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
            <FaQrcode size={30} />
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-orange-400">
            TUROBUS CREW
          </p>

          <h1 className="mt-2 text-3xl font-black">
            QR Check-in
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Misafirin voucher üzerindeki QR kodunu kameraya
            gösterin. Geçerli ve ödenmiş rezervasyon otomatik
            olarak check-in yapılır.
          </p>
        </header>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div
            id="crew-qr-reader"
            className="overflow-hidden rounded-2xl bg-black"
          />

          {!scanning && !processing && (
            <button
              type="button"
              onClick={startScanner}
              className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 font-black hover:bg-orange-600"
            >
              <FaCamera />
              Kamerayı Aç
            </button>
          )}

          {scanning && (
            <button
              type="button"
              onClick={stopScanner}
              className="mt-5 min-h-14 w-full rounded-2xl border border-red-500/20 bg-red-500/10 font-black text-red-400"
            >
              Kamerayı Kapat
            </button>
          )}

          {processing && (
            <div className="mt-5 rounded-2xl bg-white/[0.05] p-4 text-center font-black text-slate-300">
              Rezervasyon doğrulanıyor...
            </div>
          )}
        </section>

        {reservation && (
          <section className="mt-5 rounded-[30px] border border-emerald-500/20 bg-emerald-500/10 p-6">
            <div className="flex items-center gap-3 text-emerald-400">
              <FaCheckCircle size={26} />

              <h2 className="text-2xl font-black">
                Check-in Tamamlandı
              </h2>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <p className="flex items-center gap-3">
                <FaUser className="text-emerald-400" />
                <strong>{reservation.full_name}</strong>
              </p>

              <p className="flex items-center gap-3">
                <FaUsers className="text-emerald-400" />
                {reservation.guests} kişi
              </p>

              <p>
                <span className="text-emerald-200/70">
                  Tur:
                </span>{" "}
                <strong>{reservation.tour_title}</strong>
              </p>

              <p>
                <span className="text-emerald-200/70">
                  Rezervasyon:
                </span>{" "}
                <strong>
                  {reservation.reservation_code ??
                    reservation.id}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={startScanner}
              className="mt-6 min-h-14 w-full rounded-2xl bg-emerald-500 font-black text-white"
            >
              Sonraki Yolcuyu Okut
            </button>
          </section>
        )}

        {message && !reservation && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 font-bold text-emerald-400">
            {message}
          </div>
        )}

        {errorMessage && (
          <section className="mt-5 rounded-[30px] border border-red-500/20 bg-red-500/10 p-6">
            <div className="flex items-start gap-3">
              <FaTimesCircle
                className="mt-1 shrink-0 text-red-400"
                size={23}
              />

              <div>
                <h2 className="font-black text-red-300">
                  Check-in yapılamadı
                </h2>

                <p className="mt-2 text-sm leading-6 text-red-200/80">
                  {errorMessage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={startScanner}
              className="mt-5 min-h-14 w-full rounded-2xl bg-red-500 font-black"
            >
              Tekrar Dene
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
