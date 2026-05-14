import express from "express";
import type { Application, Request, Response } from "express";
import authRoute from "./routes/auth";
import {initDatabase} from "./db"

const app: Application = express();

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

app.use("/auth", authRoute);

const startServer = async () => {
    await initDatabase()
    app.listen("3000", () => {
        console.log("Port 3000");
    })
}

startServer()


