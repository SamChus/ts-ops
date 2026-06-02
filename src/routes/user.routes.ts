import express from "express";
import {
  editUserProfile,
  getUserProfile,
} from "../controllers/user.controller";

const route = express.Router();

route.get("/profile", getUserProfile);

route.put("/edit-profile", editUserProfile);

route.post("/user-prefrences", (req, res) =>{
  res.status(200).json("Added user prefrences!")
})

export default route;
