import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import ProjectSettingsPanel from './ProjectSettingsPanel'
import HVACSpaceCanvas from './spaces/HVACSpaceCanvas'
import ZoneSystemTree from './organization/ZoneSystemTree'
import VentilationSummary from './results/VentilationSummary'
import ProjectCalculatorsTab from './calculators/ProjectCalculatorsTab'
import HVACResults from './results/HVACResults'
import { useHVACStore, defaultHVACProjectSettings } from '../../store/useHVACStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { HVACProject, HVACSpace, HVACZone, HVACSystem, HVACProjectSettings } from '../../store/useHVACStore'

type TabType = 'settings' | 'spaces' | 'organization' | 'ventilation' | 'calculators' | 'results'

export default function HVACWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { 
    currentProject, spaces, zones, systems,
    setCurrentProject, setSpaces, setZones, setSystems 
  } = useHVACStore()
  const [activeTab, setActiveTab] = useState<TabType>('settings')
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
      try {
        const { data: projectData } = await supabase
          .from('hvac_projects')
          .select('*')
          .eq('id', id)
          .single()

        if (projectData) {
          const project = dbProjectToProject(projectData)
          setCurrentProject(project)
          
          // Load spaces
          const { data: spacesData } = await supabase
            .from('hvac_spaces')
            .select('*')
            .eq('project_id', id)
            .order('sort_order')
          
          if (spacesData) {
            setSpaces(spacesData.map(dbSpaceToSpace))
          }
          
          // Load zones
          const { data: zonesData } = await supabase
            .from('hvac_zones')
            .select('*')
            .eq('project_id', id)
            .order('sort_order')
          
          if (zonesData) {
            setZones(zonesData.map(dbZoneToZone))
          }
          
          // Load systems
          const { data: systemsData } = await supabase
            .from('hvac_systems')
            .select('*')
            .eq('project_id', id)
            .order('sort_order')
          
          if (systemsData) {
            setSystems(systemsData.map(dbSystemToSystem))
          }
        }
      } catch (error) {
        console.error('Error loading HVAC project:', error)
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
        .from('hvac_projects')
        .upsert(projectToDbProject(currentProject) as never)
      
      // Save spaces
      for (const space of spaces) {
        await supabase
          .from('hvac_spaces')
          .upsert(spaceToDbSpace(space) as never)
      }
      
      // Save zones
      for (const zone of zones) {
        await supabase
          .from('hvac_zones')
          .upsert(zoneToDbZone(zone) as never)
      }
      
      // Save systems
      for (const system of systems) {
        await supabase
          .from('hvac_systems')
          .upsert(systemToDbSystem(system) as never)
      }
      
      setSynced(true)
    } catch (error) {
      console.error('Error saving HVAC project:', error)
    } finally {
      setSaving(false)
    }
  }, [currentProject, spaces, zones, systems])

  // Debounced auto-save
  useEffect(() => {
    if (!currentProject) return
    setSynced(false)
    const timer = setTimeout(saveProject, 2000)
    return () => clearTimeout(timer)
  }, [currentProject, spaces, zones, systems, saveProject])

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🐐💨</div>
          <div className="text-surface-400">Loading HVAC project... GOAT is ventilating!</div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'settings', label: '⚙️ Project', description: 'Location & design' },
    { id: 'spaces', label: '🏠 Spaces', description: 'Add & edit spaces' },
    { id: 'organization', label: '🔗 Zones & Systems', description: 'Organize hierarchy' },
    { id: 'ventilation', label: '💨 Ventilation', description: 'ASHRAE 62.1' },
    { id: 'calculators', label: '🧮 Calculators', description: 'Pool, Hydronic, Ducts' },
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
                onClick={() => navigate('/hvac')}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                title="Back to Projects"
              >
                <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌡️</span>
                <div>
                  <h1 className="text-lg font-semibold text-white">{currentProject.name} 🐐💨</h1>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-surface-400">HVAC Ventilation Calculator - Fresh Air for GOATs!</span>
                    {saving && <span className="text-cyan-400 animate-pulse">💾 Saving...</span>}
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
                    ? 'bg-cyan-600 text-white'
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
        {activeTab === 'settings' && <ProjectSettingsPanel />}
        {activeTab === 'spaces' && <HVACSpaceCanvas />}
        {activeTab === 'organization' && <ZoneSystemTree />}
        {activeTab === 'ventilation' && <VentilationSummary />}
        {activeTab === 'calculators' && <ProjectCalculatorsTab projectId={currentProject.id} locationId={currentProject.settings?.locationId} />}
        {activeTab === 'results' && <HVACResults />}
      </main>
    </div>
  )
}

// ============================================
// Database Conversion Helpers
// ============================================

