/** @jest-environment jsdom */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useUserList,
  useUser,
  useCreateManagedUser,
  useDeleteManagedUser,
} from '../../hooks/useUserManagement'
import * as userManagementApi from '../../api/userManagementApi'
import { Role } from '@inventory/shared-types'

jest.mock('../../api/userManagementApi')

const mockListUsersApi = userManagementApi.listUsersApi as jest.Mock
const mockGetUserApi = userManagementApi.getUserApi as jest.Mock
const mockCreateManagedUserApi = userManagementApi.createManagedUserApi as jest.Mock
const mockDeleteManagedUserApi = userManagementApi.deleteManagedUserApi as jest.Mock

const USER = {
  id: 'user1',
  username: 'johndoe',
  email: 'john@example.com',
  role: Role.USER,
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

describe('useUserList', () => {
  it('fetches and returns user list', async () => {
    const response = { success: true, data: [USER], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }
    mockListUsersApi.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useUserList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
  })

  it('sets isError on failure', async () => {
    mockListUsersApi.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useUserList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useUser', () => {
  it('fetches single user by id', async () => {
    mockGetUserApi.mockResolvedValueOnce({ success: true, data: USER })

    const { result } = renderHook(() => useUser('user1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.id).toBe('user1')
  })

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useUser(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetUserApi).not.toHaveBeenCalled()
  })
})

describe('useCreateManagedUser', () => {
  it('calls createManagedUserApi', async () => {
    mockCreateManagedUserApi.mockResolvedValueOnce({ success: true, data: USER })

    const { result } = renderHook(() => useCreateManagedUser(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ username: 'johndoe', email: 'john@example.com', password: 'secret123', role: Role.USER })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateManagedUserApi).toHaveBeenCalledWith({ username: 'johndoe', email: 'john@example.com', password: 'secret123', role: Role.USER })
  })
})

describe('useDeleteManagedUser', () => {
  it('calls deleteManagedUserApi', async () => {
    mockDeleteManagedUserApi.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteManagedUser(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate('user1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDeleteManagedUserApi).toHaveBeenCalledWith('user1')
  })
})
