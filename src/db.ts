import { Pool, PoolClient } from "pg"
import {createClient, RedisClientType} from "redis"
import dotenv from "dotenv"


dotenv.config()

export const pgPool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
})

export const redisClient: RedisClientType = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || "redis_cache:6379"}`,
})

export const getPgClient = async (): Promise<PoolClient> =>  pgPool.connect()


export async function initDatabase() {

    try {
        await pgPool.query("SELECT NOW()")
        console.log("PostgreSQL connection pool initialized")

        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        balance NUMERIC DEFAULT 0
      );
    `;
        await pgPool.query(createTableQuery);
        console.log("✅ Base relational schemas verified/created.");

        redisClient.on("error", (err) => console.error("Redis Client Error", err))
        await redisClient.connect()
        console.log("Redis client connected")
    } catch (error) {
        console.error("Error initializing database:", error)
        process.exit(1)
    
    }
}