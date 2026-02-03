import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import { useHVACStore, createHVACProject, defaultHVACProjectSettings, HVACSpace } from '../../store/useHVACStore'
import { useScannerStore, ScanProject } from '../../store/useScannerStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import type { Project, Zone } from '../../types'
import { ASHRAE62_SPACE_TYPES, matchSpaceNameToASHRAE, getSpaceType, ASHRAE62SpaceType } from '../../data/ashrae62'

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
  const { setCurrentProject, setSpaces, setZones, setSystems, addSpace: addHVACSpace } = useHVACStore()
  const { scans } = useScannerStore()
  const [projects, setProjects] = useState<HVACProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [conceptMEPProjects, setConceptMEPProjects] = useState<Project[]>([])
  const [loadingConceptMEP, setLoadingConceptMEP] = useState(false)
  
  // Plan Scanner import state
  const [showPlanScanImportModal, setShowPlanScanImportModal] = useState(false)
  const [selectedScanProject, setSelectedScanProject] = useState<ScanProject | null>(null)
  const [showSpaceTypeMatching, setShowSpaceTypeMatching] = useState(false)
  const [spaceTypeMappings, setSpaceTypeMappings] = useState<Array<{
    spaceId: string
    spaceName: string
    suggestedTypeId: string  // ASHRAE space type ID
    selectedTypeId: string
    areaSf: number
    floor?: string
  }>>([])
  
  // Group ASHRAE space types by category
  const spaceTypesByCategory = useMemo(() => {
    const categories: Record<string, ASHRAE62SpaceType[]> = {}
    ASHRAE62_SPACE_TYPES.forEach(type => {
      if (!categories[type.category]) {
        categories[type.category] = []
      }
      categories[type.category].push(type)
    })
    return categories
  }, [])
  
  // Load projects
  useEffect(() => {
    loadProjects()
  }, [user])
  
  const loadProjects = async () => {
    setLoading(true)
    
    if (isSupabaseConfigured() && user) {
      try {
        // Load ALL projects (shared workspace - all users can see all projects)
        const { data, error } = await supabase
          .from('hvac_projects')
          .select('id, name, created_at, updated_at, settings, user_id')
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
  
  // Plan Scanner import functions
  const handleSelectScanProject = (scanProject: ScanProject) => {
    setSelectedScanProject(scanProject)
    
    // Initialize space type mappings
    const mappings = scanProject.extractedSpaces.map(space => {
      const suggestedTypeId = matchSpaceNameToASHRAE(space.name)
      return {
        spaceId: space.id,
        spaceName: space.name,
        suggestedTypeId,
        selectedTypeId: suggestedTypeId || 'office',
        areaSf: space.sf,
        floor: space.floor,
      }
    })
    setSpaceTypeMappings(mappings)
    setShowPlanScanImportModal(false)
    setShowSpaceTypeMatching(true)
  }
  
  const handleImportFromPlanScan = async () => {
    if (!user || !selectedScanProject) return
    
    const newProject = createHVACProject(user.id, `${selectedScanProject.name} (HVAC Import)`)
    
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
    }
    
    setCurrentProject(newProject)
    setSpaces([])
    setZones([])
    setSystems([])
    
    // Create HVAC spaces from mappings
    for (const mapping of spaceTypeMappings) {
      const extractedSpace = selectedScanProject.extractedSpaces.find(s => s.id === mapping.spaceId)
      if (!extractedSpace) continue
      
      const ashraeType = ASHRAE62_SPACE_TYPES.find(t => t.id === mapping.selectedTypeId)
      
      // Calculate ASHRAE occupancy from area and density
      const ashraeOccupancy = ashraeType 
        ? Math.ceil(extractedSpace.sf / (1000 / ashraeType.defaultOccupancy))
        : Math.ceil(extractedSpace.sf / 100)
      
      // Use the greater of seat count or ASHRAE occupancy
      const finalOccupancy = Math.max(
        extractedSpace.seatCountManual ?? extractedSpace.seatCountAI ?? 0,
        ashraeOccupancy
      )
      
      const hvacSpace: Omit<HVACSpace, 'id'> = {
        projectId: newProject.id,
        name: extractedSpace.name,
        ashraeSpaceType: mapping.selectedTypeId,
        areaSf: extractedSpace.sf,
        ceilingHeightFt: 10, // Default
        occupancyOverride: finalOccupancy,
        zoneId: null,
        notes: `Imported from Plan Scan. ASHRAE type: ${ashraeType?.name || 'Unknown'}`,
        floor: extractedSpace.floor,
      }
      
      addHVACSpace(hvacSpace)
    }
    
    // Save spaces to Supabase
    if (isSupabaseConfigured()) {
      const hvacSpaces = spaceTypeMappings.map((mapping, index) => {
        const extractedSpace = selectedScanProject.extractedSpaces.find(s => s.id === mapping.spaceId)
        const ashraeType = ASHRAE62_SPACE_TYPES.find(t => t.id === mapping.selectedTypeId)
        const ashraeOccupancy = ashraeType 
          ? Math.ceil((extractedSpace?.sf || 0) / (1000 / ashraeType.defaultOccupancy))
          : Math.ceil((extractedSpace?.sf || 0) / 100)
        
        return {
          id: crypto.randomUUID(),
          project_id: newProject.id,
          name: extractedSpace?.name || mapping.spaceName,
          ashrae_space_type: mapping.selectedTypeId,
          area_sf: extractedSpace?.sf || mapping.areaSf,
          ceiling_height_ft: 10,
          occupancy_override: Math.max(
            extractedSpace?.seatCountManual ?? extractedSpace?.seatCountAI ?? 0,
            ashraeOccupancy
          ),
          zone_id: null,
          notes: `Imported from Plan Scan. ASHRAE type: ${ashraeType?.name || 'Unknown'}`,
          floor: extractedSpace?.floor || mapping.floor,
          sort_order: index,
        }
      })
      
      await supabase.from('hvac_spaces').insert(hvacSpaces as never)
    }
    
    setShowSpaceTypeMatching(false)
    setSelectedScanProject(null)
    await loadProjects()
    
    // Navigate to the new project
    navigate(`/hvac/${newProject.id}`)
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
              onClick={() => setShowPlanScanImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              📐 Import from Plan Scan
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
      
      {/* Import from Plan Scan Modal */}
      {showPlanScanImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-2xl p-6 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Import from Plan Scan 📐</h2>
                <p className="text-sm text-surface-400 mt-1">
                  Select a scan project to import spaces with ASHRAE 62.1 type matching.
                </p>
              </div>
              <button 
                onClick={() => setShowPlanScanImportModal(false)}
                className="text-surface-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {scans.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📐</div>
                  <p className="text-surface-400">No Plan Scan projects found</p>
                  <p className="text-sm text-surface-500 mt-1">Create one in the Plan Scanner section first</p>
                  <button
                    onClick={() => {
                      setShowPlanScanImportModal(false)
                      navigate('/plan-scanner')
                    }}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                  >
                    Go to Plan Scanner
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scans.filter(s => s.extractedSpaces.length > 0).map(scanProject => (
                    <button
                      key={scanProject.id}
                      onClick={() => handleSelectScanProject(scanProject)}
                      className="w-full flex items-center gap-4 p-4 bg-surface-700/50 hover:bg-surface-700 rounded-xl text-left transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30">
                        <span className="text-2xl">📐</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{scanProject.name}</h3>
                        <p className="text-sm text-surface-400">
                          {scanProject.extractedSpaces.length} spaces • {scanProject.drawings.length} drawings
                          {scanProject.updatedAt && ` • Updated ${new Date(scanProject.updatedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-emerald-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-surface-700 mt-4">
              <button
                onClick={() => setShowPlanScanImportModal(false)}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ASHRAE Space Type Matching Modal */}
      {showSpaceTypeMatching && selectedScanProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-700">
              <div>
                <h2 className="text-xl font-bold text-white">Match Spaces to ASHRAE 62.1 Types ❄️</h2>
                <p className="text-sm text-surface-400 mt-1">
                  Review AI suggestions and adjust space types for accurate ventilation calculations
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSpaceTypeMatching(false)
                  setSelectedScanProject(null)
                }}
                className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {spaceTypeMappings.map((mapping, index) => {
                  const selectedType = ASHRAE62_SPACE_TYPES.find(t => t.id === mapping.selectedTypeId)
                  
                  return (
                    <div 
                      key={mapping.spaceId}
                      className="flex items-center gap-4 p-4 bg-surface-700/50 rounded-xl border border-surface-600"
                    >
                      {/* Space Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">{mapping.spaceName}</span>
                          {mapping.floor && (
                            <span className="px-2 py-0.5 rounded bg-violet-600/30 text-violet-300 text-xs">
                              {mapping.floor}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
                          <span>{mapping.areaSf?.toLocaleString() || 0} SF</span>
                          {mapping.suggestedTypeId && (
                            <span className="text-emerald-400">
                              AI suggested: {getSpaceType(mapping.suggestedTypeId)?.name || mapping.suggestedTypeId}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="text-surface-500">→</div>
                      
                      {/* ASHRAE Type Selector */}
                      <div className="w-80">
                        <select
                          value={mapping.selectedTypeId}
                          onChange={(e) => {
                            setSpaceTypeMappings(prev => prev.map((m, i) => 
                              i === index ? { ...m, selectedTypeId: e.target.value } : m
                            ))
                          }}
                          className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                        >
                          {Object.entries(spaceTypesByCategory).map(([category, types]) => (
                            <optgroup key={category} label={category}>
                              {types.map(type => (
                                <option key={type.id} value={type.id}>
                                  {type.name} (Rp: {type.Rp}, Ra: {type.Ra})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {selectedType && (
                          <div className="mt-1 text-xs text-surface-500">
                            Default: {selectedType.defaultOccupancy} people/1000 SF
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-surface-700 bg-surface-800/50">
              <div className="text-sm text-surface-400">
                {spaceTypeMappings.length} spaces ready to import
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSpaceTypeMatching(false)
                    setSelectedScanProject(null)
                  }}
                  className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportFromPlanScan}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  Import to HVAC 🐐
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
