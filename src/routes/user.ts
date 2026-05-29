import express from "express";
import { Request, Response } from "express";
import { UserService } from "../services/userService";
import { verifyUserToken } from "../utils/signer";

interface ProfileReq {
  userId: string;
}

const route = express.Router();

route.get("/profile", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  let decodedToken;
  try {
    decodedToken = verifyUserToken(token);
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
  const userId = decodedToken.userId;
  const user = await UserService.getUserProfileById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res
    .status(200)
    .json({ message: "User profile retrieved successfully", data: user });
});

route.post("/edit-profile", async (req: Request, res: Response) => {
  // Get user id
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  let decodedToken;
  try {
    decodedToken = verifyUserToken(token);
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
  const userId = decodedToken.userId;

  // Get req body
  const fieldsToUpdate = req.body;

  if (Object.keys(fieldsToUpdate).length === 0) {
    return res.status(400).json({
      message: "No Update Fields provided",
    });
  }

  try {
    // Query DB to update resource
    const user = await UserService.updateProfile(fieldsToUpdate, userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    return res.status(200).json({
      message: "Profile updated",
      data: user,
    });
  } catch (error: any) {
    if (error.message === "Email is already in use by another user") {
      return res.status(409).json({
        message: error.message,
      });
    }
  }

  // Send response to client
});

route.get("/me", async (req: Request, res: Response, next:Function) => {
  const userId = req.user.userId;

  try {
    const user = await UserService.getUserProfileByEmail(userId);
    const newUser = { ...user, password: undefined };
    return res.status(200).json({
      message: "User Profile",
      data: newUser
    })
  } catch (ex) {
    next(ex)
  }
});

export default route;
