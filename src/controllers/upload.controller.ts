import { s3, bucketName } from "../config/aws-s3";
import type { Request, Response } from "express";
import AppError from "../utils/appError";
import cloudinary from "../config/cloudinary";
import { UserService } from "../services/userService";

const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    // Ensure request is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) return res.status(400).json({ error: "No file provided" });

    // Convert buffer to base64 for Cloudinary upload
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "profiles",
    });

    const updated = await UserService.updateUserImage(
      req.user.userId,
      result.secure_url,
    );

    if (!updated) {
      return res
        .status(500)
        .json({ error: "Failed to persist image URL to user profile" });
    }

    res.status(200).json({ updated });
  } catch (error) {
    console.error("uploadProfileImage error:", error);
    throw new AppError("Image upload failed", 500);
  }
};

const uploadApartmentImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const params = {
      Bucket: bucketName,
      Key: `apartments/${Date.now()}-${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      // ACL: 'public-read' // Uncomment if you want public bucket access (adjust as per bucket policy)
    };

    const data = await s3.upload(params).promise();

    res.status(200).json({ url: data.Location });
  } catch (error) {
    throw new AppError("Image upload failed", 500);
  }
};

export { uploadProfileImage, uploadApartmentImage };
