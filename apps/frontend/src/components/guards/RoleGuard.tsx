import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { ReactNode } from 'react'
import type { Role } from '@inventory/shared-types'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Role[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user } = useAuthStore()
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}
