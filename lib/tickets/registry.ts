import type {
  TicketMode,
  TicketOffer,
  TicketSearchInput,
} from "./types";

import type {
  TicketProviderAdapter,
  TicketProviderHealth,
} from "./provider-adapter";

import {
  getProviderRuntimeMetric,
  recordProviderError,
  recordProviderFallback,
  recordProviderSuccess,
} from "./runtime-metrics";

import {
  persistProviderEvent,
} from "./persistent-metrics";

import {
  mockProvider,
} from "./providers/mock";

import {
  busProvider,
} from "./providers/bus/adapter";

import {
  flightProvider,
} from "./providers/flight/adapter";

import {
  ferryProvider,
} from "./providers/ferry/adapter";

import {
  trainProvider,
} from "./providers/train/adapter";

type RegistryEntry = {
  provider: TicketProviderAdapter;
  modes: TicketMode[];
  enabled: boolean;
  priority: number;
};

const PROVIDER_TIMEOUT_MS =
  Number(
    process.env
      .TICKET_PROVIDER_TIMEOUT_MS ??
      "8000"
  );

const registry: RegistryEntry[] = [
  {
    provider: busProvider,
    modes: ["bus"],
    enabled:
      process.env
        .TICKET_BUS_PROVIDER_ENABLED ===
      "true",
    priority: 10,
  },
  {
    provider: flightProvider,
    modes: ["flight"],
    enabled:
      process.env
        .TICKET_FLIGHT_PROVIDER_ENABLED ===
      "true",
    priority: 10,
  },
  {
    provider: ferryProvider,
    modes: ["ferry"],
    enabled:
      process.env
        .TICKET_FERRY_PROVIDER_ENABLED ===
      "true",
    priority: 10,
  },
  {
    provider: trainProvider,
    modes: ["train"],
    enabled:
      process.env
        .TICKET_TRAIN_PROVIDER_ENABLED ===
      "true",
    priority: 10,
  },
  {
    provider: mockProvider,
    modes: [
      "bus",
      "flight",
      "ferry",
      "train",
    ],
    enabled: true,
    priority: 100,
  },
];

export class TicketProviderTimeoutError extends Error {
  readonly providerId: string;
  readonly operation: string;
  readonly timeoutMs: number;

  constructor(
    providerId: string,
    operation: string,
    timeoutMs: number
  ) {
    super(
      `${providerId} ${operation} timeout (${timeoutMs} ms)`
    );

    this.name =
      "TicketProviderTimeoutError";

    this.providerId =
      providerId;

    this.operation =
      operation;

    this.timeoutMs =
      timeoutMs;
  }
}

function timeoutPromise<T>(
  promise: Promise<T>,
  providerId: string,
  operation: string
): Promise<T> {
  return new Promise<T>(
    (resolve, reject) => {
      const timer =
        setTimeout(
          () => {
            reject(
              new TicketProviderTimeoutError(
                providerId,
                operation,
                PROVIDER_TIMEOUT_MS
              )
            );
          },
          PROVIDER_TIMEOUT_MS
        );

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    }
  );
}

