import type {
  TicketProviderAdapter,
} from "../../provider-adapter";

import {
  searchAmadeusFlightOffers,
} from "./amadeus-client";

import {
  mapAmadeusFlightOffers,
} from "./amadeus-mapper";

export const flightProvider:
  TicketProviderAdapter = {
    id:
      "flight_primary",

    name:
      "Amadeus Flight Provider",

    async search(
      input
    ) {
      const result =
        await searchAmadeusFlightOffers({
          originLocationCode:
            input.origin,
          destinationLocationCode:
            input.destination,
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

      return mapAmadeusFlightOffers(
        result,
        input
      );
    },

    async getOffer() {
      /*
       * Flight Offers Price katmani
       * tamamlanmadan search sonucu
       * yeniden kullanilmayacak.
       */
      return null;
    },

    async createHold() {
      throw new Error(
        "Amadeus Flight Offers Price ve order akışı henüz etkin değil."
      );
    },
  };
