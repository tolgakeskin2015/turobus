import { NextRequest, NextResponse } from "next/server";
import { getChannelEngineStatus } from "@/lib/hotel/channel-manager/channel-status-service";

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

  try {
    const status = await getChannelEngineStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Status hatası.",
      },
      { status: 500 }
    );
  }
}
