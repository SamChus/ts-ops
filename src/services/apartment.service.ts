import AppError from "../utils/appError";
import logger from "../utils/winston";
import { UserService } from "./user.service";
import { IApartment, IApartmentQuery, ICursorPage } from "../data/repositories";
import { apartmentRepo } from "../data/repositories";


interface Apartment {
  agent_id: string;
  title: string;
  description: string;
  price_per_night: number;
  location: string;
  address: string;
  city: string;
  max_guests: number;
  status: ApartmentStatus;
}

type ApartmentStatus =
  | "available"
  | "booked"
  | "reserved"
  | "under_maintenance"
  | "leased"
  | "occupied";

export class ApartmentService {
  private static apartmentRepo = apartmentRepo;
  static async createApartment(data: Apartment): Promise<IApartment> {
    const user = await UserService.getUserProfileById(data.agent_id);

    if (user?.role !== "agent") {
      throw new AppError("Only agents can create apartments", 403);
    }

    try {
      return await apartmentRepo.createApartment(data as IApartment);
    } catch (ex) {
      logger.error("Error creating apartment:", ex);
      throw new AppError("Failed to create apartment", 500);
    }
  }

  static async updateApartment(
    id: string,
    data: Partial<Apartment>,
  ): Promise<IApartment | null> {
    try {
      const updated = await this.apartmentRepo.updateApartment(
        id,
        data as Partial<IApartment>,
      );
      if (!updated) {
        throw new AppError("Apartment not found", 404);
      }
      return updated;
    } catch (ex) {
      if (ex instanceof AppError) throw ex;
      logger.error("Error updating apartment:", ex);
      throw new AppError("Failed to update apartment", 500);
    }
  }

  static async addApartmentImages(
    apartmentId: string,
    imageUrls: string[],
  ): Promise<IApartment> {
    try {
      const result = await this.apartmentRepo.addImages(apartmentId, imageUrls);
      if (!result) throw new AppError("Apartment not found", 404);
      return result;
    } catch (ex) {
      if (ex instanceof AppError) throw ex;
      logger.error("Error adding apartment images:", ex);
      throw new AppError("Failed to add apartment images", 500);
    }
  }

  static async deleteApartment(id: string): Promise<void> {
    try {
      await this.apartmentRepo.deleteApartment(id);
    } catch (ex) {
      logger.error("Error deleting apartment:", ex);
      throw new AppError("Failed to delete apartment", 500);
    }
  }

  static async getApartmentById(id: string): Promise<IApartment | null> {
    return this.apartmentRepo.getApartmentById(id);
  }

  static async getAllApartments(
    query: IApartmentQuery,
  ): Promise<ICursorPage<IApartment>> {
    return this.apartmentRepo.getAllApartments(query);
  }

  static async updateApartmentStatus(
    id: string,
    status: ApartmentStatus,
  ): Promise<void> {
    await this.updateApartment(id, { status });
  }
}
