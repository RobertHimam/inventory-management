import mongoose, { Schema, Document } from 'mongoose';

export interface ISale extends Document {
  productId: string;
  productName?: string;
  quantity: number;
  price: number;
  totalAmount: number;
  soldBy?: string;
  createdAt: Date;
}

const SaleSchema = new Schema<ISale>({
  productId: { type: String, required: true },
  productName: { type: String },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  soldBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

SaleSchema.index({ createdAt: 1 });
SaleSchema.index({ productId: 1 });

export const SaleModel = mongoose.model<ISale>('Sale', SaleSchema);
