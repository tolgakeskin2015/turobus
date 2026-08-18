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

const registry: RegistryEntry[] = [
  {
    provider: busProvider,
    modes: ["bus"],
    enabled:
      process.env.TICKET_BUS_PROVIDER_ENABLED ===
      "true",
    priority: 10,
  },
  {
    provider: flightProvider,
    modes: ["flight"],
    enabled:
      process.env.TICKET_FLIGHT_PROVIDER_ENABLED ===
      "true",
    priority: 10,
  },
  {
    provider: ferryProvider,
    modes: ["ferry"],
    enabled:
      process.env.TICKET_FERRY_PROVIDER_ENABLED ===
      "true",
    priority: 10,
  },
  {
    provider: trainProvider,
    modes: ["train"],
    enabled:
      process.env.TICKET_TRAIN_PROVIDER_ENABLED ===
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
            await provider.search(
              input
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

  return results.flatMap(
    (result) =>
      result.status ===
      "fulfilled"
        ? result.value
        : []
  );
}

export async function findTicketOffer(
  input: TicketSearchInput,
  offerId: string
): Promise<TicketOffer | null> {
  const providers =
    getTicketProviders(
      input.mode
    );

  for (
    const provider of providers
  ) {
    try {
      const offer =
        await provider.getOffer(
          input,
          offerId
        );

      if (offer) {
        return {
          ...offer,
          providerId:
            provider.id,
        };
      }
    } catch {
      // Bir sağlayıcı hata verirse
      // diğer sağlayıcılarla devam edilir.
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

  return provider.createHold(
    input,
    offer
  );
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

      let status:
        TicketProviderHealth["status"];

      if (!entry.enabled) {
        status = "disabled";
      } else if (fallback) {
        status = "healthy";
      } else {
        /*
          Gerçek API adapter'ı aktif edildiğinde
          canlı probe/latency sonucu buraya
          bağlanacak.
        */
        status = "degraded";
      }

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
          fallback ? 0 : null,
        lastCheckedAt:
          checkedAt,
        lastSuccessAt:
          fallback
            ? checkedAt
            : null,
        lastError:
          !entry.enabled
            ? "Provider devre dışı."
            : fallback
              ? null
              : "Canlı API health probe henüz yapılandırılmadı.",
      };
    }
  );
}

/*
  GERÇEK API EKLEME NOKTASI

  Örnek:

  {
    provider: busRealProvider,
    modes: ["bus"],
    enabled: true,
    priority: 10,
  }

  {
    provider: flightRealProvider,
    modes: ["flight"],
    enabled: true,
    priority: 10,
  }

  Böylece Turobus tek sağlayıcıya
  bağımlı kalmaz.
*/
