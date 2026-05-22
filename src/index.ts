import express from "express";
import type { Application, Request, Response } from "express";
import authRoute from "./routes/auth";
import { initDatabase } from "./config/db";
import cors from "cors";
import dotenv from "dotenv";


dotenv.config()







const app: Application = express();

const instance = process.env.INTANCE;
const port = process.env.PORT;



app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req: Request, res: Response) => {
  res.send(
    `This is ${instance} listening at ${port}`
  );
});

app.use("/auth", authRoute);

const startServer = async () => {
  await initDatabase();
  app.listen(port, () => {
    console.log(`This is ${instance}, listen on ${port}`);
  });
};

startServer();
