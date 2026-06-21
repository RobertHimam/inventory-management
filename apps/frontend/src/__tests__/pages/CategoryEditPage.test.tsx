/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CategoryEditPage } from '../../pages/CategoryEditPage'
import { useCategory, useUpdateCategory } from '../../hooks/useCategories'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { toast } from 'sonner'
const mockToastSuccess = toast.success as jest.Mock
const mockToastError = toast.error as jest.Mock

const mockNavigate = jest.fn()
const mockUpdateCategory = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useCategories')

const mockUseCategory = useCategory as jest.Mock
const mockUseUpdateCategory = useUpdateCategory as jest.Mock

const CATEGORY = {
  _id: 'cat1',
  name: 'Electronics',
  description: 'Electronic items',
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Stable reference — prevents useEffect([data]) infinite re-render loop
const CATEGORY_RESULT = { data: { success: true, data: CATEGORY }, isLoading: false }

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/categories/cat1/edit']}>
      <Routes>
        <Route path="/categories/:id/edit" element={<CategoryEditPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CategoryEditPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUpdateCategory.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
    mockUseCategory.mockReturnValue(CATEGORY_RESULT)
    mockUseUpdateCategory.mockReturnValue({ mutate: mockUpdateCategory, isPending: false, isError: false, error: null })
  })

  it('renders Edit Category heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /edit category/i })).toBeInTheDocument()
  })

  it('pre-fills form with existing data', () => {
    renderPage()
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Electronics')
    expect((screen.getByLabelText(/description/i) as HTMLTextAreaElement).value).toBe('Electronic items')
  })

  it('submits updated data', async () => {
    mockUpdateCategory.mockImplementation((_args: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    renderPage()

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Updated Name' } })
    fireEvent.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat1', dto: expect.objectContaining({ name: 'Updated Name' }) }),
        expect.any(Object)
      )
    })
    expect(mockNavigate).toHaveBeenCalledWith('/categories')
  })

  it('Cancel button navigates to /categories', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/categories')
  })

  it('shows success toast on successful update', async () => {
    mockUpdateCategory.mockImplementation((_args: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.())
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^update$/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('updated'))
    })
  })

  it('shows error toast when update fails', async () => {
    mockUpdateCategory.mockImplementation((_args: unknown, opts: { onError?: (e: Error) => void }) => opts?.onError?.(new Error('Server error')))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^update$/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })
})
