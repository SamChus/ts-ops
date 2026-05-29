
import {Request, Response} from "express"
import { verifyUserToken } from "./signer";


const getUserIdFromToken = (req:Request, res:Response) =>{
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

      return userId
}

export default getUserIdFromToken;