import {
  supabase,
} from "@/lib/supabase";


export type YachtLead = {
  id: string;
  company_id: string;

  preferred_yacht_id:
    string | null;

  source: string;
  stage: string;
  priority: string;

  customer_name: string;

  customer_phone:
    string | null;

  customer_email:
    string | null;

  start_date:
    string | null;

  end_date:
    string | null;

  guest_count: number;

  budget_min:
    number | null;

  budget_max:
    number | null;

  currency: string;

  request_note:
    string | null;

  internal_note:
    string | null;

  next_follow_up_at:
    string | null;

  last_contact_at:
    string | null;

  score: number;

  converted_quote_id:
    string | null;

  converted_booking_id:
    string | null;

  lost_reason:
    string | null;

  won_at:
    string | null;

  lost_at:
    string | null;

  created_at: string;
};


export type YachtLeadActivity = {
  id: string;
  company_id: string;
  lead_id: string;

  activity_type: string;
  title: string;

  note:
    string | null;

  metadata:
    Record<
      string,
      unknown
    > | null;

  created_at: string;
};


export async function loadYachtCRMCenter(
  companyId: string
) {

  const [
    leads,
    activities,
    yachts,
    quotes,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_leads"
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
          "yacht_os_lead_activities"
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
          500
        ),

      supabase
        .from(
          "yacht_os_yachts"
        )
        .select(
          "id,name,yacht_type,city,marina,status,base_daily_price,currency,max_guests"
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
          "yacht_os_quotes"
        )
        .select(
          "id,lead_id,quote_code,customer_name,customer_phone,start_date,end_date,status,sale_price,currency,converted_booking_id,created_at"
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
    ]);


  const error =
    leads.error ??
    activities.error ??
    yachts.error ??
    quotes.error;


  if (error) {
    throw error;
  }


  return {
    leads:
      (
        leads.data ??
        []
      ) as
        YachtLead[],

    activities:
      (
        activities.data ??
        []
      ) as
        YachtLeadActivity[],

    yachts:
      yachts.data ??
      [],

    quotes:
      quotes.data ??
      [],
  };
}


export async function createYachtLead(
  input: {
    companyId: string;

    customerName: string;

    customerPhone?: string;
    customerEmail?: string;

    source: string;
    priority: string;

    preferredYachtId?: string;

    startDate?: string;
    endDate?: string;

    guestCount: number;

    budgetMin?: number;
    budgetMax?: number;

    currency?: string;

    requestNote?: string;

    nextFollowUpAt?: string;
  }
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_create_lead",
      {
        p_company_id:
          input.companyId,

        p_customer_name:
          input.customerName,

        p_customer_phone:
          input.customerPhone ??
          null,

        p_customer_email:
          input.customerEmail ??
          null,

        p_source:
          input.source,

        p_priority:
          input.priority,

        p_preferred_yacht_id:
          input.preferredYachtId ??
          null,

        p_start_date:
          input.startDate ??
          null,

        p_end_date:
          input.endDate ??
          null,

        p_guest_count:
          input.guestCount,

        p_budget_min:
          input.budgetMin ??
          null,

        p_budget_max:
          input.budgetMax ??
          null,

        p_currency:
          input.currency ??
          "TRY",

        p_request_note:
          input.requestNote ??
          null,

        p_next_follow_up_at:
          input.nextFollowUpAt
            ? new Date(
                input.nextFollowUpAt
              ).toISOString()
            : null,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function updateYachtLead(
  input: {
    leadId: string;

    priority: string;

    preferredYachtId?: string;

    startDate?: string;
    endDate?: string;

    guestCount: number;

    budgetMin?: number;
    budgetMax?: number;

    internalNote?: string;

    nextFollowUpAt?: string;

    score: number;
  }
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_update_lead",
      {
        p_lead_id:
          input.leadId,

        p_priority:
          input.priority,

        p_preferred_yacht_id:
          input.preferredYachtId ??
          null,

        p_start_date:
          input.startDate ??
          null,

        p_end_date:
          input.endDate ??
          null,

        p_guest_count:
          input.guestCount,

        p_budget_min:
          input.budgetMin ??
          null,

        p_budget_max:
          input.budgetMax ??
          null,

        p_internal_note:
          input.internalNote ??
          null,

        p_next_follow_up_at:
          input.nextFollowUpAt
            ? new Date(
                input.nextFollowUpAt
              ).toISOString()
            : null,

        p_score:
          input.score,
      }
    );


  if (error) {
    throw error;
  }
}


export async function setYachtLeadStage(
  leadId: string,
  stage: string,
  note?: string
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_set_lead_stage",
      {
        p_lead_id:
          leadId,

        p_stage:
          stage,

        p_note:
          note ??
          null,
      }
    );


  if (error) {
    throw error;
  }
}


export async function addYachtLeadActivity(
  input: {
    leadId: string;

    activityType: string;

    title: string;

    note?: string;

    nextFollowUpAt?: string;
  }
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_add_lead_activity",
      {
        p_lead_id:
          input.leadId,

        p_activity_type:
          input.activityType,

        p_title:
          input.title,

        p_note:
          input.note ??
          null,

        p_next_follow_up_at:
          input.nextFollowUpAt
            ? new Date(
                input.nextFollowUpAt
              ).toISOString()
            : null,
      }
    );


  if (error) {
    throw error;
  }
}


export async function linkYachtLeadQuote(
  leadId: string,
  quoteId: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_link_lead_quote",
      {
        p_lead_id:
          leadId,

        p_quote_id:
          quoteId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function syncYachtLeadConversions(
  companyId: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_sync_lead_conversions",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}
