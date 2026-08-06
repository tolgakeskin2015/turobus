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
  FaBell,
  FaBroom,
  FaCalendarCheck,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaExclamationTriangle,
  FaHotel,
  FaMoneyBillWave,
  FaPercent,
  FaSignInAlt,
  FaSignOutAlt,
  FaSyncAlt,
  FaTools,
  FaUserFriends,
  FaWallet,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

type ReservationRow = {
  id: string;
  hotel_id: string;
  room_type_id: string;
  room_id: string | null;
  reservation_no: string;
  source: string;
  status: ReservationStatus;
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
};

type HotelRow = {
  id: string;
  name: string;
};

type RoomTypeRow = {
  id: string;
  hotel_id: string;
  name: string;
};

type RoomRow = {
  id: string;
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  room_status: string;
  housekeeping_status: string;
};

type DashboardData = {
  reservations: ReservationRow[];
  hotels: HotelRow[];
  roomTypes: RoomTypeRow[];
  rooms: RoomRow[];
};

const statusLabels: Record<
  ReservationStatus,
  string
> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  checked_in: "Konaklıyor",
  checked_out: "Çıkış Yaptı",
  cancelled: "İptal",
  no_show: "No Show",
};

const sourceLabels: Record<string, string> = {
  direct: "Doğrudan",
  website: "Web Sitesi",
  booking: "Booking.com",
  expedia: "Expedia",
  hotelbeds: "Hotelbeds",
  ets: "ETS",
  jolly: "Jolly",
  tatilliyoruz: "Tatilliyoruz",
  manual: "Manuel",
  walk_in: "Walk-in",
};

function localDate(
  input: Date = new Date()
): string {
  const year = input.getFullYear();

  const month = String(
    input.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    input.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthStart(): string {
  const date = new Date();

  date.setDate(1);

  return localDate(date);
}

function addDays(
  dateText: string,
  count: number
): string {
  const date = new Date(
    `${dateText}T00:00:00`
  );

  date.setDate(
    date.getDate() + count
  );

  return localDate(date);
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
      month: "2-digit",
      year: "numeric",
    }
  );
}

function formatDateTime(
  value: string
): string {
  return new Date(
    value
  ).toLocaleString(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function money(
  value: number,
  currency = "TRY"
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(Number(value || 0));
}

function statusClass(
  status: ReservationStatus
): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/15 text-emerald-400";

    case "checked_in":
      return "bg-blue-500/15 text-blue-400";

    case "checked_out":
      return "bg-violet-500/15 text-violet-400";

    case "cancelled":
    case "no_show":
      return "bg-red-500/15 text-red-400";

    default:
      return "bg-amber-500/15 text-amber-400";
  }
}

function housekeepingLabel(
  status: string
): string {
  const labels: Record<string, string> = {
    clean: "Temiz",
    dirty: "Kirli",
    inspected: "Kontrol Edildi",
    cleaning: "Temizleniyor",
    inspection: "Kontrol Bekliyor",
    out_of_service: "Hizmet Dışı",
  };

  return labels[status] ?? status;
}

function roomStatusLabel(
  status: string
): string {
  const labels: Record<string, string> = {
    available: "Müsait",
    occupied: "Dolu",
    reserved: "Rezerve",
    maintenance: "Bakımda",
    out_of_order: "Arızalı",
    blocked: "Bloke",
  };

  return labels[status] ?? status;
}

