import type {
  ChannelProviderAdapter,
  ProviderOperationRequest,
  ProviderOperationResult,
} from "../types";

function getBookingCredentials() {
  return {
    username:
      process.env.BOOKING_CONNECTIVITY_USERNAME ?? "",
    password:
      process.env.BOOKING_CONNECTIVITY_PASSWORD ?? "",
    hotelId:
      process.env.BOOKING_HOTEL_ID ?? "",
    live:
      process.env.BOOKING_LIVE_MODE === "true",
  };
}

export const bookingProvider: ChannelProviderAdapter = {
  code: "booking",

  async send(
    input: ProviderOperationRequest
  ): Promise<ProviderOperationResult> {
    const credentials = getBookingCredentials();

    /*
     * Güvenlik:
     * BOOKING_LIVE_MODE=true olmadığı sürece
     * Booking.com'a gerçek HTTP isteği gönderilmez.
     */

    if (!credentials.live) {
      return {
        success: true,
        simulated: true,
        statusCode: 200,
        responsePayload: {
          provider: "booking",
          operation: input.operationType,
          accepted: true,
          simulation: true,
          live_mode: false,
          credentials_configured: Boolean(
            credentials.username &&
              credentials.password
          ),
          hotel_id_configured: Boolean(
            credentials.hotelId
          ),
          processed_at:
            new Date().toISOString(),
        },
      };
    }

    if (
      !credentials.username ||
      !credentials.password
    ) {
      return {
        success: false,
        simulated: false,
        statusCode: 500,
        responsePayload: {
          provider: "booking",
          error:
            "Booking Connectivity credentials tanımlı değil.",
        },
      };
    }

    /*
     * Gerçek Booking Connectivity API çağrıları
     * burada operationType'a göre ayrılacak:
     *
     * connection_test
     * inventory_update
     * rate_update
     * restriction_update
     * full_sync
     *
     * Credential gelmeden HTTP çağrısı YOK.
     */

    return {
      success: false,
      simulated: false,
      statusCode: 501,
      responsePayload: {
        provider: "booking",
        operation: input.operationType,
        error:
          "Booking LIVE adapter henüz aktive edilmedi.",
      },
    };
  },
};
