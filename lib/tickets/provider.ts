import type {
  TicketOffer,
  TicketSearchInput,
} from "./types";

export type {
  TicketProviderAdapter,
  TicketProviderHealth,
} from "./provider-adapter";

export {
  getTicketProvider,
  getTicketProviderHealth,
  getTicketProviders,
} from "./registry";

import {
  createTicketHold,
  findTicketOffer,
  searchTicketOffers,
} from "./registry";

/*
  Geriye dönük uyumluluk katmanı.

  Mevcut /biletler ekranları activeTicketProvider
  kullanmaya devam eder. Arkada ise artık
  provider registry çalışır.
*/
export const activeTicketProvider = {
  id: "turobus_registry",
  name: "Turobus Ticket Provider Registry",

  async search(
    input: TicketSearchInput
  ) {
    return searchTicketOffers(
      input
    );
  },

  async getOffer(
    input: TicketSearchInput,
    offerId: string
  ) {
    return findTicketOffer(
      input,
      offerId
    );
  },

  async createHold(
    input: TicketSearchInput,
    offer: TicketOffer
  ) {
    return createTicketHold(
      input,
      offer
    );
  },
};
