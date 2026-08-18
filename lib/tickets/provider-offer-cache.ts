import {
  createHash,
} from "node:crypto";

import {
  createClient,
} from "@supabase/supabase-js";

import type {
  TicketMode,
  TicketSearchInput,
} from "./types";

const OFFER_TTL_MINUTES =
  Number(
    process.env
      .TICKET_PROVIDER_OFFER_TTL_MINUTES ??
      "15"
  );

type CacheOfferInput = {
  providerId: string;
  providerOfferId: string;
  mode: TicketMode;
  search: TicketSearchInput;
  rawOffer: unknown;
};

export type CachedProviderOffer = {
  id: string;
  providerId: string;
  providerOfferId: string;
  mode: TicketMode;
  rawOffer: unknown;
  expiresAt: string;
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
    throw new Error(
      "Ticket provider offer cache için Supabase backend anahtarı yapılandırılmadı."
    );
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession:
          false,
        autoRefreshToken:
          false,
      },
    }
  );
}

function normalizedSearch(
  search: TicketSearchInput
) {
  return {
    mode:
      search.mode,
    tripType:
      search.tripType,
    origin:
      search.origin
        .trim()
        .toUpperCase(),
    destination:
      search.destination
        .trim()
        .toUpperCase(),
    departureDate:
      search.departureDate,
    returnDate:
      search.returnDate ??
      "",
    adults:
      search.adults,
    children:
      search.children,
    infants:
      search.infants,
  };
}

export function ticketSearchFingerprint(
  search: TicketSearchInput
) {
  return createHash(
    "sha256"
  )
    .update(
      JSON.stringify(
        normalizedSearch(
          search
        )
      )
    )
    .digest(
      "hex"
    );
}

function expiryDate() {
  return new Date(
    Date.now() +
      OFFER_TTL_MINUTES *
        60 *
        1000
  ).toISOString();
}

export async function cacheProviderOffers(
  inputs: CacheOfferInput[]
) {
  if (
    inputs.length === 0
  ) {
    return new Map<
      string,
      string
    >();
  }

  const supabase =
    getAdminClient();

  const rows =
    inputs.map(
      (input) => ({
        provider_id:
          input.providerId,

        provider_offer_id:
          input.providerOfferId,

        mode:
          input.mode,

        search_fingerprint:
          ticketSearchFingerprint(
            input.search
          ),

        search_payload:
          normalizedSearch(
            input.search
          ),

        raw_offer:
          input.rawOffer,

        expires_at:
          expiryDate(),
      })
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "ticket_provider_offer_cache"
      )
      .insert(
        rows
      )
      .select(
        "id, provider_offer_id"
      );

  if (error) {
    throw new Error(
      `Provider offer cache insert failed: ${error.message}`
    );
  }

  const result =
    new Map<
      string,
      string
    >();

  for (
    const row of data ?? []
  ) {
    result.set(
      row.provider_offer_id,
      row.id
    );
  }

  return result;
}

export async function getCachedProviderOffer(
  input: {
    id: string;
    providerId: string;
    mode: TicketMode;
    search: TicketSearchInput;
  }
): Promise<
  CachedProviderOffer | null
> {
  const supabase =
    getAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "ticket_provider_offer_cache"
      )
      .select(
        "id, provider_id, provider_offer_id, mode, raw_offer, expires_at, search_fingerprint"
      )
      .eq(
        "id",
        input.id
      )
      .eq(
        "provider_id",
        input.providerId
      )
      .eq(
        "mode",
        input.mode
      )
      .gt(
        "expires_at",
        new Date()
          .toISOString()
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Provider offer cache read failed: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  if (
    data.search_fingerprint !==
    ticketSearchFingerprint(
      input.search
    )
  ) {
    return null;
  }

  return {
    id:
      data.id,

    providerId:
      data.provider_id,

    providerOfferId:
      data.provider_offer_id,

    mode:
      data.mode as
        TicketMode,

    rawOffer:
      data.raw_offer,

    expiresAt:
      data.expires_at,
  };
}

export async function updateCachedProviderOffer(
  input: {
    id: string;
    rawOffer: unknown;
  }
) {
  const supabase =
    getAdminClient();

  const {
    error,
  } =
    await supabase
      .from(
        "ticket_provider_offer_cache"
      )
      .update({
        raw_offer:
          input.rawOffer,

        updated_at:
          new Date()
            .toISOString(),

        expires_at:
          expiryDate(),
      })
      .eq(
        "id",
        input.id
      );

  if (error) {
    throw new Error(
      `Provider offer cache update failed: ${error.message}`
    );
  }
}
