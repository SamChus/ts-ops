import express from "express";
import {
  editUserProfile,
  getAllUsers,
  getUserProfile,
  clearMyCache,
  clearUserCache,
  clearAllCaches,
} from "../controllers/user.controller";

const route = express.Router();

route.get("/profile", getUserProfile);

route.put("/edit-profile", editUserProfile);

route.get("/all-users", getAllUsers);

route.post("/user-prefrences", (req, res) => {
  res.status(200).json("Added user prefrences!");
});


route.post("/cache/clear-mine", clearMyCache);

route.post("/cache/clear-user", clearUserCache);


route.post("/cache/clear-all", clearAllCaches);

export default route;
