
import {
  supabase,
} from "@/lib/supabase";


export type YachtOperationBooking = {
  id: string;
  yacht_id: string;

  booking_code: string;

  guest_name: string;
  guest_phone:
    string | null;

  guest_count: number;

  start_date: string;
  end_date: string;

  departure_time:
    string | null;

  return_time:
    string | null;

  status: string;

  operation_status: string;

  check_in_status: string;

  meeting_point:
    string | null;

  meeting_time:
    string | null;

  checked_in_at:
    string | null;

  no_show_at:
    string | null;

  actual_departure_at:
    string | null;

  actual_return_at:
    string | null;

  operation_note:
    string | null;

  total_amount: number;
  paid_amount: number;

  payment_status: string;

  created_at: string;
};


export type YachtOperationGuest = {
  id: string;
  company_id: string;
  booking_id: string;

  full_name: string;

  phone:
    string | null;

  nationality:
    string | null;

  identity_document:
    string | null;

  birth_date:
    string | null;

  is_lead_guest: boolean;

  check_in_status: string;

  checked_in_at:
    string | null;

  note:
    string | null;
};


export type YachtOperationCrew = {
  id: string;
  booking_id: string;
  yacht_id: string;

  full_name: string;
  role: string;

  phone:
    string | null;

  status: string;

  note:
    string | null;
};


export type YachtOperationService = {
  id: string;
  booking_id: string;

  service_type: string;

  title: string;

  supplier_name:
    string | null;

  quantity: number;

  cost_amount: number;
  sale_amount: number;

  currency: string;

  status: string;

  due_at:
    string | null;

  note:
    string | null;
};


export type YachtOperationEvent = {
  id: string;
  booking_id: string;
  yacht_id: string;

  event_type: string;
  event_label: string;

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

  note:
    string | null;

  created_at: string;
};


export async function loadYachtOperationCenter(
  companyId: string
) {

  const [
    bookings,
    yachts,
    guests,
    crew,
    services,
    events,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_bookings"
        )
        .select(
          "id,yacht_id,booking_code,guest_name,guest_phone,guest_count,start_date,end_date,departure_time,return_time,status,operation_status,check_in_status,meeting_point,meeting_time,checked_in_at,no_show_at,actual_departure_at,actual_return_at,operation_note,total_amount,paid_amount,payment_status,created_at"
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
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "yacht_os_booking_guests"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_booking_crew"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_booking_services"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_operation_events"
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
        )
        .limit(
          300
        ),
    ]);


  const error =
    bookings.error ??
    yachts.error ??
    guests.error ??
    crew.error ??
    services.error ??
    events.error;


  if (error) {
    throw error;
  }


  return {
    bookings:
      (
        bookings.data ??
        []
      ) as
        YachtOperationBooking[],

    yachts:
      yachts.data ??
      [],

    guests:
      (
        guests.data ??
        []
      ) as
        YachtOperationGuest[],

    crew:
      (
        crew.data ??
        []
      ) as
        YachtOperationCrew[],

    services:
      (
        services.data ??
        []
      ) as
        YachtOperationService[],

    events:
      (
        events.data ??
        []
      ) as
        YachtOperationEvent[],
  };
}


export async function runYachtOperationAction(
  bookingId: string,
  action: string,
  note?: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_operation_action",
      {
        p_booking_id:
          bookingId,

        p_action:
          action,

        p_note:
          note ??
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function updateYachtOperationPlan(
  input: {
    bookingId: string;

    meetingPoint?: string;

    meetingTime?: string;

    note?: string;
  }
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_update_operation_plan",
      {
        p_booking_id:
          input.bookingId,

        p_meeting_point:
          input.meetingPoint ??
          null,

        p_meeting_time:
          input.meetingTime
            ? new Date(
                input.meetingTime
              ).toISOString()
            : null,

        p_note:
          input.note ??
          null,
      }
    );


  if (error) {
    throw error;
  }
}


export async function addYachtManifestGuest(
  input: {
    companyId: string;
    bookingId: string;

    fullName: string;
    phone?: string;
    nationality?: string;
    identityDocument?: string;

    lead?: boolean;

    note?: string;
  }
) {

  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_booking_guests"
      )
      .insert({
        company_id:
          input.companyId,

        booking_id:
          input.bookingId,

        full_name:
          input.fullName,

        phone:
          input.phone ??
          null,

        nationality:
          input.nationality ??
          null,

        identity_document:
          input.identityDocument ??
          null,

        is_lead_guest:
          input.lead ??
          false,

        note:
          input.note ??
          null,
      });


  if (error) {
    throw error;
  }
}


export async function setYachtManifestGuestStatus(
  guestId: string,
  status: string
) {

  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_booking_guests"
      )
      .update({
        check_in_status:
          status,

        checked_in_at:
          [
            "checked_in",
            "boarded",
          ].includes(
            status
          )
            ? new Date()
                .toISOString()
            : null,
      })
      .eq(
        "id",
        guestId
      );


  if (error) {
    throw error;
  }
}


export async function addYachtCrew(
  input: {
    companyId: string;
    bookingId: string;
    yachtId: string;

    fullName: string;
    role: string;

    phone?: string;
    note?: string;
  }
) {

  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_booking_crew"
      )
      .insert({
        company_id:
          input.companyId,

        booking_id:
          input.bookingId,

        yacht_id:
          input.yachtId,

        full_name:
          input.fullName,

        role:
          input.role,

        phone:
          input.phone ??
          null,

        note:
          input.note ??
          null,
      });


  if (error) {
    throw error;
  }
}


export async function setYachtCrewStatus(
  crewId: string,
  status: string
) {

  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_booking_crew"
      )
      .update({
        status,
      })
      .eq(
        "id",
        crewId
      );


  if (error) {
    throw error;
  }
}


export async function addYachtOperationService(
  input: {
    companyId: string;
    bookingId: string;

    serviceType: string;

    title: string;

    supplierName?: string;

    quantity: number;

    costAmount: number;
    saleAmount: number;

    currency?: string;

    dueAt?: string;

    note?: string;
  }
) {

  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_booking_services"
      )
      .insert({
        company_id:
          input.companyId,

        booking_id:
          input.bookingId,

        service_type:
          input.serviceType,

        title:
          input.title,

        supplier_name:
          input.supplierName ??
          null,

        quantity:
          input.quantity,

        cost_amount:
          input.costAmount,

        sale_amount:
          input.saleAmount,

        currency:
          input.currency ??
          "TRY",

        due_at:
          input.dueAt
            ? new Date(
                input.dueAt
              ).toISOString()
            : null,

        note:
          input.note ??
          null,
      });


  if (error) {
    throw error;
  }
}


export async function setYachtOperationServiceStatus(
  serviceId: string,
  status: string
) {

  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_booking_services"
      )
      .update({
        status,
      })
      .eq(
        "id",
        serviceId
      );


  if (error) {
    throw error;
  }
}
