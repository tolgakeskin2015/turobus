import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const key =
  process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error(
    "Supabase environment değişkenleri eksik."
  );
}

const supabase = createClient(url, key);

async function main() {
  console.log("\n===== ACIK KASA VARDIYALARI =====");

  const { data: shifts, error: shiftError } =
    await supabase
      .from("hotel_cashier_shifts")
      .select(
        "id,company_id,hotel_id,shift_no,status,expected_cash,opened_at"
      )
      .eq("status", "open")
      .order("opened_at", {
        ascending: false,
      });

  if (shiftError) throw shiftError;

  console.table(shifts ?? []);

  console.log(
    "\n===== SON 10 FOLIO ODEMESI ====="
  );

  const { data: payments, error: paymentError } =
    await supabase
      .from("hotel_folio_payments")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(10);

  if (paymentError) throw paymentError;

  console.table(
    (payments ?? []).map((p: any) => ({
      id: p.id,
      company_id: p.company_id,
      hotel_id: p.hotel_id,
      reservation_id: p.reservation_id,
      payment_type: p.payment_type,
      transaction_type: p.transaction_type,
      amount: p.amount,
      created_at: p.created_at,
    }))
  );

  console.log(
    "\n===== SON 10 KASA HAREKETI ====="
  );

  const { data: movements, error: movementError } =
    await supabase
      .from("hotel_cashier_movements")
      .select(
        "id,shift_id,movement_type,amount,description,reference_type,reference_id,created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(10);

  if (movementError) throw movementError;

  console.table(movements ?? []);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
