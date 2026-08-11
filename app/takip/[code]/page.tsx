"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CustomerLiveMap from "@/components/tracking/CustomerLiveMap";
import {
  FaBus,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaQrcode,
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
  status: string;
  payment_status: string | null;
};

type Checkin = {
  checked_in: boolean;
  checked_in_at: string | null;
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
  created_at: string;
};

const labels: Record<OperationStatus, string> = {
  waiting: "Hazırlanıyor",
  transfer_waiting: "Transfer Bekleniyor",
  in_vehicle: "Araçta",
  arrived: "Bölgeye Ulaşıldı",
  activity_started: "Aktivite Başladı",
  activity_completed: "Aktivite Tamamlandı",
  returning: "Dönüş Yolunda",
  completed: "Tur Tamamlandı",
  no_show: "Katılım Sağlanmadı",
};

function statusText(status: OperationStatus) {
  const messages: Record<OperationStatus, string> = {
    waiting:
      "Tur operasyonunuz hazırlanıyor. Güncellemeler burada görünecek.",
    transfer_waiting:
      "Transfer ekibi hazırlanıyor. Lütfen belirtilen noktada hazır olun.",
    in_vehicle:
      "Transfer tamamlandı. Şu anda araçtasınız.",
    arrived:
      "Tur bölgesine ulaşıldı.",
    activity_started:
      "Aktiviteniz başladı. Keyifli vakit geçirmenizi dileriz.",
    activity_completed:
      "Aktivite başarıyla tamamlandı.",
    returning:
      "Dönüş yolculuğu başladı.",
    completed:
      "Turunuz tamamlandı. Bizi tercih ettiğiniz için teşekkür ederiz.",
    no_show:
      "Rezervasyon için katılım kaydı bulunamadı.",
  };

  return messages[status];
}

export default function PublicTrackingPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code);

  const [reservation, setReservation] =
    useState<Reservation | null>(null);
  const [checkin, setCheckin] =
    useState<Checkin | null>(null);
  const [history, setHistory] =
    useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadTracking = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "get_public_tour_tracking",
      {
        p_code: code,
      }
    );

    if (error || !data) {
      if (error) {
        console.error(error);
      }

      setReservation(null);
      setCheckin(null);
      setHistory([]);
      setErrorMessage("Takip bilgisi bulunamadı.");
      setLoading(false);
      return;
    }

    const payload = data as {
      reservation: Reservation;
      checkin: Checkin | null;
      history: HistoryItem[];
    };

    if (!payload.reservation) {
      setReservation(null);
      setCheckin(null);
      setHistory([]);
      setErrorMessage("Takip bilgisi bulunamadı.");
      setLoading(false);
      return;
    }

    setReservation(payload.reservation);
    setCheckin(payload.checkin ?? null);
    setHistory(payload.history ?? []);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    void loadTracking();

    const timer = window.setInterval(() => {
      void loadTracking();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadTracking]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-8 text-center text-slate-400">
          Tur durumu yükleniyor...
        </div>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
          {errorMessage}
        </div>
      </main>
    );
  }

  const currentStatus =
    checkin?.current_status ?? "waiting";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black">
              T
            </div>

            <div className="text-left">
              <p className="text-xl font-black">TUROBUS</p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                Canlı Tur Takibi
              </p>
            </div>
          </Link>
        </header>

        <section className="mt-10 rounded-[32px] border border-white/10 bg-slate-900 p-7 md:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
              <FaBus size={34} />
            </div>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-orange-400">
              Anlık durum
            </p>

            <h1 className="mt-3 text-4xl font-black">
              {labels[currentStatus]}
            </h1>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-400">
              {statusText(currentStatus)}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                Tur
              </p>

              <p className="mt-2 text-lg font-black">
                {reservation.tour_title}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                Rezervasyon
              </p>

              <p className="mt-2 text-lg font-black">
                {reservation.reservation_code ??
                  reservation.id.slice(0, 12)}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5">
              <FaCalendarAlt className="text-orange-400" />

              <div>
                <p className="text-xs text-slate-500">
                  Tur tarihi
                </p>

                <p className="font-black">
                  {new Date(
                    `${reservation.tour_date}T00:00:00`
                  ).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5">
              <FaUsers className="text-orange-400" />

              <div>
                <p className="text-xs text-slate-500">
                  Misafir sayısı
                </p>

                <p className="font-black">
                  {reservation.guests} kişi
                </p>
              </div>
            </div>

            {checkin?.last_location_name && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5 md:col-span-2">
                <FaMapMarkerAlt className="text-orange-400" />

                <div>
                  <p className="text-xs text-slate-500">
                    Son bilinen konum
                  </p>

                  <p className="font-black">
                    {checkin.last_location_name}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5 md:col-span-2">
              <FaClock className="text-orange-400" />

              <div>
                <p className="text-xs text-slate-500">
                  Son güncelleme
                </p>

                <p className="font-black">
                  {checkin?.last_updated_at
                    ? new Date(
                        checkin.last_updated_at
                      ).toLocaleString("tr-TR")
                    : "Henüz güncelleme yok"}
                </p>
              </div>
            </div>
          </div>

          {reservation.payment_status === "paid" && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-black text-emerald-400">
              <FaCheckCircle />
              Ödeme tamamlandı
            </div>
          )}
        </section>

        <div className="mt-8">
          <CustomerLiveMap
            reservationId={reservation.id}
          />
        </div>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-7">
          <div className="flex items-center gap-3">
            <FaQrcode className="text-orange-400" />
            <h2 className="text-2xl font-black">
              Tur Zaman Çizelgesi
            </h2>
          </div>

          <div className="mt-7 space-y-4">
            {history.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-slate-950 p-5"
              >
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

                <p className="mt-3 text-xs text-slate-600">
                  {new Date(
                    item.created_at
                  ).toLocaleString("tr-TR")}
                </p>
              </article>
            ))}

            {history.length === 0 && (
              <div className="rounded-2xl bg-slate-950 p-8 text-center text-slate-400">
                Tur güncellemeleri başladığında burada görünecek.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
