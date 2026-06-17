/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../../../components/layout/Sidebar'
import { useAuthStore } from '../../../store/authStore'
import { Role } from '@inventory/shared-types'
import type { AuthUser } from '@inventory/shared-types'

const adminUser: AuthUser = { id: '1', email: 'admin@test.com', username: 'admin', role: Role.ADMIN }
const regularUser: AuthUser = { id: '2', email: 'user@test.com', username: 'user', role: Role.USER }

const adminLinks = ['Dashboard', 'Products', 'Inventory', 'Reports', 'Notifications', 'Categories', 'Suppliers', 'Users', 'Audit']
const userLinks = ['Dashboard', 'Products', 'Inventory', 'Reports', 'Notifications']
const adminOnlyLinks = ['Categories', 'Suppliers', 'Users', 'Audit']

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar — ADMIN', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(adminUser, 'token-admin')
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('renders all 9 nav items for ADMIN', () => {
    renderSidebar()
    for (const label of adminLinks) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('renders correct hrefs for ADMIN nav items', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products')
    expect(screen.getByRole('link', { name: 'Inventory' })).toHaveAttribute('href', '/inventory')
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports')
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/notifications')
    expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/categories')
    expect(screen.getByRole('link', { name: 'Suppliers' })).toHaveAttribute('href', '/suppliers')
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users')
    expect(screen.getByRole('link', { name: 'Audit' })).toHaveAttribute('href', '/audit')
  })
})

describe('Sidebar — USER', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(regularUser, 'token-user')
  })

  afterEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('renders 5 nav items for USER', () => {
    renderSidebar()
    for (const label of userLinks) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('hides admin-only items for USER', () => {
    renderSidebar()
    for (const label of adminOnlyLinks) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })
})

describe('Sidebar — unauthenticated', () => {
  it('renders no nav items when no user', () => {
    useAuthStore.getState().clearAuth()
    renderSidebar()
    for (const label of adminLinks) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })
})
