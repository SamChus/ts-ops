import { ApartmentService } from "../services/apartmentService";
import type { Request, Response, NextFunction } from "express";

export const getAllApartments = async (req: Request, res: Response) => {
  const apartments = await ApartmentService.getAllApartments();
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
  const { title, description, price_per_night, location, address, city, max_guests, status } = req.body;

    if (!title || !price_per_night || !address || !city || !max_guests || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const apartment = await ApartmentService.createApartment({ title, description, price_per_night, location, address, city, max_guests, status });
    res.status(201).json({ message: 'Apartment created successfully', apartment });
};

export const updateApartment = async (req: Request, res: Response) => {
    const apartmentId = req.params.id;
    const { title, description, price_per_night, location, address, city, max_guests, status } = req.body;

    if (!apartmentId || typeof apartmentId !== "string") {
        return res.status(400).json({ message: 'Apartment ID is required' });
    }

    if (!title || !price_per_night || !address || !city || !max_guests || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    

    const apartment = await ApartmentService.updateApartment(apartmentId, { title, description, price_per_night, location, address, city, max_guests, status });
    res.status(200).json({ message: 'Apartment updated successfully', apartment });
};

export const addApartmentImages = async (req: Request, res: Response) => {  
     const apartmentId = req.params.id;
    const { imageUrls } = req.body;

    if (!apartmentId || typeof apartmentId !== "string") {
        return res.status(400).json({ message: 'Apartment ID is required' });
    }

    if (!imageUrls || !Array.isArray(imageUrls)) {
        return res.status(400).json({ message: 'Invalid image URLs format' });
    }

    const apartment = await ApartmentService.addApartmentImages(apartmentId, imageUrls);
    res.status(200).json({ message: 'Apartment images added successfully', apartment });
} 