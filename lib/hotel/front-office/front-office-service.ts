import { supabase } from "@/lib/supabase";

export type FrontOfficeStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type FrontOfficeReservation = {
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

  room:
    | {
        id: string;
        room_number: string;
        room_status: string;
        housekeeping_status: string;
      }
    | {
        id: string;
        room_number: string;
        room_status: string;
        housekeeping_status: string;
      }[]
    | null;
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
        "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export async function getFrontOfficeReservations(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<FrontOfficeReservation[]> {
  const { data, error } = await supabase
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
    .or(
      `and(check_in.gte.${startDate},check_in.lte.${endDate}),` +
        `and(check_out.gte.${startDate},check_out.lte.${endDate}),` +
        `status.eq.checked_in`
    )
    .order("check_in")
    .order("reservation_no");

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }

  return (
    (data ??
      []) as unknown as FrontOfficeReservation[]
  );
}

export async function checkInReservation(
  companyId: string,
  reservationId: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "hotel_check_in",
    {
      p_company_id: companyId,
      p_reservation_id: reservationId,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }
}

export async function checkOutReservation(
  companyId: string,
  reservationId: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "hotel_check_out",
    {
      p_company_id: companyId,
      p_reservation_id: reservationId,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }
}
