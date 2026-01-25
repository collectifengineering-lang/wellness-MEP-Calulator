import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, getDisplayName } from '../../lib/auth'
import { useAuthStore } from '../../store/useAuthStore'

export default function UserMenu() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = getDisplayName(user?.email)
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-700/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <span className="text-white text-sm font-medium">{initials}</span>
        </div>
        <span className="text-surface-200 text-sm hidden sm:block">{displayName}</span>
        <svg
          className={`w-4 h-4 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-700">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <p className="text-xs text-surface-400 truncate">{user?.email}</p>
            </div>
            <div className="p-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
