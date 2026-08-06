"use client";

import {
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBed,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaHotel,
  FaMagic,
  FaSearch,
  FaTimes,
  FaUnlink,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  assignReservationToRoom,
  autoAssignReservations,
  getRoomPlannerData,
  PlannerHotel,
  PlannerReservation,
  PlannerRoom,
  PlannerRoomType,
  unassignReservationRoom,
} from "@/lib/hotel/room-planner/room-planner-service";

type ViewDays = 7 | 14 | 30;

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

function createDateRange(
  startDate: string,
  days: number
): string[] {
  return Array.from(
    {
      length: days,
    },
    (_, index) =>
      addDays(startDate, index)
  );
}

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function reservationCoversDate(
  reservation: PlannerReservation,
  date: string
): boolean {
  return (
    reservation.check_in <= date &&
    reservation.check_out > date
  );
}

function reservationStartsOnDate(
  reservation: PlannerReservation,
  date: string
): boolean {
  return reservation.check_in === date;
}

function formatDate(
  value: string
): string {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

function formatLongDate(
  value: string
): string {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function money(
  value: number,
  currency: string
): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function reservationClasses(
  status: PlannerReservation["status"]
): string {
  switch (status) {
    case "checked_in":
      return "border-blue-400/40 bg-blue-500/20 text-blue-100";

    case "confirmed":
      return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";

    case "pending":
      return "border-amber-400/40 bg-amber-500/20 text-amber-100";

    default:
      return "border-slate-400/40 bg-slate-500/20 text-slate-100";
  }
}

function housekeepingClasses(
  status: string
): string {
  switch (status) {
    case "clean":
      return "bg-emerald-500/15 text-emerald-400";

    case "dirty":
      return "bg-amber-500/15 text-amber-400";

    case "inspected":
      return "bg-blue-500/15 text-blue-400";

    default:
      return "bg-slate-500/15 text-slate-400";
  }
}

function roomStatusLabel(
  status: string
): string {
  const labels: Record<string, string> = {
    available: "Müsait",
    occupied: "Dolu",
    maintenance: "Bakımda",
    out_of_order: "Kullanım Dışı",
    blocked: "Bloke",
  };

  return labels[status] ?? status;
}

function housekeepingLabel(
  status: string
): string {
  const labels: Record<string, string> = {
    clean: "Temiz",
    dirty: "Kirli",
    inspected: "Kontrol Edildi",
    cleaning: "Temizleniyor",
    dnd: "Rahatsız Etmeyin",
  };

  return labels[status] ?? status;
}

export default function HotelRoomPlannerPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [hotels, setHotels] =
    useState<PlannerHotel[]>([]);

  const [roomTypes, setRoomTypes] =
    useState<PlannerRoomType[]>([]);

  const [rooms, setRooms] =
    useState<PlannerRoom[]>([]);

  const [
    reservations,
    setReservations,
  ] = useState<PlannerReservation[]>([]);

  const [startDate, setStartDate] =
    useState(localDateText());

  const [viewDays, setViewDays] =
    useState<ViewDays>(14);

  const [hotelFilter, setHotelFilter] =
    useState("");

  const [
    roomTypeFilter,
    setRoomTypeFilter,
  ] = useState("");

  const [
    housekeepingFilter,
    setHousekeepingFilter,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    selectedReservation,
    setSelectedReservation,
  ] =
    useState<PlannerReservation | null>(
      null
    );

  const [
    draggedReservationId,
    setDraggedReservationId,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    autoAssigning,
    setAutoAssigning,
  ] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const endDate = useMemo(
    () => addDays(startDate, viewDays),
    [startDate, viewDays]
  );

  const dates = useMemo(
    () =>
      createDateRange(
        startDate,
        viewDays
      ),
    [startDate, viewDays]
  );

  const loadData = useCallback(
    async (
      companyId: string,
      fromDate: string,
      toDate: string
    ) => {
      const data =
        await getRoomPlannerData(
          companyId,
          fromDate,
          toDate
        );

      setHotels(data.hotels);
      setRoomTypes(data.roomTypes);
      setRooms(data.rooms);
      setReservations(
        data.reservations
      );
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

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
          currentMembership.company_id,
          startDate,
          endDate
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Room Planner yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  useEffect(() => {
    if (!membership) return;

    async function reload() {
      try {
        setLoading(true);
        setErrorMessage("");

        await loadData(
          membership!.company_id,
          startDate,
          endDate
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Room Planner yenilenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void reload();
  }, [
    endDate,
    loadData,
    membership,
    startDate,
  ]);

  const filteredRoomTypes =
    useMemo(
      () =>
        roomTypes.filter(
          (roomType) =>
            !hotelFilter ||
            roomType.hotel_id ===
              hotelFilter
        ),
      [hotelFilter, roomTypes]
    );

  const filteredRooms = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return rooms.filter((room) => {
      if (
        hotelFilter &&
        room.hotel_id !== hotelFilter
      ) {
        return false;
      }

      if (
        roomTypeFilter &&
        room.room_type_id !==
          roomTypeFilter
      ) {
        return false;
      }

      if (
        housekeepingFilter &&
        room.housekeeping_status !==
          housekeepingFilter
      ) {
        return false;
      }

      if (!query) return true;

      const roomType = firstRelation(
        room.room_type
      );

      return [
        room.room_number,
        room.floor_number,
        roomType?.name,
        room.room_status,
        room.housekeeping_status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(query)
        );
    });
  }, [
    hotelFilter,
    housekeepingFilter,
    roomTypeFilter,
    rooms,
    search,
  ]);

  const visibleReservations =
    useMemo(
      () =>
        reservations.filter(
          (reservation) => {
            if (
              hotelFilter &&
              reservation.hotel_id !==
                hotelFilter
            ) {
              return false;
            }

            if (
              roomTypeFilter &&
              reservation.room_type_id !==
                roomTypeFilter
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        hotelFilter,
        reservations,
        roomTypeFilter,
      ]
    );

  const unassignedReservations =
    useMemo(
      () =>
        visibleReservations.filter(
          (reservation) =>
            !reservation.room_id
        ),
      [visibleReservations]
    );

  const today = localDateText();

  const stats = useMemo(
    () => ({
      totalRooms:
        filteredRooms.length,

      assigned:
        visibleReservations.filter(
          (reservation) =>
            Boolean(
              reservation.room_id
            )
        ).length,

      unassigned:
        unassignedReservations.length,

      arrivals:
        visibleReservations.filter(
          (reservation) =>
            reservation.check_in ===
            today
        ).length,

      departures:
        visibleReservations.filter(
          (reservation) =>
            reservation.check_out ===
            today
        ).length,

      occupied:
        visibleReservations.filter(
          (reservation) =>
            reservation.status ===
            "checked_in"
        ).length,
    }),
    [
      filteredRooms.length,
      today,
      unassignedReservations.length,
      visibleReservations,
    ]
  );

  async function refreshPlanner() {
    if (!membership) return;

    await loadData(
      membership.company_id,
      startDate,
      endDate
    );
  }

  function handleDragStart(
    event: DragEvent,
    reservationId: string
  ) {
    setDraggedReservationId(
      reservationId
    );

    event.dataTransfer.setData(
      "text/reservation-id",
      reservationId
    );

    event.dataTransfer.effectAllowed =
      "move";
  }

  async function handleDrop(
    event: DragEvent,
    room: PlannerRoom
  ) {
    event.preventDefault();

    if (!membership || saving) return;

    const reservationId =
      event.dataTransfer.getData(
        "text/reservation-id"
      ) || draggedReservationId;

    const reservation =
      reservations.find(
        (item) =>
          item.id === reservationId
      );

    if (!reservation) {
      setErrorMessage(
        "Sürüklenen rezervasyon bulunamadı."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await assignReservationToRoom(
        membership.company_id,
        reservation,
        room
      );

      await refreshPlanner();

      setSuccessMessage(
        `${reservation.reservation_no} numaralı rezervasyon Oda ${room.room_number} odasına atandı.`
      );

      setSelectedReservation(
        null
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Oda ataması yapılamadı."
      );
    } finally {
      setSaving(false);
      setDraggedReservationId("");
    }
  }

  async function handleUnassign(
    reservation: PlannerReservation
  ) {
    if (!membership || saving) return;

    const approved = window.confirm(
      `${reservation.reservation_no} numaralı rezervasyonun oda ataması kaldırılsın mı?`
    );

    if (!approved) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await unassignReservationRoom(
        membership.company_id,
        reservation.id
      );

      await refreshPlanner();

      setSuccessMessage(
        "Oda ataması kaldırıldı."
      );

      setSelectedReservation(
        null
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Oda ataması kaldırılamadı."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoAssign() {
    if (
      !membership ||
      autoAssigning
    ) {
      return;
    }

    if (
      unassignedReservations.length === 0
    ) {
      setErrorMessage(
        "Seçili tarih ve filtrelerde atanmamış rezervasyon bulunmuyor. Rezervasyonun room_id alanı dolu olabilir veya rezervasyon mevcut takvim aralığının dışında kalıyor olabilir."
      );
      setSuccessMessage("");
      return;
    }

    if (filteredRooms.length === 0) {
      setErrorMessage(
        "Otomatik atama için uygun fiziksel oda bulunmuyor. Önce seçili otel ve oda tipi için oda kaydı oluşturun veya filtreleri temizleyin."
      );
      setSuccessMessage("");
      return;
    }

    const approved = window.confirm(
      `${unassignedReservations.length} atanmamış rezervasyon için otomatik oda ataması yapılsın mı?`
    );

    if (!approved) return;

    setAutoAssigning(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result =
        await autoAssignReservations(
          membership.company_id,
          unassignedReservations,
          filteredRooms
        );

      await refreshPlanner();

      if (
        result.failed.length === 0
      ) {
        setSuccessMessage(
          `${result.assigned} rezervasyon başarıyla odalara atandı.`
        );
      } else {
        setSuccessMessage(
          `${result.assigned} rezervasyon atandı. ${result.failed.length} rezervasyon için uygun oda bulunamadı.`
        );

        setErrorMessage(
          result.failed
            .map(
              (item) =>
                `${item.reservationNo}: ${item.reason}`
            )
            .join(" | ")
        );
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Otomatik oda ataması yapılamadı."
      );
    } finally {
      setAutoAssigning(false);
    }
  }

  if (loading && !membership) {
    return (
      <main className="p-10 text-white">
        Room Planner yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-[1900px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROS HOTEL PMS
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Room Planner
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Rezervasyonları oda takviminde
              görüntüleyin, sürükle-bırak ile
              fiziksel odalara atayın ve
              operasyonu tek ekrandan yönetin.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleAutoAssign()
            }
            disabled={autoAssigning}
            className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
          >
            <FaMagic />

            {autoAssigning
              ? "Odalar Atanıyor..."
              : `Otomatik Ata (${unassignedReservations.length})`}
          </button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            {
              label: "Toplam Oda",
              value: stats.totalRooms,
              icon: FaBed,
            },
            {
              label: "Atanmış",
              value: stats.assigned,
              icon: FaCheckCircle,
            },
            {
              label: "Atanmamış",
              value: stats.unassigned,
              icon: FaClock,
            },
            {
              label: "Bugün Giriş",
              value: stats.arrivals,
              icon: FaUsers,
            },
            {
              label: "Bugün Çıkış",
              value: stats.departures,
              icon: FaCalendarAlt,
            },
            {
              label: "Konaklayan",
              value: stats.occupied,
              icon: FaHotel,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5"
              >
                <Icon className="text-orange-400" />

                <p className="mt-4 text-xs font-bold text-slate-500">
                  {item.label}
                </p>

                <p className="mt-1 text-3xl font-black">
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

        <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 xl:col-span-2">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Oda, kat veya oda tipi ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <select
              value={hotelFilter}
              onChange={(event) => {
                setHotelFilter(
                  event.target.value
                );
                setRoomTypeFilter("");
              }}
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Tüm oteller
              </option>

              {hotels.map((hotel) => (
                <option
                  key={hotel.id}
                  value={hotel.id}
                >
                  {hotel.name}
                </option>
              ))}
            </select>

            <select
              value={roomTypeFilter}
              onChange={(event) =>
                setRoomTypeFilter(
                  event.target.value
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Tüm oda tipleri
              </option>

              {filteredRoomTypes.map(
                (roomType) => (
                  <option
                    key={roomType.id}
                    value={roomType.id}
                  >
                    {roomType.name}
                  </option>
                )
              )}
            </select>

            <select
              value={
                housekeepingFilter
              }
              onChange={(event) =>
                setHousekeepingFilter(
                  event.target.value
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Tüm temizlik durumları
              </option>
              <option value="clean">
                Temiz
              </option>
              <option value="dirty">
                Kirli
              </option>
              <option value="inspected">
                Kontrol Edildi
              </option>
              <option value="cleaning">
                Temizleniyor
              </option>
            </select>

            <select
              value={viewDays}
              onChange={(event) =>
                setViewDays(
                  Number(
                    event.target.value
                  ) as ViewDays
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value={7}>
                7 Gün
              </option>
              <option value={14}>
                14 Gün
              </option>
              <option value={30}>
                30 Gün
              </option>
            </select>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setStartDate(
                    addDays(
                      startDate,
                      -viewDays
                    )
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950"
              >
                <FaArrowLeft />
              </button>

              <button
                type="button"
                onClick={() =>
                  setStartDate(
                    localDateText()
                  )
                }
                className="min-h-11 rounded-xl bg-orange-500 px-5 font-black"
              >
                Bugün
              </button>

              <button
                type="button"
                onClick={() =>
                  setStartDate(
                    addDays(
                      startDate,
                      viewDays
                    )
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950"
              >
                <FaArrowRight />
              </button>
            </div>

            <p className="font-black">
              {formatLongDate(startDate)}
              {" – "}
              {formatLongDate(
                addDays(endDate, -1)
              )}
            </p>
          </div>
        </section>

        {unassignedReservations.length >
          0 && (
          <section className="mt-7 rounded-[30px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
            <div>
              <h2 className="text-xl font-black text-amber-300">
                Atanmamış Rezervasyonlar
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Kartları sürükleyip uygun
                oda satırına bırakabilirsin.
              </p>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {unassignedReservations.map(
                (reservation) => {
                  const roomType =
                    firstRelation(
                      reservation.room_type
                    );

                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      draggable
                      onDragStart={(
                        event
                      ) =>
                        handleDragStart(
                          event,
                          reservation.id
                        )
                      }
                      onClick={() =>
                        setSelectedReservation(
                          reservation
                        )
                      }
                      className={`min-w-[250px] cursor-grab rounded-2xl border p-4 text-left active:cursor-grabbing ${reservationClasses(
                        reservation.status
                      )}`}
                    >
                      <p className="text-xs font-black">
                        {
                          reservation.reservation_no
                        }
                      </p>

                      <p className="mt-2 font-black">
                        {roomType?.name ??
                          "Oda tipi"}
                      </p>

                      <p className="mt-2 text-xs opacity-80">
                        {formatDate(
                          reservation.check_in
                        )}{" "}
                        –{" "}
                        {formatDate(
                          reservation.check_out
                        )}
                      </p>

                      <p className="mt-1 text-xs opacity-80">
                        {reservation.adults}{" "}
                        yetişkin ·{" "}
                        {
                          reservation.children
                        }{" "}
                        çocuk
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

        <section className="mt-7 overflow-hidden rounded-[30px] border border-white/10 bg-slate-900">
          <div className="overflow-x-auto">
            <div
              className="min-w-max"
              style={{
                gridTemplateColumns: `220px repeat(${viewDays}, minmax(95px, 1fr))`,
              }}
            >
              <div
                className="grid border-b border-white/10 bg-slate-950"
                style={{
                  gridTemplateColumns: `220px repeat(${viewDays}, 95px)`,
                }}
              >
                <div className="sticky left-0 z-20 flex min-h-20 items-center border-r border-white/10 bg-slate-950 px-5 font-black">
                  Odalar
                </div>

                {dates.map((date) => {
                  const isToday =
                    date === today;

                  return (
                    <div
                      key={date}
                      className={`flex min-h-20 flex-col items-center justify-center border-r border-white/10 px-2 text-center ${
                        isToday
                          ? "bg-orange-500/15"
                          : ""
                      }`}
                    >
                      <span className="text-xs font-bold uppercase text-slate-500">
                        {new Date(
                          `${date}T00:00:00`
                        ).toLocaleDateString(
                          "tr-TR",
                          {
                            weekday:
                              "short",
                          }
                        )}
                      </span>

                      <span
                        className={`mt-1 text-sm font-black ${
                          isToday
                            ? "text-orange-400"
                            : ""
                        }`}
                      >
                        {formatDate(date)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {filteredRooms.map(
                (room) => {
                  const roomType =
                    firstRelation(
                      room.room_type
                    );

                  const roomReservations =
                    visibleReservations.filter(
                      (reservation) =>
                        reservation.room_id ===
                        room.id
                    );

                  return (
                    <div
                      key={room.id}
                      className="grid border-b border-white/10 last:border-b-0"
                      style={{
                        gridTemplateColumns: `220px repeat(${viewDays}, 95px)`,
                      }}
                    >
                      <div className="sticky left-0 z-10 min-h-24 border-r border-white/10 bg-slate-900 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-black">
                              Oda{" "}
                              {
                                room.room_number
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {roomType?.name ??
                                "Oda tipi"}
                              {room.floor_number
                                ? ` · Kat ${room.floor_number}`
                                : ""}
                            </p>
                          </div>

                          <FaBed className="text-orange-400" />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${housekeepingClasses(
                              room.housekeeping_status
                            )}`}
                          >
                            {housekeepingLabel(
                              room.housekeeping_status
                            )}
                          </span>

                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black text-slate-400">
                            {roomStatusLabel(
                              room.room_status
                            )}
                          </span>
                        </div>
                      </div>

                      {dates.map((date) => {
                        const reservation =
                          roomReservations.find(
                            (item) =>
                              reservationCoversDate(
                                item,
                                date
                              )
                          );

                        const startsHere =
                          reservation
                            ? reservationStartsOnDate(
                                reservation,
                                date
                              )
                            : false;

                        return (
                          <div
                            key={`${room.id}-${date}`}
                            onDragOver={(
                              event
                            ) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect =
                                "move";
                            }}
                            onDrop={(event) =>
                              void handleDrop(
                                event,
                                room
                              )
                            }
                            className={`relative min-h-24 border-r border-white/10 p-1 transition ${
                              date === today
                                ? "bg-orange-500/[0.04]"
                                : ""
                            } ${
                              room.room_status ===
                                "maintenance" ||
                              room.room_status ===
                                "out_of_order"
                                ? "bg-red-500/[0.05]"
                                : "hover:bg-white/[0.04]"
                            }`}
                          >
                            {reservation &&
                              startsHere && (
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(
                                    event
                                  ) =>
                                    handleDragStart(
                                      event,
                                      reservation.id
                                    )
                                  }
                                  onClick={() =>
                                    setSelectedReservation(
                                      reservation
                                    )
                                  }
                                  className={`absolute inset-x-1 top-2 z-[5] min-h-[76px] cursor-grab overflow-hidden rounded-xl border p-2 text-left active:cursor-grabbing ${reservationClasses(
                                    reservation.status
                                  )}`}
                                  style={{
                                    width: `calc(${Math.min(
                                      Math.max(
                                        1,
                                        Math.ceil(
                                          (new Date(
                                            `${reservation.check_out}T00:00:00`
                                          ).getTime() -
                                            new Date(
                                              `${reservation.check_in}T00:00:00`
                                            ).getTime()) /
                                            86400000
                                        ),
                                        1
                                      ),
                                      viewDays
                                    )} * 95px - 8px)`,
                                  }}
                                >
                                  <p className="truncate text-[10px] font-black">
                                    {
                                      reservation.reservation_no
                                    }
                                  </p>

                                  <p className="mt-1 truncate text-xs font-black">
                                    {
                                      reservation.adults
                                    }{" "}
                                    Yetişkin
                                  </p>

                                  <p className="mt-1 truncate text-[10px] opacity-75">
                                    {formatDate(
                                      reservation.check_in
                                    )}
                                    {" – "}
                                    {formatDate(
                                      reservation.check_out
                                    )}
                                  </p>
                                </button>
                              )}

                            {!reservation &&
                              room.room_status !==
                                "maintenance" &&
                              room.room_status !==
                                "out_of_order" && (
                                <div className="flex h-full min-h-20 items-center justify-center opacity-0 transition hover:opacity-100">
                                  <span className="text-[10px] font-bold text-slate-600">
                                    Buraya bırak
                                  </span>
                                </div>
                              )}

                            {(room.room_status ===
                              "maintenance" ||
                              room.room_status ===
                                "out_of_order") && (
                              <div className="flex min-h-20 items-center justify-center text-center text-[10px] font-black text-red-400">
                                Kullanılamaz
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {filteredRooms.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              Filtrelere uygun oda
              bulunamadı.
            </div>
          )}
        </section>
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

          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  {
                    selectedReservation.reservation_no
                  }
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Rezervasyon Detayı
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
                          )?.room_number
                        }`
                      : "Henüz atanmadı",
                },
                {
                  label: "Konaklama",
                  value: `${formatLongDate(
                    selectedReservation.check_in
                  )} – ${formatLongDate(
                    selectedReservation.check_out
                  )}`,
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
                {
                  label: "Kaynak",
                  value:
                    selectedReservation.source,
                },
                {
                  label: "Durum",
                  value:
                    selectedReservation.status,
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

            {selectedReservation.room_id && (
              <button
                type="button"
                onClick={() =>
                  void handleUnassign(
                    selectedReservation
                  )
                }
                disabled={saving}
                className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-red-500/15 font-black text-red-400 disabled:opacity-50"
              >
                <FaUnlink />
                Oda Atamasını Kaldır
              </button>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
