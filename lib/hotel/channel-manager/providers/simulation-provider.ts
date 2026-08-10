import type {
  ChannelProviderAdapter,
  ProviderOperationRequest,
  ProviderOperationResult,
} from "./types";

export class SimulationProvider
  implements ChannelProviderAdapter
{
  constructor(
    public readonly code: string
  ) {}

  async send(
    input: ProviderOperationRequest
  ): Promise<ProviderOperationResult> {
    return {
      success: true,
      simulated: true,
      statusCode: 200,
      responsePayload: {
        provider: this.code,
        channel: input.channelCode,
        operation: input.operationType,
        accepted: true,
        simulation: true,
        processed_at: new Date().toISOString(),
      },
    };
  }
}
