import { startEmailWorker } from "./queue/consumers/email.worker";
import { initExpiryWorker } from "./queue/consumers/expiry.worker";
import { startInventoryConsumer } from "./queue/consumers/inventory.consumer";
import { amqpManager } from "./config/amqp";

async function bootstrap(): Promise<void> {
  try {
    await amqpManager.connect();
    await Promise.all([
      startEmailWorker(),
      initExpiryWorker(),
      startInventoryConsumer(),
    ]);
    console.log("Worker started successfully");
  } catch (error) {
    console.error("Worker bootstrap failed:", error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log("Worker shutting down...");
  await amqpManager.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

bootstrap();
