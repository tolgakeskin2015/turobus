
import {
  supabase,
} from "@/lib/supabase";


export type DepartureReadiness = {
  booking_id: string;

  ready: boolean;
  score: number;

  blocker_count: number;

  blockers:
    Array<{
      code: string;
      label: string;
    }>;

  manifest_count: number;
  manifest_checked: number;
  guest_count: number;

  captain_ready: boolean;

  required_checklist_total: number;
  required_checklist_completed: number;
  required_checklist_open: number;

  service_blockers: number;
  incident_blockers: number;

  payment_blocker: boolean;

  requires_full_payment: boolean;

  departure_override_active: boolean;

  departure_override_reason:
    string | null;
};


export type DepartureChecklistItem = {
  id: string;
  company_id: string;
  booking_id: string;
  yacht_id: string;

  category: string;

  title: string;

  description:
    string | null;

  is_required: boolean;
  is_completed: boolean;

  completed_by:
    string | null;

  completed_at:
    string | null;

  note:
    string | null;

  sort_order: number;
};


export type YachtIncident = {
  id: string;
  company_id: string;
  booking_id: string;
  yacht_id: string;

  severity: string;
  category: string;

  title: string;

  description:
    string | null;

  status: string;

  occurred_at: string;

  resolved_at:
    string | null;

  created_at: string;
};


export async function loadYachtDispatchCenter(
  companyId: string
) {

  const [
    bookings,
    yachts,
    checklist,
    incidents,
    crew,
    guests,
    services,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_bookings"
        )
        .select(
          "id,yacht_id,booking_code,guest_name,guest_phone,guest_count,start_date,end_date,start_time,end_time,status,operation_status,check_in_status,meeting_point,meeting_time,total_amount,paid_amount,payment_status,requires_full_payment_before_departure,departure_override_reason,departure_override_at,actual_departure_at,actual_return_at"
        )
        .eq(
          "company_id",
          companyId
        )
        .neq(
          "status",
          "cancelled"
        )
        .order(
          "start_date",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "yacht_os_yachts"
        )
        .select(
          "id,name,yacht_type,city,marina,captain_name,status"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_departure_checklist"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "sort_order"
        ),

      supabase
        .from(
          "yacht_os_incidents"
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
          "yacht_os_booking_crew"
        )
        .select(
          "id,booking_id,full_name,role,status"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_booking_guests"
        )
        .select(
          "id,booking_id,full_name,check_in_status"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_booking_services"
        )
        .select(
          "id,booking_id,title,status,is_departure_blocker"
        )
        .eq(
          "company_id",
          companyId
        ),
    ]);


  const error =
    bookings.error ??
    yachts.error ??
    checklist.error ??
    incidents.error ??
    crew.error ??
    guests.error ??
    services.error;


  if (error) {
    throw error;
  }


  return {
    bookings:
      bookings.data ??
      [],

    yachts:
      yachts.data ??
      [],

    checklist:
      (
        checklist.data ??
        []
      ) as
        DepartureChecklistItem[],

    incidents:
      (
        incidents.data ??
        []
      ) as
        YachtIncident[],

    crew:
      crew.data ??
      [],

    guests:
      guests.data ??
      [],

    services:
      services.data ??
      [],
  };
}


export async function getYachtDepartureReadiness(
  bookingId: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_get_departure_readiness",
      {
        p_booking_id:
          bookingId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    DepartureReadiness;
}


export async function seedYachtDepartureChecklist(
  bookingId: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_seed_departure_checklist",
      {
        p_booking_id:
          bookingId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function toggleYachtDepartureChecklist(
  itemId: string,
  completed: boolean
) {

  const {
    data:
      userData,
  } =
    await supabase.auth
      .getUser();


  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_departure_checklist"
      )
      .update({
        is_completed:
          completed,

        completed_by:
          completed
            ? userData.user?.id ??
              null
            : null,

        completed_at:
          completed
            ? new Date()
                .toISOString()
            : null,
      })
      .eq(
        "id",
        itemId
      );


  if (error) {
    throw error;
  }
}


export async function addYachtIncident(
  input: {
    companyId: string;
    bookingId: string;
    yachtId: string;

    severity: string;
    category: string;

    title: string;

    description?: string;
  }
) {

  const {
    data:
      userData,
  } =
    await supabase.auth
      .getUser();


  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_incidents"
      )
      .insert({
        company_id:
          input.companyId,

        booking_id:
          input.bookingId,

        yacht_id:
          input.yachtId,

        severity:
          input.severity,

        category:
          input.category,

        title:
          input.title,

        description:
          input.description ??
          null,

        created_by:
          userData.user?.id ??
          null,
      });


  if (error) {
    throw error;
  }
}


export async function setYachtIncidentStatus(
  incidentId: string,
  status: string
) {

  const {
    data:
      userData,
  } =
    await supabase.auth
      .getUser();


  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_incidents"
      )
      .update({
        status,

        resolved_at:
          [
            "resolved",
            "closed",
          ].includes(
            status
          )
            ? new Date()
                .toISOString()
            : null,

        resolved_by:
          [
            "resolved",
            "closed",
          ].includes(
            status
          )
            ? userData.user?.id ??
              null
            : null,
      })
      .eq(
        "id",
        incidentId
      );


  if (error) {
    throw error;
  }
}


export async function authorizeYachtDepartureOverride(
  bookingId: string,
  reason: string
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_authorize_departure_override",
      {
        p_booking_id:
          bookingId,

        p_reason:
          reason,
      }
    );


  if (error) {
    throw error;
  }
}


export async function setYachtDeparturePaymentRequirement(
  bookingId: string,
  required: boolean
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_set_departure_payment_requirement",
      {
        p_booking_id:
          bookingId,

        p_required:
          required,
      }
    );


  if (error) {
    throw error;
  }
}
