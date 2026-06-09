import { object } from "joi";
import { pgPool, redisClient, getPgClient } from "../config/db";
import { User } from "../types";
import { DatabaseError } from "pg";

export class UserService {
  // ============ CACHE MANAGEMENT ============
  static async clearUserCacheById(userId: string): Promise<void> {
    await redisClient.del(`user:profile:${userId}`);
    await redisClient.del("allusers");
  }

  static async clearUserCacheByEmail(email: string): Promise<void> {
    await redisClient.del(`user:profile:${email}`);
    await redisClient.del("allusers");
  }


  static async clearAllUserCaches(): Promise<void> {
    // Get all cache keys matching user pattern
    const keys = await redisClient.keys("user:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    await redisClient.del("allusers");
  }

  // ============ USER OPERATIONS ============
  static async getUserProfileByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:profile:${email}`;

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log("Cache hit for user profile:", email);
      return JSON.parse(cachedData) as User;
    }

    console.log("Cache miss for user profile:", email);

    const queryText =
      'SELECT id, name, email, phone, password, is_verified AS "isVerified", role, profile_image_url, created_at, updated_at FROM users WHERE email = $1';
    const result = await pgPool.query(queryText, [email]);
    if (result.rows.length === 0) return null;
    const user = result.rows[0] as User;

    await redisClient.set(cacheKey, JSON.stringify(user), { EX: 3600 });
    return user;
  }

  static async getUserProfileById(id: string): Promise<User | null> {
    const cacheKey = `user:profile:${id}`;

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log("Cache hit for user profile:", id);
      return JSON.parse(cachedData) as User;
    }

    console.log("Cache miss for user profile:", id);

    const queryText =
      'SELECT id, name, email, phone, password, is_verified AS "isVerified", role, profile_image_url, created_at, updated_at FROM users WHERE id = $1';
    const result = await pgPool.query(queryText, [id]);
    if (result.rows.length === 0) return null;
    const user = result.rows[0] as User;

    await redisClient.set(cacheKey, JSON.stringify(user), { EX: 3600 });
    return user;
  }

  static async updateProfile(
    fieldsToUpdate: Record<string, any>,
    userId: string,
  ): Promise<User | null> {
    const keys = Object.keys(fieldsToUpdate);

    if (keys.length === 0) return null;

    const setClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    const queryValues = [...Object.values(fieldsToUpdate), userId];

    const userIdPlaceholder = `$${keys.length + 1}`;

    const queryText = `
     UPDATE users
     SET ${setClause}
     WHERE id = ${userIdPlaceholder}
     RETURNING *
    `;

    try {
      const result = await pgPool.query(queryText, queryValues);
      if (result.rows.length === 0) return null;

      const updatedUser = result.rows[0] as User;

      // IMPORTANT: Invalidate all related cache keys so fresh data is fetched next time
      await redisClient.del(`user:profile:${userId}`);
      if (updatedUser.email) {
        await redisClient.del(`user:profile:${updatedUser.email}`);
      }
      // Also invalidate the all users cache since a user was modified
      await redisClient.del("allusers");

      // Cache the fresh updated data immediately
      await redisClient.set(
        `user:profile:${userId}`,
        JSON.stringify(updatedUser),
        { EX: 3600 },
      );

      return updatedUser;
    } catch (error) {
      if (error instanceof Error && (error as DatabaseError).code === "23505") {
        throw new Error("Email is already in use by another user");
      }
      throw error;
    }
  }

  static async getAllUsers(): Promise<User[]> {
    const cachedKey = "allusers";

    const cachedData = await redisClient.get(cachedKey);

    if (cachedData) {
      return JSON.parse(cachedData) as User[];
    }

    const queryText = `
        SELECT id, name, email, phone, password, role, is_verified AS "isVerified", profile_image_url, created_at, updated_at
        FROM users;
    `;

    try {
      const result = await pgPool.query(queryText);
      await redisClient.set(cachedKey, JSON.stringify(result.rows), {
        EX: 3600,
      });
      return result.rows as User[];
    } catch (error) {
      console.error(error);
      throw new Error("err from db");
    }
  }

  // 3. SECURE TRANSACTIONS (ACID compliant with safe rollback)
  static async transferFunds(
    senderId: string,
    receiverId: string,
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
      console.error("Transaction rolled back due to error:", error);
      throw error;
    } finally {
      // Crucial: Release client link back to pool for future requests
      client.release();
    }
  }

  static async updateUserImage(
    userId: string,
    imageUrl: string,
  ): Promise<User | null> {
    const queryText = `
      UPDATE users
      SET profile_image_url = $1
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await pgPool.query(queryText, [imageUrl, userId]);
      if (result.rows.length === 0) return null;
      await redisClient.del(`user:profile:${userId}`);
      return result.rows[0] as User;
    } catch (error) {
      console.error("Error updating user image:", error);

      // If the column is missing in an older DB schema, attempt to add it and retry once
      const msg = (error as any)?.message || "";
      if (
        msg.includes('column "profile_image_url"') ||
        msg.includes("does not exist")
      ) {
        try {
          await pgPool.query(
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(512)`,
          );
          const retry = await pgPool.query(queryText, [imageUrl, userId]);
          if (retry.rows.length === 0) return null;
          await redisClient.del(`user:profile:${userId}`);
          return retry.rows[0] as User;
        } catch (innerErr) {
          console.error("Retry failed adding column:", innerErr);
        }
      }

      throw new Error("Failed to update user image");
    }
  }
}
