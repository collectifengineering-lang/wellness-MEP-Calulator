import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import { useHVACStore, createHVACProject, defaultHVACProjectSettings } from '../../store/useHVACStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import type { Project, Zone } from '../../types'

interface HVACProjectSummary {
  id: string
  name: string
  created_at: string
  updated_at: string
  settings: {
    locationId?: string | null
  }
}

export default function HVACHome() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setCurrentProject, setSpaces, setZones, setSystems } = useHVACStore()
  const [projects, setProjects] = useState<HVACProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [conceptMEPProjects, setConceptMEPProjects] = useState<Project[]>([])
  const [loadingConceptMEP, setLoadingConceptMEP] = useState(false)
  
  // Load projects
  useEffect(() => {
    loadProjects()
  }, [user])
  
  const loadProjects = async () => {
    setLoading(true)
    
    if (isSupabaseConfigured() && user) {
      try {
        const { data, error } = await supabase
          .from('hvac_projects')
          .select('id, name, created_at, updated_at, settings')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
        
        if (error) throw error
        setProjects(data || [])
      } catch (error) {
        console.error('Error loading HVAC projects:', error)
      }
    }
    
    setLoading(false)
  }
  
  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return
    
    const project = createHVACProject(user.id, newProjectName.trim())
    
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('hvac_projects').insert({
          id: project.id,
          user_id: project.userId,
          name: project.name,
          settings: project.settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
      } catch (error) {
        console.error('Error creating project:', error)
        return
      }
    }
    
    setCurrentProject(project)
    setSpaces([])
    setZones([])
    setSystems([])
    setShowNewModal(false)
    setNewProjectName('')
    navigate(`/hvac/${project.id}`)
  }
  
  const handleOpenProject = (projectId: string) => {
    navigate(`/hvac/${projectId}`)
  }
  
  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this project? This cannot be undone. 🐐')) return
    
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('hvac_spaces').delete().eq('project_id', projectId)
        await supabase.from('hvac_zones').delete().eq('project_id', projectId)
        await supabase.from('hvac_systems').delete().eq('project_id', projectId)
        await supabase.from('hvac_projects').delete().eq('id', projectId)
      } catch (error) {
        console.error('Error deleting project:', error)
        return
      }
    }
    
    setProjects(projects.filter(p => p.id !== projectId))
  }

  const handleCopyProject = async (project: HVACProjectSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    
    const newProject = createHVACProject(user.id, `${project.name} (Copy)`)
    // Merge with defaults to ensure all required fields exist
    newProject.settings = { ...defaultHVACProjectSettings, ...project.settings }
    
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('hvac_projects').insert({
          id: newProject.id,
          user_id: newProject.userId,
          name: newProject.name,
          settings: newProject.settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        
        // Copy spaces, zones, systems
        const { data: sourceSpaces } = await supabase
          .from('hvac_spaces')
          .select('*')
          .eq('project_id', project.id)
        
        if (sourceSpaces && sourceSpaces.length > 0) {
          const copiedSpaces = sourceSpaces.map((s: Record<string, unknown>) => ({
            ...s,
            id: crypto.randomUUID(),
            project_id: newProject.id,
          }))
          await supabase.from('hvac_spaces').insert(copiedSpaces as never)
        }
        
        const { data: sourceZones } = await supabase
          .from('hvac_zones')
          .select('*')
          .eq('project_id', project.id)
        
        if (sourceZones && sourceZones.length > 0) {
          const copiedZones = sourceZones.map((z: Record<string, unknown>) => ({
            ...z,
            id: crypto.randomUUID(),
            project_id: newProject.id,
          }))
          await supabase.from('hvac_zones').insert(copiedZones as never)
        }
        
        const { data: sourceSystems } = await supabase
          .from('hvac_systems')
          .select('*')
          .eq('project_id', project.id)
        
        if (sourceSystems && sourceSystems.length > 0) {
          const copiedSystems = sourceSystems.map((s: Record<string, unknown>) => ({
            ...s,
            id: crypto.randomUUID(),
            project_id: newProject.id,
          }))
          await supabase.from('hvac_systems').insert(copiedSystems as never)
        }
      } catch (error) {
        console.error('Error copying project:', error)
        return
      }
    }
    
    await loadProjects()
  }

  const handleRenameProject = async (projectId: string) => {
    if (!editingName.trim()) {
      setEditingProjectId(null)
      return
    }
    
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('hvac_projects')
        .update({ name: editingName.trim(), updated_at: new Date().toISOString() } as never)
        .eq('id', projectId)
      
      if (error) {
        console.error('Error renaming project:', error)
        return
      }
    }
    
    setEditingProjectId(null)
    await loadProjects()
  }

  // Load Concept MEP projects for import
  const loadConceptMEPProjects = async () => {
    setLoadingConceptMEP(true)
    
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (!error && data) {
        setConceptMEPProjects(data as Project[])
      }
    } else {
      const stored = localStorage.getItem('concept_mep_projects')
      if (stored) {
        setConceptMEPProjects(JSON.parse(stored))
      }
    }
    
    setLoadingConceptMEP(false)
    setShowImportModal(true)
  }

  // Import a Concept MEP project
  const handleImportFromConceptMEP = async (sourceProject: Project) => {
    if (!user) return
    
    const newProject = createHVACProject(user.id, `${sourceProject.name} (HVAC Import)`)
    
    // Load zones from the source project
    let zones: Zone[] = []
    
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('zones')
        .select('*')
        .eq('project_id', sourceProject.id)
        .order('sort_order')
      
      if (data) {
        zones = data as Zone[]
      }
    } else {
      const stored = localStorage.getItem(`zones_${sourceProject.id}`)
      if (stored) {
        zones = JSON.parse(stored)
      }
    }

    // Create the HVAC project
    if (isSupabaseConfigured()) {
      const { error: projectError } = await supabase
        .from('hvac_projects')
        .insert({
          id: newProject.id,
          user_id: newProject.userId,
          name: newProject.name,
          settings: newProject.settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
      
      if (projectError) {
        console.error('Error creating imported project:', projectError)
        alert('Failed to import project')
        return
      }

      // Convert zones to HVAC spaces
      if (zones.length > 0) {
        const hvacSpaces = zones.map((zone, index) => ({
          id: crypto.randomUUID(),
          project_id: newProject.id,
          name: zone.name,
          space_type: mapZoneTypeToASHRAE(zone.type),
          area_sf: zone.sf,
          ceiling_height_ft: 10,
          zone_id: null,
          notes: `Imported from Concept MEP: ${zone.type}`,
          sort_order: index,
        }))
        
        await supabase.from('hvac_spaces').insert(hvacSpaces as never)
      }
    }

    setShowImportModal(false)
    await loadProjects()
    
    // Open the newly imported project
    navigate(`/hvac/${newProject.id}`)
  }

  // Map Concept MEP zone types to ASHRAE 62.1 space types
  const mapZoneTypeToASHRAE = (zoneType: string): string => {
    const mapping: Record<string, string> = {
      'office': 'office',
      'conference': 'conference_meeting',
      'lobby': 'lobby_public',
      'reception': 'reception',
      'retail': 'retail_sales',
      'restaurant': 'dining_room',
      'kitchen': 'kitchen_cooking',
      'gym': 'health_club_weights',
      'fitness': 'health_club_aerobics',
      'locker_room': 'spa_locker_room',
      'spa': 'spa_treatment',
      'pool': 'swimming_pool',
      'classroom': 'classroom_9plus',
      'hotel_room': 'bedroom_dorm',
      'corridor': 'corridor',
      'storage': 'storage_conditioned',
      'mechanical': 'electrical_room',
      'restroom': 'toilet_public',
      'laundry_commercial': 'hotel_laundry',
      'yoga_studio': 'yoga_studio',
      'pilates_studio': 'pilates_studio',
      'sauna': 'sauna',
      'steam_room': 'steam_room',
    }
    return mapping[zoneType] || 'office'
  }
  
  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-surface-700 bg-surface-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
              <Logo size="sm" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐐💨</span>
              <h1 className="text-xl font-bold text-white">HVAC / Ventilation</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
            >
              ← Back to Hub
            </button>
            {user && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Project HVAC Calculator 🐐💨</h2>
            <p className="text-surface-400 mt-1">Even GOATs need fresh air! ASHRAE 62.1 ventilation calculations 🌬️</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadConceptMEPProjects}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import from Concept MEP
            </button>
            <button
              onClick={() => navigate('/hvac/calculators')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
            >
              🧮 Calculators
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-bounce">🐐💨</div>
              <p className="text-surface-400">Loading projects... the GOAT is catching its breath!</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🐐🌬️</div>
            <h3 className="text-lg font-medium text-white mb-2">No HVAC projects yet - it's getting stuffy!</h3>
            <p className="text-surface-400 mb-6">Create your first project and let the GOAT breathe 💨</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                className="bg-surface-800 border border-surface-700 rounded-xl p-6 hover:border-cyan-500/50 transition-colors cursor-pointer group"
                onClick={() => editingProjectId !== project.id && handleOpenProject(project.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-2xl">🐐💨</span>
                  </div>
                  <div className="flex gap-1">
                    {/* Copy Button */}
                    <button
                      onClick={(e) => handleCopyProject(project, e)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-emerald-500/20 text-surface-500 hover:text-emerald-400 transition-all"
                      title="Copy Project"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {/* Rename Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingProjectId(project.id)
                        setEditingName(project.name)
                      }}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-500/20 text-surface-500 hover:text-blue-400 transition-all"
                      title="Rename Project"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-all"
                      title="Delete Project"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Project Name - Editable or Display */}
                {editingProjectId === project.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleRenameProject(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameProject(project.id)
                      if (e.key === 'Escape') setEditingProjectId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-lg font-semibold bg-surface-700 border border-cyan-500 rounded px-2 py-1 text-white mb-2 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                )}
                
                <p className="text-sm text-surface-400 mb-4">
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </p>
                
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <span className="px-2 py-1 bg-surface-700 rounded">ASHRAE 62.1</span>
                  <span className="px-2 py-1 bg-surface-700 rounded">ventilation</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6">New HVAC Project 🐐💨</h2>
            
            <div className="mb-6">
              <label className="block text-sm text-surface-400 mb-2">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., 123 Main St HVAC"
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewModal(false)
                  setNewProjectName('')
                }}
                className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-surface-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Create Project 🐐
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Concept MEP Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-2xl p-6 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Import from Concept MEP 🏗️</h2>
                <p className="text-sm text-surface-400 mt-1">
                  Select a project to import. Creates HVAC spaces from zones.
                </p>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-surface-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loadingConceptMEP ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4 animate-bounce">🐐</div>
                  <p className="text-surface-400">Loading Concept MEP projects...</p>
                </div>
              ) : conceptMEPProjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-surface-400">No Concept MEP projects found</p>
                  <p className="text-sm text-surface-500 mt-1">Create one in the Concept MEP Design section first</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conceptMEPProjects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleImportFromConceptMEP(project)}
                      className="w-full flex items-center gap-4 p-4 bg-surface-700/50 hover:bg-surface-700 rounded-xl text-left transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/30">
                        <span className="text-2xl">🏗️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{project.name}</h3>
                        <p className="text-sm text-surface-400">
                          {project.targetSF?.toLocaleString() || 0} SF target
                          {project.updatedAt && ` • Updated ${new Date(project.updatedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-violet-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Import →
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-surface-700 mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
