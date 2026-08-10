import {
  sendChannelOperation,
} from "../lib/hotel/channel-manager/provider-adapter";

async function main() {
  const channels = [
    "booking",
    "booking.com",
    "expedia",
    "hotelbeds",
    "airbnb",
    "unknown-test",
  ];

  console.log("======================================");
  console.log(" TUROBUS PROVIDER ROUTER TEST");
  console.log("======================================");

  for (const channelCode of channels) {
    const result = await sendChannelOperation({
      channelCode,
      operationType: "connection_test",
      endpointUrl: null,
      payload: {
        test: true,
      },
    });

    console.log({
      input: channelCode,
      success: result.success,
      simulated: result.simulated,
      provider: result.responsePayload.provider,
      operation: result.responsePayload.operation,
    });
  }

  console.log("======================================");
  console.log(" PROVIDER ROUTER TEST TAMAMLANDI");
  console.log("======================================");
}

main().catch((error) => {
  console.error("TEST ERROR:", error);
  process.exit(1);
});
