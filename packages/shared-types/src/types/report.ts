export interface DashboardMetrics {
  totalProducts: number
  totalInventoryValue: number
  lowStockCount: number
}

export interface SaleRecord {
  productId: string
  productName: string
  quantity: number
  price: number
  totalAmount: number
  soldBy: string
  createdAt: string
}

export interface SalesReport {
  sales: SaleRecord[]
  totalSalesAmount: number
  totalQuantitySold: number
}

export interface InventoryValuationItem {
  productId: string
  name: string
  sku: string
  quantity: number
  cost: number
  price: number
  costValuation: number
  retailValuation: number
}

export interface InventoryValuationReport {
  valuations: InventoryValuationItem[]
  totalCostValuation: number
  totalRetailValuation: number
}

export interface LowStockItem {
  productId: string
  name: string
  sku: string
  quantity: number
  reorderLevel: number
}

export interface LowStockReport {
  lowStockItems: LowStockItem[]
}

export interface ReportApiResponse<T> {
  success: boolean
  data: T
  source: 'cache' | 'db'
}

export interface SalesQueryParams {
  startDate?: string
  endDate?: string
}
