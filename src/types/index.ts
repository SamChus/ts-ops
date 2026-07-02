export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "guest" | "agent"
}

export interface LoginRequest {
  email: string;
  password: string;

}
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: string;
  isVerified?: boolean;
  profile_image_url?: string;
}


export interface Apartment {
  id: string;
  title: string;
  description?: string;
  price_per_night: number;
  location?: string;
  address: string;
  city: string;
  max_guests: number;
  status: "available" | "unavailable";
  images?: string[];
}

export interface Booking {
  id: string;
  user_id: string;
  apartment_id: string;
  start_date: Date;
  end_date: Date;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

export interface LeaderboardEntry {
  userId: string;
  totalBookings: number;
  totalSpent: number;
}

// src/types/payment.types.ts
export interface PaymentConfirmedMessage {
  bookingId: string;
  reference: string;
  timestamp: string;
}
