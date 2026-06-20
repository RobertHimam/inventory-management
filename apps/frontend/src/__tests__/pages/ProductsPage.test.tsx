/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductsPage } from '../../pages/ProductsPage'
import { Role } from '@inventory/shared-types'

const mockNavigate = jest.fn()
const mockDeleteProduct = jest.fn()
const mockUseProductList = jest.fn()
const mockUseDeleteProduct = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useProducts', () => ({
  useProductList: (...args: unknown[]) => mockUseProductList(...args),
  useDeleteProduct: () => mockUseDeleteProduct(),
}))

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

import { useAuthStore } from '../../store/authStore'
const mockUseAuthStore = useAuthStore as unknown as jest.Mock

const PRODUCTS = [
  {
    _id: 'p1',
    name: 'Widget A',
    sku: 'WGT-001',
    category: 'Electronics',
    price: 9.99,
    stockQuantity: 100,
    isActive: true,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'p2',
    name: 'Gadget B',
    sku: 'GDG-002',
    category: 'Tools',
    price: 24.5,
    stockQuantity: 0,
    isActive: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const PAGINATION = { page: 1, limit: 10, total: 2, totalPages: 1 }

function setupAdmin() {
  mockUseAuthStore.mockReturnValue({ user: { id: '1', username: 'admin', role: Role.ADMIN } })
}

function setupUser() {
  mockUseAuthStore.mockReturnValue({ user: { id: '2', username: 'user', role: Role.USER } })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductsPage />
    </MemoryRouter>
  )
}

describe('ProductsPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockDeleteProduct.mockReset()
    mockUseProductList.mockReturnValue({ data: { data: PRODUCTS, pagination: PAGINATION }, isLoading: false, isError: false })
    mockUseDeleteProduct.mockReturnValue({ mutate: mockDeleteProduct })
  })

  it('renders Products heading', () => {
    setupUser()
    renderPage()
    expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument()
  })

  it('renders search input', () => {
    setupUser()
    renderPage()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders product table with data', () => {
    setupUser()
    renderPage()
    expect(screen.getByText('Widget A')).toBeInTheDocument()
    expect(screen.getByText('WGT-001')).toBeInTheDocument()
    expect(screen.getByText('Gadget B')).toBeInTheDocument()
    expect(screen.getByText('GDG-002')).toBeInTheDocument()
  })

  it('shows Active/Inactive status labels', () => {
    setupUser()
    renderPage()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    setupUser()
    mockUseProductList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    setupUser()
    mockUseProductList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows Add Product button for ADMIN', () => {
    setupAdmin()
    renderPage()
    expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
  })

  it('hides Add Product button for USER', () => {
    setupUser()
    renderPage()
    expect(screen.queryByRole('button', { name: /add product/i })).not.toBeInTheDocument()
  })

  it('navigates to /products/new when Add Product clicked', () => {
    setupAdmin()
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /add product/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/products/new')
  })

  it('shows Edit and Delete buttons for ADMIN', () => {
    setupAdmin()
    renderPage()
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
  })

  it('hides Edit and Delete buttons for USER', () => {
    setupUser()
    renderPage()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('navigates to /products/:id/edit when Edit clicked', () => {
    setupAdmin()
    renderPage()
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])
    expect(mockNavigate).toHaveBeenCalledWith('/products/p1/edit')
  })

  it('shows delete confirmation dialog when Delete clicked', () => {
    setupAdmin()
    renderPage()
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })

  it('calls deleteProduct when confirm button clicked', () => {
    setupAdmin()
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockDeleteProduct).toHaveBeenCalledWith('p1')
  })

  it('dismisses dialog when Cancel clicked', () => {
    setupAdmin()
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders pagination controls', () => {
    setupUser()
    renderPage()
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument()
  })

  it('previous button is disabled on first page', () => {
    setupUser()
    renderPage()
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('next button is disabled when on last page', () => {
    setupUser()
    renderPage()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })
})
