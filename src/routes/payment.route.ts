import { Router } from "express";
import {authMiddleware} from "../middlewares/auth";
import {
  handlePaystackWebhook,
  initializePayment,
  verifyPayment,
} from "../controllers/payment.controller";

const route = Router();

route.post("/init", authMiddleware, initializePayment);
route.get("/verify", authMiddleware, verifyPayment);
route.post("/webhook", handlePaystackWebhook);

export default route;
