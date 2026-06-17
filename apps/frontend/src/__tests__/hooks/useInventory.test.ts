/** @jest-environment jsdom */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useInventoryList,
  useInventoryItem,
  useStockIn,
  useStockOut,
  useStockAdjust,
} from '../../hooks/useInventory'
import * as inventoryApi from '../../api/inventoryApi'

jest.mock('../../api/inventoryApi')

const mockListInventoryApi = inventoryApi.listInventoryApi as jest.Mock
const mockGetInventoryItemApi = inventoryApi.getInventoryItemApi as jest.Mock
const mockStockInApi = inventoryApi.stockInApi as jest.Mock
const mockStockOutApi = inventoryApi.stockOutApi as jest.Mock
const mockStockAdjustApi = inventoryApi.stockAdjustApi as jest.Mock

const ITEM = {
  productId: 'prod-1',
  productName: 'Widget A',
  sku: 'WGT-001',
  quantity: 50,
  reorderLevel: 10,
  updatedAt: new Date(),
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useInventoryList', () => {
  it('fetches and returns inventory list', async () => {
    const response = { success: true, data: [ITEM], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }
    mockListInventoryApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useInventoryList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].productId).toBe('prod-1')
  })

  it('passes query params to api', async () => {
    const response = { success: true, data: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } }
    mockListInventoryApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useInventoryList({ page: 2, search: 'wgt' }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockListInventoryApi).toHaveBeenCalledWith({ page: 2, search: 'wgt' })
  })

  it('sets isError on failure', async () => {
    mockListInventoryApi.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useInventoryList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useInventoryItem', () => {
  it('fetches single inventory item by productId', async () => {
    mockGetInventoryItemApi.mockResolvedValueOnce({ success: true, data: ITEM })

    const { result } = renderHook(() => useInventoryItem('prod-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.productId).toBe('prod-1')
  })

  it('is disabled when productId is empty', () => {
    const { result } = renderHook(() => useInventoryItem(''), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useStockIn', () => {
  it('calls stockInApi and invalidates queries on success', async () => {
    mockStockInApi.mockResolvedValueOnce({ success: true, data: {} })

    const { result } = renderHook(() => useStockIn(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ productId: 'prod-1', quantity: 10 })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockStockInApi).toHaveBeenCalledWith({ productId: 'prod-1', quantity: 10 })
  })

  it('sets isError on failure', async () => {
    mockStockInApi.mockRejectedValueOnce(new Error('Conflict'))

    const { result } = renderHook(() => useStockIn(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ productId: 'x', quantity: 5 })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useStockOut', () => {
  it('calls stockOutApi and invalidates queries on success', async () => {
    mockStockOutApi.mockResolvedValueOnce({ success: true, data: {} })

    const { result } = renderHook(() => useStockOut(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ productId: 'prod-1', quantity: 5 })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockStockOutApi).toHaveBeenCalledWith({ productId: 'prod-1', quantity: 5 })
  })
})

describe('useStockAdjust', () => {
  it('calls stockAdjustApi and invalidates queries on success', async () => {
    mockStockAdjustApi.mockResolvedValueOnce({ success: true, data: {} })

    const { result } = renderHook(() => useStockAdjust(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ productId: 'prod-1', quantity: -5, reason: 'Damaged' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockStockAdjustApi).toHaveBeenCalledWith({ productId: 'prod-1', quantity: -5, reason: 'Damaged' })
  })
})
