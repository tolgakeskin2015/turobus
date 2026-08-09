import { NextResponse } from "next/server";
import { resolveWaitingInboundMappings } from "@/lib/hotel/channel-manager/inbound/mapping-auto-ready";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json().catch(
        () => ({})
      );

    const result =
      await resolveWaitingInboundMappings({
        companyId:
          body.companyId ?? undefined,
        connectionId:
          body.connectionId ?? undefined,
      });

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
            : "Mapping çözümleme başarısız.",
      },
      {
        status: 500,
      }
    );
  }
}