async function measuredCall<T>(
  provider: TicketProviderAdapter,
  operation: string,
  callback: () => Promise<T>,
  mode?: TicketMode
): Promise<T> {
  const startedAt =
    Date.now();

  try {
    const result =
      await timeoutPromise(
        callback(),
        provider.id,
        operation
      );

    const latency =
      Date.now() - startedAt;

    recordProviderSuccess(
      provider.id,
      operation,
      latency
    );

    await persistProviderEvent({
      providerId:
        provider.id,
      mode:
        mode ?? null,
      operation,
      status:
        "success",
      latencyMs:
        latency,
    });

    return result;
  } catch (error) {
    const latency =
      Date.now() - startedAt;

    recordProviderError(
      provider.id,
      operation,
      error,
      latency
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    await persistProviderEvent({
      providerId:
        provider.id,
      mode:
        mode ?? null,
      operation,
      status:
        error instanceof
          TicketProviderTimeoutError
          ? "timeout"
          : "error",
      latencyMs:
        latency,
      errorMessage:
        message,
    });

    throw error;
  }
}

export function getTicketProviders(
  mode: TicketMode
): TicketProviderAdapter[] {
  return registry
    .filter(
      (entry) =>
        entry.enabled &&
        entry.modes.includes(mode)
    )
    .sort(
      (a, b) =>
        a.priority - b.priority
    )
    .map(
      (entry) =>
        entry.provider
    );
}

export function getTicketProvider(
  providerId: string
): TicketProviderAdapter | null {
  return (
    registry.find(
      (entry) =>
        entry.enabled &&
        entry.provider.id ===
          providerId
    )?.provider ?? null
  );
}

export async function searchTicketOffers(
  input: TicketSearchInput
): Promise<TicketOffer[]> {
  const providers =
    getTicketProviders(
      input.mode
    );

  const results =
    await Promise.allSettled(
      providers.map(
        async (provider) => {
          const offers =
            await measuredCall(
              provider,
              "search",
              () =>
                provider.search(
                  input
                ),
              input.mode
            );

          return offers.map(
            (offer) => ({
              ...offer,
              providerId:
                provider.id,
            })
          );
        }
      )
    );

  const offers:
    TicketOffer[] = [];

  let lastFailedProviderId:
    string | null = null;

  for (
    let index = 0;
    index < results.length;
    index += 1
  ) {
    const result =
      results[index];

    const provider =
      providers[index];

    if (
      result.status ===
      "rejected"
    ) {
      lastFailedProviderId =
        provider.id;

      continue;
    }

    if (
      lastFailedProviderId &&
      result.value.length > 0
    ) {
      recordProviderFallback(
        provider.id
      );

      await persistProviderEvent({
        providerId:
          provider.id,
        mode:
          input.mode,
        operation:
          "search",
        status:
          "fallback",
        failoverFrom:
          lastFailedProviderId,
        failoverTo:
          provider.id,
      });

      lastFailedProviderId =
        null;
    }

    offers.push(
      ...result.value
    );
  }

  return offers;
}

export async function findTicketOfferFromProvider(
  input: TicketSearchInput,
  providerId: string,
  offerId: string
): Promise<TicketOffer | null> {
  const provider =
    getTicketProvider(
      providerId
    );

  if (!provider) {
    return null;
  }

  const offer =
    await measuredCall(
      provider,
      "getOffer",
      () =>
        provider.getOffer(
          input,
          offerId
        )
    );

  if (!offer) {
    return null;
  }

  return {
    ...offer,
    providerId:
      provider.id,
  };
}

export async function findTicketOffer(
  input: TicketSearchInput,
  offerId: string
): Promise<TicketOffer | null> {
  const providers =
    getTicketProviders(
      input.mode
    );

  let lastFailedProviderId:
    string | null = null;

  for (
    const provider of providers
  ) {
    try {
      const offer =
        await measuredCall(
          provider,
          "getOffer",
          () =>
            provider.getOffer(
              input,
              offerId
            ),
          input.mode
        );

      if (offer) {
        if (
          lastFailedProviderId
        ) {
          recordProviderFallback(
            provider.id
          );

          await persistProviderEvent({
            providerId:
              provider.id,
            mode:
              input.mode,
            operation:
              "getOffer",
            status:
              "fallback",
            failoverFrom:
              lastFailedProviderId,
            failoverTo:
              provider.id,
          });
        }

        return {
          ...offer,
          providerId:
            provider.id,
        };
      }
    } catch {
      lastFailedProviderId =
        provider.id;
    }
  }

  return null;
}

export async function createTicketHold(
  input: TicketSearchInput,
  offer: TicketOffer
) {
  const provider =
    getTicketProvider(
      offer.providerId
    );

  if (!provider) {
    throw new Error(
      `Bilet sağlayıcısı bulunamadı: ${offer.providerId}`
    );
  }

  return measuredCall(
    provider,
    "createHold",
    () =>
      provider.createHold(
        input,
        offer
      ),
    input.mode
  );
}

function statusForProvider(
  enabled: boolean,
  fallback: boolean,
  consecutiveErrors: number,
  successCount: number
):
  TicketProviderHealth["status"] {
  if (!enabled) {
    return "disabled";
  }

  if (
    consecutiveErrors >= 3
  ) {
    return "offline";
  }

  if (
    consecutiveErrors > 0
  ) {
    return "degraded";
  }

  if (
    successCount > 0 ||
    fallback
  ) {
    return "healthy";
  }

  return "degraded";
}

export function getTicketProviderHealth():
  TicketProviderHealth[] {
  const checkedAt =
    new Date().toISOString();

  return registry.map(
    (entry) => {
      const fallback =
        entry.provider.id ===
        "turobus_mock";

      const metric =
        getProviderRuntimeMetric(
          entry.provider.id
        );

      const status =
        statusForProvider(
          entry.enabled,
          fallback,
          metric.consecutiveErrors,
          metric.successCount
        );

      return {
        providerId:
          entry.provider.id,

        name:
          entry.provider.name,

        enabled:
          entry.enabled,

        modes:
          entry.modes,

        status,

        priority:
          entry.priority,

        fallback,

        latencyMs:
          metric.latencyMs,

        totalRequests:
          metric.totalRequests,

        successCount:
          metric.successCount,

        errorCount:
          metric.errorCount,

        consecutiveErrors:
          metric.consecutiveErrors,

        fallbackEvents:
          metric.fallbackEvents,

        lastCheckedAt:
          checkedAt,

        lastSuccessAt:
          metric.lastSuccessAt,

        lastErrorAt:
          metric.lastErrorAt,

        lastOperation:
          metric.lastOperation,

        lastError:
          !entry.enabled
            ? "Provider devre dışı."
            : metric.lastError ??
              (
                fallback
                  ? null
                  : "Henüz canlı provider çağrısı yapılmadı."
              ),
      };
    }
  );
}
