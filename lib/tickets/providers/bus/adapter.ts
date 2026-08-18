import type {
  TicketProviderAdapter,
} from "../../provider-adapter";

export const busProvider:
  TicketProviderAdapter = {
    id: "bus_primary",
    name: "Turobus Bus Provider",

    async search() {
      throw new Error(
        "Bus provider API henüz yapılandırılmadı."
      );
    },

    async getOffer() {
      return null;
    },

    async createHold() {
      throw new Error(
        "Bus provider hold API henüz yapılandırılmadı."
      );
    },
  };
