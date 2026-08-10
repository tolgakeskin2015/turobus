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
