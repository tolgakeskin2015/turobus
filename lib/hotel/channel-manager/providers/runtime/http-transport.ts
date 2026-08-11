import {
  sanitizeProviderError,
  validateProviderEndpoint,
} from "./provider-runtime";

export type ProviderHttpRequest = {
  endpointUrl: string;
  method?: "GET" | "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type ProviderHttpResult = {
  ok: boolean;
  statusCode: number;
  responsePayload:
    Record<string, unknown>;
};

function safeJson(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {
    value,
  };
}

export async function sendProviderHttpRequest(
  input: ProviderHttpRequest
): Promise<ProviderHttpResult> {
  const url =
    validateProviderEndpoint(
      input.endpointUrl
    );

  const controller =
    new AbortController();

  const timeoutMs =
    Math.min(
      60000,
      Math.max(
        3000,
        Number(
          input.timeoutMs ?? 15000
        )
      )
    );

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
      url,
      {
        method:
          input.method ?? "POST",

        headers: {
          "Content-Type":
            "application/json",
          "Accept":
            "application/json",
          ...(input.headers ?? {}),
        },

        body:
          input.body === undefined
            ? undefined
            : JSON.stringify(
                input.body
              ),

        signal:
          controller.signal,

        redirect: "error",
        cache: "no-store",
      }
    );

    const raw =
      await response.text();

    let parsed: unknown = {};

    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          message:
            raw.slice(0, 2000),
        };
      }
    }

    return {
      ok: response.ok,
      statusCode:
        response.status,
      responsePayload:
        safeJson(parsed),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `Provider timeout (${timeoutMs}ms).`
      );
    }

    throw new Error(
      sanitizeProviderError(error)
    );
  } finally {
    clearTimeout(timer);
  }
}
