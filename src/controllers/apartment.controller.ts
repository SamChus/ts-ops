import { ApartmentService } from "../services/apartment.service";
import type { Request, Response, NextFunction } from "express";
import { s3, bucketName } from "../config/aws-s3";
import logger from "../utils/winston";
import AppError from "../utils/appError";
import { uploadToS3 } from "./upload.controller";
import { getPaginationParameters } from "../utils/pagination";

export const getAllApartments = async (req: Request, res: Response) => {
  const { limit, offset } = getPaginationParameters(req);
  const apartments = await ApartmentService.getAllApartments(limit, offset);
  res.status(200).json({ apartments });
};

export const getApartmentById = async (req: Request, res: Response) => {
  const apartmentId = req.params.id;

  if (!apartmentId || typeof apartmentId !== "string") {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  const apartment = await ApartmentService.getApartmentById(apartmentId);
  if (!apartment) {
    return res.status(404).json({ message: "Apartment not found" });
  }
  res.status(200).json({ apartment });
};

export const createApartment = async (req: Request, res: Response) => {
  const agent_id = req.user?.userId;

  if (!agent_id || typeof agent_id !== "string") {
    return res.status(400).json({ message: "Agent ID is required" });
  }

  const {
    title,
    description,
    price_per_night,
    location,
    address,
    city,
    max_guests,
    status,
  } = req.body;

  if (
    !title ||
    !price_per_night ||
    !address ||
    !city ||
    !max_guests ||
    !status
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const apartment = await ApartmentService.createApartment({
      agent_id,
      title,
      description,
      price_per_night,
      location,
      address,
      city,
      max_guests,
      status,
    });
    res
      .status(201)
      .json({ message: "Apartment created successfully", apartment });
  } catch (ex) {
    logger.error("Error creating apartment:", ex);
    return res
      .status(500)
      .json({ message: "Only agents can create apartments" });
  }
};

export const updateApartment = async (req: Request, res: Response) => {
  const apartmentId = req.params.id;
  const {
    title,
    description,
    price_per_night,
    location,
    address,
    city,
    max_guests,
    status,
  } = req.body;

  if (!apartmentId || typeof apartmentId !== "string") {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  if (
    !title ||
    !price_per_night ||
    !address ||
    !city ||
    !max_guests ||
    !status
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const apartment = await ApartmentService.updateApartment(apartmentId, {
    title,
    description,
    price_per_night,
    location,
    address,
    city,
    max_guests,
    status,
  });
  res
    .status(200)
    .json({ message: "Apartment updated successfully", apartment });
};

export const addApartmentImages = async (req: Request, res: Response) => {
  const apartmentId = req.params.id;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  if (!apartmentId || typeof apartmentId !== "string") {
    return res.status(400).json({ message: "Apartment ID is required" });
  }

  try {
    const response = await uploadToS3(files, bucketName, "apartments");
    const apartment = await ApartmentService.addApartmentImages(
      apartmentId,
      response,
    );
    res
      .status(200)
      .json({ message: "Apartment images added successfully", apartment });
  } catch (error) {
    throw new AppError("Failed to add apartment image", 500);
  }
};

export const uploadApartmentImage = async (req: Request, res: Response) => {
  // Multer .array() puts the uploaded files inside req.files
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  try {
    const response = await uploadToS3(files, bucketName, "apartments");
    res.status(200).json({ response });
  } catch (error) {
    throw new AppError("Image upload failed", 500);
  }
};
