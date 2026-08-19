
import {
  supabase,
} from "@/lib/supabase";


export type YachtSettlementStatus =
  | "draft"
  | "waiting_approval"
  | "approved"
  | "partially_paid"
  | "paid"
  | "cancelled";


export type YachtSettlement = {
  id: string;
  company_id: string;
  supplier_id: string;
  settlement_code: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  supplier_payable: number;
  platform_commission: number;
  adjustments: number;
  paid_amount: number;
  currency: string;
  status:
    YachtSettlementStatus;
  due_date:
    string | null;
  approved_at:
    string | null;
  paid_at:
    string | null;
  note:
    string | null;
  created_at: string;
  updated_at: string;
};


export type YachtSupplierPayment = {
  id: string;
  company_id: string;
  supplier_id: string;
  settlement_id:
    string | null;
  amount: number;
  currency: string;
  payment_method: string;
  reference_no:
    string | null;
  note:
    string | null;
  paid_at: string;
  created_at: string;
};


export async function loadPartnerControl(
  companyId: string
) {
  const [
    suppliers,
    yachts,
    assignments,
    bookings,
    settlements,
    payments,
  ] =
    await Promise.all([
      supabase
        .from(
          "yacht_os_suppliers"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "yacht_os_yachts"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "yacht_os_supplier_yachts"
        )
        .select(
          "supplier_id,yacht_id,created_at"
        ),

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
          "start_date",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "yacht_os_settlements"
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
          "yacht_os_supplier_payments"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "paid_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  const error =
    suppliers.error ??
    yachts.error ??
    assignments.error ??
    bookings.error ??
    settlements.error ??
    payments.error;

  if (error) {
    throw error;
  }

  return {
    suppliers:
      suppliers.data ??
      [],

    yachts:
      yachts.data ??
      [],

    assignments:
      assignments.data ??
      [],

    bookings:
      bookings.data ??
      [],

    settlements:
      (
        settlements.data ??
        []
      ) as
        YachtSettlement[],

    payments:
      (
        payments.data ??
        []
      ) as
        YachtSupplierPayment[],
  };
}


export async function assignYachtToSupplier(
  supplierId: string,
  yachtId: string
) {
  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_supplier_yachts"
      )
      .upsert({
        supplier_id:
          supplierId,

        yacht_id:
          yachtId,
      });

  if (error) {
    throw error;
  }
}


export async function removeYachtFromSupplier(
  supplierId: string,
  yachtId: string
) {
  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_supplier_yachts"
      )
      .delete()
      .eq(
        "supplier_id",
        supplierId
      )
      .eq(
        "yacht_id",
        yachtId
      );

  if (error) {
    throw error;
  }
}


export async function createSettlement(
  input: {
    companyId: string;
    userId: string;
    supplierId: string;
    periodStart: string;
    periodEnd: string;
    grossSales: number;
    supplierPayable: number;
    platformCommission: number;
    dueDate?: string;
    note?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_create_settlement_atomic",
      {
        p_supplier_id:
          input.supplierId,

        p_period_start:
          input.periodStart,

        p_period_end:
          input.periodEnd,

        p_due_date:
          input.dueDate ??
          null,

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
    settlement_id: string;
    settlement_code: string;
    booking_count: number;
    gross_sales: number;
    supplier_payable: number;
    platform_commission: number;
    currency: string;
  };
}


export async function updateSettlementStatus(
  settlementId: string,
  status:
    YachtSettlementStatus
) {
  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_update_settlement_status_atomic",
      {
        p_settlement_id:
          settlementId,

        p_status:
          status,
      }
    );

  if (error) {
    throw error;
  }
}


export async function createSupplierPayment(
  input: {
    companyId: string;
    userId: string;
    supplierId: string;
    settlementId?: string;
    amount: number;
    referenceNo?: string;
    note?: string;
    paymentMethod?: string;
  }
) {
  if (
    !input.settlementId
  ) {
    throw new Error(
      "Tedarikçi ödemesi için mutabakat zorunlu."
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_record_supplier_payment_atomic",
      {
        p_settlement_id:
          input.settlementId,

        p_amount:
          input.amount,

        p_payment_method:
          input.paymentMethod ??
          "bank_transfer",

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
