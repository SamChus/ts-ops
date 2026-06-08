import { s3, bucketName } from "../config/aws-s3";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Request, Response } from "express";
import AppError from "../utils/appError";
import cloudinary from "../config/cloudinary";
import { UserService } from "../services/userService";
import logger from "../utils/winston";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1"; 

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




const uploadToS3 = async (
  files: any[],
  bucketName: string,
  folder: string,
): Promise<string[]> => {
  const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1"});
  try {

    // Map through files and upload each one to S3
    const uploadPromises = files.map((file) => {
      const s3Key = `${folder}/${Date.now()}-${file.originalname}`;

      const command = new PutObjectCommand({
        Bucket: bucketName                                                                                                                                                                                     ,
        Key: s3Key,
        Body: file.buffer, // Multer memoryStorage provides this buffer
        ContentType: file.mimetype,
      });

      return s3Client.send(command).then(() => {
        return `https://${bucketName}.s3.${REGION}.amazonaws.com/${s3Key}`;
      });
    });

    // Wait for all S3 uploads to complete parallelly
    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  } catch (error) {
    logger.error("uploadToS3 error:", error);
    throw new AppError("Image upload failed", 500);
  }
};

const generatePresignedUrl = async (filename:string, bucketName: string) => {
  
  try {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: filename,
  });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    logger.error("generatePresignedUrl error:", error);
    throw new AppError("Failed to generate presigned URL", 500);
  }
};

export { uploadProfileImage , uploadToS3, generatePresignedUrl};
