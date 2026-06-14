import { User } from '@inventory/shared-types';

export interface IAuthService {
  register(
    data: { email: string; password: string; username: string; role?: string },
    correlationId?: string
  ): Promise<User>;
  login(
    email: string,
    password: string,
    correlationId?: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string }>;
  refresh(
    refreshToken: string,
    correlationId?: string
  ): Promise<{ accessToken: string; refreshToken: string }>;
  logout(refreshToken: string, correlationId?: string): Promise<void>;
}
