/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReportsPage } from '../../pages/ReportsPage'
import { useAuthStore } from '../../store/authStore'
import { Role } from '@inventory/shared-types'
import type { AuthUser } from '@inventory/shared-types'

const mockUseDashboardMetrics = jest.fn()
const mockUseSalesReport = jest.fn()
const mockUseInventoryValuation = jest.fn()
const mockUseLowStockReport = jest.fn()

jest.mock('../../hooks/useReports', () => ({
  useDashboardMetrics: () => mockUseDashboardMetrics(),
  useSalesReport: () => mockUseSalesReport(),
  useInventoryValuation: () => mockUseInventoryValuation(),
  useLowStockReport: () => mockUseLowStockReport(),
}))

const adminUser: AuthUser = { id: '1', email: 'admin@test.com', username: 'admin', role: Role.ADMIN }
const regularUser: AuthUser = { id: '2', email: 'user@test.com', username: 'user', role: Role.USER }

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>
  )
}

const dashboardData = {
  data: { data: { totalProducts: 10, totalInventoryValue: 5000, lowStockCount: 2 }, source: 'db' as const },
  isLoading: false,
  isError: false,
}

const salesData = {
  data: {
    data: {
      sales: [
        { productId: 'p1', productName: 'Widget', quantity: 5, price: 10, totalAmount: 50, soldBy: 'u1', createdAt: '2024-01-15T00:00:00.000Z' },
      ],
      totalSalesAmount: 50,
      totalQuantitySold: 5,
    },
    source: 'db' as const,
  },
  isLoading: false,
  isError: false,
}

const valuationData = {
  data: {
    data: {
      valuations: [
        { productId: 'p1', name: 'Widget', sku: 'WGT-001', quantity: 100, cost: 5, price: 10, costValuation: 500, retailValuation: 1000 },
      ],
      totalCostValuation: 500,
      totalRetailValuation: 1000,
    },
    source: 'db' as const,
  },
  isLoading: false,
  isError: false,
}

const lowStockData = {
  data: {
    data: {
      lowStockItems: [
        { productId: 'p2', name: 'Gadget', sku: 'GDG-001', quantity: 2, reorderLevel: 10 },
      ],
    },
    source: 'db' as const,
  },
  isLoading: false,
  isError: false,
}

describe('ReportsPage', () => {
  beforeEach(() => {
    mockUseDashboardMetrics.mockReturnValue(dashboardData)
    mockUseSalesReport.mockReturnValue(salesData)
    mockUseInventoryValuation.mockReturnValue(valuationData)
    mockUseLowStockReport.mockReturnValue(lowStockData)
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  describe('as admin', () => {
    beforeEach(() => {
      useAuthStore.getState().setAuth(adminUser, 'token')
    })

    it('renders Reports heading', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: /reports/i })).toBeInTheDocument()
    })

    it('shows all 4 tabs for admin', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^sales$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /inventory valuation/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /low stock/i })).toBeInTheDocument()
    })

    it('shows dashboard metrics on Overview tab by default', () => {
      renderPage()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('shows sales report when Sales tab clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /^sales$/i }))
      expect(screen.getByText('Widget')).toBeInTheDocument()
    })

    it('shows valuation when Inventory Valuation tab clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /inventory valuation/i }))
      expect(screen.getByText('WGT-001')).toBeInTheDocument()
    })

    it('shows low stock items when Low Stock tab clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /low stock/i }))
      expect(screen.getByText('Gadget')).toBeInTheDocument()
    })

    it('shows error alert when dashboard fetch fails', () => {
      mockUseDashboardMetrics.mockReturnValue({ data: undefined, isLoading: false, isError: true })
      renderPage()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      mockUseDashboardMetrics.mockReturnValue({ data: undefined, isLoading: true, isError: false })
      renderPage()
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('as regular user', () => {
    beforeEach(() => {
      useAuthStore.getState().setAuth(regularUser, 'token')
    })

    it('hides Sales and Inventory Valuation tabs', () => {
      renderPage()
      expect(screen.queryByRole('button', { name: /^sales$/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /inventory valuation/i })).not.toBeInTheDocument()
    })

    it('shows Overview and Low Stock tabs', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /low stock/i })).toBeInTheDocument()
    })
  })
})
