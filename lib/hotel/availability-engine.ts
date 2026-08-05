import { supabase } from "@/lib/supabase";

export type AvailabilityRequest = {
  companyId: string;
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  requestedRooms?: number;
  excludeReservationId?: string | null;
};

export type NightAvailability = {
  date: string;
  totalInventory: number;
  existingReservations: number;
  blockedInventory: number;
  availableInventory: number;
};

export type AvailabilityResult = {
  available: boolean;
  requestedRooms: number;
  nights: number;
  minimumAvailable: number;
  unavailableDates: NightAvailability[];
  dates: NightAvailability[];
  reason: string | null;
};

type ReservationRow = {
  id: string;
  check_in: string;
  check_out: string;
};

type InventoryRow = {
  inventory_date: string;
  total_inventory: number | null;
  blocked_inventory: number | null;
  stop_sale: boolean | null;
  closed_to_arrival: boolean | null;
  closed_to_departure: boolean | null;
  minimum_stay: number | null;
};

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getNightDates(
  checkIn: string,
  checkOut: string
): string[] {
  const dates: string[] = [];
  const cursor = parseDate(checkIn);
  const end = parseDate(checkOut);

  while (cursor < end) {
    dates.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function getNightCount(
  checkIn: string,
  checkOut: string
): number {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);

  return Math.round(
    (end.getTime() - start.getTime()) / 86400000
  );
}

function reservationIncludesNight(
  reservation: ReservationRow,
  night: string
): boolean {
  return (
    reservation.check_in <= night &&
    reservation.check_out > night
  );
}

export async function checkHotelAvailability(
  request: AvailabilityRequest
): Promise<AvailabilityResult> {
  const requestedRooms = Math.max(
    1,
    Number(request.requestedRooms ?? 1)
  );

  const nights = getNightCount(
    request.checkIn,
    request.checkOut
  );

  if (
    !request.companyId ||
    !request.hotelId ||
    !request.roomTypeId
  ) {
    return {
      available: false,
      requestedRooms,
      nights,
      minimumAvailable: 0,
      unavailableDates: [],
      dates: [],
      reason:
        "Otel ve oda tipi seçimi tamamlanmalıdır.",
    };
  }

  if (nights < 1) {
    return {
      available: false,
      requestedRooms,
      nights,
      minimumAvailable: 0,
      unavailableDates: [],
      dates: [],
      reason:
        "Çıkış tarihi giriş tarihinden sonra olmalıdır.",
    };
  }

  const nightDates = getNightDates(
    request.checkIn,
    request.checkOut
  );

  const {
    data: roomTypeData,
    error: roomTypeError,
  } = await supabase
    .from("hotel_room_types")
    .select("id, total_rooms")
    .eq("id", request.roomTypeId)
    .eq("hotel_id", request.hotelId)
    .eq("company_id", request.companyId)
    .single();

  if (roomTypeError) {
    throw roomTypeError;
  }

  const roomTypeCapacity = Math.max(
    0,
    Number(roomTypeData?.total_rooms ?? 0)
  );

  if (roomTypeCapacity < 1) {
    return {
      available: false,
      requestedRooms,
      nights,
      minimumAvailable: 0,
      unavailableDates: [],
      dates: [],
      reason:
        "Bu oda tipi için toplam oda sayısı tanımlanmamış.",
    };
  }

  let reservationQuery = supabase
    .from("hotel_reservations")
    .select("id, check_in, check_out")
    .eq("company_id", request.companyId)
    .eq("hotel_id", request.hotelId)
    .eq("room_type_id", request.roomTypeId)
    .in("status", [
      "pending",
      "confirmed",
      "checked_in",
    ])
    .lt("check_in", request.checkOut)
    .gt("check_out", request.checkIn);

  if (request.excludeReservationId) {
    reservationQuery = reservationQuery.neq(
      "id",
      request.excludeReservationId
    );
  }

  const {
    data: reservationData,
    error: reservationError,
  } = await reservationQuery;

  if (reservationError) {
    throw reservationError;
  }

  const {
    data: inventoryData,
    error: inventoryError,
  } = await supabase
    .from("hotel_inventory")
    .select(`
      inventory_date,
      total_inventory,
      blocked_inventory,
      stop_sale,
      closed_to_arrival,
      closed_to_departure,
      minimum_stay
    `)
    .eq("company_id", request.companyId)
    .eq("hotel_id", request.hotelId)
    .eq("room_type_id", request.roomTypeId)
    .gte("inventory_date", request.checkIn)
    .lt("inventory_date", request.checkOut);

  if (inventoryError) {
    throw inventoryError;
  }

  const reservations =
    (reservationData ?? []) as ReservationRow[];

  const inventoryRows =
    (inventoryData ?? []) as InventoryRow[];

  const dates: NightAvailability[] = nightDates.map(
    (night, index) => {
      const inventory = inventoryRows.find(
        (row) => row.inventory_date === night
      );

      /*
       * Veritabanındaki günlük kontenjan, oda tipi
       * kapasitesinden büyük olsa bile kapasiteyi aşamaz.
       */
      const dailyInventory =
        inventory?.total_inventory == null
          ? roomTypeCapacity
          : Math.min(
              roomTypeCapacity,
              Math.max(
                0,
                Number(inventory.total_inventory)
              )
            );

      const existingReservations =
        reservations.filter((reservation) =>
          reservationIncludesNight(
            reservation,
            night
          )
        ).length;

      const blockedInventory = Math.max(
        0,
        Number(
          inventory?.blocked_inventory ?? 0
        )
      );

      const minimumStay = Math.max(
        1,
        Number(inventory?.minimum_stay ?? 1)
      );

      const stopSale =
        inventory?.stop_sale === true;

      const closedToArrival =
        index === 0 &&
        inventory?.closed_to_arrival === true;

      /*
       * Çıkış günü konaklama gecesi değildir.
       * CTD kontrolünü son konaklama gecesindeki
       * kayıt üzerinden uyguluyoruz.
       */
      const closedToDeparture =
        index === nightDates.length - 1 &&
        inventory?.closed_to_departure === true;

      let availableInventory = Math.max(
        0,
        dailyInventory -
          existingReservations -
          blockedInventory
      );

      if (
        stopSale ||
        closedToArrival ||
        closedToDeparture ||
        nights < minimumStay
      ) {
        availableInventory = 0;
      }

      return {
        date: night,
        totalInventory: dailyInventory,
        existingReservations,
        blockedInventory,
        availableInventory,
      };
    }
  );

  const unavailableDates = dates.filter(
    (date) =>
      date.availableInventory < requestedRooms
  );

  const minimumAvailable =
    dates.length === 0
      ? 0
      : Math.min(
          ...dates.map(
            (date) =>
              date.availableInventory
          )
        );

  const firstUnavailable =
    unavailableDates[0];

  return {
    available:
      unavailableDates.length === 0,
    requestedRooms,
    nights,
    minimumAvailable,
    unavailableDates,
    dates,
    reason: firstUnavailable
      ? `${firstUnavailable.date} tarihinde bu oda tipinde yeterli müsaitlik bulunmuyor. Toplam kapasite: ${firstUnavailable.totalInventory}, mevcut rezervasyon: ${firstUnavailable.existingReservations}, bloke: ${firstUnavailable.blockedInventory}.`
      : null,
  };
}
