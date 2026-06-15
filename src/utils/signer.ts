import jwt from "jsonwebtoken";
import { User } from "../types";
import { IUser } from "../data/repositories/repository";


export const getUserToken = (user: IUser) => {
  return <string>(
    jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "", {
      expiresIn: "1h",
    })
  );
};

export const verifyUserToken = (token: string): { userId: string, role: string } => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
      userId: string;
      role: string
    };
    if (!decoded || typeof decoded.userId !== "string") {
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
