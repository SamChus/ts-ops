import { Router } from "express";
import uploadMiddleware from "../middlewares/upload";
import {
  uploadApartmentImage,
  uploadProfileImage,
} from "../controllers/upload.controller";
import authMiddleware from "../middlewares/auth";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Error handler for multer errors
const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err && err.message === "Unexpected field") {
    return res.status(400).json({
      error:
        "Unexpected form field. Use 'profileImg' for profile uploads or 'apartmentImg' for apartment uploads",
    });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

router.post(
  "/upload/profile",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware.single("profileImg")(req, res, (err) =>
      handleMulterError(err, req, res, next),
    );
  },
  uploadProfileImage,
);
router.post(
  "/upload/apartment",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware.single("apartmentImg")(req, res, (err) =>
      handleMulterError(err, req, res, next),
    );
  },
  uploadApartmentImage,
);

export default router;
