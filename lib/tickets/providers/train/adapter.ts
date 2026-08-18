import type {
  TicketProviderAdapter,
} from "../../provider-adapter";

export const trainProvider:
  TicketProviderAdapter = {
    id: "train_primary",
    name: "Turobus Train Provider",

    async search() {
      throw new Error(
        "Train provider API henüz yapılandırılmadı."
      );
    },

    async getOffer() {
      return null;
    },

    async createHold() {
      throw new Error(
        "Train provider hold API henüz yapılandırılmadı."
      );
    },
  };
