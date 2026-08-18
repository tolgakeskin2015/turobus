import type {
  TicketProviderAdapter,
} from "../../provider-adapter";

import {
  cacheProviderOffers,
  getCachedProviderOffer,
  updateCachedProviderOffer,
} from "../../provider-offer-cache";

import {
  priceAmadeusFlightOffer,
  searchAmadeusFlightOffers,
} from "./amadeus-client";

import type {
  AmadeusFlightOffer,
  AmadeusFlightOffersResponse,
} from "./amadeus-client";

import {
  mapAmadeusFlightOffers,
} from "./amadeus-mapper";

const PROVIDER_ID =
  "flight_primary";

type CachedAmadeusPayload = {
  offer:
    AmadeusFlightOffer;

  dictionaries:
    AmadeusFlightOffersResponse[
      "dictionaries"
    ];
};

function isCachedAmadeusPayload(
  value: unknown
): value is
  CachedAmadeusPayload {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const record =
    value as
      Record<string, unknown>;

  return Boolean(
    record.offer &&
    typeof record.offer ===
      "object"
  );
}

export const flightProvider:
  TicketProviderAdapter = {
    id:
      PROVIDER_ID,

    name:
      "Amadeus Flight Provider",

    async search(
      input
    ) {
      const result =
        await searchAmadeusFlightOffers({
          originLocationCode:
            input.origin
              .trim()
              .toUpperCase(),

          destinationLocationCode:
            input.destination
              .trim()
              .toUpperCase(),

          departureDate:
            input.departureDate,

          returnDate:
            input.tripType ===
              "round_trip"
              ? input.returnDate
              : undefined,

          adults:
            input.adults,

          children:
            input.children,

          infants:
            input.infants,

          currencyCode:
            "TRY",

          max:
            40,
        });

      const cacheIds =
        await cacheProviderOffers(
          (
            result.data ??
            []
          ).map(
            (offer) => ({
              providerId:
                PROVIDER_ID,

              providerOfferId:
                offer.id,

              mode:
                "flight",

              search:
                input,

              rawOffer: {
                offer,
                dictionaries:
                  result.dictionaries ??
                  {},
              },
            })
          )
        );

      const publicOfferIds:
        Record<
          string,
          string
        > = {};

      for (
        const [
          providerOfferId,
          cacheId,
        ] of cacheIds
      ) {
        publicOfferIds[
          providerOfferId
        ] =
          cacheId;
      }

      return mapAmadeusFlightOffers(
        result,
        input,
        publicOfferIds
      );
    },

    async getOffer(
      input,
      offerId
    ) {
      const cached =
        await getCachedProviderOffer({
          id:
            offerId,

          providerId:
            PROVIDER_ID,

          mode:
            "flight",

          search:
            input,
        });

      if (
        !cached ||
        !isCachedAmadeusPayload(
          cached.rawOffer
        )
      ) {
        return null;
      }

      const priced =
        await priceAmadeusFlightOffer(
          cached
            .rawOffer
            .offer
        );

      const pricedOffer =
        priced.data
          ?.flightOffers
          ?.[0];

      if (!pricedOffer) {
        return null;
      }

      const dictionaries =
        priced.dictionaries ??
        cached
          .rawOffer
          .dictionaries ??
        {};

      await updateCachedProviderOffer({
        id:
          cached.id,

        rawOffer: {
          offer:
            pricedOffer,

          dictionaries,
        },
      });

      const mapped =
        mapAmadeusFlightOffers(
          {
            data: [
              pricedOffer,
            ],
            dictionaries,
          },
          input,
          {
            [pricedOffer.id]:
              cached.id,
          }
        );

      return (
        mapped[0] ??
        null
      );
    },

    async createHold() {
      /*
       * Amadeus Self-Service uçuş akışında
       * sonraki aşama Flight Create Orders.
       * Order katmanı tamamlanana kadar
       * gerçek satış bilinçli olarak kapalı.
       */
      throw new Error(
        "Amadeus Flight Create Orders akışı henüz etkin değil."
      );
    },
  };
