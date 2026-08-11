import {
  buildProviderRuntimeConfig,
} from "../runtime/provider-runtime";

import type {
  ChannelProviderAdapter,
  ProviderOperationRequest,
  ProviderOperationResult,
} from "../types";

export const hotelbedsProvider: ChannelProviderAdapter = {
  code: "hotelbeds",

  async send(
    input: ProviderOperationRequest
  ): Promise<ProviderOperationResult> {
    return {
      success: true,
      simulated: true,
      statusCode: 200,
      responsePayload: {
        provider: "hotelbeds",
        operation: input.operationType,
        accepted: true,
        simulation: true,
        live_mode: false,
        processed_at: new Date().toISOString(),
      },
    };
  },
};


export function getHotelbedsRuntime(
  input: {
    endpointUrl?: string | null;
    externalHotelId?: string | null;
    credentials?: unknown;
    settings?: unknown;
  }
) {
  return buildProviderRuntimeConfig(
    input
  );
}
