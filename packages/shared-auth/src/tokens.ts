import { sign, verify } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Role } from '@inventory/shared-types';

export interface TokenPayload {
  sub: string;
  role: Role;
}

export function createAccessToken(payload: TokenPayload, secret: string, ttlSeconds = 900): string {
  const now = Math.floor(Date.now() / 1000);
  const payloadWithExp = { ...payload, exp: now + ttlSeconds };
  return sign(payloadWithExp, secret);
}

export function verifyAccessToken(token: string, secret: string): TokenPayload | null {
  try {
    const decoded = verify(token, secret) as TokenPayload;
    return { sub: decoded.sub, role: decoded.role };
  } catch (err) {
    return null;
  }
}

export interface RefreshTokenPayload extends TokenPayload {
  jti: string;
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
    const decoded = verify(token, secret) as RefreshTokenPayload;
    return { sub: decoded.sub, role: decoded.role, jti: decoded.jti };
  } catch (err) {
    return null;
  }
}
