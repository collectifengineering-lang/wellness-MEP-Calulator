import { useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAllowedDomain } from '../../lib/auth'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'

interface AuthGuardProps {
  children: ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    // Development mode: allow access without auth if Supabase not configured
    if (!isSupabaseConfigured()) {
      console.warn('Development mode: Supabase not configured, bypassing auth')
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

  // Production: require valid auth
  if (!user || !isAllowedDomain(user.email)) {
    return null
  }

  return <>{children}</>
}
