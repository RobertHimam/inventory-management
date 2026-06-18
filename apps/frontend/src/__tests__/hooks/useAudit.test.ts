/** @jest-environment jsdom */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuditList } from '../../hooks/useAudit'
import * as auditApi from '../../api/auditApi'

jest.mock('../../api/auditApi')

const mockListAuditLogs = auditApi.listAuditLogsApi as jest.Mock

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockAuditLog = {
  id: 'a1',
  correlationId: 'corr-1',
  userId: 'u1',
  username: 'admin',
  role: 'ADMIN',
  action: 'CREATE',
  resourceType: 'product',
  resourceId: 'p1',
  createdAt: '2026-06-18T00:00:00.000Z',
}

describe('useAuditList', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns audit logs on success', async () => {
    const response = {
      success: true,
      data: [mockAuditLog],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    mockListAuditLogs.mockResolvedValueOnce(response)

    const { result } = renderHook(() => useAuditList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].id).toBe('a1')
  })

  it('passes query params to API', async () => {
    const response = {
      success: true,
      data: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    }
    mockListAuditLogs.mockResolvedValueOnce(response)

    const params = { page: 2, limit: 10, search: 'admin' }
    const { result } = renderHook(() => useAuditList(params), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockListAuditLogs).toHaveBeenCalledWith(params)
  })

  it('sets error state on failure', async () => {
    mockListAuditLogs.mockRejectedValueOnce(new Error('Forbidden'))

    const { result } = renderHook(() => useAuditList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
