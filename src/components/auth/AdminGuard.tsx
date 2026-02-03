import { useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAllowedDomain, isAdmin } from '../../lib/auth'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'

interface AdminGuardProps {
  children: ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    // Development mode: allow access without auth if Supabase not configured
    if (!isSupabaseConfigured()) {
      console.warn('Development mode: Supabase not configured, bypassing admin check')
      return
    }

    // Not logged in
    if (!user) {
      navigate('/login')
      return
    }

    // Logged in but wrong domain
    if (!isAllowedDomain(user.email)) {
      console.error('Access denied: Domain not allowed')
      supabase.auth.signOut()
      navigate('/login')
      return
    }

    // Logged in but not an admin
    if (!isAdmin(user.email)) {
      console.warn('Access denied: Admin privileges required')
      navigate('/')
      return
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-surface-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Development mode: show content without auth
  if (!isSupabaseConfigured()) {
    return <>{children}</>
  }

  // Production: require valid auth AND admin role
  if (!user || !isAllowedDomain(user.email) || !isAdmin(user.email)) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="max-w-md text-center p-8 bg-surface-800 rounded-xl border border-surface-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
          <p className="text-surface-400 mb-6">
            You don't have permission to access this page. Contact an administrator if you need access.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
