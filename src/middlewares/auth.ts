import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import dotenv from "dotenv";
import { verifyUserToken } from "../utils/signer";

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

function authMiddleware(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authorization token missing, Pls Provide token" });
  }

  try {
    const decodedToken = verifyUserToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    return res.status(400).json({
      message: "Invalid Token",
    });
  }
}

export default authMiddleware;
