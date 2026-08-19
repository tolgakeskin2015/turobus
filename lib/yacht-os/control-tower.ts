
import {
  supabase,
} from "@/lib/supabase";


export type PartnerChangeRequest = {
  id: string;
  company_id: string;
  supplier_id: string;
  yacht_id:
    string | null;
  booking_id:
    string | null;
  request_type: string;
  old_value:
    Record<
      string,
      unknown
    > | null;
  proposed_value:
    Record<
      string,
      unknown
    >;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "auto_applied"
    | "cancelled";
  risk_level:
    | "low"
    | "normal"
    | "high"
    | "critical";
  supplier_note:
    string | null;
  review_note:
    string | null;
  reviewed_by:
    string | null;
  reviewed_at:
    string | null;
  created_at: string;
  updated_at: string;
};


export type PartnerTowerSupplier = {
  id: string;
  name: string;
  contact_name:
    string | null;
  phone:
    string | null;
  email:
    string | null;
  commission_rate: number;
  rating:
    number | null;
  status: string;
  portal_token: string;
};


export type PartnerTowerBooking = {
  id: string;
  yacht_id: string;
  booking_code: string;
  guest_name: string;
  start_date: string;
  end_date: string;
  status: string;
  supplier_decision:
    string | null;
  supplier_decision_at:
    string | null;
  created_at: string;
  total_amount: number;
  supplier_cost: number;
  commission_amount: number;
};


export type PartnerTowerYacht = {
  id: string;
  name: string;
  city: string;
  marina:
    string | null;
  status: string;
  base_daily_price: number;
};


export type PartnerTowerAssignment = {
  supplier_id: string;
  yacht_id: string;
};


export type PartnerTowerEvent = {
  id: string;
  supplier_id: string;
  yacht_id:
    string | null;
  booking_id:
    string | null;
  event_type: string;
  old_value:
    Record<
      string,
      unknown
    > | null;
  new_value:
    Record<
      string,
      unknown
    > | null;
  created_at: string;
};


export async function loadYachtControlTower(
  companyId: string
) {
  const [
    suppliers,
    yachts,
    assignments,
    bookings,
    requests,
    events,
  ] =
    await Promise.all([
      supabase
        .from(
          "yacht_os_suppliers"
        )
        .select(
          "id,name,contact_name,phone,email,commission_rate,rating,status,portal_token"
        )
        .eq(
          "company_id",
          companyId
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "yacht_os_yachts"
        )
        .select(
          "id,name,city,marina,status,base_daily_price"
        )
        .eq(
          "company_id",
          companyId
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "yacht_os_supplier_yachts"
        )
        .select(
          "supplier_id,yacht_id"
        ),

      supabase
        .from(
          "yacht_os_bookings"
        )
        .select(
          "id,yacht_id,booking_code,guest_name,start_date,end_date,status,supplier_decision,supplier_decision_at,created_at,total_amount,supplier_cost,commission_amount"
        )
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "yacht_os_partner_change_requests"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "yacht_os_supplier_portal_events"
        )
        .select(
          "id,supplier_id,yacht_id,booking_id,event_type,old_value,new_value,created_at"
        )
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          250
        ),
    ]);

  const error =
    suppliers.error ??
    yachts.error ??
    assignments.error ??
    bookings.error ??
    requests.error ??
    events.error;

  if (error) {
    throw error;
  }

  return {
    suppliers:
      (
        suppliers.data ??
        []
      ) as
        PartnerTowerSupplier[],

    yachts:
      (
        yachts.data ??
        []
      ) as
        PartnerTowerYacht[],

    assignments:
      (
        assignments.data ??
        []
      ) as
        PartnerTowerAssignment[],

    bookings:
      (
        bookings.data ??
        []
      ) as
        PartnerTowerBooking[],

    requests:
      (
        requests.data ??
        []
      ) as
        PartnerChangeRequest[],

    events:
      (
        events.data ??
        []
      ) as
        PartnerTowerEvent[],
  };
}


export async function approvePartnerChange(
  requestId: string,
  note?: string
) {
  const {
    error,
  } =
    await supabase.rpc(
      "approve_yacht_partner_change_request",
      {
        p_request_id:
          requestId,

        p_review_note:
          note ??
          null,
      }
    );

  if (error) {
    throw error;
  }
}


export async function rejectPartnerChange(
  requestId: string,
  note?: string
) {
  const {
    error,
  } =
    await supabase.rpc(
      "reject_yacht_partner_change_request",
      {
        p_request_id:
          requestId,

        p_review_note:
          note ??
          null,
      }
    );

  if (error) {
    throw error;
  }
}
