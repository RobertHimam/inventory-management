import { InventoryItem, StockIn, StockOut, StockAdjustment } from '@inventory/shared-types';

export interface FindAllInventoryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FindAllInventoryResult {
  data: unknown[];
  total: number;
}

export interface IInventoryRepository {
  findItemByProductId(productId: string): Promise<(InventoryItem & { reorderLevel?: number; productName?: string; sku?: string }) | null>;
  upsertItem(productId: string, quantityChange: number): Promise<InventoryItem & { reorderLevel?: number; productName?: string; sku?: string }>;
  findAll(options: FindAllInventoryOptions): Promise<FindAllInventoryResult>;
  createStockInTransaction(data: {
    productId: string;
    quantity: number;
    createdBy: string;
  }): Promise<StockIn>;
  createStockOutTransaction(data: {
    productId: string;
    quantity: number;
    createdBy: string;
  }): Promise<StockOut>;
  syncProductInfo(productId: string, productName: string, sku: string, initialQuantity?: number, reorderLevel?: number): Promise<void>;
  createStockAdjustmentTransaction(data: {
    productId: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string;
    adjustedBy: string;
  }): Promise<StockAdjustment>;
}
