import { pgPool, redisClient, getPgClient } from "../config/db";
import { User } from "../types";



export class UserService {
  // 1. FETCHING DATA (Cache-Aside Pattern)
  static async getUserProfileByEmail(email: string): Promise<User | null> {

    const cacheKey = `user:profile:${email}`;

    // Attempt to retrieve from Redis cache first
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log("Cache hit for user profile:", email);
      return JSON.parse(cachedData) as User;
    }

    console.log("Cache miss for user profile:", email);

    // If not in cache, query PostgreSQL
    const queryText =
      "SELECT id, name, email, phone, password, isVerified, created_at, updated_at FROM users WHERE email = $1";
    const result = await pgPool.query(queryText, [email]);
    if (result.rows.length === 0) return null;
    const user = result.rows[0] as User;

    // Store the retrieved user profile in Redis with an expiration time (e.g., 1 hour)
    await redisClient.set(cacheKey, JSON.stringify(user), { EX: 3600 });
    return user;
  }



  // 3. SECURE TRANSACTIONS (ACID compliant with safe rollback)
  static async transferFunds(
    senderId: number,
    receiverId: number,
    amount: number,
  ): Promise<boolean> {
    // Acquire an independent single connection client from the general pool
    const client = await getPgClient();

    try {
      // Begin standard SQL transaction isolation block
      await client.query("BEGIN");

      // Fetch current balances inside the transaction with a write-lock (FOR UPDATE)
      const senderQuery = "SELECT balance FROM users WHERE id = $1 FOR UPDATE";
      const senderRes = await client.query(senderQuery, [senderId]);

      if (senderRes.rows.length === 0) throw new Error("Sender not found");
      if (senderRes.rows[0].balance < amount)
        throw new Error("Insufficient balance funds");

      // Deduct from Sender
      await client.query(
        "UPDATE users SET balance = balance - $1 WHERE id = $2",
        [amount, senderId],
      );

      // Credit to Receiver
      const receiverRes = await client.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2",
        [amount, receiverId],
      );
      if (receiverRes.rowCount === 0) throw new Error("Receiver not found");

      // Commit all operations permanently to disk
      await client.query("COMMIT");

      // Invalidate stale caches in Redis so subsequent reads fetch fresh data
      await redisClient.del(`user:profile:${senderId}`);
      await redisClient.del(`user:profile:${receiverId}`);

      return true;
    } catch (error) {
      // Instantly reverse modifications if any single operation throws an error
      await client.query("ROLLBACK");
      console.error("❌ Transaction rolled back due to error:", error);
      throw error;
    } finally {
      // Crucial: Release client link back to pool for future requests
      client.release();
    }
  }
}
