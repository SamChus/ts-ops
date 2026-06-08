import { Router } from "express";
import {
  getAllApartments,
  getApartmentById,
  addApartmentImages,
  createApartment,
  updateApartment,
} from "../controllers/apartment.controller";
import uploadMiddleware from "../middlewares/upload";
import type { Request, Response, NextFunction } from "express";
import { handleMulterError } from "./upload.routes";

const router = Router();

router.get("/", getAllApartments);

router.get("/:id", getApartmentById);

router.post("/", createApartment);

router.put("/:id", updateApartment);

router.post(
  "/:id",
  (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware.array("apartmentImg")(req, res, (err) =>
      handleMulterError(err, req, res, next),
    );
  },
  addApartmentImages,
);

export default router;
