
import {Router} from "express";
import { initializePayment, verifyPayment } from "../controllers/payment.controller";

const route = Router()

route.post("/init", initializePayment)

route.get("/verify", verifyPayment);


export default route