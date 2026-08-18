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

type RegistryEntry = {
  provider: TicketProviderAdapter;
  modes: TicketMode[];
  enabled: boolean;
  priority: number;
};

const registry: RegistryEntry[] = [
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
  return registry.map(
    (entry) => ({
      providerId:
        entry.provider.id,
      name:
        entry.provider.name,
      enabled:
        entry.enabled,
      modes:
        entry.modes,
      status:
        entry.enabled
          ? "healthy"
          : "offline",
    })
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
