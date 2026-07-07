import { Request, Response, NextFunction } from "express";
import { verifyUserToken } from "../utils/signer";

interface DecodedUser {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedUser;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token =
    (req.headers["x-auth-token"] as string | undefined) ||
    req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authorization token missing, please provide token" });
  }

  try {
    const decoded = verifyUserToken(token) as DecodedUser;
    req.user = decoded;
    return next();
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid Token" });
  }
};

export const roleMiddleware = (role: "admin" | "agent" | "user") => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: `Access denied. ${role}s only.` });
    }
    next();
  };
};
