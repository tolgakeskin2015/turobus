type ProviderRuntimeMetric = {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  consecutiveErrors: number;
  fallbackEvents: number;
  latencyMs: number | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  lastOperation: string | null;
};

const metrics =
  new Map<string, ProviderRuntimeMetric>();

function emptyMetric(): ProviderRuntimeMetric {
  return {
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    consecutiveErrors: 0,
    fallbackEvents: 0,
    latencyMs: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastError: null,
    lastOperation: null,
  };
}

function getMetric(
  providerId: string
): ProviderRuntimeMetric {
  const existing =
    metrics.get(providerId);

  if (existing) {
    return existing;
  }

  const created =
    emptyMetric();

  metrics.set(
    providerId,
    created
  );

  return created;
}

export function recordProviderSuccess(
  providerId: string,
  operation: string,
  latencyMs: number
) {
  const metric =
    getMetric(providerId);

  metric.totalRequests += 1;
  metric.successCount += 1;
  metric.consecutiveErrors = 0;
  metric.latencyMs = latencyMs;
  metric.lastSuccessAt =
    new Date().toISOString();
  metric.lastError = null;
  metric.lastOperation = operation;
}

export function recordProviderError(
  providerId: string,
  operation: string,
  error: unknown,
  latencyMs: number
) {
  const metric =
    getMetric(providerId);

  metric.totalRequests += 1;
  metric.errorCount += 1;
  metric.consecutiveErrors += 1;
  metric.latencyMs = latencyMs;
  metric.lastErrorAt =
    new Date().toISOString();
  metric.lastOperation = operation;

  metric.lastError =
    error instanceof Error
      ? error.message
      : String(error);
}

export function recordProviderFallback(
  providerId: string
) {
  const metric =
    getMetric(providerId);

  metric.fallbackEvents += 1;
}

export function getProviderRuntimeMetric(
  providerId: string
): ProviderRuntimeMetric {
  return {
    ...getMetric(providerId),
  };
}

export function getAllProviderRuntimeMetrics() {
  return Object.fromEntries(
    Array.from(
      metrics.entries()
    ).map(
      ([providerId, metric]) => [
        providerId,
        {
          ...metric,
        },
      ]
    )
  );
}
