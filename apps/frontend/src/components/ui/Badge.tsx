type Variant = 'success' | 'danger' | 'warning' | 'info' | 'default' | 'admin' | 'user'

const VARIANTS: Record<Variant, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
  default: 'bg-slate-100 text-slate-600',
  admin: 'bg-primary-100 text-primary-700',
  user: 'bg-slate-100 text-slate-600',
}

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
