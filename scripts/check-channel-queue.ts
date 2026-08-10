import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("❌ Supabase env bulunamadı.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from("hotel_channel_sync_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ QUERY ERROR:", error);
    process.exit(1);
  }

  console.log("===== SON 10 QUEUE =====");

  for (const row of data ?? []) {
    console.log({
      id: row.id,
      operation_type: row.operation_type,
      status: row.status,
      attempts: row.attempts,
      last_error: row.last_error,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}

main().catch((error) => {
  console.error("❌ HATA:", error);
  process.exit(1);
});
