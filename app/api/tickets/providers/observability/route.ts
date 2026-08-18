import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env
      .SUPABASE_SECRET_KEY ??
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Service role yapılandırılmadı.",
      },
      {
        status: 503,
      }
    );
  }

  const supabase =
    createClient(
      url,
      key,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

  const since =
    new Date(
      Date.now() -
      24 * 60 * 60 * 1000
    ).toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "ticket_provider_events"
      )
      .select("*")
      .gte(
        "created_at",
        since
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1000);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }

  const events =
    data ?? [];

  const providers =
    Array.from(
      new Set(
        events.map(
          (event) =>
            event.provider_id
        )
      )
    ).map(
      (providerId) => {
        const rows =
          events.filter(
            (event) =>
              event.provider_id ===
              providerId
          );

        const requestRows =
          rows.filter(
            (event) =>
              event.status !==
              "fallback"
          );

        const success =
          requestRows.filter(
            (event) =>
              event.status ===
              "success"
          ).length;

        const errors =
          requestRows.filter(
            (event) =>
              event.status ===
              "error" ||
              event.status ===
              "timeout"
          ).length;

        const latencyRows =
          requestRows.filter(
            (event) =>
              typeof
                event.latency_ms ===
              "number"
          );

        const avgLatency =
          latencyRows.length
            ? Math.round(
                latencyRows.reduce(
                  (
                    total,
                    event
                  ) =>
                    total +
                    event.latency_ms,
                  0
                ) /
                  latencyRows.length
              )
            : null;

        return {
          providerId,
          total:
            requestRows.length,
          success,
          errors,
          timeout:
            rows.filter(
              (event) =>
                event.status ===
                "timeout"
            ).length,
          fallback:
            rows.filter(
              (event) =>
                event.status ===
                "fallback"
            ).length,
          successRate:
            requestRows.length
              ? Number(
                  (
                    success /
                    requestRows.length *
                    100
                  ).toFixed(2)
                )
              : 0,
          avgLatencyMs:
            avgLatency,
        };
      }
    );

  return NextResponse.json({
    ok: true,
    window:
      "24h",
    generatedAt:
      new Date().toISOString(),
    totalEvents:
      events.length,
    providers,
  });
}
