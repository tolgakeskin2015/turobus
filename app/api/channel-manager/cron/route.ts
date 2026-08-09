import { NextRequest, NextResponse } from "next/server";
import { processChannelQueueBatch } from "@/lib/hotel/channel-manager/channel-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CHANNEL_WORKER_SECRET;
  if (!secret) return false;

  return (
    request.headers.get("x-worker-secret") === secret ||
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

async function run(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Yetkisiz cron isteği." },
      { status: 401 }
    );
  }

  try {
    const result = await processChannelQueueBatch(25);

    return NextResponse.json({
      ok: true,
      mode:
        process.env.CHANNEL_LIVE_MODE === "true"
          ? "live"
          : "simulation",
      ...result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Cron worker hatası.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
