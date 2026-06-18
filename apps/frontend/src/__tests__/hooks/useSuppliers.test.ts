/** @jest-environment jsdom */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useSupplierList,
  useSupplier,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '../../hooks/useSuppliers'
import * as supplierApi from '../../api/supplierApi'

jest.mock('../../api/supplierApi')

const mockListSuppliersApi = supplierApi.listSuppliersApi as jest.Mock
const mockGetSupplierApi = supplierApi.getSupplierApi as jest.Mock
const mockCreateSupplierApi = supplierApi.createSupplierApi as jest.Mock
const mockUpdateSupplierApi = supplierApi.updateSupplierApi as jest.Mock
const mockDeleteSupplierApi = supplierApi.deleteSupplierApi as jest.Mock

const SUPPLIER = {
  _id: 'sup1',
  name: 'Acme Corp',
  contactEmail: 'contact@acme.com',
  phone: '555-1234',
  address: '123 Main St',
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

describe('useSupplierList', () => {
  it('fetches and returns supplier list', async () => {
    const response = { success: true, data: [SUPPLIER], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }
    mockListSuppliersApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useSupplierList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
  })

  it('passes query params to api', async () => {
    const response = { success: true, data: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } }
    mockListSuppliersApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useSupplierList({ page: 2, search: 'acme' }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockListSuppliersApi).toHaveBeenCalledWith({ page: 2, search: 'acme' })
  })

  it('sets isError on failure', async () => {
    mockListSuppliersApi.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useSupplierList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useSupplier', () => {
  it('fetches single supplier by id', async () => {
    mockGetSupplierApi.mockResolvedValueOnce({ success: true, data: SUPPLIER })

    const { result } = renderHook(() => useSupplier('sup1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data._id).toBe('sup1')
  })

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useSupplier(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetSupplierApi).not.toHaveBeenCalled()
  })
})

describe('useCreateSupplier', () => {
  it('calls createSupplierApi', async () => {
    mockCreateSupplierApi.mockResolvedValueOnce({ success: true, data: SUPPLIER })

    const { result } = renderHook(() => useCreateSupplier(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ name: 'Acme Corp' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateSupplierApi).toHaveBeenCalledWith({ name: 'Acme Corp' })
  })
})

describe('useUpdateSupplier', () => {
  it('calls updateSupplierApi', async () => {
    const updated = { ...SUPPLIER, name: 'Updated' }
    mockUpdateSupplierApi.mockResolvedValueOnce({ success: true, data: updated })

    const { result } = renderHook(() => useUpdateSupplier(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ id: 'sup1', dto: { name: 'Updated' } })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateSupplierApi).toHaveBeenCalledWith('sup1', { name: 'Updated' })
  })
})

describe('useDeleteSupplier', () => {
  it('calls deleteSupplierApi', async () => {
    mockDeleteSupplierApi.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteSupplier(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate('sup1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDeleteSupplierApi).toHaveBeenCalledWith('sup1')
  })
})
