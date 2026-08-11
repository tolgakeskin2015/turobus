import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveWaitingInboundMappings,
} from "@/lib/hotel/channel-manager/inbound/mapping-auto-ready";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(
  request: NextRequest
): boolean {
  const secret =
    process.env.CHANNEL_WORKER_SECRET;

  if (!secret) return false;

  return (
    request.headers.get(
      "x-worker-secret"
    ) === secret ||
    request.headers.get(
      "authorization"
    ) === `Bearer ${secret}`
  );
}

export async function POST(
  request: NextRequest
) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Yetkisiz istek.",
      },
      {
        status: 401,
      }
    );
  }

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
