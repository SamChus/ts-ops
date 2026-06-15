import type { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import bcrypt from "bcrypt";
import { validateLogin, validateRegister } from "../validate/auth";
import { LoginRequest, RegisterRequest } from "../types";
import { authService } from "../services/auth.service";
import AppError from "../utils/appError";
import { amqpManager } from "../config/amqp";
import { json } from "node:stream/consumers";
import logger from "../utils/winston";
import os from "node:os";
import { IUser } from "../data/repositories/repository";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { error } = validateLogin(req.body);
  if (error) throw new AppError("Invalid Input", 400);
  const { email, password } = req.body as LoginRequest;
  const { user, token } = await authService.login(email, password);
  res.setHeader("X-Auth-Token", token);

  // Dispatch login alert event to AMQP (Non-blocking)
  (async () => {
    try {
      const channel = await amqpManager.createChannel();
      const queueName = "email_queue";
      await channel.assertQueue(queueName, { durable: true });

      const userAgent = req.headers["user-agent"] || "Unknown Device";
      const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

      const payload = {
        emailType: "LOGIN_DETECTED",
        recipient: email,
        metadata: {
          device: userAgent,
          ip: clientIp,
          time: new Date().toISOString(),
        },
      };

      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
      await channel.close();
    } catch (error) {
      logger.error("Failed to dispatch login alert event to AMQP:", error);
    }
  })();

  const newUser = { ...user, password: undefined };
  res.json({
    message: "User logged in successfully",
    data: newUser,
    token,
  });
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { error } = validateRegister(req.body);
  if (error) throw new AppError("Invalid Input", 400);
  const { name, email, password, phone, role } = req.body as RegisterRequest;
  const user = await authService.register({
    name,
    email,
    password,
    phone,
    role,
  } as IUser);

  // Dispatch welcome email via broker (Non-blocking)
  (async () => {
    try {
      const channel = await amqpManager.createChannel();
      const queueName = "email_queue";
      await channel.assertQueue(queueName, { durable: true });

      const payload = {
        emailType: "WELCOME_EMAIL",
        recipient: email,
        metadata: { name, time: new Date().toISOString() },
      };

      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
      await channel.close();
    } catch (ex) {
      logger.error("Failed to dispatch message to broker queue:", ex);
    }
  })();

  const newUser = { ...user, password: undefined };
  return res.json({ message: "User registered successfully", data: newUser });
};

export const forgetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email } = req.body;
  if (!email) throw new AppError("Email is required", 400);

  await authService.forgetPassword(email);
  res.json({ message: "Password reset email sent" });
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, token, newPassword } = req.body;

  if (!token || !newPassword)
    throw new AppError("Token and password required", 400);

  await authService.resetPassword(email, token, newPassword);
  res.json({ message: "Password reset successfully" });
};

export const sendToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError("Email is required", 400);
  }

  await authService.sendToken(email);
  res.json({ message: "Token sent successfully to your email" });
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, token } = req.body;

  if (!email || !token) {
    throw new AppError("Email and token are required", 400);
  }

  await authService.verifyEmail(email, token);
  res.json({ message: "Email verified successfully" });
};
