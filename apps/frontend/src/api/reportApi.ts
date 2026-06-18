import { apiClient } from './client'
import type {
  ReportApiResponse,
  DashboardMetrics,
  SalesReport,
  InventoryValuationReport,
  LowStockReport,
  SalesQueryParams,
} from '@inventory/shared-types'

export async function getDashboardMetricsApi(): Promise<ReportApiResponse<DashboardMetrics>> {
  const { data } = await apiClient.get<ReportApiResponse<DashboardMetrics>>('/reports/dashboard')
  return data
}

export async function getSalesReportApi(params?: SalesQueryParams): Promise<ReportApiResponse<SalesReport>> {
  const { data } = await apiClient.get<ReportApiResponse<SalesReport>>('/reports/sales', { params })
  return data
}

export async function getInventoryValuationApi(): Promise<ReportApiResponse<InventoryValuationReport>> {
  const { data } = await apiClient.get<ReportApiResponse<InventoryValuationReport>>('/reports/inventory-valuation')
  return data
}

export async function getLowStockReportApi(): Promise<ReportApiResponse<LowStockReport>> {
  const { data } = await apiClient.get<ReportApiResponse<LowStockReport>>('/reports/low-stock')
  return data
}
