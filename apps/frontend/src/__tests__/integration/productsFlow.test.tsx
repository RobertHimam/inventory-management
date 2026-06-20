/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as productApi from '../../api/productApi'
import { ProductsPage } from '../../pages/ProductsPage'
import { useAuthStore } from '../../store/authStore'
import { Role } from '@inventory/shared-types'

jest.mock('../../api/productApi')

const mockListProducts = productApi.listProductsApi as jest.Mock
const mockDeleteProduct = productApi.deleteProductApi as jest.Mock

const mockProduct = {
  _id: 'p1',
  name: 'Widget A',
  sku: 'WGT-001',
  description: 'A widget',
  price: 9.99,
  category: 'Electronics',
  stockQuantity: 50,
  isActive: true,
  deletedAt: null,
  deletedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const defaultPagination = { page: 1, limit: 10, total: 1, totalPages: 1 }

function renderPage(isAdmin = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  useAuthStore.getState().setAuth(
    {
      id: isAdmin ? 'u1' : 'u2',
      username: isAdmin ? 'admin' : 'user1',
      email: 'test@example.com',
      role: isAdmin ? Role.ADMIN : Role.USER,
    },
    'mock-token'
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  mockListProducts.mockResolvedValue({ success: true, data: [mockProduct], pagination: defaultPagination })
  mockDeleteProduct.mockResolvedValue(undefined)
})

afterEach(() => {
  useAuthStore.getState().clearAuth()
  jest.clearAllMocks()
})

describe('ProductsPage + useProducts integration', () => {
  it('fetches and renders product list', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Widget A')).toBeInTheDocument())
    expect(screen.getByText('WGT-001')).toBeInTheDocument()
    expect(screen.getByText('$9.99')).toBeInTheDocument()
    expect(mockListProducts).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('shows loading state initially', () => {
    mockListProducts.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    mockListProducts.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('shows Add Product button for ADMIN', async () => {
    renderPage(true)
    await waitFor(() => expect(screen.getByText('Widget A')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
  })

  it('hides Add Product button for USER', async () => {
    renderPage(false)
    await waitFor(() => expect(screen.getByText('Widget A')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /add product/i })).not.toBeInTheDocument()
  })

  it('shows delete confirm dialog then calls deleteProductApi', async () => {
    mockListProducts.mockResolvedValue({
      success: true,
      data: [mockProduct],
      pagination: defaultPagination,
    })
    renderPage(true)
    await waitFor(() => expect(screen.getByText('Widget A')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => expect(mockDeleteProduct).toHaveBeenCalledWith('p1'))
  })

  it('dismisses delete dialog on cancel', async () => {
    renderPage(true)
    await waitFor(() => expect(screen.getByText('Widget A')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockDeleteProduct).not.toHaveBeenCalled()
  })

  it('shows pagination when totalPages > 1', async () => {
    mockListProducts.mockResolvedValue({
      success: true,
      data: [mockProduct],
      pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('Widget A')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})
