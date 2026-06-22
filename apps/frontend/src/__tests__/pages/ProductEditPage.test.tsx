/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProductEditPage } from '../../pages/ProductEditPage'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { toast } from 'sonner'
const mockToastSuccess = toast.success as jest.Mock
const mockToastError = toast.error as jest.Mock

const mockNavigate = jest.fn()
const mockUpdateProduct = jest.fn()
const mockUseProduct = jest.fn()
const mockUseUpdateProduct = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useProducts', () => ({
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
  useUpdateProduct: () => mockUseUpdateProduct(),
}))

jest.mock('../../hooks/useCategories', () => ({
  useCategoryList: () => ({
    data: { data: [{ _id: 'cat-1', name: 'Electronics' }] },
    isLoading: false,
  }),
}))

const PRODUCT = {
  _id: 'p1',
  name: 'Widget A',
  description: 'A great widget',
  sku: 'WGT-001',
  category: 'Electronics',
  price: 9.99,
  stockQuantity: 100,
  isActive: true,
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function renderPage(id = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/products/${id}/edit`]}>
      <Routes>
        <Route path="/products/:id/edit" element={<ProductEditPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProductEditPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUpdateProduct.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
    mockUseProduct.mockReturnValue({ data: { data: PRODUCT }, isLoading: false, isError: false })
    mockUseUpdateProduct.mockReturnValue({ mutate: mockUpdateProduct, isPending: false, isError: false, error: null })
  })

  it('renders Edit Product heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /edit product/i })).toBeInTheDocument()
  })

  it('shows loading state while fetching product', () => {
    mockUseProduct.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state when product fetch fails', () => {
    mockUseProduct.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('pre-fills form with existing product data', () => {
    renderPage()
    expect(screen.getByDisplayValue('Widget A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A great widget')).toBeInTheDocument()
    expect(screen.getByDisplayValue('WGT-001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Electronics')).toBeInTheDocument()
  })

  it('calls updateProduct with id and changed data on submit', async () => {
    mockUpdateProduct.mockImplementation((_args: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()

    const nameInput = screen.getByDisplayValue('Widget A')
    fireEvent.change(nameInput, { target: { value: 'Widget Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockUpdateProduct).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1', dto: expect.objectContaining({ name: 'Widget Updated' }) }),
        expect.any(Object)
      )
    })
  })

  it('navigates to /products on successful update', async () => {
    mockUpdateProduct.mockImplementation((_args: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/products')
    })
  })

  it('navigates to /products when Cancel clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/products')
  })

  it('shows error alert when update fails', () => {
    mockUseUpdateProduct.mockReturnValue({
      mutate: mockUpdateProduct,
      isPending: false,
      isError: true,
      error: { response: { data: { error: 'Conflict' } } },
    })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('disables save button while pending', () => {
    mockUseUpdateProduct.mockReturnValue({ mutate: mockUpdateProduct, isPending: true, isError: false, error: null })
    renderPage()
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('shows success toast on successful update', async () => {
    mockUpdateProduct.mockImplementation((_args: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('updated'))
    })
  })

  it('shows error toast when update fails', async () => {
    mockUpdateProduct.mockImplementation((_args: unknown, opts: { onError?: (e: Error) => void }) => opts?.onError?.(new Error('Server error')))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })
})
