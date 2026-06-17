import { NavLink } from 'react-router-dom'
import { Role } from '@inventory/shared-types'
import { useAuthStore } from '../../store/authStore'

interface NavItem {
  label: string
  href: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Products', href: '/products' },
  { label: 'Inventory', href: '/inventory' },
  { label: 'Reports', href: '/reports' },
  { label: 'Notifications', href: '/notifications' },
  { label: 'Categories', href: '/categories', adminOnly: true },
  { label: 'Suppliers', href: '/suppliers', adminOnly: true },
  { label: 'Users', href: '/users', adminOnly: true },
  { label: 'Audit', href: '/audit', adminOnly: true },
]

export function Sidebar() {
  const { user } = useAuthStore()

  if (!user) return null

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === Role.ADMIN)

  return (
    <nav
      aria-label="Main navigation"
      className="w-64 bg-gray-900 min-h-screen flex flex-col py-6"
    >
      <div className="px-6 mb-8">
        <span className="text-white font-bold text-lg">InvMS</span>
      </div>
      <ul className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => (
          <li key={item.href}>
            <NavLink
              to={item.href}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
