import { Pool, PoolClient } from "pg";
import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";
import AppError from "../utils/appError";
import logger from "../utils/winston";

dotenv.config();

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

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100),
          email VARCHAR(150) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          profile_image_url VARCHAR(512),
          phone VARCHAR(20),
          is_verified BOOLEAN DEFAULT FALSE,
          role VARCHAR(50) DEFAULT 'guest', -- 'guest', 'agent', 'admin'
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

    CREATE TABLE IF NOT EXISTS apartments (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_night NUMERIC(10, 2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    image_urls TEXT[], -- Array of image URLs
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    max_guests INT DEFAULT 1,
    status VARCHAR(50) DEFAULT "available", -- 'available', 'booked', 'reserved', 'under_maintenance', "leased", "occupied"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        apartment_id INT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
        guest_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        apartment_id INT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
        guest_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        total_bookings_completed INT DEFAULT 0,
        total_earnings NUMERIC(12, 2) DEFAULT 0.00,
        average_rating NUMERIC(3, 2) DEFAULT 0.00,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE OR REPLACE FUNCTION update_leaderboard_after_booking() RETURNS TRIGGER AS $$
    DECLARE
        agentId INT;
        totalBookings INT;
        totalEarnings NUMERIC(12, 2);
        averageRating NUMERIC(3, 2);
    BEGIN
        IF NEW.status = 'completed' THEN
            SELECT agent_id INTO agentId FROM apartments WHERE id = NEW.apartment_id;

            SELECT COUNT(*) INTO totalBookings FROM bookings 
            JOIN apartments ON bookings.apartment_id = apartments.id 
            WHERE apartments.agent_id = agentId AND bookings.status = 'completed';

            SELECT COALESCE(SUM(total_price), 0) INTO totalEarnings FROM bookings 
            JOIN apartments ON bookings.apartment_id = apartments.id 
            WHERE apartments.agent_id = agentId AND bookings.status = 'completed';

            SELECT COALESCE(AVG(rating), 0) INTO averageRating FROM reviews 
            JOIN apartments ON reviews.apartment_id = apartments.id 
            WHERE apartments.agent_id = agentId;

            INSERT INTO leaderboard (agent_id, total_bookings_completed, total_earnings, average_rating, updated_at)
            VALUES (agentId, totalBookings, totalEarnings, averageRating, NOW())
            ON CONFLICT (agent_id) DO UPDATE 
            SET total_bookings_completed = EXCLUDED.total_bookings_completed,
                total_earnings = EXCLUDED.total_earnings,
                average_rating = EXCLUDED.average_rating,
                updated_at = EXCLUDED.updated_at;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_update_leaderboard_after_booking ON bookings;

    CREATE TRIGGER trg_update_leaderboard_after_booking
    AFTER UPDATE OF status ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_after_booking();    
    `;
    await pgPool.query(createTableQuery);

    // Ensure compatibility with existing databases: add missing columns if they don't exist
    // This helps when the database was created without the newer columns during earlier deployments
    const alterQueries = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(512);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'guest';
      -- canonical verification column used by the app
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    `;
    await pgPool.query(alterQueries);

    // Perform a safe migration: populate `is_verified` from any existing verification columns,
    // then drop the legacy columns. Wrapped in try/catch so failures won't block initialization.
    try {
      await pgPool.query(`
        UPDATE users
        SET is_verified = COALESCE(is_verified, isverified, "verified", FALSE)
      `);

      // After verifying values are correct in production you may drop legacy columns.
      await pgPool.query(`
        ALTER TABLE users DROP COLUMN IF EXISTS isverified;
        ALTER TABLE users DROP COLUMN IF EXISTS "verified";
      `);
    } catch (migrationErr) {
      logger.warn(
        "User verification migration warning: " + (migrationErr as any).message,
      );
    }
    logger.info("Database tables created or verified successfully");

    redisClient.on("error", (err) => logger.error("Redis Client Error", err));
    await redisClient.connect();
    logger.info("Redis client connected");
  } catch (error) {
    throw new AppError("Database initialization failed", 500);
  }
}
