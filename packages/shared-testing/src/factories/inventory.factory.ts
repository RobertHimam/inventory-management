export interface InventoryItemData {
  productId: string;
  quantity: number;
}

export interface InventoryItem {
  productId: string;
  quantity: number;
  updatedAt: Date;
}

export const createInventoryItem = (data: InventoryItemData): InventoryItem => ({
  productId: data.productId,
  quantity: data.quantity,
  updatedAt: new Date(),
});

export interface StockInData {
  productId: string;
  quantity: number;
  createdBy: string;
}

export interface StockIn {
  id: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  createdBy: string;
}

export const createStockIn = (data: StockInData): StockIn => ({
  id: 'si-' + Math.random().toString(36).substr(2, 9),
  productId: data.productId,
  quantity: data.quantity,
  createdAt: new Date(),
  createdBy: data.createdBy,
});

export interface StockOutData {
  productId: string;
  quantity: number;
  createdBy: string;
}

export interface StockOut {
  id: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  createdBy: string;
}

export const createStockOut = (data: StockOutData): StockOut => ({
  id: 'so-' + Math.random().toString(36).substr(2, 9),
  productId: data.productId,
  quantity: data.quantity,
  createdAt: new Date(),
  createdBy: data.createdBy,
});

export interface StockAdjustmentData {
  productId: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  adjustedBy: string;
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

export const createStockAdjustment = (data: StockAdjustmentData): StockAdjustment => ({
  id: 'adj-' + Math.random().toString(36).substr(2, 9),
  productId: data.productId,
  quantity: data.quantity,
  previousQuantity: data.previousQuantity,
  newQuantity: data.newQuantity,
  reason: data.reason,
  adjustedBy: data.adjustedBy,
  createdAt: new Date(),
});
