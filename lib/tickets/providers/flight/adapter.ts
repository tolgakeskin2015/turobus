import type {
  TicketProviderAdapter,
} from "../../provider-adapter";

export const flightProvider:
  TicketProviderAdapter = {
    id: "flight_primary",
    name: "Turobus Flight Provider",

    async search() {
      throw new Error(
        "Flight provider API henüz yapılandırılmadı."
      );
    },

    async getOffer() {
      return null;
    },

    async createHold() {
      throw new Error(
        "Flight provider hold API henüz yapılandırılmadı."
      );
    },
  };
