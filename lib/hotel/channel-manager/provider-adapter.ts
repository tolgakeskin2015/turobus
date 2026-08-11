import {
  getChannelProvider,
} from "./providers/provider-registry";

import type {
  ProviderOperationRequest,
  ProviderOperationResult,
} from "./providers/types";

export type ChannelOperationRequest =
  ProviderOperationRequest;

export type ChannelOperationResult =
  ProviderOperationResult;

export async function sendChannelOperation(
  input: ChannelOperationRequest
): Promise<ChannelOperationResult> {
  const provider =
    getChannelProvider(input.channelCode);

  return provider.send(input);
}


export type ChannelProviderHealth = {
  ok: boolean;
  provider: string;
  checkedAt: string;
  message?: string | null;
  latencyMs?: number | null;
};

export type ChannelInventoryPushInput = {
  connectionId: string;
  companyId: string;
  hotelId: string;
  roomTypeId: string;
  date: string;
  availability: number;
};

export type ChannelRatePushInput = {
  connectionId: string;
  companyId: string;
  hotelId: string;
  roomTypeId: string;
  ratePlanId?: string | null;
  date: string;
  amount: number;
  currency: string;
};

export type ChannelReservationPullResult = {
  externalReservationId: string;
  payload: unknown;
};

export interface ProductionChannelProviderAdapter {
  provider: string;

  healthCheck(): Promise<ChannelProviderHealth>;

  pushInventory(
    input: ChannelInventoryPushInput
  ): Promise<void>;

  pushRate(
    input: ChannelRatePushInput
  ): Promise<void>;

  pullReservations?(): Promise<
    ChannelReservationPullResult[]
  >;
}
