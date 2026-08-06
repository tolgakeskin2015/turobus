"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBed,
  FaCalendarCheck,
  FaDoorOpen,
  FaHotel,
  FaSearch,
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  checkInReservation,
  checkOutReservation,
  FrontOfficeReservation,
  getFrontOfficeReservations,
} from "@/lib/hotel/front-office/front-office-service";

type Tab =
  | "arrivals"
  | "in_house"
  | "departures"
  | "all";

function localDateText(
  date: Date = new Date()
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(
  value: string,
  amount: number
): string {
  const date = new Date(
    `${value}T00:00:00`
  );

  date.setDate(
    date.getDate() + amount
  );

  return localDateText(date);
}

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function formatDate(
  value: string
): string {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "tr-TR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
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

function statusLabel(
  status: FrontOfficeReservation["status"]
): string {
  const labels = {
    pending: "Bekliyor",
    confirmed: "Onaylandı",
    checked_in: "Konaklıyor",
    checked_out: "Çıkış Yaptı",
    cancelled: "İptal",
    no_show: "No Show",
  };

  return labels[status];
}

function statusClasses(
  status: FrontOfficeReservation["status"]
): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/15 text-emerald-400";

    case "checked_in":
      return "bg-blue-500/15 text-blue-400";

    case "checked_out":
      return "bg-violet-500/15 text-violet-400";

    case "pending":
      return "bg-amber-500/15 text-amber-400";

    default:
      return "bg-slate-500/15 text-slate-400";
  }
}

