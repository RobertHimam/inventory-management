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

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore()

  if (!user) return null

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === Role.ADMIN)

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <nav
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 flex flex-col py-6 transform transition-transform duration-200 ease-in-out md:relative md:inset-auto md:translate-x-0 md:z-auto md:shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 mb-8 flex items-center justify-between">
          <span className="text-white font-bold text-lg">InvMS</span>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded"
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="flex-1 space-y-1 px-3">
          {visibleItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                onClick={onClose}
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
    </>
  )
}
