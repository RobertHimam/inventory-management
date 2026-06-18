import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotificationsApi, markAsReadApi } from '../api/notificationApi'

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: () => [...NOTIFICATION_KEYS.all, 'list'] as const,
}

export function useNotificationList() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(),
    queryFn: getNotificationsApi,
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markAsReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list() })
    },
  })
}
