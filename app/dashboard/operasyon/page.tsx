"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  FaBus,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaQrcode,
  FaSearch,
  FaSyncAlt,
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
  phone: string;
  email: string;
  status: string;
  payment_status: string | null;
  created_at: string;
  tour_checkins:
    | {
        id: string;
        checked_in: boolean;
        checked_in_at: string | null;
        checked_in_by: string | null;
        current_status: OperationStatus;
        status_note: string | null;
        last_location_name: string | null;
        last_updated_at: string;
      }
    | {
        id: string;
        checked_in: boolean;
        checked_in_at: string | null;
        checked_in_by: string | null;
        current_status: OperationStatus;
        status_note: string | null;
        last_location_name: string | null;
        last_updated_at: string;
      }[]
    | null;
};

const statusOptions: {
  value: OperationStatus;
  label: string;
}[] = [
  { value: "waiting", label: "Bekliyor" },
  {
    value: "transfer_waiting",
    label: "Transfer Bekliyor",
  },
  { value: "in_vehicle", label: "Araçta" },
  { value: "arrived", label: "Bölgeye Ulaştı" },
  {
    value: "activity_started",
    label: "Aktivite Başladı",
  },
  {
    value: "activity_completed",
    label: "Aktivite Tamamlandı",
  },
  { value: "returning", label: "Dönüş Yolunda" },
  { value: "completed", label: "Tur Tamamlandı" },
  { value: "no_show", label: "Katılmadı" },
];

function statusLabel(status: OperationStatus) {
  return (
    statusOptions.find((item) => item.value === status)?.label ??
    status
  );
}

function getCheckin(reservation: Reservation) {
  const checkins = reservation.tour_checkins;

  if (!checkins) return null;

  return Array.isArray(checkins)
    ? checkins[0] ?? null
    : checkins;
}

function statusClasses(status: OperationStatus) {
  if (status === "completed") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "activity_started") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (
    status === "in_vehicle" ||
    status === "returning"
  ) {
    return "bg-violet-500/15 text-violet-400";
  }

  if (status === "no_show") {
    return "bg-red-500/15 text-red-400";
  }

  return "bg-orange-500/15 text-orange-400";
}

