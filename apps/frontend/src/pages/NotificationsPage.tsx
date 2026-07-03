import { useQueryClient } from '@tanstack/react-query'
import { useNotificationList, useMarkAsRead, NOTIFICATION_KEYS } from '../hooks/useNotifications'
import { useSSE } from '../hooks/useSSE'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useNotificationList()
  const markAsRead = useMarkAsRead()

  // A stock movement / low-stock event is what produces a notification, so refetch
  // the list on any of them (plus explicit notification events if ever published).
  const refetchNotifications = () =>
    void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list() })

  useSSE({
    onNotification: refetchNotifications,
    onStockIn: refetchNotifications,
    onStockOut: refetchNotifications,
    onLowStock: refetchNotifications,
  })

  const notifications = data?.data ?? []
  const unreadCount = notifications.filter((n) => !n.read).length

  if (isLoading) {
    return <div className="mx-auto w-full max-w-3xl px-4 py-6 text-slate-500 sm:px-6">Loading...</div>
  }
  if (isError) {
    return <div className="mx-auto w-full max-w-3xl px-4 py-6 text-red-600 sm:px-6">Failed to load notifications.</div>
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <PageHeader title="Notifications">
        {unreadCount > 0 && <Badge variant="danger">{unreadCount}</Badge>}
      </PageHeader>

      {notifications.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">No notifications.</Card>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n._id}>
              <Card className={`p-4 ${n.read ? '' : 'border-accent-200 bg-accent-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{n.subject}</p>
                    <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      <Badge variant="info">{n.type}</Badge>
                      <Badge variant="default">{n.status}</Badge>
                    </div>
                  </div>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead.mutate(n._id)}
                      disabled={markAsRead.isPending}
                      className="shrink-0 text-accent-600 hover:text-accent-700"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
