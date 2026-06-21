import { NavLink } from 'react-router-dom'
import { Role } from '@inventory/shared-types'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard,
  Package,
  Layers,
  BarChart2,
  Bell,
  Tag,
  Truck,
  Users,
  Shield,
  X,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Inventory', href: '/inventory', icon: Layers },
  { label: 'Reports', href: '/reports', icon: BarChart2 },
  { label: 'Notifications', href: '/notifications', icon: Bell },
]

const ADMIN_NAV: NavItem[] = [
  { label: 'Categories', href: '/categories', icon: Tag, adminOnly: true },
  { label: 'Suppliers', href: '/suppliers', icon: Truck, adminOnly: true },
  { label: 'Users', href: '/users', icon: Users, adminOnly: true },
  { label: 'Audit', href: '/audit', icon: Shield, adminOnly: true },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function NavItem({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const Icon = item.icon
  return (
    <li>
      <NavLink
        to={item.href}
        onClick={onClose}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`
        }
      >
        <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        {item.label}
      </NavLink>
    </li>
  )
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore()
  if (!user) return null

  const isAdmin = user.role === Role.ADMIN

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Main navigation"
        className={`
          fixed inset-y-0 left-0 z-30 w-60 bg-primary-900 flex flex-col
          transform transition-transform duration-200 ease-in-out
          md:relative md:inset-auto md:translate-x-0 md:z-auto md:shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">InvMS</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Main
            </p>
            <ul className="space-y-0.5">
              {MAIN_NAV.map((item) => (
                <NavItem key={item.href} item={item} onClose={onClose} />
              ))}
            </ul>
          </div>

          {isAdmin && (
            <div>
              <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Admin
              </p>
              <ul className="space-y-0.5">
                {ADMIN_NAV.map((item) => (
                  <NavItem key={item.href} item={item} onClose={onClose} />
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-4 py-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-white uppercase">
                {user.username.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-slate-400">{user.role}</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
