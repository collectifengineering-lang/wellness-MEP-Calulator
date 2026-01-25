import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { initializeSettings } from './store/useSettingsStore'
import LoginPage from './components/auth/LoginPage'
import AuthGuard from './components/auth/AuthGuard'
import ProjectsGrid from './components/projects/ProjectsGrid'
import ProjectWorkspace from './components/ProjectWorkspace'
import SettingsPage from './components/settings/SettingsPage'

function App() {
  const { setUser, setLoading } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Check current session and initialize settings
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Load shared settings from database
      await initializeSettings()
      
      setInitialized(true)
    }
    
    initialize()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="animate-pulse text-surface-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <ProjectsGrid />
            </AuthGuard>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <AuthGuard>
              <ProjectWorkspace />
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <SettingsPage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
