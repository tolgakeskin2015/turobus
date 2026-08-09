import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function getChannelEngineStatus() {
  const supabase = getSupabaseAdmin();

  const [connections, pending, processing, failed, completed] =
    await Promise.all([
      supabase
        .from("hotel_channel_connections")
        .select("id,channel_code,status,last_sync_at,last_success_at,last_error_at,last_error_message"),

      supabase
        .from("hotel_channel_sync_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      supabase
        .from("hotel_channel_sync_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing"),

      supabase
        .from("hotel_channel_sync_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed"),

      supabase
        .from("hotel_channel_sync_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
    ]);

  if (connections.error) {
    throw new Error(connections.error.message);
  }

  return {
    liveMode: process.env.CHANNEL_LIVE_MODE === "true",
    connections: connections.data ?? [],
    queue: {
      pending: pending.count ?? 0,
      processing: processing.count ?? 0,
      failed: failed.count ?? 0,
      completed: completed.count ?? 0,
    },
    checkedAt: new Date().toISOString(),
  };
}
