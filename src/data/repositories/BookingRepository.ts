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
    const queryText = `
      INSERT INTO bookings (guest_id, apartment_id, check_in, check_out, total_price, status) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      booking.guest_id,
      booking.apartment_id,
      booking.check_in,
      booking.check_out,
      booking.total_price,
      booking.status || "pending",
    ];
    const result = await this.pool.query(queryText, values);
    return result.rows[0];
  }

  async getBookingById(id: string): Promise<IBooking | null> {
    const result = await this.pool.query(
      "SELECT * FROM bookings WHERE id = $1",
      [id],
    );
    return result.rows[0] || null;
  }

  async updateBooking(
    id: string,
    booking: Partial<IBooking>,
  ): Promise<IBooking | null> {
    const fields = Object.keys(booking);
    if (fields.length === 0) return null;
    const setClause = fields
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = [...Object.values(booking), id];
    const queryText = `
      UPDATE bookings 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $${values.length} 
      RETURNING *
    `;
    const result = await this.pool.query(queryText, values);
    return result.rows[0] || null;
  }

  async deleteBooking(id: string): Promise<IBooking> {
    const result = await this.pool.query(
      "DELETE FROM bookings WHERE id = $1 RETURNING *",
      [id],
    );
    return result.rows[0];
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

  async getBookingsByUser(userId: string): Promise<IBooking[]> {
    const result = await this.pool.query(
      "SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return result.rows;
  }

  async getAllBookings(query?: IBookingQuery): Promise<IBooking[]> {
    let queryString = "SELECT * FROM bookings ORDER BY created_at DESC";
    const values: any[] = [];

    if (query) {
      queryString += " WHERE";
      if (query) {
        queryString += " status = $1";
        values.push(query);
      
        if (query.apartment_id) {
          queryString += " AND apartment_id = $2";
          values.push(query.apartment_id);
        }
      }
    }

    const result = await this.pool.query(queryString, values);
    return result.rows;
  }
}
