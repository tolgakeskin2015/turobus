"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCalendarCheck,
  FaCalendarDay,
  FaCheck,
  FaDownload,
  FaEdit,
  FaHotel,
  FaList,
  FaPrint,
  FaSearch,
  FaThLarge,
  FaTrash,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import ReservationForm, {
  ReservationFormState,
  ReservationSource,
  ReservationStatus,
} from "@/components/hotel/reservations/ReservationForm";
import {
  getReservationErrorMessage,
  getReservations,
  ReservationPayload,
  ReservationRecord,
  saveReservation,
} from "@/lib/hotel/reservations/reservation-service";

import {
  softDeleteReservation,
} from "@/lib/hotel/reservations/reservation-trash-service";

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type RoomOption = {
  id: string;
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  room_status: string;
  housekeeping_status: string;
};

type ViewMode = "table" | "cards";

type QuickFilter =
  | "all"
  | "arrivals"
  | "departures"
  | "in_house"
  | "unassigned"
  | "outstanding";

const statusLabels: Record<
  ReservationStatus,
  string
> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  checked_in: "Check-in Yapıldı",
  checked_out: "Check-out Yapıldı",
  cancelled: "İptal",
  no_show: "No Show",
};

const sourceLabels: Record<
  ReservationSource,
  string
> = {
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

function tomorrowText(): string {
  const date = new Date();

  date.setDate(
    date.getDate() + 1
  );

  return localDateText(date);
}

function createReservationNumber(): string {
  const now = new Date();

  const datePart = [
    now.getFullYear(),

    String(
      now.getMonth() + 1
    ).padStart(2, "0"),

    String(
      now.getDate()
    ).padStart(2, "0"),
  ].join("");

  const randomPart = Math.floor(
    100000 +
      Math.random() * 900000
  );

  return `RSV-${datePart}-${randomPart}`;
}

function createEmptyForm(): ReservationFormState {
  return {
    hotel_id: "",
    room_type_id: "",
    room_id: "",

    reservation_no:
      createReservationNumber(),

    source: "direct",
    status: "pending",

    check_in: localDateText(),
    check_out: tomorrowText(),

    adults: "2",
    children: "0",

    currency: "TRY",

    base_price: "0",
    total_price: "0",
    balance: "0",

    notes: "",
  };
}

function calculateNights(
  checkIn: string,
  checkOut: string
): number {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = new Date(
    `${checkIn}T00:00:00`
  );

  const end = new Date(
    `${checkOut}T00:00:00`
  );

  return Math.max(
    0,
    Math.round(
      (
        end.getTime() -
        start.getTime()
      ) / 86400000
    )
  );
}

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
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
      maximumFractionDigits: 2,
    }
  ).format(Number(value || 0));
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

