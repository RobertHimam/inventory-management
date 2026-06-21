/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as authApi from '../../api/authApi'
import LoginPage from '../../pages/LoginPage'
import { useAuthStore } from '../../store/authStore'

jest.mock('../../api/authApi')

const mockLoginApi = authApi.loginApi as jest.Mock

const mockUser = { id: 'u1', username: 'admin', email: 'admin@example.com', role: 'ADMIN' as const }

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

afterEach(() => {
  useAuthStore.getState().clearAuth()
  jest.clearAllMocks()
})

describe('LoginPage + authApi integration', () => {
  it('renders login form', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    renderLoginPage()
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'not-valid')
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('calls loginApi and sets auth store on success', async () => {
    mockLoginApi.mockResolvedValueOnce({ user: mockUser, accessToken: 'access-token-123' })
    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true))
    expect(useAuthStore.getState().accessToken).toBe('access-token-123')
    expect(useAuthStore.getState().user?.username).toBe('admin')
  })

  it('shows server error message from API on 401', async () => {
    const axiosError = Object.assign(new Error('Unauthorized'), {
      isAxiosError: true,
      response: { data: { error: 'Invalid credentials' }, status: 401 },
    })
    mockLoginApi.mockRejectedValueOnce(axiosError)

    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('shows generic error when API returns no error message', async () => {
    const axiosError = Object.assign(new Error('Server Error'), {
      isAxiosError: true,
      response: { data: {}, status: 500 },
    })
    mockLoginApi.mockRejectedValueOnce(axiosError)

    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })

  it('shows generic error for non-axios errors', async () => {
    mockLoginApi.mockRejectedValueOnce(new Error('Network timeout'))
    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })
})
