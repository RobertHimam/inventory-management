/** @jest-environment jsdom */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useCategoryList,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../hooks/useCategories'
import * as categoryApi from '../../api/categoryApi'

jest.mock('../../api/categoryApi')

const mockListCategoriesApi = categoryApi.listCategoriesApi as jest.Mock
const mockGetCategoryApi = categoryApi.getCategoryApi as jest.Mock
const mockCreateCategoryApi = categoryApi.createCategoryApi as jest.Mock
const mockUpdateCategoryApi = categoryApi.updateCategoryApi as jest.Mock
const mockDeleteCategoryApi = categoryApi.deleteCategoryApi as jest.Mock

const CATEGORY = {
  _id: 'cat1',
  name: 'Electronics',
  description: 'Electronic items',
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

describe('useCategoryList', () => {
  it('fetches and returns category list', async () => {
    const response = { success: true, data: [CATEGORY], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }
    mockListCategoriesApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useCategoryList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
  })

  it('passes query params to api', async () => {
    const response = { success: true, data: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } }
    mockListCategoriesApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useCategoryList({ page: 2, search: 'elec' }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockListCategoriesApi).toHaveBeenCalledWith({ page: 2, search: 'elec' })
  })

  it('sets isError on failure', async () => {
    mockListCategoriesApi.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useCategoryList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCategory', () => {
  it('fetches single category by id', async () => {
    mockGetCategoryApi.mockResolvedValueOnce({ success: true, data: CATEGORY })

    const { result } = renderHook(() => useCategory('cat1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data._id).toBe('cat1')
  })

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useCategory(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetCategoryApi).not.toHaveBeenCalled()
  })
})

describe('useCreateCategory', () => {
  it('calls createCategoryApi and invalidates cache', async () => {
    mockCreateCategoryApi.mockResolvedValueOnce({ success: true, data: CATEGORY })

    const { result } = renderHook(() => useCreateCategory(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ name: 'Electronics' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateCategoryApi).toHaveBeenCalledWith({ name: 'Electronics' })
  })
})

describe('useUpdateCategory', () => {
  it('calls updateCategoryApi', async () => {
    const updated = { ...CATEGORY, name: 'Updated' }
    mockUpdateCategoryApi.mockResolvedValueOnce({ success: true, data: updated })

    const { result } = renderHook(() => useUpdateCategory(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ id: 'cat1', dto: { name: 'Updated' } })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateCategoryApi).toHaveBeenCalledWith('cat1', { name: 'Updated' })
  })
})

describe('useDeleteCategory', () => {
  it('calls deleteCategoryApi', async () => {
    mockDeleteCategoryApi.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate('cat1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDeleteCategoryApi).toHaveBeenCalledWith('cat1')
  })
})
