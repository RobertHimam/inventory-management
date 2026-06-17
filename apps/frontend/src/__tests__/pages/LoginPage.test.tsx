/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../../pages/LoginPage'
import { Role } from '@inventory/shared-types'

const mockNavigate = jest.fn()
const mockSetAuth = jest.fn()
const mockLoginApi = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ setAuth: mockSetAuth }),
}))

jest.mock('../../api/authApi', () => ({
  loginApi: (...args: unknown[]) => mockLoginApi(...args),
}))

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockSetAuth.mockReset()
    mockLoginApi.mockReset()
  })

  it('renders email and password fields and submit button', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation error when submitted empty', async () => {
    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email format', async () => {
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'notanemail')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('calls loginApi with credentials on valid submit', async () => {
    mockLoginApi.mockResolvedValueOnce({
      user: { id: '1', email: 'a@b.com', username: 'a', role: Role.USER },
      accessToken: 'tok',
    })
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(mockLoginApi).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' })
    })
  })

  it('calls setAuth and navigates to /dashboard on success', async () => {
    const user = { id: '1', email: 'a@b.com', username: 'a', role: Role.USER }
    mockLoginApi.mockResolvedValueOnce({ user, accessToken: 'tok' })
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(user, 'tok')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error message when login fails', async () => {
    const axiosError = Object.assign(new Error('Request failed'), {
      response: { data: { error: 'Invalid credentials' }, status: 401 },
      isAxiosError: true,
    })
    mockLoginApi.mockRejectedValueOnce(axiosError)
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
