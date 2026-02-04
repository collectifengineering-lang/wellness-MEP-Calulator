// =========================================== 
// PSYCHROMETRIC CALCULATOR STORE
// State management and Supabase sync
// =========================================== 

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'
import type {
  PsychrometricSystem,
  PsychrometricPoint,
  PsychrometricProcess,
  StatePointResult,
  PsychInputMode,
  PointType,
  ProcessType,
  TempUnit,
  HumidityUnit,
} from '../types/psychrometric'
import { calculateStatePoint } from '../calculations/psychrometric'
import { barometricPressureAtAltitude } from '../data/psychrometricConstants'

// =========================================== 
// STORE STATE INTERFACE
// =========================================== 
interface CreateSystemOptions {
  projectId?: string | null
  personalCalcId?: string | null
  name?: string
  altitudeFt?: number
  systemCfm?: number
}

interface PsychrometricState {
  // Data
  systems: PsychrometricSystem[]
  points: PsychrometricPoint[]
  processes: PsychrometricProcess[]
  currentSystemId: string | null
  
  // Calculation results (cached)
  calculatedPoints: Record<string, StatePointResult>
  
  // UI state
  isLoading: boolean
  isSaving: boolean
  error: string | null
  
  // Track fetch attempts to prevent auto-create race conditions
  lastFetchedProjectId: string | null
  lastFetchedPersonalCalcId: string | null
  
  // Actions - Systems
  clearError: () => void
  createSystem: (options: CreateSystemOptions) => Promise<PsychrometricSystem>
  updateSystem: (systemId: string, updates: Partial<PsychrometricSystem>) => Promise<void>
  deleteSystem: (systemId: string) => Promise<void>
  setCurrentSystem: (systemId: string | null) => void
  
  // Actions - Points
  addPoint: (systemId: string, label: string, pointType?: PointType) => Promise<PsychrometricPoint>
  updatePoint: (pointId: string, updates: Partial<PsychrometricPoint>) => Promise<void>
  deletePoint: (pointId: string) => Promise<void>
  calculatePointState: (pointId: string) => StatePointResult | null
  
  // Actions - Processes
  addProcess: (systemId: string, name: string, processType?: ProcessType) => Promise<PsychrometricProcess>
  updateProcess: (processId: string, updates: Partial<PsychrometricProcess>) => Promise<void>
  deleteProcess: (processId: string) => Promise<void>
  
  // Actions - Data Fetching
  fetchSystemsForProject: (projectId: string) => Promise<void>
  fetchSystemsForPersonalCalc: (personalCalcId: string) => Promise<void>
  fetchSystemById: (systemId: string) => Promise<void>
  
  // Actions - Move to Project
  moveSystemsToProject: (personalCalcId: string, projectId: string) => Promise<void>
  
  // Getters
  getSystem: (systemId: string) => PsychrometricSystem | undefined
  getPointsForSystem: (systemId: string) => PsychrometricPoint[]
  getProcessesForSystem: (systemId: string) => PsychrometricProcess[]
  getCurrentSystem: () => PsychrometricSystem | undefined
  getCurrentPoints: () => PsychrometricPoint[]
  getBarometricPressure: (systemId: string) => number
  
  // Point chaining helpers
  getPointUsageCount: (pointId: string) => number
  getProcessesUsingPoint: (pointId: string) => PsychrometricProcess[]
  isPointShared: (pointId: string) => boolean
  
  // Sequential point naming helper
  getNextPointLabel: (systemId: string) => string
  getLastProcessEndPoint: (systemId: string) => PsychrometricPoint | null
}

