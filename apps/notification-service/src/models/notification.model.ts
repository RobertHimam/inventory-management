import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId?: string | null;
  type: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  read: boolean;
  attempts: number;
  error?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: String, default: null },
  type: { type: String, required: true },
  recipient: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' },
  read: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
