"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaBus,
  FaClock,
  FaExclamationTriangle,
  FaRoute,
  FaSatelliteDish,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import LiveFleetMap from "@/components/command-center/LiveFleetMap";
import OperationRadar from "@/components/command-center/OperationRadar";

type LiveLocation = {
  reservation_id: string;
  sharing_active: boolean;
  updated_at: string;
};

type Reservation = {
  id: string;
  tour_date: string;
  guests: number;
  status: string;
  payment_status: string | null;
};

type HistoryItem = {
  id: string;
  status: string;
  note: string | null;
  location_name: string | null;
  updated_by: string | null;
  created_at: string;
  reservation?: {
    reservation_code: string | null;
    tour_title: string;
    full_name: string;
  } | null;
};

function isFresh(updatedAt: string) {
  const difference =
    Date.now() - new Date(updatedAt).getTime();

  return difference <= 5 * 60 * 1000;
}

export default function CommandCenterPage() {
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCommandCenter = useCallback(async () => {
    setErrorMessage("");

    const [
      { data: locationData, error: locationError },
      { data: reservationData, error: reservationError },
      { data: historyData, error: historyError },
    ] = await Promise.all([
      supabase
        .from("tour_live_locations")
        .select("reservation_id, sharing_active, updated_at"),

      supabase
        .from("reservations")
        .select(
          "id, tour_date, guests, status, payment_status"
        ),

      supabase
        .from("tour_status_history")
        .select(`
          id,
          status,
          note,
          location_name,
          updated_by,
          created_at,
          reservation:reservations (
            reservation_code,
            tour_title,
            full_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const errors = [
      locationError,
      reservationError,
      historyError,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error(errors);
      setErrorMessage(
        errors[0]?.message ||
          "Command Center verileri yüklenemedi."
      );
    }

    setLocations((locationData ?? []) as LiveLocation[]);
    setReservations(
      (reservationData ?? []) as Reservation[]
    );
    setHistory((historyData ?? []) as unknown as HistoryItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCommandCenter();

    const channel = supabase
      .channel("command-center-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tour_live_locations",
        },
        loadCommandCenter
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tour_status_history",
        },
        loadCommandCenter
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        loadCommandCenter
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCommandCenter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const todayReservations = reservations.filter(
      (reservation) => reservation.tour_date === today
    );

    const activeVehicles = locations.filter(
      (location) =>
        location.sharing_active &&
        isFresh(location.updated_at)
    );

    const staleVehicles = locations.filter(
      (location) =>
        location.sharing_active &&
        !isFresh(location.updated_at)
    );

    const offlineVehicles = locations.filter(
      (location) => !location.sharing_active
    );

    return {
      activeTours: todayReservations.filter(
        (reservation) =>
          reservation.status !== "cancelled"
      ).length,

      activeGuests: todayReservations.reduce(
        (total, reservation) =>
          total + reservation.guests,
        0
      ),

      liveVehicles: activeVehicles.length,
      warningVehicles:
        staleVehicles.length + offlineVehicles.length,
    };
  }, [locations, reservations]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Command Center yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-400">
              TUROBUS OS
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Command Center
            </h1>

            <p className="mt-4 max-w-3xl text-slate-400">
              Aktif turları, araçları, misafirleri ve operasyon
              olaylarını gerçek zamanlı takip et.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/operasyon"
              className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black transition hover:bg-white/10"
            >
              Operasyon Paneli
            </Link>

            <Link
              href="/dashboard/rezervasyonlar"
              className="flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-black transition hover:bg-orange-600"
            >
              Rezervasyonlar
            </Link>
          </div>
        </header>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-400">
            {errorMessage}
          </div>
        )}

        <section className="mt-10 grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
          {[
            {
              label: "Bugünkü Aktif Tur",
              value: stats.activeTours,
              Icon: FaRoute,
            },
            {
              label: "Bugünkü Misafir",
              value: stats.activeGuests,
              Icon: FaUsers,
            },
            {
              label: "Canlı Araç",
              value: stats.liveVehicles,
              Icon: FaSatelliteDish,
            },
            {
              label: "Uyarı Gerektiren",
              value: stats.warningVehicles,
              Icon: FaExclamationTriangle,
            },
          ].map(({ label, value, Icon }) => (
            <article
              key={label}
              className="rounded-[28px] border border-white/10 bg-slate-900 p-6"
            >
              <Icon className="text-orange-400" size={22} />

              <p className="mt-6 text-sm font-bold text-slate-500">
                {label}
              </p>

              <p className="mt-2 text-4xl font-black">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-8 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <LiveFleetMap />

          <aside className="rounded-[32px] border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <FaClock className="text-orange-400" />

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
                  Realtime akış
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Son Operasyon Olayları
                </h2>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {history.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                    {item.reservation?.reservation_code ??
                      "TUROBUS"}
                  </p>

                  <p className="mt-2 font-black">
                    {item.reservation?.tour_title ??
                      item.status}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    {item.note || item.status}
                  </p>

                  {item.location_name && (
                    <p className="mt-2 text-xs text-slate-500">
                      📍 {item.location_name}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {item.reservation?.full_name ??
                        "Misafir"}
                    </span>

                    <span>
                      {new Date(
                        item.created_at
                      ).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </article>
              ))}

              {history.length === 0 && (
                <div className="rounded-2xl bg-slate-950 p-8 text-center text-slate-400">
                  Henüz operasyon olayı yok.
                </div>
              )}
            </div>
          </aside>
        </section>

        <div className="mt-8">
          <OperationRadar />
        </div>
      </div>
    </main>
  );
}
