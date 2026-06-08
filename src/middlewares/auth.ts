import { Request, Response } from "express";
import jwt from "jsonwebtoken";


declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

function authMiddleware(req: Request, res: Response, next: Function) {
  const token = req.headers["x-auth-token"] as string || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "Authorization token missing, Pls Provide token" });
  }

  try {
     const decoded = jwt.verify(
       token,
       process.env.JWT_SECRET || "",
     ) as {
       userId: string;
       role: string
     };

    if (!decoded || typeof decoded.userId !== "string") {
      throw new Error("INVALID_TOKEN");
    }
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(400).json({
      message: "Invalid Token",
    });
  }
}

export default authMiddleware;
