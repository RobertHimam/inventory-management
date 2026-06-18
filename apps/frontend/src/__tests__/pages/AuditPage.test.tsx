/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuditPage } from '../../pages/AuditPage'

const mockUseAuditList = jest.fn()

jest.mock('../../hooks/useAudit', () => ({
  useAuditList: (...args: unknown[]) => mockUseAuditList(...args),
}))

const AUDIT_LOGS = [
  {
    id: 'a1',
    correlationId: 'corr-1',
    userId: 'u1',
    username: 'admin',
    role: 'ADMIN',
    action: 'CREATE',
    resourceType: 'product',
    resourceId: 'p1',
    createdAt: '2026-06-18T10:00:00.000Z',
  },
  {
    id: 'a2',
    correlationId: 'corr-2',
    userId: 'u2',
    username: 'user1',
    role: 'USER',
    action: 'DELETE',
    resourceType: 'inventory',
    resourceId: 'inv1',
    createdAt: '2026-06-18T09:00:00.000Z',
  },
]

const PAGINATION = { page: 1, limit: 20, total: 2, totalPages: 1 }

function renderPage() {
  return render(
    <MemoryRouter>
      <AuditPage />
    </MemoryRouter>
  )
}

describe('AuditPage', () => {
  beforeEach(() => {
    mockUseAuditList.mockReturnValue({
      data: { data: AUDIT_LOGS, pagination: PAGINATION },
      isLoading: false,
      isError: false,
    })
  })

  afterEach(() => jest.clearAllMocks())

  it('renders heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /audit trail/i })).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseAuditList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseAuditList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  it('renders audit log rows', () => {
    renderPage()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('user1')).toBeInTheDocument()
    expect(screen.getByText('CREATE')).toBeInTheDocument()
    expect(screen.getByText('DELETE')).toBeInTheDocument()
  })

  it('shows empty state when no logs', () => {
    mockUseAuditList.mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
    })
    renderPage()
    expect(screen.getByText(/no audit logs found/i)).toBeInTheDocument()
  })

  it('resets to page 1 on filter submit', () => {
    renderPage()
    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'admin' } })
    const filterBtn = screen.getByRole('button', { name: /filter/i })
    fireEvent.click(filterBtn)
    // page resets to 1 — useAuditList called with page:1
    expect(mockUseAuditList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, search: 'admin' })
    )
  })

  it('does not show pagination when totalPages <= 1', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
  })

  it('shows pagination when totalPages > 1', () => {
    mockUseAuditList.mockReturnValue({
      data: { data: AUDIT_LOGS, pagination: { page: 1, limit: 20, total: 50, totalPages: 3 } },
      isLoading: false,
      isError: false,
    })
    renderPage()
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})
