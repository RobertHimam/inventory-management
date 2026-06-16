import mongoose, { Document, Schema } from 'mongoose';

export interface IStockTransaction extends Document {
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  createdBy: string;
  reason?: string;
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransactionSchema: Schema = new Schema(
  {
    productId: {
      type: String,
      required: [true, 'Product ID is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['IN', 'OUT', 'ADJUST'],
      required: [true, 'Transaction type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    createdBy: {
      type: String,
      required: [true, 'Created by user ID is required'],
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IStockTransaction>('StockTransaction', StockTransactionSchema);
