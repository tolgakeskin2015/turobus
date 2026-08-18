import type {
  TicketHoldResult,
  TicketMode,
  TicketOffer,
  TicketSearchInput,
} from "./types";

export type TicketProviderHealth = {
  providerId: string;
  name: string;
  enabled: boolean;
  modes: TicketMode[];
  status: "healthy" | "degraded" | "offline";
};

export interface TicketProviderAdapter {
  id: string;
  name: string;

  search(
    input: TicketSearchInput
  ): Promise<TicketOffer[]>;

  getOffer(
    input: TicketSearchInput,
    offerId: string
  ): Promise<TicketOffer | null>;

  createHold(
    input: TicketSearchInput,
    offer: TicketOffer
  ): Promise<TicketHoldResult>;
}
