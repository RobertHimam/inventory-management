/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InventoryPage } from '../../pages/InventoryPage'
import { Role } from '@inventory/shared-types'

const mockNavigate = jest.fn()
const mockUseInventoryList = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useInventory', () => ({
  useInventoryList: (...args: unknown[]) => mockUseInventoryList(...args),
}))

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

import { useAuthStore } from '../../store/authStore'
const mockUseAuthStore = useAuthStore as jest.Mock

const ITEMS = [
  {
    productId: 'prod-1',
    productName: 'Widget A',
    sku: 'WGT-001',
    quantity: 50,
    reorderLevel: 10,
    updatedAt: new Date('2026-01-01'),
  },
  {
    productId: 'prod-2',
    productName: 'Gadget B',
    sku: 'GDG-002',
    quantity: 0,
    reorderLevel: 5,
    updatedAt: new Date('2026-01-02'),
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
      <InventoryPage />
    </MemoryRouter>
  )
}

describe('InventoryPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUseInventoryList.mockReturnValue({
      data: { data: ITEMS, pagination: PAGINATION },
      isLoading: false,
      isError: false,
    })
  })

  it('renders Inventory heading', () => {
    setupUser()
    renderPage()
    expect(screen.getByRole('heading', { name: /inventory/i })).toBeInTheDocument()
  })

  it('renders search input', () => {
    setupUser()
    renderPage()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders inventory table with data', () => {
    setupUser()
    renderPage()
    expect(screen.getByText('Widget A')).toBeInTheDocument()
    expect(screen.getByText('WGT-001')).toBeInTheDocument()
    expect(screen.getByText('Gadget B')).toBeInTheDocument()
    expect(screen.getByText('GDG-002')).toBeInTheDocument()
  })

  it('renders quantity values', () => {
    setupUser()
    renderPage()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    setupUser()
    mockUseInventoryList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    setupUser()
    mockUseInventoryList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows Stock In, Stock Out, Adjust buttons for ADMIN', () => {
    setupAdmin()
    renderPage()
    expect(screen.getByRole('button', { name: /stock in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stock out/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adjust/i })).toBeInTheDocument()
  })

  it('hides action buttons for USER', () => {
    setupUser()
    renderPage()
    expect(screen.queryByRole('button', { name: /stock in/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /stock out/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adjust/i })).not.toBeInTheDocument()
  })

  it('navigates to /inventory/stock-in when Stock In clicked', () => {
    setupAdmin()
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /stock in/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/inventory/stock-in')
  })

  it('navigates to /inventory/stock-out when Stock Out clicked', () => {
    setupAdmin()
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /stock out/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/inventory/stock-out')
  })

  it('navigates to /inventory/adjustment when Adjust clicked', () => {
    setupAdmin()
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /adjust/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/inventory/adjustment')
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
