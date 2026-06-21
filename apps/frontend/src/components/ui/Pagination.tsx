import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total?: number
  onPrev: () => void
  onNext: () => void
}

export function Pagination({ page, totalPages, total, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1 && total === undefined) return null

  return (
    <div className="flex items-center justify-between pt-4 pb-1">
      <p className="text-sm text-slate-500">
        {total !== undefined ? `${total} item${total !== 1 ? 's' : ''}` : ''}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          aria-label="Previous page"
          className="btn-secondary !px-2.5 !py-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-slate-600 min-w-[4rem] text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="btn-secondary !px-2.5 !py-2"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
