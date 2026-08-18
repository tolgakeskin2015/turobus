import type {
  TicketHoldResult,
  TicketMode,
  TicketOffer,
  TicketSearchInput,
} from "./types";

export type TicketProviderStatus =
  | "healthy"
  | "degraded"
  | "offline"
  | "disabled";

export type TicketProviderHealth = {
  providerId: string;
  name: string;
  enabled: boolean;
  modes: TicketMode[];
  status: TicketProviderStatus;
  priority: number;
  fallback: boolean;
  latencyMs: number | null;
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  lastError: string | null;
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
