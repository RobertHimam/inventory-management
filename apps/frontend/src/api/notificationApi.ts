import { apiClient } from './client'
import type { NotificationListResponse, NotificationDetailResponse } from '@inventory/shared-types'

const BASE = '/notifications/api/v1/notifications'

export async function getNotificationsApi(): Promise<NotificationListResponse> {
  const { data } = await apiClient.get<NotificationListResponse>(BASE)
  return data
}

export async function markAsReadApi(id: string): Promise<NotificationDetailResponse> {
  const { data } = await apiClient.patch<NotificationDetailResponse>(`${BASE}/${id}/read`)
  return data
}
