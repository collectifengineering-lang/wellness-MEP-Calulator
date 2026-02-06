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
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-emerald-950 flex items-center justify-center px-4 overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0 animate-pulse" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.4'%3E%3Cpath d='M40 40l-10-10 10-10 10 10-10 10zm0 40l-10-10 10-10 10 10-10 10zM0 40l-10-10 10-10 10 10L0 40zm80 0l-10-10 10-10 10 10-10 10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>
      
      {/* Floating GOAT emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] text-4xl opacity-20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>🐐</div>
        <div className="absolute top-[20%] right-[10%] text-3xl opacity-15 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4s' }}>🔥</div>
        <div className="absolute bottom-[15%] left-[15%] text-3xl opacity-15 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3.5s' }}>💨</div>
        <div className="absolute bottom-[25%] right-[5%] text-4xl opacity-20 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4.5s' }}>🐐</div>
        <div className="absolute top-[50%] left-[2%] text-2xl opacity-10 animate-bounce" style={{ animationDelay: '2s', animationDuration: '5s' }}>⚡</div>
        <div className="absolute top-[40%] right-[3%] text-2xl opacity-10 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>🚀</div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          {/* GOAT Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-cyan-600 shadow-2xl shadow-emerald-500/30 mb-6 relative">
            <span className="text-5xl">🐐</span>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 opacity-0 hover:opacity-20 transition-opacity duration-500" />
          </div>
          
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 mb-2 tracking-tight">
            COLLECTIF GOAT
          </h1>
          <p className="text-lg text-emerald-400/80 font-semibold tracking-wide">
            MEP Engineering Suite
          </p>
          <p className="text-sm text-surface-500 mt-2 italic">
            The Greatest Of All Tools 🔥
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-800/70 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-8 shadow-2xl shadow-emerald-500/10">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">
              Welcome, Engineer 👷
            </h2>
            <p className="text-surface-400 text-sm">
              Sign in to unlock the power of the GOAT
            </p>
          </div>

          <button
            onClick={handleLogin}
            disabled={!configured}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-white to-gray-100 hover:from-gray-50 hover:to-white disabled:from-gray-300 disabled:to-gray-200 text-gray-800 font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.02] disabled:cursor-not-allowed disabled:scale-100 group"
          >
            {/* Microsoft logo */}
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 21 21">
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

          <div className="mt-6 pt-6 border-t border-surface-700/50">
            <p className="text-surface-500 text-xs text-center">
              🔒 Access restricted to <span className="text-emerald-400 font-medium">@collectif.nyc</span> team members
            </p>
          </div>
        </div>

        {/* Features hint */}
        <div className="mt-6 flex items-center justify-center gap-4 text-surface-500 text-xs">
          <span className="flex items-center gap-1">💧 Plumbing</span>
          <span className="text-surface-700">•</span>
          <span className="flex items-center gap-1">❄️ HVAC</span>
          <span className="text-surface-700">•</span>
          <span className="flex items-center gap-1">⚡ Electrical</span>
          <span className="text-surface-700">•</span>
          <span className="flex items-center gap-1">📐 Plans</span>
        </div>

        {/* Footer */}
        <p className="text-surface-600 text-sm text-center mt-6">
          © {new Date().getFullYear()} COLLECTIF Engineering PLLC
        </p>
      </div>
    </div>
  )
}
