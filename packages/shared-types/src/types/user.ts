import { Role } from '../enums';

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
  passwordHash?: string;
}

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  role: Role;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface UserListResponse {
  success: boolean;
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserDetailResponse {
  success: boolean;
  data: User;
}