function dbProjectToProject(db: Record<string, unknown>): HVACProject {
  return {
    id: db.id as string,
    userId: db.user_id as string,
    name: (db.name as string) || 'Untitled Project',
    settings: (db.settings as HVACProjectSettings) || { ...defaultHVACProjectSettings },
    linkedScanId: db.linked_scan_id as string | undefined,
    createdAt: new Date(db.created_at as string),
    updatedAt: new Date(db.updated_at as string),
  }
}

function projectToDbProject(project: HVACProject): Record<string, unknown> {
  return {
    id: project.id,
    user_id: project.userId,
    name: project.name,
    settings: project.settings,
    linked_scan_id: project.linkedScanId,
    updated_at: new Date().toISOString(),
  }
}

function dbSpaceToSpace(db: Record<string, unknown>): HVACSpace {
  return {
    id: db.id as string,
    projectId: db.project_id as string,
    name: (db.name as string) || 'Untitled Space',
    spaceType: (db.space_type as string) || 'office',
    areaSf: (db.area_sf as number) || 500,
    ceilingHeightFt: (db.ceiling_height as number) || 10,
    occupancyOverride: db.occupancy_override as number | undefined,
    zoneId: db.zone_id as string | undefined,
    notes: db.notes as string | undefined,
    sortOrder: (db.sort_order as number) || 0,
    // Ventilation overrides
    rpOverride: db.rp_override as number | undefined,
    raOverride: db.ra_override as number | undefined,
    // ACH-based ventilation
    ventilationAch: db.ventilation_ach as number | undefined,
    exhaustAch: db.exhaust_ach as number | undefined,
    supplyAch: db.supply_ach as number | undefined,
    // Fan tags
    exhaustFanTag: db.exhaust_fan_tag as string | undefined,
    supplyFanTag: db.supply_fan_tag as string | undefined,
  }
}

function spaceToDbSpace(space: HVACSpace): Record<string, unknown> {
  return {
    id: space.id,
    project_id: space.projectId,
    name: space.name,
    space_type: space.spaceType,
    area_sf: space.areaSf,
    ceiling_height: space.ceilingHeightFt,
    occupancy_override: space.occupancyOverride,
    zone_id: space.zoneId,
    notes: space.notes,
    sort_order: space.sortOrder,
    // Ventilation overrides
    rp_override: space.rpOverride,
    ra_override: space.raOverride,
    // ACH-based ventilation
    ventilation_ach: space.ventilationAch,
    exhaust_ach: space.exhaustAch,
    supply_ach: space.supplyAch,
    // Fan tags
    exhaust_fan_tag: space.exhaustFanTag,
    supply_fan_tag: space.supplyFanTag,
  }
}

function dbZoneToZone(db: Record<string, unknown>): HVACZone {
  return {
    id: db.id as string,
    projectId: db.project_id as string,
    name: (db.name as string) || 'Untitled Zone',
    ez: (db.ez as number) || 1.0,
    heatingSetpoint: (db.heating_setpoint as number) || 70,
    coolingSetpoint: (db.cooling_setpoint as number) || 75,
    systemId: db.system_id as string | undefined,
    sortOrder: (db.sort_order as number) || 0,
  }
}

function zoneToDbZone(zone: HVACZone): Record<string, unknown> {
  return {
    id: zone.id,
    project_id: zone.projectId,
    name: zone.name,
    ez: zone.ez,
    heating_setpoint: zone.heatingSetpoint,
    cooling_setpoint: zone.coolingSetpoint,
    system_id: zone.systemId,
    sort_order: zone.sortOrder,
  }
}

function dbSystemToSystem(db: Record<string, unknown>): HVACSystem {
  return {
    id: db.id as string,
    projectId: db.project_id as string,
    name: (db.name as string) || 'Untitled System',
    systemType: (db.system_type as HVACSystem['systemType']) || 'vav_multi_zone',
    ervEnabled: (db.erv_enabled as boolean) || false,
    ervSensibleEfficiency: (db.erv_sensible as number) || 0.75,
    ervLatentEfficiency: (db.erv_latent as number) || 0.65,
    occupancyDiversity: (db.occupancy_diversity as number) || 0.8,
    sortOrder: (db.sort_order as number) || 0,
  }
}

function systemToDbSystem(system: HVACSystem): Record<string, unknown> {
  return {
    id: system.id,
    project_id: system.projectId,
    name: system.name,
    system_type: system.systemType,
    erv_enabled: system.ervEnabled,
    erv_sensible: system.ervSensibleEfficiency,
    erv_latent: system.ervLatentEfficiency,
    occupancy_diversity: system.occupancyDiversity,
    sort_order: system.sortOrder,
  }
}
