import mongoose, { Schema, Document } from 'mongoose';

export interface IReportCache extends Document {
  key: string;
  data: any;
  createdAt: Date;
}

const ReportCacheSchema = new Schema<IReportCache>({
  key: { type: String, required: true, unique: true },
  data: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // 5 minutes TTL in MongoDB
});

export const ReportCacheModel = mongoose.model<IReportCache>('ReportCache', ReportCacheSchema);
