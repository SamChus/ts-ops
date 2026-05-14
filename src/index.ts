import express from "express";
import type { Application, Request, Response } from "express";
import authRoute from "./routes/auth";

const app: Application = express();

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

app.use("/auth", authRoute);

app.listen("3000", () => {
  console.log("Port 3000");
});
