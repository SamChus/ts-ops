import  express, {Request, Response} from "express"

const route = express.Router()


route.post("/login", (req: Request, res: Response) => {
    res.send("Login")
})

route.post("/register", (req: Request, res: Response) => {
    res.send("Register")
})

export default route