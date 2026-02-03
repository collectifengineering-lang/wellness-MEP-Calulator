// =========================================== 
// DUCT PRESSURE DROP CALCULATOR STORE
// State management and Supabase sync
// Mirrors hydronic store pattern
// =========================================== 

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type {
  DuctSystem,
  DuctSection,
  DuctFitting,
  DuctSystemType,
  DuctShape,
  DuctMaterial,
  DuctLiner,
  DuctSectionType,
  DuctCalculationResult,
} from '../types/duct'
import { calculateDuctSystem } from '../calculations/duct'

// =========================================== 
// STORE STATE INTERFACE
// =========================================== 
interface CreateDuctSystemOptions {
  projectId?: string | null
  personalCalcId?: string | null
  name?: string
}

interface DuctState {
  // Data
  systems: DuctSystem[]
  sections: DuctSection[]
  currentSystemId: string | null
  
  // Calculation results (cached)
  calculationResults: Record<string, DuctCalculationResult>
  
  // UI state
  isLoading: boolean
  isSaving: boolean
  error: string | null
  
  // Actions - Systems
  createSystem: (options: CreateDuctSystemOptions) => Promise<DuctSystem>
  updateSystem: (systemId: string, updates: Partial<DuctSystem>) => Promise<void>
  deleteSystem: (systemId: string) => Promise<void>
  setCurrentSystem: (systemId: string | null) => void
  
  // Actions - Sections
  addSection: (systemId: string, sectionType?: DuctSectionType, name?: string) => Promise<DuctSection>
  updateSection: (sectionId: string, updates: Partial<DuctSection>) => Promise<void>
  deleteSection: (sectionId: string) => Promise<void>
  reorderSections: (systemId: string, orderedIds: string[]) => Promise<void>
  
  // Actions - Fittings
  addFitting: (sectionId: string, fittingType: string, quantity?: number) => Promise<void>
  updateFitting: (fittingId: string, updates: Partial<DuctFitting>) => Promise<void>
  deleteFitting: (fittingId: string) => Promise<void>
  
  // Actions - Data Fetching
  fetchSystemsForProject: (projectId: string) => Promise<void>
  fetchSystemsForPersonalCalc: (personalCalcId: string) => Promise<void>
  fetchSystemById: (systemId: string) => Promise<void>
  
  // Actions - Move to Project
  moveSystemsToProject: (personalCalcId: string, projectId: string) => Promise<void>
  
  // Actions - Calculation
  calculateSystem: (systemId: string) => DuctCalculationResult | null
  
  // Getters
  getSystem: (systemId: string) => DuctSystem | undefined
  getSectionsForSystem: (systemId: string) => DuctSection[]
  getFittingsForSection: (sectionId: string) => DuctFitting[]
  getCurrentSystem: () => DuctSystem | undefined
  getCurrentSections: () => DuctSection[]
}

