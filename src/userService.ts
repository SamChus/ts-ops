import { pgPool, redisClient, getPgClient } from "./db";

export interface User {
  id: number;
  name: string;
  email: string;
  balance: number;
}

export class UserService {
  // 1. FETCHING DATA (Cache-Aside Pattern)
  static async getUserProfile(userId: number): Promise<User | null> {
    const cacheKey = `user:profile:${userId}`;

    // Step A: Check Redis Cache
    const cachedUser = await redisClient.get(cacheKey);
    if (cachedUser) {
      console.log("📦 Redis Cache Hit!");
      return JSON.parse(cachedUser);
    }

    console.log("🔍 Redis Cache Miss. Querying PostgreSQL...");

    // Step B: Query Postgres securely (Parameterized values guard against SQL Injection)
    const queryText =
      "SELECT id, name, email, balance FROM users WHERE id = $1 LIMIT 1";
    const result = await pgPool.query(queryText, [userId]);

    if (result.rows.length === 0) return null;
    const user: User = result.rows[0];

    // Step C: Save to Redis Cache with a 5-minute Expiration TTL (300 seconds)
    await redisClient.set(cacheKey, JSON.stringify(user), { EX: 300 });

    return user;
  }

  // 2. SAVING DATA
  static async createNewUser(
    name: string,
    email: string,
    initialBalance: number,
    password: string,
  ): Promise<User> {
    const queryText = `
      INSERT INTO users (name, email, balance, password) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, balance
    `;
    const result = await pgPool.query(queryText, [name, email, initialBalance, password]);
    return result.rows[0];
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
