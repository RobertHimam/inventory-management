import mongoose, { Document, Schema } from 'mongoose';
import { Role, AuditAction } from '@inventory/shared-types';

export interface IAuditLog extends Document {
  correlationId: string;
  userId: string;
  username: string;
  role: Role;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    correlationId: {
      type: String,
      required: [true, 'Correlation ID is required'],
      trim: true,
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: Object.values(Role),
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: Object.values(AuditAction),
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      trim: true,
    },
    resourceId: {
      type: String,
      required: [true, 'Resource ID is required'],
      trim: true,
    },
    before: {
      type: Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
