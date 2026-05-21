import jwt from "jsonwebtoken"
import { User } from "../types"



export const getUserToken = (user: User) => {
    jwt.sign(
        {userId: user.id},
        process.env.JWT_SECRET || "",
        {expiresIn: "1h"}
    )
}