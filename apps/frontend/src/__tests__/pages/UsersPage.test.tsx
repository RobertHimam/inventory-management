/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UsersPage } from '../../pages/UsersPage'
import { Role } from '@inventory/shared-types'

const mockNavigate = jest.fn()
const mockUseUserList = jest.fn()
const mockUseDeleteManagedUser = jest.fn()
const mockDeleteUser = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useUserManagement', () => ({
  useUserList: (...args: unknown[]) => mockUseUserList(...args),
  useDeleteManagedUser: () => mockUseDeleteManagedUser(),
}))

const USERS = [
  { id: 'u1', username: 'admin', email: 'admin@example.com', role: Role.ADMIN, deletedAt: null, deletedBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'u2', username: 'johndoe', email: 'john@example.com', role: Role.USER, deletedAt: null, deletedBy: null, createdAt: new Date(), updatedAt: new Date() },
]

const PAGINATION = { page: 1, limit: 10, total: 2, totalPages: 1 }

function renderPage() {
  return render(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>
  )
}

describe('UsersPage', () => {
  beforeEach(() => {
    mockUseUserList.mockReturnValue({ data: { data: USERS, pagination: PAGINATION }, isLoading: false, isError: false })
    mockUseDeleteManagedUser.mockReturnValue({ mutate: mockDeleteUser })
  })

  it('renders Users heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument()
  })

  it('renders search input', () => {
    renderPage()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders user rows with username and role', () => {
    renderPage()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('johndoe')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
  })

  it('renders Add User button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument()
  })

  it('Add User navigates to /users/new', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /add user/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/users/new')
  })

  it('shows loading state', () => {
    mockUseUserList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseUserList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows confirm dialog on delete and calls delete on confirm', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockDeleteUser).toHaveBeenCalledWith('u1')
  })

  it('cancels delete dialog', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
