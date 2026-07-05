import { startEmailWorker } from "./queue/consumers/email.worker";
import { initExpiryWorker } from "./queue/consumers/expiry.worker";
import { startInventoryConsumer } from "./queue/consumers/inventory.consumer";
import { amqpManager } from "./config/amqp";

async function bootstrap(): Promise<void> {

  const results = await Promise.allSettled([
    startEmailWorker(),
    initExpiryWorker(),
    startInventoryConsumer(),
  ]);

  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failures.length > 0) {
    console.error(
      `Worker startup completed with ${failures.length} failure(s).`,
    );
    failures.forEach((failure) => {
      console.error(failure.reason);
    });
  }
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`Received ${signal}. Shutting down worker gracefully...`);
  await amqpManager.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

bootstrap().catch((error) => {
  console.error("Worker bootstrap failed:", error);
  process.exit(1);
});
