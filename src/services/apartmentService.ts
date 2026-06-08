import { pgPool } from "../config/db";
import AppError from "../utils/appError";
import logger from "../utils/winston";
import { UserService } from "./userService";

interface Apartment {
  agent_id: string;
  title: string;
  description: string;
  price_per_night: number;
  location: string;
  address: string;
  city: string;
  max_guests: number;
  status: 'available' | 'booked' | 'reserved' | 'under_maintenance' | 'leased' | 'occupied'; // 'available', 'booked', 'reserved', 'under_maintenance', "leased", "occupied" 
}

export class ApartmentService {
  static async createApartment(data: Apartment): Promise<void> {

    const user = await UserService.getUserProfileById(data.agent_id);

    if (user?.role !== "agent") {
      throw new AppError("Only agents can create apartments", 403);
    }

    const queryText = `
            INSERT INTO apartments ( agent_id, title, description, price_per_night, location, address, city, max_guests, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, agent_id, title, description, price_per_night, location, address, city, max_guests, status, created_at, updated_at
        `;

    try {
      const result = await pgPool.query(queryText, [
        data.agent_id,
        data.title,
        data.description,
        data.price_per_night,
        data.location,
        data.address,
        data.city,
        data.max_guests,
        data.status,
      ]);
      return result.rows[0]
    } catch (ex) {
      logger.error("Error creating apartment:", ex);
      throw new AppError("Failed to create apartment", 500);
    }
  }

  static async updateApartment(
    id: string,
    data: Partial<Apartment>,
  ): Promise<void> {
    const fieldsToUpdate: Record<string, any> = {};

    if (data.title) fieldsToUpdate.title = data.title;
    if (data.description) fieldsToUpdate.description = data.description;
    if (data.price_per_night)
      fieldsToUpdate.price_per_night = data.price_per_night;
    if (data.location) fieldsToUpdate.location = data.location;
    if (data.address) fieldsToUpdate.address = data.address;
    if (data.city) fieldsToUpdate.city = data.city;
    if (data.max_guests) fieldsToUpdate.max_guests = data.max_guests;
    if (Object.keys(fieldsToUpdate).length === 0) {
      throw new AppError("No fields to update", 400);
    }

    const setClause = Object.keys(fieldsToUpdate)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    const queryValues = [...Object.values(fieldsToUpdate), id];

    const queryText = `
            UPDATE apartments
            SET ${setClause}, updated_at = NOW()
            WHERE id = $${queryValues.length}
            RETURNING id, title, description, price_per_night, location, address, city, max_guests, status, created_at, updated_at
        `;

    try {
      const result = await pgPool.query(queryText, queryValues);
      if (result.rows.length === 0) {
        throw new AppError("Apartment not found", 404);
      }
    } catch (ex) {
      logger.error("Error updating apartment:", ex);
      throw new AppError("Failed to update apartment", 500);
    }
  }

  static async addApartmentImages(
    apartmentId: string,
    imageUrls: string[],
  ): Promise<Apartment> {
    const queryText = `
        UPDATE apartments
        SET image_urls = COALESCE(image_urls, '{}') || $1::text[]
        WHERE id = $2
        RETURNING id, title, description, price_per_night, location, address, city, max_guests, status, image_urls, created_at, updated_at
    `;
    try {
      const result = await pgPool.query(queryText, [imageUrls, apartmentId]);
      return result.rows[0];
    } catch (ex) {
      logger.error("Error adding apartment images:", ex);
      throw new AppError("Failed to add apartment images", 500);
    }
  }

  static async deleteApartment(id: string): Promise<void> {
    const queryText = `
        DELETE FROM apartments 
        WHERE id = $1
        RETURNING id
    `;

    try {
      const result = await pgPool.query(queryText, [id]);
      if (result.rows.length === 0) {
        throw new AppError("Apartment not found", 404);
      }
    } catch (ex) {
      logger.error("Error deleting apartment:", ex);
      throw new AppError("Failed to delete apartment", 500);
    }
  }

    static async getApartmentById(id: string): Promise<any> {
        const queryText = `
            SELECT * FROM apartments
            WHERE id = $1
        `;

        try {
            const result = await pgPool.query(queryText, [id]);
            return result.rows[0];
        } catch (ex) {
            logger.error("Error fetching apartment by ID:", ex);
            throw new AppError("Failed to fetch apartment", 500);
        }
    }

    static async getAllApartments(): Promise<any[]> {
        const queryText = `
            SELECT * FROM apartments
        `;

        try {
            const result = await pgPool.query(queryText);
            return result.rows;
        } catch (ex) {
            logger.error("Error fetching all apartments:", ex);
            throw new AppError("Failed to fetch apartments", 500);
        }
    }

    static async updateApartmentStatus(id: string, status: string): Promise<void> {
        const queryText = `
         UPDATE apartments
         SET status = $1, updated_at = NOW()
         RETURNING id, title, description, price_per_night, location, address, city, max_guests, status, created_at, updated_at
         `

         try {
          const result = await pgPool.query(queryText, [status, id]);
          if (result.rows.length === 0) {
            throw new AppError("Apartment not found", 404);
          }
         } catch (error) {
          logger.error("Error updating apartment status:", error);
          throw new AppError("Failed to update apartment status", 500);
         }
    }
}

