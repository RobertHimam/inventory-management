import { Product } from '@inventory/shared-types';

export interface ProductCreatedPayload {
  product: Product;
}

export interface ProductUpdatedPayload {
  product: Product;
  changes: Partial<Product>;
  previous: Product;
}

export interface ProductDeletedPayload {
  productId: string;
}

export interface StockInPayload {
  productId: string;
  quantity: number;
  userId: string;
  createdAt: Date;
}

export interface StockOutPayload {
  productId: string;
  quantity: number;
  userId: string;
  createdAt: Date;
}

export interface StockAdjustedPayload {
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  adjustedBy: string;
  createdAt: Date;
}

export interface LowStockAlertPayload {
  productId: string;
  currentQuantity: number;
  reorderLevel: number;
  timestamp: Date;
}
