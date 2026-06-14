export interface RefreshToken {
  userId: string;
  jti: string;
  expiresAt: Date;
}

export interface IRefreshTokenRepository {
  save(token: RefreshToken): Promise<void>;
  findByJti(jti: string): Promise<RefreshToken | null>;
  deleteByJti(jti: string): Promise<void>;
}
