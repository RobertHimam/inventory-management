/** @jest-environment jsdom */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNotificationList, useMarkAsRead } from '../../hooks/useNotifications'
import * as notificationApi from '../../api/notificationApi'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

jest.mock('../../api/notificationApi')

const mockGetNotifications = notificationApi.getNotificationsApi as jest.Mock
const mockMarkAsRead = notificationApi.markAsReadApi as jest.Mock

const mockNotification = {
  _id: 'n1',
  userId: 'u1',
  type: 'LOW_STOCK',
  recipient: 'user@example.com',
  subject: 'Low stock alert',
  body: 'Product X is low.',
  status: 'SENT',
  read: false,
  attempts: 1,
  createdAt: '2026-06-18T00:00:00.000Z',
}

describe('useNotificationList', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns notification list on success', async () => {
    mockGetNotifications.mockResolvedValueOnce({ success: true, data: [mockNotification] })

    const { result } = renderHook(() => useNotificationList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0]._id).toBe('n1')
  })

  it('sets error state on failure', async () => {
    mockGetNotifications.mockRejectedValueOnce(new Error('API error'))

    const { result } = renderHook(() => useNotificationList(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useMarkAsRead', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls markAsReadApi with notification id', async () => {
    mockGetNotifications.mockResolvedValue({ success: true, data: [] })
    mockMarkAsRead.mockResolvedValueOnce({ success: true, data: { ...mockNotification, read: true } })

    const { result } = renderHook(() => useMarkAsRead(), { wrapper: createWrapper() })

    result.current.mutate('n1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockMarkAsRead).toHaveBeenCalledWith('n1')
  })
})
