import { useQueryClient } from '@tanstack/react-query'
import { useNotificationList, useMarkAsRead, NOTIFICATION_KEYS } from '../hooks/useNotifications'
import { useSSE } from '../hooks/useSSE'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useNotificationList()
  const markAsRead = useMarkAsRead()

  useSSE({
    onNotification: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list() })
    },
  })

  const notifications = data?.data ?? []
  const unreadCount = notifications.filter((n) => !n.read).length

  if (isLoading) return <div className="p-4 sm:p-6">Loading...</div>
  if (isError) return <div className="p-4 sm:p-6 text-red-600">Failed to load notifications.</div>

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={`p-4 rounded-lg border ${n.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{n.subject}</p>
                  <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(n.createdAt).toLocaleString()} · {n.type} · {n.status}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead.mutate(n._id)}
                    disabled={markAsRead.isPending}
                    className="shrink-0 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
