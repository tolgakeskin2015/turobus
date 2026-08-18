import {
  NextResponse,
} from "next/server";

import {
  getTicketProviderHealth,
} from "@/lib/tickets/provider";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const providers =
    getTicketProviderHealth();

  const enabled =
    providers.filter(
      (provider) =>
        provider.enabled
    );

  const healthy =
    enabled.filter(
      (provider) =>
        provider.status ===
        "healthy"
    );

  return NextResponse.json({
    ok: true,
    generatedAt:
      new Date().toISOString(),
    summary: {
      total:
        providers.length,
      enabled:
        enabled.length,
      healthy:
        healthy.length,
      degraded:
        providers.filter(
          (provider) =>
            provider.status ===
            "degraded"
        ).length,
      offline:
        providers.filter(
          (provider) =>
            provider.status ===
            "offline"
        ).length,
      disabled:
        providers.filter(
          (provider) =>
            provider.status ===
            "disabled"
        ).length,
    },
    providers,
  });
}
