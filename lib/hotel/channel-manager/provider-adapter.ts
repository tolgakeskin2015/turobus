export type ChannelOperationRequest = {
  channelCode: string;
  operationType: string;
  endpointUrl?: string | null;
  payload: Record<string, unknown>;
};

export type ChannelOperationResult = {
  success: boolean;
  simulated: boolean;
  statusCode?: number;
  responsePayload: Record<string, unknown>;
};

export async function sendChannelOperation(
  input: ChannelOperationRequest
): Promise<ChannelOperationResult> {
  /*
   * Gerçek OTA kimlik bilgileri geldiğinde:
   *
   * booking
   * expedia
   * hotelbeds
   * airbnb
   *
   * adapterları burada ayrıştırılacak.
   *
   * Şimdilik production mimarisini bozmadan
   * güvenli simülasyon çalışır.
   */

  return {
    success: true,
    simulated: true,
    responsePayload: {
      channel: input.channelCode,
      operation: input.operationType,
      accepted: true,
      simulation: true,
      processed_at:
        new Date().toISOString(),
    },
  };
}
