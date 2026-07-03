/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StockInPage } from '../../pages/StockInPage'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { toast } from 'sonner'
const mockToastSuccess = toast.success as jest.Mock
const mockToastError = toast.error as jest.Mock

const mockNavigate = jest.fn()
const mockStockIn = jest.fn()
const mockUseStockIn = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useInventory', () => ({
  useStockIn: () => mockUseStockIn(),
}))

jest.mock('../../hooks/useProducts', () => ({
  useProductList: () => ({
    data: { data: [{ _id: 'prod-1', name: 'Test Product', sku: 'TEST-1' }] },
    isLoading: false,
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <StockInPage />
    </MemoryRouter>
  )
}

async function pickProduct() {
  await userEvent.click(screen.getByRole('combobox', { name: /product/i }))
  await userEvent.click(await screen.findByRole('option', { name: /test product/i }))
}

describe('StockInPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockStockIn.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
    mockUseStockIn.mockReturnValue({ mutate: mockStockIn, isPending: false, isError: false, error: null })
  })

  it('renders Stock In heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /stock in/i })).toBeInTheDocument()
  })

  it('renders product selector and quantity fields', () => {
    renderPage()
    expect(screen.getByLabelText('Product')).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
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

  it('shows quantity validation error for zero value', async () => {
    renderPage()
    await pickProduct()
    await userEvent.type(screen.getByLabelText(/quantity/i), '0')
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByText(/quantity must be greater than zero/i)).toBeInTheDocument()
    })
  })

  it('calls stockIn with form data on valid submit', async () => {
    mockStockIn.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await pickProduct()
    await userEvent.type(screen.getByLabelText(/quantity/i), '10')
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(mockStockIn).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-1', quantity: 10 }),
        expect.any(Object)
      )
    })
  })

  it('navigates to /inventory on successful submit', async () => {
    mockStockIn.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await pickProduct()
    await userEvent.type(screen.getByLabelText(/quantity/i), '10')
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
    mockUseStockIn.mockReturnValue({
      mutate: mockStockIn,
      isPending: false,
      isError: true,
      error: { response: { data: { error: 'Product not found' } } },
    })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('disables submit button while pending', () => {
    mockUseStockIn.mockReturnValue({ mutate: mockStockIn, isPending: true, isError: false, error: null })
    renderPage()
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })

  it('shows success toast on successful submit', async () => {
    mockStockIn.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await pickProduct()
    await userEvent.type(screen.getByLabelText(/quantity/i), '10')
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('successfully'))
    })
  })

  it('shows error toast when submit fails', async () => {
    mockStockIn.mockImplementation((_dto: unknown, opts: { onError?: (e: Error) => void }) => opts?.onError?.(new Error('Server error')))
    renderPage()
    await pickProduct()
    await userEvent.type(screen.getByLabelText(/quantity/i), '10')
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })
})
