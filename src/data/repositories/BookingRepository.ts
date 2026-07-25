import BaseRepository, { Constructor } from "./BaseRepository";
import {
  BookingRequest,
  IBooking,
  IBookingQuery,
  IBookingRepository,
} from "./repository";
import AppError from "../../utils/appError";
import { redisClient } from "../../config/db";

export function BookingRepository<TBase extends Constructor<BaseRepository>>(
  Base: TBase,
) {
  return class BookingMixin extends Base implements IBookingRepository {
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

        const availabilityCheck = await client.query(
          `SELECT id, price_per_night 
           FROM apartment_availability 
           WHERE apartment_id = $1 
           AND date = ANY($2::date[]) 
           AND status = 'available' 
           FOR UPDATE`,
          [booking.apartment_id, booking.dates],
        );

        if (availabilityCheck.rows.length !== booking.dates.length)
          throw new AppError("Selected dates are not available for booking", 400);

        const totalPrice = booking.price_per_night * booking.dates.length;
        const checkIn = sortDates[0];
        const checkOut = sortDates[sortDates.length - 1];
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        const bookingResult = await client.query(
          `INSERT INTO bookings (apartment_id, guest_id, check_in, check_out, total_price, no_of_guest, status, expires_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            booking.apartment_id,
            booking.guest_id,
            checkIn,
            checkOut,
            totalPrice,
            booking.no_of_guest,
            "pending_payment",
            expiresAt,
          ],
        );

        const bookingId = bookingResult.rows[0].id;

        await client.query(
          `UPDATE apartment_availability
           SET status = 'pending_payment', booking_id = $1
           WHERE apartment_id = $2 AND date = ANY($3::date[])`,
          [bookingId, booking.apartment_id, booking.dates],
        );

        await client.query("COMMIT");
        await redisClient.set(`booking:expiry:${bookingId}`, "pending", {
          EX: 15 * 60,
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
        "SELECT id, apartment_id, guest_id, check_in, check_out, total_price, no_of_guest, status, expires_at FROM bookings WHERE id = $1",
        [id],
      );
      return result.rows[0] || null;
    }

    async updateBookingStatus(
      id: string,
      status: string,
    ): Promise<IBooking | null> {
      const result = await this.pool.query(
        `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id],
      );
      return result.rows[0] || null;
    }

    async checkAvailability(
      apartmentId: string,
      start: Date,
      end: Date,
    ): Promise<boolean> {
      const result = await this.pool.query(
        `SELECT COUNT(*) FROM bookings 
         WHERE apartment_id = $1 
         AND status NOT IN ('cancelled', 'rejected')
         AND (
           (check_in <= $2 AND check_out >= $2) OR
           (check_in <= $3 AND check_out >= $3) OR
           (check_in >= $2 AND check_out <= $3)
         )`,
        [apartmentId, start, end],
      );
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

    async getAllBookings(query?: IBookingQuery): Promise<IBooking[]> {
      throw new Error("Method not implemented.");
    }
  };
}
