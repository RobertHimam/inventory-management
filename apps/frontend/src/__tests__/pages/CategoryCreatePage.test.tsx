/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CategoryCreatePage } from '../../pages/CategoryCreatePage'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { toast } from 'sonner'
const mockToastSuccess = toast.success as jest.Mock
const mockToastError = toast.error as jest.Mock

const mockNavigate = jest.fn()
const mockCreateCategory = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useCategories', () => ({
  useCreateCategory: () => ({ mutate: mockCreateCategory, isPending: false, isError: false, error: null }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CategoryCreatePage />
    </MemoryRouter>
  )
}

describe('CategoryCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockCreateCategory.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
  })

  it('renders Create Category heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /create category/i })).toBeInTheDocument()
  })

  it('renders name and description fields', () => {
    renderPage()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('shows validation error when name is empty', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    mockCreateCategory.mockImplementation((_dto: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    renderPage()

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Electronics' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Electronics' }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
    expect(mockNavigate).toHaveBeenCalledWith('/categories')
  })

  it('Cancel button navigates to /categories', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/categories')
  })

  it('shows success toast on successful create', async () => {
    mockCreateCategory.mockImplementation((_dto: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Electronics' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('created'))
    })
  })

  it('shows error toast when create fails', async () => {
    mockCreateCategory.mockImplementation((_dto: unknown, opts: { onError?: (e: Error) => void }) => opts?.onError?.(new Error('Server error')))
    renderPage()
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Electronics' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })
})
