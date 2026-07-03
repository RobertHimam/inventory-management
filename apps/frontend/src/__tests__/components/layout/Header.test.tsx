/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../../../components/layout/Header'
import { useAuthStore } from '../../../store/authStore'
import { Role } from '@inventory/shared-types'
import type { AuthUser } from '@inventory/shared-types'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../../api/authApi', () => ({
  logoutApi: jest.fn().mockResolvedValue(undefined),
}))

const user: AuthUser = { id: '1', email: 'admin@test.com', username: 'adminuser', role: Role.ADMIN }

describe('Header', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(user, 'token')
    mockNavigate.mockClear()
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  function renderHeader() {
    return render(
      <MemoryRouter>
        <Header onMenuToggle={jest.fn()} />
      </MemoryRouter>
    )
  }

  it('displays current username', () => {
    renderHeader()
    expect(screen.getByText('adminuser')).toBeInTheDocument()
  })

  it('displays current user role', () => {
    renderHeader()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  it('exposes a Sign out action inside the user menu', () => {
    renderHeader()
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }))
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('logout clears auth state and navigates to /login', async () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }))
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})
