/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleGuard } from '../../../components/guards/RoleGuard'
import { Role } from '@inventory/shared-types'

const mockUseAuthStore = jest.fn()

jest.mock('../../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}))

function renderWithRole(userRole: Role, allowedRoles: Role[]) {
  mockUseAuthStore.mockReturnValue({
    user: { id: '1', email: 'a@b.com', username: 'a', role: userRole },
  })
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={allowedRoles}>
              <div>Admin Content</div>
            </RoleGuard>
          }
        />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RoleGuard', () => {
  it('renders children when user has allowed role', () => {
    renderWithRole(Role.ADMIN, [Role.ADMIN])
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('redirects to / when user role not in allowedRoles', () => {
    renderWithRole(Role.USER, [Role.ADMIN])
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders children when multiple roles allowed and user matches one', () => {
    renderWithRole(Role.USER, [Role.ADMIN, Role.USER])
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('redirects to / when user is null', () => {
    mockUseAuthStore.mockReturnValue({ user: null })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RoleGuard allowedRoles={[Role.ADMIN]}>
                <div>Admin Content</div>
              </RoleGuard>
            }
          />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Home Page')).toBeInTheDocument()
  })
})
