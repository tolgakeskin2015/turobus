
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
  const code =
    `MUT-${Date.now()
      .toString()
      .slice(-8)}`;

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "yacht_os_settlements"
      )
      .insert({
        company_id:
          input.companyId,

        created_by:
          input.userId,

        supplier_id:
          input.supplierId,

        settlement_code:
          code,

        period_start:
          input.periodStart,

        period_end:
          input.periodEnd,

        gross_sales:
          input.grossSales,

        supplier_payable:
          input.supplierPayable,

        platform_commission:
          input.platformCommission,

        due_date:
          input.dueDate ??
          null,

        note:
          input.note ??
          null,

        status:
          "draft",
      })
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data as
    YachtSettlement;
}


export async function updateSettlementStatus(
  settlementId: string,
  status:
    YachtSettlementStatus
) {
  const patch:
    Record<
      string,
      unknown
    > = {
      status,
  };

  if (
    status ===
    "approved"
  ) {
    patch.approved_at =
      new Date()
        .toISOString();
  }

  if (
    status ===
    "paid"
  ) {
    patch.paid_at =
      new Date()
        .toISOString();
  }

  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_settlements"
      )
      .update(
        patch
      )
      .eq(
        "id",
        settlementId
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
  }
) {
  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_supplier_payments"
      )
      .insert({
        company_id:
          input.companyId,

        created_by:
          input.userId,

        supplier_id:
          input.supplierId,

        settlement_id:
          input.settlementId ??
          null,

        amount:
          input.amount,

        reference_no:
          input.referenceNo ??
          null,

        note:
          input.note ??
          null,
      });

  if (error) {
    throw error;
  }

  if (
    input.settlementId
  ) {
    const {
      data:
        settlement,
      error:
        settlementError,
    } =
      await supabase
        .from(
          "yacht_os_settlements"
        )
        .select(
          "paid_amount,supplier_payable"
        )
        .eq(
          "id",
          input.settlementId
        )
        .single();

    if (
      settlementError
    ) {
      throw settlementError;
    }

    const nextPaid =
      Number(
        settlement
          .paid_amount ??
        0
      ) +
      input.amount;

    const payable =
      Number(
        settlement
          .supplier_payable ??
        0
      );

    await supabase
      .from(
        "yacht_os_settlements"
      )
      .update({
        paid_amount:
          nextPaid,

        status:
          nextPaid >=
          payable
            ? "paid"
            : "partially_paid",

        paid_at:
          nextPaid >=
          payable
            ? new Date()
                .toISOString()
            : null,
      })
      .eq(
        "id",
        input.settlementId
      );
  }
}
