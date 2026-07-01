-- Database initialization script for the application
-- Run this script to create the required tables

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Winston logging table
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    meta JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Cancellation_Policy table
CREATE TABLE IF NOT EXISTS cancellation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- flexible, moderate, strict
    description TEXT,
    refund_percentage INT CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
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

-- Apartments table
CREATE TABLE IF NOT EXISTS apartments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_night NUMERIC(10, 2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    image_urls TEXT[], -- Array of image URLs
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    max_guests INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability table
CREATE TABLE apartment_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'available', -- available, pending_payment, booked, blocked
    price_per_night NUMERIC(10, 2) NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    CONSTRAINT unique_apartment_date UNIQUE (apartment_id, date) 
);

CREATE INDEX idx_apt_date ON apartment_availability(apartment_id, date);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    no_of_guest INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending_payment',
    cancellation_policy_id UUID REFERENCES cancellation_policies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    expires_at TIMESTAMPTZ NOT NULL -- NOW() + 15 MINS
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_bookings_completed INT DEFAULT 0,
    total_earnings NUMERIC(12, 2) DEFAULT 0.00,
    average_rating NUMERIC(3, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded
    method VARCHAR(50), -- card, transfer, wallet
    transaction_ref VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID REFERENCES users(id)
);






-- Trigger function for leaderboard updates
CREATE OR REPLACE FUNCTION update_leaderboard_after_booking() RETURNS TRIGGER AS $$
DECLARE
    agentId UUID;
    totalBookings INT;
    totalEarnings NUMERIC(12, 2);
    averageRating NUMERIC(3, 2);
BEGIN
    IF NEW.status = 'completed' THEN
        SELECT agent_id INTO agentId FROM apartments WHERE id = NEW.apartment_id;

        SELECT COUNT(*) INTO totalBookings
        FROM bookings 
        JOIN apartments ON bookings.apartment_id = apartments.id 
        WHERE apartments.agent_id = agentId AND bookings.status = 'completed';

        SELECT COALESCE(SUM(total_price), 0) INTO totalEarnings
        FROM bookings 
        JOIN apartments ON bookings.apartment_id = apartments.id 
        WHERE apartments.agent_id = agentId AND bookings.status = 'completed';

        SELECT COALESCE(AVG(rating), 0) INTO averageRating
        FROM reviews 
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

-- Trigger creation
DROP TRIGGER IF EXISTS trg_update_leaderboard_after_booking ON bookings;

CREATE TRIGGER trg_update_leaderboard_after_booking
AFTER UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_leaderboard_after_booking();
ALTER TABLE bookings
ADD COLUMN guest_count INT DEFAULT 1;
ADD COLUMN cancellation_policy_id UUID REFERENCES cancellation_policies(id) ON DELETE SET NULL;

