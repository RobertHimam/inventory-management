import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  endpoint: string;
  requestHash: string;
  status: 'processing' | 'completed';
  responseCode?: number;
  responseBody?: unknown;
  createdAt: Date;
}

const IdempotencyKeySchema: Schema = new Schema({
  key: { type: String, required: true },
  endpoint: { type: String, required: true },
  requestHash: { type: String, required: true },
  status: { type: String, enum: ['processing', 'completed'], required: true },
  responseCode: { type: Number },
  responseBody: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // 24 hours TTL
});

IdempotencyKeySchema.index({ key: 1 }, { unique: true });

export default mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);
