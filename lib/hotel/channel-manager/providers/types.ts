export type ProviderOperationRequest = {
  channelCode: string;
  operationType: string;
  endpointUrl?: string | null;
  payload: Record<string, unknown>;
  connection?: ProviderConnectionContext;
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


export type ProviderConnectionContext = {
  connectionId?: string;
  companyId?: string;
  hotelId?: string;

  endpointUrl?: string | null;

  externalHotelId?: string | null;

  credentials?: Record<
    string,
    unknown
  >;

  settings?: Record<
    string,
    unknown
  >;
};
