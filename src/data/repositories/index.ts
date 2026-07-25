import BaseRepository from "./BaseRepository";
import { UserRepository } from "./UserRepository";
import { ApartmentRepository } from "./ApartmentRepository";
import { BookingRepository } from "./BookingRepository";
import { ReviewRepository } from "./ReviewRepository";
import { AuthRepository } from "./AuthRepository";
import { pgPool } from "../../config/db";



// ─── Composed Repository Classes ─────────────────────────────────────────────
// Each repository mixin is applied to BaseRepository here.
// Consumers import ready-to-instantiate classes from this single barrel file.

export const UserRepo      = UserRepository(BaseRepository);
export const ApartmentRepo = ApartmentRepository(BaseRepository);
export const BookingRepo   = BookingRepository(BaseRepository);
export const ReviewRepo    = ReviewRepository(BaseRepository);
export const AuthRepo      = AuthRepository(BaseRepository);

// ─── Instance Types ───────────────────────────────────────────────────────────
// Use these when you need to type a variable that holds an instance.
// e.g.  private static repo: UserRepoType = new UserRepo(pool);

export type UserRepoType      = InstanceType<typeof UserRepo>;
export type ApartmentRepoType = InstanceType<typeof ApartmentRepo>;
export type BookingRepoType   = InstanceType<typeof BookingRepo>;
export type ReviewRepoType    = InstanceType<typeof ReviewRepo>;
export type AuthRepoType      = InstanceType<typeof AuthRepo>;


// ─── Instantiate Repository Classes ───────────────────────────────────────────
export const userRepo = new UserRepo(pgPool);
export const apartmentRepo = new ApartmentRepo(pgPool);
export const bookingRepo = new BookingRepo(pgPool);
export const reviewRepo = new ReviewRepo(pgPool);
export const authRepo = new AuthRepo(pgPool);

// ─── Re-export shared types ───────────────────────────────────────────────────
// So consumers only need one import path for entities + pagination interfaces.


export type {
  IUser,
  IApartment,
  IBooking,
  IReview,
  IAuthResponse,
  IUserQuery,
  IApartmentQuery,
  IBookingQuery,
  IReviewQuery,
  ICursorPage,
  IOffsetPage,
  IUserRepository,
  IApartmentRepository,
  IBookingRepository,
  IReviewRepository,
  BookingRequest,
} from "./repository";
