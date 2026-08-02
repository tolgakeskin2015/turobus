"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaSatelliteDish,
  FaTimesCircle,
  FaUserClock,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";

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
  full_name: string;
  guests: number;
  status: string;
  payment_status: string | null;
  tour_checkins:
    | {
        checked_in: boolean;
        current_status: OperationStatus;
        last_updated_at: string;
      }
    | {
        checked_in: boolean;
        current_status: OperationStatus;
        last_updated_at: string;
      }[]
    | null;
  tour_live_locations:
    | {
        sharing_active: boolean;
        updated_at: string;
      }
    | {
        sharing_active: boolean;
        updated_at: string;
      }[]
    | null;
};

type RiskLevel = "critical" | "warning" | "healthy";

type RadarItem = {
  id: string;
  reservationId: string;
  reservationCode: string;
  title: string;
  description: string;
  level: RiskLevel;
  category:
    | "location"
    | "checkin"
    | "payment"
    | "operation"
    | "no_show";
};

function firstRelation<T>(value: T | T[] | null) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function minutesSince(value: string) {
  return (
    (Date.now() - new Date(value).getTime()) /
    1000 /
    60
  );
}

function isToday(date: string) {
  return date === new Date().toISOString().slice(0, 10);
}

function levelClasses(level: RiskLevel) {
  if (level === "critical") {
    return {
      card: "border-red-500/20 bg-red-500/10",
      icon: "bg-red-500/15 text-red-400",
      badge: "bg-red-500/15 text-red-400",
      label: "Kritik",
    };
  }

  if (level === "warning") {
    return {
      card: "border-amber-500/20 bg-amber-500/10",
      icon: "bg-amber-500/15 text-amber-400",
      badge: "bg-amber-500/15 text-amber-400",
      label: "Uyarı",
    };
  }

  return {
    card: "border-emerald-500/20 bg-emerald-500/10",
    icon: "bg-emerald-500/15 text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400",
    label: "Sorunsuz",
  };
}

function categoryIcon(category: RadarItem["category"]) {
  if (category === "location") return FaSatelliteDish;
  if (category === "checkin") return FaUserClock;
  if (category === "payment") return FaTimesCircle;
  if (category === "no_show") return FaTimesCircle;
  return FaMapMarkerAlt;
}

