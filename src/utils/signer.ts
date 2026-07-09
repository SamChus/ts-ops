import jwt from "jsonwebtoken";
import { IUser } from "../data/repositories/repository";

export const getUserToken = (user: IUser) : string => {
  const payload = {
    userId: user.id,
    role: user.role,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET || "", {
    expiresIn: "1h",
  });
  return token;
};

export const verifyUserToken = (
  token: string,
): { userId: string; role: string } => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
      userId: string;
      role: string;
    };
    if (!decoded || typeof decoded.userId !== "string") {
      throw new Error("INVALID_TOKEN");
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("TOKEN_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("INVALID_TOKEN");
    }
    throw error;
  }
};
