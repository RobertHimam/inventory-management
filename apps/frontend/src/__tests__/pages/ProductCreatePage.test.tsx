/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProductCreatePage } from '../../pages/ProductCreatePage'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { toast } from 'sonner'
const mockToastSuccess = toast.success as jest.Mock
const mockToastError = toast.error as jest.Mock

const mockNavigate = jest.fn()
const mockCreateProduct = jest.fn()
const mockUseCreateProduct = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useProducts', () => ({
  useCreateProduct: () => mockUseCreateProduct(),
}))

jest.mock('../../hooks/useCategories', () => ({
  useCategoryList: () => ({
    data: { data: [{ _id: 'cat-1', name: 'Electronics' }] },
    isLoading: false,
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductCreatePage />
    </MemoryRouter>
  )
}

async function pickCategory() {
  await userEvent.click(screen.getByRole('combobox', { name: /category/i }))
  await userEvent.click(await screen.findByRole('option', { name: /electronics/i }))
}

describe('ProductCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockCreateProduct.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
    mockUseCreateProduct.mockReturnValue({ mutate: mockCreateProduct, isPending: false, isError: false, error: null })
  })

  it('renders Create Product heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /create product/i })).toBeInTheDocument()
  })

  it('renders all form fields', () => {
    renderPage()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sku/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/stock quantity/i)).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows validation errors when submitted empty', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('shows price validation error for negative value', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/name/i), 'Widget')
    await userEvent.type(screen.getByLabelText(/price/i), '-5')
    await userEvent.type(screen.getByLabelText(/sku/i), 'WGT-001')
    await pickCategory()
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(screen.getByText(/price cannot be negative/i)).toBeInTheDocument()
    })
  })

  it('calls createProduct with form data on valid submit', async () => {
    mockCreateProduct.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await userEvent.type(screen.getByLabelText(/name/i), 'Widget')
    await userEvent.type(screen.getByLabelText(/price/i), '9.99')
    await userEvent.type(screen.getByLabelText(/sku/i), 'WGT-001')
    await pickCategory()
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Widget', price: 9.99, sku: 'WGT-001', category: 'Electronics' }),
        expect.any(Object)
      )
    })
  })

  it('navigates to /products on successful create', async () => {
    mockCreateProduct.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await userEvent.type(screen.getByLabelText(/name/i), 'Widget')
    await userEvent.type(screen.getByLabelText(/price/i), '9.99')
    await userEvent.type(screen.getByLabelText(/sku/i), 'WGT-001')
    await pickCategory()
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/products')
    })
  })

  it('navigates to /products when Cancel clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/products')
  })

  it('shows error alert when create fails', async () => {
    mockUseCreateProduct.mockReturnValue({
      mutate: mockCreateProduct,
      isPending: false,
      isError: true,
      error: { response: { data: { error: 'SKU already exists' } } },
    })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('disables submit button while pending', () => {
    mockUseCreateProduct.mockReturnValue({ mutate: mockCreateProduct, isPending: true, isError: false, error: null })
    renderPage()
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })

  it('shows success toast on successful create', async () => {
    mockCreateProduct.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    await userEvent.type(screen.getByLabelText(/name/i), 'Widget')
    await userEvent.type(screen.getByLabelText(/price/i), '9.99')
    await userEvent.type(screen.getByLabelText(/sku/i), 'WGT-001')
    await pickCategory()
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('created'))
    })
  })

  it('shows error toast when create fails', async () => {
    mockCreateProduct.mockImplementation((_dto: unknown, opts: { onError?: (e: Error) => void }) => opts?.onError?.(new Error('Server error')))
    renderPage()
    await userEvent.type(screen.getByLabelText(/name/i), 'Widget')
    await userEvent.type(screen.getByLabelText(/price/i), '9.99')
    await userEvent.type(screen.getByLabelText(/sku/i), 'WGT-001')
    await pickCategory()
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })
})
