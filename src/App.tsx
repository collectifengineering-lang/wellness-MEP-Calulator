import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { initializeSettings } from './store/useSettingsStore'
import LoginPage from './components/auth/LoginPage'
import AuthGuard from './components/auth/AuthGuard'
import LandingPage from './components/landing/LandingPage'
import ConceptMEPHome from './components/concept-mep/ConceptMEPHome'
import ProjectWorkspace from './components/ProjectWorkspace'
import ScannerHome from './components/plan-scanner/ScannerHome'
import ScanWorkspace from './components/plan-scanner/ScanWorkspace'
import HVACHome from './components/hvac/HVACHome'
import ElectricalHome from './components/electrical/ElectricalHome'
import PlumbingHome from './components/plumbing/PlumbingHome'
import PlumbingWorkspace from './components/plumbing/PlumbingWorkspace'
import HVACWorkspace from './components/hvac/HVACWorkspace'
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
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Landing Page - Main Hub 🐐 */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <LandingPage />
            </AuthGuard>
          }
        />
        
        {/* Concept MEP Module (existing app) */}
        <Route
          path="/concept-mep"
          element={
            <AuthGuard>
              <ConceptMEPHome />
            </AuthGuard>
          }
        />
        <Route
          path="/concept-mep/project/:projectId"
          element={
            <AuthGuard>
              <ProjectWorkspace />
            </AuthGuard>
          }
        />
        
        {/* Plan Scanner Module */}
        <Route
          path="/plan-scanner"
          element={
            <AuthGuard>
              <ScannerHome />
            </AuthGuard>
          }
        />
        <Route
          path="/plan-scanner/scan/:scanId"
          element={
            <AuthGuard>
              <ScanWorkspace />
            </AuthGuard>
          }
        />
        
        {/* HVAC Module */}
        <Route
          path="/hvac"
          element={
            <AuthGuard>
              <HVACHome />
            </AuthGuard>
          }
        />
        <Route
          path="/hvac/:projectId"
          element={
            <AuthGuard>
              <HVACWorkspace />
            </AuthGuard>
          }
        />
        
        {/* Electrical Module (placeholder) */}
        <Route
          path="/electrical"
          element={
            <AuthGuard>
              <ElectricalHome />
            </AuthGuard>
          }
        />
        
        {/* Plumbing Module */}
        <Route
          path="/plumbing"
          element={
            <AuthGuard>
              <PlumbingHome />
            </AuthGuard>
          }
        />
        <Route
          path="/plumbing/project/:projectId"
          element={
            <AuthGuard>
              <PlumbingWorkspace />
            </AuthGuard>
          }
        />
        
        {/* Global Settings */}
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <SettingsPage />
            </AuthGuard>
          }
        />
        
        {/* Legacy route redirect */}
        <Route path="/project/:projectId" element={<Navigate to="/concept-mep/project/:projectId" replace />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
