/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StockAdjustmentPage } from '../../pages/StockAdjustmentPage'

const mockNavigate = jest.fn()
const mockStockAdjust = jest.fn()
const mockUseStockAdjust = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useInventory', () => ({
  useStockAdjust: () => mockUseStockAdjust(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <StockAdjustmentPage />
    </MemoryRouter>
  )
}

describe('StockAdjustmentPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockStockAdjust.mockReset()
    mockUseStockAdjust.mockReturnValue({ mutate: mockStockAdjust, isPending: false, isError: false, error: null })
  })

  it('renders Stock Adjustment heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /stock adjustment/i })).toBeInTheDocument()
  })

  it('renders productId, quantity, and reason fields', () => {
    renderPage()
    expect(screen.getByLabelText(/product id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows validation errors when submitted empty', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByText(/product id is required/i)).toBeInTheDocument()
    })
  })

  it('shows reason validation error when reason is empty', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/product id/i), 'prod-1')
    await userEvent.clear(screen.getByLabelText(/quantity/i))
    await userEvent.type(screen.getByLabelText(/quantity/i), '5')
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByText(/reason is required/i)).toBeInTheDocument()
    })
  })

  it('calls stockAdjust with form data on valid submit', async () => {
    mockStockAdjust.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await userEvent.type(screen.getByLabelText(/product id/i), 'prod-1')
    await userEvent.clear(screen.getByLabelText(/quantity/i))
    await userEvent.type(screen.getByLabelText(/quantity/i), '-5')
    await userEvent.type(screen.getByLabelText(/reason/i), 'Damaged goods')
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(mockStockAdjust).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-1', quantity: -5, reason: 'Damaged goods' }),
        expect.any(Object)
      )
    })
  })

  it('accepts positive quantity for adjustment', async () => {
    mockStockAdjust.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await userEvent.type(screen.getByLabelText(/product id/i), 'prod-1')
    await userEvent.clear(screen.getByLabelText(/quantity/i))
    await userEvent.type(screen.getByLabelText(/quantity/i), '10')
    await userEvent.type(screen.getByLabelText(/reason/i), 'Found extra stock')
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(mockStockAdjust).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-1', quantity: 10, reason: 'Found extra stock' }),
        expect.any(Object)
      )
    })
  })

  it('navigates to /inventory on successful submit', async () => {
    mockStockAdjust.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await userEvent.type(screen.getByLabelText(/product id/i), 'prod-1')
    await userEvent.clear(screen.getByLabelText(/quantity/i))
    await userEvent.type(screen.getByLabelText(/quantity/i), '5')
    await userEvent.type(screen.getByLabelText(/reason/i), 'Test reason')
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/inventory')
    })
  })

  it('navigates to /inventory when Cancel clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/inventory')
  })

  it('shows error alert when submit fails', () => {
    mockUseStockAdjust.mockReturnValue({
      mutate: mockStockAdjust,
      isPending: false,
      isError: true,
      error: { response: { data: { error: 'Product not found' } } },
    })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('disables submit button while pending', () => {
    mockUseStockAdjust.mockReturnValue({ mutate: mockStockAdjust, isPending: true, isError: false, error: null })
    renderPage()
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })
})
