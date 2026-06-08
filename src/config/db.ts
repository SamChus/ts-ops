import { Pool, PoolClient } from "pg";
import { createClient, RedisClientType } from "redis";
import AppError from "../utils/appError";
import logger, { connectDbLogging } from "../utils/winston";


export const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const redisClient: RedisClientType = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

export const getPgClient = async (): Promise<PoolClient> => pgPool.connect();

export async function initDatabase() {
  try {
    await pgPool.query("SELECT NOW()");
    logger.info("PostgreSQL connection pool initialized");

    connectDbLogging();

    // Optional: run lightweight ALTERs for backward compatibility
    const alterQueries = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(512);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'guest';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    `;
    await pgPool.query(alterQueries);

    logger.info("Database verified successfully");

    redisClient.on("error", (err) => logger.error("Redis Client Error", err));
    await redisClient.connect();
    logger.info("Redis client connected");
  } catch (error) {
    logger.error("Database initialization failed:", error);
    throw new AppError("Database initialization failed", 500);
  }
}

