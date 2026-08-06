import { supabase } from "@/lib/supabase";

export type RevenueHotel = {
  id: string;
  name: string;
};

export type RevenueReservation = {
  id: string;
  hotel_id: string;
  room_type_id: string;
  reservation_no: string;
  source: string;
  status: string;
  check_in: string;
  check_out: string;
  nights: number;
  currency: string;
  total_price: number;
  balance: number;

  hotel:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;

  room_type:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

export type RevenueRoomType = {
  id: string;
  hotel_id: string;
  name: string;
  total_rooms: number | null;
};

export type RevenueCharge = {
  id: string;
  hotel_id: string;
  charge_date: string;
  category: string;
  total_amount: number;
  currency: string;
  status: string;
};

export type RevenuePayment = {
  id: string;
  hotel_id: string;
  payment_date: string;
  transaction_type: "payment" | "refund";
  base_amount: number;
  currency: string;
  status: string;
};

export type RevenueData = {
  hotels: RevenueHotel[];
  roomTypes: RevenueRoomType[];
  reservations: RevenueReservation[];
  charges: RevenueCharge[];
  payments: RevenuePayment[];
};

function errorMessage(
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
        "Revenue verileri alınamadı."
    );
  }

  return "Revenue verileri alınamadı.";
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

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function getRevenueData(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<RevenueData> {
  const endExclusive = addDays(
    endDate,
    1
  );

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
      data: reservationData,
      error: reservationError,
    },
    {
      data: chargeData,
      error: chargeError,
    },
    {
      data: paymentData,
      error: paymentError,
    },
  ] = await Promise.all([
    supabase
      .from("hotels")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("hotel_room_types")
      .select(`
        id,
        hotel_id,
        name,
        total_rooms
      `)
      .eq("company_id", companyId)
      .order("name"),

    supabase
      .from("hotel_reservations")
      .select(`
        id,
        hotel_id,
        room_type_id,
        reservation_no,
        source,
        status,
        check_in,
        check_out,
        nights,
        currency,
        total_price,
        balance,
        hotel:hotels (
          id,
          name
        ),
        room_type:hotel_room_types (
          id,
          name
        )
      `)
      .eq("company_id", companyId)
      .in("status", [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "no_show",
      ])
      .lt("check_in", endExclusive)
      .gt("check_out", startDate)
      .order("check_in"),

    supabase
      .from("hotel_folio_charges")
      .select(`
        id,
        hotel_id,
        charge_date,
        category,
        total_amount,
        currency,
        status
      `)
      .eq("company_id", companyId)
      .eq("status", "posted")
      .gte("charge_date", startDate)
      .lte("charge_date", endDate)
      .order("charge_date"),

    supabase
      .from("hotel_folio_payments")
      .select(`
        id,
        hotel_id,
        payment_date,
        transaction_type,
        base_amount,
        currency,
        status
      `)
      .eq("company_id", companyId)
      .eq("status", "completed")
      .gte(
        "payment_date",
        `${startDate}T00:00:00`
      )
      .lt(
        "payment_date",
        `${endExclusive}T00:00:00`
      )
      .order("payment_date"),
  ]);

  const error =
    hotelError ??
    roomTypeError ??
    reservationError ??
    chargeError ??
    paymentError;

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }

  return {
    hotels:
      (hotelData ??
        []) as RevenueHotel[],

    roomTypes:
      (roomTypeData ??
        []) as RevenueRoomType[],

    reservations:
      (reservationData ??
        []) as unknown as RevenueReservation[],

    charges:
      (chargeData ??
        []) as RevenueCharge[],

    payments:
      (paymentData ??
        []) as RevenuePayment[],
  };
}
