/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../../../components/guards/AuthGuard'
import { Role } from '@inventory/shared-types'

const mockUseAuthStore = jest.fn()
const mockRefreshTokenApi = jest.fn()
const mockSetAuth = jest.fn()
const mockClearAuth = jest.fn()

jest.mock('../../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}))

jest.mock('../../../api/authApi', () => ({
  refreshTokenApi: () => mockRefreshTokenApi(),
}))

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  role: Role.USER,
}

function renderWithRouter(storeState: {
  user?: typeof mockUser | null
  isAuthenticated: boolean
  setAuth?: jest.Mock
  clearAuth?: jest.Mock
}) {
  const defaults = {
    user: null as typeof mockUser | null,
    isAuthenticated: false,
    setAuth: mockSetAuth,
    clearAuth: mockClearAuth,
  }
  mockUseAuthStore.mockReturnValue({ ...defaults, ...storeState })
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <AuthGuard>
              <div>Protected Content</div>
            </AuthGuard>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when authenticated', () => {
    renderWithRouter({ isAuthenticated: true })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated and no persisted user', () => {
    renderWithRouter({ user: null, isAuthenticated: false })
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows loading while attempting silent refresh', () => {
    mockRefreshTokenApi.mockReturnValue(new Promise(() => {})) // never resolves
    renderWithRouter({ user: mockUser, isAuthenticated: false })
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children after successful silent refresh', async () => {
    mockRefreshTokenApi.mockResolvedValue({ accessToken: 'new-token' })
    renderWithRouter({ user: mockUser, isAuthenticated: false })
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(mockUser, 'new-token')
    })
  })

  it('redirects to /login when silent refresh fails', async () => {
    mockRefreshTokenApi.mockRejectedValue(new Error('Refresh failed'))
    renderWithRouter({ user: mockUser, isAuthenticated: false })
    await waitFor(() => {
      expect(mockClearAuth).toHaveBeenCalled()
    })
  })

  it('does not attempt refresh when already authenticated', () => {
    renderWithRouter({ user: mockUser, isAuthenticated: true })
    expect(mockRefreshTokenApi).not.toHaveBeenCalled()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
