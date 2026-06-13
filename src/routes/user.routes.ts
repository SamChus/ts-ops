import express from "express";
import {
  editUserProfile,
  getAllUsers,
  getUserProfile,

} from "../controllers/user.controller";

const route = express.Router();

route.get("/profile", getUserProfile);

route.put("/edit-profile", editUserProfile);

route.get("/all-users", getAllUsers);

route.post("/user-prefrences", (req, res) => {
  res.status(200).json("Added user prefrences!");
});
export default route;