export default function HotelManagementCenterPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [data, setData] =
    useState<DashboardData>({
      reservations: [],
      hotels: [],
      roomTypes: [],
      rooms: [],
    });

  const [
    selectedHotelId,
    setSelectedHotelId,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadData = useCallback(
    async (
      companyId: string,
      showRefreshing = false
    ) => {
      if (showRefreshing) {
        setRefreshing(true);
      }

      setErrorMessage("");

      try {
        const today = localDate();
        const rangeStart =
          addDays(today, -31);
        const rangeEnd =
          addDays(today, 31);

        const [
          reservationResult,
          hotelResult,
          roomTypeResult,
          roomResult,
        ] = await Promise.all([
          supabase
            .from("hotel_reservations")
            .select(`
              id,
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
              created_at
            `)
            .eq("company_id", companyId)
            .is("deleted_at", null)
            .gte("check_out", rangeStart)
            .lte("check_in", rangeEnd)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("hotels")
            .select("id, name")
            .eq("company_id", companyId)
            .eq("is_active", true)
            .order("name"),

          supabase
            .from("hotel_room_types")
            .select(
              "id, hotel_id, name"
            )
            .eq("company_id", companyId)
            .order("name"),

          supabase
            .from("hotel_rooms")
            .select(`
              id,
              hotel_id,
              room_type_id,
              room_number,
              room_status,
              housekeeping_status
            `)
            .eq("company_id", companyId)
            .order("room_number"),
        ]);

        const error =
          reservationResult.error ??
          hotelResult.error ??
          roomTypeResult.error ??
          roomResult.error;

        if (error) {
          throw error;
        }

        const nextData: DashboardData = {
          reservations:
            (reservationResult.data ??
              []) as ReservationRow[],

          hotels:
            (hotelResult.data ??
              []) as HotelRow[],

          roomTypes:
            (roomTypeResult.data ??
              []) as RoomTypeRow[],

          rooms:
            (roomResult.data ??
              []) as RoomRow[],
        };

        setData(nextData);

        setSelectedHotelId(
          (current) => {
            if (
              current &&
              nextData.hotels.some(
                (hotel) =>
                  hotel.id === current
              )
            ) {
              return current;
            }

            return "";
          }
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Yönetim merkezi yüklenemedi."
        );
      } finally {
        if (showRefreshing) {
          setRefreshing(false);
        }
      }
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
            : "Yönetim merkezi başlatılamadı."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const filteredData = useMemo(() => {
    if (!selectedHotelId) {
      return data;
    }

    return {
      hotels: data.hotels,

      roomTypes:
        data.roomTypes.filter(
          (item) =>
            item.hotel_id ===
            selectedHotelId
        ),

      rooms:
        data.rooms.filter(
          (item) =>
            item.hotel_id ===
            selectedHotelId
        ),

      reservations:
        data.reservations.filter(
          (item) =>
            item.hotel_id ===
            selectedHotelId
        ),
    };
  }, [data, selectedHotelId]);

  const hotelMap = useMemo(
    () =>
      new Map(
        data.hotels.map(
          (hotel) => [
            hotel.id,
            hotel.name,
          ]
        )
      ),
    [data.hotels]
  );

  const roomTypeMap = useMemo(
    () =>
      new Map(
        data.roomTypes.map(
          (roomType) => [
            roomType.id,
            roomType.name,
          ]
        )
      ),
    [data.roomTypes]
  );

  const roomMap = useMemo(
    () =>
      new Map(
        data.rooms.map((room) => [
          room.id,
          room,
        ])
      ),
    [data.rooms]
  );

  const dashboard = useMemo(() => {
    const today = localDate();
    const currentMonthStart =
      monthStart();

    const activeReservations =
      filteredData.reservations.filter(
        (reservation) =>
          ![
            "cancelled",
            "no_show",
          ].includes(
            reservation.status
          )
      );

    const arrivals =
      activeReservations.filter(
        (reservation) =>
          reservation.check_in ===
            today &&
          reservation.status !==
            "checked_out"
      );

    const departures =
      activeReservations.filter(
        (reservation) =>
          reservation.check_out ===
            today &&
          [
            "confirmed",
            "checked_in",
            "checked_out",
          ].includes(
            reservation.status
          )
      );

    const inHouse =
      activeReservations.filter(
        (reservation) =>
          reservation.status ===
          "checked_in"
      );

    const totalRooms =
      filteredData.rooms.length;

    const occupiedRoomIds =
      new Set(
        inHouse
          .map(
            (reservation) =>
              reservation.room_id
          )
          .filter(
            (
              roomId
            ): roomId is string =>
              Boolean(roomId)
          )
      );

    const occupiedRooms =
      occupiedRoomIds.size;

    const availableRooms =
      filteredData.rooms.filter(
        (room) =>
          !occupiedRoomIds.has(
            room.id
          ) &&
          ![
            "maintenance",
            "out_of_order",
            "blocked",
          ].includes(
            room.room_status
          )
      ).length;

    const dirtyRooms =
      filteredData.rooms.filter(
        (room) =>
          room.housekeeping_status ===
          "dirty"
      ).length;

    const cleanRooms =
      filteredData.rooms.filter(
        (room) =>
          [
            "clean",
            "inspected",
          ].includes(
            room.housekeeping_status
          )
      ).length;

    const inspectionRooms =
      filteredData.rooms.filter(
        (room) =>
          [
            "inspection",
            "cleaning",
          ].includes(
            room.housekeeping_status
          )
      ).length;

    const maintenanceRooms =
      filteredData.rooms.filter(
        (room) =>
          [
            "maintenance",
            "out_of_order",
          ].includes(
            room.room_status
          )
      ).length;

    const occupancy =
      totalRooms > 0
        ? Math.round(
            (
              occupiedRooms /
              totalRooms
            ) * 100
          )
        : 0;

    const todaySales =
      activeReservations
        .filter(
          (reservation) =>
            reservation.check_in ===
            today
        )
        .reduce(
          (sum, reservation) =>
            sum +
            Number(
              reservation.total_price
            ),
          0
        );

    const monthSales =
      activeReservations
        .filter(
          (reservation) =>
            reservation.check_in >=
            currentMonthStart
        )
        .reduce(
          (sum, reservation) =>
            sum +
            Number(
              reservation.total_price
            ),
          0
        );

    const outstandingBalance =
      activeReservations.reduce(
        (sum, reservation) =>
          sum +
          Number(
            reservation.balance
          ),
        0
      );

    const soldRoomNights =
      activeReservations
        .filter(
          (reservation) =>
            reservation.check_in >=
            currentMonthStart
        )
        .reduce(
          (sum, reservation) =>
            sum +
            Math.max(
              0,
              Number(
                reservation.nights
              )
            ),
          0
        );

    const adr =
      soldRoomNights > 0
        ? monthSales /
          soldRoomNights
        : 0;

    const revPar =
      totalRooms > 0
        ? adr *
          (occupancy / 100)
        : 0;

    const latestReservations = [
      ...filteredData.reservations,
    ]
      .sort(
        (first, second) =>
          new Date(
            second.created_at
          ).getTime() -
          new Date(
            first.created_at
          ).getTime()
      )
      .slice(0, 7);

    const upcomingArrivalEnd =
      addDays(today, 30);

    const upcomingArrivals =
      activeReservations
        .filter(
          (reservation) =>
            reservation.check_in >=
              today &&
            reservation.check_in <=
              upcomingArrivalEnd &&
            ![
              "checked_out",
              "cancelled",
              "no_show",
            ].includes(
              reservation.status
            )
        )
        .sort(
          (first, second) =>
            first.check_in.localeCompare(
              second.check_in
            )
        )
        .slice(0, 20);

    const departureRangeStart =
      addDays(today, -7);

    const departureRangeEnd =
      addDays(today, 30);

    const upcomingDepartures =
      filteredData.reservations
        .filter(
          (reservation) =>
            reservation.check_out >=
              departureRangeStart &&
            reservation.check_out <=
              departureRangeEnd &&
            ![
              "cancelled",
              "no_show",
            ].includes(
              reservation.status
            )
        )
        .sort(
          (first, second) => {
            const firstToday =
              first.check_out === today
                ? 0
                : 1;

            const secondToday =
              second.check_out === today
                ? 0
                : 1;

            if (
              firstToday !== secondToday
            ) {
              return (
                firstToday -
                secondToday
              );
            }

            return first.check_out.localeCompare(
              second.check_out
            );
          }
        )
        .slice(0, 20);

    const sourceMap = new Map<
      string,
      {
        count: number;
        revenue: number;
      }
    >();

    for (
      const reservation of
      activeReservations
    ) {
      const current =
        sourceMap.get(
          reservation.source
        ) ?? {
          count: 0,
          revenue: 0,
        };

      current.count += 1;

      current.revenue +=
        Number(
          reservation.total_price
        );

      sourceMap.set(
        reservation.source,
        current
      );
    }

    const sourceBreakdown = [
      ...sourceMap.entries(),
    ]
      .map(
        ([source, values]) => ({
          source,
          ...values,
        })
      )
      .sort(
        (first, second) =>
          second.revenue -
          first.revenue
      );

    const outstandingReservations =
      activeReservations
        .filter(
          (reservation) =>
            Number(
              reservation.balance
            ) > 0
        )
        .sort(
          (first, second) =>
            Number(
              second.balance
            ) -
            Number(
              first.balance
            )
        )
        .slice(0, 7);

    return {
      arrivals,
      departures,
      inHouse,
      totalRooms,
      occupiedRooms,
      availableRooms,
      dirtyRooms,
      cleanRooms,
      inspectionRooms,
      maintenanceRooms,
      occupancy,
      todaySales,
      monthSales,
      outstandingBalance,
      adr,
      revPar,
      latestReservations,
      upcomingArrivals,
      upcomingDepartures,
      sourceBreakdown,
      outstandingReservations,
    };
  }, [filteredData]);

  const quickLinks = [
    {
      title: "Yeni Rezervasyon",
      description:
        "Rezervasyon oluştur ve düzenle",
      href:
        "/dashboard/hotel/rezervasyonlar",
      icon: FaCalendarCheck,
    },
    {
      title: "Front Office",
      description:
        "Check-in ve check-out işlemleri",
      href:
        "/dashboard/hotel/front-office",
      icon: FaSignInAlt,
    },
    {
      title: "Oda Planı",
      description:
        "Oda ata ve takvimi görüntüle",
      href:
        "/dashboard/hotel/room-planner",
      icon: FaBed,
    },
    {
      title: "Housekeeping",
      description:
        "Temizlik ve oda durumları",
      href:
        "/dashboard/hotel/housekeeping",
      icon: FaBroom,
    },
    {
      title: "Folio & Tahsilat",
      description:
        "Harcama ve ödeme yönetimi",
      href:
        "/dashboard/hotel/folio",
      icon: FaWallet,
    },
    {
      title: "Misafir Merkezi",
      description:
        "Misafir profilleri ve geçmiş",
      href:
        "/dashboard/hotel/misafirler",
      icon: FaUserFriends,
    },
    {
      title: "Revenue",
      description:
        "Gelir ve performans analizi",
      href:
        "/dashboard/hotel/revenue-dashboard",
      icon: FaChartLine,
    },
    {
      title: "Channel Manager",
      description:
        "Satış kanalları ve envanter",
      href:
        "/dashboard/hotel/channel-manager",
      icon: FaSyncAlt,
    },
  ];

  if (loading) {
    return (
      <main className="p-10">
        Yönetim merkezi yükleniyor...
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
              Genel Yönetim Merkezi
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Ön büro, rezervasyon,
              housekeeping, doluluk ve
              finansal performansı tek
              ekrandan takip edin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedHotelId}
              onChange={(event) =>
                setSelectedHotelId(
                  event.target.value
                )
              }
              className="min-h-12 rounded-xl bg-white px-5 font-bold text-slate-950"
            >
              <option value="">
                Tüm oteller
              </option>

              {data.hotels.map(
                (hotel) => (
                  <option
                    key={hotel.id}
                    value={hotel.id}
                  >
                    {hotel.name}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              disabled={refreshing}
              onClick={() => {
                if (membership) {
                  void loadData(
                    membership.company_id,
                    true
                  );
                }
              }}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 font-black disabled:opacity-50"
            >
              <FaSyncAlt
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Yenileniyor"
                : "Verileri Yenile"}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            {
              label: "Bugün Giriş",
              value:
                dashboard.arrivals
                  .length,
              icon: FaSignInAlt,
              href:
                "/dashboard/hotel/front-office",
            },
            {
              label: "Bugün Çıkış",
              value:
                dashboard.departures
                  .length,
              icon: FaSignOutAlt,
              href:
                "/dashboard/hotel/front-office",
            },
            {
              label: "Konaklayan",
              value:
                dashboard.inHouse
                  .length,
              icon: FaUserFriends,
              href:
                "/dashboard/hotel/front-office",
            },
            {
              label: "Müsait Oda",
              value:
                dashboard.availableRooms,
              icon: FaBed,
              href:
                "/dashboard/hotel/room-planner",
            },
            {
              label: "Kirli Oda",
              value:
                dashboard.dirtyRooms,
              icon: FaBroom,
              href:
                "/dashboard/hotel/housekeeping",
            },
            {
              label: "Bakım / Arıza",
              value:
                dashboard.maintenanceRooms,
              icon: FaTools,
              href:
                "/dashboard/hotel/room-planner",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-3xl border border-white/10 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-orange-400/40"
              >
                <div className="flex items-center justify-between">
                  <Icon className="text-orange-400" />

                  <FaArrowRight className="text-xs text-slate-700 transition group-hover:text-orange-400" />
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-3xl font-black">
                  {item.value}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_1.95fr]">
          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Canlı Doluluk
                </p>

                <p className="mt-3 text-6xl font-black text-orange-400">
                  %{dashboard.occupancy}
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                <FaPercent />
              </div>
            </div>

            <div className="mt-7 h-4 overflow-hidden rounded-full bg-slate-950">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    dashboard.occupancy
                  )}%`,
                }}
              />
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="text-2xl font-black">
                  {dashboard.totalRooms}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Toplam Oda
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="text-2xl font-black text-blue-400">
                  {dashboard.occupiedRooms}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Dolu
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="text-2xl font-black text-emerald-400">
                  {dashboard.availableRooms}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Müsait
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div>
              <p className="text-sm font-black text-slate-500">
                Gelir ve Performans
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Finansal Görünüm
              </h2>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label:
                    "Bugün Başlayan Satış",
                  value: money(
                    dashboard.todaySales
                  ),
                  icon:
                    FaMoneyBillWave,
                  className:
                    "text-emerald-400",
                },
                {
                  label:
                    "Bu Ay Rezervasyon Cirosu",
                  value: money(
                    dashboard.monthSales
                  ),
                  icon: FaCoins,
                  className:
                    "text-blue-400",
                },
                {
                  label:
                    "Bekleyen Tahsilat",
                  value: money(
                    dashboard.outstandingBalance
                  ),
                  icon: FaWallet,
                  className:
                    "text-red-400",
                },
                {
                  label: "ADR",
                  value: money(
                    dashboard.adr
                  ),
                  icon: FaHotel,
                  className:
                    "text-violet-400",
                },
                {
                  label: "RevPAR",
                  value: money(
                    dashboard.revPar
                  ),
                  icon: FaChartLine,
                  className:
                    "text-orange-400",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-slate-950 p-4"
                  >
                    <Icon
                      className={
                        item.className
                      }
                    />

                    <p className="mt-4 text-xs text-slate-500">
                      {item.label}
                    </p>

                    <p
                      className={`mt-2 text-xl font-black ${item.className}`}
                    >
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-3">
          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  ARRIVALS
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Yaklaşan Girişler
                  <span className="ml-3 rounded-full bg-orange-500/15 px-3 py-1 text-sm text-orange-400">
                    {dashboard.upcomingArrivals.length}
                  </span>
                </h2>
              </div>

              <FaSignInAlt className="text-2xl text-orange-400" />
            </div>

            <div className="mt-5 space-y-3">
              {dashboard.upcomingArrivals.map(
                (reservation) => {
                  const room =
                    reservation.room_id
                      ? roomMap.get(
                          reservation.room_id
                        )
                      : null;

                  return (
                    <Link
                      key={reservation.id}
                      href={`/dashboard/hotel/rezervasyonlar?reservation=${reservation.reservation_no}`}
                      className="block rounded-2xl bg-slate-950 p-4 transition hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-orange-400">
                            {
                              reservation.reservation_no
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {hotelMap.get(
                              reservation.hotel_id
                            ) ??
                              "Otel"}
                          </p>
                        </div>

                        <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-400">
                          {formatDate(
                            reservation.check_in
                          )}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-slate-400">
                          {room
                            ? `Oda ${room.room_number}`
                            : "Oda atanmadı"}
                        </span>

                        <span className="font-black">
                          {
                            reservation.adults
                          }{" "}
                          yetişkin
                        </span>
                      </div>
                    </Link>
                  );
                }
              )}

              {dashboard.upcomingArrivals
                .length === 0 && (
                <p className="rounded-2xl bg-slate-950 p-8 text-center text-slate-500">
                  Yaklaşan giriş bulunmuyor.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-violet-400">
                  DEPARTURES
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Çıkışlar
                  <span className="ml-3 rounded-full bg-violet-500/15 px-3 py-1 text-sm text-violet-400">
                    {dashboard.upcomingDepartures.length}
                  </span>
                </h2>

                <p className="mt-2 text-xs text-slate-500">
                  Son 7 gün ve gelecek 30 gün
                </p>
              </div>

              <FaSignOutAlt className="text-2xl text-violet-400" />
            </div>

            <div className="mt-5 space-y-3">
              {dashboard.upcomingDepartures.map(
                (reservation) => {
                  const room =
                    reservation.room_id
                      ? roomMap.get(
                          reservation.room_id
                        )
                      : null;

                  return (
                    <Link
                      key={reservation.id}
                      href={`/dashboard/hotel/rezervasyonlar?reservation=${reservation.reservation_no}`}
                      className="block rounded-2xl bg-slate-950 p-4 transition hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-violet-400">
                            {
                              reservation.reservation_no
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {room
                              ? `Oda ${room.room_number}`
                              : "Oda atanmadı"}
                          </p>
                        </div>

                        <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-black text-violet-400">
                          {formatDate(
                            reservation.check_out
                          )}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-black text-red-400">
                        Bakiye:{" "}
                        {money(
                          reservation.balance,
                          reservation.currency
                        )}
                      </p>
                    </Link>
                  );
                }
              )}

              {dashboard.upcomingDepartures
                .length === 0 && (
                <p className="rounded-2xl bg-slate-950 p-8 text-center text-slate-500">
                  Seçili otel ve tarih aralığında çıkış bulunmuyor.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  HOUSEKEEPING
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Oda Operasyon Özeti
                </h2>
              </div>

              <FaBroom className="text-2xl text-emerald-400" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                {
                  label: "Temiz",
                  value:
                    dashboard.cleanRooms,
                  className:
                    "text-emerald-400",
                },
                {
                  label: "Kirli",
                  value:
                    dashboard.dirtyRooms,
                  className:
                    "text-red-400",
                },
                {
                  label:
                    "Kontrol / Temizlik",
                  value:
                    dashboard.inspectionRooms,
                  className:
                    "text-amber-400",
                },
                {
                  label:
                    "Bakım / Arıza",
                  value:
                    dashboard.maintenanceRooms,
                  className:
                    "text-violet-400",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-slate-950 p-5"
                >
                  <p
                    className={`text-3xl font-black ${item.className}`}
                  >
                    {item.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/hotel/housekeeping"
              className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 font-black"
            >
              Housekeeping Aç
              <FaArrowRight />
            </Link>
          </article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  SON KAYITLAR
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Son Rezervasyonlar
                </h2>
              </div>

              <Link
                href="/dashboard/hotel/rezervasyonlar"
                className="text-sm font-black text-orange-400"
              >
                Tümünü Aç
              </Link>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="pb-4">
                      Rezervasyon
                    </th>
                    <th className="pb-4">
                      Otel / Oda
                    </th>
                    <th className="pb-4">
                      Kaynak
                    </th>
                    <th className="pb-4">
                      Tarih
                    </th>
                    <th className="pb-4">
                      Durum
                    </th>
                    <th className="pb-4 text-right">
                      Toplam
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.latestReservations.map(
                    (reservation) => {
                      const room =
                        reservation.room_id
                          ? roomMap.get(
                              reservation.room_id
                            )
                          : null;

                      return (
                        <tr
                          key={reservation.id}
                          className="border-t border-white/10"
                        >
                          <td className="py-4">
                            <p className="font-black text-orange-400">
                              {
                                reservation.reservation_no
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {formatDateTime(
                                reservation.created_at
                              )}
                            </p>
                          </td>

                          <td className="py-4">
                            <p className="font-black">
                              {hotelMap.get(
                                reservation.hotel_id
                              ) ?? "Otel"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {room
                                ? `Oda ${room.room_number}`
                                : roomTypeMap.get(
                                    reservation.room_type_id
                                  ) ??
                                  "Oda atanmadı"}
                            </p>
                          </td>

                          <td className="py-4 text-sm font-bold">
                            {sourceLabels[
                              reservation.source
                            ] ??
                              reservation.source}
                          </td>

                          <td className="py-4 text-sm">
                            {formatDate(
                              reservation.check_in
                            )}
                          </td>

                          <td className="py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                                reservation.status
                              )}`}
                            >
                              {
                                statusLabels[
                                  reservation.status
                                ]
                              }
                            </span>
                          </td>

                          <td className="py-4 text-right font-black text-emerald-400">
                            {money(
                              reservation.total_price,
                              reservation.currency
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-400">
                  FİNANS UYARILARI
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Açık Bakiyeler
                </h2>
              </div>

              <FaBell className="text-2xl text-red-400" />
            </div>

            <div className="mt-5 space-y-3">
              {dashboard.outstandingReservations.map(
                (reservation) => (
                  <Link
                    key={reservation.id}
                    href="/dashboard/hotel/folio"
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4 transition hover:bg-white/[0.05]"
                  >
                    <div>
                      <p className="font-black">
                        {
                          reservation.reservation_no
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Çıkış:{" "}
                        {formatDate(
                          reservation.check_out
                        )}
                      </p>
                    </div>

                    <p className="font-black text-red-400">
                      {money(
                        reservation.balance,
                        reservation.currency
                      )}
                    </p>
                  </Link>
                )
              )}

              {dashboard.outstandingReservations
                .length === 0 && (
                <div className="rounded-2xl bg-emerald-500/10 p-7 text-center">
                  <FaCheckCircle className="mx-auto text-3xl text-emerald-400" />

                  <p className="mt-3 font-black text-emerald-400">
                    Açık bakiye bulunmuyor
                  </p>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-wider text-blue-400">
              KANAL PERFORMANSI
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Satış Kanalı Dağılımı
            </h2>

            <div className="mt-6 space-y-4">
              {dashboard.sourceBreakdown.map(
                (item) => {
                  const percentage =
                    dashboard.monthSales >
                    0
                      ? Math.round(
                          (
                            item.revenue /
                            dashboard.monthSales
                          ) * 100
                        )
                      : 0;

                  return (
                    <div
                      key={item.source}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black">
                            {sourceLabels[
                              item.source
                            ] ??
                              item.source}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.count} rezervasyon
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-emerald-400">
                            {money(
                              item.revenue
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            %{percentage}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(
                              100,
                              percentage
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}

              {dashboard.sourceBreakdown
                .length === 0 && (
                <p className="rounded-2xl bg-slate-950 p-8 text-center text-slate-500">
                  Kanal verisi bulunmuyor.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              HIZLI İŞLEMLER
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Operasyon Kısayolları
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group rounded-2xl border border-white/10 bg-slate-950 p-5 transition hover:-translate-y-1 hover:border-orange-400/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                          <Icon />
                        </div>

                        <FaArrowRight className="text-xs text-slate-700 transition group-hover:text-orange-400" />
                      </div>

                      <h3 className="mt-4 font-black">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </Link>
                  );
                }
              )}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-400">
                OPERASYON DURUMU
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Oda Durum Kontrolü
              </h2>
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-black">
              <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-400">
                {dashboard.cleanRooms} temiz
              </span>

              <span className="rounded-full bg-red-500/15 px-4 py-2 text-red-400">
                {dashboard.dirtyRooms} kirli
              </span>

              <span className="rounded-full bg-amber-500/15 px-4 py-2 text-amber-400">
                {dashboard.inspectionRooms} işlemde
              </span>

              <span className="rounded-full bg-violet-500/15 px-4 py-2 text-violet-400">
                {dashboard.maintenanceRooms} bakımda
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {filteredData.rooms
              .slice(0, 18)
              .map((room) => (
                <Link
                  key={room.id}
                  href="/dashboard/hotel/room-planner"
                  className="rounded-2xl bg-slate-950 p-4 transition hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black">
                      {room.room_number}
                    </p>

                    {[
                      "maintenance",
                      "out_of_order",
                    ].includes(
                      room.room_status
                    ) ? (
                      <FaExclamationTriangle className="text-red-400" />
                    ) : (
                      <FaBed className="text-orange-400" />
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    {roomTypeMap.get(
                      room.room_type_id
                    ) ?? "Oda tipi"}
                  </p>

                  <p className="mt-2 text-xs font-black text-blue-400">
                    {roomStatusLabel(
                      room.room_status
                    )}
                  </p>

                  <p className="mt-1 text-xs font-black text-emerald-400">
                    {housekeepingLabel(
                      room.housekeeping_status
                    )}
                  </p>
                </Link>
              ))}
          </div>

          {filteredData.rooms.length >
            18 && (
            <Link
              href="/dashboard/hotel/room-planner"
              className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 font-black text-orange-400"
            >
              Tüm Odaları Görüntüle
              <FaArrowRight />
            </Link>
          )}
        </section>

        <footer className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 text-xs text-slate-600 sm:flex-row">
          <p>
            Son güncelleme:{" "}
            {new Date().toLocaleString(
              "tr-TR"
            )}
          </p>

          <p>
            Finansal değerler rezervasyon
            toplamları ve açık bakiye
            alanlarından hesaplanır.
          </p>
        </footer>
      </div>
    </main>
  );
}
