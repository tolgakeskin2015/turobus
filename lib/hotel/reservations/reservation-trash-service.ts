import { supabase } from "@/lib/supabase";

export type DeletedReservation = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  room_id: string | null;

  reservation_no: string;
  source: string;
  status: string;

  check_in: string;
  check_out: string;

  adults: number;
  children: number;
  nights: number;

  currency: string;
  total_price: number;
  balance: number;

  notes: string | null;

  deleted_at: string;
  deleted_by: string | null;
  deletion_reason: string | null;

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

export type ReservationAuditLog = {
  id: string;
  reservation_id: string | null;
  reservation_no: string | null;
  action_type: string;
  description: string | null;
  created_at: string;
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

export async function softDeleteReservation(
  companyId: string,
  reservationId: string,
  reason?: string | null
): Promise<void> {
  const { error } = await supabase.rpc(
    "soft_delete_hotel_reservation",
    {
      p_company_id: companyId,
      p_reservation_id:
        reservationId,
      p_reason: reason ?? null,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }
}

export async function getReservationTrashData(
  companyId: string
): Promise<{
  reservations: DeletedReservation[];
  logs: ReservationAuditLog[];
}> {
  const [
    reservationResult,
    logResult,
  ] = await Promise.all([
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
        deleted_at,
        deleted_by,
        deletion_reason,
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
      .not("deleted_at", "is", null)
      .order("deleted_at", {
        ascending: false,
      }),

    supabase
      .from(
        "hotel_reservation_audit_logs"
      )
      .select(`
        id,
        reservation_id,
        reservation_no,
        action_type,
        description,
        created_at
      `)
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      })
      .limit(300),
  ]);

  const error =
    reservationResult.error ??
    logResult.error;

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }

  return {
    reservations:
      (reservationResult.data ??
        []) as unknown as
        DeletedReservation[],

    logs:
      (logResult.data ??
        []) as ReservationAuditLog[],
  };
}

export async function restoreReservation(
  companyId: string,
  reservationId: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "restore_hotel_reservation",
    {
      p_company_id: companyId,
      p_reservation_id:
        reservationId,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }
}

export async function permanentlyDeleteReservation(
  companyId: string,
  reservationId: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "permanently_delete_hotel_reservation",
    {
      p_company_id: companyId,
      p_reservation_id:
        reservationId,
    }
  );

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }
}
