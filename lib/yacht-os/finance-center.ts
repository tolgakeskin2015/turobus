
import {
  supabase,
} from "@/lib/supabase";


export type YachtPayment = {
  id: string;
  company_id: string;
  booking_id: string;
  payment_link_id:
    string | null;
  amount: number;
  currency: string;
  payment_method: string;
  provider:
    string | null;
  provider_reference:
    string | null;
  provider_payment_id:
    string | null;
  provider_transaction_id:
    string | null;
  status: string;
  reference_no:
    string | null;
  note:
    string | null;
  paid_at:
    string | null;
  created_at: string;
};


export type YachtPaymentLink = {
  id: string;
  company_id: string;
  booking_id: string;
  public_token: string;
  amount: number;
  currency: string;
  status: string;
  valid_until:
    string | null;
  note:
    string | null;
  paid_at:
    string | null;
  created_at: string;
};


export async function loadYachtFinanceCenter(
  companyId: string
) {
  const [
    bookings,
    yachts,
    payments,
    paymentLinks,
    financeEntries,
    suppliers,
    assignments,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_bookings"
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
          "yacht_os_yachts"
        )
        .select(
          "id,name,city,marina,currency"
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
          "yacht_os_payments"
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
          "yacht_os_payment_links"
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
          "yacht_os_finance_entries"
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
          "yacht_os_suppliers"
        )
        .select(
          "id,name,commission_rate"
        )
        .eq(
          "company_id",
          companyId
        ),

      supabase
        .from(
          "yacht_os_supplier_yachts"
        )
        .select(
          "supplier_id,yacht_id"
        ),
    ]);


  const error =
    bookings.error ??
    yachts.error ??
    payments.error ??
    paymentLinks.error ??
    financeEntries.error ??
    suppliers.error ??
    assignments.error;


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

    payments:
      (
        payments.data ??
        []
      ) as YachtPayment[],

    paymentLinks:
      (
        paymentLinks.data ??
        []
      ) as YachtPaymentLink[],

    financeEntries:
      financeEntries.data ??
      [],

    suppliers:
      suppliers.data ??
      [],

    assignments:
      assignments.data ??
      [],
  };
}


export async function recordYachtManualPayment(
  input: {
    bookingId: string;
    amount: number;
    method: string;
    referenceNo?: string;
    note?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_record_manual_payment",
      {
        p_booking_id:
          input.bookingId,

        p_amount:
          input.amount,

        p_method:
          input.method,

        p_reference_no:
          input.referenceNo ??
          null,

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


export async function createYachtPaymentLink(
  input: {
    bookingId: string;
    amount: number;
    validUntil?: string;
    note?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_create_payment_link",
      {
        p_booking_id:
          input.bookingId,

        p_amount:
          input.amount,

        p_valid_until:
          input.validUntil
            ? new Date(
                input.validUntil
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

  return data as {
    ok: boolean;
    id: string;
    token: string;
    amount: number;
  };
}