// =========================================== 
// CREATE STORE
// =========================================== 
export const usePsychrometricStore = create<PsychrometricState>((set, get) => ({
  // Initial state
  systems: [],
  points: [],
  processes: [],
  currentSystemId: null,
  calculatedPoints: {},
  isLoading: false,
  isSaving: false,
  error: null,
  lastFetchedProjectId: null,
  lastFetchedPersonalCalcId: null,
  
  // =========================================== 
  // ERROR HANDLING
  // =========================================== 
  clearError: () => {
    set({ error: null })
  },
  
  // =========================================== 
  // SYSTEM ACTIONS
  // =========================================== 
  createSystem: async (options) => {
    // Clear any previous errors
    set({ error: null })
    
    const { projectId = null, personalCalcId = null, name = 'Psychrometric Analysis', altitudeFt = 0, systemCfm = 10000 } = options
    const id = uuidv4()
    const now = new Date()
    const userId = useAuthStore.getState().user?.id
    
    console.log('[PSYCH] ========================================')
    console.log('[PSYCH] createSystem: STARTING')
    console.log('[PSYCH] System ID:', id)
    console.log('[PSYCH] Project ID:', projectId)
    console.log('[PSYCH] Personal Calc ID:', personalCalcId)
    console.log('[PSYCH] User ID:', userId)
    console.log('[PSYCH] Name:', name)
    console.log('[PSYCH] ========================================')
    
    const newSystem: PsychrometricSystem = {
      id,
      projectId,
      personalCalcId,
      userId,
      name,
      systemCfm,
      altitudeFt,
      barometricPressurePsia: barometricPressureAtAltitude(altitudeFt),
      tempUnit: 'F',
      humidityUnit: 'grains',
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
    
    // Add to local state
    set(state => ({
      systems: [...state.systems, newSystem],
      currentSystemId: id,
    }))
    console.log('[PSYCH] Added to local state')
    
    // Save to database
    if (isSupabaseConfigured() && userId) {
      console.log('[PSYCH] Saving to Supabase...')
      try {
        set({ isSaving: true })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('psychrometric_systems')
          .insert({
            id,
            project_id: projectId,
            personal_calc_id: personalCalcId,
            user_id: userId,
            name,
            system_cfm: systemCfm,
            altitude_ft: altitudeFt,
            barometric_pressure_psia: newSystem.barometricPressurePsia,
            temp_unit: newSystem.tempUnit,
            humidity_unit: newSystem.humidityUnit,
            notes: newSystem.notes,
          })
          .select()
        
        if (error) {
          console.error('[PSYCH] INSERT ERROR:', error)
          throw error
        }
        console.log('[PSYCH] ✅ Successfully saved to database!')
        console.log('[PSYCH] Response data:', data)
        console.log('[PSYCH] ========================================')
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('[PSYCH] ❌ SAVE FAILED:', errorMessage, error)
        set({ error: `Failed to save system: ${errorMessage}` })
      } finally {
        set({ isSaving: false })
      }
    } else {
      console.warn('[PSYCH] Not saving to DB - Supabase not configured or no userId')
    }
    
    return newSystem
  },
  
  updateSystem: async (systemId, updates) => {
    // Clear any previous errors
    set({ error: null })
    
    // Update local state
    set(state => ({
      systems: state.systems.map(s =>
        s.id === systemId ? { ...s, ...updates, updatedAt: new Date() } : s
      ),
    }))
    
    // Recalculate all points if altitude changed
    if (updates.altitudeFt !== undefined) {
      const points = get().points.filter(p => p.systemId === systemId)
      points.forEach(p => get().calculatePointState(p.id))
    }
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        set({ isSaving: true })
        
        const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.systemCfm !== undefined) dbUpdates.system_cfm = updates.systemCfm
        if (updates.altitudeFt !== undefined) {
          dbUpdates.altitude_ft = updates.altitudeFt
          dbUpdates.barometric_pressure_psia = barometricPressureAtAltitude(updates.altitudeFt)
        }
        if (updates.tempUnit !== undefined) dbUpdates.temp_unit = updates.tempUnit
        if (updates.humidityUnit !== undefined) dbUpdates.humidity_unit = updates.humidityUnit
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId
        if (updates.personalCalcId !== undefined) dbUpdates.personal_calc_id = updates.personalCalcId
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('psychrometric_systems')
          .update(dbUpdates)
          .eq('id', systemId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to update psychrometric system:', error)
        set({ error: 'Failed to update system' })
      } finally {
        set({ isSaving: false })
      }
    }
  },
  
  deleteSystem: async (systemId) => {
    // Remove from local state
    set(state => ({
      systems: state.systems.filter(s => s.id !== systemId),
      points: state.points.filter(p => p.systemId !== systemId),
      processes: state.processes.filter(p => p.systemId !== systemId),
      currentSystemId: state.currentSystemId === systemId ? null : state.currentSystemId,
    }))
    
    // Delete from database
    if (isSupabaseConfigured()) {
      try {
        const { error } = await (supabase as any)
          .from('psychrometric_systems')
          .delete()
          .eq('id', systemId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete psychrometric system:', error)
        set({ error: 'Failed to delete system' })
      }
    }
  },
  
  setCurrentSystem: (systemId) => {
    set({ currentSystemId: systemId })
  },
  
  // =========================================== 
  // POINT ACTIONS
  // =========================================== 
  addPoint: async (systemId, label, pointType = 'state') => {
    const id = uuidv4()
    const now = new Date()
    const existingPoints = get().points.filter(p => p.systemId === systemId)
    
    console.log('[PSYCH] addPoint:', { id, systemId, label, pointType })
    
    const newPoint: PsychrometricPoint = {
      id,
      systemId,
      pointLabel: label,
      pointType,
      inputMode: 'db_wb',
      dryBulbF: 70,
      wetBulbF: 58,
      dewPointF: null,
      relativeHumidity: null,
      humidityRatioGrains: null,
      enthalpyBtuLb: null,
      specificVolumeFt3Lb: null,
      cfm: 1000,
      sortOrder: existingPoints.length,
      createdAt: now,
    }
    
    // Add to local state
    set(state => ({
      points: [...state.points, newPoint],
    }))
    
    // Calculate initial state
    get().calculatePointState(id)
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        console.log('[PSYCH] Saving point to DB:', { id, label })
        const { error } = await (supabase as any)
          .from('psychrometric_points')
          .insert({
            id,
            system_id: systemId,
            point_label: label,
            point_type: pointType,
            input_mode: newPoint.inputMode,
            dry_bulb_f: newPoint.dryBulbF,
            wet_bulb_f: newPoint.wetBulbF,
            cfm: newPoint.cfm,
            sort_order: newPoint.sortOrder,
          } as any)
        
        if (error) {
          console.error('[PSYCH] Point save error:', error)
          throw error
        }
        console.log('[PSYCH] Point saved successfully:', id)
      } catch (error) {
        console.error('[PSYCH] Failed to save psychrometric point:', error)
      }
    }
    
    return newPoint
  },
  
  updatePoint: async (pointId, updates) => {
    const point = get().points.find(p => p.id === pointId)
    if (!point) return
    
    // Update local state
    set(state => ({
      points: state.points.map(p =>
        p.id === pointId ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    }))
    
    // Recalculate state
    get().calculatePointState(pointId)
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (updates.pointLabel !== undefined) dbUpdates.point_label = updates.pointLabel
        if (updates.pointType !== undefined) dbUpdates.point_type = updates.pointType
        if (updates.inputMode !== undefined) dbUpdates.input_mode = updates.inputMode
        if (updates.dryBulbF !== undefined) dbUpdates.dry_bulb_f = updates.dryBulbF
        if (updates.wetBulbF !== undefined) dbUpdates.wet_bulb_f = updates.wetBulbF
        if (updates.dewPointF !== undefined) dbUpdates.dew_point_f = updates.dewPointF
        if (updates.relativeHumidity !== undefined) dbUpdates.relative_humidity = updates.relativeHumidity
        if (updates.humidityRatioGrains !== undefined) dbUpdates.humidity_ratio_grains = updates.humidityRatioGrains
        if (updates.cfm !== undefined) dbUpdates.cfm = updates.cfm
        
        const { error } = await (supabase as any)
          .from('psychrometric_points')
          .update(dbUpdates as any)
          .eq('id', pointId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to update psychrometric point:', error)
      }
    }
  },
  
  deletePoint: async (pointId) => {
    // Remove from local state
    set(state => ({
      points: state.points.filter(p => p.id !== pointId),
      calculatedPoints: Object.fromEntries(
        Object.entries(state.calculatedPoints).filter(([k]) => k !== pointId)
      ),
    }))
    
    // Delete from database
    if (isSupabaseConfigured()) {
      try {
        const { error } = await (supabase as any)
          .from('psychrometric_points')
          .delete()
          .eq('id', pointId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete psychrometric point:', error)
      }
    }
  },
  
  calculatePointState: (pointId) => {
    const state = get()
    const point = state.points.find(p => p.id === pointId)
    if (!point) return null
    
    const system = state.systems.find(s => s.id === point.systemId)
    if (!system) return null
    
    const pressure = barometricPressureAtAltitude(system.altitudeFt)
    
    try {
      const result = calculateStatePoint(
        point.inputMode,
        {
          dryBulbF: point.dryBulbF || 70,
          wetBulbF: point.wetBulbF || undefined,
          relativeHumidity: point.relativeHumidity || undefined,
          dewPointF: point.dewPointF || undefined,
          humidityRatioGrains: point.humidityRatioGrains || undefined,
        },
        pressure
      )
      
      // Cache result
      set(state => ({
        calculatedPoints: {
          ...state.calculatedPoints,
          [pointId]: result,
        },
      }))
      
      return result
    } catch (error) {
      console.error('Failed to calculate point state:', error)
      return null
    }
  },
  
  // =========================================== 
  // PROCESS ACTIONS
  // =========================================== 
  addProcess: async (systemId, name, processType = 'custom') => {
    const id = uuidv4()
    const now = new Date()
    const existingProcesses = get().processes.filter(p => p.systemId === systemId)
    
    console.log('[PSYCH] addProcess:', { id, systemId, name, processType })
    
    const newProcess: PsychrometricProcess = {
      id,
      systemId,
      name,
      processType,
      startPointId: null,
      endPointId: null,
      cfm: 1000,
      sortOrder: existingProcesses.length,
      createdAt: now,
    }
    
    // Add to local state
    set(state => ({
      processes: [...state.processes, newProcess],
    }))
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        console.log('[PSYCH] Saving process to DB:', { id, name, processType })
        const { error } = await (supabase as any)
          .from('psychrometric_processes')
          .insert({
            id,
            system_id: systemId,
            name,
            process_type: processType,
            cfm: newProcess.cfm,
            sort_order: newProcess.sortOrder,
          } as any)
        
        if (error) {
          console.error('[PSYCH] Process save error:', error)
          throw error
        }
        console.log('[PSYCH] Process saved successfully:', id)
      } catch (error) {
        console.error('[PSYCH] Failed to save psychrometric process:', error)
      }
    }
    
    return newProcess
  },
  
  updateProcess: async (processId, updates) => {
    // Update local state
    set(state => ({
      processes: state.processes.map(p =>
        p.id === processId ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    }))
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.processType !== undefined) dbUpdates.process_type = updates.processType
        if (updates.startPointId !== undefined) dbUpdates.start_point_id = updates.startPointId
        if (updates.endPointId !== undefined) dbUpdates.end_point_id = updates.endPointId
        if (updates.pointAId !== undefined) dbUpdates.point_a_id = updates.pointAId
        if (updates.pointBId !== undefined) dbUpdates.point_b_id = updates.pointBId
        if (updates.mixedPointId !== undefined) dbUpdates.mixed_point_id = updates.mixedPointId
        if (updates.cfm !== undefined) dbUpdates.cfm = updates.cfm
        if (updates.totalLoadBtuh !== undefined) dbUpdates.total_load_btuh = updates.totalLoadBtuh
        if (updates.sensibleLoadBtuh !== undefined) dbUpdates.sensible_load_btuh = updates.sensibleLoadBtuh
        if (updates.latentLoadBtuh !== undefined) dbUpdates.latent_load_btuh = updates.latentLoadBtuh
        if (updates.totalLoadTons !== undefined) dbUpdates.total_load_tons = updates.totalLoadTons
        if (updates.moistureLbHr !== undefined) dbUpdates.moisture_lb_hr = updates.moistureLbHr
        if (updates.label !== undefined) dbUpdates.label = updates.label
        if (updates.description !== undefined) dbUpdates.description = updates.description
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes
        
        const { error } = await (supabase as any)
          .from('psychrometric_processes')
          .update(dbUpdates as any)
          .eq('id', processId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to update psychrometric process:', error)
      }
    }
  },
  
  deleteProcess: async (processId) => {
    const state = get()
    const processToDelete = state.processes.find(p => p.id === processId)
    if (!processToDelete) return
    
    const systemId = processToDelete.systemId
    
    // Get point IDs used by this process
    const processPointIds = [
      processToDelete.startPointId,
      processToDelete.endPointId,
      processToDelete.pointAId,
      processToDelete.pointBId,
      processToDelete.mixedPointId,
    ].filter(Boolean) as string[]
    
    // Find which points are used by OTHER processes in this system
    const otherProcesses = state.processes.filter(p => p.id !== processId && p.systemId === systemId)
    const pointsUsedByOtherProcesses = new Set<string>()
    otherProcesses.forEach(p => {
      if (p.startPointId) pointsUsedByOtherProcesses.add(p.startPointId)
      if (p.endPointId) pointsUsedByOtherProcesses.add(p.endPointId)
      if (p.pointAId) pointsUsedByOtherProcesses.add(p.pointAId)
      if (p.pointBId) pointsUsedByOtherProcesses.add(p.pointBId)
      if (p.mixedPointId) pointsUsedByOtherProcesses.add(p.mixedPointId)
    })
    
    // Find orphaned points (used by deleted process but not by any other process)
    const orphanedPointIds = processPointIds.filter(id => !pointsUsedByOtherProcesses.has(id))
    
    // Remove process and orphaned points from local state
    set(state => ({
      processes: state.processes.filter(p => p.id !== processId),
      points: state.points.filter(p => !orphanedPointIds.includes(p.id)),
      calculatedPoints: Object.fromEntries(
        Object.entries(state.calculatedPoints).filter(([k]) => !orphanedPointIds.includes(k))
      ),
    }))
    
    // Delete from database
    if (isSupabaseConfigured()) {
      try {
        // Delete process
        const { error: processError } = await (supabase as any)
          .from('psychrometric_processes')
          .delete()
          .eq('id', processId)
        
        if (processError) throw processError
        
        // Delete orphaned points
        if (orphanedPointIds.length > 0) {
          const { error: pointsError } = await (supabase as any)
            .from('psychrometric_points')
            .delete()
            .in('id', orphanedPointIds)
          
          if (pointsError) throw pointsError
        }
      } catch (error) {
        console.error('Failed to delete psychrometric process:', error)
      }
    }
  },
  
  // =========================================== 
  // DATA FETCHING
  // =========================================== 
  fetchSystemsForProject: async (projectId) => {
    if (!isSupabaseConfigured()) {
      console.warn('[PSYCH] Supabase not configured - skipping fetch')
      return
    }
    
    const userId = useAuthStore.getState().user?.id
    console.log('[PSYCH] ========================================')
    console.log('[PSYCH] fetchSystemsForProject: STARTING')
    console.log('[PSYCH] Project ID:', projectId)
    console.log('[PSYCH] User ID:', userId)
    console.log('[PSYCH] ========================================')
    
    set({ isLoading: true, error: null })
    
    try {
      // Query systems for this project
      console.log('[PSYCH] Querying psychrometric_systems where project_id =', projectId)
      const { data: systemsData, error: systemsError } = await (supabase as any)
        .from('psychrometric_systems')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      
      console.log('[PSYCH] Systems query result:', { 
        count: systemsData?.length || 0, 
        error: systemsError,
        data: systemsData
      })
      
      if (systemsError) {
        console.error('[PSYCH] Systems query error:', systemsError)
        throw systemsError
      }
      
      // Mark that we've fetched for this project (even if empty)
      if (!systemsData || systemsData.length === 0) {
        console.log('[PSYCH] No systems found for project', projectId)
        console.log('[PSYCH] This could mean: 1) New project, 2) RLS blocking, 3) Data deleted')
        set({ 
          isLoading: false, 
          lastFetchedProjectId: projectId,
        })
        return
      }
      
      const systems = (systemsData as any[]).map(mapDbToSystem)
      const systemIds = systems.map(s => s.id)
      console.log('[PSYCH] Mapped systems:', systems.map(s => ({ id: s.id, name: s.name })))
      
      // Fetch points
      console.log('[PSYCH] Querying points for system_ids:', systemIds)
      const { data: pointsData, error: pointsError } = await (supabase as any)
        .from('psychrometric_points')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (pointsError) {
        console.error('[PSYCH] Points query error:', pointsError)
        throw pointsError
      }
      
      const points = (pointsData as any[] || []).map(mapDbToPoint)
      console.log('[PSYCH] Found', points.length, 'points')
      
      // Fetch processes
      console.log('[PSYCH] Querying processes for system_ids:', systemIds)
      const { data: processesData, error: processesError } = await (supabase as any)
        .from('psychrometric_processes')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (processesError) {
        console.error('[PSYCH] Processes query error:', processesError)
        throw processesError
      }
      
      const processes = (processesData as any[] || []).map(mapDbToProcess)
      console.log('[PSYCH] Found', processes.length, 'processes')
      
      // Update state
      console.log('[PSYCH] Updating local state with fetched data...')
      set(state => ({
        systems: [
          ...state.systems.filter(s => s.projectId !== projectId),
          ...systems,
        ],
        points: [
          ...state.points.filter(p => !systemIds.includes(p.systemId)),
          ...points,
        ],
        processes: [
          ...state.processes.filter(p => !systemIds.includes(p.systemId)),
          ...processes,
        ],
        isLoading: false,
        lastFetchedProjectId: projectId,
      }))
      
      console.log('[PSYCH] State updated successfully!')
      console.log('[PSYCH] ========================================')
      
      // Calculate all points
      points.forEach(p => get().calculatePointState(p.id))
    } catch (error) {
      console.error('[PSYCH] FETCH FAILED:', error)
      set({ 
        error: 'Failed to load systems', 
        isLoading: false,
        lastFetchedProjectId: projectId,
      })
    }
  },
  
  fetchSystemsForPersonalCalc: async (personalCalcId) => {
    if (!isSupabaseConfigured()) {
      console.warn('[PSYCH] Supabase not configured - skipping fetch')
      return
    }
    
    const userId = useAuthStore.getState().user?.id
    console.log('[PSYCH] ========================================')
    console.log('[PSYCH] fetchSystemsForPersonalCalc: STARTING')
    console.log('[PSYCH] Personal Calc ID:', personalCalcId)
    console.log('[PSYCH] User ID:', userId)
    console.log('[PSYCH] ========================================')
    
    set({ isLoading: true, error: null })
    
    try {
      console.log('[PSYCH] Querying psychrometric_systems where personal_calc_id =', personalCalcId)
      const { data: systemsData, error: systemsError } = await (supabase as any)
        .from('psychrometric_systems')
        .select('*')
        .eq('personal_calc_id', personalCalcId)
        .order('created_at', { ascending: true })
      
      console.log('[PSYCH] Systems query result:', { 
        count: systemsData?.length || 0, 
        error: systemsError,
        data: systemsData
      })
      
      if (systemsError) {
        console.error('[PSYCH] Systems query error:', systemsError)
        throw systemsError
      }
      
      if (!systemsData || systemsData.length === 0) {
        console.log('[PSYCH] No systems found for personal calc', personalCalcId)
        set(state => ({
          systems: state.systems.filter(s => s.personalCalcId !== personalCalcId),
          isLoading: false,
          lastFetchedPersonalCalcId: personalCalcId,
        }))
        return
      }
      
      const systems = (systemsData as any[]).map(mapDbToSystem)
      const systemIds = systems.map(s => s.id)
      console.log('[PSYCH] Mapped systems:', systems.map(s => ({ id: s.id, name: s.name })))
      
      // Fetch points
      console.log('[PSYCH] Querying points for system_ids:', systemIds)
      const { data: pointsData, error: pointsError } = await (supabase as any)
        .from('psychrometric_points')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (pointsError) {
        console.error('[PSYCH] Points query error:', pointsError)
        throw pointsError
      }
      
      const points = (pointsData as any[] || []).map(mapDbToPoint)
      console.log('[PSYCH] Found', points.length, 'points')
      
      // Fetch processes
      console.log('[PSYCH] Querying processes for system_ids:', systemIds)
      const { data: processesData, error: processesError } = await (supabase as any)
        .from('psychrometric_processes')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (processesError) {
        console.error('[PSYCH] Processes query error:', processesError)
        throw processesError
      }
      
      const processes = (processesData as any[] || []).map(mapDbToProcess)
      console.log('[PSYCH] Found', processes.length, 'processes')
      
      console.log('[PSYCH] Updating local state with fetched data...')
      set(state => ({
        systems: [
          ...state.systems.filter(s => s.personalCalcId !== personalCalcId),
          ...systems,
        ],
        points: [
          ...state.points.filter(p => !systemIds.includes(p.systemId)),
          ...points,
        ],
        processes: [
          ...state.processes.filter(p => !systemIds.includes(p.systemId)),
          ...processes,
        ],
        isLoading: false,
        lastFetchedPersonalCalcId: personalCalcId,
      }))
      
      console.log('[PSYCH] State updated successfully!')
      console.log('[PSYCH] ========================================')
      
      // Calculate all points
      points.forEach(p => get().calculatePointState(p.id))
    } catch (error) {
      console.error('[PSYCH] FETCH FAILED:', error)
      set({ 
        error: 'Failed to load systems', 
        isLoading: false,
        lastFetchedPersonalCalcId: personalCalcId,
      })
    }
  },
  
  fetchSystemById: async (systemId) => {
    if (!isSupabaseConfigured()) return
    
    set({ isLoading: true, error: null })
    
    try {
      const { data: systemData, error: systemError } = await (supabase as any)
        .from('psychrometric_systems')
        .select('*')
        .eq('id', systemId)
        .single()
      
      if (systemError) throw systemError
      if (!systemData) throw new Error('System not found')
      
      const system = mapDbToSystem(systemData as any)
      
      // Fetch points
      const { data: pointsData, error: pointsError } = await (supabase as any)
        .from('psychrometric_points')
        .select('*')
        .eq('system_id', systemId)
        .order('sort_order', { ascending: true })
      
      if (pointsError) throw pointsError
      
      const points = (pointsData as any[] || []).map(mapDbToPoint)
      
      // Fetch processes
      const { data: processesData, error: processesError } = await (supabase as any)
        .from('psychrometric_processes')
        .select('*')
        .eq('system_id', systemId)
        .order('sort_order', { ascending: true })
      
      if (processesError) throw processesError
      
      const processes = (processesData as any[] || []).map(mapDbToProcess)
      
      set(state => ({
        systems: [
          ...state.systems.filter(s => s.id !== systemId),
          system,
        ],
        points: [
          ...state.points.filter(p => p.systemId !== systemId),
          ...points,
        ],
        processes: [
          ...state.processes.filter(p => p.systemId !== systemId),
          ...processes,
        ],
        currentSystemId: systemId,
        isLoading: false,
      }))
      
      // Calculate all points
      points.forEach(p => get().calculatePointState(p.id))
    } catch (error) {
      console.error('Failed to fetch psychrometric system:', error)
      set({ error: 'Failed to load system', isLoading: false })
    }
  },
  
  // =========================================== 
  // MOVE TO PROJECT
  // =========================================== 
  moveSystemsToProject: async (personalCalcId, projectId) => {
    if (!isSupabaseConfigured()) return
    
    try {
      set({ isSaving: true })
      
      const { error } = await (supabase as any)
        .from('psychrometric_systems')
        .update({
          project_id: projectId,
          personal_calc_id: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('personal_calc_id', personalCalcId)
      
      if (error) throw error
      
      // Update local state
      set(state => ({
        systems: state.systems.map(s =>
          s.personalCalcId === personalCalcId
            ? { ...s, projectId, personalCalcId: null, updatedAt: new Date() }
            : s
        ),
      }))
    } catch (error) {
      console.error('Failed to move systems to project:', error)
      set({ error: 'Failed to move systems to project' })
    } finally {
      set({ isSaving: false })
    }
  },
  
  // =========================================== 
  // GETTERS
  // =========================================== 
  getSystem: (systemId) => {
    return get().systems.find(s => s.id === systemId)
  },
  
  getPointsForSystem: (systemId) => {
    return get().points
      .filter(p => p.systemId === systemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },
  
  getProcessesForSystem: (systemId) => {
    return get().processes
      .filter(p => p.systemId === systemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },
  
  getCurrentSystem: () => {
    const state = get()
    if (!state.currentSystemId) return undefined
    return state.systems.find(s => s.id === state.currentSystemId)
  },
  
  getCurrentPoints: () => {
    const state = get()
    if (!state.currentSystemId) return []
    return state.points
      .filter(p => p.systemId === state.currentSystemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },
  
  getBarometricPressure: (systemId) => {
    const system = get().systems.find(s => s.id === systemId)
    if (!system) return 14.696
    return barometricPressureAtAltitude(system.altitudeFt)
  },
  
  // Point chaining helpers
  getPointUsageCount: (pointId) => {
    const processes = get().processes
    let count = 0
    processes.forEach(p => {
      if (p.startPointId === pointId) count++
      if (p.endPointId === pointId) count++
    })
    return count
  },
  
  getProcessesUsingPoint: (pointId) => {
    return get().processes.filter(p => 
      p.startPointId === pointId || p.endPointId === pointId
    )
  },
  
  isPointShared: (pointId) => {
    return get().getPointUsageCount(pointId) > 1
  },
  
  // Get next available sequential point label (A, B, C, D...)
  getNextPointLabel: (systemId) => {
    const points = get().points.filter(p => p.systemId === systemId)
    const existingLabels = points
      .map(p => p.pointLabel)
      .filter(label => /^[A-Z]$/.test(label))
    
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (let i = 0; i < alphabet.length; i++) {
      if (!existingLabels.includes(alphabet[i])) {
        return alphabet[i]
      }
    }
    return 'A' // Fallback
  },
  
  // Get the end point of the last process in the system (for chaining)
  getLastProcessEndPoint: (systemId) => {
    const processes = get().processes
      .filter(p => p.systemId === systemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    
    if (processes.length === 0) return null
    
    const lastProcess = processes[processes.length - 1]
    if (!lastProcess.endPointId) return null
    
    return get().points.find(p => p.id === lastProcess.endPointId) || null
  },
}))

// =========================================== 
// DB MAPPING HELPERS
// =========================================== 
function mapDbToSystem(data: any): PsychrometricSystem {
  return {
    id: data.id,
    projectId: data.project_id,
    personalCalcId: data.personal_calc_id,
    userId: data.user_id,
    name: data.name,
    systemCfm: data.system_cfm || 10000,
    altitudeFt: data.altitude_ft || 0,
    barometricPressurePsia: data.barometric_pressure_psia,
    tempUnit: data.temp_unit as TempUnit || 'F',
    humidityUnit: data.humidity_unit as HumidityUnit || 'grains',
    notes: data.notes || '',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

function mapDbToPoint(data: any): PsychrometricPoint {
  return {
    id: data.id,
    systemId: data.system_id,
    pointLabel: data.point_label || 'A',
    pointType: data.point_type as PointType || 'state',
    inputMode: data.input_mode as PsychInputMode || 'db_wb',
    dryBulbF: data.dry_bulb_f,
    wetBulbF: data.wet_bulb_f,
    dewPointF: data.dew_point_f,
    relativeHumidity: data.relative_humidity,
    humidityRatioGrains: data.humidity_ratio_grains,
    enthalpyBtuLb: data.enthalpy_btu_lb,
    specificVolumeFt3Lb: data.specific_volume_ft3_lb,
    cfm: data.cfm,
    chartX: data.chart_x,
    chartY: data.chart_y,
    sortOrder: data.sort_order || 0,
    createdAt: new Date(data.created_at),
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  }
}

function mapDbToProcess(data: any): PsychrometricProcess {
  return {
    id: data.id,
    systemId: data.system_id,
    name: data.name,
    processType: data.process_type as ProcessType || 'custom',
    startPointId: data.start_point_id,
    endPointId: data.end_point_id,
    pointAId: data.point_a_id,
    pointBId: data.point_b_id,
    mixedPointId: data.mixed_point_id,
    cfm: data.cfm || 1000,
    totalLoadBtuh: data.total_load_btuh,
    sensibleLoadBtuh: data.sensible_load_btuh,
    latentLoadBtuh: data.latent_load_btuh,
    totalLoadTons: data.total_load_tons,
    moistureLbHr: data.moisture_lb_hr,
    sortOrder: data.sort_order || 0,
    label: data.label,
    description: data.description,
    notes: data.notes,
    createdAt: new Date(data.created_at),
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  }
}
