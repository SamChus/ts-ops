import { pgPool } from "../config/db";
import { UserRepository } from "../data/repositories/UserRepository";
import { AuthRepository } from "../data/repositories/AuthRepository";
import { IUser } from "../data/repositories/repository";
import AppError from "../utils/appError";
import logger from "../utils/winston";

export class AuthService {
  private userRepo = new UserRepository(pgPool);
  private authRepo = new AuthRepository(pgPool);

  async register(userData: IUser): Promise<IUser> {
    const existingUser = await this.userRepo.getUserByEmail(userData.email);
    if (existingUser) {
      throw new AppError("Email already in use", 400);
    }

    try {
      // Note: You should hash the password here before passing to repo
      return await this.userRepo.createUser(userData);
    } catch (ex) {
      logger.error(`Registration error: ${ex}`);
      throw new AppError("Registration failed", 500);
    }
  }

  async login(email: string, password: string): Promise<{ user: IUser, token: string }> {
    const user = await this.authRepo.findByEmailWithPassword(email);
    
    // Note: In a real app, use bcrypt.compare(password, user.password)
    if (!user || user.password !== password) {
      throw new AppError("Invalid email or password", 401);
    }

    // Mock token for now - in production use jwt.sign(...)
    const token = "mock-jwt-token";

    // Strip password before returning
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword as IUser, token };
  }

  async forgetPassword(email: string) { /* implementation */ }
  async resetPassword(email: string, t: string, p: string) { /* implementation */ }
  async sendToken(email: string) { /* implementation */ }
  async verifyEmail(email: string, t: string) { /* implementation */ }
}

export const authService = new AuthService();