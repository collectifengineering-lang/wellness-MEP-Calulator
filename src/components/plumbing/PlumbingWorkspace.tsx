import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import SpaceCanvas from './spaces/SpaceCanvas'
import FixtureUnitsCalc from './calculators/FixtureUnitsCalc'
import DHWCalc from './calculators/DHWCalc'
import PipeSizingCalc from './calculators/PipeSizingCalc'
import GasPipingCalc from './calculators/GasPipingCalc'
import PlumbingResults from './results/PlumbingResults'
import { usePlumbingStore, defaultPlumbingSettings } from '../../store/usePlumbingStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { PlumbingProject, PlumbingSpace, PlumbingProjectSettings } from '../../store/usePlumbingStore'

type TabType = 'spaces' | 'fixture-units' | 'dhw' | 'pipe-sizing' | 'gas' | 'results'

export default function PlumbingWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { currentProject, spaces, setCurrentProject, setSpaces } = usePlumbingStore()
  const [activeTab, setActiveTab] = useState<TabType>('spaces')
  const [saving, setSaving] = useState(false)
  const [synced, setSynced] = useState(true)

  // Load project from database
  useEffect(() => {
    if (!projectId) return
    
    if (!currentProject || currentProject.id !== projectId) {
      loadProject(projectId)
    }
  }, [projectId])

  const loadProject = async (id: string) => {
    if (isSupabaseConfigured()) {
      const { data: projectData } = await supabase
        .from('plumbing_projects')
        .select('*')
        .eq('id', id)
        .single()

      if (projectData) {
        const project = dbProjectToProject(projectData)
        setCurrentProject(project)
        
        // Load spaces
        const { data: spacesData } = await supabase
          .from('plumbing_spaces')
          .select('*')
          .eq('project_id', id)
          .order('sort_order')
        
        if (spacesData) {
          setSpaces(spacesData.map(dbSpaceToSpace))
        }
      }
    }
  }

  // Auto-save
  const saveProject = useCallback(async () => {
    if (!currentProject || !isSupabaseConfigured()) return
    
    setSaving(true)
    try {
      // Save project
      await supabase
        .from('plumbing_projects')
        .upsert(projectToDbProject(currentProject) as never)
      
      // Save spaces
      for (const space of spaces) {
        await supabase
          .from('plumbing_spaces')
          .upsert(spaceToDbSpace(space) as never)
      }
      
      setSynced(true)
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }, [currentProject, spaces])

  // Debounced auto-save
  useEffect(() => {
    if (!currentProject) return
    setSynced(false)
    const timer = setTimeout(saveProject, 2000)
    return () => clearTimeout(timer)
  }, [currentProject, spaces, saveProject])

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🐐</div>
          <div className="text-surface-400">Loading project...</div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'spaces', label: '🏠 Spaces', description: 'Add & edit spaces' },
    { id: 'fixture-units', label: '🚰 Fixture Units', description: 'WSFU / DFU' },
    { id: 'dhw', label: '🔥 DHW', description: 'Hot water sizing' },
    { id: 'pipe-sizing', label: '📏 Pipe Sizing', description: 'Water & drain' },
    { id: 'gas', label: '🔥 Gas', description: 'Gas piping' },
    { id: 'results', label: '📊 Results', description: 'Reports & export' },
  ]

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-lg border-b border-surface-800">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="hover:opacity-80 transition-opacity"
                title="Back to Hub"
              >
                <Logo size="sm" showText={false} />
              </button>
              <button
                onClick={() => navigate('/plumbing')}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                title="Back to Projects"
              >
                <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚿</span>
                <div>
                  <h1 className="text-lg font-semibold text-white">{currentProject.name} 🐐</h1>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-surface-400">Plumbing Calculator</span>
                    {saving && <span className="text-pink-400 animate-pulse">💾 Saving...</span>}
                    {!saving && synced && <span className="text-emerald-400">✓ Synced</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* User menu */}
            <UserMenu />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-4 sm:px-6 pb-2">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-pink-600 text-white'
                    : 'text-surface-400 hover:text-white hover:bg-surface-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'spaces' && <SpaceCanvas />}
        {activeTab === 'fixture-units' && <FixtureUnitsCalc />}
        {activeTab === 'dhw' && <DHWCalc />}
        {activeTab === 'pipe-sizing' && <PipeSizingCalc />}
        {activeTab === 'gas' && <GasPipingCalc />}
        {activeTab === 'results' && <PlumbingResults />}
      </main>
    </div>
  )
}

// Database conversion helpers
function dbProjectToProject(db: Record<string, unknown>): PlumbingProject {
  return {
    id: db.id as string,
    userId: db.user_id as string,
    name: (db.name as string) || 'Untitled Project',
    settings: (db.settings as PlumbingProjectSettings) || { ...defaultPlumbingSettings },
    linkedScanId: db.linked_scan_id as string | undefined,
    createdAt: new Date(db.created_at as string),
    updatedAt: new Date(db.updated_at as string),
  }
}

function projectToDbProject(project: PlumbingProject): Record<string, unknown> {
  return {
    id: project.id,
    user_id: project.userId,
    name: project.name,
    settings: project.settings,
    linked_scan_id: project.linkedScanId,
    updated_at: new Date().toISOString(),
  }
}

function dbSpaceToSpace(db: Record<string, unknown>): PlumbingSpace {
  return {
    id: db.id as string,
    projectId: db.project_id as string,
    name: (db.name as string) || 'Untitled Space',
    sf: (db.sf as number) || 0,
    fixtures: (db.fixtures as PlumbingSpace['fixtures']) || {},
    occupancy: db.occupancy as number | undefined,
    notes: db.notes as string | undefined,
    sortOrder: (db.sort_order as number) || 0,
  }
}

function spaceToDbSpace(space: PlumbingSpace): Record<string, unknown> {
  return {
    id: space.id,
    project_id: space.projectId,
    name: space.name,
    sf: space.sf,
    fixtures: space.fixtures,
    occupancy: space.occupancy,
    notes: space.notes,
    sort_order: space.sortOrder,
  }
}
