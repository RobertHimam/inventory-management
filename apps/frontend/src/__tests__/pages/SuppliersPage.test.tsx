/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuppliersPage } from '../../pages/SuppliersPage'
import { Role } from '@inventory/shared-types'

const mockNavigate = jest.fn()
const mockUseSupplierList = jest.fn()
const mockUseDeleteSupplier = jest.fn()
const mockDeleteSupplier = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useSuppliers', () => ({
  useSupplierList: (...args: unknown[]) => mockUseSupplierList(...args),
  useDeleteSupplier: () => mockUseDeleteSupplier(),
}))

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

import { useAuthStore } from '../../store/authStore'
const mockUseAuthStore = useAuthStore as jest.Mock

const SUPPLIERS = [
  { _id: 'sup1', name: 'Acme Corp', contactEmail: 'acme@example.com', phone: '555-1234', address: '123 Main St', deletedAt: null, deletedBy: null, createdAt: new Date(), updatedAt: new Date() },
  { _id: 'sup2', name: 'Global Inc', contactEmail: 'global@example.com', phone: '555-5678', address: '456 Elm St', deletedAt: null, deletedBy: null, createdAt: new Date(), updatedAt: new Date() },
]

const PAGINATION = { page: 1, limit: 10, total: 2, totalPages: 1 }

function renderPage() {
  return render(
    <MemoryRouter>
      <SuppliersPage />
    </MemoryRouter>
  )
}

describe('SuppliersPage', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({ user: { id: '1', username: 'admin', role: Role.ADMIN } })
    mockUseSupplierList.mockReturnValue({ data: { data: SUPPLIERS, pagination: PAGINATION }, isLoading: false, isError: false })
    mockUseDeleteSupplier.mockReturnValue({ mutate: mockDeleteSupplier })
  })

  it('renders Suppliers heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /suppliers/i })).toBeInTheDocument()
  })

  it('renders search input', () => {
    renderPage()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders supplier rows', () => {
    renderPage()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Global Inc')).toBeInTheDocument()
  })

  it('ADMIN sees Add Supplier button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /add supplier/i })).toBeInTheDocument()
  })

  it('Add Supplier navigates to /suppliers/new', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /add supplier/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/suppliers/new')
  })

  it('ADMIN sees Edit and Delete buttons', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
  })

  it('USER does not see Add/Edit/Delete buttons', () => {
    mockUseAuthStore.mockReturnValue({ user: { id: '2', username: 'user', role: Role.USER } })
    renderPage()
    expect(screen.queryByRole('button', { name: /add supplier/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseSupplierList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseSupplierList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows confirm dialog on delete click and calls delete on confirm', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockDeleteSupplier).toHaveBeenCalledWith('sup1')
  })

  it('cancels delete dialog', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
