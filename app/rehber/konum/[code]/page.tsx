"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaBus,
  FaCalendarAlt,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/current-user";
import LiveLocationShare from "@/components/tracking/LiveLocationShare";
import BusTrackingContext from "@/components/tracking/BusTrackingContext";

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

export default function GuideLocationPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code);

  const router = useRouter();

  const [reservation, setReservation] =
    useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReservation = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      router.replace("/giris");
      return;
    }

    const membership = await getCurrentMembership(
      userData.user.id
    );

    if (!membership) {
      setErrorMessage("Firma üyeliği bulunamadı.");
      setLoading(false);
      return;
    }

    const currentCompanyId = membership.company_id;

    const isUuid = /^[0-9a-f-]{36}$/i.test(code);

    let query = supabase
      .from("reservations")
      .select(
        "id, reservation_code, tour_title, tour_date, guests, full_name, status, payment_status"
      )
      .eq("company_id", currentCompanyId);

    query = isUuid
      ? query.eq("id", code)
      : query.eq("reservation_code", code);

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      console.error(error);
      setErrorMessage("Rezervasyon bulunamadı.");
      setLoading(false);
      return;
    }

    setReservation(data as Reservation);
    setLoading(false);
  }, [code, router]);

  useEffect(() => {
    loadReservation();
  }, [loadReservation]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-8 text-center text-slate-400">
          Tur bilgileri yükleniyor...
        </div>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-400">
          {errorMessage}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard/operasyon"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-orange-400"
        >
          <FaArrowLeft />
          Operasyon Paneline Dön
        </Link>

        <header className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-7">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
            Rehber mobil paneli
          </p>

          <h1 className="mt-3 text-3xl font-black md:text-4xl">
            Canlı Araç Konumu
          </h1>

          <p className="mt-3 text-slate-400">
            Konum paylaşımı bu rezervasyonun bağlı olduğu
            tur otobüsünün canlı araç konumu olarak kullanılacaktır.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5">
              <FaBus className="text-orange-400" />

              <div>
                <p className="text-xs text-slate-500">Tur</p>
                <p className="font-black">
                  {reservation.tour_title}
                </p>
              </div>
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
                  Misafir
                </p>
                <p className="font-black">
                  {reservation.full_name} · {reservation.guests} kişi
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950 p-5">
              <p className="text-xs text-slate-500">
                Rezervasyon kodu
              </p>
              <p className="mt-2 font-black text-orange-400">
                {reservation.reservation_code ??
                  reservation.id.slice(0, 12)}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-8">
          <BusTrackingContext
            code={code}
            mode="guide"
          />
        </div>


        <div className="mt-8">
          <LiveLocationShare
            reservationId={reservation.id}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6 text-sm leading-7 text-orange-200">
          Telefonun konum iznini açık tut. Konum paylaşımı
          sırasında tarayıcıyı tamamen kapatma. Paylaşımı
          bitirdiğinde “Konum Paylaşımını Durdur” butonuna bas.
        </div>
      </div>
    </main>
  );
}

// TUROBUS_GUIDE_BUS_LOCATION_BRIDGE
