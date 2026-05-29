import express = require("express");
import type { Application, Request, Response } from "express-serve-static-core";
import authRoute from "./routes/auth";
import userRoute from "./routes/user";
import { initDatabase, redisClient } from "./config/db";
import cors from "cors";
import dotenv from "dotenv";
import { verifySTMP } from "./validate/stmp";
import authMiddleware from "./middleware/auth";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

dotenv.config();

const app: Application = express();
const instance = process.env.INTANCE;
const port = process.env.PORT;

app.set("trust proxy", 1); // Placed early to ensure Express reads headers correctly
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send(`This is ${instance} listening at ${port}`);
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const startServer = async () => {
  await initDatabase();
  await verifySTMP();

  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: "Too many requests for this IP, please try again later",
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: async (...args: string[]) => redisClient.sendCommand(args),
    }),
  });

  app.use(limiter);

  app.use("/auth", authRoute);
  app.use("/", authMiddleware, userRoute);

  app.use(function(err:Error, req:Request, res:Response, next:Function){
    res.status(500).json("Internal server error")
  })

  app.listen(port, () => {
    console.log(`This is ${instance}, listening on ${port}`);
  });
};

startServer();