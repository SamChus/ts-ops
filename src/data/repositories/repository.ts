import { Interface } from "node:readline";

//Auth entity
export interface IAuthResponse {
  user: IUser;
  token: string;
}


// User entity
export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  profile_image_url: string | null;
  phone: string | null;
  is_verified: boolean;
  role: "guest" | "agent" | "admin";
  created_at: Date;
  updated_at: Date;
}

// Apartment entity
export interface IApartment {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  price_per_night: number;
  location: string;
  image_urls: string[];
  address: string;
  city: string;
  max_guests: number;
  status: "available" | "booked" | "unavailable";
  created_at: Date;
  updated_at: Date;
}

// Booking entity
export interface IBooking {
  id?: string;
  apartment_id: string;
  guest_id: string;
  dates: string[];
  check_in: Date;
  check_out: Date;
  total_price?: number;
  no_of_guest?: number;
  status?: "pending" | "completed" | "cancelled";
  created_at?: Date;
}

// Review 
export interface IReview {
    id: string;
  apartment_id: string;
  booking_id: string;
  guest_id: string;
  rating: number;
  comment: string | null; 
  created_at: Date;
}




interface IQueryParameters{
    limit?: number
    offset?: number
  
}

export interface IUserQuery extends IQueryParameters {
}

export interface IApartmentQuery extends IQueryParameters {}

export interface IBookingQuery extends IQueryParameters {
    apartment_id?: string;
    guest_id?: string;
    status?: "pending" | "completed" | "cancelled";
    check_in?: Date;
    check_out?: Date;
}

export interface IReviewQuery extends IQueryParameters {
    apartment_id?: string;
    guest_id?: string;
    rating?: number;
}

export interface IUserQueryResult {
 users: IUser[];
 totalCount: number;
}

export interface IApartmentQueryResult {
 apartment: IApartment[];
 totalCount: number;
}

export interface IBookingQueryResult {
  bookings: IBooking[];
  totalCount: number;
}

export interface BookingRequest {
  guest_id: number;
  apartment_id: string;
  dates: string[];
  price_per_night: number;
  no_of_guest: number;
}



export interface IUserRepository {
  createUser(user: IUser): Promise<IUser>;
  getUserById(id: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  updateUser(id: string, user: Partial<IUser>): Promise<IUser | null>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(query: IUserQuery): Promise<IUserQueryResult>;
}

export interface IApartmentRepository {
    createApartment(apartment: IApartment): Promise<IApartment>;
    getApartmentById(id: string): Promise<IApartment | null>;
    updateApartment(id: string, apartment: Partial<IApartment>): Promise<IApartment | null>;
    deleteApartment(id: string): Promise<void>;
    getAllApartments(query: IApartmentQuery): Promise<IApartmentQueryResult>;
    addImages(apartmentId: string, imageUrls: string[]): Promise<IApartment | null>;
}

export interface IBookingRepository {
    // createBooking(booking: IBooking): Promise<IBooking>;
    getBookingById(id: string): Promise<IBooking | null>;
    updateBooking(id: string, booking: Partial<IBooking>): Promise<IBooking | null>;
    deleteBooking(id: string): Promise<IBooking>
    getAllBookings(query?: IBookingQuery): Promise<IBooking[]>
    createPendingBooking(booking: BookingRequest): Promise<IBooking>;
}

export interface IReviewRepository {
    createReview(review: IReview): Promise<IReview>;
    getReviewById(id: string): Promise<IReview | null>;
    updateReview(id: string, review: Partial<IReview>): Promise<IReview | null>;
    deleteReview(id: string): Promise<IReview>
    getAllReviews(): Promise<IReview[]>
}