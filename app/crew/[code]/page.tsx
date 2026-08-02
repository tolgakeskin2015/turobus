"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaBus,
  FaCalendarAlt,
  FaCheckCircle,
  FaPhone,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import LiveLocationShare from "@/components/tracking/LiveLocationShare";

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
  payment_status: string | null;
};

type Checkin = {
  checked_in: boolean;
  checked_in_at: string | null;
  current_status: OperationStatus;
  last_location_name: string | null;
  last_updated_at: string;
};

type ManifestPassenger = {
  id: string;
  reservation_code: string | null;
  full_name: string;
  phone: string;
  email: string;
  guests: number;
  payment_status: string | null;
  tour_checkins:
    | {
        checked_in: boolean;
        checked_in_at: string | null;
        current_status: OperationStatus;
      }
    | {
        checked_in: boolean;
        checked_in_at: string | null;
        current_status: OperationStatus;
      }[]
    | null;
};

function getPassengerCheckin(
  passenger: ManifestPassenger
) {
  const relation = passenger.tour_checkins;

  if (!relation) return null;

  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

const statusActions: {
  value: OperationStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "transfer_waiting",
    label: "Transfer Bekliyor",
    description: "Misafir alınmayı bekliyor.",
  },
  {
    value: "in_vehicle",
    label: "Araçta",
    description: "Misafir araca alındı.",
  },
  {
    value: "arrived",
    label: "Bölgeye Ulaşıldı",
    description: "Tur bölgesine varıldı.",
  },
  {
    value: "activity_started",
    label: "Aktivite Başladı",
    description: "Tur veya aktivite başladı.",
  },
  {
    value: "activity_completed",
    label: "Aktivite Tamamlandı",
    description: "Aktivite başarıyla tamamlandı.",
  },
  {
    value: "returning",
    label: "Dönüş Yolunda",
    description: "Otele veya merkeze dönüş başladı.",
  },
  {
    value: "completed",
    label: "Tur Tamamlandı",
    description: "Operasyon tamamlandı.",
  },
  {
    value: "no_show",
    label: "Katılmadı",
    description: "Misafir tura katılmadı.",
  },
];

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;

  return `90${digits}`;
}

