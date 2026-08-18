import type {
  TicketProviderAdapter,
} from "../../provider-adapter";

export const ferryProvider:
  TicketProviderAdapter = {
    id: "ferry_primary",
    name: "Turobus Ferry Provider",

    async search() {
      throw new Error(
        "Ferry provider API henüz yapılandırılmadı."
      );
    },

    async getOffer() {
      return null;
    },

    async createHold() {
      throw new Error(
        "Ferry provider hold API henüz yapılandırılmadı."
      );
    },
  };
