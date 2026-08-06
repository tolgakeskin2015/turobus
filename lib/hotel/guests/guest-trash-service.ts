import { supabase } from "@/lib/supabase";
import type {
  HotelGuest,
} from "@/lib/hotel/guests/guest-service";

export type DeletedHotelGuest =
  HotelGuest & {
    deleted_at: string;
    deleted_by: string | null;
    deletion_reason: string | null;
  };

export type GuestAuditLog = {
  id: string;
  company_id: string;
  guest_id: string | null;
  guest_name: string | null;
  action_type: string;
  description: string | null;
  old_values:
    | Record<string, unknown>
    | null;
  new_values:
    | Record<string, unknown>
    | null;
  performed_by: string | null;
  created_at: string;
};

function message(
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

export async function softDeleteGuest(
  companyId: string,
  guestId: string,
  reason?: string | null
): Promise<void> {
  const { error } = await supabase.rpc(
    "soft_delete_hotel_guest",
    {
      p_company_id: companyId,
      p_guest_id: guestId,
      p_reason: reason ?? null,
    }
  );

  if (error) {
    throw new Error(
      message(error)
    );
  }
}

export async function getGuestTrashData(
  companyId: string
): Promise<{
  guests: DeletedHotelGuest[];
  logs: GuestAuditLog[];
}> {
  const [
    guestResult,
    logResult,
  ] = await Promise.all([
    supabase
      .from("hotel_guests")
      .select("*")
      .eq("company_id", companyId)
      .not("deleted_at", "is", null)
      .order("deleted_at", {
        ascending: false,
      }),

    supabase
      .from("hotel_guest_audit_logs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      })
      .limit(250),
  ]);

  const error =
    guestResult.error ??
    logResult.error;

  if (error) {
    throw new Error(
      message(error)
    );
  }

  return {
    guests:
      (guestResult.data ??
        []) as DeletedHotelGuest[],

    logs:
      (logResult.data ??
        []) as GuestAuditLog[],
  };
}

export async function restoreGuest(
  companyId: string,
  guestId: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "restore_hotel_guest",
    {
      p_company_id: companyId,
      p_guest_id: guestId,
    }
  );

  if (error) {
    throw new Error(
      message(error)
    );
  }
}

export async function permanentlyDeleteGuest(
  companyId: string,
  guestId: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "permanently_delete_hotel_guest",
    {
      p_company_id: companyId,
      p_guest_id: guestId,
    }
  );

  if (error) {
    throw new Error(
      message(error)
    );
  }
}

export async function emptyGuestTrash(
  companyId: string
): Promise<number> {
  const { data, error } =
    await supabase.rpc(
      "empty_hotel_guest_trash",
      {
        p_company_id: companyId,
      }
    );

  if (error) {
    throw new Error(
      message(error)
    );
  }

  return Number(data ?? 0);
}
