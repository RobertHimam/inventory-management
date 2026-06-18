/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SupplierEditPage } from '../../pages/SupplierEditPage'
import { useSupplier, useUpdateSupplier } from '../../hooks/useSuppliers'

const mockNavigate = jest.fn()
const mockUpdateSupplier = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useSuppliers')

const mockUseSupplier = useSupplier as jest.Mock
const mockUseUpdateSupplier = useUpdateSupplier as jest.Mock

const SUPPLIER = {
  _id: 'sup1',
  name: 'Acme Corp',
  contactEmail: 'acme@example.com',
  phone: '555-1234',
  address: '123 Main St',
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Stable reference — prevents useEffect([data]) infinite re-render loop
const SUPPLIER_RESULT = { data: { success: true, data: SUPPLIER }, isLoading: false }

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/suppliers/sup1/edit']}>
      <Routes>
        <Route path="/suppliers/:id/edit" element={<SupplierEditPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SupplierEditPage', () => {
  beforeEach(() => {
    mockUseSupplier.mockReturnValue(SUPPLIER_RESULT)
    mockUseUpdateSupplier.mockReturnValue({ mutate: mockUpdateSupplier, isPending: false, isError: false, error: null })
  })

  it('renders Edit Supplier heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /edit supplier/i })).toBeInTheDocument()
  })

  it('pre-fills form with existing data', () => {
    renderPage()
    expect((screen.getByLabelText(/^name/i) as HTMLInputElement).value).toBe('Acme Corp')
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('acme@example.com')
  })

  it('submits updated data', async () => {
    mockUpdateSupplier.mockImplementation((_args: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    renderPage()

    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Updated Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => {
      expect(mockUpdateSupplier).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sup1', dto: expect.objectContaining({ name: 'Updated Corp' }) }),
        expect.any(Object)
      )
    })
    expect(mockNavigate).toHaveBeenCalledWith('/suppliers')
  })

  it('Cancel button navigates to /suppliers', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/suppliers')
  })
})
