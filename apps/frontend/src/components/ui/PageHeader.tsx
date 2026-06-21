import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  children?: ReactNode
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  )
}
