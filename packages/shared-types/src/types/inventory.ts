export interface InventoryItem {
  productId: string;
  quantity: number;
  reorderLevel?: number;
  productName?: string;
  sku?: string;
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

export interface StockInDto {
  productId: string;
  quantity: number;
}

export interface StockOutDto {
  productId: string;
  quantity: number;
}

export interface StockAdjustmentDto {
  productId: string;
  quantity: number;
  reason: string;
}

export interface InventoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface InventoryListResponse {
  success: boolean;
  data: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryDetailResponse {
  success: boolean;
  data: InventoryItem;
}

export interface StockTransactionResponse {
  success: boolean;
  data: StockIn | StockOut | StockAdjustment;
}
