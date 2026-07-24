import { Pool } from "pg";
import BaseRepository from "./BaseRepository";
import {
  IApartment,
  IApartmentQuery,
  ICursorPage,
  IApartmentRepository,
} from "./repository";
import AppError from "../../utils/appError";


export class ApartmentRepository
  extends BaseRepository
  implements IApartmentRepository
{
  constructor(pool: Pool) {
    super(pool);
  }

  async createApartment(apartment: IApartment): Promise<IApartment> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
            INSERT INTO apartments 
            (agent_id, title, description, price_per_night, location, address, city, max_guests, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;
      const values = [
        apartment.agent_id,
        apartment.title,
        apartment.description,
        apartment.price_per_night,
        apartment.location,
        apartment.address,
        apartment.city,
        apartment.max_guests,
        apartment.status || "available",
      ];

      const newApartment = (await client.query(query, values)).rows[0];
      const apartmentId = newApartment.id;

      const availabilityRecords: any[] = [];
      const today = new Date();

      for (let i = 0; i < 365; i++) {
        const targetDate = new Date();

        targetDate.setDate(today.getDate() + i);

        const dateString = targetDate.toISOString().split("T")[0];
        // Push record array: [apartment_id, date, status, price_per_night]
        availabilityRecords.push([
          apartmentId,
          dateString,
          "available",
          apartment.price_per_night,
        ]);
      }

      // 3. Construct a high-performance dynamic bulk SQL statement
      // Transforms the array into: VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)...
      const valuePlaceholders = availabilityRecords
        .map(
          (_, index) =>
            `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`,
        )
        .join(", ");

      const bulkInsertQuery = `
        INSERT INTO apartment_availability (apartment_id, date, status, price_per_night)
        VALUES ${valuePlaceholders}
        ON CONFLICT (apartment_id, date) DO NOTHING;
      `;

      // Flatten the records matrix array to match the sequential placeholder bindings
      const flatValues = availabilityRecords.flat();
      await client.query(bulkInsertQuery, flatValues);

      // If both steps pass perfectly, save changes to disk
      await client.query("COMMIT");
      console.log(
        `[Production Flow] Automated matrix generated for apartment: ${apartmentId}`,
      );
      return newApartment;
    } catch (ex) {
      await client.query("ROLLBACK");
      console.error("[Apartment Service Error] Rollback triggered:", ex);
      throw new AppError(
        "Failed to create apartment and availability matrix",
        500,
      );
    } finally {
      client.release();
    }
  }

  async getApartmentById(id: string): Promise<IApartment | null> {
    const res = await this.pool.query(
      `SELECT a.*,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.apartment_id = a.id
              AND b.status IN ('paid', 'completed', 'pending_payment')
          ) THEN 'booked'
          WHEN EXISTS (
            SELECT 1 FROM apartment_availability av
            WHERE av.apartment_id = a.id
              AND av.status IN ('booked', 'pending_payment')
          ) THEN 'booked'
          ELSE a.status
        END AS status
       FROM apartments a
       WHERE a.id = $1`,
      [id],
    );
    return res.rows[0] || null;
  }

  async updateApartment(
    id: string,
    apartment: Partial<IApartment>,
  ): Promise<IApartment | null> {
    const fields = Object.keys(apartment);
    if (fields.length === 0) return this.getApartmentById(id);

    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");
    const values = Object.values(apartment);

    const query = `
            UPDATE apartments 
            SET ${setClause} 
            WHERE id = $1 
            RETURNING *;
        `;

    const res = await this.pool.query(query, [id, ...values]);
    return res.rows[0] || null;
  }

  async deleteApartment(id: string): Promise<void> {
    await this.pool.query("DELETE FROM apartments WHERE id = $1", [id]);
  }

  /**
   * Cursor-paginated apartment listing.
   *
   * The cursor encodes the (created_at, id) of the last row seen,
   * so Postgres can jump directly to that position using its index.
   *
   * GET /apartments?limit=10                         ← first page
   * GET /apartments?limit=10&nextCursor=<token>      ← next page
   * GET /apartments?limit=10&prevCursor=<token>      ← previous page
   */
  async getAllApartments(query: IApartmentQuery): Promise<ICursorPage<IApartment>> {
    return this.paginateCursor<IApartment>({
      table: "apartments",
      sortCol: "created_at",
      idCol: "id",
      limit: query.limit,
      nextCursor: query.nextCursor,
      prevCursor: query.prevCursor,
    });
  }

  async addImages(
    apartmentId: string,
    imageUrls: string[],
  ): Promise<IApartment | null> {
    // Assuming images are stored as a JSONB or TEXT array column in the apartments table
    const query = `
            UPDATE apartments 
            SET image_urls = array_cat(COALESCE(image_urls, ARRAY[]::TEXT[]), $2)
            WHERE id = $1 
            RETURNING *;
        `;
    const res = await this.pool.query(query, [apartmentId, imageUrls]);
    return res.rows[0] || null;
  }
}
