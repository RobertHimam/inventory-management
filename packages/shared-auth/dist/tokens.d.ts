import { Role } from '@inventory/shared-types';
export interface TokenPayload {
    sub: string;
    role: Role;
}
export declare function createAccessToken(payload: TokenPayload, secret: string, ttlSeconds?: number): string;
export declare function verifyAccessToken(token: string, secret: string): TokenPayload | null;
export interface RefreshTokenPayload extends TokenPayload {
    jti: string;
}
export declare function createRefreshToken(payload: TokenPayload, secret: string, ttlSeconds?: number): string;
export declare function verifyRefreshToken(token: string, secret: string): RefreshTokenPayload | null;
//# sourceMappingURL=tokens.d.ts.map