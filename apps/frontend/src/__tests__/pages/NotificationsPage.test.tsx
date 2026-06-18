/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotificationsPage } from '../../pages/NotificationsPage'

const mockUseNotificationList = jest.fn()
const mockUseMarkAsRead = jest.fn()
const mockMarkAsRead = jest.fn()

jest.mock('../../hooks/useNotifications', () => ({
  useNotificationList: () => mockUseNotificationList(),
  useMarkAsRead: () => mockUseMarkAsRead(),
  NOTIFICATION_KEYS: { list: () => ['notifications', 'list'] },
}))

jest.mock('../../hooks/useSSE', () => ({
  useSSE: jest.fn(),
}))

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}))

const mockNotificationUnread = {
  _id: 'n1',
  userId: 'u1',
  type: 'LOW_STOCK',
  recipient: 'user@example.com',
  subject: 'Low stock alert',
  body: 'Product X is low.',
  status: 'SENT',
  read: false,
  attempts: 1,
  createdAt: '2026-06-18T10:00:00.000Z',
}

const mockNotificationRead = {
  _id: 'n2',
  userId: 'u1',
  type: 'STOCK_IN',
  recipient: 'user@example.com',
  subject: 'Stock received',
  body: 'Product Y stocked in.',
  status: 'SENT',
  read: true,
  attempts: 1,
  createdAt: '2026-06-17T10:00:00.000Z',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>
  )
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    mockUseMarkAsRead.mockReturnValue({ mutate: mockMarkAsRead, isPending: false })
  })

  afterEach(() => jest.clearAllMocks())

  it('shows loading state', () => {
    mockUseNotificationList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseNotificationList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  it('shows empty state when no notifications', () => {
    mockUseNotificationList.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false })
    renderPage()
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
  })

  it('renders notification list with unread count badge', () => {
    mockUseNotificationList.mockReturnValue({
      data: { data: [mockNotificationUnread, mockNotificationRead] },
      isLoading: false,
      isError: false,
    })
    renderPage()
    expect(screen.getByText('Low stock alert')).toBeInTheDocument()
    expect(screen.getByText('Stock received')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // unread badge
  })

  it('shows Mark read button only for unread notifications', () => {
    mockUseNotificationList.mockReturnValue({
      data: { data: [mockNotificationUnread, mockNotificationRead] },
      isLoading: false,
      isError: false,
    })
    renderPage()
    const markReadBtns = screen.getAllByRole('button', { name: /mark read/i })
    expect(markReadBtns).toHaveLength(1)
  })

  it('calls markAsRead mutate with notification id on button click', () => {
    mockUseNotificationList.mockReturnValue({
      data: { data: [mockNotificationUnread] },
      isLoading: false,
      isError: false,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /mark read/i }))
    expect(mockMarkAsRead).toHaveBeenCalledWith('n1')
  })
})
