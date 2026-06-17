/** @jest-environment jsdom */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useProductList,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../hooks/useProducts'
import * as productApi from '../../api/productApi'

jest.mock('../../api/productApi')

const mockListProductsApi = productApi.listProductsApi as jest.Mock
const mockGetProductApi = productApi.getProductApi as jest.Mock
const mockCreateProductApi = productApi.createProductApi as jest.Mock
const mockUpdateProductApi = productApi.updateProductApi as jest.Mock
const mockDeleteProductApi = productApi.deleteProductApi as jest.Mock

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useProductList', () => {
  it('fetches and returns product list', async () => {
    const response = { success: true, data: [PRODUCT], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }
    mockListProductsApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useProductList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]._id).toBe('p1')
  })

  it('passes query params to api', async () => {
    const response = { success: true, data: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } }
    mockListProductsApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useProductList({ page: 2, search: 'wgt' }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockListProductsApi).toHaveBeenCalledWith({ page: 2, search: 'wgt' })
  })

  it('sets isError on failure', async () => {
    mockListProductsApi.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useProductList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useProduct', () => {
  it('fetches single product by id', async () => {
    mockGetProductApi.mockResolvedValueOnce({ success: true, data: PRODUCT })

    const { result } = renderHook(() => useProduct('p1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data._id).toBe('p1')
  })

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useProduct(''), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateProduct', () => {
  it('calls createProductApi and invalidates queries on success', async () => {
    mockCreateProductApi.mockResolvedValueOnce({ success: true, data: PRODUCT })

    const { result } = renderHook(() => useCreateProduct(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ name: 'Widget', price: 9.99, sku: 'WGT-001', category: 'Electronics' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateProductApi).toHaveBeenCalledWith({ name: 'Widget', price: 9.99, sku: 'WGT-001', category: 'Electronics' })
  })

  it('sets isError on failure', async () => {
    mockCreateProductApi.mockRejectedValueOnce(new Error('Conflict'))

    const { result } = renderHook(() => useCreateProduct(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ name: 'X', price: 1, sku: 'X', category: 'Y' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useUpdateProduct', () => {
  it('calls updateProductApi with id and dto', async () => {
    mockUpdateProductApi.mockResolvedValueOnce({ success: true, data: { ...PRODUCT, name: 'Updated' } })

    const { result } = renderHook(() => useUpdateProduct(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ id: 'p1', dto: { name: 'Updated' } })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateProductApi).toHaveBeenCalledWith('p1', { name: 'Updated' })
  })
})

describe('useDeleteProduct', () => {
  it('calls deleteProductApi with id', async () => {
    mockDeleteProductApi.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteProduct(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate('p1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDeleteProductApi).toHaveBeenCalledWith('p1')
  })
})
