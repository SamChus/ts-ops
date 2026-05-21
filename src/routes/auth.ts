import express, { Request, Response } from "express";
import { UserService } from "../services/userService";
import dotenv from "dotenv";

dotenv.config();

import jwt from "jsonwebtoken";
import { validateLogin, validateRegister } from "../validate/auth";
import { getUserToken } from "../utils/signer";
import { LoginRequest, RegisterRequest } from "../types";



const route = express.Router();

route.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body as LoginRequest;

  const { error } = validateLogin(req.body);

  if (error) return res.status(400).send("Invalid Input");

  UserService.getUserProfileByEmail(email)
    .then((user) => {
      if (!user || user.password !== password) {
        return res.status(401).send("Invalid email or password");
      }
   
     const token = getUserToken(user)


      res.json({ message: "User logged in successfully", user, token });
    })
    .catch((err) => {
      console.error("Error during login:", err);
      res.status(500).send("Internal Server Error");
    });
});

route.post("/register", async (req: Request, res: Response) => {

  const { name, email, password, balance } = req.body as RegisterRequest

  const { error } = validateRegister(req.body);

  if (error) return res.status(400).send("Invalid Input");


  try {
    const existingUser = await UserService.getUserProfileByEmail(email);
    if (existingUser) {
      return res.status(409).send("Email already registered");
    }

    const user = await UserService.createNewUser(
      name,
      email,
      balance,
      password,
    );
  
     const token = getUserToken(user);


    res.json({ message: "User registered successfully", user, token });
  } catch (err) {
    console.error("Error creating user:", err);
    if (err instanceof Error && err.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).send("Email already registered");
    }
    res.status(500).send("Internal Server Error");
  }
});

export default route;
