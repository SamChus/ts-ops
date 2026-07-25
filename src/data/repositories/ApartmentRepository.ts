import BaseRepository, { Constructor } from "./BaseRepository";
import {
  IApartment,
  IApartmentQuery,
  IApartmentRepository,
  ICursorPage,
} from "./repository";
import AppError from "../../utils/appError";

export function ApartmentRepository<TBase extends Constructor<BaseRepository>>(
  Base: TBase,
) {
  return class ApartmentMixin extends Base implements IApartmentRepository {
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

        // Build 365-day availability matrix
        const today = new Date();
        const availabilityRecords: any[] = [];
        for (let i = 0; i < 365; i++) {
          const target = new Date();
          target.setDate(today.getDate() + i);
          availabilityRecords.push([
            apartmentId,
            target.toISOString().split("T")[0],
            "available",
            apartment.price_per_night,
          ]);
        }

        const valuePlaceholders = availabilityRecords
          .map(
            (_, idx) =>
              `($${idx * 4 + 1}, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4})`,
          )
          .join(", ");

        await client.query(
          `INSERT INTO apartment_availability (apartment_id, date, status, price_per_night)
           VALUES ${valuePlaceholders}
           ON CONFLICT (apartment_id, date) DO NOTHING;`,
          availabilityRecords.flat(),
        );

        await client.query("COMMIT");
        return newApartment;
      } catch (ex) {
        await client.query("ROLLBACK");
        throw new AppError("Failed to create apartment and availability matrix", 500);
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
        .map((field, i) => `${field} = $${i + 2}`)
        .join(", ");

      const res = await this.pool.query(
        `UPDATE apartments SET ${setClause} WHERE id = $1 RETURNING *;`,
        [id, ...Object.values(apartment)],
      );
      return res.rows[0] || null;
    }

    async deleteApartment(id: string): Promise<void> {
      await this.pool.query("DELETE FROM apartments WHERE id = $1", [id]);
    }

    /**
     * Cursor-paginated apartment listing.
     * GET /apartments?limit=10
     * GET /apartments?limit=10&nextCursor=<token>
     */
    async getAllApartments(
      query: IApartmentQuery,
    ): Promise<ICursorPage<IApartment>> {
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
      const res = await this.pool.query(
        `UPDATE apartments 
         SET image_urls = array_cat(COALESCE(image_urls, ARRAY[]::TEXT[]), $2)
         WHERE id = $1 
         RETURNING *;`,
        [apartmentId, imageUrls],
      );
      return res.rows[0] || null;
    }
  };
}
