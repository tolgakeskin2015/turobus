import {
  supabase,
} from "@/lib/supabase";


export type YachtFinanceBooking = {
  id: string;
  yacht_id: string;
  booking_code: string;

  guest_name: string;
  guest_phone:
    string | null;

  start_date: string;
  end_date: string;

  status: string;
  payment_status: string;

  total_amount: number;
  paid_amount: number;

  supplier_cost: number;
  commission_amount: number;

  currency: string;

  collection_due_at:
    string | null;

  deposit_target: number;

  collection_priority:
    "low" |
    "normal" |
    "high" |
    "critical";

  collection_note:
    string | null;

  created_at: string;
};


export type YachtFinancePayment = {
  id: string;
  booking_id: string;

  amount: number;
  currency: string;

  payment_method: string;

  provider:
    string | null;

  status: string;

  reference_no:
    string | null;

  provider_payment_id:
    string | null;

  provider_transaction_id:
    string | null;

  paid_at:
    string | null;

  created_at: string;
};


export type YachtFinanceRefund = {
  id: string;
  booking_id: string;
  payment_id: string;

  amount: number;
  currency: string;

  provider:
    string | null;

  provider_reference:
    string | null;

  status: string;

  reason:
    string | null;

  created_at: string;
};


export type YachtFinancePaymentLink = {
  id: string;
  booking_id: string;

  amount: number;
  currency: string;

  status: string;

  valid_until:
    string | null;

  public_token: string;

  created_at: string;
};


export async function loadYachtFinanceControlTower(
  companyId: string
) {

  const [
    bookings,
    yachts,
    payments,
    refunds,
    links,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_bookings"
        )
        .select(
          "id,yacht_id,booking_code,guest_name,guest_phone,start_date,end_date,status,payment_status,total_amount,paid_amount,supplier_cost,commission_amount,currency,collection_due_at,deposit_target,collection_priority,collection_note,created_at"
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
          "yacht_os_yachts"
        )
        .select(
          "id,name,city,marina"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_payments"
        )
        .select(
          "id,booking_id,amount,currency,payment_method,provider,status,reference_no,provider_payment_id,provider_transaction_id,paid_at,created_at"
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
          "yacht_os_refunds"
        )
        .select(
          "id,booking_id,payment_id,amount,currency,provider,provider_reference,status,reason,created_at"
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
          "yacht_os_payment_links"
        )
        .select(
          "id,booking_id,amount,currency,status,valid_until,public_token,created_at"
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
    bookings.error ??
    yachts.error ??
    payments.error ??
    refunds.error ??
    links.error;


  if (error) {
    throw error;
  }


  return {
    bookings:
      (
        bookings.data ??
        []
      ) as YachtFinanceBooking[],

    yachts:
      yachts.data ??
      [],

    payments:
      (
        payments.data ??
        []
      ) as YachtFinancePayment[],

    refunds:
      (
        refunds.data ??
        []
      ) as YachtFinanceRefund[],

    paymentLinks:
      (
        links.data ??
        []
      ) as YachtFinancePaymentLink[],
  };
}


export async function updateYachtCollectionPlan(
  input: {
    bookingId: string;

    dueAt?: string;

    depositTarget: number;

    priority:
      "low" |
      "normal" |
      "high" |
      "critical";

    note?: string;
  }
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_update_collection_plan",
      {
        p_booking_id:
          input.bookingId,

        p_due_at:
          input.dueAt
            ? new Date(
                input.dueAt
              ).toISOString()
            : null,

        p_deposit_target:
          input.depositTarget,

        p_priority:
          input.priority,

        p_note:
          input.note ??
          null,
      }
    );


  if (error) {
    throw error;
  }
}


export async function recordYachtManualRefund(
  input: {
    paymentId: string;
    amount: number;
    reason?: string;
  }
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_record_manual_refund",
      {
        p_payment_id:
          input.paymentId,

        p_amount:
          input.amount,

        p_reason:
          input.reason ??
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}
