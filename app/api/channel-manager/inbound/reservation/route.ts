import { NextRequest, NextResponse } from "next/server";
import { receiveChannelReservation } from "@/lib/hotel/channel-manager/inbound/reservation-inbox-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CHANNEL_INBOUND_SECRET;

  if (!secret) return false;

  return (
    request.headers.get("x-channel-secret") === secret ||
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Yetkisiz inbound isteği." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const connectionId = String(
      body.connectionId ?? ""
    );

    const payload = body.payload;

    if (
      !connectionId ||
      !payload ||
      typeof payload !== "object"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "connectionId veya payload eksik.",
        },
        { status: 400 }
      );
    }

    const result =
      await receiveChannelReservation({
        connectionId,
        payload,
      });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Inbound reservation error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Inbound rezervasyon hatası.",
      },
      { status: 500 }
    );
  }
}
