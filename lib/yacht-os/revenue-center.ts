import {
  supabase,
} from "@/lib/supabase";


export type YachtRatePlan = {
  id: string;

  company_id: string;
  yacht_id: string;

  name: string;

  start_date: string;
  end_date: string;

  weekday_price: number;

  weekend_price:
    number | null;

  minimum_days: number;

  priority: number;

  currency: string;

  status: string;

  note:
    string | null;

  created_at: string;
};


export type YachtRateEvent = {
  id: string;

  yacht_id: string;

  event_type: string;
  event_label: string;

  date_from:
    string | null;

  date_to:
    string | null;

  payload:
    Record<
      string,
      unknown
    > | null;

  created_at: string;
};


export async function loadYachtRevenueCenter(
  companyId: string
) {

  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  const future =
    new Date();

  future.setDate(
    future.getDate() +
    365
  );


  const futureDate =
    future
      .toISOString()
      .slice(
        0,
        10
      );


  const [
    yachts,
    plans,
    calendar,
    bookings,
    events,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_yachts"
        )
        .select(
          "id,name,yacht_type,city,marina,status,base_daily_price,currency,minimum_days"
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
          "yacht_os_rate_plans"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
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
          "yacht_os_availability"
        )
        .select(
          "id,yacht_id,day,status,price,booking_id,maintenance_id"
        )
        .eq(
          "company_id",
          companyId
        )
        .gte(
          "day",
          today
        )
        .lte(
          "day",
          futureDate
        )
        .order(
          "day"
        ),

      supabase
        .from(
          "yacht_os_bookings"
        )
        .select(
          "id,yacht_id,total_amount,paid_amount,start_date,end_date,status,currency"
        )
        .eq(
          "company_id",
          companyId
        )
        .neq(
          "status",
          "cancelled"
        ),

      supabase
        .from(
          "yacht_os_rate_events"
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
          250
        ),
    ]);


  const error =
    yachts.error ??
    plans.error ??
    calendar.error ??
    bookings.error ??
    events.error;


  if (error) {
    throw error;
  }


  return {
    yachts:
      yachts.data ??
      [],

    plans:
      (
        plans.data ??
        []
      ) as YachtRatePlan[],

    calendar:
      calendar.data ??
      [],

    bookings:
      bookings.data ??
      [],

    events:
      (
        events.data ??
        []
      ) as YachtRateEvent[],
  };
}


export async function createYachtRatePlan(
  input: {
    yachtId: string;

    name: string;

    startDate: string;
    endDate: string;

    weekdayPrice: number;

    weekendPrice?: number;

    minimumDays: number;

    priority: number;

    currency?: string;

    note?: string;
  }
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_create_rate_plan",
      {
        p_yacht_id:
          input.yachtId,

        p_name:
          input.name,

        p_start_date:
          input.startDate,

        p_end_date:
          input.endDate,

        p_weekday_price:
          input.weekdayPrice,

        p_weekend_price:
          input.weekendPrice ??
          null,

        p_minimum_days:
          input.minimumDays,

        p_priority:
          input.priority,

        p_currency:
          input.currency ??
          "TRY",

        p_note:
          input.note ??
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function setYachtRatePlanStatus(
  ratePlanId: string,
  status: string
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_set_rate_plan_status",
      {
        p_rate_plan_id:
          ratePlanId,

        p_status:
          status,
      }
    );


  if (error) {
    throw error;
  }
}


export async function publishYachtRateCalendar(
  yachtId: string,
  dateFrom: string,
  dateTo: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_publish_rate_calendar",
      {
        p_yacht_id:
          yachtId,

        p_date_from:
          dateFrom,

        p_date_to:
          dateTo,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function updateYachtBaseRate(
  yachtId: string,
  baseDailyPrice: number,
  minimumDays: number
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_update_base_rate",
      {
        p_yacht_id:
          yachtId,

        p_base_daily_price:
          baseDailyPrice,

        p_minimum_days:
          minimumDays,
      }
    );


  if (error) {
    throw error;
  }
}
