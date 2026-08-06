import { supabase } from "@/lib/supabase";

export type AuditWarning = {
  type: string;
  severity:
    | "normal"
    | "high"
    | "urgent";
  message: string;
};

export type NightAudit = {
  id: string;
  company_id: string;
  hotel_id: string | null;
  business_date: string;
  status:
    | "running"
    | "completed"
    | "failed"
    | "reopened";

  reservation_count: number;
  arrival_count: number;
  departure_count: number;
  in_house_count: number;
  no_show_count: number;

  room_revenue: number;
  extra_revenue: number;
  payment_total: number;
  refund_total: number;
  outstanding_balance: number;

  dirty_room_count: number;
  unassigned_reservation_count: number;
  overdue_checkout_count: number;
  open_folio_count: number;

  warnings: AuditWarning[];
  summary: {
    gross_revenue?: number;
    net_collection?: number;
    warning_count?: number;
  };

  completed_at: string | null;
  created_at: string;

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
};

export type AuditHotel = {
  id: string;
  name: string;
};

function getMessage(
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

export async function getAuditData(
  companyId: string
): Promise<{
  hotels: AuditHotel[];
  audits: NightAudit[];
}> {
  const [
    {
      data: hotelData,
      error: hotelError,
    },
    {
      data: auditData,
      error: auditError,
    },
  ] = await Promise.all([
    supabase
      .from("hotels")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("hotel_night_audits")
      .select(`
        *,
        hotel:hotels (
          id,
          name
        )
      `)
      .eq("company_id", companyId)
      .order("business_date", {
        ascending: false,
      })
      .limit(60),
  ]);

  const error =
    hotelError ?? auditError;

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return {
    hotels:
      (hotelData ??
        []) as AuditHotel[],

    audits:
      (auditData ??
        []) as unknown as NightAudit[],
  };
}

export async function runNightAudit(
  companyId: string,
  hotelId: string,
  businessDate: string
): Promise<NightAudit> {
  const { data, error } = await supabase
    .rpc(
      "run_hotel_night_audit",
      {
        p_company_id: companyId,
        p_hotel_id: hotelId,
        p_business_date:
          businessDate,
      }
    );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return data as NightAudit;
}

export async function reopenNightAudit(
  companyId: string,
  auditId: string
): Promise<void> {
  const { error } = await supabase
    .from("hotel_night_audits")
    .update({
      status: "reopened",
      completed_at: null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", auditId);

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}
