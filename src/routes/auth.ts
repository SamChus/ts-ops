import express = require("express");
import type { Request, Response } from "express-serve-static-core";
import { UserService } from "../services/userService";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { validateLogin, validateRegister } from "../validate/auth";
import { LoginRequest, RegisterRequest } from "../types";
import { authService } from "../services/authService";

dotenv.config();
const route = express.Router();

route.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginRequest;

  const { error } = validateLogin(req.body);

  if (error) return res.status(400).send("Invalid Input");

  try {
    const { user, token } = await authService.login(email, password);

    const newUser = { ...user, password: undefined };

    res.json({ message: "User logged in successfully", data: newUser, token });
  } catch (err) {
    console.error("Error logging in user:", err);
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return res.status(404).send("User not found");
    }
    if (err instanceof Error && err.message === "INVALID_PASSWORD") {
      return res.status(401).send("Invalid password");
    }
    res.status(500).send("Internal Server Error");
  }
});

route.post("/register", async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body as RegisterRequest;

  const hashedPassword = await bcrypt.hash(password, 10);

  const { error } = validateRegister(req.body);

  if (error) return res.status(400).send("Invalid Input");

  try {
    const existingUser = await UserService.getUserProfileByEmail(email);
    if (existingUser) {
      return res.status(409).send("Email already registered");
    }

    const user = await authService.register(name, email, hashedPassword, phone);

    const newUser = { ...user, password: undefined };
    res.json({ message: "User registered successfully", data: newUser }); //
  } catch (err) {
    console.error("Error creating user:", err);
    if (err instanceof Error && err.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).send("Email already registered");
    }
    res.status(500).send("Internal Server Error");
  }
});

route.post("/forget-password", async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send("Email is required");
  }

  try {
    await authService.forgetPassword(email);
    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Error sending password reset email:", err);
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return res.status(404).send("User not found");
    }
    res.status(500).send("Internal Server Error");
  }
});

route.post("/reset-password", async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).send("Token and new password are required");
  }

  try {
    await authService.resetPassword(email, token, newPassword);
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_TOKEN") {
      return res.status(400).send("Invalid or expired token");
    }
    res.status(500).send("Internal Server Error");
  }
});

route.post("/send-token", async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send("Email is required");
  }

  try {
    await authService.sendToken(email);
    res.json({ message: "Token sent successfully to your email" });
  } catch (err) {
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return res.status(404).send("User not found");
    }
    res.status(500).send("Internal Server Error");
  }
});

route.post("/verify-email", async (req: Request, res: Response) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).send("Email and token are required");
  }

  try {
    await authService.verifyEmail(email, token);
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return res.status(404).send("User not found");
    }
    if (err instanceof Error && err.message === "INVALID_TOKEN") {
      return res.status(400).send("Invalid or expired token");
    }
    res.status(500).send("Internal Server Error");
  }
});

export default route;
