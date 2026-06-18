/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useDashboardMetrics,
  useSalesReport,
  useInventoryValuation,
  useLowStockReport,
} from '../../hooks/useReports'
import * as reportApi from '../../api/reportApi'

jest.mock('../../api/reportApi')

const mockGetDashboardMetricsApi = reportApi.getDashboardMetricsApi as jest.Mock
const mockGetSalesReportApi = reportApi.getSalesReportApi as jest.Mock
const mockGetInventoryValuationApi = reportApi.getInventoryValuationApi as jest.Mock
const mockGetLowStockReportApi = reportApi.getLowStockReportApi as jest.Mock

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDashboardMetrics', () => {
  it('fetches and returns dashboard metrics', async () => {
    const response = { success: true, data: { totalProducts: 10, totalInventoryValue: 5000, lowStockCount: 2 }, source: 'db' as const }
    mockGetDashboardMetricsApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useDashboardMetrics(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.totalProducts).toBe(10)
  })
})

describe('useSalesReport', () => {
  it('fetches sales report without params', async () => {
    const response = { success: true, data: { sales: [], totalSalesAmount: 0, totalQuantitySold: 0 }, source: 'db' as const }
    mockGetSalesReportApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useSalesReport(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.sales).toHaveLength(0)
  })

  it('passes date params to API', async () => {
    const params = { startDate: '2024-01-01T00:00:00.000Z', endDate: '2024-01-31T23:59:59.000Z' }
    const response = { success: true, data: { sales: [], totalSalesAmount: 0, totalQuantitySold: 0 }, source: 'db' as const }
    mockGetSalesReportApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useSalesReport(params), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetSalesReportApi).toHaveBeenCalledWith(params)
  })
})

describe('useInventoryValuation', () => {
  it('fetches inventory valuation report', async () => {
    const response = {
      success: true,
      data: { valuations: [{ productId: 'p1', name: 'Widget', sku: 'W1', quantity: 10, cost: 5, price: 10, costValuation: 50, retailValuation: 100 }], totalCostValuation: 50, totalRetailValuation: 100 },
      source: 'db' as const,
    }
    mockGetInventoryValuationApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useInventoryValuation(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.valuations).toHaveLength(1)
  })
})

describe('useLowStockReport', () => {
  it('fetches low stock report', async () => {
    const response = {
      success: true,
      data: { lowStockItems: [{ productId: 'p2', name: 'Gadget', sku: 'G1', quantity: 2, reorderLevel: 10 }] },
      source: 'db' as const,
    }
    mockGetLowStockReportApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useLowStockReport(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.lowStockItems).toHaveLength(1)
  })
})
