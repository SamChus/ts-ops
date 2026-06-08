import express from "express";
import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";
import AppError from "../utils/appError";

export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);
  const user = await UserService.getUserProfileById(userId);
  if (!user) throw new AppError("User not found", 404);
  const { password: _, ...safeUser } = user;
  res
    .status(200)
    .json({ message: "User profile retrieved successfully", data: safeUser });
};

export const editUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const fieldsToUpdate = req.body;
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);
  if (Object.keys(fieldsToUpdate).length === 0) {
    throw new AppError("No Update Fields provided", 400);
  }

  try {
    const user = await UserService.updateProfile(fieldsToUpdate, userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const { password: _, ...safeUser } = user;
    return res.status(200).json({
      message: "Profile updated",
      data: safeUser,
    });
  } catch (error: any) {
    if (error.message === "Email is already in use by another user") {
      throw new AppError(error.message, 409);
    }
    throw error;
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const users = await UserService.getAllUsers();
  const safeUsers = users.map(({ password, ...rest }) => rest);
  res
    .status(200)
    .json({ message: "Users retrieved successfully", data: safeUsers });
};

/**
 * Clear cache for current user
 * Useful when you're getting stale data
 */
export const clearMyCache = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError("Unauthorized", 401);

  try {
    await UserService.clearUserCacheById(userId);
    res.status(200).json({
      message:
        "Your cache has been cleared. Fresh data will be fetched on next request.",
    });
  } catch (error) {
    throw new AppError("Failed to clear cache", 500);
  }
};

/**
 * Clear cache for a specific user (admin only)
 * Query params: userId or email
 */
export const clearUserCache = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId, email } = req.query;

  if (!userId && !email) {
    throw new AppError("Provide either userId or email query parameter", 400);
  }

  try {
    if (userId) {
      await UserService.clearUserCacheById(userId as string);
    } else if (email) {
      await UserService.clearUserCacheByEmail(email as string);
    }
    res.status(200).json({
      message: "Cache cleared successfully",
    });
  } catch (error) {
    throw new AppError("Failed to clear cache", 500);
  }
};

/**
 * Clear ALL user caches (admin only)
 */
export const clearAllCaches = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await UserService.clearAllUserCaches();
    res.status(200).json({
      message: "All user caches have been cleared",
    });
  } catch (error) {
    throw new AppError("Failed to clear all caches", 500);
  }
};
