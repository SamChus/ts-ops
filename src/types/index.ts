export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  balance: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  balance: number;
}