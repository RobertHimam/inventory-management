import { IRefreshTokenRepository, RefreshToken } from './interfaces/IRefreshTokenRepository';
import RefreshTokenModel from '../models/refreshToken.model';

export class RefreshTokenRepository implements IRefreshTokenRepository {
  async save(token: RefreshToken): Promise<void> {
    await RefreshTokenModel.create(token);
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    const doc = await RefreshTokenModel.findOne({ jti }).exec();
    if (!doc) return null;
    return {
      userId: doc.userId,
      jti: doc.jti,
      expiresAt: doc.expiresAt,
    };
  }

  async deleteByJti(jti: string): Promise<void> {
    await RefreshTokenModel.deleteOne({ jti }).exec();
  }
}
