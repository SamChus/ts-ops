import { Pool } from "pg";
import BaseRepository from "./BaseRepository";
import {
  BookingRequest,
  IBooking,
  IBookingQuery,
  IBookingRepository,
} from "./repository";
import AppError from "../../utils/appError";
import { redisClient } from "../../config/db";

export class BookingRepository
  extends BaseRepository
  implements IBookingRepository
{
  constructor(pool: Pool) {
    super(pool);
  }

  async createPendingBooking(booking: BookingRequest): Promise<IBooking> {
    const client = await this.pool.connect();

    const sortDates = [...booking.dates].sort();

    const lockKey = `lock:aparmet:${booking.apartment_id}:${sortDates[0]}_to_${sortDates[sortDates.length - 1]}`;

    const acquired = await redisClient.set(lockKey, "locked", {
      NX: true,
      PX: 10000,
    });

    if (!acquired)
      throw new AppError(
        "Selected dates are currently being processed by another user, Try again.",
        400,
      );

    try {
      await client.query("BEGIN");

      const availablityCheckQuery = `
        SELECT id, price_per_night 
        FROM apartment_availability 
        WHERE apartment_id = $1 
        AND date = ANY($2::date[]) 
        AND status = 'available' 
        FOR UPDATE
      `;

      const availabilityCheck = await client.query(availablityCheckQuery, [
        booking.apartment_id,
        booking.dates,
      ]);

      console.log(
        `[BookingRepository] availability check for apartment ${booking.apartment_id}: found ${availabilityCheck.rows.length} rows for ${booking.dates.length} requested dates`,
      );

      if (availabilityCheck.rows.length !== booking.dates.length) {
        console.log("[BookingRepository] availability mismatch details:", {
          apartment_id: booking.apartment_id,
          dates: booking.dates,
          foundRows: availabilityCheck.rows.map((r) => ({
            id: r.id,
            price_per_night: r.price_per_night,
          })),
        });
        throw new AppError("Selected dates are not available for booking", 400);
      }

      const totalPrice = booking.price_per_night * booking.dates.length;
      const checkIn = sortDates[0];
      const checkOut = sortDates[sortDates.length - 1];
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      const insertBookingQuery = `
        INSERT INTO bookings (apartment_id, guest_id, check_in, check_out, total_price, no_of_guest, status, expires_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const bookingValues = [
        booking.apartment_id,
        booking.guest_id,
        checkIn,
        checkOut,
        totalPrice,
        booking.no_of_guest,
        "pending_payment",
        expiresAt,
      ];

      const bookingResult = await client.query(
        insertBookingQuery,
        bookingValues,
      );

      const bookingId = bookingResult.rows[0].id;

      await client.query(
        `
          UPDATE apartment_availability
          SET status = 'pending_payment', booking_id = $1
          WHERE apartment_id = $2 
          AND date = ANY($3::date[])
        `,
        [bookingId, booking.apartment_id, booking.dates],
      );

      await client.query("COMMIT");

      await redisClient.set(`booking:expiry:${bookingId}`, "pending", {
        EX: 15 * 60, // 15 minutes in seconds
      });
      return bookingResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await redisClient.del(lockKey);
    }
  }

  async getBookingById(id: string): Promise<IBooking | null> {
    await redisClient.get(`booking:${id}`);
    const result = await this.pool.query(
    "SELECT * FROM bookings WHERE id = $1 RETURNING id, apartment_id, guest_id, check_in, check_out, total_price, no_of_guest, status, expires_at",
      [id],
    );
    return result.rows[0] || null;
  }

  async updateBookingStatus(
    id: string,
    status: string,
  ): Promise<IBooking | null> {
    const queryText = `
      UPDATE bookings 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await this.pool.query(queryText, [status, id]);
    return result.rows[0] || null;
  }

  async checkAvailability(
    apartmentId: string,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const queryText = `
      SELECT COUNT(*) FROM bookings 
      WHERE apartment_id = $1 
      AND status NOT IN ('cancelled', 'rejected')
      AND (
        (check_in <= $2 AND check_out >= $2) OR
        (check_in <= $3 AND check_out >= $3) OR
        (check_in >= $2 AND check_out <= $3)
      )
    `;
    const result = await this.pool.query(queryText, [apartmentId, start, end]);
    return parseInt(result.rows[0].count) === 0;
  }

  async getBookingsByUser(guest_id: string): Promise<IBooking[]> {
    const result = await this.pool.query(
      "SELECT * FROM bookings WHERE guest_id = $1 ORDER BY created_at DESC",
      [guest_id],
    );
    return result.rows;
  }

  async updateBooking(
    id: string,
    booking: Partial<IBooking>,
  ): Promise<IBooking | null> {
    return null;
  }

  async deleteBooking(id: string): Promise<IBooking> {
    throw new Error("Method not implemented.");
  }

  getAllBookings(query?: IBookingQuery): Promise<IBooking[]> {
    throw new Error("Method not implemented.");
  }
}
