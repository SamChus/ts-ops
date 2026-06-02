import { pgPool, redisClient } from "../config/db";
import { User } from "../types";
import { getUserToken, verifyUserToken } from "../utils/signer";
import { checkEmail, validateUser } from "../validate/user";
import { sendEmail } from "./emailService";
import { UserService } from "./userService";
import bcrypt from "bcrypt";
import crypto from "crypto";
import AppError from "../utils/appError";

interface loginResposne {
  user: User;
  token: string;
}

interface registerResponse {
  user: User;
}

interface ApiResponse<T> {
  message: string;
  data: T;
}

export class authService {
  static async login(email: string, password: string): Promise<loginResposne> {
    const user = await UserService.getUserProfileByEmail(email);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError("Invalid password", 401);
    }
    const token = getUserToken(user);

    const response = { user, token };
    return response;
  }

  static async register(
    name: string,
    email: string,
    password: string,
    phone: string,
  ): Promise<User> {
    const queryText = `
      INSERT INTO users (name, email, password, phone, role, is_verified) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, name, email, phone, role, is_verified AS "isVerified", created_at, updated_at
    `;

    try {
      const result = await pgPool.query(queryText, [
        name,
        email,
        password,
        phone,
        "guest",
        false,
      ]);
      const user = result.rows[0] as User;
      return user;
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") {
        throw new AppError("Email already registered", 409);
      }
      throw error;
    }
  }

  static async forgetPassword(email: string): Promise<void> {
    validateUser(email);

    const token = getUserToken({ email } as User);

    sendEmail(
      email,
      "Password Reset Request",
      "We received a request to reset your password. Please click the link below to reset your password: \n\n http://localhost:5500/frontend/reset-password?token=" +
        token,
    );
  }
  static async resetPassword(
    email: string,
    newPassword: string,
    token: string,
  ): Promise<void> {
    const user = await UserService.getUserProfileByEmail(email);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    let decodedToken;
    try {
      decodedToken = verifyUserToken(token);
    } catch (error) {
      throw new AppError("Invalid or expired token", 400);
    }

    const isValidToken = decodedToken.userId === user.id;
    if (!isValidToken) {
      throw new AppError("Invalid or expired token", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const queryText = `
        UPDATE users 
        SET password = $1 
        WHERE email = $2
    `;
    await pgPool.query(queryText, [hashedPassword, email]);
  }

  static async sendToken(email: string): Promise<void> {
    const user = await validateUser(email);

    const token = crypto.randomInt(0, 1000000).toString().padStart(6, "0");

    const userId = user.id;

    const redisKey = `auth_token:${userId}`;

    await redisClient.set(redisKey, token, { EX: 300 });

    sendEmail(
      email,
      "Email Verification",
      "Your verification code is: " + token,
    );
  }

  static async verifyEmail(email: string, token: string): Promise<void> {
    const user = await validateUser(email);

    const userId = user.id;

    const redisKey = `auth_token:${userId}`;
    const storedToken = await redisClient.get(redisKey);

    if (!storedToken) {
      throw new AppError("Token expired", 400);
    }

    const isMatch = crypto.timingSafeEqual(
      Buffer.alloc(6, storedToken),
      Buffer.alloc(6, token),
    );

    if (!isMatch) {
      throw new AppError("Invalid token", 400);
    }

    const queryText = `
      UPDATE users 
      SET is_verified = true 
      WHERE email = $1
    `;
    await pgPool.query(queryText, [email]);

    await redisClient.del(redisKey);

    return;
  }
}
