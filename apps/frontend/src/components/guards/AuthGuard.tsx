import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { refreshTokenApi } from '../../api/authApi'
import type { ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const needsSilentRefresh = !isAuthenticated && user !== null
  const [isInitializing, setIsInitializing] = useState(needsSilentRefresh)

  useEffect(() => {
    if (!needsSilentRefresh) return
    refreshTokenApi()
      .then(({ accessToken }) => {
        setAuth(user!, accessToken)
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => {
        setIsInitializing(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isInitializing) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
