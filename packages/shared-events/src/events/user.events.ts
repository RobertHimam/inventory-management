import { Event } from '../event';
import { VERSION } from '../versions';
import { z } from 'zod';
import { Role } from '@inventory/shared-types';

export interface UserCreatedPayload {
  userId: string;
  email: string;
  username: string;
  role: Role;
}

export const userCreatedSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  username: z.string(),
  role: z.nativeEnum(Role),
});

export function createUserCreatedEvent(
  correlationId: string,
  payload: UserCreatedPayload
): Event<UserCreatedPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.USER_CREATED.type,
    version: VERSION.USER_CREATED.version,
    payload,
  };
}

export interface UserUpdatedPayload {
  userId: string;
  email: string;
  username: string;
  role: Role;
}

export const userUpdatedSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  username: z.string(),
  role: z.nativeEnum(Role),
});

export function createUserUpdatedEvent(
  correlationId: string,
  payload: UserUpdatedPayload
): Event<UserUpdatedPayload> {
  return {
    correlationId,
    timestamp: new Date(),
    type: VERSION.USER_UPDATED.type,
    version: VERSION.USER_UPDATED.version,
    payload,
  };
}
