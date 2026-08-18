import {
  createClient,
} from "@supabase/supabase-js";

type ProviderEventInput = {
  providerId: string;
  mode?: string | null;
  operation: string;
  status:
    | "success"
    | "error"
    | "timeout"
    | "fallback";
  latencyMs?: number | null;
  errorMessage?: string | null;
  failoverFrom?: string | null;
  failoverTo?: string | null;
};

function getAdminClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env
      .SUPABASE_SECRET_KEY ??
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function persistProviderEvent(
  input: ProviderEventInput
) {
  const supabase =
    getAdminClient();

  if (!supabase) {
    return;
  }

  const {
    error,
  } =
    await supabase
      .from(
        "ticket_provider_events"
      )
      .insert({
        provider_id:
          input.providerId,

        mode:
          input.mode ?? null,

        operation:
          input.operation,

        status:
          input.status,

        latency_ms:
          input.latencyMs ?? null,

        error_message:
          input.errorMessage ?? null,

        failover_from:
          input.failoverFrom ?? null,

        failover_to:
          input.failoverTo ?? null,
      });

  if (error) {
    console.error(
      "[ticket-provider-observability]",
      error.message
    );
  }
}
