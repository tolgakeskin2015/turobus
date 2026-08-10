import { supabase } from "@/lib/supabase";

export type HotelInvoiceStatus =
  | "draft"
  | "issued"
  | "cancelled";

export type HotelInvoiceCustomerType =
  | "individual"
  | "company";

export type HotelInvoice = {
  id: string;
  company_id: string;
  hotel_id: string;
  reservation_id: string | null;
  folio_id: string | null;
  invoice_no: string;
  invoice_type: string;
  status: HotelInvoiceStatus;
  customer_type: HotelInvoiceCustomerType;
  customer_name: string;
  tax_office: string | null;
  tax_number: string | null;
  identity_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  notes: string | null;
  issued_at: string | null;
  created_at: string;
};

export type HotelInvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_subtotal: number;
  line_tax: number;
  line_total: number;
};

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: string }).message
    );
  }

  return "Fatura işlemi başarısız.";
}

export async function listHotelInvoices(
  companyId: string,
  hotelId: string
) {
  const { data, error } = await supabase
    .from("hotel_invoices")
    .select("*")
    .eq("company_id", companyId)
    .eq("hotel_id", hotelId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(errorMessage(error));
  }

  return (data ?? []) as HotelInvoice[];
}

export async function listHotelInvoiceItems(
  invoiceId: string
) {
  const { data, error } = await supabase
    .from("hotel_invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(errorMessage(error));
  }

  return (data ?? []) as HotelInvoiceItem[];
}

export async function createHotelInvoice(input: {
  companyId: string;
  hotelId: string;
  customerName: string;
  customerType: HotelInvoiceCustomerType;
  taxOffice?: string;
  taxNumber?: string;
  identityNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc(
    "create_hotel_invoice",
    {
      p_company_id: input.companyId,
      p_hotel_id: input.hotelId,
      p_customer_name: input.customerName,
      p_customer_type: input.customerType,
      p_tax_office: input.taxOffice || null,
      p_tax_number: input.taxNumber || null,
      p_identity_number:
        input.identityNumber || null,
      p_email: input.email || null,
      p_phone: input.phone || null,
      p_address: input.address || null,
      p_notes: input.notes || null,
    }
  );

  if (error) {
    throw new Error(errorMessage(error));
  }

  return String(data);
}

export async function addHotelInvoiceItem(input: {
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}) {
  const { error } = await supabase.rpc(
    "add_hotel_invoice_item",
    {
      p_invoice_id: input.invoiceId,
      p_description: input.description,
      p_quantity: input.quantity,
      p_unit_price: input.unitPrice,
      p_tax_rate: input.taxRate,
    }
  );

  if (error) {
    throw new Error(errorMessage(error));
  }
}

export async function issueHotelInvoice(
  invoiceId: string
) {
  const { error } = await supabase.rpc(
    "issue_hotel_invoice",
    {
      p_invoice_id: invoiceId,
    }
  );

  if (error) {
    throw new Error(errorMessage(error));
  }
}