// =========================================== 
// CREATE STORE
// =========================================== 
export const useDuctStore = create<DuctState>((set, get) => ({
  // Initial state
  systems: [],
  sections: [],
  currentSystemId: null,
  calculationResults: {},
  isLoading: false,
  isSaving: false,
  error: null,
  
  // =========================================== 
  // SYSTEM ACTIONS
  // =========================================== 
  createSystem: async (options) => {
    const { projectId = null, personalCalcId = null, name = 'New Duct System' } = options
    const id = uuidv4()
    const now = new Date()
    
    const newSystem: DuctSystem = {
      id,
      projectId,
      personalCalcId,
      name,
      systemType: 'supply',
      totalCfm: 1000,
      altitudeFt: 0,
      temperatureF: 70,
      safetyFactor: 0.15,
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
    if (isSupabaseConfigured()) {
      try {
        set({ isSaving: true })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_systems')
          .insert({
            id,
            project_id: projectId,
            personal_calc_id: personalCalcId,
            name,
            system_type: newSystem.systemType,
            total_cfm: newSystem.totalCfm,
            altitude_ft: newSystem.altitudeFt,
            temperature_f: newSystem.temperatureF,
            safety_factor: newSystem.safetyFactor,
            notes: newSystem.notes,
          })
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save duct system:', error)
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
    
    // Recalculate
    get().calculateSystem(systemId)
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        set({ isSaving: true })
        
        const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.systemType !== undefined) dbUpdates.system_type = updates.systemType
        if (updates.totalCfm !== undefined) dbUpdates.total_cfm = updates.totalCfm
        if (updates.altitudeFt !== undefined) dbUpdates.altitude_ft = updates.altitudeFt
        if (updates.temperatureF !== undefined) dbUpdates.temperature_f = updates.temperatureF
        if (updates.safetyFactor !== undefined) dbUpdates.safety_factor = updates.safetyFactor
        if (updates.maxVelocityFpm !== undefined) dbUpdates.max_velocity_fpm = updates.maxVelocityFpm
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId
        if (updates.personalCalcId !== undefined) dbUpdates.personal_calc_id = updates.personalCalcId
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_systems')
          .update(dbUpdates)
          .eq('id', systemId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to update duct system:', error)
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
      sections: state.sections.filter(s => s.systemId !== systemId),
      currentSystemId: state.currentSystemId === systemId ? null : state.currentSystemId,
    }))
    
    // Delete from database
    if (isSupabaseConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_systems')
          .delete()
          .eq('id', systemId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete duct system:', error)
        set({ error: 'Failed to delete system' })
      }
    }
  },
  
  setCurrentSystem: (systemId) => {
    set({ currentSystemId: systemId })
    if (systemId) {
      get().calculateSystem(systemId)
    }
  },
  
  // =========================================== 
  // SECTION ACTIONS
  // =========================================== 
  addSection: async (systemId, sectionType = 'straight', name) => {
    const state = get()
    const existingSections = state.sections
      .filter(s => s.systemId === systemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const id = uuidv4()
    
    // Get values from last section if available
    const lastSection = existingSections[existingSections.length - 1]
    
    const newSection: DuctSection = {
      id,
      systemId,
      name: name || `Section ${existingSections.length + 1}`,
      sectionType,
      cfm: lastSection?.cfm ?? 1000,
      shape: lastSection?.shape ?? 'rectangular',
      widthIn: lastSection?.widthIn ?? 12,
      heightIn: lastSection?.heightIn ?? 12,
      diameterIn: lastSection?.diameterIn ?? 12,
      lengthFt: 10,
      material: lastSection?.material ?? 'galvanized',
      liner: lastSection?.liner ?? 'none',
      sortOrder: existingSections.length,
      fittings: [],
      createdAt: new Date(),
    }
    
    // Add to local state
    set(state => ({
      sections: [...state.sections, newSection],
    }))
    
    // Recalculate
    get().calculateSystem(systemId)
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_sections')
          .insert({
            id,
            system_id: systemId,
            name: newSection.name,
            section_type: newSection.sectionType,
            cfm: newSection.cfm,
            shape: newSection.shape,
            width_in: newSection.widthIn,
            height_in: newSection.heightIn,
            diameter_in: newSection.diameterIn,
            length_ft: newSection.lengthFt,
            material: newSection.material,
            liner: newSection.liner,
            sort_order: newSection.sortOrder,
          })
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save duct section:', error)
      }
    }
    
    return newSection
  },
  
  updateSection: async (sectionId, updates) => {
    const section = get().sections.find(s => s.id === sectionId)
    if (!section) return
    
    // Update local state
    set(state => ({
      sections: state.sections.map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }))
    
    // Recalculate
    get().calculateSystem(section.systemId)
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        const dbUpdates: Record<string, unknown> = {}
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.sectionType !== undefined) dbUpdates.section_type = updates.sectionType
        if (updates.cfm !== undefined) dbUpdates.cfm = updates.cfm
        if (updates.shape !== undefined) dbUpdates.shape = updates.shape
        if (updates.widthIn !== undefined) dbUpdates.width_in = updates.widthIn
        if (updates.heightIn !== undefined) dbUpdates.height_in = updates.heightIn
        if (updates.diameterIn !== undefined) dbUpdates.diameter_in = updates.diameterIn
        if (updates.lengthFt !== undefined) dbUpdates.length_ft = updates.lengthFt
        if (updates.material !== undefined) dbUpdates.material = updates.material
        if (updates.liner !== undefined) dbUpdates.liner = updates.liner
        if (updates.equipmentType !== undefined) dbUpdates.equipment_type = updates.equipmentType
        if (updates.fixedPressureDrop !== undefined) dbUpdates.fixed_pressure_drop = updates.fixedPressureDrop
        if (updates.filterMerv !== undefined) dbUpdates.filter_merv = updates.filterMerv
        if (updates.filterCondition !== undefined) dbUpdates.filter_condition = updates.filterCondition
        if (updates.coilRows !== undefined) dbUpdates.coil_rows = updates.coilRows
        if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_sections')
          .update(dbUpdates)
          .eq('id', sectionId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to update duct section:', error)
      }
    }
  },
  
  deleteSection: async (sectionId) => {
    const section = get().sections.find(s => s.id === sectionId)
    if (!section) return
    
    const systemId = section.systemId
    
    // Remove from local state
    set(state => ({
      sections: state.sections.filter(s => s.id !== sectionId),
    }))
    
    // Recalculate
    get().calculateSystem(systemId)
    
    // Delete from database
    if (isSupabaseConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_sections')
          .delete()
          .eq('id', sectionId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete duct section:', error)
      }
    }
  },
  
  reorderSections: async (systemId, orderedIds) => {
    // Update local state
    set(state => ({
      sections: state.sections.map(s => {
        if (s.systemId !== systemId) return s
        const newOrder = orderedIds.indexOf(s.id)
        return newOrder >= 0 ? { ...s, sortOrder: newOrder } : s
      }),
    }))
    
    // Recalculate
    get().calculateSystem(systemId)
    
    // Update in database
    if (isSupabaseConfigured()) {
      try {
        for (let i = 0; i < orderedIds.length; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('duct_sections')
            .update({ sort_order: i })
            .eq('id', orderedIds[i])
        }
      } catch (error) {
        console.error('Failed to reorder sections:', error)
      }
    }
  },
  
  // =========================================== 
  // FITTING ACTIONS
  // =========================================== 
  addFitting: async (sectionId, fittingType, quantity = 1) => {
    const section = get().sections.find(s => s.id === sectionId)
    if (!section) return
    
    const id = uuidv4()
    
    const newFitting: DuctFitting = {
      id,
      sectionId,
      fittingType,
      fittingCategory: 'elbow', // Will be updated from library
      quantity,
      createdAt: new Date(),
    }
    
    // Add to section's fittings
    set(state => ({
      sections: state.sections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            fittings: [...s.fittings, newFitting],
          }
        }
        return s
      }),
    }))
    
    // Recalculate
    get().calculateSystem(section.systemId)
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_section_fittings')
          .insert({
            id,
            section_id: sectionId,
            fitting_type: fittingType,
            quantity,
          })
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save fitting:', error)
      }
    }
  },
  
  updateFitting: async (fittingId, updates) => {
    let systemId: string | null = null
    
    // Update local state
    set(state => ({
      sections: state.sections.map(s => {
        const fitting = s.fittings.find(f => f.id === fittingId)
        if (fitting) {
          systemId = s.systemId
          return {
            ...s,
            fittings: s.fittings.map(f =>
              f.id === fittingId ? { ...f, ...updates } : f
            ),
          }
        }
        return s
      }),
    }))
    
    // Recalculate
    if (systemId) {
      get().calculateSystem(systemId)
    }
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        const dbUpdates: Record<string, unknown> = {}
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity
        if (updates.cCoefficientOverride !== undefined) dbUpdates.c_coefficient_override = updates.cCoefficientOverride
        if (updates.fixedDpOverride !== undefined) dbUpdates.fixed_dp_override = updates.fixedDpOverride
        if (updates.elbowRadiusRatio !== undefined) dbUpdates.elbow_radius_ratio = updates.elbowRadiusRatio
        if (updates.hasTurningVanes !== undefined) dbUpdates.has_turning_vanes = updates.hasTurningVanes
        if (updates.damperPositionPercent !== undefined) dbUpdates.damper_position_percent = updates.damperPositionPercent
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_section_fittings')
          .update(dbUpdates)
          .eq('id', fittingId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to update fitting:', error)
      }
    }
  },
  
  deleteFitting: async (fittingId) => {
    let systemId: string | null = null
    
    // Remove from local state
    set(state => ({
      sections: state.sections.map(s => {
        const fitting = s.fittings.find(f => f.id === fittingId)
        if (fitting) {
          systemId = s.systemId
          return {
            ...s,
            fittings: s.fittings.filter(f => f.id !== fittingId),
          }
        }
        return s
      }),
    }))
    
    // Recalculate
    if (systemId) {
      get().calculateSystem(systemId)
    }
    
    // Delete from database
    if (isSupabaseConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('duct_section_fittings')
          .delete()
          .eq('id', fittingId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete fitting:', error)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: systemsData, error: systemsError } = await (supabase as any)
        .from('duct_systems')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      
      if (systemsError) throw systemsError
      
      if (!systemsData || systemsData.length === 0) {
        set({ isLoading: false })
        return
      }
      
      const systems: DuctSystem[] = systemsData.map(mapDbToSystem)
      const systemIds = systems.map(s => s.id)
      
      // Fetch sections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sectionsData, error: sectionsError } = await (supabase as any)
        .from('duct_sections')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (sectionsError) throw sectionsError
      
      // Fetch fittings
      let fittingsData: any[] = []
      const sectionsArr = (sectionsData || []) as any[]
      if (sectionsArr.length > 0) {
        const sectionIds = sectionsArr.map(s => s.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fittingsError } = await (supabase as any)
          .from('duct_section_fittings')
          .select('*')
          .in('section_id', sectionIds)
        
        if (fittingsError) throw fittingsError
        fittingsData = (data || []) as any[]
      }
      
      // Map sections with fittings
      const sections: DuctSection[] = sectionsArr.map(s => ({
        ...mapDbToSection(s),
        fittings: fittingsData
          .filter(f => f.section_id === s.id)
          .map(mapDbToFitting),
      }))
      
      set(state => ({
        systems: [
          ...state.systems.filter(s => s.projectId !== projectId),
          ...systems,
        ],
        sections: [
          ...state.sections.filter(s => !systemIds.includes(s.systemId)),
          ...sections,
        ],
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to fetch duct systems:', error)
      set({ error: 'Failed to load duct systems', isLoading: false })
    }
  },
  
  fetchSystemsForPersonalCalc: async (personalCalcId) => {
    if (!isSupabaseConfigured()) return
    
    set({ isLoading: true, error: null })
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: systemsData, error: systemsError } = await (supabase as any)
        .from('duct_systems')
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
      
      const systems: DuctSystem[] = systemsData.map(mapDbToSystem)
      const systemIds = systems.map(s => s.id)
      
      // Fetch sections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sectionsData, error: sectionsError } = await (supabase as any)
        .from('duct_sections')
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (sectionsError) throw sectionsError
      
      // Fetch fittings
      let fittingsData: any[] = []
      const sectionsArr = (sectionsData || []) as any[]
      if (sectionsArr.length > 0) {
        const sectionIds = sectionsArr.map(s => s.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fittingsError } = await (supabase as any)
          .from('duct_section_fittings')
          .select('*')
          .in('section_id', sectionIds)
        
        if (fittingsError) throw fittingsError
        fittingsData = (data || []) as any[]
      }
      
      // Map sections with fittings
      const sections: DuctSection[] = sectionsArr.map(s => ({
        ...mapDbToSection(s),
        fittings: fittingsData
          .filter(f => f.section_id === s.id)
          .map(mapDbToFitting),
      }))
      
      set(state => ({
        systems: [
          ...state.systems.filter(s => s.personalCalcId !== personalCalcId),
          ...systems,
        ],
        sections: [
          ...state.sections.filter(s => !systemIds.includes(s.systemId)),
          ...sections,
        ],
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to fetch duct systems:', error)
      set({ error: 'Failed to load duct systems', isLoading: false })
    }
  },
  
  fetchSystemById: async (systemId) => {
    if (!isSupabaseConfigured()) return
    
    set({ isLoading: true, error: null })
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: systemData, error: systemError } = await (supabase as any)
        .from('duct_systems')
        .select('*')
        .eq('id', systemId)
        .single()
      
      if (systemError) throw systemError
      if (!systemData) throw new Error('System not found')
      
      const system = mapDbToSystem(systemData)
      
      // Fetch sections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sectionsData, error: sectionsError } = await (supabase as any)
        .from('duct_sections')
        .select('*')
        .eq('system_id', systemId)
        .order('sort_order', { ascending: true })
      
      if (sectionsError) throw sectionsError
      
      // Fetch fittings
      let fittingsData: any[] = []
      const sectionsArr = (sectionsData || []) as any[]
      if (sectionsArr.length > 0) {
        const sectionIds = sectionsArr.map(s => s.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fittingsError } = await (supabase as any)
          .from('duct_section_fittings')
          .select('*')
          .in('section_id', sectionIds)
        
        if (fittingsError) throw fittingsError
        fittingsData = (data || []) as any[]
      }
      
      // Map sections with fittings
      const sections: DuctSection[] = sectionsArr.map(s => ({
        ...mapDbToSection(s),
        fittings: fittingsData
          .filter(f => f.section_id === s.id)
          .map(mapDbToFitting),
      }))
      
      set(state => ({
        systems: [
          ...state.systems.filter(s => s.id !== systemId),
          system,
        ],
        sections: [
          ...state.sections.filter(s => s.systemId !== systemId),
          ...sections,
        ],
        currentSystemId: systemId,
        isLoading: false,
      }))
      
      // Calculate
      get().calculateSystem(systemId)
    } catch (error) {
      console.error('Failed to fetch duct system:', error)
      set({ error: 'Failed to load duct system', isLoading: false })
    }
  },
  
  // =========================================== 
  // MOVE TO PROJECT
  // =========================================== 
  moveSystemsToProject: async (personalCalcId, projectId) => {
    if (!isSupabaseConfigured()) return
    
    try {
      set({ isSaving: true })
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('duct_systems')
        .update({
          project_id: projectId,
          personal_calc_id: null,
          updated_at: new Date().toISOString(),
        })
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
  // CALCULATION
  // =========================================== 
  calculateSystem: (systemId) => {
    const state = get()
    const system = state.systems.find(s => s.id === systemId)
    if (!system) return null
    
    const sections = state.sections
      .filter(s => s.systemId === systemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    
    const result = calculateDuctSystem(system, sections)
    
    // Cache result
    set(state => ({
      calculationResults: {
        ...state.calculationResults,
        [systemId]: result,
      },
    }))
    
    return result
  },
  
  // =========================================== 
  // GETTERS
  // =========================================== 
  getSystem: (systemId) => {
    return get().systems.find(s => s.id === systemId)
  },
  
  getSectionsForSystem: (systemId) => {
    return get().sections
      .filter(s => s.systemId === systemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },
  
  getFittingsForSection: (sectionId) => {
    const section = get().sections.find(s => s.id === sectionId)
    return section?.fittings || []
  },
  
  getCurrentSystem: () => {
    const state = get()
    if (!state.currentSystemId) return undefined
    return state.systems.find(s => s.id === state.currentSystemId)
  },
  
  getCurrentSections: () => {
    const state = get()
    if (!state.currentSystemId) return []
    return state.sections
      .filter(s => s.systemId === state.currentSystemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },
}))

// =========================================== 
// DB MAPPING HELPERS
// =========================================== 
function mapDbToSystem(data: any): DuctSystem {
  return {
    id: data.id,
    projectId: data.project_id,
    personalCalcId: data.personal_calc_id,
    name: data.name,
    systemType: data.system_type as DuctSystemType,
    totalCfm: data.total_cfm || 1000,
    altitudeFt: data.altitude_ft || 0,
    temperatureF: data.temperature_f || 70,
    safetyFactor: data.safety_factor || 0.15,
    maxVelocityFpm: data.max_velocity_fpm,
    notes: data.notes || '',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

function mapDbToSection(data: any): Omit<DuctSection, 'fittings'> {
  return {
    id: data.id,
    systemId: data.system_id,
    name: data.name || 'Section',
    sectionType: data.section_type as DuctSectionType,
    cfm: data.cfm || 1000,
    shape: data.shape as DuctShape,
    widthIn: data.width_in || 12,
    heightIn: data.height_in || 12,
    diameterIn: data.diameter_in || 12,
    lengthFt: data.length_ft || 10,
    material: data.material as DuctMaterial,
    liner: data.liner as DuctLiner,
    equipmentType: data.equipment_type,
    fixedPressureDrop: data.fixed_pressure_drop,
    filterMerv: data.filter_merv,
    filterCondition: data.filter_condition,
    coilRows: data.coil_rows,
    sortOrder: data.sort_order || 0,
    createdAt: new Date(data.created_at),
  }
}

function mapDbToFitting(data: any): DuctFitting {
  return {
    id: data.id,
    sectionId: data.section_id,
    fittingType: data.fitting_type,
    fittingCategory: data.fitting_category || 'elbow',
    quantity: data.quantity || 1,
    cCoefficientOverride: data.c_coefficient_override,
    fixedDpOverride: data.fixed_dp_override,
    elbowRadiusRatio: data.elbow_radius_ratio,
    hasTurningVanes: data.has_turning_vanes,
    damperPositionPercent: data.damper_position_percent,
    notes: data.notes,
    createdAt: new Date(data.created_at),
  }
}
