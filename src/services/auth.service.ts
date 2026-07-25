import { redisClient } from "../config/db";
import { IAuthResponse, IUser, userRepo, authRepo } from "../data/repositories";
import AppError from "../utils/appError";
import logger from "../utils/winston";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { getUserToken, verifyUserToken } from "../utils/signer";
import { validateUser } from "../validate/user";
import { sendEmail } from "./email.service";
import { generateEmailTemplate } from "../utils/emailTemplate";

export class AuthService {
  private static userRepo = userRepo;
  private static authRepo = authRepo;


  async register(userData: IUser): Promise<IUser> {
    const existingUser = await userRepo.getUserByEmail(userData.email);
    if (existingUser) {
       if (existingUser) throw new AppError("Email already registered", 400);

    }

    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
  
      return await userRepo.createUser({
        ...userData,
        password: hashedPassword,
      });
    } catch (ex) {
      logger.error(`Registration error: ${ex}`);
      throw new AppError("Registration failed", 500);
    }
  }

  async login(email: string, password: string): Promise<IAuthResponse> {
    const user = await userRepo.getUserByEmail(email);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }


    const isPasswordValid = await bcrypt.compare(password, user.password);


    if (!isPasswordValid) {
      throw new Error("INVALID_PASSWORD");
    }
    const token = getUserToken(user);

    const response = { user, token };
    return response;
  }

  async forgetPassword(email: string): Promise<void> {
    validateUser(email);

    const token = getUserToken({ email } as IUser);
    const html = generateEmailTemplate(
      "Password Reset",
      "You requested a password reset. Please use the token below to complete the process. This token is valid for a limited time.",
      token,
    );

    sendEmail(email, "Password Reset Request", html);
  }

  async resetPassword(
    email: string,
    newPassword: string,
    token: string,
  ): Promise<void> {
    const user = await userRepo.getUserByEmail(email);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const isValidToken = verifyUserToken(token).userId === user.id;
    if (!isValidToken) {
      throw new Error("INVALID_TOKEN");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
      await userRepo.updateUser(user.id, { password: hashedPassword });
    } catch (ex) {
      logger.error(`Password reset error: ${ex}`);
      throw new AppError("Failed to reset password", 500);
    }
  }

  async sendToken(email: string) {
    const user = await validateUser(email);

    const token = crypto.randomInt(0, 1000000).toString().padStart(6, "0");

    const redisKey = `auth_token:${user.id}`;

    await redisClient.set(redisKey, token, { EX: 300 });

    const html = generateEmailTemplate(
      "Email Verification",
      `Hi ${user.name}, please use the verification token below to verify your email address.`,
      token,
    );

    sendEmail(email, `Email Verification Token`, html);
  }

  async verifyEmail(email: string, token: string) {
    const user = await validateUser(email);
    const redisKey = `auth_token:${user.id}`;
    const storedToken = await redisClient.get(redisKey);
    if (!storedToken) {
      throw new Error("TOKEN_EXPIRED");
    }
    const isMatch = crypto.timingSafeEqual(
      Buffer.alloc(6, storedToken),
      Buffer.alloc(6, token),
    );

    if (!isMatch) {
      throw new Error("INVALID_TOKEN");
    }
    try {
      await userRepo.updateUser(user.id, { is_verified: true });
      await redisClient.del(redisKey);
    } catch (ex) {
      logger.error("Email verification error", ex);
      throw new AppError("Email verification failed", 500);
    }
  }
}

export const authService = new AuthService();
