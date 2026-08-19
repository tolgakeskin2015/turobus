import {
  supabase,
} from "@/lib/supabase";


export async function loadYachtSalesTeamCenter(
  companyId: string
) {

  const month =
    new Date()
      .toISOString()
      .slice(
        0,
        7
      ) +
    "-01";


  const [
    members,
    leads,
    quotes,
    bookings,
    targets,
  ] =
    await Promise.all([

      supabase
        .from(
          "company_members"
        )
        .select(
          "id,user_id,role,full_name,phone,is_active"
        )
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "is_active",
          true
        )
        .in(
          "role",
          [
            "sales",
            "operation_manager",
            "company_owner",
            "super_admin",
          ]
        )
        .order(
          "full_name"
        ),

      supabase
        .from(
          "yacht_os_leads"
        )
        .select(
          "id,assigned_to,customer_name,source,stage,score,budget_min,budget_max,currency,converted_quote_id,converted_booking_id,created_at"
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
          "id,lead_id,status,sale_price,cost_price,currency,converted_booking_id,created_at"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_bookings"
        )
        .select(
          "id,total_amount,supplier_cost,currency,status,created_at"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_sales_targets"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "period_month",
          month
        )
        .eq(
          "status",
          "active"
        ),
    ]);


  const error =
    members.error ??
    leads.error ??
    quotes.error ??
    bookings.error ??
    targets.error;


  if (error) {
    throw error;
  }


  return {
    members:
      members.data ??
      [],

    leads:
      leads.data ??
      [],

    quotes:
      quotes.data ??
      [],

    bookings:
      bookings.data ??
      [],

    targets:
      targets.data ??
      [],
  };
}


export async function assignYachtLead(
  leadId: string,
  userId:
    string | null
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_assign_lead",
      {
        p_lead_id:
          leadId,

        p_user_id:
          userId,
      }
    );


  if (error) {
    throw error;
  }
}


export async function setYachtSalesTarget(
  input: {
    companyId: string;
    userId: string;
    periodMonth: string;
    leadTarget: number;
    quoteTarget: number;
    bookingTarget: number;
    revenueTarget: number;
    grossProfitTarget: number;
    currency?: string;
    note?: string;
  }
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_set_sales_target",
      {
        p_company_id:
          input.companyId,

        p_user_id:
          input.userId,

        p_period_month:
          input.periodMonth,

        p_lead_target:
          input.leadTarget,

        p_quote_target:
          input.quoteTarget,

        p_booking_target:
          input.bookingTarget,

        p_revenue_target:
          input.revenueTarget,

        p_gross_profit_target:
          input.grossProfitTarget,

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
}
