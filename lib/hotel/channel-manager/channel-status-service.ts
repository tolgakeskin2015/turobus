import { supabase } from "@/lib/supabase";

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


export type ChannelHealthSummary = {
  activeConnections: number;
  pendingJobs: number;
  processingJobs: number;
  failedJobs: number;
  deadJobs: number;
  healthy: boolean;
};

export async function getChannelHealthSummary(
  companyId: string
): Promise<ChannelHealthSummary> {
  const [
    connectionsResult,
    pendingResult,
    processingResult,
    failedResult,
    deadResult,
  ] = await Promise.all([
    supabase
      .from("hotel_channel_connections")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", companyId)
      .eq("is_active", true),

    supabase
      .from("hotel_channel_sync_queue")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", companyId)
      .eq("status", "pending"),

    supabase
      .from("hotel_channel_sync_queue")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", companyId)
      .eq("status", "processing"),

    supabase
      .from("hotel_channel_sync_queue")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", companyId)
      .eq("status", "failed"),

    supabase
      .from("hotel_channel_sync_queue")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", companyId)
      .eq("status", "dead"),
  ]);

  const firstError =
    connectionsResult.error ??
    pendingResult.error ??
    processingResult.error ??
    failedResult.error ??
    deadResult.error;

  if (firstError) {
    throw new Error(
      firstError.message ||
        "Channel Manager sağlık durumu alınamadı."
    );
  }

  const summary = {
    activeConnections:
      connectionsResult.count ?? 0,
    pendingJobs:
      pendingResult.count ?? 0,
    processingJobs:
      processingResult.count ?? 0,
    failedJobs:
      failedResult.count ?? 0,
    deadJobs:
      deadResult.count ?? 0,
  };

  return {
    ...summary,
    healthy:
      summary.deadJobs === 0 &&
      summary.failedJobs < 10,
  };
}
