import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { logoutApi } from '../../api/authApi'

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
      className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0"
    >
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 -ml-2 rounded-md text-gray-500 hover:bg-gray-100"
        aria-label="Toggle navigation"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3 sm:gap-4">
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.username}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
