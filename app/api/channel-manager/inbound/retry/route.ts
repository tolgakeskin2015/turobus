import { NextResponse } from "next/server";
import { retryFailedInboundReservations } from "@/lib/hotel/channel-manager/inbound/inbound-retry";

export async function POST() {
  try {
    const result =
      await retryFailedInboundReservations(50);

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
            : "Inbound retry başarısız.",
      },
      {
        status: 500,
      }
    );
  }
}
