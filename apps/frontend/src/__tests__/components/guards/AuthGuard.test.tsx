/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../../../components/guards/AuthGuard'

const mockUseAuthStore = jest.fn()

jest.mock('../../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}))

function renderWithRouter(isAuthenticated: boolean) {
  mockUseAuthStore.mockReturnValue({ isAuthenticated })
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
  it('renders children when authenticated', () => {
    renderWithRouter(true)
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    renderWithRouter(false)
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
