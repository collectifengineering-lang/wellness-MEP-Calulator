import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import UserMenu from './auth/UserMenu'
import ZoneCanvas from './builder/ZoneCanvas'
import PoolRoomTab from './pool-design/PoolRoomTab'
import CentralPlantTab from './central-plant/CentralPlantTab'
import ResultsTab from './results/ResultsTab'
import ProjectInfoTab from './project-info/ProjectInfoTab'
import { Logo } from './shared/Logo'
import { useProjectStore } from '../store/useProjectStore'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useCalculations } from '../hooks/useCalculations'
import { getDefaultDHWSettings, getDefaultElectricalSettings, getDefaultResultAdjustments, getDefaultMechanicalSettings } from '../data/defaults'

type TabType = 'info' | 'builder' | 'pool' | 'central' | 'results'

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
  
  // CRITICAL: Track if initial load is complete to prevent auto-save from wiping data
  // Using STATE instead of ref so changes trigger re-renders
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false)
  const initializedProjectId = useRef<string | null>(null)

  // Load project if not already loaded, OR enable auto-save if already loaded
  useEffect(() => {
    if (!projectId) return
    
    // Reset auto-save when project changes
    if (initializedProjectId.current !== projectId) {
      setAutoSaveEnabled(false)
      initializedProjectId.current = projectId
    }
    
    if (!currentProject) {
      // Project not in store - need to load from database
      loadProject(projectId)
    } else if (currentProject.id === projectId && !autoSaveEnabled) {
      // Project loaded - enable auto-save after a short delay
      console.log('🔓 Enabling auto-save in 500ms...')
      const timer = setTimeout(() => {
        console.log('✅ Auto-save NOW ENABLED')
        setAutoSaveEnabled(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [projectId, currentProject, autoSaveEnabled])

  const loadProject = async (id: string) => {
    if (isSupabaseConfigured()) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (projectData) {
        const pd = projectData as Record<string, unknown>
        const climate = (pd.climate as import('../types').ClimateType) || 'temperate'
        
        // Merge saved DHW settings with defaults to ensure all required fields exist
        const defaultDHW = getDefaultDHWSettings(climate)
        const savedDHW = pd.dhw_settings as Partial<import('../types').DHWSettings> | null
        const mergedDHW: import('../types').DHWSettings = {
          ...defaultDHW,
          ...savedDHW,
        }
        
        // Merge saved electrical settings with defaults
        const defaultElectrical = getDefaultElectricalSettings()
        const savedElectrical = pd.electrical_settings as Partial<import('../types').ProjectElectricalSettings> | null
        const mergedElectrical = {
          ...defaultElectrical,
          ...savedElectrical,
        }
        
        // Merge saved result adjustments with defaults
        const defaultAdjustments = getDefaultResultAdjustments()
        const savedAdjustments = pd.result_adjustments as Partial<import('../types').ResultAdjustments> | null
        const mergedAdjustments = {
          ...defaultAdjustments,
          ...savedAdjustments,
        }
        
        // Merge saved mechanical settings with defaults
        const defaultMechanical = getDefaultMechanicalSettings()
        const savedMechanical = pd.mechanical_settings as Partial<import('../types').MechanicalElectricalSettings> | null
        const mergedMechanical = {
          ...defaultMechanical,
          ...savedMechanical,
        }
        
        setCurrentProject({
          id: pd.id as string,
          userId: pd.user_id as string,
          name: (pd.name as string) || 'Untitled',
          targetSF: (pd.target_sf as number) || 0,
          climate,
          electricPrimary: pd.electric_primary as boolean ?? true,
          ashraeLocationId: pd.ashrae_location_id as string | undefined,
          clientInfo: pd.client_info as import('../types').ProjectClientInfo | undefined,
          mepNarratives: pd.mep_narratives as import('../types').MEPNarratives | undefined,
          reportLogo: pd.report_logo as import('../types').ReportLogoHistory | undefined,
          fixtureOverrides: pd.fixture_overrides as import('../types').FixtureOverride[] | undefined,
          narrativeBackground: pd.narrative_background as import('../types').NarrativeBackground | undefined,
          electricalSettings: mergedElectrical,
          mechanicalSettings: mergedMechanical,
          dhwSettings: mergedDHW,
          contingency: (pd.contingency as number) || 0.25,
          resultAdjustments: mergedAdjustments,
          poolRoomDesign: pd.pool_room_design as import('../types').PoolRoomDesign | undefined,
          createdAt: new Date(pd.created_at as string),
          updatedAt: new Date(pd.updated_at as string),
        } as import('../types').Project)

        const { data: zonesData } = await supabase
          .from('zones')
          .select('*')
          .eq('project_id', id)
          .order('sort_order')

        if (zonesData) {
          console.log('📥 LOADING ZONES FROM DB:')
          const loadedZones = (zonesData as Record<string, unknown>[]).map(z => {
            const lineItems = (z.line_items as import('../types').LineItem[]) || []
            console.log(`  📦 "${z.name}": ${lineItems.length} line items, ventCfm:${z.ventilation_cfm}, exhCfm:${z.exhaust_cfm}`)
            return {
              id: z.id as string,
              projectId: z.project_id as string,
              name: (z.name as string) || 'Untitled',
              type: (z.zone_type as import('../types').ZoneType) || 'custom',
              subType: (z.sub_type as 'electric' | 'gas') || 'electric',
              sf: (z.sf as number) || 0,
              color: (z.color as string) || '#64748b',
              fixtures: (z.fixtures as import('../types').ZoneFixtures) || { showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0 },
              rates: (z.rates as import('../types').ZoneRates) || { lighting_w_sf: 1, receptacle_va_sf: 3, ventilation_cfm_sf: 0.15, exhaust_cfm_sf: 0, cooling_sf_ton: 400, heating_btuh_sf: 25 },
              processLoads: (z.process_loads as import('../types').ZoneProcessLoads) || { fixed_kw: 0, gas_mbh: 0, ventilation_cfm: 0, exhaust_cfm: 0, pool_heater_mbh: 0, dehumid_lb_hr: 0, flue_size_in: 0, ceiling_height_ft: 10 },
              laundryEquipment: z.laundry_equipment as import('../types').LaundryEquipment | undefined,
              lineItems,
              sortOrder: (z.sort_order as number) || 0,
              // VENTILATION FIELDS - MUST LOAD THESE!
              ventilationSpaceType: z.ventilation_space_type as string | undefined,
              ventilationStandard: z.ventilation_standard as 'ashrae62' | 'ashrae170' | 'custom' | undefined,
              occupants: z.occupants as number | undefined,
              ceilingHeightFt: z.ceiling_height_ft as number | undefined,
              ventilationUnit: z.ventilation_unit as 'cfm_sf' | 'cfm' | 'ach' | undefined,
              exhaustUnit: z.exhaust_unit as 'cfm_sf' | 'cfm' | 'ach' | undefined,
              ventilationOverride: z.ventilation_override as boolean | undefined,
              exhaustOverride: z.exhaust_override as boolean | undefined,
              ventilationCfm: z.ventilation_cfm as number | undefined,
              exhaustCfm: z.exhaust_cfm as number | undefined,
            } as import('../types').Zone
          })
          
          // CRITICAL: Calculate ventilation for zones that don't have values stored
          // This ensures ventilation is calculated on project load, not just when editing zones
          const { ensureZonesHaveVentilation } = await import('../calculations/ventilation')
          const zonesWithVentilation = ensureZonesHaveVentilation(loadedZones)
          
          // Check if any zones got calculated values
          const zonesNeedingSave = zonesWithVentilation.filter((z, i) => 
            z.ventilationCfm !== loadedZones[i].ventilationCfm || 
            z.exhaustCfm !== loadedZones[i].exhaustCfm
          )
          
          if (zonesNeedingSave.length > 0) {
            console.log(`📊 Calculated ventilation for ${zonesNeedingSave.length} zones on load - saving to DB`)
            
            // IMMEDIATELY save the calculated values to DB (don't wait for auto-save)
            for (const zone of zonesNeedingSave) {
              const { error } = await supabase
                .from('zones')
                .update({
                  ventilation_cfm: zone.ventilationCfm,
                  exhaust_cfm: zone.exhaustCfm,
                  updated_at: new Date().toISOString()
                } as never)
                .eq('id', zone.id)
              
              if (error) {
                console.error(`Failed to save ventilation for zone ${zone.name}:`, error)
              }
            }
            console.log(`✅ Saved ventilation values for ${zonesNeedingSave.length} zones`)
          }
          
          setZones(zonesWithVentilation)
        }
        
        // Mark loading complete AFTER both project and zones are loaded
        // The useEffect will handle enabling auto-save after project is set
        console.log('📥 Project and zones loaded from DB')
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
      // The useEffect will handle enabling auto-save after project is set
      console.log('📥 Project loaded from localStorage')
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
            
            // Merge with defaults to ensure all required fields exist
            const climate = (pd.climate as import('../types').ClimateType) || 'temperate'
            const defaultDHW = getDefaultDHWSettings(climate)
            const savedDHW = pd.dhw_settings as Partial<import('../types').DHWSettings> | null
            const mergedDHW = { ...defaultDHW, ...savedDHW }
            
            const defaultElectrical = getDefaultElectricalSettings()
            const savedElectrical = pd.electrical_settings as Partial<import('../types').ProjectElectricalSettings> | null
            const mergedElectrical = { ...defaultElectrical, ...savedElectrical }
            
            const defaultMechanical = getDefaultMechanicalSettings()
            const savedMechanical = pd.mechanical_settings as Partial<import('../types').MechanicalElectricalSettings> | null
            const mergedMechanical = { ...defaultMechanical, ...savedMechanical }
            
            const defaultAdjustments = getDefaultResultAdjustments()
            const savedAdjustments = pd.result_adjustments as Partial<import('../types').ResultAdjustments> | null
            const mergedAdjustments = { ...defaultAdjustments, ...savedAdjustments }
            
            setCurrentProject({
              id: pd.id as string,
              userId: pd.user_id as string,
              name: (pd.name as string) || 'Untitled',
              targetSF: (pd.target_sf as number) || 0,
              climate,
              electricPrimary: pd.electric_primary as boolean ?? true,
              ashraeLocationId: pd.ashrae_location_id as string | undefined,
              clientInfo: pd.client_info as import('../types').ProjectClientInfo | undefined,
              mepNarratives: pd.mep_narratives as import('../types').MEPNarratives | undefined,
              reportLogo: pd.report_logo as import('../types').ReportLogoHistory | undefined,
              fixtureOverrides: pd.fixture_overrides as import('../types').FixtureOverride[] | undefined,
              narrativeBackground: pd.narrative_background as import('../types').NarrativeBackground | undefined,
              electricalSettings: mergedElectrical,
              mechanicalSettings: mergedMechanical,
              dhwSettings: mergedDHW,
              contingency: (pd.contingency as number) || 0.25,
              resultAdjustments: mergedAdjustments,
              poolRoomDesign: pd.pool_room_design as import('../types').PoolRoomDesign | undefined,
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
              processLoads: (z.process_loads as import('../types').ZoneProcessLoads) || { fixed_kw: 0, gas_mbh: 0, ventilation_cfm: 0, exhaust_cfm: 0, pool_heater_mbh: 0, dehumid_lb_hr: 0, flue_size_in: 0, ceiling_height_ft: 10 },
              laundryEquipment: z.laundry_equipment as import('../types').LaundryEquipment | undefined,
              lineItems: (z.line_items as import('../types').LineItem[]) || [],
              sortOrder: (z.sort_order as number) || 0,
              // New ventilation fields
              ventilationSpaceType: z.ventilation_space_type as string | undefined,
              ventilationStandard: z.ventilation_standard as 'ashrae62' | 'ashrae170' | 'custom' | undefined,
              occupants: z.occupants as number | undefined,
              ceilingHeightFt: z.ceiling_height_ft as number | undefined,
              ventilationUnit: z.ventilation_unit as 'cfm_sf' | 'cfm' | 'ach' | undefined,
              exhaustUnit: z.exhaust_unit as 'cfm_sf' | 'cfm' | 'ach' | undefined,
              ventilationOverride: z.ventilation_override as boolean | undefined,
              exhaustOverride: z.exhaust_override as boolean | undefined,
              ventilationCfm: z.ventilation_cfm as number | undefined,
              exhaustCfm: z.exhaust_cfm as number | undefined,
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

  // Auto-save on changes - BUT NOT during initial load!
  useEffect(() => {
    if (!currentProject) return
    
    // CRITICAL: Don't auto-save until enabled (prevents wiping data during load)
    if (!autoSaveEnabled) {
      console.log('🚫 Auto-save waiting - not yet enabled')
      return
    }
    
    // Debug: Log what's being saved
    const totalLineItems = zones.reduce((sum, z) => sum + (z.lineItems?.length || 0), 0)
    console.log(`📝 Auto-save triggered: ${zones.length} zones, ${totalLineItems} total line items`)
    
    setSynced(false)
    const timer = setTimeout(() => {
      console.log('💾 Executing auto-save now...')
      saveProject()
    }, 1000)
    return () => clearTimeout(timer)
  }, [currentProject, zones, autoSaveEnabled])

  const saveProject = useCallback(async () => {
    if (!currentProject) return
    
    // DEBUG: Log exactly what we're about to save
    console.log('💾 SAVING PROJECT - Zone details:')
    zones.forEach(z => {
      console.log(`  📦 ${z.name}: ${z.lineItems?.length || 0} line items`, z.lineItems?.map(li => li.name))
    })
    
    setSaving(true)
    isSaving.current = true

    const timestamp = new Date().toISOString()
    lastUpdateTimestamp.current = timestamp

    if (isSupabaseConfigured()) {
      try {
        console.log('💾 SAVING PROJECT - ashraeLocationId:', currentProject.ashraeLocationId)
        await supabase.from('projects').upsert({
          id: currentProject.id,
          user_id: currentProject.userId,
          name: currentProject.name,
          target_sf: currentProject.targetSF,
          climate: currentProject.climate,
          electric_primary: currentProject.electricPrimary,
          ashrae_location_id: currentProject.ashraeLocationId,
          client_info: currentProject.clientInfo as unknown as Record<string, unknown>,
          electrical_settings: currentProject.electricalSettings as unknown as Record<string, unknown>,
          mechanical_settings: currentProject.mechanicalSettings as unknown as Record<string, unknown>,
          dhw_settings: currentProject.dhwSettings as unknown as Record<string, unknown>,
          contingency: currentProject.contingency,
          result_adjustments: currentProject.resultAdjustments as unknown as Record<string, unknown>,
          pool_room_design: currentProject.poolRoomDesign as unknown as Record<string, unknown>,
          mep_narratives: currentProject.mepNarratives as unknown as Record<string, unknown>,
          report_logo: currentProject.reportLogo as unknown as Record<string, unknown>,
          fixture_overrides: currentProject.fixtureOverrides as unknown as Record<string, unknown>,
          narrative_background: currentProject.narrativeBackground as unknown as Record<string, unknown>,
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
            process_loads: zone.processLoads as unknown as Record<string, unknown>,
            laundry_equipment: zone.laundryEquipment as unknown as Record<string, unknown>,
            line_items: zone.lineItems as unknown as Record<string, unknown>[],
            sort_order: zone.sortOrder,
            // VENTILATION FIELDS - MUST SAVE THESE!
            ventilation_space_type: zone.ventilationSpaceType,
            ventilation_standard: zone.ventilationStandard,
            occupants: zone.occupants,
            ceiling_height_ft: zone.ceilingHeightFt,
            ventilation_unit: zone.ventilationUnit,
            exhaust_unit: zone.exhaustUnit,
            ventilation_override: zone.ventilationOverride,
            exhaust_override: zone.exhaustOverride,
            ventilation_cfm: zone.ventilationCfm,
            exhaust_cfm: zone.exhaustCfm,
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
                className="hover:opacity-80 transition-opacity"
                title="Back to Hub"
              >
                <Logo size="sm" showText={false} />
              </button>
              <button
                onClick={() => navigate('/concept-mep')}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                title="Back to Projects"
              >
                <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white">{currentProject.name} 🐐</h1>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-surface-400">{currentProject.targetSF.toLocaleString()} SF target</span>
                  {saving && (
                    <span className="text-primary-400 animate-pulse">💾 Saving...</span>
                  )}
                  {!saving && synced && isSupabaseConfigured() && (
                    <span className="text-emerald-400">✓ Synced</span>
                  )}
                  {!saving && !synced && isSupabaseConfigured() && (
                    <span className="text-amber-400 animate-pulse">• Unsaved</span>
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
                { id: 'info', label: '📋 Info' },
                { id: 'builder', label: 'Zone Builder' },
                { id: 'pool', label: '🏊 Pool Room' },
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
              {/* Manual Save Button */}
              <button
                onClick={() => {
                  console.log('🔘 Manual save button clicked')
                  saveProject()
                }}
                disabled={saving}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  saving 
                    ? 'bg-surface-700 text-surface-400 cursor-not-allowed'
                    : synced 
                      ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                      : 'bg-amber-600 text-white hover:bg-amber-500 animate-pulse'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {saving ? 'Saving...' : synced ? 'Saved' : 'SAVE NOW'}
              </button>
              
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
        {activeTab === 'info' && (
          <ProjectInfoTab />
        )}
        {activeTab === 'builder' && (
          <ZoneCanvas calculations={calculations} />
        )}
        {activeTab === 'pool' && (
          <PoolRoomTab />
        )}
        {activeTab === 'central' && (
          <CentralPlantTab calculations={calculations} />
        )}
        {activeTab === 'results' && (
          <ResultsTab 
            calculations={calculations} 
            onNavigateToTab={(tab) => {
              if (tab === 'builder') setActiveTab('builder')
              else if (tab === 'pool') setActiveTab('pool')
              else if (tab === 'central') setActiveTab('central')
            }}
          />
        )}
      </main>
    </div>
  )
}
