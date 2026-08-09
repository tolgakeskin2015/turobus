import { processNextChannelQueueItem } from "../lib/hotel/channel-manager/channel-worker";

async function main() {
  const result = await processNextChannelQueueItem();

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
