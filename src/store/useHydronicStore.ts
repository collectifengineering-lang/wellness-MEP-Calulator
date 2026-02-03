// =========================================== 
// HYDRONIC PUMP CALCULATOR STORE
// State management and Supabase sync
// =========================================== 

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type {
  HydronicSystem,
  HydronicPipeSection,
  HydronicFitting,
  SystemType,
  FluidType,
  PipeMaterial,
  HydronicCalculationResult,
} from '../types/hydronic'
import { calculateHydronicSystem } from '../calculations/hydronic'
import { getFitting, getFittingCv } from '../data/fittingsLibrary'

// =========================================== 
// STORE STATE INTERFACE
// =========================================== 
interface CreateSystemOptions {
  projectId?: string | null
  personalCalcId?: string | null
  name?: string
}

interface HydronicState {
  // Data
  systems: HydronicSystem[]
  sections: HydronicPipeSection[]
  currentSystemId: string | null
  
  // Calculation results (cached)
  calculationResults: Record<string, HydronicCalculationResult>
  
  // UI state
  isLoading: boolean
  isSaving: boolean
  error: string | null
  
  // Actions - Systems
  createSystem: (options: CreateSystemOptions) => Promise<HydronicSystem>
  updateSystem: (systemId: string, updates: Partial<HydronicSystem>) => Promise<void>
  deleteSystem: (systemId: string) => Promise<void>
  setCurrentSystem: (systemId: string | null) => void
  
  // Actions - Sections
  addSection: (systemId: string, name?: string) => Promise<HydronicPipeSection>
  updateSection: (sectionId: string, updates: Partial<HydronicPipeSection>) => Promise<void>
  deleteSection: (sectionId: string) => Promise<void>
  reorderSections: (systemId: string, orderedIds: string[]) => Promise<void>
  
  // Actions - Fittings
  addFitting: (sectionId: string, fittingType: string, quantity?: number) => Promise<void>
  updateFitting: (fittingId: string, updates: Partial<HydronicFitting>) => Promise<void>
  deleteFitting: (fittingId: string) => Promise<void>
  
  // Actions - Data
  fetchSystemsForProject: (projectId: string) => Promise<void>
  fetchSystemsForPersonalCalc: (personalCalcId: string) => Promise<void>
  fetchSystemById: (systemId: string) => Promise<void>
  fetchAllSystems: () => Promise<void>
  
  // Actions - Move to Project
  moveSystemsToProject: (personalCalcId: string, projectId: string) => Promise<void>
  
  // Actions - Calculation
  calculateSystem: (systemId: string) => HydronicCalculationResult | null
  
  // Getters
  getSystem: (systemId: string) => HydronicSystem | undefined
  getSectionsForSystem: (systemId: string) => HydronicPipeSection[]
  getFittingsForSection: (sectionId: string) => HydronicFitting[]
  getCurrentSystem: () => HydronicSystem | undefined
  getCurrentSections: () => HydronicPipeSection[]
}

