import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CHANNEL_WORKER_SECRET;
  return Boolean(secret) &&
    request.headers.get("x-worker-secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Yetkisiz istek." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("hotel_channel_sync_queue")
    .select(`
      id,
      company_id,
      hotel_id,
      connection_id,
      operation_type,
      status,
      attempt_count,
      max_attempts,
      error_message,
      created_at,
      updated_at,
      connection:hotel_channel_connections (
        channel_code,
        connection_name
      )
    `)
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    errors: data ?? [],
  });
}
