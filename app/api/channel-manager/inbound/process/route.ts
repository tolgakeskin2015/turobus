import { NextRequest, NextResponse } from "next/server";
import { processInboundReservationBatch } from "@/lib/hotel/channel-manager/inbound/inbox-processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CHANNEL_WORKER_SECRET;

  return Boolean(secret) &&
    (
      request.headers.get("x-worker-secret") === secret ||
      request.headers.get("authorization") === `Bearer ${secret}`
    );
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Yetkisiz istek." },
      { status: 401 }
    );
  }

  try {
    const result = await processInboundReservationBatch(20);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Inbound processor hatası.",
      },
      { status: 500 }
    );
  }
}
