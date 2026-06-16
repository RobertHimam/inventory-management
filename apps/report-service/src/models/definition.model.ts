import mongoose, { Schema, Document } from 'mongoose';

export interface IReportDefinition extends Document {
  key: string;
  name: string;
  description?: string;
  roles: string[];
}

const ReportDefinitionSchema = new Schema<IReportDefinition>({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  roles: { type: [String], default: ['ADMIN'] },
});

ReportDefinitionSchema.index({ key: 1 });

export const ReportDefinitionModel = mongoose.model<IReportDefinition>(
  'ReportDefinition',
  ReportDefinitionSchema
);
