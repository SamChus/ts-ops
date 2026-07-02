// Assuming redisClient is your standard connection and redisSubscriber is a duplicated instance
import { redisSubscriber, pgPool } from "../../config/db";
import { PoolClient } from "pg";

const EXPIRED_CHANNEL = "__keyevent@0__:expired";

export const initExpiryWorker = async (): Promise<void> => {
  try {
    // Subscribe to the Redis keyspace events channel
    await redisSubscriber.subscribe(EXPIRED_CHANNEL, (err, count) => {
      if (err) {
        console.error("Failed to subscribe to Redis expiry events:", err);
        return;
      }
      console.log(
        `[Expiry Worker] Successfully subscribed to ${EXPIRED_CHANNEL}. Listening...`,
      );
    });

    // Handle incoming messages
    redisSubscriber.on("message", async (channel: string, message: string) => {
      // message represents the key that just died: e.g., "booking:expiry:d1bc678a..."
      if (!message.startsWith("booking:expiry:")) return;

      const bookingId: string = message.split(":")[2] || "";
      console.log(
        `[Expiry Worker] Received expiration signal for booking: ${bookingId}`,
      );

      const client: PoolClient = await pgPool.connect();

      try {
        await client.query("BEGIN");

        // 1. Fetch current booking status using row-level locking (FOR UPDATE)
        const bookingCheck = await client.query(
          `SELECT status FROM bookings WHERE id = $1 FOR UPDATE`,
          [bookingId],
        );

        if (
          bookingCheck.rows.length > 0 &&
          bookingCheck.rows[0].status === "pending_payment"
        ) {
          // 2. Transition booking state to expired
          await client.query(
            `UPDATE bookings SET status = 'expired' WHERE id = $1`,
            [bookingId],
          );

          // 3. Revert day-by-day availability slots back to 'available'
          await client.query(
            `UPDATE apartment_availability 
             SET status = 'available', booking_id = NULL 
             WHERE booking_id = $1`,
            [bookingId],
          );

          await client.query("COMMIT");
          console.log(
            `[Expiry Worker] Cleanly released database slots for booking: ${bookingId}`,
          );
        } else {
          // If the booking is already 'paid' or 'cancelled', do nothing and release the lock safely
          await client.query("ROLLBACK");
        }
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(
          `[Expiry Worker] Transaction error while processing booking ${bookingId}:`,
          error,
        );
      } finally {
        client.release();
      }
    });
  } catch (error) {
    console.error("Error initializing expiry worker:", error);
  }
};
