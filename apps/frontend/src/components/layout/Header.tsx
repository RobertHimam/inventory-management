import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { logoutApi } from '../../api/authApi'
import { Menu, LogOut, ChevronDown } from 'lucide-react'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the user menu on outside click.
  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  async function handleLogout() {
    try {
      await logoutApi()
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <header
      role="banner"
      className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4"
    >
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden md:block flex-1" />

      {user && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="User menu"
            className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-slate-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-slate-900">{user.username}</span>
              <span className="block text-xs leading-tight text-slate-400">{user.role}</span>
            </span>
            <ChevronDown
              className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-900">{user.username}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
