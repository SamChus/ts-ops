import { Pool } from "pg";
import BaseRepository from "./BaseRepository";
import { IBooking, IBookingQuery, IBookingRepository } from "./repository";

export class BookingRepository
  extends BaseRepository
  implements IBookingRepository
{
  constructor(pool: Pool) {
    super(pool);
  }

  async createBooking(booking: IBooking): Promise<IBooking> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const insertBookingQuery = `
        INSERT INTO bookings (guest_id, apartment_id, check_in, check_out, total_price, no_of_guest, status) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const bookingValues = [
        booking.guest_id,
        booking.apartment_id,
        booking.check_in,
        booking.check_out,
        booking.total_price,
        booking.no_of_guest,
        booking.status || "pending",
      ];
      const bookingResult = await client.query(
        insertBookingQuery,
        bookingValues,
      );

      // 2. Update the apartment status to 'booked' or 'reserved'
      const updateApartmentQuery = `
        UPDATE apartments 
        SET status = 'reserved' 
        WHERE id = $1
      `;
      await client.query(updateApartmentQuery, [booking.apartment_id]);

      await client.query("COMMIT");
      return bookingResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getBookingById(id: string): Promise<IBooking | null> {
    const result = await this.pool.query(
      "SELECT * FROM bookings WHERE id = $1",
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
  
  async updateBooking(id: string, booking: Partial<IBooking>): Promise<IBooking | null> {
   return null
  }

  async deleteBooking(id: string): Promise<IBooking> {
    throw new Error("Method not implemented.");
  }

  getAllBookings(query?: IBookingQuery): Promise<IBooking[]> {
    throw new Error("Method not implemented.");
  }
}
