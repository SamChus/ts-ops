// src/queue/consumers/inventory.consumer.ts
import { pgPool } from "../../config/db";
import { PoolClient } from "pg";
import { PaymentConfirmedMessage } from "../../types";
import { messageBroker, type QueueMessage } from "../messageBroker";

export const startInventoryConsumer = async (): Promise<void> => {
  const amqpChannel = await messageBroker.createChannel();
  await amqpChannel.assertQueue("payment_confirmed_queue", { durable: true });

  amqpChannel.consume(
    "payment_confirmed_queue",
    async (msg: QueueMessage | null) => {
      if (!msg) return;

      const { bookingId }: PaymentConfirmedMessage = JSON.parse(
        msg.content.toString(),
      );
      const client: PoolClient = await pgPool.connect();

      try {
        await client.query("BEGIN");

        // 1. Mark booking row as paid
        await client.query(
          `UPDATE bookings SET status = 'paid' WHERE id = $1`,
          [bookingId],
        );

        // 2. Secure day-by-day rows to final status 'booked'
        await client.query(
          `UPDATE apartment_availability 
         SET status = 'booked' 
         WHERE booking_id = $1`,
          [bookingId],
        );

        await client.query("COMMIT");

        // Acknowledge event completion to RabbitMQ
        msg.ack();
        console.log(
          `[Inventory Worker] Matrix updated successfully for paid booking: ${bookingId}`,
        );
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(
          `[Inventory Worker] Failed processing paid booking ${bookingId}:`,
          error,
        );

        // Re-queue the event message to handle temporary database timeouts/issues
        msg.nack(false, true);
      } finally {
        client.release();
      }
    },
  );
};
