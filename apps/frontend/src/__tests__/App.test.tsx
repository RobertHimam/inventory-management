/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import type { AuthUser } from '@inventory/shared-types'

jest.mock('../api/authApi', () => ({
  logoutApi: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../hooks/useProducts', () => ({
  useProductList: () => ({ data: undefined, isLoading: false, isError: false }),
  useDeleteProduct: () => ({ mutate: jest.fn() }),
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const adminUser: AuthUser = { id: '1', email: 'admin@test.com', username: 'admin', role: Role.ADMIN }

function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('App routing — unauthenticated', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('renders login page at /login', () => {
    renderApp('/login')
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('redirects / to /login when not authenticated', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('redirects /dashboard to /login when not authenticated', () => {
    renderApp('/dashboard')
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })
})

describe('App routing — authenticated ADMIN', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(adminUser, 'token')
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('renders dashboard page at /dashboard', () => {
    renderApp('/dashboard')
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('renders products page at /products', () => {
    renderApp('/products')
    expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument()
  })

  it('renders inventory page at /inventory', () => {
    renderApp('/inventory')
    expect(screen.getByRole('heading', { name: /inventory/i })).toBeInTheDocument()
  })

  it('redirects / to /dashboard when authenticated', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })
})

describe('App routing — authenticated USER', () => {
  const regularUser: AuthUser = { id: '2', email: 'user@test.com', username: 'user', role: Role.USER }

  beforeEach(() => {
    useAuthStore.getState().setAuth(regularUser, 'token-user')
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('can access /dashboard', () => {
    renderApp('/dashboard')
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('redirected from /categories (ADMIN only) to /', () => {
    renderApp('/categories')
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })
})
