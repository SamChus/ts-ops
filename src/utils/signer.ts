import jwt from "jsonwebtoken";
import { User } from "../types";

export const getUserToken = (user: User) => {
  return <string>(
    jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "", {
      expiresIn: "1h",
    })
  );
};

export const verifyUserToken = (token: string): { userId: number } => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
      userId: number;
    };
    if (!decoded || typeof decoded.userId !== "number") {
      throw new Error("INVALID_TOKEN");
    }
    return decoded;
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      throw new Error("INVALID_TOKEN");
    }
    throw error;
  }
};
