import { NextResponse } from "next/server";
import { processNextChannelQueueItem } from "@/lib/hotel/channel-manager/channel-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await processNextChannelQueueItem();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Channel manager worker error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen worker hatası.",
      },
      { status: 500 }
    );
  }
}
