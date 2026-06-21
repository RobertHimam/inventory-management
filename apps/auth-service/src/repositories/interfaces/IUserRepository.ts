import { User } from '@inventory/shared-types';

export interface UserFindAllOptions {
  page?: number;
  limit?: number;
}

export interface UserFindAllResult {
  data: User[];
  total: number;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: { email: string; username: string; passwordHash: string; role: string }): Promise<User>;
  softDelete(id: string, deletedBy: string): Promise<void>;
  findAll(options: UserFindAllOptions): Promise<UserFindAllResult>;
}