// =========================================== 
// CREATE STORE
// =========================================== 
export const useHydronicStore = create<HydronicState>((set, get) => ({
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
    const { projectId = null, personalCalcId = null, name = 'New System' } = options
    const id = uuidv4()
    const now = new Date()
    
    const newSystem: HydronicSystem = {
      id,
      projectId,
      personalCalcId,
      name,
      systemType: 'closed',
      fluidType: 'water',
      glycolConcentration: 0,
      fluidTempF: 180,
      staticHeadFt: 0,
      safetyFactor: 0.15, // Default 15%
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
        const { error } = await supabase
          .from('hydronic_systems' as any)
          .insert({
            id,
            project_id: projectId,
            personal_calc_id: personalCalcId,
            name,
            system_type: newSystem.systemType,
            fluid_type: newSystem.fluidType,
            glycol_concentration: newSystem.glycolConcentration,
            fluid_temp_f: newSystem.fluidTempF,
            static_head_ft: newSystem.staticHeadFt,
            safety_factor: newSystem.safetyFactor,
            notes: newSystem.notes,
          } as any)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save hydronic system:', error)
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
        
        // Convert to snake_case for DB
        const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.systemType !== undefined) dbUpdates.system_type = updates.systemType
        if (updates.fluidType !== undefined) dbUpdates.fluid_type = updates.fluidType
        if (updates.glycolConcentration !== undefined) dbUpdates.glycol_concentration = updates.glycolConcentration
        if (updates.fluidTempF !== undefined) dbUpdates.fluidTempF = updates.fluidTempF
        if (updates.staticHeadFt !== undefined) dbUpdates.static_head_ft = updates.staticHeadFt
        if (updates.safetyFactor !== undefined) dbUpdates.safety_factor = updates.safetyFactor
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId
        if (updates.personalCalcId !== undefined) dbUpdates.personal_calc_id = updates.personalCalcId
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('hydronic_systems')
          .update(dbUpdates)
          .eq('id', systemId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to update hydronic system:', error)
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
        const { error } = await supabase
          .from('hydronic_systems' as any)
          .delete()
          .eq('id', systemId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete hydronic system:', error)
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
  addSection: async (systemId, name) => {
    const state = get()
    const existingSections = state.sections
      .filter(s => s.systemId === systemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const id = uuidv4()
    
    // Get values from the last section if available
    const lastSection = existingSections[existingSections.length - 1]
    
    const newSection: HydronicPipeSection = {
      id,
      systemId,
      name: name || `Section ${existingSections.length + 1}`,
      flowGpm: lastSection?.flowGpm ?? 10,
      pipeMaterial: lastSection?.pipeMaterial ?? 'copper_type_l',
      pipeSizeNominal: lastSection?.pipeSizeNominal ?? '1',
      lengthFt: 10,
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
        const { error } = await supabase
          .from('hydronic_pipe_sections' as any)
          .insert({
            id,
            system_id: systemId,
            name: newSection.name,
            flow_gpm: newSection.flowGpm,
            pipe_material: newSection.pipeMaterial,
            pipe_size_nominal: newSection.pipeSizeNominal,
            length_ft: newSection.lengthFt,
            sort_order: newSection.sortOrder,
          } as any)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save pipe section:', error)
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
        if (updates.flowGpm !== undefined) dbUpdates.flow_gpm = updates.flowGpm
        if (updates.pipeMaterial !== undefined) dbUpdates.pipe_material = updates.pipeMaterial
        if (updates.pipeSizeNominal !== undefined) dbUpdates.pipe_size_nominal = updates.pipeSizeNominal
        if (updates.lengthFt !== undefined) dbUpdates.length_ft = updates.lengthFt
        if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('hydronic_pipe_sections')
          .update(dbUpdates)
          .eq('id', sectionId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to update pipe section:', error)
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
        const { error } = await supabase
          .from('hydronic_pipe_sections' as any)
          .delete()
          .eq('id', sectionId)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete pipe section:', error)
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
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        for (let i = 0; i < orderedIds.length; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('hydronic_pipe_sections')
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
    
    // Check if fitting has a default Cv value based on pipe size
    const fittingData = getFitting(fittingType)
    let defaultCv: number | undefined
    let isDefaultCv = false
    
    if (fittingData?.cvBySizeTable && !fittingData.requiresCvInput) {
      // Look up Cv by pipe size
      const cv = getFittingCv(fittingData, section.pipeSizeNominal)
      if (cv !== undefined) {
        defaultCv = cv
        isDefaultCv = true
      }
    } else if (fittingData?.requiresCvInput && fittingData.cvBySizeTable) {
      // Even for requiresCvInput, provide a suggested default if available
      const cv = getFittingCv(fittingData, section.pipeSizeNominal)
      if (cv !== undefined) {
        defaultCv = cv
        isDefaultCv = true // Mark as default so it shows orange warning
      }
    }
    
    const newFitting: HydronicFitting = {
      id,
      sectionId,
      fittingType,
      quantity,
      cvOverride: defaultCv,
      isDefaultCv,
      createdAt: new Date(),
    }
    
    // Update local state
    set(state => ({
      sections: state.sections.map(s =>
        s.id === sectionId
          ? { ...s, fittings: [...s.fittings, newFitting] }
          : s
      ),
    }))
    
    // Recalculate
    get().calculateSystem(section.systemId)
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('hydronic_section_fittings' as any)
          .insert({
            id,
            section_id: sectionId,
            fitting_type: fittingType,
            quantity,
            cv_override: defaultCv,
          } as any)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save fitting:', error)
      }
    }
  },
  
  updateFitting: async (fittingId, updates) => {
    let systemId: string | null = null
    
    // If user is manually updating Cv, clear the isDefaultCv flag
    const finalUpdates = { ...updates }
    if (updates.cvOverride !== undefined) {
      finalUpdates.isDefaultCv = false
    }
    
    // Update local state and find system ID
    set(state => ({
      sections: state.sections.map(s => {
        const fitting = s.fittings.find(f => f.id === fittingId)
        if (fitting) {
          systemId = s.systemId
          return {
            ...s,
            fittings: s.fittings.map(f =>
              f.id === fittingId ? { ...f, ...finalUpdates } : f
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
        if (updates.fittingType !== undefined) dbUpdates.fitting_type = updates.fittingType
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity
        if (updates.cvOverride !== undefined) dbUpdates.cv_override = updates.cvOverride
        if (updates.dpOverrideFt !== undefined) dbUpdates.dp_override_ft = updates.dpOverrideFt
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('hydronic_section_fittings')
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
        const { error } = await supabase
          .from('hydronic_section_fittings' as any)
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
      // Fetch systems
      const { data: systemsData, error: systemsError } = await supabase
        .from('hydronic_systems' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      
      if (systemsError) throw systemsError
      
      if (!systemsData || systemsData.length === 0) {
        set({ isLoading: false })
        return
      }
      
      // Map to HydronicSystem type
      const systems: HydronicSystem[] = (systemsData as any[]).map(mapDbToSystem)
      
      // Fetch sections for all systems
      const systemIds = systems.map(s => s.id)
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('hydronic_pipe_sections' as any)
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (sectionsError) throw sectionsError
      
      // Fetch fittings for all sections
      let fittingsData: any[] = []
      const sectionsArr = (sectionsData || []) as any[]
      if (sectionsArr.length > 0) {
        const sectionIds = sectionsArr.map(s => s.id)
        const { data, error: fittingsError } = await supabase
          .from('hydronic_section_fittings' as any)
          .select('*')
          .in('section_id', sectionIds)
        
        if (fittingsError) throw fittingsError
        fittingsData = (data || []) as any[]
      }
      
      // Map sections with their fittings
      const sections: HydronicPipeSection[] = sectionsArr.map(s => ({
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
      console.error('Failed to fetch hydronic systems:', error)
      set({ error: 'Failed to load hydronic systems', isLoading: false })
    }
  },
  
  // =========================================== 
  // FETCH SYSTEMS FOR PERSONAL CALCULATION
  // =========================================== 
  fetchSystemsForPersonalCalc: async (personalCalcId) => {
    if (!isSupabaseConfigured()) return
    
    set({ isLoading: true, error: null })
    
    try {
      // Fetch systems for this personal calculation
      const { data: systemsData, error: systemsError } = await supabase
        .from('hydronic_systems' as any)
        .select('*')
        .eq('personal_calc_id', personalCalcId)
        .order('created_at', { ascending: true })
      
      if (systemsError) throw systemsError
      
      if (!systemsData || systemsData.length === 0) {
        // Clear systems for this personal calc
        set(state => ({
          systems: state.systems.filter(s => s.personalCalcId !== personalCalcId),
          isLoading: false,
        }))
        return
      }
      
      // Map to HydronicSystem type
      const systems: HydronicSystem[] = (systemsData as any[]).map(mapDbToSystem)
      
      // Fetch sections for all systems
      const systemIds = systems.map(s => s.id)
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('hydronic_pipe_sections' as any)
        .select('*')
        .in('system_id', systemIds)
        .order('sort_order', { ascending: true })
      
      if (sectionsError) throw sectionsError
      
      // Fetch fittings for all sections
      let fittingsData: any[] = []
      const sectionsArr = (sectionsData || []) as any[]
      if (sectionsArr.length > 0) {
        const sectionIds = sectionsArr.map(s => s.id)
        const { data, error: fittingsError } = await supabase
          .from('hydronic_section_fittings' as any)
          .select('*')
          .in('section_id', sectionIds)
        
        if (fittingsError) throw fittingsError
        fittingsData = (data || []) as any[]
      }
      
      // Map sections with their fittings
      const sections: HydronicPipeSection[] = sectionsArr.map(s => ({
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
      console.error('Failed to fetch hydronic systems for personal calc:', error)
      set({ error: 'Failed to load hydronic systems', isLoading: false })
    }
  },
  
  fetchSystemById: async (systemId) => {
    if (!isSupabaseConfigured()) return
    
    set({ isLoading: true, error: null })
    
    try {
      // Fetch system
      const { data: systemData, error: systemError } = await supabase
        .from('hydronic_systems' as any)
        .select('*')
        .eq('id', systemId)
        .single()
      
      if (systemError) throw systemError
      if (!systemData) throw new Error('System not found')
      
      const system = mapDbToSystem(systemData as any)
      
      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('hydronic_pipe_sections' as any)
        .select('*')
        .eq('system_id', systemId)
        .order('sort_order', { ascending: true })
      
      if (sectionsError) throw sectionsError
      
      // Fetch fittings
      let fittingsData: any[] = []
      const sectionsArr = (sectionsData || []) as any[]
      if (sectionsArr.length > 0) {
        const sectionIds = sectionsArr.map(s => s.id)
        const { data, error: fittingsError } = await supabase
          .from('hydronic_section_fittings' as any)
          .select('*')
          .in('section_id', sectionIds)
        
        if (fittingsError) throw fittingsError
        fittingsData = (data || []) as any[]
      }
      
      // Map sections with fittings
      const sections: HydronicPipeSection[] = sectionsArr.map(s => ({
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
      console.error('Failed to fetch hydronic system:', error)
      set({ error: 'Failed to load hydronic system', isLoading: false })
    }
  },
  
  fetchAllSystems: async () => {
    if (!isSupabaseConfigured()) return
    
    set({ isLoading: true, error: null })
    
    try {
      // Fetch all systems (standalone ones have null project_id)
      const { data: systemsData, error: systemsError } = await supabase
        .from('hydronic_systems' as any)
        .select('*')
        .is('project_id', null)
        .order('created_at', { ascending: false })
      
      if (systemsError) throw systemsError
      
      const systems: HydronicSystem[] = ((systemsData || []) as any[]).map(mapDbToSystem)
      
      set(state => ({
        systems: [
          ...state.systems.filter(s => s.projectId !== null),
          ...systems,
        ],
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to fetch hydronic systems:', error)
      set({ error: 'Failed to load hydronic systems', isLoading: false })
    }
  },
  
  // =========================================== 
  // MOVE SYSTEMS TO PROJECT
  // =========================================== 
  moveSystemsToProject: async (personalCalcId, projectId) => {
    if (!isSupabaseConfigured()) return
    
    try {
      set({ isSaving: true })
      
      // Update all systems from personal_calc_id to project_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('hydronic_systems')
        .update({ 
          project_id: projectId, 
          personal_calc_id: null,
          updated_at: new Date().toISOString()
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
    
    const result = calculateHydronicSystem(system, sections)
    
    // Cache the result
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
function mapDbToSystem(data: any): HydronicSystem {
  return {
    id: data.id,
    projectId: data.project_id,
    personalCalcId: data.personal_calc_id,
    name: data.name,
    systemType: data.system_type as SystemType,
    fluidType: data.fluid_type as FluidType,
    glycolConcentration: data.glycol_concentration || 0,
    fluidTempF: data.fluid_temp_f || 180,
    staticHeadFt: data.static_head_ft || 0,
    safetyFactor: data.safety_factor || 0.15,
    notes: data.notes || '',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

function mapDbToSection(data: any): Omit<HydronicPipeSection, 'fittings'> {
  return {
    id: data.id,
    systemId: data.system_id,
    name: data.name,
    flowGpm: data.flow_gpm || 10,
    pipeMaterial: data.pipe_material as PipeMaterial,
    pipeSizeNominal: data.pipe_size_nominal || '1',
    lengthFt: data.length_ft || 10,
    sortOrder: data.sort_order || 0,
    velocityFps: data.velocity_fps,
    reynoldsNumber: data.reynolds_number,
    frictionFactor: data.friction_factor,
    headLossFt: data.head_loss_ft,
    createdAt: new Date(data.created_at),
  }
}

function mapDbToFitting(data: any): HydronicFitting {
  return {
    id: data.id,
    sectionId: data.section_id,
    fittingType: data.fitting_type,
    quantity: data.quantity || 1,
    cvOverride: data.cv_override,
    dpOverrideFt: data.dp_override_ft,
    createdAt: new Date(data.created_at),
  }
}
