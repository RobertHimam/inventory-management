/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '../../pages/DashboardPage'
import { useAuthStore } from '../../store/authStore'
import { Role } from '@inventory/shared-types'
import type { AuthUser } from '@inventory/shared-types'

const mockUseProductList = jest.fn()
const mockUseInventoryList = jest.fn()
const mockUseLowStockReport = jest.fn()
const mockUseSalesReport = jest.fn()
const mockUseInventoryValuation = jest.fn()

jest.mock('../../hooks/useProducts', () => ({
  useProductList: (...args: unknown[]) => mockUseProductList(...args),
}))

jest.mock('../../hooks/useInventory', () => ({
  useInventoryList: (...args: unknown[]) => mockUseInventoryList(...args),
}))

jest.mock('../../hooks/useReports', () => ({
  useLowStockReport: () => mockUseLowStockReport(),
  useSalesReport: () => mockUseSalesReport(),
  useInventoryValuation: () => mockUseInventoryValuation(),
}))

const adminUser: AuthUser = { id: '1', email: 'admin@test.com', username: 'admin', role: Role.ADMIN }
const regularUser: AuthUser = { id: '2', email: 'user@test.com', username: 'user', role: Role.USER }

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseProductList.mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 42, totalPages: 5 } },
      isLoading: false,
      isError: false,
    })
    mockUseInventoryList.mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 1, total: 30, totalPages: 3 } },
      isLoading: false,
      isError: false,
    })
    mockUseLowStockReport.mockReturnValue({
      data: { data: { lowStockItems: [] } },
      isLoading: false,
      isError: false,
    })
    mockUseSalesReport.mockReturnValue({
      data: { data: { sales: [], totalSalesAmount: 0, totalQuantitySold: 0 } },
      isLoading: false,
      isError: false,
    })
    mockUseInventoryValuation.mockReturnValue({
      data: { data: { valuations: [], totalCostValuation: 0, totalRetailValuation: 0 } },
      isLoading: false,
      isError: false,
    })
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('renders Dashboard heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('renders Total Products card with count', () => {
    renderPage()
    expect(screen.getByText(/total products/i)).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders Total Inventory Items card with count', () => {
    renderPage()
    expect(screen.getByText(/inventory items/i)).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('shows loading state when products loading', () => {
    mockUseProductList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    mockUseInventoryList.mockReturnValue({ data: undefined, isLoading: true, isError: false })

    renderPage()
    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0)
  })

  it('shows error state when products fetch fails', () => {
    mockUseProductList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    mockUseInventoryList.mockReturnValue({ data: undefined, isLoading: false, isError: false })

    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders Low Stock Alerts widget for any user', () => {
    renderPage()
    expect(screen.getByText(/low stock alerts/i)).toBeInTheDocument()
  })

  it('shows Recent Sales widget for admin', () => {
    useAuthStore.getState().setAuth(adminUser, 'token')
    renderPage()
    expect(screen.getByText(/recent sales/i)).toBeInTheDocument()
  })

  it('hides Recent Sales widget for regular user', () => {
    useAuthStore.getState().setAuth(regularUser, 'token')
    renderPage()
    expect(screen.queryByText(/recent sales/i)).not.toBeInTheDocument()
  })

  it('shows chart widgets for admin', () => {
    useAuthStore.getState().setAuth(adminUser, 'token')
    renderPage()
    expect(screen.getByText(/inventory value by product/i)).toBeInTheDocument()
    expect(screen.getByText(/sales over time/i)).toBeInTheDocument()
  })

  it('hides chart widgets for regular user', () => {
    useAuthStore.getState().setAuth(regularUser, 'token')
    renderPage()
    expect(screen.queryByText(/inventory value by product/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sales over time/i)).not.toBeInTheDocument()
  })
})
