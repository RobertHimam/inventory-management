import { useQuery } from '@tanstack/react-query'
import {
  getDashboardMetricsApi,
  getSalesReportApi,
  getInventoryValuationApi,
  getLowStockReportApi,
} from '../api/reportApi'
import type { SalesQueryParams } from '@inventory/shared-types'

export const REPORT_KEYS = {
  all: ['reports'] as const,
  dashboard: () => ['reports', 'dashboard'] as const,
  sales: (params?: SalesQueryParams) => ['reports', 'sales', params] as const,
  inventoryValuation: () => ['reports', 'inventory-valuation'] as const,
  lowStock: () => ['reports', 'low-stock'] as const,
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: REPORT_KEYS.dashboard(),
    queryFn: getDashboardMetricsApi,
  })
}

export function useSalesReport(params?: SalesQueryParams) {
  return useQuery({
    queryKey: REPORT_KEYS.sales(params),
    queryFn: () => getSalesReportApi(params),
  })
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: REPORT_KEYS.inventoryValuation(),
    queryFn: getInventoryValuationApi,
  })
}

export function useLowStockReport() {
  return useQuery({
    queryKey: REPORT_KEYS.lowStock(),
    queryFn: getLowStockReportApi,
  })
}
