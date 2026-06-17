/** @jest-environment jsdom */

jest.mock('../../api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setTokenGetter: jest.fn(),
  setOnUnauthorized: jest.fn(),
}))

import { apiClient } from '../../api/client'
import {
  listInventoryApi,
  getInventoryItemApi,
  stockInApi,
  stockOutApi,
  stockAdjustApi,
} from '../../api/inventoryApi'

const mockGet = apiClient.get as jest.Mock
const mockPost = apiClient.post as jest.Mock

const ITEM = {
  productId: 'prod-1',
  productName: 'Widget A',
  sku: 'WGT-001',
  quantity: 50,
  reorderLevel: 10,
  updatedAt: new Date(),
}

const PAGINATION = { page: 1, limit: 10, total: 1, totalPages: 1 }

describe('listInventoryApi', () => {
  it('calls GET /inventory without params', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [ITEM], pagination: PAGINATION } })
    const result = await listInventoryApi()
    expect(mockGet).toHaveBeenCalledWith('/inventory', { params: undefined })
    expect(result.data).toHaveLength(1)
  })

  it('calls GET /inventory with query params', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [], pagination: PAGINATION } })
    await listInventoryApi({ page: 2, search: 'widget' })
    expect(mockGet).toHaveBeenCalledWith('/inventory', { params: { page: 2, search: 'widget' } })
  })

  it('propagates error on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))
    await expect(listInventoryApi()).rejects.toThrow('Network error')
  })
})

describe('getInventoryItemApi', () => {
  it('calls GET /inventory/:productId', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: ITEM } })
    const result = await getInventoryItemApi('prod-1')
    expect(mockGet).toHaveBeenCalledWith('/inventory/prod-1')
    expect(result.data.productId).toBe('prod-1')
  })

  it('propagates error when not found', async () => {
    mockGet.mockRejectedValueOnce(new Error('Not found'))
    await expect(getInventoryItemApi('missing')).rejects.toThrow('Not found')
  })
})

describe('stockInApi', () => {
  it('calls POST /inventory/stock-in with Idempotency-Key header', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: {} } })
    const dto = { productId: 'prod-1', quantity: 10 }
    await stockInApi(dto)
    expect(mockPost).toHaveBeenCalledWith('/inventory/stock-in', dto, expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
    }))
  })

  it('propagates error on failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Conflict'))
    await expect(stockInApi({ productId: 'p1', quantity: 5 })).rejects.toThrow('Conflict')
  })
})

describe('stockOutApi', () => {
  it('calls POST /inventory/stock-out with Idempotency-Key header', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: {} } })
    const dto = { productId: 'prod-1', quantity: 5 }
    await stockOutApi(dto)
    expect(mockPost).toHaveBeenCalledWith('/inventory/stock-out', dto, expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
    }))
  })

  it('propagates error on failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Insufficient stock'))
    await expect(stockOutApi({ productId: 'p1', quantity: 999 })).rejects.toThrow('Insufficient stock')
  })
})

describe('stockAdjustApi', () => {
  it('calls POST /inventory/adjust with Idempotency-Key header', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: {} } })
    const dto = { productId: 'prod-1', quantity: -5, reason: 'Damaged goods' }
    await stockAdjustApi(dto)
    expect(mockPost).toHaveBeenCalledWith('/inventory/adjust', dto, expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
    }))
  })

  it('accepts negative quantity for adjustment', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: {} } })
    const dto = { productId: 'prod-1', quantity: -10, reason: 'Loss' }
    await stockAdjustApi(dto)
    expect(mockPost).toHaveBeenCalledWith('/inventory/adjust', dto, expect.any(Object))
  })

  it('propagates error on failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Not found'))
    await expect(stockAdjustApi({ productId: 'x', quantity: 1, reason: 'test' })).rejects.toThrow('Not found')
  })
})
