import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "60cede33-cebf-419f-8980-5800342da508";
const HOTEL_ID = "5e7c9c2d-b49f-43d0-b4b8-1779269f1e2f";
const ROOM_TYPE_ID = "9e6074c4-c846-48f4-bdac-377d00b366e4";
const CONNECTION_ID = "9544839a-78fa-487b-ad04-76ad8185ed9d";

function fmt(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const startSearch = new Date("2026-09-10T00:00:00Z");
  const endSearch = addDays(startSearch, 120);

  const { data: reservations, error } = await supabase
    .from("hotel_reservations")
    .select("check_in,check_out,status,deleted_at")
    .eq("company_id", COMPANY_ID)
    .eq("hotel_id", HOTEL_ID)
    .eq("room_type_id", ROOM_TYPE_ID)
    .in("status", ["pending", "confirmed", "checked_in"])
    .lt("check_in", fmt(endSearch))
    .gt("check_out", fmt(startSearch));

  if (error) throw error;

  function occupied(date: string) {
    return (reservations ?? []).some((r: any) => {
      if (r.deleted_at) return false;

      return (
        r.check_in <= date &&
        r.check_out > date
      );
    });
  }

  let checkIn: string | null = null;
  let checkOut: string | null = null;

  for (
    let cursor = startSearch;
    cursor < endSearch;
    cursor = addDays(cursor, 1)
  ) {
    const nights = [
      fmt(cursor),
      fmt(addDays(cursor, 1)),
      fmt(addDays(cursor, 2)),
    ];

    if (nights.every((date) => !occupied(date))) {
      checkIn = nights[0];
      checkOut = fmt(addDays(cursor, 3));
      break;
    }
  }

  if (!checkIn || !checkOut) {
    throw new Error("120 gün içinde boş 3 gecelik tarih bulunamadı.");
  }

  const testId =
    "BOOKING-AUTO-" + Date.now();

  console.log("Boş tarih bulundu:", checkIn, "->", checkOut);
  console.log("Test ID:", testId);

  const response = await fetch(
    "http://localhost:3000/api/channel-manager/inbound/reservation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-channel-secret":
          process.env.CHANNEL_INBOUND_SECRET!,
      },
      body: JSON.stringify({
        connectionId: CONNECTION_ID,
        payload: {
          external_event_id: `${testId}-EVENT`,
          external_reservation_id: testId,
          event_type: "reservation_create",
          external_room_id: "TEST-ROOM-001",
          check_in: checkIn,
          check_out: checkOut,
          guest_first_name: "Booking",
          guest_last_name: "Test",
          guest_email: "booking-test@example.com",
          adults: 2,
          children: 0,
          total_amount: 15000,
          currency: "TRY",
          status: "confirmed"
        }
      })
    }
  );

  const gateway = await response.json();

  console.log("\n===== GATEWAY =====");
  console.log(gateway);

  console.log("\nWorker için 20 saniye bekleniyor...");
  await new Promise((resolve) =>
    setTimeout(resolve, 20000)
  );

  const { data: inbox, error: inboxError } =
    await supabase
      .from("hotel_channel_reservation_inbox")
      .select(
        "external_reservation_id,processing_status,local_reservation_id,error_message"
      )
      .eq("external_reservation_id", testId)
      .maybeSingle();

  if (inboxError) throw inboxError;

  const reservationNo =
    `BOOKING-${testId}`;

  const { data: reservation, error: reservationError } =
    await supabase
      .from("hotel_reservations")
      .select(
        "id,reservation_no,status,check_in,check_out,total_price"
      )
      .eq("reservation_no", reservationNo)
      .maybeSingle();

  if (reservationError) throw reservationError;

  console.log("\n===== INBOX =====");
  console.log(inbox);

  console.log("\n===== PMS =====");
  console.log(reservation);

  if (
    inbox?.processing_status === "completed" &&
    reservation
  ) {
    console.log(
      "\n✅ OTA -> INBOX -> PMS TESTI TAM BASARILI"
    );
  } else {
    console.log(
      "\n⚠️ Zincir tamamlanmadı. Yukarıdaki hata mesajına bak."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
