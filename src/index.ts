import dotenv from "dotenv";
import client from "prom-client";
dotenv.config();
import express = require("express");
import type { Application, Request, Response } from "express-serve-static-core";
import AppError from "./utils/appError";
import { errorHandler } from "./middlewares/errorHandler";
import authRoute from "./routes/auth.routes";
import userRoute from "./routes/user.routes";
import bookingRoute from "./routes/booking.routes";
import paymentRoute from "./routes/payment.route";

import uploadRoute from "./routes/upload.routes";
import apartmentRoute from "./routes/apartment.routes";
import { initDatabase, redisClient } from "./config/db";
import cors from "cors";
import { verifySTMP } from "./validate/stmp";
import {authMiddleware, adminMiddleware } from "./middlewares/auth";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import logger from "./utils/winston";
import { amqpManager } from "./config/amqp";
import { getAllUsers } from "./controllers/user.controller";

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

const app: Application = express();
const instance = process.env.INSTANCE || "ts-ops";
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
  }),
);
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send(`This is ${instance} listening at ${port}`);
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Automatically collect default metrics (CPU, Memory, Event Loop Lag)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// Expose the Prometheus scraping endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

const startServer = async () => {
  try {
    await initDatabase();
    await verifySTMP();

    await amqpManager.getConnection();

    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 10,
      message: "Too many requests for this IP, please try again later",
      standardHeaders: "draft-7",
      legacyHeaders: false,
      store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      }),
    });

    app.use(limiter);

    app.use("/api/auth", authRoute);
    app.use("/api/user", authMiddleware, userRoute);
    app.use("/api/users", [authMiddleware, adminMiddleware], getAllUsers);
    app.use("/api", uploadRoute);
    app.use("/api/apartments", authMiddleware, apartmentRoute);
    app.use("/api/booking", authMiddleware, bookingRoute);
    app.use("/api/payment", paymentRoute);

    app.use(errorHandler);

    app.listen(port, () => {
      logger.info(`This is ${instance}, listening on ${port}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
