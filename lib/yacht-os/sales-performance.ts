import {
  supabase,
} from "@/lib/supabase";


export async function loadYachtSalesPerformance(
  companyId: string
) {

  const [
    leads,
    quotes,
    bookings,
    activities,
    alarms,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_leads"
        )
        .select(
          "id,source,stage,priority,score,customer_name,preferred_yacht_id,budget_min,budget_max,currency,next_follow_up_at,last_contact_at,lost_reason,won_at,lost_at,converted_quote_id,converted_booking_id,created_at"
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
          "yacht_os_quotes"
        )
        .select(
          "id,lead_id,quote_code,status,sale_price,cost_price,commission_amount,currency,sent_at,viewed_at,accepted_at,converted_booking_id,created_at"
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
          "yacht_os_bookings"
        )
        .select(
          "id,booking_code,total_amount,paid_amount,commission_amount,supplier_cost,currency,status,payment_status,created_at"
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
          "yacht_os_lead_activities"
        )
        .select(
          "id,lead_id,activity_type,created_at"
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
          "yacht_os_crm_automation_events"
        )
        .select(
          "id,lead_id,rule_code,severity,status,created_at"
        )
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "status",
          "open"
        ),
    ]);


  const error =
    leads.error ??
    quotes.error ??
    bookings.error ??
    activities.error ??
    alarms.error;


  if (error) {
    throw error;
  }


  return {
    leads:
      leads.data ??
      [],

    quotes:
      quotes.data ??
      [],

    bookings:
      bookings.data ??
      [],

    activities:
      activities.data ??
      [],

    alarms:
      alarms.data ??
      [],
  };
}
