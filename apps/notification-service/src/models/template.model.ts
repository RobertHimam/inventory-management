import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate extends Document {
  key: string;
  subject: string;
  body: string;
}

const TemplateSchema = new Schema<ITemplate>({
  key: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
});

export const TemplateModel = mongoose.model<ITemplate>('Template', TemplateSchema);
