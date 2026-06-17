import { Role } from '../enums';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: Role;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}
