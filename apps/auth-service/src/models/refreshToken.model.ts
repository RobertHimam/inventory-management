import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken {
  userId: string;
  jti: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IRefreshTokenDocument extends IRefreshToken, Document {}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>({
  userId: { type: String, required: true },
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRefreshTokenDocument>('RefreshToken', RefreshTokenSchema);
