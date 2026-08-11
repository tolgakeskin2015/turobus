import { supabase } from "@/lib/supabase";

export type FolioReservation = {
  id: string;
  company_id: string;
  hotel_id: string;
  reservation_no: string;
  status: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  currency: string;
  total_price: number;
  balance: number;

  hotel:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;

  room:
    | {
        id: string;
        room_number: string;
      }
    | {
        id: string;
        room_number: string;
      }[]
    | null;

  room_type:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

export type HotelFolio = {
  id: string;
  company_id: string;
  hotel_id: string;
  reservation_id: string;
  folio_no: string;
  status: "open" | "closed" | "void";
  currency: string;
  opening_balance: number;
  charge_total: number;
  payment_total: number;
  refund_total: number;
  balance: number;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
};

export type FolioCharge = {
  id: string;
  folio_id: string;
  reservation_id: string;
  charge_date: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_amount: number;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export type FolioPayment = {
  id: string;
  folio_id: string;
  reservation_id: string;
  payment_date: string;
  payment_type: string;
  transaction_type: "payment" | "refund";
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number;
  reference_no: string | null;
  provider: string | null;
  installment_count: number;
  status: string;
  notes: string | null;
  created_at: string;
};

export type FolioDetail = {
  folio: HotelFolio;
  charges: FolioCharge[];
  payments: FolioPayment[];
};

function message(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ??
        "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export async function getFolioReservations(
  companyId: string
): Promise<FolioReservation[]> {
  const { data, error } = await supabase
    .from("hotel_reservations")
    .select(`
      id,
      company_id,
      hotel_id,
      reservation_no,
      status,
      check_in,
      check_out,
      adults,
      children,
      currency,
      total_price,
      balance,
      hotel:hotels (
        id,
        name
      ),
      room:hotel_rooms (
        id,
        room_number
      ),
      room_type:hotel_room_types (
        id,
        name
      )
    `)
    .eq("company_id", companyId)
    .not(
      "status",
      "in",
      '("cancelled","no_show")'
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(message(error));
  }

  return (
    (data ??
      []) as unknown as FolioReservation[]
  );
}

export async function getOrCreateFolio(
  companyId: string,
  reservationId: string
): Promise<HotelFolio> {
  const { data, error } = await supabase
    .rpc(
      "get_or_create_hotel_folio",
      {
        p_company_id: companyId,
        p_reservation_id:
          reservationId,
      }
    );

  if (error) {
    throw new Error(message(error));
  }

  return data as HotelFolio;
}

export async function getFolioDetail(
  companyId: string,
  folioId: string
): Promise<FolioDetail> {
  const [
    {
      data: folioData,
      error: folioError,
    },
    {
      data: chargeData,
      error: chargeError,
    },
    {
      data: paymentData,
      error: paymentError,
    },
  ] = await Promise.all([
    supabase
      .from("hotel_folios")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", folioId)
      .single(),

    supabase
      .from("hotel_folio_charges")
      .select("*")
      .eq("company_id", companyId)
      .eq("folio_id", folioId)
      .order("charge_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("hotel_folio_payments")
      .select("*")
      .eq("company_id", companyId)
      .eq("folio_id", folioId)
      .order("payment_date", {
        ascending: false,
      }),
  ]);

  const error =
    folioError ??
    chargeError ??
    paymentError;

  if (error) {
    throw new Error(message(error));
  }

  return {
    folio:
      folioData as HotelFolio,

    charges:
      (chargeData ??
        []) as FolioCharge[],

    payments:
      (paymentData ??
        []) as FolioPayment[],
  };
}

export async function addFolioCharge(
  input: {
    companyId: string;
    hotelId: string;
    reservationId: string;
    folioId: string;
    category: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountAmount: number;
    currency: string;
    notes?: string | null;
    userId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_folio_charges")
    .insert({
      company_id: input.companyId,
      hotel_id: input.hotelId,
      reservation_id:
        input.reservationId,
      folio_id: input.folioId,
      category: input.category,
      description:
        input.description,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      tax_rate: input.taxRate,
      discount_amount:
        input.discountAmount,
      currency: input.currency,
      status: "posted",
      notes: input.notes ?? null,
      created_by:
        input.userId ?? null,
    });

  if (error) {
    throw new Error(message(error));
  }
}

export async function addFolioPayment(
  input: {
    companyId: string;
    hotelId: string;
    reservationId: string;
    folioId: string;
    paymentType: string;
    transactionType:
      | "payment"
      | "refund";
    amount: number;
    currency: string;
    exchangeRate: number;
    referenceNo?: string | null;
    provider?: string | null;
    installmentCount: number;
    notes?: string | null;
    userId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_folio_payments")
    .insert({
      company_id: input.companyId,
      hotel_id: input.hotelId,
      reservation_id:
        input.reservationId,
      folio_id: input.folioId,
      payment_type:
        input.paymentType,
      transaction_type:
        input.transactionType,
      amount: input.amount,
      currency: input.currency,
      exchange_rate:
        input.exchangeRate,
      reference_no:
        input.referenceNo ?? null,
      provider:
        input.provider ?? null,
      installment_count:
        input.installmentCount,
      status: "completed",
      notes: input.notes ?? null,
      created_by:
        input.userId ?? null,
    });

  if (error) {
    throw new Error(message(error));
  }


}

export async function deleteFolioCharge(
  companyId: string,
  chargeId: string
): Promise<void> {
  const { error } = await supabase
    .from("hotel_folio_charges")
    .delete()
    .eq("company_id", companyId)
    .eq("id", chargeId);

  if (error) {
    throw new Error(message(error));
  }
}

export async function deleteFolioPayment(
  companyId: string,
  paymentId: string,
  reason?: string | null
): Promise<void> {
  const { error } = await supabase.rpc(
    "cancel_hotel_folio_payment",
    {
      p_company_id: companyId,
      p_payment_id: paymentId,
      p_reason: reason ?? null,
    }
  );

  if (error) {
    throw new Error(message(error));
  }
}

export async function updateFolioStatus(
  companyId: string,
  folioId: string,
  status: "open" | "closed"
): Promise<void> {
  const { error } = await supabase
    .from("hotel_folios")
    .update({
      status,
      closed_at:
        status === "closed"
          ? new Date().toISOString()
          : null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", folioId);

  if (error) {
    throw new Error(message(error));
  }
}
