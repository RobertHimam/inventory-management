/** @jest-environment jsdom */

jest.mock('../../api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  setTokenGetter: jest.fn(),
  setOnUnauthorized: jest.fn(),
}))

import { apiClient } from '../../api/client'
import {
  listProductsApi,
  getProductApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
} from '../../api/productApi'

const mockGet = apiClient.get as jest.Mock
const mockPost = apiClient.post as jest.Mock
const mockPut = apiClient.put as jest.Mock
const mockDelete = apiClient.delete as jest.Mock

const PRODUCT = {
  _id: 'p1',
  name: 'Widget',
  sku: 'WGT-001',
  category: 'Electronics',
  price: 9.99,
  stockQuantity: 100,
  isActive: true,
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('listProductsApi', () => {
  it('calls GET /products without params', async () => {
    mockGet.mockResolvedValueOnce({
      data: { success: true, data: [PRODUCT], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
    })
    const result = await listProductsApi()
    expect(mockGet).toHaveBeenCalledWith('/products', { params: undefined })
    expect(result.data).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
  })

  it('calls GET /products with query params', async () => {
    mockGet.mockResolvedValueOnce({
      data: { success: true, data: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } },
    })
    await listProductsApi({ page: 2, search: 'widget' })
    expect(mockGet).toHaveBeenCalledWith('/products', { params: { page: 2, search: 'widget' } })
  })

  it('propagates error on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))
    await expect(listProductsApi()).rejects.toThrow('Network error')
  })
})

describe('getProductApi', () => {
  it('calls GET /products/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: PRODUCT } })
    const result = await getProductApi('p1')
    expect(mockGet).toHaveBeenCalledWith('/products/p1')
    expect(result.data._id).toBe('p1')
  })

  it('propagates error when product not found', async () => {
    mockGet.mockRejectedValueOnce(new Error('Not found'))
    await expect(getProductApi('missing')).rejects.toThrow('Not found')
  })
})

describe('createProductApi', () => {
  it('calls POST /products with Idempotency-Key header', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: PRODUCT } })
    const dto = { name: 'Widget', price: 9.99, sku: 'WGT-001', category: 'Electronics' }
    const result = await createProductApi(dto)
    expect(mockPost).toHaveBeenCalledWith('/products', dto, expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
    }))
    expect(result.data.name).toBe('Widget')
  })

  it('propagates error on failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Conflict'))
    await expect(createProductApi({ name: 'X', price: 1, sku: 'X', category: 'Y' })).rejects.toThrow('Conflict')
  })
})

describe('updateProductApi', () => {
  it('calls PUT /products/:id', async () => {
    mockPut.mockResolvedValueOnce({ data: { success: true, data: { ...PRODUCT, name: 'Updated' } } })
    const result = await updateProductApi('p1', { name: 'Updated' })
    expect(mockPut).toHaveBeenCalledWith('/products/p1', { name: 'Updated' })
    expect(result.data.name).toBe('Updated')
  })

  it('propagates error on failure', async () => {
    mockPut.mockRejectedValueOnce(new Error('Not found'))
    await expect(updateProductApi('missing', { name: 'X' })).rejects.toThrow('Not found')
  })
})

describe('deleteProductApi', () => {
  it('calls DELETE /products/:id', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} })
    await deleteProductApi('p1')
    expect(mockDelete).toHaveBeenCalledWith('/products/p1')
  })

  it('propagates error on failure', async () => {
    mockDelete.mockRejectedValueOnce(new Error('Not found'))
    await expect(deleteProductApi('missing')).rejects.toThrow('Not found')
  })
})
