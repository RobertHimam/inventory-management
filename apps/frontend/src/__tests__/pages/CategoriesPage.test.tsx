/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CategoriesPage } from '../../pages/CategoriesPage'
import { Role } from '@inventory/shared-types'

const mockNavigate = jest.fn()
const mockUseCategoryList = jest.fn()
const mockUseDeleteCategory = jest.fn()
const mockDeleteCategory = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('../../hooks/useCategories', () => ({
  useCategoryList: (...args: unknown[]) => mockUseCategoryList(...args),
  useDeleteCategory: () => mockUseDeleteCategory(),
}))

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

import { useAuthStore } from '../../store/authStore'
const mockUseAuthStore = useAuthStore as unknown as jest.Mock

const CATEGORIES = [
  { _id: 'cat1', name: 'Electronics', description: 'Electronic items', deletedAt: null, deletedBy: null, createdAt: new Date(), updatedAt: new Date() },
  { _id: 'cat2', name: 'Tools', description: 'Tool items', deletedAt: null, deletedBy: null, createdAt: new Date(), updatedAt: new Date() },
]

const PAGINATION = { page: 1, limit: 10, total: 2, totalPages: 1 }

function renderPage() {
  return render(
    <MemoryRouter>
      <CategoriesPage />
    </MemoryRouter>
  )
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({ user: { id: '1', username: 'admin', role: Role.ADMIN } })
    mockUseCategoryList.mockReturnValue({ data: { data: CATEGORIES, pagination: PAGINATION }, isLoading: false, isError: false })
    mockUseDeleteCategory.mockReturnValue({ mutate: mockDeleteCategory })
  })

  it('renders Categories heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /categories/i })).toBeInTheDocument()
  })

  it('renders search input', () => {
    renderPage()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders category rows', () => {
    renderPage()
    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('ADMIN sees Add Category button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument()
  })

  it('Add Category button navigates to /categories/new', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /add category/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/categories/new')
  })

  it('ADMIN sees Edit and Delete buttons per row', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
  })

  it('USER does not see Add/Edit/Delete buttons', () => {
    mockUseAuthStore.mockReturnValue({ user: { id: '2', username: 'user', role: Role.USER } })
    renderPage()
    expect(screen.queryByRole('button', { name: /add category/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseCategoryList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseCategoryList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows confirm dialog on delete click and calls delete on confirm', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockDeleteCategory).toHaveBeenCalledWith('cat1')
  })

  it('cancels delete dialog', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
