import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SECRET_KEY!;

if (!url || !key) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SECRET_KEY eksik."
  );
}

const supabase = createClient(url, key);

async function main() {
  const { data: connections, error: connectionError } =
    await supabase
      .from("hotel_channel_connections")
      .select(
        "id,company_id,hotel_id,channel_code,connection_name,status"
      )
      .order("created_at", { ascending: false })
      .limit(10);

  if (connectionError) throw connectionError;

  console.log("\n===== CHANNEL CONNECTIONS =====");
  console.table(connections ?? []);

  const { data: rooms, error: roomError } =
    await supabase
      .from("hotel_room_types")
      .select(
        "id,company_id,hotel_id,name,total_rooms"
      )
      .order("created_at", { ascending: false })
      .limit(10);

  if (roomError) throw roomError;

  console.log("\n===== ROOM TYPES =====");
  console.table(rooms ?? []);

  const { data: queue, error: queueError } =
    await supabase
      .from("hotel_channel_sync_queue")
      .select(
        "id,connection_id,operation_type,status,attempt_count,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(15);

  if (queueError) throw queueError;

  console.log("\n===== LAST QUEUE ITEMS =====");
  console.table(queue ?? []);
}

main().catch((error) => {
  console.error("\nTEST DATA ERROR:");
  console.error(error);
  process.exit(1);
});
