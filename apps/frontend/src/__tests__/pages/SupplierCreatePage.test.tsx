/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SupplierCreatePage } from '../../pages/SupplierCreatePage'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { toast } from 'sonner'
const mockToastSuccess = toast.success as jest.Mock
const mockToastError = toast.error as jest.Mock

const mockNavigate = jest.fn()
const mockCreateSupplier = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useSuppliers', () => ({
  useCreateSupplier: () => ({ mutate: mockCreateSupplier, isPending: false, isError: false, error: null }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SupplierCreatePage />
    </MemoryRouter>
  )
}

describe('SupplierCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockCreateSupplier.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
  })

  it('renders Create Supplier heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /create supplier/i })).toBeInTheDocument()
  })

  it('renders name field', () => {
    renderPage()
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument()
  })

  it('shows validation error when name is empty', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    mockCreateSupplier.mockImplementation((_dto: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    renderPage()

    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(mockCreateSupplier).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Acme Corp' }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
    expect(mockNavigate).toHaveBeenCalledWith('/suppliers')
  })

  it('Cancel button navigates to /suppliers', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/suppliers')
  })

  it('shows success toast on successful create', async () => {
    mockCreateSupplier.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('created'))
    })
  })

  it('shows error toast when create fails', async () => {
    mockCreateSupplier.mockImplementation((_dto: unknown, opts: { onError?: (e: Error) => void }) => opts?.onError?.(new Error('Server error')))
    renderPage()
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })
})
