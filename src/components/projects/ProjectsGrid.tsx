import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserMenu from '../auth/UserMenu'
import NewProjectModal from './NewProjectModal'
import ProjectCard from './ProjectCard'
import { useAuthStore } from '../../store/useAuthStore'
import { useProjectStore, createNewProject } from '../../store/useProjectStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Project, ClimateType } from '../../types'

export default function ProjectsGrid() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setCurrentProject, setZones } = useProjectStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (!error && data) {
        setProjects(data.map(dbProjectToProject))
      }
    } else {
      // Development: load from localStorage
      const stored = localStorage.getItem('mep_projects')
      if (stored) {
        setProjects(JSON.parse(stored))
      }
    }
    
    setLoading(false)
  }

  const handleCreateProject = async (name: string, targetSF: number, climate: ClimateType, electricPrimary: boolean) => {
    const userId = user?.id || 'dev-user'
    const newProject = createNewProject(userId, name, targetSF, climate, electricPrimary)
    
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('projects')
        .insert(projectToDbProject(newProject) as unknown as never)
      
      if (error) {
        console.error('Error creating project:', error)
        return
      }
    } else {
      // Development: save to localStorage
      const updated = [newProject, ...projects]
      localStorage.setItem('mep_projects', JSON.stringify(updated))
      setProjects(updated)
    }
    
    setCurrentProject(newProject)
    setZones([])
    setShowNewModal(false)
    navigate(`/project/${newProject.id}`)
  }

  const handleOpenProject = async (project: Project) => {
    setCurrentProject(project)
    
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('zones')
        .select('*')
        .eq('project_id', project.id)
        .order('sort_order')
      
      if (data) {
        setZones(data.map(dbZoneToZone))
      }
    } else {
      // Development: load zones from localStorage
      const stored = localStorage.getItem(`mep_zones_${project.id}`)
      if (stored) {
        setZones(JSON.parse(stored))
      } else {
        setZones([])
      }
    }
    
    navigate(`/project/${project.id}`)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    if (isSupabaseConfigured()) {
      await supabase.from('projects').delete().eq('id', projectId)
    } else {
      const updated = projects.filter(p => p.id !== projectId)
      localStorage.setItem('mep_projects', JSON.stringify(updated))
      localStorage.removeItem(`mep_zones_${projectId}`)
      setProjects(updated)
    }
    
    await loadProjects()
  }

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-lg border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">MEP Calculator</h1>
                <p className="text-xs text-surface-400">Wellness Facility</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Your Projects</h2>
            <p className="text-surface-400 mt-1">Select a project to continue or create a new one</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
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
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
            <p className="text-surface-400 mb-6">Get started by creating your first project</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
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
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleOpenProject(project)}
                onDelete={() => handleDeleteProject(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  )
}

// Helper functions for database conversion
function dbProjectToProject(db: Record<string, unknown>): Project {
  return {
    id: db.id as string,
    userId: db.user_id as string,
    name: (db.name as string) || 'Untitled Project',
    targetSF: (db.target_sf as number) || 0,
    climate: (db.climate as ClimateType) || 'temperate',
    electricPrimary: db.electric_primary as boolean ?? true,
    dhwSettings: (db.dhw_settings as Project['dhwSettings']) || {
      heaterType: 'gas',
      gasEfficiency: 0.95,
      electricEfficiency: 0.98,
      storageTemp: 140,
      deliveryTemp: 110,
      coldWaterTemp: 55,
      peakDuration: 2,
    },
    electricalSettings: (db.electrical_settings as Project['electricalSettings']) || {
      voltage: 208,
      phase: 3,
      demandFactor: 0.90,
      powerFactor: 0.85,
      spareCapacity: 0.20,
    },
    mechanicalSettings: (db.mechanical_settings as Project['mechanicalSettings']) || {
      coolingKvaPerTon: 1.2,
      heatingKvaPerMbh: 0.293,
      poolChillerKvaPerTon: 1.5,
      dehumidKvaPerLbHr: 0.05,
      includeChiller: true,
      includeHeating: true,
      includePoolChiller: true,
      includeDehumid: true,
      includeDhw: true,
    },
    contingency: (db.contingency as number) || 0.25,
    resultAdjustments: (db.result_adjustments as Project['resultAdjustments']) || {
      hvacNotes: '',
      electricalNotes: '',
      gasNotes: '',
      waterSanitaryNotes: '',
      sprinklerNotes: '',
      fireAlarmNotes: '',
      overrides: {},
    },
    createdAt: new Date(db.created_at as string),
    updatedAt: new Date(db.updated_at as string),
  }
}

function projectToDbProject(project: Project): Record<string, unknown> {
  return {
    id: project.id,
    user_id: project.userId,
    name: project.name,
    target_sf: project.targetSF,
    climate: project.climate,
    electric_primary: project.electricPrimary,
    dhw_settings: project.dhwSettings,
    electrical_settings: project.electricalSettings,
    mechanical_settings: project.mechanicalSettings,
    contingency: project.contingency,
    result_adjustments: project.resultAdjustments,
  }
}

function dbZoneToZone(db: Record<string, unknown>): import('../../types').Zone {
  return {
    id: db.id as string,
    projectId: db.project_id as string,
    name: (db.name as string) || 'Untitled Zone',
    type: (db.zone_type as import('../../types').ZoneType) || 'custom',
    subType: (db.sub_type as 'electric' | 'gas') || 'electric',
    sf: (db.sf as number) || 0,
    color: (db.color as string) || '#64748b',
    fixtures: (db.fixtures as import('../../types').ZoneFixtures) || {
      showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0
    },
    rates: (db.rates as import('../../types').ZoneRates) || {
      lighting_w_sf: 1, receptacle_va_sf: 3, ventilation_cfm_sf: 0.15, exhaust_cfm_sf: 0, cooling_sf_ton: 400, heating_btuh_sf: 25
    },
    processLoads: (db.process_loads as import('../../types').ZoneProcessLoads) || {
      fixed_kw: 0, gas_mbh: 0, ventilation_cfm: 0, exhaust_cfm: 0, pool_heater_mbh: 0, dehumid_lb_hr: 0, flue_size_in: 0, ceiling_height_ft: 10
    },
    lineItems: (db.line_items as import('../../types').LineItem[]) || [],
    sortOrder: (db.sort_order as number) || 0,
  }
}