export default function OperationDashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<
    "today" | "upcoming" | "all"
  >("today");
  const [statusFilter, setStatusFilter] = useState<
    "all" | OperationStatus
  >("all");
  const [errorMessage, setErrorMessage] = useState("");

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        reservation_code,
        tour_title,
        tour_date,
        guests,
        full_name,
        phone,
        email,
        status,
        payment_status,
        created_at,
        tour_checkins (
          id,
          checked_in,
          checked_in_at,
          checked_in_by,
          current_status,
          status_note,
          last_location_name,
          last_updated_at
        )
      `)
      .order("tour_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Operasyon yükleme hatası:", error);
      setErrorMessage(
        "Operasyon kayıtları yüklenemedi: " + error.message
      );
      setLoading(false);
      return;
    }

    setReservations((data ?? []) as unknown as Reservation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOperations();

    const channel = supabase
      .channel("operations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tour_checkins",
        },
        () => {
          loadOperations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        () => {
          loadOperations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tour_live_locations",
        },
        () => {
          loadOperations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOperations]);

  const filteredReservations = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return reservations.filter((reservation) => {
      const checkin = getCheckin(reservation);
      const currentStatus =
        checkin?.current_status ?? "waiting";

      const matchesSearch =
        !query ||
        reservation.full_name
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        reservation.tour_title
          .toLocaleLowerCase("tr-TR")
          .includes(query) ||
        reservation.phone.includes(query) ||
        (reservation.reservation_code ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(query);

      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" &&
          reservation.tour_date === today) ||
        (dateFilter === "upcoming" &&
          reservation.tour_date >= today);

      const matchesStatus =
        statusFilter === "all" ||
        currentStatus === statusFilter;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [reservations, search, dateFilter, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayReservations = reservations.filter(
      (reservation) => reservation.tour_date === today
    );

    return {
      todayGuests: todayReservations.reduce(
        (sum, reservation) => sum + reservation.guests,
        0
      ),
      todayReservations: todayReservations.length,
      checkedIn: todayReservations.filter(
        (reservation) =>
          getCheckin(reservation)?.checked_in
      ).length,
      activeTours: todayReservations.filter((reservation) => {
        const status =
          getCheckin(reservation)?.current_status ??
          "waiting";

        return !["completed", "no_show"].includes(status);
      }).length,
    };
  }, [reservations]);

  async function ensureCheckin(reservationId: string) {
    const { data, error } = await supabase
      .from("tour_checkins")
      .upsert(
        {
          reservation_id: reservationId,
          current_status: "waiting",
        },
        {
          onConflict: "reservation_id",
          ignoreDuplicates: true,
        }
      )
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async function updateOperationStatus(
    reservation: Reservation,
    nextStatus: OperationStatus
  ) {
    setActionId(reservation.id);
    setErrorMessage("");

    try {
      await ensureCheckin(reservation.id);

      const now = new Date().toISOString();
      const currentCheckin = getCheckin(reservation);

      const updateData: Record<string, unknown> = {
        current_status: nextStatus,
        last_updated_at: now,
        updated_at: now,
      };

      if (
        nextStatus === "in_vehicle" &&
        !currentCheckin?.checked_in
      ) {
        updateData.checked_in = true;
        updateData.checked_in_at = now;
        updateData.checked_in_by = "Operasyon Paneli";
      }

      const { error: checkinError } = await supabase
        .from("tour_checkins")
        .update(updateData)
        .eq("reservation_id", reservation.id);

      if (checkinError) {
        throw checkinError;
      }

      const { error: historyError } = await supabase
        .from("tour_status_history")
        .insert({
          reservation_id: reservation.id,
          status: nextStatus,
          note: `${statusLabel(nextStatus)} olarak güncellendi.`,
          location_name:
            currentCheckin?.last_location_name ?? null,
          updated_by: "Operasyon Paneli",
        });

      if (historyError) {
        throw historyError;
      }

      await loadOperations();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Operasyon durumu güncellenemedi."
      );
    } finally {
      setActionId("");
    }
  }

  async function toggleCheckin(reservation: Reservation) {
    setActionId(reservation.id);
    setErrorMessage("");

    try {
      await ensureCheckin(reservation.id);

      const currentCheckin = getCheckin(reservation);
      const nextCheckedIn = !currentCheckin?.checked_in;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("tour_checkins")
        .update({
          checked_in: nextCheckedIn,
          checked_in_at: nextCheckedIn ? now : null,
          checked_in_by: nextCheckedIn
            ? "Operasyon Paneli"
            : null,
          last_updated_at: now,
          updated_at: now,
        })
        .eq("reservation_id", reservation.id);

      if (error) {
        throw error;
      }

      await supabase.from("tour_status_history").insert({
        reservation_id: reservation.id,
        status:
          currentCheckin?.current_status ?? "waiting",
        note: nextCheckedIn
          ? "Müşteri check-in yaptı."
          : "Müşteri check-in kaydı geri alındı.",
        updated_by: "Operasyon Paneli",
      });

      await loadOperations();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Check-in işlemi yapılamadı."
      );
    } finally {
      setActionId("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">
          Operasyon kayıtları yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
              Canlı operasyon
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Tur Takip Merkezi
            </h1>

            <p className="mt-4 max-w-2xl text-slate-400">
              Misafirlerin check-in, transfer, aktivite ve dönüş
              durumlarını tek ekrandan takip et.
            </p>
          </div>

          <button
            type="button"
            onClick={loadOperations}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 font-black transition hover:bg-orange-500"
          >
            <FaSyncAlt />
            Yenile
          </button>
        </div>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Bugünkü Misafir", stats.todayGuests, FaUsers],
            [
              "Bugünkü Rezervasyon",
              stats.todayReservations,
              FaCalendarAlt,
            ],
            ["Check-in", stats.checkedIn, FaCheckCircle],
            ["Aktif Operasyon", stats.activeTours, FaBus],
          ].map(([label, value, Icon]) => {
            const IconComponent = Icon as typeof FaUsers;

            return (
              <article
                key={String(label)}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <IconComponent className="text-orange-400" />

                <p className="mt-5 text-sm font-bold text-slate-500">
                  {String(label)}
                </p>

                <p className="mt-2 text-4xl font-black">
                  {String(value)}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-slate-900 p-5 lg:grid-cols-[1fr_190px_220px]">
          <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
            <FaSearch className="text-orange-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kod, müşteri, telefon veya tur ara"
              className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
            />
          </label>

          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value as
                  | "today"
                  | "upcoming"
                  | "all"
              )
            }
            className="min-h-14 rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
          >
            <option value="today">Bugünkü turlar</option>
            <option value="upcoming">
              Bugün ve yaklaşanlar
            </option>
            <option value="all">Tüm tarihler</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "all"
                  | OperationStatus
              )
            }
            className="min-h-14 rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
          >
            <option value="all">Tüm operasyon durumları</option>

            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        <section className="mt-8 space-y-5">
          {filteredReservations.map((reservation) => {
            const checkin = getCheckin(reservation);
            const currentStatus =
              checkin?.current_status ?? "waiting";

            return (
              <article
                key={reservation.id}
                className="rounded-[28px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex flex-col justify-between gap-7 xl:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-orange-400">
                        {reservation.reservation_code ??
                          reservation.id.slice(0, 10)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
                          currentStatus
                        )}`}
                      >
                        {statusLabel(currentStatus)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${
                          checkin?.checked_in
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-white/[0.05] text-slate-400"
                        }`}
                      >
                        {checkin?.checked_in
                          ? "Check-in Yapıldı"
                          : "Check-in Bekliyor"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${
                          reservation.payment_status === "paid"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-orange-500/15 text-orange-400"
                        }`}
                      >
                        {reservation.payment_status === "paid"
                          ? "Ödendi"
                          : "Ödeme Bekliyor"}
                      </span>
                    </div>

                    <h2 className="mt-5 text-2xl font-black">
                      {reservation.tour_title}
                    </h2>

                    <div className="mt-5 grid gap-3 text-sm text-slate-400 md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <FaUser className="text-orange-400" />
                        {reservation.full_name}
                      </div>

                      <div className="flex items-center gap-2">
                        <FaPhone className="text-orange-400" />
                        {reservation.phone}
                      </div>

                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-orange-400" />
                        {new Date(
                          `${reservation.tour_date}T00:00:00`
                        ).toLocaleDateString("tr-TR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <FaUsers className="text-orange-400" />
                        {reservation.guests} kişi
                      </div>

                      {checkin?.last_location_name && (
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="text-orange-400" />
                          {checkin.last_location_name}
                        </div>
                      )}

                      {checkin?.last_updated_at && (
                        <div className="flex items-center gap-2">
                          <FaClock className="text-orange-400" />
                          Son güncelleme:{" "}
                          {new Date(
                            checkin.last_updated_at
                          ).toLocaleString("tr-TR")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="xl:w-[330px]">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Operasyon durumu
                      </span>

                      <select
                        value={currentStatus}
                        disabled={actionId === reservation.id}
                        onChange={(event) =>
                          updateOperationStatus(
                            reservation,
                            event.target.value as OperationStatus
                          )
                        }
                        className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 text-sm font-bold text-slate-950 outline-none disabled:opacity-50"
                      >
                        {statusOptions.map((item) => (
                          <option
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <button
                        type="button"
                        disabled={actionId === reservation.id}
                        onClick={() =>
                          toggleCheckin(reservation)
                        }
                        className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition disabled:opacity-50 ${
                          checkin?.checked_in
                            ? "border border-red-500/20 bg-red-500/10 text-red-400"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        <FaCheckCircle />
                        {checkin?.checked_in
                          ? "Check-in Geri Al"
                          : "Check-in Yap"}
                      </button>

                      <Link
                        href={`/dashboard/check-in/${
                          reservation.reservation_code ??
                          reservation.id
                        }`}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black transition hover:bg-orange-500"
                      >
                        <FaQrcode />
                        QR / Detay
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredReservations.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">
              <FaBus
                className="mx-auto text-orange-400"
                size={32}
              />

              <h2 className="mt-5 text-2xl font-black">
                Operasyon kaydı bulunamadı
              </h2>

              <p className="mt-3 text-slate-400">
                Tarih veya durum filtresini değiştir.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
