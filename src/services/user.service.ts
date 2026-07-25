import { pgPool, redisClient } from "../config/db";
import { UserRepo, IUser, IUserQuery, ICursorPage, IOffsetPage } from "../data/repositories";
import AppError from "../utils/appError";
import logger from "../utils/winston";


export class UserService {
  private static userRepo = new UserRepo(pgPool);

  static async getUserProfileById(id: string): Promise<IUser | null> {
    try {
      const user = await this.userRepo.getUserById(id);
      if (!user) throw new AppError("User not found", 404);
      return user;
    } catch (ex) {
      if (ex instanceof AppError) throw ex;
      logger.error(`Error fetching user profile: ${ex}`);
      throw new AppError("Failed to fetch user profile", 500);
    }
  }

  static async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      return await this.userRepo.getUserByEmail(email);
    } catch (ex) {
      logger.error(`Error fetching user by email: ${ex}`);
      throw new AppError("Failed to fetch user", 500);
    }
  }

  static async updateProfile(
    id: string,
    data: Partial<IUser>,
  ): Promise<IUser | null> {
    try {
      const updated = await this.userRepo.updateUser(id, data);
      if (!updated) throw new AppError("User not found", 404);
      return updated;
    } catch (ex) {
      if (ex instanceof AppError) throw ex;
      logger.error(`Error updating profile: ${ex}`);
      throw new AppError("Failed to update profile", 500);
    }
  }

  static async getAllUsers(
    query: IUserQuery,
  ): Promise<ICursorPage<IUser> | IOffsetPage<IUser>> {
    try {
      return await this.userRepo.getAllUsers(query);
    } catch (ex) {
      logger.error(`Error fetching users: ${ex}`);
      throw new AppError("Failed to fetch users", 500);
    }
  }

  static async deleteAccount(id: string): Promise<void> {
    try {
      await this.userRepo.deleteUser(id);
    } catch (ex) {
      logger.error(`Error deleting user: ${ex}`);
      throw new AppError("Failed to delete user account", 500);
    }
  }

  static async updateUserImage(
    userId: string,
    imageUrl: string,
  ): Promise<IUser | null> {
    try {
      const user = await this.userRepo.updateImage(userId, imageUrl);
      if (!user) return null;

      // Note: Ensure redisClient is imported/available if you need cache invalidation
      await redisClient.del(`user:profile:${userId}`);

      return user;
    } catch (ex) {
      logger.error(`Error updating user image: ${ex}`);
      throw new AppError("Failed to update user image", 500);
    }
  }

  static async getUserProfileByEmail(email: string): Promise<IUser | null> {
    try {
      const user = await this.userRepo.getUserByEmail(email);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      return user;
    } catch (ex) {
      if (ex instanceof AppError) throw ex;
      logger.error(`Error fetching user profile by email: ${ex}`);
      throw new AppError("Failed to fetch user profile", 500);
    }
  }
}