export default function CrewPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code);

  const [reservation, setReservation] =
    useState<Reservation | null>(null);
  const [checkin, setCheckin] =
    useState<Checkin | null>(null);
  const [passengers, setPassengers] =
    useState<ManifestPassenger[]>([]);
  const [passengerActionId, setPassengerActionId] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCrewData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const isUuid = /^[0-9a-f-]{36}$/i.test(code);

    let query = supabase
      .from("reservations")
      .select(
        "id, reservation_code, tour_title, tour_date, guests, full_name, phone, email, payment_status"
      );

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

    const { data: checkinData } = await supabase
      .from("tour_checkins")
      .select(
        "checked_in, checked_in_at, current_status, last_location_name, last_updated_at"
      )
      .eq("reservation_id", data.id)
      .maybeSingle();

    setCheckin((checkinData as Checkin | null) ?? null);

    const { data: passengerData, error: passengerError } =
      await supabase
        .from("reservations")
        .select(`
          id,
          reservation_code,
          full_name,
          phone,
          email,
          guests,
          payment_status,
          tour_checkins (
            checked_in,
            checked_in_at,
            current_status
          )
        `)
        .eq("tour_title", data.tour_title)
        .eq("tour_date", data.tour_date)
        .neq("status", "cancelled")
        .order("full_name", { ascending: true });

    if (passengerError) {
      console.error(
        "Yolcu listesi yüklenemedi:",
        passengerError
      );
    }

    setPassengers(
      (passengerData ?? []) as unknown as ManifestPassenger[]
    );
    setLoading(false);
  }, [code]);

  useEffect(() => {
    loadCrewData();
  }, [loadCrewData]);

  async function updateStatus(nextStatus: OperationStatus) {
    if (!reservation) return;

    setSaving(nextStatus);
    setMessage("");
    setErrorMessage("");

    try {
      const now = new Date().toISOString();

      const shouldCheckIn = ![
        "waiting",
        "transfer_waiting",
        "no_show",
      ].includes(nextStatus);

      const { error: checkinError } = await supabase
        .from("tour_checkins")
        .upsert(
          {
            reservation_id: reservation.id,
            current_status: nextStatus,
            checked_in:
              checkin?.checked_in || shouldCheckIn,
            checked_in_at:
              checkin?.checked_in_at ||
              (shouldCheckIn ? now : null),
            checked_in_by:
              checkin?.checked_in ||
              !shouldCheckIn
                ? null
                : "Crew Mobil Panel",
            last_updated_at: now,
            updated_at: now,
          },
          {
            onConflict: "reservation_id",
          }
        );

      if (checkinError) throw checkinError;

      const action = statusActions.find(
        (item) => item.value === nextStatus
      );

      const { error: historyError } = await supabase
        .from("tour_status_history")
        .insert({
          reservation_id: reservation.id,
          status: nextStatus,
          note:
            action?.description ||
            "Operasyon durumu güncellendi.",
          location_name:
            checkin?.last_location_name ?? null,
          updated_by: "Crew Mobil Panel",
        });

      if (historyError) throw historyError;

      setMessage(
        `${action?.label ?? nextStatus} olarak güncellendi.`
      );

      await loadCrewData();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Durum güncellenemedi."
      );
    } finally {
      setSaving("");
    }
  }

  async function toggleCheckin() {
    if (!reservation) return;

    setSaving("checkin");
    setMessage("");
    setErrorMessage("");

    try {
      const nextCheckedIn = !checkin?.checked_in;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("tour_checkins")
        .upsert(
          {
            reservation_id: reservation.id,
            current_status:
              checkin?.current_status ?? "waiting",
            checked_in: nextCheckedIn,
            checked_in_at: nextCheckedIn ? now : null,
            checked_in_by: nextCheckedIn
              ? "Crew Mobil Panel"
              : null,
            last_updated_at: now,
            updated_at: now,
          },
          {
            onConflict: "reservation_id",
          }
        );

      if (error) throw error;

      await supabase
        .from("tour_status_history")
        .insert({
          reservation_id: reservation.id,
          status:
            checkin?.current_status ?? "waiting",
          note: nextCheckedIn
            ? "Misafir check-in yaptı."
            : "Check-in kaydı geri alındı.",
          updated_by: "Crew Mobil Panel",
        });

      setMessage(
        nextCheckedIn
          ? "Check-in tamamlandı."
          : "Check-in geri alındı."
      );

      await loadCrewData();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Check-in işlemi yapılamadı."
      );
    } finally {
      setSaving("");
    }
  }

  async function togglePassengerCheckin(
    passenger: ManifestPassenger
  ) {
    setPassengerActionId(passenger.id);
    setMessage("");
    setErrorMessage("");

    try {
      const passengerCheckin =
        getPassengerCheckin(passenger);

      const nextCheckedIn =
        !passengerCheckin?.checked_in;

      const now = new Date().toISOString();

      const { error: checkinError } = await supabase
        .from("tour_checkins")
        .upsert(
          {
            reservation_id: passenger.id,
            checked_in: nextCheckedIn,
            checked_in_at: nextCheckedIn ? now : null,
            checked_in_by: nextCheckedIn
              ? "Crew Yolcu Listesi"
              : null,
            current_status:
              passengerCheckin?.current_status ??
              "waiting",
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
          reservation_id: passenger.id,
          status:
            passengerCheckin?.current_status ??
            "waiting",
          note: nextCheckedIn
            ? "Misafir crew yolcu listesinden check-in yaptı."
            : "Misafirin check-in kaydı geri alındı.",
          updated_by: "Crew Yolcu Listesi",
        });

      if (historyError) throw historyError;

      setMessage(
        nextCheckedIn
          ? `${passenger.full_name} için check-in tamamlandı.`
          : `${passenger.full_name} için check-in geri alındı.`
      );

      await loadCrewData();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Yolcu check-in işlemi yapılamadı."
      );
    } finally {
      setPassengerActionId("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Crew paneli yükleniyor...
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          {errorMessage}
        </div>
      </main>
    );
  }

  const whatsappPhone = normalizePhone(
    reservation.phone
  );

  const whatsappMessage = encodeURIComponent(
    `Merhaba ${reservation.full_name}, ${reservation.tour_title} rezervasyonunuz için TUROBUS operasyon ekibinden ulaşıyoruz. Rezervasyon kodunuz: ${
      reservation.reservation_code ?? reservation.id
    }`
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
            TUROBUS CREW
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Rehber Mobil Paneli
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Rezervasyon:{" "}
            {reservation.reservation_code ??
              reservation.id.slice(0, 12)}
          </p>

          <div className="mt-6 grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
              <FaBus className="text-orange-400" />

              <div>
                <p className="text-xs text-slate-500">
                  Tur
                </p>
                <p className="font-black">
                  {reservation.tour_title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
              <FaCalendarAlt className="text-orange-400" />

              <div>
                <p className="text-xs text-slate-500">
                  Tarih
                </p>
                <p className="font-black">
                  {new Date(
                    `${reservation.tour_date}T00:00:00`
                  ).toLocaleDateString("tr-TR")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
              <FaUsers className="text-orange-400" />

              <div>
                <p className="text-xs text-slate-500">
                  Misafir
                </p>
                <p className="font-black">
                  {reservation.full_name} ·{" "}
                  {reservation.guests} kişi
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <a
            href={`tel:${reservation.phone}`}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-500 font-black"
          >
            <FaPhone />
            Ara
          </a>

          <a
            href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-black"
          >
            <FaWhatsapp />
            WhatsApp
          </a>
        </section>

        <section className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">
                Misafir Check-in
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {checkin?.checked_in
                  ? "Misafir araca veya tura kabul edildi."
                  : "Misafir henüz check-in yapmadı."}
              </p>
            </div>

            <FaCheckCircle
              size={25}
              className={
                checkin?.checked_in
                  ? "text-emerald-400"
                  : "text-slate-600"
              }
            />
          </div>

          <button
            type="button"
            disabled={saving === "checkin"}
            onClick={toggleCheckin}
            className={`mt-5 min-h-14 w-full rounded-2xl font-black ${
              checkin?.checked_in
                ? "border border-red-500/20 bg-red-500/10 text-red-400"
                : "bg-emerald-500"
            }`}
          >
            {saving === "checkin"
              ? "İşleniyor..."
              : checkin?.checked_in
                ? "Check-in Geri Al"
                : "Check-in Yap"}
          </button>
        </section>

        <section className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                Tur manifestosu
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Yolcu Listesi
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {passengers.reduce(
                  (total, passenger) =>
                    total + passenger.guests,
                  0
                )} misafir ·{" "}
                {
                  passengers.filter(
                    (passenger) =>
                      getPassengerCheckin(passenger)
                        ?.checked_in
                  ).length
                } rezervasyon check-in yaptı
              </p>
            </div>

            <div className="rounded-2xl bg-orange-500/10 px-5 py-3 text-center">
              <p className="text-2xl font-black text-orange-400">
                {
                  passengers.filter(
                    (passenger) =>
                      !getPassengerCheckin(passenger)
                        ?.checked_in
                  ).length
                }
              </p>

              <p className="text-xs text-orange-300/70">
                Bekleyen
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {passengers.map((passenger) => {
              const passengerCheckin =
                getPassengerCheckin(passenger);

              const passengerWhatsapp =
                normalizePhone(passenger.phone);

              const passengerMessage =
                encodeURIComponent(
                  `Merhaba ${passenger.full_name}, ${reservation.tour_title} turunuz için TUROBUS ekibinden ulaşıyoruz. Rezervasyon kodunuz: ${
                    passenger.reservation_code ??
                    passenger.id
                  }`
                );

              return (
                <article
                  key={passenger.id}
                  className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">
                          {passenger.full_name}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            passengerCheckin?.checked_in
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-orange-500/15 text-orange-400"
                          }`}
                        >
                          {passengerCheckin?.checked_in
                            ? "Check-in tamam"
                            : "Bekliyor"}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            passenger.payment_status ===
                            "paid"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {passenger.payment_status ===
                          "paid"
                            ? "Ödendi"
                            : "Ödeme bekliyor"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {passenger.guests} kişi ·{" "}
                        {passenger.reservation_code ??
                          passenger.id.slice(0, 10)}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {passenger.phone}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <a
                        href={`tel:${passenger.phone}`}
                        aria-label="Misafiri ara"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white"
                      >
                        <FaPhone />
                      </a>

                      <a
                        href={`https://wa.me/${passengerWhatsapp}?text=${passengerMessage}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="WhatsApp mesajı gönder"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white"
                      >
                        <FaWhatsapp />
                      </a>

                      <button
                        type="button"
                        disabled={
                          passengerActionId ===
                          passenger.id
                        }
                        onClick={() =>
                          togglePassengerCheckin(
                            passenger
                          )
                        }
                        aria-label="Check-in durumunu değiştir"
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-white disabled:opacity-50 ${
                          passengerCheckin?.checked_in
                            ? "bg-red-500"
                            : "bg-orange-500"
                        }`}
                      >
                        <FaCheckCircle />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {passengers.length === 0 && (
              <div className="rounded-2xl bg-slate-950 p-7 text-center text-slate-400">
                Bu tur için yolcu bulunamadı.
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-black">
            Hızlı Tur Akışı
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Mevcut durum:{" "}
            <strong className="text-orange-400">
              {checkin?.current_status ?? "waiting"}
            </strong>
          </p>

          <div className="mt-5 grid gap-3">
            {statusActions.map((action) => (
              <button
                key={action.value}
                type="button"
                disabled={saving === action.value}
                onClick={() =>
                  updateStatus(action.value)
                }
                className="rounded-2xl border border-white/10 bg-slate-950 p-4 text-left transition hover:border-orange-500"
              >
                <p className="font-black">
                  {saving === action.value
                    ? "Güncelleniyor..."
                    : action.label}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-5">
          <LiveLocationShare
            reservationId={reservation.id}
          />
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-400">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
            {errorMessage}
          </div>
        )}
      </div>
    </main>
  );
}
