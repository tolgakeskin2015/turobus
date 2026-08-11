export type ProviderCredentials =
  Record<string, unknown>;

export type ProviderRuntimeConfig = {
  liveMode: boolean;
  endpointUrl: string | null;
  externalHotelId: string | null;
  credentials: ProviderCredentials;
  settings: Record<string, unknown>;
  timeoutMs: number;
};

function asRecord(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function buildProviderRuntimeConfig(
  input: {
    endpointUrl?: string | null;
    externalHotelId?: string | null;
    credentials?: unknown;
    settings?: unknown;
  }
): ProviderRuntimeConfig {
  const settings = asRecord(
    input.settings
  );

  const configuredTimeout =
    Number(settings.timeout_ms ?? 15000);

  const timeoutMs =
    Number.isFinite(configuredTimeout)
      ? Math.min(
          60000,
          Math.max(
            3000,
            configuredTimeout
          )
        )
      : 15000;

  return {
    liveMode:
      process.env.CHANNEL_LIVE_MODE ===
      "true",

    endpointUrl:
      input.endpointUrl?.trim() ||
      null,

    externalHotelId:
      input.externalHotelId?.trim() ||
      null,

    credentials:
      asRecord(input.credentials),

    settings,

    timeoutMs,
  };
}

export function validateProviderEndpoint(
  endpointUrl: string
): URL {
  let url: URL;

  try {
    url = new URL(endpointUrl);
  } catch {
    throw new Error(
      "Provider endpoint URL geçersiz."
    );
  }

  if (url.protocol !== "https:") {
    throw new Error(
      "Canlı OTA endpoint yalnız HTTPS olabilir."
    );
  }

  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1"
  ) {
    throw new Error(
      "Yerel provider endpoint kullanımına izin verilmez."
    );
  }

  return url;
}

export function sanitizeProviderError(
  value: unknown
): string {
  const message =
    value instanceof Error
      ? value.message
      : String(value ?? "");

  return message
    .replace(
      /(authorization|api[_-]?key|secret|password|token)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]"
    )
    .slice(0, 1000);
}
