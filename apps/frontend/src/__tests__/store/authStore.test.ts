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

  it('never stores token in localStorage or sessionStorage', () => {
    useAuthStore.getState().setAuth(mockUser, 'secret-token')
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(JSON.stringify(localStorage)).not.toContain('secret-token')
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
