import { Request, Response } from "express";
import AppError from "../utils/appError";
import { BookingService } from "../services/booking.service";

export const createBooking = async (req: Request, res: Response) => {
  const {
    guest_id,
    apartment_id: bodyApartmentId,
    dates,
    price_per_night,
    no_of_guest,
  } = req.body;
  const apartment_id = req.params.id || bodyApartmentId;

  console.log(
    `[BookingController] createBooking route apartment_id=${req.params.id} body apartment_id=${bodyApartmentId}`,
  );

  if (
    !guest_id ||
    !apartment_id ||
    !dates ||
    !price_per_night ||
    !no_of_guest
  ) {
    throw new AppError("Missing required booking details", 400);
  }

  const bookingRequest = {
    guest_id,
    apartment_id,
    dates,
    price_per_night,
    no_of_guest,
  };

  const booking = await BookingService.createPendingBooking(bookingRequest);

  res.status(201).json({
    status: "success",
    data: booking,
  });
};

export const fetchBookingDetails = async (req: Request, res: Response) => {
  const bookingId = req.params.id as string;

  if (!bookingId) {
    throw new AppError("Booking ID is required", 400);
  }

  const bookingDetails = await BookingService.getBookingDetails(bookingId);

  if (!bookingDetails) {
    throw new AppError("Booking not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: bookingDetails,
  });
};
