export type ProviderOperationRequest = {
  channelCode: string;
  operationType: string;
  endpointUrl?: string | null;
  payload: Record<string, unknown>;
};

export type ProviderOperationResult = {
  success: boolean;
  simulated: boolean;
  statusCode?: number;
  responsePayload: Record<string, unknown>;
};

export interface ChannelProviderAdapter {
  code: string;

  send(
    input: ProviderOperationRequest
  ): Promise<ProviderOperationResult>;
}
