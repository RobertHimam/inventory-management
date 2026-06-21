import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { logoutApi } from '../../api/authApi'
import { Menu, LogOut } from 'lucide-react'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logoutApi()
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

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

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-900">{user.username}</p>
            <p className="text-xs text-slate-400">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="btn-secondary !px-3 gap-1.5"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
