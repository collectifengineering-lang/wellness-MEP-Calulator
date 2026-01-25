import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import UserMenu from './auth/UserMenu'
import ZoneCanvas from './builder/ZoneCanvas'
import CentralPlantTab from './central-plant/CentralPlantTab'
import ResultsTab from './results/ResultsTab'
import { useProjectStore } from '../store/useProjectStore'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useCalculations } from '../hooks/useCalculations'

type TabType = 'builder' | 'central' | 'results'

export default function ProjectWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { currentProject, zones, setCurrentProject, setZones } = useProjectStore()
  const [activeTab, setActiveTab] = useState<TabType>('builder')
  const [saving, setSaving] = useState(false)
  const [synced, setSynced] = useState(true)
  const [otherUserEditing, setOtherUserEditing] = useState(false)
  const calculations = useCalculations()
  
  // Track if we're the one making changes (to avoid reacting to our own changes)
  const isSaving = useRef(false)
  const lastUpdateTimestamp = useRef<string | null>(null)

  // Load project if not already loaded
  useEffect(() => {
    if (!currentProject && projectId) {
      loadProject(projectId)
    }
  }, [projectId, currentProject])

  const loadProject = async (id: string) => {
    if (isSupabaseConfigured()) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (projectData) {
        const pd = projectData as Record<string, unknown>
        setCurrentProject({
          id: pd.id as string,
          userId: pd.user_id as string,
          name: (pd.name as string) || 'Untitled',
          targetSF: (pd.target_sf as number) || 0,
          climate: (pd.climate as import('../types').ClimateType) || 'temperate',
          electricPrimary: pd.electric_primary as boolean ?? true,
          dhwSettings: (pd.dhw_settings as import('../types').DHWSettings) || {
            heaterType: 'gas', gasEfficiency: 0.95, electricEfficiency: 0.98,
            storageTemp: 140, deliveryTemp: 110, coldWaterTemp: 55, peakDuration: 2
          },
          contingency: (pd.contingency as number) || 0.25,
          resultAdjustments: (pd.result_adjustments as import('../types').ResultAdjustments) || {
            hvacNotes: '', electricalNotes: '', gasNotes: '',
            waterSanitaryNotes: '', sprinklerNotes: '', fireAlarmNotes: '', overrides: {}
          },
          createdAt: new Date(pd.created_at as string),
          updatedAt: new Date(pd.updated_at as string),
        } as import('../types').Project)

        const { data: zonesData } = await supabase
          .from('zones')
          .select('*')
          .eq('project_id', id)
          .order('sort_order')

        if (zonesData) {
          setZones((zonesData as Record<string, unknown>[]).map(z => ({
            id: z.id as string,
            projectId: z.project_id as string,
            name: (z.name as string) || 'Untitled',
            type: (z.zone_type as import('../types').ZoneType) || 'custom',
            subType: (z.sub_type as 'electric' | 'gas') || 'electric',
            sf: (z.sf as number) || 0,
            color: (z.color as string) || '#64748b',
            fixtures: (z.fixtures as import('../types').ZoneFixtures) || { showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0 },
            rates: (z.rates as import('../types').ZoneRates) || { lighting_w_sf: 1, receptacle_va_sf: 3, ventilation_cfm_sf: 0.15, exhaust_cfm_sf: 0, cooling_sf_ton: 400, heating_btuh_sf: 25 },
            lineItems: (z.line_items as import('../types').LineItem[]) || [],
            sortOrder: (z.sort_order as number) || 0,
          } as import('../types').Zone)))
        }
      }
    } else {
      // Dev mode: load from localStorage
      const stored = localStorage.getItem('mep_projects')
      if (stored) {
        const projects = JSON.parse(stored)
        const project = projects.find((p: { id: string }) => p.id === id)
        if (project) {
          setCurrentProject(project)
          const storedZones = localStorage.getItem(`mep_zones_${id}`)
          if (storedZones) {
            setZones(JSON.parse(storedZones))
          }
        }
      }
    }
  }

  // Subscribe to realtime changes for collaborative editing
  useEffect(() => {
    if (!isSupabaseConfigured() || !projectId) return

    // Subscribe to project changes
    const projectChannel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          // Ignore if we're currently saving (our own change)
          if (isSaving.current) return
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const pd = payload.new as Record<string, unknown>
            // Only update if this is a newer change
            const newTimestamp = pd.updated_at as string
            if (lastUpdateTimestamp.current && newTimestamp <= lastUpdateTimestamp.current) return
            
            console.log('Project updated by another user')
            setOtherUserEditing(true)
            setTimeout(() => setOtherUserEditing(false), 3000)
            
            setCurrentProject({
              id: pd.id as string,
              userId: pd.user_id as string,
              name: (pd.name as string) || 'Untitled',
              targetSF: (pd.target_sf as number) || 0,
              climate: (pd.climate as import('../types').ClimateType) || 'temperate',
              electricPrimary: pd.electric_primary as boolean ?? true,
              dhwSettings: (pd.dhw_settings as import('../types').DHWSettings) || {
                heaterType: 'gas', gasEfficiency: 0.95, electricEfficiency: 0.98,
                storageTemp: 140, deliveryTemp: 110, coldWaterTemp: 55, peakDuration: 2
              },
              contingency: (pd.contingency as number) || 0.25,
              resultAdjustments: (pd.result_adjustments as import('../types').ResultAdjustments) || {
                hvacNotes: '', electricalNotes: '', gasNotes: '',
                waterSanitaryNotes: '', sprinklerNotes: '', fireAlarmNotes: '', overrides: {}
              },
              createdAt: new Date(pd.created_at as string),
              updatedAt: new Date(pd.updated_at as string),
            } as import('../types').Project)
            lastUpdateTimestamp.current = newTimestamp
          }
        }
      )
      .subscribe()

    // Subscribe to zone changes
    const zonesChannel = supabase
      .channel(`zones-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zones',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          // Ignore if we're currently saving (our own change)
          if (isSaving.current) return
          
          console.log('Zone change by another user:', payload.eventType)
          setOtherUserEditing(true)
          setTimeout(() => setOtherUserEditing(false), 3000)
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const z = payload.new as Record<string, unknown>
            const updatedZone = {
              id: z.id as string,
              projectId: z.project_id as string,
              name: (z.name as string) || 'Untitled',
              type: (z.zone_type as import('../types').ZoneType) || 'custom',
              subType: (z.sub_type as 'electric' | 'gas') || 'electric',
              sf: (z.sf as number) || 0,
              color: (z.color as string) || '#64748b',
              fixtures: (z.fixtures as import('../types').ZoneFixtures) || { showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0 },
              rates: (z.rates as import('../types').ZoneRates) || { lighting_w_sf: 1, receptacle_va_sf: 3, ventilation_cfm_sf: 0.15, exhaust_cfm_sf: 0, cooling_sf_ton: 400, heating_btuh_sf: 25 },
              lineItems: (z.line_items as import('../types').LineItem[]) || [],
              sortOrder: (z.sort_order as number) || 0,
            } as import('../types').Zone
            
            // Update or add the zone - need to get current zones from store
            const currentZones = useProjectStore.getState().zones
            const existing = currentZones.find(zone => zone.id === updatedZone.id)
            if (existing) {
              setZones(currentZones.map(zone => zone.id === updatedZone.id ? updatedZone : zone))
            } else {
              setZones([...currentZones, updatedZone].sort((a, b) => a.sortOrder - b.sortOrder))
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as Record<string, unknown>).id as string
            const currentZones = useProjectStore.getState().zones
            setZones(currentZones.filter(z => z.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(projectChannel)
      supabase.removeChannel(zonesChannel)
    }
  }, [projectId, setCurrentProject, setZones])

  // Auto-save on changes
  useEffect(() => {
    if (!currentProject) return
    setSynced(false)
    const timer = setTimeout(() => saveProject(), 1000)
    return () => clearTimeout(timer)
  }, [currentProject, zones])

  const saveProject = useCallback(async () => {
    if (!currentProject) return
    setSaving(true)
    isSaving.current = true

    const timestamp = new Date().toISOString()
    lastUpdateTimestamp.current = timestamp

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('projects').upsert({
          id: currentProject.id,
          user_id: currentProject.userId,
          name: currentProject.name,
          target_sf: currentProject.targetSF,
          climate: currentProject.climate,
          electric_primary: currentProject.electricPrimary,
          dhw_settings: currentProject.dhwSettings as unknown as Record<string, unknown>,
          contingency: currentProject.contingency,
          result_adjustments: currentProject.resultAdjustments as unknown as Record<string, unknown>,
          updated_at: timestamp,
        } as unknown as never)

        // Save zones - get current zone IDs to detect deletions
        const { data: existingZones } = await supabase
          .from('zones')
          .select('id')
          .eq('project_id', currentProject.id)
        
        const currentZoneIds = new Set(zones.map(z => z.id))
        const existingZoneIds = (existingZones || []).map((z: { id: string }) => z.id)
        
        // Delete zones that are no longer in local state
        for (const existingId of existingZoneIds) {
          if (!currentZoneIds.has(existingId)) {
            await supabase.from('zones').delete().eq('id', existingId)
          }
        }

        // Upsert current zones
        for (const zone of zones) {
          await supabase.from('zones').upsert({
            id: zone.id,
            project_id: currentProject.id,
            name: zone.name,
            zone_type: zone.type,
            sub_type: zone.subType,
            sf: zone.sf,
            color: zone.color,
            fixtures: zone.fixtures as unknown as Record<string, unknown>,
            rates: zone.rates as unknown as Record<string, unknown>,
            line_items: zone.lineItems as unknown as Record<string, unknown>[],
            sort_order: zone.sortOrder,
          } as unknown as never)
        }
        
        setSynced(true)
      } catch (error) {
        console.error('Failed to save project:', error)
        setSynced(false)
      }
    } else {
      // Dev mode: save to localStorage
      const stored = localStorage.getItem('mep_projects')
      const projects = stored ? JSON.parse(stored) : []
      const idx = projects.findIndex((p: { id: string }) => p.id === currentProject.id)
      if (idx >= 0) {
        projects[idx] = { ...currentProject, updatedAt: new Date() }
      } else {
        projects.push({ ...currentProject, updatedAt: new Date() })
      }
      localStorage.setItem('mep_projects', JSON.stringify(projects))
      localStorage.setItem(`mep_zones_${currentProject.id}`, JSON.stringify(zones))
      setSynced(true)
    }

    setSaving(false)
    // Small delay before allowing realtime updates to avoid race conditions
    setTimeout(() => { isSaving.current = false }, 500)
  }, [currentProject, zones])

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalSF = zones.reduce((sum, z) => sum + z.sf, 0)
  const sfDiff = totalSF - currentProject.targetSF
  const sfStatus = Math.abs(sfDiff) < currentProject.targetSF * 0.05 ? 'match' : sfDiff > 0 ? 'over' : 'under'

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-lg border-b border-surface-800">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white">{currentProject.name}</h1>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-surface-400">{currentProject.targetSF.toLocaleString()} SF target</span>
                  {saving && (
                    <span className="text-primary-400 animate-pulse">Saving...</span>
                  )}
                  {!saving && synced && isSupabaseConfigured() && (
                    <span className="text-emerald-400">• Synced</span>
                  )}
                  {!saving && !synced && isSupabaseConfigured() && (
                    <span className="text-amber-400">• Unsaved changes</span>
                  )}
                  {otherUserEditing && (
                    <span className="text-cyan-400 animate-pulse">• Another user editing</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <nav className="flex items-center gap-1 bg-surface-800 rounded-lg p-1">
              {[
                { id: 'builder', label: 'Zone Builder' },
                { id: 'central', label: 'Central Plant' },
                { id: 'results', label: 'Results' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-surface-400 hover:text-white hover:bg-surface-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              {/* SF Status */}
              <div className={`px-3 py-1.5 rounded-lg text-sm font-mono ${
                sfStatus === 'match' ? 'bg-emerald-500/10 text-emerald-400' :
                sfStatus === 'over' ? 'bg-amber-500/10 text-amber-400' :
                'bg-rose-500/10 text-rose-400'
              }`}>
                {totalSF.toLocaleString()} SF
                {sfStatus !== 'match' && (
                  <span className="ml-1">
                    ({sfDiff > 0 ? '+' : ''}{sfDiff.toLocaleString()})
                  </span>
                )}
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'builder' && (
          <ZoneCanvas calculations={calculations} />
        )}
        {activeTab === 'central' && (
          <CentralPlantTab calculations={calculations} />
        )}
        {activeTab === 'results' && (
          <ResultsTab calculations={calculations} />
        )}
      </main>
    </div>
  )
}
