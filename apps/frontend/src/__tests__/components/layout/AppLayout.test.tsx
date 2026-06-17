/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '../../../components/layout/AppLayout'
import { useAuthStore } from '../../../store/authStore'
import { Role } from '@inventory/shared-types'
import type { AuthUser } from '@inventory/shared-types'

jest.mock('../../../api/authApi', () => ({
  logoutApi: jest.fn().mockResolvedValue(undefined),
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const user: AuthUser = { id: '1', email: 'admin@test.com', username: 'admin', role: Role.ADMIN }

describe('AppLayout', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(user, 'token')
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  function renderLayout(child = <div>Page Content</div>) {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={child} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders the sidebar', () => {
    renderLayout()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders the header', () => {
    renderLayout()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders outlet children', () => {
    renderLayout(<div>Page Content</div>)
    expect(screen.getByText('Page Content')).toBeInTheDocument()
  })
})
