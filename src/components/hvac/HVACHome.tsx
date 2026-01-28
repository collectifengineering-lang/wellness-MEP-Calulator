import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import { useHVACStore, createHVACProject } from '../../store/useHVACStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'

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
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  
  // Load projects
  useEffect(() => {
    loadProjects()
  }, [user])
  
  const loadProjects = async () => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false)
      return
    }
    
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
    } finally {
      setLoading(false)
    }
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
    navigate(`/hvac/${project.id}`)
  }
  
  const handleOpenProject = (projectId: string) => {
    navigate(`/hvac/${projectId}`)
  }
  
  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this project? This cannot be undone.')) return
    
    if (isSupabaseConfigured()) {
      try {
        // Delete related data first
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
  
  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-surface-700 bg-surface-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌡️</span>
            <h1 className="text-xl font-bold text-white">HVAC Ventilation Calculator</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
            >
              ← Back to Hub
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🐐💨</div>
          <h2 className="text-3xl font-bold text-white mb-2">HVAC Ventilation Projects</h2>
          <p className="text-surface-400">
            Even GOATs need fresh air! ASHRAE 62.1 ventilation calculations 🌬️
          </p>
        </div>
        
        {/* New Project Button */}
        <div className="mb-8">
          {!showNewProject ? (
            <button
              onClick={() => setShowNewProject(true)}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">+</span>
              Create New HVAC Project
            </button>
          ) : (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  autoFocus
                  className="flex-1 px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-surface-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewProject(false)
                    setNewProjectName('')
                  }}
                  className="px-4 py-3 text-surface-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Projects List */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">HVAC Projects</h3>
          
          {loading ? (
            <div className="text-center py-12 text-surface-400">
              <div className="text-4xl mb-4 animate-bounce">🐐💨</div>
              Loading projects... the GOAT is catching its breath!
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 bg-surface-800 rounded-xl border border-surface-700">
              <div className="text-4xl mb-4">🐐🌬️</div>
              <p className="text-surface-400">No HVAC projects yet - it's getting stuffy in here!</p>
              <p className="text-sm text-surface-500 mt-1">Create your first project and let the GOAT breathe 💨</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project.id)}
                  className="bg-surface-800 rounded-xl border border-surface-700 p-4 cursor-pointer hover:border-cyan-600 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium group-hover:text-cyan-400 transition-colors">
                        {project.name}
                      </h4>
                      <p className="text-sm text-surface-400 mt-1">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="p-2 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete project"
                      >
                        🗑️
                      </button>
                      <span className="text-surface-500 group-hover:text-cyan-400 transition-colors">
                        →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Features */}
        <div className="mt-12 bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">What's Included:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-300">ASHRAE 62.1 Ventilation Rates</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-300">Space → Zone → System Hierarchy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-300">Multi-Zone VAV Calculations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-300">ERV Pre-Treatment Savings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-300">ASHRAE Design Temperatures</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-300">Ventilation Load Calculations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-300">SMACNA Ductulator</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-300">Export to CSV</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
