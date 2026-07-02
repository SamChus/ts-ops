
import {Router} from "express";
import { handlePaystackWebhook, initializePayment, verifyPayment } from "../controllers/payment.controller";

const route = Router()

route.post("/init", initializePayment)

route.get("/verify", verifyPayment);

route.post("/webhook", handlePaystackWebhook);


export default route

