import { z } from 'zod';
import { Role } from '@inventory/shared-types';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
