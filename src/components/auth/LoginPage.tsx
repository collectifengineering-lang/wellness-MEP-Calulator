import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithMicrosoft, isAllowedDomain } from '../../lib/auth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'

export default function LoginPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && isAllowedDomain(user.email)) {
      navigate('/')
    }
  }, [user, navigate])

  const handleLogin = async () => {
    if (!isSupabaseConfigured()) {
      // For development without Supabase, create a mock user
      console.warn('Supabase not configured. Using development mode.')
      return
    }

    const { error } = await signInWithMicrosoft()
    if (error) {
      console.error('Login error:', error.message)
    }
  }

  const configured = isSupabaseConfigured()

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 flex items-center justify-center px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/25 mb-4">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Wellness Facility
          </h1>
          <p className="text-lg text-primary-400 font-medium">
            MEP Calculator
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-800/50 backdrop-blur-xl border border-surface-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white text-center mb-2">
            Welcome Back
          </h2>
          <p className="text-surface-400 text-center mb-8">
            Sign in with your COLLECTIF account to continue
          </p>

          <button
            onClick={handleLogin}
            disabled={!configured}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed"
          >
            {/* Microsoft logo */}
            <svg className="w-5 h-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in with Microsoft 365
          </button>

          {!configured && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-amber-400 text-sm text-center">
                ⚠️ Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-surface-700">
            <p className="text-surface-500 text-xs text-center">
              Access restricted to <span className="text-surface-400 font-medium">@collectif.nyc</span> users only
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-surface-600 text-sm text-center mt-8">
          © {new Date().getFullYear()} COLLECTIF Engineering PLLC
        </p>
      </div>
    </div>
  )
}
