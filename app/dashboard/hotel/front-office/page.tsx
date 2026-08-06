"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaArrowRight,
  FaBed,
  FaCalendarAlt,
  FaCheckCircle,
  FaDoorOpen,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaHotel,
  FaMoneyBillWave,
  FaPrint,
  FaSearch,
  FaSignInAlt,
  FaSignOutAlt,
  FaSync,
  FaTimes,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type FrontOfficeStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

type Relation<T> =
  | T
  | T[]
  | null;

type HotelRelation = {
  id: string;
  name: string;
};

type RoomTypeRelation = {
  id: string;
  name: string;
};

type RoomRelation = {
  id: string;
  room_number: string;
  room_status: string;
  housekeeping_status: string;
};

type FrontOfficeReservation = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  room_id: string | null;

  reservation_no: string;
  source: string;
  status: FrontOfficeStatus;

  check_in: string;
  check_out: string;

  adults: number;
  children: number;
  nights: number;

  currency: string;
  total_price: number;
  balance: number;

  notes: string | null;
  created_at: string;

  hotel: Relation<HotelRelation>;
  room_type: Relation<RoomTypeRelation>;
  room: Relation<RoomRelation>;
};

type HotelOption = {
  id: string;
  name: string;
};

type BoardTab =
  | "arrivals"
  | "in_house"
  | "departures"
  | "all";

function firstRelation<T>(
  value: Relation<T>
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function localDate(
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

function formatDate(
  value: string | null
): string {
  if (!value) return "Belirtilmedi";

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function money(
  value: number,
  currency: string
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 2,
    }
  ).format(Number(value || 0));
}

function statusLabel(
  status: FrontOfficeStatus
): string {
  const labels: Record<
    FrontOfficeStatus,
    string
  > = {
    pending: "Bekliyor",
    confirmed: "Onaylandı",
    checked_in: "Konaklıyor",
    checked_out: "Çıkış Yaptı",
    cancelled: "İptal",
    no_show: "No Show",
  };

  return labels[status];
}

function statusClass(
  status: FrontOfficeStatus
): string {
  if (status === "confirmed") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "checked_in") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (status === "checked_out") {
    return "bg-violet-500/15 text-violet-400";
  }

  if (
    status === "cancelled" ||
    status === "no_show"
  ) {
    return "bg-red-500/15 text-red-400";
  }

  return "bg-amber-500/15 text-amber-400";
}

function sourceLabel(
  source: string
): string {
  const labels: Record<string, string> = {
    direct: "Doğrudan",
    website: "Web Sitesi",
    booking: "Booking.com",
    expedia: "Expedia",
    hotelbeds: "Hotelbeds",
    ets: "ETS",
    jolly: "Jolly",
    tatilliyoruz: "Tatilliyoruz",
    manual: "Manuel",
  };

  return labels[source] ?? source;
}

function housekeepingLabel(
  status: string | undefined
): string {
  const labels: Record<string, string> = {
    clean: "Temiz",
    dirty: "Kirli",
    inspected: "Kontrol Edildi",
    cleaning: "Temizleniyor",
    out_of_service: "Servis Dışı",
  };

  return status
    ? labels[status] ?? status
    : "Oda atanmadı";
}

function housekeepingClass(
  status: string | undefined
): string {
  if (
    status === "clean" ||
    status === "inspected"
  ) {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "cleaning") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (
    status === "dirty" ||
    status === "out_of_service"
  ) {
    return "bg-red-500/15 text-red-400";
  }

  return "bg-slate-500/15 text-slate-400";
}

function remainingNights(
  checkOut: string
): number {
  const today = new Date(
    `${localDate()}T00:00:00`
  );

  const departure = new Date(
    `${checkOut}T00:00:00`
  );

  return Math.max(
    0,
    Math.ceil(
      (
        departure.getTime() -
        today.getTime()
      ) / 86400000
    )
  );
}

function getErrorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ??
        "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export default function FrontOfficeProPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [hotels, setHotels] =
    useState<HotelOption[]>([]);

  const [
    reservations,
    setReservations,
  ] = useState<
    FrontOfficeReservation[]
  >([]);

  const [tab, setTab] =
    useState<BoardTab>("arrivals");

  const [hotelFilter, setHotelFilter] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    selectedReservationId,
    setSelectedReservationId,
  ] = useState("");

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

  const today = localDate();

  const loadData = useCallback(
    async (companyId: string) => {
      setErrorMessage("");

      const [
        hotelResult,
        reservationResult,
      ] = await Promise.all([
        supabase
          .from("hotels")
          .select("id, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_reservations")
          .select(`
            id,
            company_id,
            hotel_id,
            room_type_id,
            room_id,
            reservation_no,
            source,
            status,
            check_in,
            check_out,
            adults,
            children,
            nights,
            currency,
            total_price,
            balance,
            notes,
            created_at,

            hotel:hotels (
              id,
              name
            ),

            room_type:hotel_room_types (
              id,
              name
            ),

            room:hotel_rooms (
              id,
              room_number,
              room_status,
              housekeeping_status
            )
          `)
          .eq("company_id", companyId)
          .in("status", [
            "pending",
            "confirmed",
            "checked_in",
            "checked_out",
          ])
          .order("check_in", {
            ascending: true,
          })
          .order("reservation_no", {
            ascending: true,
          })
          .limit(750),
      ]);

      const error =
        hotelResult.error ??
        reservationResult.error;

      if (error) {
        throw error;
      }

      setHotels(
        (hotelResult.data ??
          []) as HotelOption[]
      );

      setReservations(
        (reservationResult.data ??
          []) as unknown as
          FrontOfficeReservation[]
      );
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
          getErrorMessage(error)
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

  const arrivals = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          reservation.check_in ===
            today &&
          [
            "pending",
            "confirmed",
          ].includes(
            reservation.status
          )
      ),
    [reservations, today]
  );

  const inHouse = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          reservation.status ===
          "checked_in"
      ),
    [reservations]
  );

  const departures = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          reservation.check_out ===
            today &&
          reservation.status ===
            "checked_in"
      ),
    [reservations, today]
  );

  const unpaidBalance =
    useMemo(
      () =>
        reservations
          .filter(
            (reservation) =>
              [
                "confirmed",
                "checked_in",
              ].includes(
                reservation.status
              )
          )
          .reduce(
            (total, reservation) =>
              total +
              Number(
                reservation.balance ||
                  0
              ),
            0
          ),
      [reservations]
    );

  const tabReservations =
    useMemo(() => {
      if (tab === "arrivals") {
        return arrivals;
      }

      if (tab === "in_house") {
        return inHouse;
      }

      if (tab === "departures") {
        return departures;
      }

      return reservations.filter(
        (reservation) =>
          ![
            "cancelled",
            "no_show",
          ].includes(
            reservation.status
          )
      );
    }, [
      arrivals,
      departures,
      inHouse,
      reservations,
      tab,
    ]);

  const visibleReservations =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      return tabReservations.filter(
        (reservation) => {
          if (
            hotelFilter &&
            reservation.hotel_id !==
              hotelFilter
          ) {
            return false;
          }

          if (!query) return true;

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
            sourceLabel(
              reservation.source
            ),
            statusLabel(
              reservation.status
            ),
            reservation.notes,
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
      hotelFilter,
      search,
      tabReservations,
    ]);

  const selectedReservation =
    useMemo(
      () =>
        reservations.find(
          (reservation) =>
            reservation.id ===
            selectedReservationId
        ) ?? null,
      [
        reservations,
        selectedReservationId,
      ]
    );

  async function checkIn(
    reservation: FrontOfficeReservation
  ) {
    if (
      !membership ||
      processingId
    ) {
      return;
    }

    const room =
      firstRelation(
        reservation.room
      );

    if (!reservation.room_id || !room) {
      setErrorMessage(
        "Check-in yapmadan önce rezervasyona oda atanmalıdır."
      );

      return;
    }

    if (
      room.housekeeping_status !==
        "clean" &&
      room.housekeeping_status !==
        "inspected"
    ) {
      setErrorMessage(
        `Oda ${room.room_number} henüz hazır değil. Housekeeping durumu: ${housekeepingLabel(
          room.housekeeping_status
        )}.`
      );

      return;
    }

    const approved =
      window.confirm(
        `${reservation.reservation_no} için Oda ${room.room_number} odasına check-in yapılsın mı?`
      );

    if (!approved) return;

    setProcessingId(
      reservation.id
    );
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } =
        await supabase.rpc(
          "hotel_check_in",
          {
            p_reservation_id:
              reservation.id,

            p_company_id:
              membership.company_id,
          }
        );

      if (error) throw error;

      await refresh();

      setSuccessMessage(
        `${reservation.reservation_no} için check-in tamamlandı. Oda ${room.room_number} konaklıyor durumuna geçti.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error)
      );
    } finally {
      setProcessingId("");
    }
  }

  async function checkOut(
    reservation: FrontOfficeReservation
  ) {
    if (
      !membership ||
      processingId
    ) {
      return;
    }

    if (
      Number(
        reservation.balance || 0
      ) > 0
    ) {
      const continueWithBalance =
        window.confirm(
          `Bu rezervasyonda ${money(
            reservation.balance,
            reservation.currency
          )} açık bakiye bulunuyor. Yine de check-out işlemine devam edilsin mi?`
        );

      if (!continueWithBalance) {
        return;
      }
    }

    const approved =
      window.confirm(
        `${reservation.reservation_no} için check-out yapılsın mı? Oda temizlik bekliyor durumuna geçecektir.`
      );

    if (!approved) return;

    setProcessingId(
      reservation.id
    );
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } =
        await supabase.rpc(
          "hotel_check_out",
          {
            p_reservation_id:
              reservation.id,

            p_company_id:
              membership.company_id,
          }
        );

      if (error) throw error;

      await refresh();

      setSuccessMessage(
        `${reservation.reservation_no} için check-out tamamlandı. Oda housekeeping listesine gönderildi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error)
      );
    } finally {
      setProcessingId("");
    }
  }

  function printBoard() {
    window.print();
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Front Office yükleniyor...
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
              Front Office PRO
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Bugünkü girişleri,
              konaklayan misafirleri,
              çıkışları, oda durumlarını
              ve açık bakiyeleri tek
              resepsiyon ekranından
              yönetin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/hotel/rezervasyonlar"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaCalendarAlt />
              Rezervasyonlar
            </Link>

            <Link
              href="/dashboard/hotel/room-planner"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaBed />
              Room Planner
            </Link>

            <button
              type="button"
              onClick={() =>
                void refresh()
              }
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 font-black"
            >
              <FaSync />
              Yenile
            </button>

            <button
              type="button"
              onClick={printBoard}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaPrint />
              Yazdır
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            <FaExclamationTriangle className="mt-1 shrink-0" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            <FaCheckCircle className="mt-1 shrink-0" />
            {successMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Bugün Gelen",
              value: arrivals.length,
              icon: FaSignInAlt,
              className:
                "text-emerald-400",
            },
            {
              label: "Konaklayan",
              value: inHouse.length,
              icon: FaHotel,
              className:
                "text-blue-400",
            },
            {
              label: "Bugün Ayrılacak",
              value: departures.length,
              icon: FaSignOutAlt,
              className:
                "text-violet-400",
            },
            {
              label: "Toplam Kişi",
              value: inHouse.reduce(
                (total, item) =>
                  total +
                  Number(item.adults || 0) +
                  Number(
                    item.children || 0
                  ),
                0
              ),
              icon: FaUsers,
              className:
                "text-orange-400",
            },
            {
              label: "Açık Bakiye",
              value: money(
                unpaidBalance,
                "TRY"
              ),
              icon: FaMoneyBillWave,
              className:
                "text-red-400",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5"
              >
                <Icon
                  className={
                    item.className
                  }
                />

                <p className="mt-4 text-xs text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-3xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-2">
              {[
                {
                  value: "arrivals",
                  label: `Gelenler (${arrivals.length})`,
                  icon: FaSignInAlt,
                },
                {
                  value: "in_house",
                  label: `Konaklayanlar (${inHouse.length})`,
                  icon: FaHotel,
                },
                {
                  value: "departures",
                  label: `Ayrılacaklar (${departures.length})`,
                  icon: FaSignOutAlt,
                },
                {
                  value: "all",
                  label: "Tüm Aktifler",
                  icon: FaUsers,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setTab(
                        item.value as BoardTab
                      )
                    }
                    className={`flex min-h-11 items-center gap-2 rounded-xl px-5 font-black ${
                      tab === item.value
                        ? "bg-orange-500 text-white"
                        : "bg-slate-950 text-slate-400"
                    }`}
                  >
                    <Icon />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1fr)_250px] xl:max-w-3xl">
              <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4">
                <FaSearch className="text-orange-500" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Rezervasyon, otel, oda, kaynak veya not ara"
                  className="w-full bg-transparent font-bold text-slate-950 outline-none"
                />
              </label>

              <select
                value={hotelFilter}
                onChange={(event) =>
                  setHotelFilter(
                    event.target.value
                  )
                }
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
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full">
              <thead className="bg-slate-950">
                <tr className="text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>
                  <th className="px-5 py-4">
                    Otel / Oda
                  </th>
                  <th className="px-5 py-4">
                    Tarihler
                  </th>
                  <th className="px-5 py-4">
                    Misafir
                  </th>
                  <th className="px-5 py-4">
                    Kaynak
                  </th>
                  <th className="px-5 py-4">
                    Oda Durumu
                  </th>
                  <th className="px-5 py-4">
                    Bakiye
                  </th>
                  <th className="px-5 py-4">
                    Durum
                  </th>
                  <th className="px-5 py-4 text-right">
                    İşlem
                  </th>
                </tr>
              </thead>

              <tbody>
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
                      <tr
                        key={reservation.id}
                        className="border-t border-white/10 transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReservationId(
                                reservation.id
                              )
                            }
                            className="text-left"
                          >
                            <p className="font-black text-orange-400">
                              {
                                reservation.reservation_no
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Detayı aç
                            </p>
                          </button>
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-black">
                            {hotel?.name ??
                              "Otel"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {room
                              ? `Oda ${room.room_number}`
                              : "Oda atanmadı"}
                            {" · "}
                            {roomType?.name ??
                              "Oda tipi"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-black">
                            {formatDate(
                              reservation.check_in
                            )}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(
                              reservation.check_out
                            )}
                            {" · "}
                            {reservation.nights} gece
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-black">
                            {
                              reservation.adults
                            }{" "}
                            yetişkin
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {
                              reservation.children
                            }{" "}
                            çocuk
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-black text-slate-300">
                            {sourceLabel(
                              reservation.source
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-black ${housekeepingClass(
                              room?.housekeeping_status
                            )}`}
                          >
                            {housekeepingLabel(
                              room?.housekeeping_status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <p
                            className={`font-black ${
                              Number(
                                reservation.balance
                              ) > 0
                                ? "text-red-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {money(
                              reservation.balance,
                              reservation.currency
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Toplam{" "}
                            {money(
                              reservation.total_price,
                              reservation.currency
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClass(
                              reservation.status
                            )}`}
                          >
                            {statusLabel(
                              reservation.status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex justify-end gap-2">
                            {[
                              "pending",
                              "confirmed",
                            ].includes(
                              reservation.status
                            ) && (
                              <button
                                type="button"
                                disabled={
                                  processing
                                }
                                onClick={() =>
                                  void checkIn(
                                    reservation
                                  )
                                }
                                className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black disabled:opacity-40"
                              >
                                <FaSignInAlt />

                                {processing
                                  ? "İşleniyor..."
                                  : "Check-in"}
                              </button>
                            )}

                            {reservation.status ===
                              "checked_in" && (
                              <button
                                type="button"
                                disabled={
                                  processing
                                }
                                onClick={() =>
                                  void checkOut(
                                    reservation
                                  )
                                }
                                className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-black disabled:opacity-40"
                              >
                                <FaSignOutAlt />

                                {processing
                                  ? "İşleniyor..."
                                  : "Check-out"}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedReservationId(
                                  reservation.id
                                )
                              }
                              className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 font-black"
                            >
                              <FaArrowRight />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {visibleReservations.length ===
            0 && (
            <div className="p-14 text-center">
              <FaDoorOpen className="mx-auto text-5xl text-slate-700" />

              <h3 className="mt-5 text-xl font-black">
                Kayıt bulunamadı
              </h3>

              <p className="mt-2 text-slate-500">
                Seçilen tarih, otel ve
                filtrelerde gösterilecek
                rezervasyon bulunmuyor.
              </p>
            </div>
          )}
        </section>
      </div>

      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() =>
              setSelectedReservationId("")
            }
            className="absolute inset-0"
          />

          <aside className="relative z-10 h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  REZERVASYON DETAYI
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {
                    selectedReservation.reservation_no
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReservationId(
                    ""
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {(() => {
                const hotel =
                  firstRelation(
                    selectedReservation.hotel
                  );

                const roomType =
                  firstRelation(
                    selectedReservation.room_type
                  );

                const room =
                  firstRelation(
                    selectedReservation.room
                  );

                return [
                  {
                    label: "Otel",
                    value:
                      hotel?.name ??
                      "Belirtilmedi",
                    icon: FaHotel,
                  },
                  {
                    label: "Oda",
                    value: room
                      ? `Oda ${room.room_number}`
                      : "Oda atanmadı",
                    icon: FaBed,
                  },
                  {
                    label: "Oda Tipi",
                    value:
                      roomType?.name ??
                      "Belirtilmedi",
                    icon: FaDoorOpen,
                  },
                  {
                    label: "Durum",
                    value: statusLabel(
                      selectedReservation.status
                    ),
                    icon: FaCheckCircle,
                  },
                  {
                    label: "Giriş",
                    value: formatDate(
                      selectedReservation.check_in
                    ),
                    icon: FaSignInAlt,
                  },
                  {
                    label: "Çıkış",
                    value: formatDate(
                      selectedReservation.check_out
                    ),
                    icon: FaSignOutAlt,
                  },
                  {
                    label:
                      "Kalan Gece",
                    value:
                      selectedReservation.status ===
                      "checked_in"
                        ? String(
                            remainingNights(
                              selectedReservation.check_out
                            )
                          )
                        : String(
                            selectedReservation.nights
                          ),
                    icon: FaCalendarAlt,
                  },
                  {
                    label: "Kişi",
                    value: `${selectedReservation.adults} yetişkin · ${selectedReservation.children} çocuk`,
                    icon: FaUsers,
                  },
                  {
                    label: "Toplam",
                    value: money(
                      selectedReservation.total_price,
                      selectedReservation.currency
                    ),
                    icon:
                      FaMoneyBillWave,
                  },
                  {
                    label: "Bakiye",
                    value: money(
                      selectedReservation.balance,
                      selectedReservation.currency
                    ),
                    icon:
                      FaFileInvoiceDollar,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                    >
                      <p className="flex items-center gap-2 text-xs text-slate-500">
                        <Icon className="text-orange-400" />
                        {item.label}
                      </p>

                      <p className="mt-2 font-black">
                        {item.value}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>

            {selectedReservation.notes && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <h3 className="font-black">
                  Operasyon Notları
                </h3>

                <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-400">
                  {
                    selectedReservation.notes
                  }
                </p>
              </section>
            )}

            <section className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/dashboard/hotel/rezervasyonlar`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
              >
                <FaCalendarAlt />
                Rezervasyonu Aç
              </Link>

              <Link
                href="/dashboard/hotel/folio"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 font-black"
              >
                <FaFileInvoiceDollar />
                Folio ve Ödemeler
              </Link>

              <Link
                href="/dashboard/hotel/misafirler"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 font-black"
              >
                <FaUser />
                Misafir Merkezi
              </Link>

              <Link
                href="/dashboard/hotel/housekeeping"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 font-black"
              >
                <FaBed />
                Housekeeping
              </Link>
            </section>

            {[
              "pending",
              "confirmed",
            ].includes(
              selectedReservation.status
            ) && (
              <button
                type="button"
                disabled={
                  Boolean(processingId)
                }
                onClick={() =>
                  void checkIn(
                    selectedReservation
                  )
                }
                className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 font-black disabled:opacity-40"
              >
                <FaSignInAlt />
                Check-in İşlemini Tamamla
              </button>
            )}

            {selectedReservation.status ===
              "checked_in" && (
              <button
                type="button"
                disabled={
                  Boolean(processingId)
                }
                onClick={() =>
                  void checkOut(
                    selectedReservation
                  )
                }
                className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-violet-500 font-black disabled:opacity-40"
              >
                <FaSignOutAlt />
                Check-out İşlemini Tamamla
              </button>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
