import {Request, Response} from "express"
import AppError from "../utils/appError";
import { BookingService } from "../services/booking.service";

export const createBooking = async (req:Request, res:Response) => {
    const {userId: guest_id} = req.user
  const apartment_id= req.params.id as string;
    
 const {
        check_in,
        check_out,
        no_of_guest
 } = req.body

 if (!check_in || !check_out || !no_of_guest ||!apartment_id){
    throw new AppError("All fields must be provide", 400)
 }

 const result = await BookingService.createBooking(guest_id, apartment_id, check_in, check_out)
 res.status(201).json({
  message: "You just booked an apartment",
  booking: result
 })
 return 

}