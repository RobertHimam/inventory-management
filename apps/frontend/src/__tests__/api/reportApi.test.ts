import * as client from '../../api/client'
import {
  getDashboardMetricsApi,
  getSalesReportApi,
  getInventoryValuationApi,
  getLowStockReportApi,
} from '../../api/reportApi'

jest.mock('../../api/client')

const mockGet = jest.fn()

;(client as unknown as Record<string, unknown>).apiClient = {
  get: mockGet,
}

describe('getDashboardMetricsApi', () => {
  it('calls GET /reports/dashboard and returns data', async () => {
    const response = { data: { success: true, data: { totalProducts: 5, totalInventoryValue: 1000, lowStockCount: 1 }, source: 'db' } }
    mockGet.mockResolvedValueOnce(response)

    const result = await getDashboardMetricsApi()

    expect(mockGet).toHaveBeenCalledWith('/reports/dashboard')
    expect(result.data.totalProducts).toBe(5)
  })
})

describe('getSalesReportApi', () => {
  it('calls GET /reports/sales without params', async () => {
    const response = { data: { success: true, data: { sales: [], totalSalesAmount: 0, totalQuantitySold: 0 }, source: 'db' } }
    mockGet.mockResolvedValueOnce(response)

    const result = await getSalesReportApi()

    expect(mockGet).toHaveBeenCalledWith('/reports/sales', { params: undefined })
    expect(result.data.sales).toHaveLength(0)
  })

  it('calls GET /reports/sales with date params', async () => {
    const response = { data: { success: true, data: { sales: [], totalSalesAmount: 0, totalQuantitySold: 0 }, source: 'db' } }
    mockGet.mockResolvedValueOnce(response)

    await getSalesReportApi({ startDate: '2024-01-01T00:00:00.000Z', endDate: '2024-01-31T23:59:59.000Z' })

    expect(mockGet).toHaveBeenCalledWith('/reports/sales', {
      params: { startDate: '2024-01-01T00:00:00.000Z', endDate: '2024-01-31T23:59:59.000Z' },
    })
  })
})

describe('getInventoryValuationApi', () => {
  it('calls GET /reports/inventory-valuation and returns data', async () => {
    const response = { data: { success: true, data: { valuations: [], totalCostValuation: 0, totalRetailValuation: 0 }, source: 'db' } }
    mockGet.mockResolvedValueOnce(response)

    const result = await getInventoryValuationApi()

    expect(mockGet).toHaveBeenCalledWith('/reports/inventory-valuation')
    expect(result.data.valuations).toHaveLength(0)
  })
})

describe('getLowStockReportApi', () => {
  it('calls GET /reports/low-stock and returns data', async () => {
    const response = { data: { success: true, data: { lowStockItems: [] }, source: 'db' } }
    mockGet.mockResolvedValueOnce(response)

    const result = await getLowStockReportApi()

    expect(mockGet).toHaveBeenCalledWith('/reports/low-stock')
    expect(result.data.lowStockItems).toHaveLength(0)
  })
})
