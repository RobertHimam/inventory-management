/** @jest-environment jsdom */
import { useAuthStore } from '../../store/authStore'
import { Role } from '@inventory/shared-types'

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  role: Role.USER,
}

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('starts unauthenticated with no user or token', () => {
    const { user, accessToken, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('setAuth stores user and token in memory, sets isAuthenticated true', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-token-123')
    const { user, accessToken, isAuthenticated } = useAuthStore.getState()
    expect(user).toEqual(mockUser)
    expect(accessToken).toBe('access-token-123')
    expect(isAuthenticated).toBe(true)
  })

  it('clearAuth resets state to unauthenticated', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-token-123')
    useAuthStore.getState().clearAuth()
    const { user, accessToken, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('persists user to localStorage after setAuth', () => {
    useAuthStore.getState().setAuth(mockUser, 'secret-token')
    const stored = localStorage.getItem('auth-storage')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.user).toEqual(mockUser)
  })

  it('does not persist accessToken to localStorage', () => {
    useAuthStore.getState().setAuth(mockUser, 'secret-token')
    const stored = localStorage.getItem('auth-storage')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.accessToken).toBeUndefined()
    expect(JSON.stringify(parsed)).not.toContain('secret-token')
  })

  it('clears user from localStorage after clearAuth', () => {
    useAuthStore.getState().setAuth(mockUser, 'secret-token')
    useAuthStore.getState().clearAuth()
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed.state?.user).toBeNull()
    }
  })

  it('setAuth replaces previous auth state', () => {
    const adminUser = { ...mockUser, id: 'admin-1', role: Role.ADMIN }
    useAuthStore.getState().setAuth(mockUser, 'token-1')
    useAuthStore.getState().setAuth(adminUser, 'token-2')
    const { user, accessToken } = useAuthStore.getState()
    expect(user?.id).toBe('admin-1')
    expect(accessToken).toBe('token-2')
  })
})
