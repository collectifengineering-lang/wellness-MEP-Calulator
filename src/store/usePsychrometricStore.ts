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
  
  // Actions - Systems
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
  
  // =========================================== 
  // SYSTEM ACTIONS
  // =========================================== 
  createSystem: async (options) => {
    const { projectId = null, personalCalcId = null, name = 'Psychrometric Analysis', altitudeFt = 0 } = options
    const id = uuidv4()
    const now = new Date()
    const userId = useAuthStore.getState().user?.id
    
    const newSystem: PsychrometricSystem = {
      id,
      projectId,
      personalCalcId,
      userId,
      name,
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
    
    // Save to database
    if (isSupabaseConfigured() && userId) {
      try {
        set({ isSaving: true })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('psychrometric_systems')
          .insert({
            id,
            project_id: projectId,
            personal_calc_id: personalCalcId,
            user_id: userId,
            name,
            altitude_ft: altitudeFt,
            barometric_pressure_psia: newSystem.barometricPressurePsia,
            temp_unit: newSystem.tempUnit,
            humidity_unit: newSystem.humidityUnit,
            notes: newSystem.notes,
          })
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save psychrometric system:', error)
        set({ error: 'Failed to save system' })
      } finally {
        set({ isSaving: false })
      }
    }
    
    return newSystem
  },
  
  updateSystem: async (systemId, updates) => {
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
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save psychrometric point:', error)
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
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save psychrometric process:', error)
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
    // Remove from local state
    set(state => ({
      processes: state.processes.filter(p => p.id !== processId),
    }))
    
    // Delete from database
    if (isSupabaseConfigured()) {
      try {
        const { error } = await (supabase as any)
          .from('psychrometric_processes')
          .delete()
          .eq('id', processId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete psychrometric process:', error)
      }
    }
  },
  
  // =========================================== 
  // DATA FETCHING
  // =========================================== 
  fetchSystemsForProject: async (projectId) => {
    if (!isSupabaseConfigured()) return
    
    set({ isLoading: true, error: null })
    
    try {
      const { data: systemsData, error: systemsError } = await (supabase as any)
        .from('psychrometric_systems')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      
      if (systemsError) throw systemsError
      
      if (!systemsData || systemsData.length === 0) {
        set({ isLoading: false })
        return
      }
      
      const systems = (systemsData as any[]).map(mapDbToSystem)
      const systemIds = systems.map(s => s.id)
      
      // Fetch points
      const { data: pointsData, error: pointsError } = await (supabase as any)
        .from('psychrometric_points')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (pointsError) throw pointsError
      
      const points = (pointsData as any[] || []).map(mapDbToPoint)
      
      // Fetch processes
      const { data: processesData, error: processesError } = await (supabase as any)
        .from('psychrometric_processes')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (processesError) throw processesError
      
      const processes = (processesData as any[] || []).map(mapDbToProcess)
      
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
      }))
      
      // Calculate all points
      points.forEach(p => get().calculatePointState(p.id))
    } catch (error) {
      console.error('Failed to fetch psychrometric systems:', error)
      set({ error: 'Failed to load systems', isLoading: false })
    }
  },
  
  fetchSystemsForPersonalCalc: async (personalCalcId) => {
    if (!isSupabaseConfigured()) return
    
    set({ isLoading: true, error: null })
    
    try {
      const { data: systemsData, error: systemsError } = await (supabase as any)
        .from('psychrometric_systems')
        .select('*')
        .eq('personal_calc_id', personalCalcId)
        .order('created_at', { ascending: true })
      
      if (systemsError) throw systemsError
      
      if (!systemsData || systemsData.length === 0) {
        set(state => ({
          systems: state.systems.filter(s => s.personalCalcId !== personalCalcId),
          isLoading: false,
        }))
        return
      }
      
      const systems = (systemsData as any[]).map(mapDbToSystem)
      const systemIds = systems.map(s => s.id)
      
      // Fetch points
      const { data: pointsData, error: pointsError } = await (supabase as any)
        .from('psychrometric_points')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (pointsError) throw pointsError
      
      const points = (pointsData as any[] || []).map(mapDbToPoint)
      
      // Fetch processes
      const { data: processesData, error: processesError } = await (supabase as any)
        .from('psychrometric_processes')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (processesError) throw processesError
      
      const processes = (processesData as any[] || []).map(mapDbToProcess)
      
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
      }))
      
      // Calculate all points
      points.forEach(p => get().calculatePointState(p.id))
    } catch (error) {
      console.error('Failed to fetch psychrometric systems:', error)
      set({ error: 'Failed to load systems', isLoading: false })
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
    notes: data.notes,
    createdAt: new Date(data.created_at),
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  }
}