export default function FrontOfficePage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    reservations,
    setReservations,
  ] = useState<
    FrontOfficeReservation[]
  >([]);

  const [tab, setTab] =
    useState<Tab>("arrivals");

  const [search, setSearch] =
    useState("");

  const [
    selectedReservation,
    setSelectedReservation,
  ] =
    useState<FrontOfficeReservation | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    processingId,
    setProcessingId,
  ] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const today = localDateText();

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getFrontOfficeReservations(
          companyId,
          addDays(today, -7),
          addDays(today, 30)
        );

      setReservations(data);
    },
    [today]
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
            : "Front Office yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const groups = useMemo(
    () => ({
      arrivals: reservations.filter(
        (item) =>
          item.check_in === today &&
          [
            "pending",
            "confirmed",
          ].includes(item.status)
      ),

      inHouse: reservations.filter(
        (item) =>
          item.status ===
          "checked_in"
      ),

      departures: reservations.filter(
        (item) =>
          item.check_out === today &&
          item.status ===
            "checked_in"
      ),
    }),
    [reservations, today]
  );

  const visibleReservations =
    useMemo(() => {
      const base =
        tab === "arrivals"
          ? groups.arrivals
          : tab === "in_house"
            ? groups.inHouse
            : tab === "departures"
              ? groups.departures
              : reservations;

      const query = search
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

      if (!query) return base;

      return base.filter(
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

          return [
            reservation.reservation_no,
            hotel?.name,
            roomType?.name,
            room?.room_number,
            reservation.source,
            reservation.status,
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
    }, [
      groups.arrivals,
      groups.departures,
      groups.inHouse,
      reservations,
      search,
      tab,
    ]);

  async function refresh() {
    if (!membership) return;

    await loadData(
      membership.company_id
    );
  }

  async function handleCheckIn(
    reservation: FrontOfficeReservation
  ) {
    if (
      !membership ||
      processingId
    ) {
      return;
    }

    const room = firstRelation(
      reservation.room
    );

    if (!room) {
      setErrorMessage(
        "Check-in öncesinde Room Planner üzerinden fiziksel oda atanmalıdır."
      );

      return;
    }

    const approved =
      window.confirm(
        `${reservation.reservation_no} numaralı rezervasyon için Oda ${room.room_number} odasına check-in yapılsın mı?`
      );

    if (!approved) return;

    setProcessingId(
      reservation.id
    );
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await checkInReservation(
        membership.company_id,
        reservation.id
      );

      await refresh();

      setSelectedReservation(
        null
      );

      setSuccessMessage(
        `${reservation.reservation_no} numaralı rezervasyon için check-in tamamlandı.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Check-in yapılamadı."
      );
    } finally {
      setProcessingId("");
    }
  }

  async function handleCheckOut(
    reservation: FrontOfficeReservation
  ) {
    if (
      !membership ||
      processingId
    ) {
      return;
    }

    const approved =
      window.confirm(
        `${reservation.reservation_no} numaralı rezervasyon için check-out yapılsın mı? Oda otomatik olarak kirli durumuna geçecektir.`
      );

    if (!approved) return;

    setProcessingId(
      reservation.id
    );
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await checkOutReservation(
        membership.company_id,
        reservation.id
      );

      await refresh();

      setSelectedReservation(
        null
      );

      setSuccessMessage(
        `${reservation.reservation_no} numaralı rezervasyon için check-out tamamlandı. Oda temizlik bekliyor.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Check-out yapılamadı."
      );
    } finally {
      setProcessingId("");
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Front Office yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS HOTEL PMS
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Check-in / Check-out
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            Günlük girişleri,
            konaklayanları ve çıkışları
            tek merkezden yönetin.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label:
                "Bugün Giriş",
              value:
                groups.arrivals.length,
              icon: FaSignInAlt,
            },
            {
              label:
                "Konaklayan",
              value:
                groups.inHouse.length,
              icon: FaHotel,
            },
            {
              label:
                "Bugün Çıkış",
              value:
                groups.departures.length,
              icon: FaSignOutAlt,
            },
            {
              label:
                "Toplam Görünen",
              value:
                reservations.length,
              icon:
                FaCalendarCheck,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <Icon className="text-orange-400" />

                <p className="mt-5 text-sm text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-4xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

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

        <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-3">
              {[
                {
                  value:
                    "arrivals" as Tab,
                  label: `Bugün Giriş (${groups.arrivals.length})`,
                },
                {
                  value:
                    "in_house" as Tab,
                  label: `Konaklayan (${groups.inHouse.length})`,
                },
                {
                  value:
                    "departures" as Tab,
                  label: `Bugün Çıkış (${groups.departures.length})`,
                },
                {
                  value:
                    "all" as Tab,
                  label: "Tümü",
                },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setTab(item.value)
                  }
                  className={`min-h-12 rounded-xl px-5 font-black transition ${
                    tab === item.value
                      ? "bg-orange-500"
                      : "bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-white px-4 xl:max-w-md">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Rezervasyon, otel veya oda ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>
          </div>
        </section>

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
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                        {
                          reservation.reservation_no
                        }
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        {hotel?.name ??
                          "Otel belirtilmedi"}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
                        reservation.status
                      )}`}
                    >
                      {statusLabel(
                        reservation.status
                      )}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-400">
                    <p className="flex items-center gap-2">
                      <FaBed className="text-orange-400" />

                      {roomType?.name ??
                        "Oda tipi"}

                      {" · "}

                      {room
                        ? `Oda ${room.room_number}`
                        : "Oda atanmadı"}
                    </p>

                    <p className="flex items-center gap-2">
                      <FaUsers className="text-orange-400" />

                      {reservation.adults} yetişkin
                      · {reservation.children} çocuk
                    </p>

                    <p>
                      Giriş:{" "}
                      {formatDate(
                        reservation.check_in
                      )}
                    </p>

                    <p>
                      Çıkış:{" "}
                      {formatDate(
                        reservation.check_out
                      )}
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-950 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        Toplam
                      </span>

                      <span className="font-black">
                        {money(
                          reservation.total_price,
                          reservation.currency
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between text-sm">
                      <span className="text-slate-500">
                        Bakiye
                      </span>

                      <span className="font-black text-amber-400">
                        {money(
                          reservation.balance,
                          reservation.currency
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedReservation(
                        reservation
                      )
                    }
                    className="mt-5 min-h-12 w-full rounded-xl border border-white/10 font-black"
                  >
                    Detayları Aç
                  </button>

                  {[
                    "pending",
                    "confirmed",
                  ].includes(
                    reservation.status
                  ) && (
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void handleCheckIn(
                          reservation
                        )
                      }
                      className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-black disabled:opacity-50"
                    >
                      <FaSignInAlt />

                      {processing
                        ? "İşleniyor..."
                        : "Check-in Yap"}
                    </button>
                  )}

                  {reservation.status ===
                    "checked_in" && (
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void handleCheckOut(
                          reservation
                        )
                      }
                      className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 font-black disabled:opacity-50"
                    >
                      <FaSignOutAlt />

                      {processing
                        ? "İşleniyor..."
                        : "Check-out Yap"}
                    </button>
                  )}
                </article>
              );
            }
          )}
        </section>

        {visibleReservations.length ===
          0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-500">
            Seçilen bölümde rezervasyon
            bulunmuyor.
          </div>
        )}
      </div>

      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() =>
              setSelectedReservation(
                null
              )
            }
            className="absolute inset-0"
          />

          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-slate-950 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  {
                    selectedReservation.reservation_no
                  }
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Konaklama Detayı
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReservation(
                    null
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-7 space-y-4">
              {[
                {
                  label: "Otel",
                  value:
                    firstRelation(
                      selectedReservation.hotel
                    )?.name ??
                    "Belirtilmedi",
                },
                {
                  label: "Oda Tipi",
                  value:
                    firstRelation(
                      selectedReservation.room_type
                    )?.name ??
                    "Belirtilmedi",
                },
                {
                  label: "Oda",
                  value:
                    firstRelation(
                      selectedReservation.room
                    )?.room_number
                      ? `Oda ${
                          firstRelation(
                            selectedReservation.room
                          )
                            ?.room_number
                        }`
                      : "Henüz atanmadı",
                },
                {
                  label: "Durum",
                  value: statusLabel(
                    selectedReservation.status
                  ),
                },
                {
                  label: "Giriş",
                  value: formatDate(
                    selectedReservation.check_in
                  ),
                },
                {
                  label: "Çıkış",
                  value: formatDate(
                    selectedReservation.check_out
                  ),
                },
                {
                  label: "Konaklama",
                  value: `${selectedReservation.nights} gece`,
                },
                {
                  label: "Misafir",
                  value: `${selectedReservation.adults} yetişkin · ${selectedReservation.children} çocuk`,
                },
                {
                  label: "Toplam",
                  value: money(
                    selectedReservation.total_price,
                    selectedReservation.currency
                  ),
                },
                {
                  label: "Bakiye",
                  value: money(
                    selectedReservation.balance,
                    selectedReservation.currency
                  ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white/[0.04] p-4"
                >
                  <p className="text-xs font-bold text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-1 font-black">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {selectedReservation.notes && (
              <div className="mt-4 rounded-2xl bg-white/[0.04] p-4">
                <p className="text-xs font-bold text-slate-500">
                  Notlar
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  {
                    selectedReservation.notes
                  }
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
