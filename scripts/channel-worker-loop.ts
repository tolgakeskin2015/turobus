import { processChannelQueueBatch } from "../lib/hotel/channel-manager/channel-worker";
import { processInboundReservationBatch } from "../lib/hotel/channel-manager/inbound/inbox-processor";

const intervalSeconds = Math.max(
  5,
  Number(process.env.CHANNEL_WORKER_INTERVAL_SECONDS ?? 15)
);

let running = false;

async function tick() {
  if (running) return;

  running = true;

  try {
    const inbound =
      await processInboundReservationBatch(25);

    const outbound =
      await processChannelQueueBatch(25);

    if (
      inbound.processedCount > 0 ||
      outbound.processedCount > 0
    ) {
      console.log(
        new Date().toISOString(),
        {
          inbound: inbound.processedCount,
          outbound: outbound.processedCount,
        }
      );
    }
  } catch (error) {
    console.error(
      "Unified Channel Worker Error:",
      error
    );
  } finally {
    running = false;
  }
}

console.log("======================================");
console.log("Turobus Unified Channel Worker başladı.");
console.log(`Interval: ${intervalSeconds}s`);
console.log("Inbound : OTA -> PMS");
console.log("Outbound: PMS -> OTA");
console.log("======================================");

void tick();

setInterval(() => {
  void tick();
}, intervalSeconds * 1000);