function statusClasses(
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

function sourceClasses(
  source: ReservationSource
): string {
  switch (source) {
    case "booking":
      return "bg-blue-500/15 text-blue-300";

    case "expedia":
      return "bg-yellow-500/15 text-yellow-300";

    case "website":
      return "bg-violet-500/15 text-violet-300";

    case "tatilliyoruz":
      return "bg-orange-500/15 text-orange-300";

    default:
      return "bg-slate-500/15 text-slate-300";
  }
}

export default function HotelReservationsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [hotels, setHotels] =
    useState<HotelOption[]>([]);

  const [roomTypes, setRoomTypes] =
    useState<RoomTypeOption[]>([]);

  const [rooms, setRooms] =
    useState<RoomOption[]>([]);

  const [
    reservations,
    setReservations,
  ] = useState<ReservationRecord[]>([]);

  const [form, setForm] =
    useState<ReservationFormState>(
      createEmptyForm()
    );

  const [editingId, setEditingId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    hotelFilter,
    setHotelFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "" | ReservationStatus
  >("");

  const [
    sourceFilter,
    setSourceFilter,
  ] = useState<
    "" | ReservationSource
  >("");

  const [
    quickFilter,
    setQuickFilter,
  ] =
    useState<QuickFilter>("all");

  const [
    dateFrom,
    setDateFrom,
  ] = useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<string[]>([]);

  const [viewMode, setViewMode] =
    useState<ViewMode>("table");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState("");

  const [
    bulkProcessing,
    setBulkProcessing,
  ] = useState(false);

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
      setErrorMessage("");

      const [
        {
          data: hotelData,
          error: hotelError,
        },
        {
          data: roomTypeData,
          error: roomTypeError,
        },
        {
          data: roomData,
          error: roomError,
        },
      ] = await Promise.all([
        supabase
          .from("hotels")
          .select("id, name")
          .eq(
            "company_id",
            companyId
          )
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_room_types")
          .select(
            "id, hotel_id, name"
          )
          .eq(
            "company_id",
            companyId
          )
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
          .eq(
            "company_id",
            companyId
          )
          .order("room_number"),
      ]);

      const optionError =
        hotelError ??
        roomTypeError ??
        roomError;

      if (optionError) {
        throw optionError;
      }

      const reservationData =
        await getReservations(
          companyId
        );

      setHotels(
        (hotelData ??
          []) as HotelOption[]
      );

      setRoomTypes(
        (roomTypeData ??
          []) as RoomTypeOption[]
      );

      setRooms(
        (roomData ??
          []) as RoomOption[]
      );

      setReservations(
        reservationData
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
          getReservationErrorMessage(
            error
          )
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const today = localDateText();

  const filteredReservations =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

      return reservations.filter(
        (reservation) => {
          if (
            hotelFilter &&
            reservation.hotel_id !==
              hotelFilter
          ) {
            return false;
          }

          if (
            statusFilter &&
            reservation.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            sourceFilter &&
            reservation.source !==
              sourceFilter
          ) {
            return false;
          }

          if (
            dateFrom &&
            reservation.check_in <
              dateFrom
          ) {
            return false;
          }

          if (
            dateTo &&
            reservation.check_out >
              dateTo
          ) {
            return false;
          }

          if (
            quickFilter ===
              "arrivals" &&
            reservation.check_in !==
              today
          ) {
            return false;
          }

          if (
            quickFilter ===
              "departures" &&
            reservation.check_out !==
              today
          ) {
            return false;
          }

          if (
            quickFilter ===
              "in_house" &&
            reservation.status !==
              "checked_in"
          ) {
            return false;
          }

          if (
            quickFilter ===
              "unassigned" &&
            reservation.room_id
          ) {
            return false;
          }

          if (
            quickFilter ===
              "outstanding" &&
            Number(
              reservation.balance
            ) <= 0
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

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

            statusLabels[
              reservation.status
            ],

            sourceLabels[
              reservation.source
            ],

            reservation.check_in,
            reservation.check_out,
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
      dateFrom,
      dateTo,
      hotelFilter,
      quickFilter,
      reservations,
      search,
      sourceFilter,
      statusFilter,
      today,
    ]);

  const stats = useMemo(() => {
    const active =
      reservations.filter(
        (reservation) =>
          ![
            "cancelled",
            "no_show",
          ].includes(
            reservation.status
          )
      );

    const totalRevenue =
      active.reduce(
        (sum, reservation) =>
          sum +
          Number(
            reservation.total_price
          ),
        0
      );

    const totalBalance =
      active.reduce(
        (sum, reservation) =>
          sum +
          Number(
            reservation.balance
          ),
        0
      );

    return {
      total: reservations.length,

      confirmed:
        reservations.filter(
          (item) =>
            item.status ===
            "confirmed"
        ).length,

      checkedIn:
        reservations.filter(
          (item) =>
            item.status ===
            "checked_in"
        ).length,

      arrivals:
        reservations.filter(
          (item) =>
            item.check_in === today &&
            ![
              "cancelled",
              "no_show",
              "checked_out",
            ].includes(item.status)
        ).length,

      departures:
        reservations.filter(
          (item) =>
            item.check_out === today &&
            ![
              "cancelled",
              "no_show",
            ].includes(item.status)
        ).length,

      unassigned:
        reservations.filter(
          (item) =>
            !item.room_id &&
            ![
              "cancelled",
              "no_show",
              "checked_out",
            ].includes(item.status)
        ).length,

      totalRevenue,
      totalBalance,
      collected:
        Math.max(
          0,
          totalRevenue -
            totalBalance
        ),
    };
  }, [reservations, today]);

  function updateForm<
    K extends
      keyof ReservationFormState
  >(
    key: K,
    value: ReservationFormState[K]
  ) {
    setForm((current) => {
      const next: ReservationFormState =
        {
          ...current,
          [key]: value,
        };

      if (key === "hotel_id") {
        next.room_type_id = "";
        next.room_id = "";
      }

      if (
        key === "room_type_id"
      ) {
        next.room_id = "";
      }

      if (
        key === "base_price" ||
        key === "check_in" ||
        key === "check_out"
      ) {
        const nights =
          calculateNights(
            next.check_in,
            next.check_out
          );

        const total =
          Math.max(
            0,
            Number(
              next.base_price
            ) || 0
          ) * nights;

        next.total_price =
          total.toFixed(2);

        next.balance =
          total.toFixed(2);
      }

      return next;
    });
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId("");
  }

  function editReservation(
    reservation: ReservationRecord
  ) {
    setEditingId(
      reservation.id
    );

    setForm({
      hotel_id:
        reservation.hotel_id,

      room_type_id:
        reservation.room_type_id,

      room_id:
        reservation.room_id ?? "",

      reservation_no:
        reservation.reservation_no,

      source:
        reservation.source,

      status:
        reservation.status,

      check_in:
        reservation.check_in,

      check_out:
        reservation.check_out,

      adults: String(
        reservation.adults
      ),

      children: String(
        reservation.children
      ),

      currency:
        reservation.currency,

      base_price: String(
        reservation.base_price
      ),

      total_price: String(
        reservation.total_price
      ),

      balance: String(
        reservation.balance
      ),

      notes:
        reservation.notes ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const nights =
        calculateNights(
          form.check_in,
          form.check_out
        );

      if (nights < 1) {
        throw new Error(
          "Çıkış tarihi giriş tarihinden sonra olmalıdır."
        );
      }

      if (!form.hotel_id) {
        throw new Error(
          "Otel seçmelisiniz."
        );
      }

      if (!form.room_type_id) {
        throw new Error(
          "Oda tipi seçmelisiniz."
        );
      }

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const payload: ReservationPayload =
        {
          company_id:
            membership.company_id,

          hotel_id:
            form.hotel_id,

          room_type_id:
            form.room_type_id,

          room_id:
            form.room_id || null,

          reservation_no:
            form.reservation_no.trim(),

          source:
            form.source,

          status:
            form.status,

          check_in:
            form.check_in,

          check_out:
            form.check_out,

          adults: Math.max(
            1,
            Number(
              form.adults
            ) || 1
          ),

          children: Math.max(
            0,
            Number(
              form.children
            ) || 0
          ),

          nights,

          currency:
            form.currency,

          base_price:
            Math.max(
              0,
              Number(
                form.base_price
              ) || 0
            ),

          total_price:
            Math.max(
              0,
              Number(
                form.total_price
              ) || 0
            ),

          balance:
            Math.max(
              0,
              Number(
                form.balance
              ) || 0
            ),

          notes:
            form.notes.trim() ||
            null,

          updated_at:
            new Date().toISOString(),
        };

      await saveReservation({
        payload,

        editingId:
          editingId || null,

        createdBy:
          user?.id ?? null,
      });

      const wasEditing =
        Boolean(editingId);

      resetForm();

      await loadData(
        membership.company_id
      );

      setSuccessMessage(
        wasEditing
          ? "Rezervasyon güncellendi."
          : "Yeni rezervasyon oluşturuldu."
      );
    } catch (error: unknown) {
      setErrorMessage(
        getReservationErrorMessage(
          error
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    reservation: ReservationRecord
  ) {
    if (
      !membership ||
      deletingId
    ) {
      return;
    }

    const approved =
      window.confirm(
        `${reservation.reservation_no} numaralı rezervasyon kalıcı olarak silinsin mi?`
      );

    if (!approved) {
      return;
    }

    setDeletingId(
      reservation.id
    );

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const deletionReason =
        window.prompt(
          "Rezervasyonu neden siliyorsunuz?",
          "Yanlış veya iptal edilmiş kayıt"
        );

      if (deletionReason === null) {
        return;
      }

      await softDeleteReservation(
        membership.company_id,
        reservation.id,
        deletionReason
      );

      if (
        editingId ===
        reservation.id
      ) {
        resetForm();
      }

      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              id !== reservation.id
          )
      );

      await loadData(
        membership.company_id
      );

      setSuccessMessage(
        `${reservation.reservation_no} numaralı rezervasyon silindi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        getReservationErrorMessage(
          error
        )
      );
    } finally {
      setDeletingId("");
    }
  }

  function toggleSelection(
    reservationId: string
  ) {
    setSelectedIds(
      (current) =>
        current.includes(
          reservationId
        )
          ? current.filter(
              (id) =>
                id !== reservationId
            )
          : [
              ...current,
              reservationId,
            ]
    );
  }

  function toggleAllVisible() {
    const visibleIds =
      filteredReservations.map(
        (reservation) =>
          reservation.id
      );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedIds.includes(id)
      );

    if (allSelected) {
      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              !visibleIds.includes(id)
          )
      );

      return;
    }

    setSelectedIds(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...visibleIds,
          ])
        )
    );
  }

  async function bulkUpdateStatus(
    nextStatus: ReservationStatus
  ) {
    if (
      !membership ||
      bulkProcessing ||
      selectedIds.length === 0
    ) {
      return;
    }

    const approved =
      window.confirm(
        `${selectedIds.length} rezervasyonun durumu "${statusLabels[nextStatus]}" olarak değiştirilsin mi?`
      );

    if (!approved) {
      return;
    }

    setBulkProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } =
        await supabase
          .from(
            "hotel_reservations"
          )
          .update({
            status: nextStatus,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "company_id",
            membership.company_id
          )
          .in("id", selectedIds);

      if (error) {
        throw error;
      }

      const changedCount =
        selectedIds.length;

      setSelectedIds([]);

      await loadData(
        membership.company_id
      );

      setSuccessMessage(
        `${changedCount} rezervasyon güncellendi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        getReservationErrorMessage(
          error
        )
      );
    } finally {
      setBulkProcessing(false);
    }
  }

  async function bulkDelete() {
    if (
      !membership ||
      bulkProcessing ||
      selectedIds.length === 0
    ) {
      return;
    }

    const approved =
      window.confirm(
        `${selectedIds.length} rezervasyon kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`
      );

    if (!approved) {
      return;
    }

    setBulkProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      for (
        const reservationId of
        selectedIds
      ) {
        await softDeleteReservation(
          membership.company_id,
          reservationId,
          "Toplu silme işlemi"
        );
      }

      const deletedCount =
        selectedIds.length;

      setSelectedIds([]);

      await loadData(
        membership.company_id
      );

      setSuccessMessage(
        `${deletedCount} rezervasyon silindi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        getReservationErrorMessage(
          error
        )
      );
    } finally {
      setBulkProcessing(false);
    }
  }

  function exportCsv() {
    if (
      filteredReservations.length === 0
    ) {
      setErrorMessage(
        "Dışa aktarılacak rezervasyon bulunmuyor."
      );

      return;
    }

    const rows =
      filteredReservations.map(
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

          return {
            Rezervasyon:
              reservation.reservation_no,

            Otel:
              hotel?.name ?? "",

            OdaTipi:
              roomType?.name ?? "",

            Oda:
              room?.room_number ?? "",

            Giris:
              reservation.check_in,

            Cikis:
              reservation.check_out,

            Gece:
              reservation.nights,

            Yetiskin:
              reservation.adults,

            Cocuk:
              reservation.children,

            Kaynak:
              sourceLabels[
                reservation.source
              ],

            Durum:
              statusLabels[
                reservation.status
              ],

            Toplam:
              reservation.total_price,

            Bakiye:
              reservation.balance,

            ParaBirimi:
              reservation.currency,
          };
        }
      );

    const headers =
      Object.keys(rows[0]);

    const escapeCell = (
      value: unknown
    ) =>
      `"${String(value ?? "")
        .replaceAll(
          '"',
          '""'
        )}"`;

    const csv = [
      headers
        .map(escapeCell)
        .join(";"),

      ...rows.map((row) =>
        headers
          .map((header) =>
            escapeCell(
              (
                row as Record<
                  string,
                  unknown
                >
              )[header]
            )
          )
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `otel-rezervasyonlari-${today}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch("");
    setHotelFilter("");
    setStatusFilter("");
    setSourceFilter("");
    setQuickFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Rezervasyonlar yükleniyor...
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
              Rezervasyon Merkezi PRO
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Rezervasyonları oluşturun,
              filtreleyin, toplu yönetin,
              oda atayın ve finansal
              durumlarını takip edin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/hotel/rezervasyonlar/cop-kutusu"
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 font-black text-slate-300 transition hover:border-orange-400/50 hover:text-orange-400"
            >
              <FaTrash />
              Çöp Kutusu ve Geçmiş
            </Link>

            <button
              type="button"
              onClick={exportCsv}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaDownload />
              CSV Aktar
            </button>

            <button
              type="button"
              onClick={() =>
                window.print()
              }
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaPrint />
              Yazdır
            </button>

            <div className="flex rounded-xl border border-white/10 p-1">
              <button
                type="button"
                onClick={() =>
                  setViewMode("table")
                }
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  viewMode === "table"
                    ? "bg-orange-500"
                    : "text-slate-500"
                }`}
              >
                <FaList />
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode("cards")
                }
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  viewMode === "cards"
                    ? "bg-orange-500"
                    : "text-slate-500"
                }`}
              >
                <FaThLarge />
              </button>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            {
              label:
                "Toplam Rezervasyon",
              value: stats.total,
              icon:
                FaCalendarCheck,
            },
            {
              label: "Bugün Giriş",
              value: stats.arrivals,
              icon: FaUserCheck,
            },
            {
              label: "Bugün Çıkış",
              value:
                stats.departures,
              icon: FaCalendarDay,
            },
            {
              label: "Konaklayan",
              value:
                stats.checkedIn,
              icon: FaHotel,
            },
            {
              label: "Oda Atanmadı",
              value:
                stats.unassigned,
              icon: FaUsers,
            },
            {
              label:
                "Kalan Bakiye",
              value: money(
                stats.totalBalance,
                "TRY"
              ),
              icon:
                FaCalendarCheck,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5"
              >
                <Icon className="text-orange-400" />

                <p className="mt-4 text-xs text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-2xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">
              Toplam Satış
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-400">
              {money(
                stats.totalRevenue,
                "TRY"
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-blue-500/10 p-5">
            <p className="text-sm text-blue-300">
              Tahsil Edilen
            </p>

            <p className="mt-2 text-2xl font-black text-blue-400">
              {money(
                stats.collected,
                "TRY"
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-red-500/10 p-5">
            <p className="text-sm text-red-300">
              Açık Bakiye
            </p>

            <p className="mt-2 text-2xl font-black text-red-400">
              {money(
                stats.totalBalance,
                "TRY"
              )}
            </p>
          </article>
        </section>

        <div className="mt-8">
          <ReservationForm
            hotels={hotels}
            roomTypes={roomTypes}
            rooms={rooms}
            form={form}
            saving={saving}
            editing={Boolean(
              editingId
            )}
            onChange={updateForm}
            onSubmit={handleSave}
            onCancel={resetForm}
          />
        </div>

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 xl:col-span-2">
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

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | ""
                    | ReservationStatus
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Tüm durumlar
              </option>

              {Object.entries(
                statusLabels
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(
                  event.target
                    .value as
                    | ""
                    | ReservationSource
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Tüm kaynaklar
              </option>

              {Object.entries(
                sourceLabels
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <label>
              <span className="mb-1 block text-xs font-black text-slate-500">
                Giriş başlangıcı
              </span>

              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(
                    event.target.value
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-black text-slate-500">
                Çıkış bitişi
              </span>

              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(
                    event.target.value
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              />
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="min-h-12 self-end rounded-xl border border-white/10 px-5 font-black"
            >
              Filtreleri Temizle
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              {
                value: "all",
                label: "Tümü",
              },
              {
                value:
                  "arrivals",
                label:
                  "Bugün Giriş",
              },
              {
                value:
                  "departures",
                label:
                  "Bugün Çıkış",
              },
              {
                value:
                  "in_house",
                label:
                  "Konaklayan",
              },
              {
                value:
                  "unassigned",
                label:
                  "Oda Atanmadı",
              },
              {
                value:
                  "outstanding",
                label:
                  "Bakiyesi Var",
              },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setQuickFilter(
                    item.value as
                      QuickFilter
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm font-black ${
                  quickFilter ===
                  item.value
                    ? "bg-orange-500"
                    : "bg-slate-950 text-slate-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900 p-5 xl:flex-row xl:items-center">
          <label className="flex items-center gap-3 font-black">
            <input
              type="checkbox"
              checked={
                filteredReservations.length >
                  0 &&
                filteredReservations.every(
                  (reservation) =>
                    selectedIds.includes(
                      reservation.id
                    )
                )
              }
              onChange={
                toggleAllVisible
              }
              className="h-5 w-5"
            />

            Görünen rezervasyonları seç
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                bulkProcessing ||
                selectedIds.length ===
                  0
              }
              onClick={() =>
                void bulkUpdateStatus(
                  "confirmed"
                )
              }
              className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 font-black disabled:opacity-40"
            >
              <FaCheck />
              Onayla
            </button>

            <button
              type="button"
              disabled={
                bulkProcessing ||
                selectedIds.length ===
                  0
              }
              onClick={() =>
                void bulkUpdateStatus(
                  "checked_in"
                )
              }
              className="min-h-11 rounded-xl bg-blue-500 px-4 font-black disabled:opacity-40"
            >
              Check-in
            </button>

            <button
              type="button"
              disabled={
                bulkProcessing ||
                selectedIds.length ===
                  0
              }
              onClick={() =>
                void bulkUpdateStatus(
                  "checked_out"
                )
              }
              className="min-h-11 rounded-xl bg-violet-500 px-4 font-black disabled:opacity-40"
            >
              Check-out
            </button>

            <button
              type="button"
              disabled={
                bulkProcessing ||
                selectedIds.length ===
                  0
              }
              onClick={() =>
                void bulkUpdateStatus(
                  "cancelled"
                )
              }
              className="min-h-11 rounded-xl bg-amber-500/15 px-4 font-black text-amber-400 disabled:opacity-40"
            >
              İptal Et
            </button>

            <button
              type="button"
              disabled={
                bulkProcessing ||
                selectedIds.length ===
                  0
              }
              onClick={() =>
                void bulkDelete()
              }
              className="flex min-h-11 items-center gap-2 rounded-xl bg-red-500/15 px-4 font-black text-red-400 disabled:opacity-40"
            >
              <FaTrash />
              Seçilenleri Sil (
              {selectedIds.length})
            </button>
          </div>
        </section>

        {viewMode === "table" ? (
          <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-[1450px] w-full">
                <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-4">
                      Seç
                    </th>
                    <th className="p-4">
                      Rezervasyon
                    </th>
                    <th className="p-4">
                      Otel / Oda
                    </th>
                    <th className="p-4">
                      Tarihler
                    </th>
                    <th className="p-4">
                      Misafir
                    </th>
                    <th className="p-4">
                      Kaynak
                    </th>
                    <th className="p-4">
                      Durum
                    </th>
                    <th className="p-4 text-right">
                      Toplam
                    </th>
                    <th className="p-4 text-right">
                      Bakiye
                    </th>
                    <th className="p-4">
                      İşlemler
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReservations.map(
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

                      const isDeleting =
                        deletingId ===
                        reservation.id;

                      return (
                        <tr
                          key={
                            reservation.id
                          }
                          className="border-t border-white/10 hover:bg-white/[0.025]"
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(
                                reservation.id
                              )}
                              onChange={() =>
                                toggleSelection(
                                  reservation.id
                                )
                              }
                              className="h-5 w-5"
                            />
                          </td>

                          <td className="p-4">
                            <p className="font-black text-orange-400">
                              {
                                reservation.reservation_no
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {
                                reservation.nights
                              }{" "}
                              gece
                            </p>
                          </td>

                          <td className="p-4">
                            <p className="font-black">
                              {hotel?.name ??
                                "Otel yok"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {roomType?.name ??
                                "Oda tipi yok"}
                              {" · "}

                              {room
                                ? `Oda ${room.room_number}`
                                : "Oda atanmadı"}
                            </p>
                          </td>

                          <td className="p-4">
                            <p className="font-bold">
                              {formatDate(
                                reservation.check_in
                              )}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatDate(
                                reservation.check_out
                              )}
                            </p>
                          </td>

                          <td className="p-4">
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

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${sourceClasses(
                                reservation.source
                              )}`}
                            >
                              {
                                sourceLabels[
                                  reservation.source
                                ]
                              }
                            </span>
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses(
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

                          <td className="p-4 text-right font-black text-emerald-400">
                            {money(
                              reservation.total_price,
                              reservation.currency
                            )}
                          </td>

                          <td className="p-4 text-right font-black text-red-400">
                            {money(
                              reservation.balance,
                              reservation.currency
                            )}
                          </td>

                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={
                                  isDeleting
                                }
                                onClick={() =>
                                  editReservation(
                                    reservation
                                  )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500"
                              >
                                <FaEdit />
                              </button>

                              <button
                                type="button"
                                disabled={
                                  isDeleting
                                }
                                onClick={() =>
                                  void handleDelete(
                                    reservation
                                  )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                              >
                                <FaTrash />
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
          </section>
        ) : (
          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredReservations.map(
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

                const isDeleting =
                  deletingId ===
                  reservation.id;

                return (
                  <article
                    key={
                      reservation.id
                    }
                    className={`rounded-[30px] border p-6 ${
                      selectedIds.includes(
                        reservation.id
                      )
                        ? "border-orange-400 bg-orange-500/[0.05]"
                        : "border-white/10 bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(
                            reservation.id
                          )}
                          onChange={() =>
                            toggleSelection(
                              reservation.id
                            )
                          }
                          className="mt-1 h-5 w-5"
                        />

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
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
                          reservation.status
                        )}`}
                      >
                        {
                          statusLabels[
                            reservation.status
                          ]
                        }
                      </span>
                    </div>

                    <div className="mt-5 space-y-2 text-sm text-slate-400">
                      <p>
                        Oda tipi:{" "}
                        {roomType?.name ??
                          "Belirtilmedi"}
                      </p>

                      <p>
                        Oda:{" "}
                        {room
                          ? `Oda ${room.room_number}`
                          : "Henüz atanmadı"}
                      </p>

                      <p>
                        Tarih:{" "}
                        {formatDate(
                          reservation.check_in
                        )}
                        {" – "}
                        {formatDate(
                          reservation.check_out
                        )}
                      </p>

                      <p>
                        {
                          reservation.adults
                        }{" "}
                        yetişkin ·{" "}
                        {
                          reservation.children
                        }{" "}
                        çocuk ·{" "}
                        {
                          reservation.nights
                        }{" "}
                        gece
                      </p>

                      <p>
                        Kaynak:{" "}
                        {
                          sourceLabels[
                            reservation.source
                          ]
                        }
                      </p>
                    </div>

                    <p className="mt-5 text-3xl font-black text-emerald-400">
                      {money(
                        reservation.total_price,
                        reservation.currency
                      )}
                    </p>

                    <p className="mt-2 text-sm font-bold text-red-400">
                      Bakiye:{" "}
                      {money(
                        reservation.balance,
                        reservation.currency
                      )}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={
                          isDeleting
                        }
                        onClick={() =>
                          editReservation(
                            reservation
                          )
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black disabled:opacity-50"
                      >
                        <FaEdit />
                        Düzenle
                      </button>

                      <button
                        type="button"
                        disabled={
                          isDeleting
                        }
                        onClick={() =>
                          void handleDelete(
                            reservation
                          )
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-500/15 font-black text-red-400 disabled:opacity-50"
                      >
                        <FaTrash />

                        {isDeleting
                          ? "Siliniyor..."
                          : "Sil"}
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </section>
        )}

        {filteredReservations.length ===
          0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-400">
            Filtrelere uygun rezervasyon
            bulunmuyor.
          </div>
        )}
      </div>
    </main>
  );
}
