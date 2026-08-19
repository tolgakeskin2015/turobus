import {
  supabase,
} from "@/lib/supabase";


export async function loadYachtSalesCommissionCenter(
  companyId: string
) {

  const [
    rules,
    earnings,
    members,
    leads,
    bookings,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_sales_commission_rules"
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
          "yacht_os_sales_commission_earnings"
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
          "company_members"
        )
        .select(
          "id,user_id,role,full_name,is_active"
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
          "id,customer_name,assigned_to,converted_booking_id"
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
          "id,booking_code,total_amount,paid_amount,supplier_cost,currency,status,payment_status"
        )
        .eq(
          "company_id",
          companyId
        ),
    ]);


  const error =
    rules.error ??
    earnings.error ??
    members.error ??
    leads.error ??
    bookings.error;


  if (error) {
    throw error;
  }


  return {
    rules:
      rules.data ??
      [],

    earnings:
      earnings.data ??
      [],

    members:
      members.data ??
      [],

    leads:
      leads.data ??
      [],

    bookings:
      bookings.data ??
      [],
  };
}


export async function setYachtSalesCommissionRule(
  input: {
    companyId: string;

    ruleId?: string;

    userId?: string;

    name: string;

    calculationBasis:
      "revenue" |
      "gross_profit";

    ratePercent: number;

    minimumCollectionPercent: number;

    appliesFrom: string;

    status:
      "active" |
      "passive" |
      "archived";

    currency?: string;

    note?: string;
  }
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_set_sales_commission_rule",
      {
        p_company_id:
          input.companyId,

        p_rule_id:
          input.ruleId ??
          null,

        p_user_id:
          input.userId ??
          null,

        p_name:
          input.name,

        p_calculation_basis:
          input.calculationBasis,

        p_rate_percent:
          input.ratePercent,

        p_minimum_collection_percent:
          input.minimumCollectionPercent,

        p_applies_from:
          input.appliesFrom,

        p_status:
          input.status,

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


export async function calculateYachtSalesCommissions(
  companyId: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_calculate_sales_commissions",
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


export async function approveYachtSalesCommission(
  earningId: string
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_approve_sales_commission",
      {
        p_earning_id:
          earningId,
      }
    );


  if (error) {
    throw error;
  }
}


export async function payYachtSalesCommission(
  earningId: string
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_pay_sales_commission",
      {
        p_earning_id:
          earningId,
      }
    );


  if (error) {
    throw error;
  }
}


export async function cancelYachtSalesCommission(
  earningId: string,
  note?: string
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_cancel_sales_commission",
      {
        p_earning_id:
          earningId,

        p_note:
          note ??
          null,
      }
    );


  if (error) {
    throw error;
  }
}
