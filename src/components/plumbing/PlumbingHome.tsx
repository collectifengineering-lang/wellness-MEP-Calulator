import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import { useAuthStore } from '../../store/useAuthStore'
import { usePlumbingStore, createPlumbingProject, type PlumbingProject } from '../../store/usePlumbingStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export default function PlumbingHome() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setCurrentProject, setSpaces } = usePlumbingStore()
  const [projects, setProjects] = useState<PlumbingProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('plumbing_projects')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (!error && data) {
        setProjects(data.map(dbProjectToProject))
      }
    } else {
      // Local storage fallback
      const stored = localStorage.getItem('plumbing_projects')
      if (stored) {
        setProjects(JSON.parse(stored))
      }
    }
    
    setLoading(false)
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    
    const userId = user?.id || 'dev-user'
    const newProject = createPlumbingProject(userId, newProjectName.trim())
    
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('plumbing_projects')
        .insert({
          id: newProject.id,
          user_id: newProject.userId,
          name: newProject.name,
          settings: newProject.settings,
        } as never)
      
      if (error) {
        console.error('Error creating project:', error)
        return
      }
    } else {
      const updated = [newProject, ...projects]
      localStorage.setItem('plumbing_projects', JSON.stringify(updated))
    }
    
    setCurrentProject(newProject)
    setSpaces([])
    setShowNewModal(false)
    setNewProjectName('')
    navigate(`/plumbing/project/${newProject.id}`)
  }

  const handleOpenProject = async (project: PlumbingProject) => {
    setCurrentProject(project)
    
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('plumbing_spaces')
        .select('*')
        .eq('project_id', project.id)
        .order('sort_order')
      
      if (data) {
        setSpaces(data.map(dbSpaceToSpace))
      }
    } else {
      const stored = localStorage.getItem(`plumbing_spaces_${project.id}`)
      if (stored) {
        setSpaces(JSON.parse(stored))
      } else {
        setSpaces([])
      }
    }
    
    navigate(`/plumbing/project/${project.id}`)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone. 🐐')) return
    
    if (isSupabaseConfigured()) {
      await supabase.from('plumbing_projects').delete().eq('id', projectId)
    } else {
      const updated = projects.filter(p => p.id !== projectId)
      localStorage.setItem('plumbing_projects', JSON.stringify(updated))
      setProjects(updated)
    }
    
    await loadProjects()
  }

  const handleCopyProject = async (project: PlumbingProject) => {
    const userId = user?.id || 'dev-user'
    const copiedProject = createPlumbingProject(userId, `${project.name} (Copy)`)
    copiedProject.settings = { ...project.settings }
    
    if (isSupabaseConfigured()) {
      // Create copied project
      const { error: projectError } = await supabase
        .from('plumbing_projects')
        .insert({
          id: copiedProject.id,
          user_id: copiedProject.userId,
          name: copiedProject.name,
          settings: copiedProject.settings,
        } as never)
      
      if (projectError) {
        console.error('Error copying project:', projectError)
        return
      }
      
      // Copy spaces
      const { data: sourceSpaces } = await supabase
        .from('plumbing_spaces')
        .select('*')
        .eq('project_id', project.id)
      
      if (sourceSpaces && sourceSpaces.length > 0) {
        const copiedSpaces = sourceSpaces.map((space: Record<string, unknown>) => ({
          ...space,
          id: crypto.randomUUID(),
          project_id: copiedProject.id,
        }))
        
        await supabase.from('plumbing_spaces').insert(copiedSpaces as never)
      }
    } else {
      const updated = [copiedProject, ...projects]
      localStorage.setItem('plumbing_projects', JSON.stringify(updated))
      
      // Copy spaces locally
      const sourceSpaces = localStorage.getItem(`plumbing_spaces_${project.id}`)
      if (sourceSpaces) {
        const spaces = JSON.parse(sourceSpaces).map((s: Record<string, unknown>) => ({
          ...s,
          id: crypto.randomUUID(),
          projectId: copiedProject.id,
        }))
        localStorage.setItem(`plumbing_spaces_${copiedProject.id}`, JSON.stringify(spaces))
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
        .from('plumbing_projects')
        .update({ name: editingName.trim(), updated_at: new Date().toISOString() } as never)
        .eq('id', projectId)
      
      if (error) {
        console.error('Error renaming project:', error)
        return
      }
    } else {
      const updated = projects.map(p =>
        p.id === projectId ? { ...p, name: editingName.trim(), updatedAt: new Date().toISOString() } : p
      )
      localStorage.setItem('plumbing_projects', JSON.stringify(updated))
    }
    
    setEditingProjectId(null)
    await loadProjects()
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
              <span className="text-2xl">🚿</span>
              <h1 className="text-xl font-bold text-white">Plumbing / Fire Protection</h1>
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
            <h2 className="text-2xl font-bold text-white">Your Plumbing Projects 🐐</h2>
            <p className="text-surface-400 mt-1">Select a project or create a new one</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-bounce">🐐</div>
              <p className="text-surface-400">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚿🐐</div>
            <h3 className="text-lg font-medium text-white mb-2">No plumbing projects yet!</h3>
            <p className="text-surface-400 mb-6">Get started by creating your first project</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium transition-colors"
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
                className="bg-surface-800 border border-surface-700 rounded-xl p-6 hover:border-pink-500/50 transition-colors cursor-pointer group"
                onClick={() => editingProjectId !== project.id && handleOpenProject(project)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <span className="text-2xl">🚿</span>
                  </div>
                  <div className="flex gap-1">
                    {/* Copy Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyProject(project)
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProject(project.id)
                      }}
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
                    className="w-full text-lg font-semibold bg-surface-700 border border-pink-500 rounded px-2 py-1 text-white mb-2 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                )}
                
                <p className="text-sm text-surface-400 mb-4">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </p>
                
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <span className="px-2 py-1 bg-surface-700 rounded">{project.settings.dhwSystemType}</span>
                  <span className="px-2 py-1 bg-surface-700 rounded">{project.settings.dhwHeaterType}</span>
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
            <h2 className="text-xl font-bold text-white mb-6">New Plumbing Project 🐐</h2>
            
            <div className="mb-6">
              <label className="block text-sm text-surface-400 mb-2">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., 123 Main St Plumbing"
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-pink-500 focus:outline-none"
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
                className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-surface-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Create Project 🐐
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Database conversion helpers
function dbProjectToProject(db: Record<string, unknown>): PlumbingProject {
  return {
    id: db.id as string,
    userId: db.user_id as string,
    name: (db.name as string) || 'Untitled Project',
    settings: (db.settings as PlumbingProject['settings']) || {
      coldWaterVelocityFps: 8,
      hotWaterVelocityFps: 5,
      dhwHeaterType: 'gas',
      dhwSystemType: 'storage',
      dhwStorageTemp: 140,
      dhwDeliveryTemp: 110,
      coldWaterTemp: 55,
      dhwRecoveryFactor: 0.7,
      dhwDemandFactor: 0.7,
      gasDiversityFactor: 0.8,
    },
    linkedScanId: db.linked_scan_id as string | undefined,
    createdAt: new Date(db.created_at as string),
    updatedAt: new Date(db.updated_at as string),
  }
}

function dbSpaceToSpace(db: Record<string, unknown>) {
  return {
    id: db.id as string,
    projectId: db.project_id as string,
    name: (db.name as string) || 'Untitled Space',
    sf: (db.sf as number) || 0,
    fixtures: (db.fixtures as Record<string, number>) || {},
    occupancy: db.occupancy as number | undefined,
    notes: db.notes as string | undefined,
    sortOrder: (db.sort_order as number) || 0,
  }
}
