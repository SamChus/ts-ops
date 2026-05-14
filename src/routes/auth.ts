import  express, {Request, Response} from "express"
import { UserService } from "../userService"
import dotenv from "dotenv"

dotenv.config()

import jwt from "jsonwebtoken"  
import { validateRegister } from "../validate/auth"

interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    balance: number;
}

interface LoginRequest {
    email: string;
    password: string;
}



const route = express.Router()


route.post("/login", (req: Request, res: Response) => {
    res.send("Login")
})

route.post("/register", (req: Request, res: Response) => {
    const {name, email, password, balance} = req.body as RegisterRequest

    const {error} = validateRegister(req.body)

    if (error) {
        return res.status(400).send("Invalid Input")
        console.error("Validation Error:", error)
    }

    UserService.createNewUser(name, email, balance, password)
        .then(user => {
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "default_secret", { expiresIn: "1h" })
            res.json({ token })
        })
        .catch(err => {
            console.error("Error creating user:", err)
            res.status(500).send("Internal Server Error")
        })
})

export default route