import express = require("express");
import {login, register, sendToken, verifyEmail, resetPassword,forgetPassword } from "../controllers/auth.controller";


const route = express.Router();

route.post(
  "/login",
  login,
);

route.post(
  "/register",
  register,
);

route.post(
  "/forget-password",
  forgetPassword,
);

route.post(
  "/reset-password",
  resetPassword
);

route.post(
  "/send-token",
  sendToken
);

route.post(
  "/verify-email",
  verifyEmail
);

export default route;
