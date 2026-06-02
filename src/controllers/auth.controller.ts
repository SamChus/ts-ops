import express = require("express");
import type { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";
import bcrypt from "bcrypt";
import { validateLogin, validateRegister } from "../validate/auth";
import { LoginRequest, RegisterRequest } from "../types";
import { authService } from "../services/authService";
import AppError from "../utils/appError";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { error } = validateLogin(req.body);
  if (error) throw new AppError("Invalid Input", 400);
  const { email, password } = req.body as LoginRequest;
  const { user, token } = await authService.login(email, password);
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

  const { name, email, password, phone } = req.body as RegisterRequest;

  const existingUser = await UserService.getUserProfileByEmail(email);
  if (existingUser) throw new AppError("Email already registered", 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await authService.register(name, email, hashedPassword, phone);

  const newUser = { ...user, password: undefined };
  res.json({ message: "User registered successfully", data: newUser });
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
  next: NextFunction
) => {
  const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    await authService.sendToken(email);
    res.json({ message: "Token sent successfully to your email" });
  }

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
