import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  productId: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
  reorderLevel: number;
  deletedAt?: Date | null;
}

const ProductSchema = new Schema<IProduct>(
  {
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProductSchema.index({ deletedAt: 1 });

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);
