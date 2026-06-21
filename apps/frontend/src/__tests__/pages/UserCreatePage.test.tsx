/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserCreatePage } from '../../pages/UserCreatePage'
import { Role } from '@inventory/shared-types'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { toast } from 'sonner'
const mockToastSuccess = toast.success as jest.Mock
const mockToastError = toast.error as jest.Mock

const mockNavigate = jest.fn()
const mockCreateUser = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useUserManagement', () => ({
  useCreateManagedUser: () => ({ mutate: mockCreateUser, isPending: false, isError: false, error: null }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <UserCreatePage />
    </MemoryRouter>
  )
}

describe('UserCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockCreateUser.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
  })

  it('renders Create User heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /create user/i })).toBeInTheDocument()
  })

  it('renders username, email, password, role fields', () => {
    renderPage()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
  })

  it('shows validation errors when form is empty', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    mockCreateUser.mockImplementation((_dto: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    renderPage()

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } })

    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'johndoe', email: 'john@example.com', password: 'secret123', role: Role.USER }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
    expect(mockNavigate).toHaveBeenCalledWith('/users')
  })

  it('Cancel button navigates to /users', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/users')
  })

  it('shows success toast on successful create', async () => {
    mockCreateUser.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('created'))
    })
  })

  it('shows error toast when create fails', async () => {
    mockCreateUser.mockImplementation((_dto: unknown, opts: { onError?: (e: Error) => void }) => opts?.onError?.(new Error('Server error')))
    renderPage()
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })
})
