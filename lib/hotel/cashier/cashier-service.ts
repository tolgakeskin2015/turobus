import { supabase } from "@/lib/supabase";

export type CashierShift = {
  id: string;
  company_id: string;
  hotel_id: string;
  shift_no: string;
  business_date: string;
  status: "open" | "closed";
  currency: string;
  opening_cash: number;
  expected_cash: number;
  counted_cash: number | null;
  cash_difference: number | null;
  opened_by: string | null;
  opened_at: string;
  closed_by: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CashierMovement = {
  id: string;
  company_id: string;
  hotel_id: string;
  shift_id: string;
  movement_type:
    | "cash_in"
    | "cash_out"
    | "payment"
    | "refund"
    | "adjustment";
  amount: number;
  currency: string;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
};

function message(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message
    );
  }

  return "Kasa işlemi başarısız.";
}

export async function getOpenCashierShift(
  companyId: string,
  hotelId: string
): Promise<CashierShift | null> {
  const { data, error } = await supabase
    .from("hotel_cashier_shifts")
    .select("*")
    .eq("company_id", companyId)
    .eq("hotel_id", hotelId)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    throw new Error(message(error));
  }

  return data as CashierShift | null;
}

export async function listCashierShifts(
  companyId: string,
  hotelId: string,
  limit = 50
): Promise<CashierShift[]> {
  const { data, error } = await supabase
    .from("hotel_cashier_shifts")
    .select("*")
    .eq("company_id", companyId)
    .eq("hotel_id", hotelId)
    .order("opened_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw new Error(message(error));
  }

  return (data ?? []) as CashierShift[];
}

export async function listCashierMovements(
  shiftId: string
): Promise<CashierMovement[]> {
  const { data, error } = await supabase
    .from("hotel_cashier_movements")
    .select("*")
    .eq("shift_id", shiftId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(message(error));
  }

  return (data ?? []) as CashierMovement[];
}

export async function openCashierShift(
  input: {
    companyId: string;
    hotelId: string;
    openingCash: number;
    currency?: string;
    notes?: string | null;
  }
): Promise<CashierShift> {
  const { data, error } = await supabase.rpc(
    "open_hotel_cashier_shift",
    {
      p_company_id: input.companyId,
      p_hotel_id: input.hotelId,
      p_opening_cash:
        Number(input.openingCash ?? 0),
      p_currency:
        input.currency ?? "TRY",
      p_notes:
        input.notes ?? null,
    }
  );

  if (error) {
    throw new Error(message(error));
  }

  return data as CashierShift;
}

export async function addCashierMovement(
  input: {
    shiftId: string;
    movementType:
      | "cash_in"
      | "cash_out"
      | "payment"
      | "refund"
      | "adjustment";
    amount: number;
    description?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
  }
): Promise<CashierMovement> {
  const { data, error } = await supabase.rpc(
    "add_hotel_cashier_movement",
    {
      p_shift_id: input.shiftId,
      p_movement_type:
        input.movementType,
      p_amount:
        Number(input.amount),
      p_description:
        input.description ?? null,
      p_reference_type:
        input.referenceType ?? null,
      p_reference_id:
        input.referenceId ?? null,
    }
  );

  if (error) {
    throw new Error(message(error));
  }

  return data as CashierMovement;
}

export async function closeCashierShift(
  input: {
    shiftId: string;
    countedCash: number;
    notes?: string | null;
  }
): Promise<CashierShift> {
  const { data, error } = await supabase.rpc(
    "close_hotel_cashier_shift",
    {
      p_shift_id: input.shiftId,
      p_counted_cash:
        Number(input.countedCash),
      p_notes:
        input.notes ?? null,
    }
  );

  if (error) {
    throw new Error(message(error));
  }

  return data as CashierShift;
}
