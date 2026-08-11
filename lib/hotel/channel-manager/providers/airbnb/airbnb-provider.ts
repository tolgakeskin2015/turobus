import {
  buildProviderRuntimeConfig,
} from "../runtime/provider-runtime";

import type {
  ChannelProviderAdapter,
  ProviderOperationRequest,
  ProviderOperationResult,
} from "../types";

export const airbnbProvider: ChannelProviderAdapter = {
  code: "airbnb",

  async send(
    input: ProviderOperationRequest
  ): Promise<ProviderOperationResult> {
    return {
      success: true,
      simulated: true,
      statusCode: 200,
      responsePayload: {
        provider: "airbnb",
        operation: input.operationType,
        accepted: true,
        simulation: true,
        live_mode: false,
        processed_at: new Date().toISOString(),
      },
    };
  },
};


export function getAirbnbRuntime(
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
