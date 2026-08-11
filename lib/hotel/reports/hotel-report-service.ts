import { supabase } from "@/lib/supabase";

export type HotelReportSummary = {
  totalReservations: number;
  activeReservations: number;
  checkedIn: number;
  checkedOut: number;
  totalRevenue: number;
  totalPayments: number;
  openMaintenance: number;
  urgentMaintenance: number;
  issuedInvoices: number;
  invoiceRevenue: number;
};

export type HotelReservationReportRow = {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
};

export type HotelMaintenanceReportRow = {
  id: string;
  request_no: string;
  title: string;
  status: string;
  priority: string;
  estimated_cost: number;
  actual_cost: number;
  created_at: string;
};

export type HotelInvoiceReportRow = {
  id: string;
  invoice_no: string;
  customer_name: string;
  status: string;
  grand_total: number;
  created_at: string;
};

function getMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: string }).message
    );
  }

  return "Rapor verileri alınamadı.";
}

export async function getHotelReportData(
  companyId: string,
  hotelId: string
) {
  const [
    reservationResult,
    paymentResult,
    maintenanceResult,
    invoiceResult,
  ] = await Promise.all([
    supabase
      .from("hotel_reservations")
      .select("id, status, total_price, created_at")
      .eq("company_id", companyId)
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false }),

    supabase
      .from("hotel_folio_payments")
      .select(
        "base_amount, payment_type, transaction_type, status, payment_date"
      )
      .eq("company_id", companyId)
      .eq("hotel_id", hotelId)
      .eq("status", "completed"),

    supabase
      .from("hotel_maintenance_requests")
      .select(
        "id, request_no, title, status, priority, estimated_cost, actual_cost, created_at"
      )
      .eq("company_id", companyId)
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false }),

    supabase
      .from("hotel_invoices")
      .select(
        "id, invoice_no, customer_name, status, grand_total, created_at"
      )
      .eq("company_id", companyId)
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false }),
  ]);

  const firstError =
    reservationResult.error ||
    paymentResult.error ||
    maintenanceResult.error ||
    invoiceResult.error;

  if (firstError) {
    throw new Error(
      getMessage(firstError)
    );
  }

  const reservations =
    (reservationResult.data ?? []) as HotelReservationReportRow[];

  const maintenance =
    (maintenanceResult.data ?? []) as HotelMaintenanceReportRow[];

  const invoices =
    (invoiceResult.data ?? []) as HotelInvoiceReportRow[];

  const payments =
    paymentResult.data ?? [];

  const totalRevenue =
    reservations.reduce(
      (total, item) =>
        total +
        Number(item.total_price || 0),
      0
    );

  const totalPayments =
    payments.reduce(
      (total, item) => {
        const amount =
          Number(item.base_amount || 0);

        const rate = 1;

        if (
          item.payment_type === "refund"
        ) {
          return total - amount * rate;
        }

        return total + amount * rate;
      },
      0
    );

  const invoiceRevenue =
    invoices
      .filter(
        (item) =>
          item.status === "issued"
      )
      .reduce(
        (total, item) =>
          total +
          Number(
            item.grand_total || 0
          ),
        0
      );

  const summary: HotelReportSummary = {
    totalReservations:
      reservations.length,

    activeReservations:
      reservations.filter(
        (item) =>
          item.status !== "cancelled" &&
          item.status !== "checked_out"
      ).length,

    checkedIn:
      reservations.filter(
        (item) =>
          item.status === "checked_in"
      ).length,

    checkedOut:
      reservations.filter(
        (item) =>
          item.status === "checked_out"
      ).length,

    totalRevenue,
    totalPayments,

    openMaintenance:
      maintenance.filter(
        (item) =>
          item.status !== "completed" &&
          item.status !== "cancelled"
      ).length,

    urgentMaintenance:
      maintenance.filter(
        (item) =>
          item.priority === "urgent" &&
          item.status !== "completed" &&
          item.status !== "cancelled"
      ).length,

    issuedInvoices:
      invoices.filter(
        (item) =>
          item.status === "issued"
      ).length,

    invoiceRevenue,
  };

  return {
    summary,
    reservations,
    maintenance,
    invoices,
  };
}
