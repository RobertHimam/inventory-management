import mongoose, { Schema, Document } from 'mongoose';
import { Role } from '@inventory/shared-types';

export interface IUser {
  email: string;
  username: string;
  passwordHash: string;
  role: Role;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  id: string;
}

const UserSchema = new Schema<IUserDocument>({
  email: { type: String, required: true, lowercase: true, unique: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: Object.values(Role), required: true },
  deletedAt: { type: Date },
  deletedBy: { type: String },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

UserSchema.virtual('id').get(function (this: IUserDocument) {
  return this._id.toString();
});

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ deletedAt: 1 });

export default mongoose.model<IUserDocument>('User', UserSchema);
