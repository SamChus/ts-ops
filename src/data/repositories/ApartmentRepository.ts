import { Pool } from "pg";
import BaseRepository from "./BaseRepository";
import {
  IApartment,
  IApartmentQuery,
  IApartmentQueryResult,
  IApartmentRepository,
} from "./repository";

export class ApartmentRepository
  extends BaseRepository
  implements IApartmentRepository
{
  constructor(pool: Pool) {
    super(pool);
  }

  async createApartment(apartment: IApartment): Promise<IApartment> {
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

    const res = await this.pool.query(query, values);
    return res.rows[0];
  }

  async getApartmentById(id: string): Promise<IApartment | null> {
    const res = await this.pool.query(
      "SELECT * FROM apartments WHERE id = $1",
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

  async getAllApartments(
    query: IApartmentQuery,
  ): Promise<IApartmentQueryResult> {
    const limit = query.limit || this.defaultLimit;
    const offset = query.offset || this.defaultOffset;

    const dataQuery = `
        SELECT * FROM apartments 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2;
    `;
    const countQuery = "SELECT COUNT(*) FROM apartments;";

    const [dataRes, countRes] = await Promise.all([
      this.pool.query(dataQuery, [limit, offset]),
      this.pool.query(countQuery),
    ]);

    return {
      apartment: dataRes.rows,
      // PostgreSQL COUNT returns a string for bigint, so we parse it
      totalCount: parseInt(countRes.rows[0].count, 10),
    };
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
