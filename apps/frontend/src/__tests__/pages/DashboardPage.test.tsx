/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '../../pages/DashboardPage'

const mockUseProductList = jest.fn()
const mockUseInventoryList = jest.fn()

jest.mock('../../hooks/useProducts', () => ({
  useProductList: (...args: unknown[]) => mockUseProductList(...args),
}))

jest.mock('../../hooks/useInventory', () => ({
  useInventoryList: (...args: unknown[]) => mockUseInventoryList(...args),
}))

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
})
