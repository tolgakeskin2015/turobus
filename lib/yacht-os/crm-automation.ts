import {
  supabase,
} from "@/lib/supabase";


export type YachtCRMAutomationEvent = {
  id: string;

  company_id: string;
  lead_id: string;

  quote_id:
    string | null;

  task_id:
    string | null;

  rule_code: string;
  severity: string;

  title: string;

  message:
    string | null;

  fingerprint: string;

  status: string;

  due_at:
    string | null;

  detected_at: string;

  resolved_at:
    string | null;

  metadata:
    Record<
      string,
      unknown
    > | null;

  created_at: string;
};


export async function loadYachtCRMAutomationCenter(
  companyId: string
) {

  const [
    events,
    leads,
    quotes,
    tasks,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_crm_automation_events"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "detected_at",
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
          "yacht_os_leads"
        )
        .select(
          "id,customer_name,customer_phone,source,stage,priority,score,next_follow_up_at,last_contact_at,preferred_yacht_id,budget_max,currency"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_quotes"
        )
        .select(
          "id,quote_code,status,sale_price,currency,sent_at,viewed_at,lead_id"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_tasks"
        )
        .select(
          "id,lead_id,title,due_at,priority,status,assigned_to_name"
        )
        .eq(
          "company_id",
          companyId
        )
        .not(
          "lead_id",
          "is",
          null
        )
        .order(
          "due_at",
          {
            ascending:
              true,
          }
        ),
    ]);


  const error =
    events.error ??
    leads.error ??
    quotes.error ??
    tasks.error;


  if (error) {
    throw error;
  }


  return {
    events:
      (
        events.data ??
        []
      ) as
        YachtCRMAutomationEvent[],

    leads:
      leads.data ??
      [],

    quotes:
      quotes.data ??
      [],

    tasks:
      tasks.data ??
      [],
  };
}


export async function runYachtCRMAutomations(
  companyId: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_run_crm_automations",
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


export async function resolveYachtCRMAutomationEvent(
  eventId: string,
  status:
    "resolved" |
    "dismissed"
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_resolve_crm_automation_event",
      {
        p_event_id:
          eventId,

        p_status:
          status,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}
