"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaArrowLeft,
  FaClock,
  FaHistory,
  FaRecycle,
  FaSearch,
  FaTrash,
  FaUndo,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  DeletedReservation,
  getReservationTrashData,
  permanentlyDeleteReservation,
  ReservationAuditLog,
  restoreReservation,
} from "@/lib/hotel/reservations/reservation-trash-service";

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function dateTime(
  value: string
): string {
  return new Date(
    value
  ).toLocaleString("tr-TR");
}

function dateText(
  value: string
): string {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("tr-TR");
}

function money(
  value: number,
  currency: string
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
    }
  ).format(Number(value || 0));
}

const actionLabels: Record<
  string,
  string
> = {
  created: "Oluşturuldu",
  updated: "Güncellendi",
  status_changed:
    "Durumu Değiştirildi",
  room_assigned: "Oda Atandı",
  room_unassigned:
    "Oda Ataması Kaldırıldı",
  checked_in: "Check-in Yapıldı",
  checked_out:
    "Check-out Yapıldı",
  cancelled: "İptal Edildi",
  deleted:
    "Çöp Kutusuna Taşındı",
  restored: "Geri Yüklendi",
  permanently_deleted:
    "Kalıcı Silindi",
};

export default function ReservationTrashPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    reservations,
    setReservations,
  ] = useState<DeletedReservation[]>(
    []
  );

  const [logs, setLogs] =
    useState<ReservationAuditLog[]>(
      []
    );

  const [search, setSearch] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<"trash" | "history">(
      "trash"
    );

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getReservationTrashData(
          companyId
        );

      setReservations(
        data.reservations
      );

      setLogs(data.logs);
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Kullanıcı oturumu bulunamadı."
          );
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(
          currentMembership
        );

        await loadData(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Rezervasyon çöp kutusu yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  async function refresh() {
    if (!membership) return;

    await loadData(
      membership.company_id
    );
  }

  const visibleReservations =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      if (!query) {
        return reservations;
      }

      return reservations.filter(
        (reservation) => {
          const hotel =
            firstRelation(
              reservation.hotel
            );

          const roomType =
            firstRelation(
              reservation.room_type
            );

          return [
            reservation.reservation_no,
            hotel?.name,
            roomType?.name,
            reservation.deletion_reason,
            reservation.source,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            );
        }
      );
    }, [reservations, search]);

  const visibleLogs = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) return logs;

    return logs.filter((log) =>
      [
        log.reservation_no,
        log.action_type,
        log.description,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(query)
        )
    );
  }, [logs, search]);

  async function handleRestore(
    reservation: DeletedReservation
  ) {
    if (
      !membership ||
      processingId
    ) {
      return;
    }

    if (
      !window.confirm(
        `${reservation.reservation_no} numaralı rezervasyon geri yüklensin mi?`
      )
    ) {
      return;
    }

    setProcessingId(
      reservation.id
    );
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await restoreReservation(
        membership.company_id,
        reservation.id
      );

      await refresh();

      setSuccessMessage(
        "Rezervasyon geri yüklendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Rezervasyon geri yüklenemedi."
      );
    } finally {
      setProcessingId("");
    }
  }

  async function handlePermanentDelete(
    reservation: DeletedReservation
  ) {
    if (
      !membership ||
      processingId
    ) {
      return;
    }

    const confirmation =
      window.prompt(
        `Bu işlem geri alınamaz.\n\nOnaylamak için ${reservation.reservation_no} yazın.`
      );

    if (
      confirmation !==
      reservation.reservation_no
    ) {
      setErrorMessage(
        "Rezervasyon numarası doğrulanamadı."
      );

      return;
    }

    setProcessingId(
      reservation.id
    );
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await permanentlyDeleteReservation(
        membership.company_id,
        reservation.id
      );

      await refresh();

      setSuccessMessage(
        "Rezervasyon kalıcı olarak silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Rezervasyon kalıcı olarak silinemedi."
      );
    } finally {
      setProcessingId("");
    }
  }

  if (loading) {
    return (
      <main className="p-10">
        Rezervasyon çöp kutusu yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1750px]">
        <header>
          <Link
            href="/dashboard/hotel/rezervasyonlar"
            className="inline-flex items-center gap-2 font-black text-orange-400"
          >
            <FaArrowLeft />
            Rezervasyon Merkezine Dön
          </Link>

          <p className="mt-7 text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS HOTEL PMS
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Rezervasyon Çöp Kutusu
          </h1>

          <p className="mt-4 text-slate-400">
            Silinen rezervasyonları geri
            yükleyin ve işlem geçmişini
            inceleyin.
          </p>
        </header>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaRecycle className="text-orange-400" />

            <p className="mt-4 text-sm text-slate-500">
              Çöp Kutusundaki Rezervasyon
            </p>

            <p className="mt-2 text-4xl font-black">
              {reservations.length}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaHistory className="text-orange-400" />

            <p className="mt-4 text-sm text-slate-500">
              İşlem Geçmişi
            </p>

            <p className="mt-2 text-4xl font-black">
              {logs.length}
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveTab("trash")
                }
                className={`rounded-xl px-5 py-3 font-black ${
                  activeTab === "trash"
                    ? "bg-orange-500"
                    : "bg-slate-950 text-slate-400"
                }`}
              >
                Çöp Kutusu
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "history"
                  )
                }
                className={`rounded-xl px-5 py-3 font-black ${
                  activeTab ===
                  "history"
                    ? "bg-orange-500"
                    : "bg-slate-950 text-slate-400"
                }`}
              >
                İşlem Geçmişi
              </button>
            </div>

            <label className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-white px-4 lg:max-w-xl">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Rezervasyon, otel veya işlem ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>
          </div>
        </section>

        {activeTab === "trash" && (
          <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleReservations.map(
              (reservation) => {
                const hotel =
                  firstRelation(
                    reservation.hotel
                  );

                const roomType =
                  firstRelation(
                    reservation.room_type
                  );

                const room =
                  firstRelation(
                    reservation.room
                  );

                const processing =
                  processingId ===
                  reservation.id;

                return (
                  <article
                    key={reservation.id}
                    className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-red-400">
                      SİLİNMİŞ REZERVASYON
                    </p>

                    <h2 className="mt-2 text-xl font-black text-orange-400">
                      {reservation.reservation_no}
                    </h2>

                    <p className="mt-4 text-lg font-black">
                      {hotel?.name ??
                        "Otel belirtilmedi"}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-slate-400">
                      <p>
                        Oda tipi:{" "}
                        {roomType?.name ??
                          "Belirtilmedi"}
                      </p>

                      <p>
                        Oda:{" "}
                        {room?.room_number ??
                          "Atanmamış"}
                      </p>

                      <p>
                        {dateText(
                          reservation.check_in
                        )}
                        {" – "}
                        {dateText(
                          reservation.check_out
                        )}
                      </p>

                      <p>
                        {reservation.nights} gece
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-950 p-4">
                      <p className="text-xs text-slate-500">
                        Silinme Tarihi
                      </p>

                      <p className="mt-1 font-black">
                        {dateTime(
                          reservation.deleted_at
                        )}
                      </p>

                      <p className="mt-4 text-xs text-slate-500">
                        Silinme Nedeni
                      </p>

                      <p className="mt-1 font-black">
                        {reservation.deletion_reason ||
                          "Neden belirtilmedi"}
                      </p>
                    </div>

                    <p className="mt-5 text-xl font-black text-emerald-400">
                      {money(
                        reservation.total_price,
                        reservation.currency
                      )}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void handleRestore(
                            reservation
                          )
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 font-black disabled:opacity-40"
                      >
                        <FaUndo />
                        Geri Yükle
                      </button>

                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void handlePermanentDelete(
                            reservation
                          )
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-500/15 font-black text-red-400 disabled:opacity-40"
                      >
                        <FaTrash />
                        Kalıcı Sil
                      </button>
                    </div>
                  </article>
                );
              }
            )}

            {visibleReservations.length ===
              0 && (
              <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-500 md:col-span-2 xl:col-span-3">
                Çöp kutusunda rezervasyon
                bulunmuyor.
              </div>
            )}
          </section>
        )}

        {activeTab === "history" && (
          <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="space-y-3">
              {visibleLogs.map((log) => (
                <article
                  key={log.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-950 p-5 md:flex-row"
                >
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                      <FaClock />
                    </div>

                    <div>
                      <p className="font-black">
                        {log.reservation_no ??
                          "Rezervasyon"}
                      </p>

                      <span className="mt-2 inline-flex rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
                        {actionLabels[
                          log.action_type
                        ] ??
                          log.action_type}
                      </span>

                      <p className="mt-3 text-sm text-slate-400">
                        {log.description ??
                          "Açıklama bulunmuyor."}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">
                    {dateTime(
                      log.created_at
                    )}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
