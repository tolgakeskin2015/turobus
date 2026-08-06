import { supabase } from "@/lib/supabase";
import {
  ReservationSource,
  ReservationStatus,
} from "@/components/hotel/reservations/ReservationForm";
import { checkHotelAvailability } from "@/lib/hotel/availability-engine";

export type ReservationPayload = {
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  room_id: string | null;
  reservation_no: string;
  source: ReservationSource;
  status: ReservationStatus;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  nights: number;
  currency: string;
  base_price: number;
  total_price: number;
  balance: number;
  notes: string | null;
  updated_at: string;
};

export type ReservationRecord = ReservationPayload & {
  id: string;
  created_at: string;
  created_by: string | null;

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
      }
    | {
        id: string;
        room_number: string;
      }[]
    | null;
};

export type ReservationSaveInput = {
  payload: ReservationPayload;
  editingId?: string | null;
  createdBy?: string | null;
};

export function getReservationErrorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message = String(
      (
        error as {
          message?: unknown;
        }
      ).message ?? ""
    );

    if (
      message.includes(
        "bu oda tipinde müsaitlik yok"
      )
    ) {
      return message;
    }

    if (
      message.includes(
        "duplicate key value violates unique constraint"
      )
    ) {
      return "Bu rezervasyon numarası daha önce kullanılmış.";
    }

    if (
      message.includes(
        "violates row-level security policy"
      )
    ) {
      return "Bu işlem için şirket yetkiniz bulunmuyor.";
    }

    if (message) {
      return message;
    }
  }

  return "Rezervasyon işlemi tamamlanamadı.";
}

export async function getReservations(
  companyId: string
): Promise<ReservationRecord[]> {
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
      base_price,
      total_price,
      balance,
      notes,
      created_at,
      created_by,
      updated_at,
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
        room_number
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (
    (data ?? []) as unknown as ReservationRecord[]
  );
}

export async function saveReservation(
  input: ReservationSaveInput
): Promise<void> {
  const {
    payload,
    editingId = null,
    createdBy = null,
  } = input;

  /*
   * Kullanıcıya kaydetmeden önce anlaşılır
   * müsaitlik uyarısı göstermek için ön kontrol.
   *
   * Asıl kesin kontrol Supabase trigger'ıdır.
   */
  if (
    !["cancelled", "no_show"].includes(
      payload.status
    )
  ) {
    const availability =
      await checkHotelAvailability({
        companyId: payload.company_id,
        hotelId: payload.hotel_id,
        roomTypeId: payload.room_type_id,
        checkIn: payload.check_in,
        checkOut: payload.check_out,
        requestedRooms: 1,
        excludeReservationId: editingId,
      });

    if (!availability.available) {
      throw new Error(
        availability.reason ??
          "Seçilen tarihlerde yeterli müsaitlik bulunmuyor."
      );
    }
  }

  /*
   * Fiziksel oda seçildiyse aynı odadaki
   * tarih çakışmasını ayrıca kontrol et.
   */
  if (
    payload.room_id &&
    !["cancelled", "no_show"].includes(
      payload.status
    )
  ) {
    let conflictQuery = supabase
      .from("hotel_reservations")
      .select("id")
      .eq("company_id", payload.company_id)
      .eq("room_id", payload.room_id)
      .in("status", [
        "pending",
        "confirmed",
        "checked_in",
      ])
      .lt("check_in", payload.check_out)
      .gt("check_out", payload.check_in);

    if (editingId) {
      conflictQuery = conflictQuery.neq(
        "id",
        editingId
      );
    }

    const {
      data: conflictData,
      error: conflictError,
    } = await conflictQuery.limit(1);

    if (conflictError) {
      throw conflictError;
    }

    if (conflictData?.length) {
      throw new Error(
        "Seçilen fiziksel oda bu tarih aralığında başka bir rezervasyona atanmış."
      );
    }
  }

  if (editingId) {
    const { error } = await supabase
      .from("hotel_reservations")
      .update(payload)
      .eq("id", editingId)
      .eq("company_id", payload.company_id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from("hotel_reservations")
    .insert({
      ...payload,
      created_by: createdBy,
    });

  /*
   * Supabase trigger müsaitlik yoksa burada
   * P0001 hatası döndürür. Hata asla yutulmaz.
   */
  if (error) {
    throw error;
  }
}

export async function deleteReservation(
  companyId: string,
  reservationId: string
): Promise<void> {
  const { error } = await supabase
    .from("hotel_reservations")
    .delete()
    .eq("id", reservationId)
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }
}
