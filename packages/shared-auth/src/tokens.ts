import { sign, verify } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Role } from '@inventory/shared-types';

export interface TokenPayload {
  sub: string;
  role: Role;
  username?: string;
}

export function createAccessToken(payload: TokenPayload, secret: string, ttlSeconds = 900): string {
  const now = Math.floor(Date.now() / 1000);
  const payloadWithExp = { ...payload, exp: now + ttlSeconds };
  return sign(payloadWithExp, secret);
}

export function verifyAccessToken(token: string, secret: string): TokenPayload | null {
  try {
    const decoded = verify(token, secret) as Record<string, unknown>;
    return { sub: decoded.sub as string, role: decoded.role as Role, username: decoded.username as string | undefined };
  } catch (err) {
    return null;
  }
}

export interface RefreshTokenPayload extends TokenPayload {
  jti: string;
  exp?: number;
}

export function createRefreshToken(
  payload: TokenPayload,
  secret: string,
  ttlSeconds = 604800
): string {
  const now = Math.floor(Date.now() / 1000);
  const payloadWithJti = { ...payload, jti: randomUUID(), exp: now + ttlSeconds };
  return sign(payloadWithJti, secret);
}

export function verifyRefreshToken(token: string, secret: string): RefreshTokenPayload | null {
  try {
    const decoded = verify(token, secret) as Record<string, unknown>;
    return {
      sub: decoded.sub as string,
      role: decoded.role as Role,
      jti: decoded.jti as string,
      exp: decoded.exp as number | undefined,
      username: decoded.username as string | undefined,
    };
  } catch (err) {
    return null;
  }
}
