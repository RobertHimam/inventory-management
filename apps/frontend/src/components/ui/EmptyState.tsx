import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  description?: string
  colSpan?: number
}

export function EmptyState({ message = 'No items found', description, colSpan }: EmptyStateProps) {
  const inner = (
    <div className="py-12 flex flex-col items-center text-center gap-2">
      <Inbox className="w-8 h-8 text-slate-300" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
      {description && <p className="text-xs text-slate-400">{description}</p>}
    </div>
  )

  if (colSpan !== undefined) {
    return (
      <tr>
        <td colSpan={colSpan}>{inner}</td>
      </tr>
    )
  }

  return inner
}
