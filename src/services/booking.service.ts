import { pgPool, redisClient } from "../config/db";
import { BookingRepository } from "../data/repositories/BookingRepository";
import { IBooking, BookingRequest } from "../data/repositories/repository";
import AppError from "../utils/appError";




export class BookingService {
    private static bookingRepo = new BookingRepository(pgPool)
 
    static async createPendingBooking(request: BookingRequest) {
    
        try {
            const booking = await this.bookingRepo.createPendingBooking(request);
            return booking;
        } catch (error: Error | any) {
            throw new AppError(`Failed to create pending booking: ${error.message}`, 500);
        }
    }

    static async cancelBooking(bookingId: string): Promise<void> {
        console.log(`Cancelling booking with ID: ${bookingId}`);
        // Implement booking cancellation logic here
    }

    static async getBookingDetails(bookingId: string): Promise<any> {
       return await this.bookingRepo.getBookingById(bookingId)
    }

    static async getUserBookings(guest_id: string): Promise<any[]> {
       return await this.bookingRepo.getBookingsByUser(guest_id)
    }

    static async getApartmentBookings(apartment_id: string): Promise<any[]> {
        console.log(`Getting bookings for apartment ID: ${apartment_id}`);
        // Implement logic to retrieve bookings for the apartment here

        return [
            {apartment_id},
        ]
    }

    static async updateBooking(bookingId: string, check_in: Date, check_out: Date): Promise<void> {
        console.log(`Updating booking ID: ${bookingId} to new dates: ${check_in} - ${check_out}`);
        // Implement booking update logic here
    }

    static async checkAvailability(apartment_id: string, check_in: Date, check_out: Date): Promise<boolean> {
        console.log(`Checking availability for apartment ID: ${apartment_id} from ${check_in} to ${check_out}`);
        // Implement logic to check apartment availability here
        return true; // Placeholder return value
    }

    static async sendBookingConfirmation(guest_id: string, bookingId: string): Promise<void> {
        console.log(`Sending booking confirmation for user ${guest_id} and booking ID: ${bookingId}`);
        // Implement logic to send booking confirmation here (e.g., email, SMS)
    }
    
}