export default function OperationRadar() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRadar = useCallback(async () => {
    setErrorMessage("");

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        reservation_code,
        tour_title,
        tour_date,
        full_name,
        guests,
        status,
        payment_status,
        tour_checkins (
          checked_in,
          current_status,
          last_updated_at
        ),
        tour_live_locations (
          sharing_active,
          updated_at
        )
      `)
      .neq("status", "cancelled")
      .order("tour_date", { ascending: true });

    if (error) {
      console.error("Operasyon radarı yükleme hatası:", error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setReservations((data ?? []) as unknown as Reservation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRadar();

    const channel = supabase
      .channel("operation-radar-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        loadRadar
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tour_checkins",
        },
        loadRadar
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tour_live_locations",
        },
        loadRadar
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRadar]);

  const radarItems = useMemo(() => {
    const items: RadarItem[] = [];

    reservations
      .filter((reservation) => isToday(reservation.tour_date))
      .forEach((reservation) => {
        const checkin = firstRelation(
          reservation.tour_checkins
        );

        const location = firstRelation(
          reservation.tour_live_locations
        );

        const code =
          reservation.reservation_code ??
          reservation.id.slice(0, 10);

        if (reservation.payment_status !== "paid") {
          items.push({
            id: `${reservation.id}-payment`,
            reservationId: reservation.id,
            reservationCode: code,
            title: "Ödeme tamamlanmadı",
            description: `${reservation.full_name} için ödeme bekleniyor.`,
            level: "critical",
            category: "payment",
          });
        }

        if (!checkin?.checked_in) {
          items.push({
            id: `${reservation.id}-checkin`,
            reservationId: reservation.id,
            reservationCode: code,
            title: "Check-in bekleniyor",
            description: `${reservation.full_name} henüz check-in yapmadı.`,
            level: "warning",
            category: "checkin",
          });
        }

        if (checkin?.current_status === "no_show") {
          items.push({
            id: `${reservation.id}-noshow`,
            reservationId: reservation.id,
            reservationCode: code,
            title: "Misafir katılmadı",
            description: `${reservation.full_name} katılmadı olarak işaretlendi.`,
            level: "critical",
            category: "no_show",
          });
        }

        if (!location) {
          items.push({
            id: `${reservation.id}-location-missing`,
            reservationId: reservation.id,
            reservationCode: code,
            title: "Canlı konum başlamadı",
            description: `${reservation.tour_title} için araç konumu bulunmuyor.`,
            level: "warning",
            category: "location",
          });
        } else if (!location.sharing_active) {
          items.push({
            id: `${reservation.id}-location-offline`,
            reservationId: reservation.id,
            reservationCode: code,
            title: "Konum paylaşımı kapalı",
            description: `${reservation.tour_title} aracının konum paylaşımı durduruldu.`,
            level: "critical",
            category: "location",
          });
        } else {
          const locationAge = minutesSince(
            location.updated_at
          );

          if (locationAge > 10) {
            items.push({
              id: `${reservation.id}-location-critical`,
              reservationId: reservation.id,
              reservationCode: code,
              title: "Araç sinyali kesildi",
              description: `Son konum ${Math.round(
                locationAge
              )} dakika önce alındı.`,
              level: "critical",
              category: "location",
            });
          } else if (locationAge > 5) {
            items.push({
              id: `${reservation.id}-location-stale`,
              reservationId: reservation.id,
              reservationCode: code,
              title: "Araç sinyali gecikiyor",
              description: `Son konum ${Math.round(
                locationAge
              )} dakika önce alındı.`,
              level: "warning",
              category: "location",
            });
          }
        }

        if (
          checkin &&
          !["completed", "no_show"].includes(
            checkin.current_status
          )
        ) {
          const operationAge = minutesSince(
            checkin.last_updated_at
          );

          if (operationAge > 60) {
            items.push({
              id: `${reservation.id}-operation-stale`,
              reservationId: reservation.id,
              reservationCode: code,
              title: "Operasyon güncellemesi gecikti",
              description: `Tur durumu ${Math.round(
                operationAge
              )} dakikadır güncellenmedi.`,
              level: "warning",
              category: "operation",
            });
          }
        }
      });

    return items.sort((first, second) => {
      const priority: Record<RiskLevel, number> = {
        critical: 0,
        warning: 1,
        healthy: 2,
      };

      return (
        priority[first.level] - priority[second.level]
      );
    });
  }, [reservations]);

  const totals = useMemo(
    () => ({
      critical: radarItems.filter(
        (item) => item.level === "critical"
      ).length,
      warning: radarItems.filter(
        (item) => item.level === "warning"
      ).length,
      affectedTours: new Set(
        radarItems.map((item) => item.reservationId)
      ).size,
    }),
    [radarItems]
  );

  if (loading) {
    return (
      <section className="rounded-[32px] border border-white/10 bg-slate-900 p-7 text-slate-400">
        Operasyon radarı analiz ediliyor...
      </section>
    );
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-900 p-7">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
            Otomatik analiz
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            Operasyon Radarı
          </h2>

          <p className="mt-3 text-slate-400">
            Sistem canlı operasyon verilerini tarayarak
            müdahale gerektiren durumları otomatik bulur.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-red-500/10 px-5 py-4 text-center">
            <p className="text-2xl font-black text-red-400">
              {totals.critical}
            </p>
            <p className="mt-1 text-xs text-red-300/70">
              Kritik
            </p>
          </div>

          <div className="rounded-2xl bg-amber-500/10 px-5 py-4 text-center">
            <p className="text-2xl font-black text-amber-400">
              {totals.warning}
            </p>
            <p className="mt-1 text-xs text-amber-300/70">
              Uyarı
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.05] px-5 py-4 text-center">
            <p className="text-2xl font-black text-white">
              {totals.affectedTours}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Etkilenen tur
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {radarItems.map((item) => {
          const styles = levelClasses(item.level);
          const Icon = categoryIcon(item.category);

          return (
            <article
              key={item.id}
              className={`rounded-3xl border p-5 ${styles.card}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
                >
                  <Icon size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${styles.badge}`}
                    >
                      {styles.label}
                    </span>

                    <span className="text-xs font-black text-slate-500">
                      {item.reservationCode}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-black text-white">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>

                  <Link
                    href={`/dashboard/check-in/${item.reservationCode}`}
                    className="mt-4 inline-flex text-sm font-black text-orange-400 transition hover:text-orange-300"
                  >
                    Operasyonu incele →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}

        {radarItems.length === 0 && (
          <div className="xl:col-span-2 flex items-center gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <FaCheckCircle size={22} />
            </div>

            <div>
              <h3 className="font-black text-emerald-300">
                Tüm operasyonlar sorunsuz
              </h3>

              <p className="mt-1 text-sm text-emerald-200/70">
                Şu anda müdahale gerektiren bir durum
                tespit edilmedi.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
