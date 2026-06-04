export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: string;
  isVerified?: boolean;
  profile_image_url?: string;
}
