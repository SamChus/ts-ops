import jwt from "jsonwebtoken"
import { User } from "../types"



export const getUserToken = (user: User) => {
    return<string> jwt.sign(
        {userId: user.id},
        process.env.JWT_SECRET || "",
        {expiresIn: "1h"}
    )
    
}

export const verifyUserToken = (token: string): { userId: number } => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { userId: number };
        return decoded;
    } catch (err) {
        throw new Error("INVALID_TOKEN");
    }
}