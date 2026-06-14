export interface InventoryItem {
  productId: string;
  quantity: number;
  updatedAt: Date;
}

export interface StockIn {
  id: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  createdBy: string;
}

export interface StockOut {
  id: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  createdBy: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  adjustedBy: string;
  createdAt: Date;
}
