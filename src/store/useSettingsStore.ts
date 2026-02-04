import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { zoneDefaults as builtInDefaults, type ZoneDefaults } from '../data/zoneDefaults'
import type { ZoneType } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Track realtime subscription
let settingsChannel: ReturnType<typeof supabase.channel> | null = null

// Electrical calculation settings
export interface ElectricalSettings {
  voltage_primary: number       // Primary voltage (208 or 480)
  voltage_secondary: number     // Secondary voltage
  power_factor: number          // Power factor (0.80 - 1.0)
  spare_capacity: number        // Spare capacity percentage (0.10 - 0.50)
  general_va_sf: number         // General lighting + receptacle VA/SF
  demand_factor: number         // Demand diversity factor
}

// Gas calculation settings
export interface GasSettings {
  min_pressure_wc: number       // Minimum pressure in inches W.C.
  high_pressure_threshold_cfh: number  // CFH threshold for high pressure
  btu_per_cf: number            // BTU per cubic foot of natural gas
}

// DHW calculation settings
export interface DHWGlobalSettings {
  tankless_unit_btu: number     // BTU per tankless unit
  storage_factor: number        // Usable storage factor (0.6 - 0.8)
  default_peak_duration: number // Default peak duration in hours
}

// Plumbing settings
export interface PlumbingSettings {
  backwash_pit_threshold_gpm: number  // GPM threshold for backwash pit
  hot_water_flow_ratio: number        // Hot water flow as fraction of total (0.3-0.8)
  cold_water_velocity_fps: number     // Design velocity for COLD water pipe sizing (FPS)
  hot_water_velocity_fps: number      // Design velocity for HOT water pipe sizing (FPS)
  use_calculated_hw_ratio: boolean    // If true, use ratio calculated from fixture units (ASPE method)
  // Legacy field for backwards compatibility
  design_velocity_fps?: number        // @deprecated - use cold_water_velocity_fps
  hot_water_demand_factor?: number    // @deprecated - use hot_water_flow_ratio
}

// Climate multipliers for regional adjustments
export interface ClimateMultipliers {
  hot_humid: { cooling: number; heating: number; ventilation: number }
  cold_dry: { cooling: number; heating: number; ventilation: number }
  temperate: { cooling: number; heating: number; ventilation: number }
}

// Custom ASHRAE space type for user-defined ventilation rates
export interface CustomAshraeSpaceType {
  id: string
  category: string
  name: string
  displayName: string
  // ASHRAE 62.1 style (occupancy-based)
  Rp?: number                    // CFM per person
  Ra?: number                    // CFM per SF
  defaultOccupancy?: number      // People per 1000 SF
  // ASHRAE 170 style (ACH-based)
  minTotalACH?: number           // Total air changes per hour
  minOAach?: number              // Outdoor air ACH
  pressureRelationship?: 'positive' | 'negative' | 'equal'
  allAirExhaust?: boolean
  // Exhaust requirements (Table 6-2)
  exhaustCfmSf?: number          // Exhaust rate per area (CFM/SF)
  exhaustCfmUnit?: number        // Exhaust rate per fixture
  exhaustUnitType?: 'toilet' | 'urinal' | 'shower' | 'room' | 'kitchen'
  exhaustCfmMin?: number         // Min rate (continuous)
  exhaustCfmMax?: number         // Max rate (intermittent)
  exhaustMinPerRoom?: number     // Minimum per room
  exhaustNotes?: string
  // Common
  standard: 'ashrae62' | 'ashrae170' | 'custom'
  notes?: string
}

// Database-loaded ASHRAE space type (from ashrae_space_types table)
export interface DbAshraeSpaceType {
  id: string
  category: string
  name: string
  display_name: string
  standard: 'ashrae62' | 'ashrae170' | 'custom'
  
  // Ventilation mode: determines which fields to use
  ventilation_mode?: 'cfm_rates' | 'ach' | 'ach_healthcare'
  
  // ASHRAE 62.1 CFM-based ventilation
  rp?: number                    // CFM per person
  ra?: number                    // CFM per SF
  default_occupancy?: number     // People per 1000 SF
  air_class?: number             // 1, 2, or 3
  
  // ACH-based ventilation (for wellness spaces like saunas)
  ventilation_ach?: number       // Total ventilation in ACH
  exhaust_ach?: number           // Exhaust in ACH
  
  // ASHRAE 170 Healthcare (ach_healthcare mode)
  min_total_ach?: number
  min_oa_ach?: number
  pressure_relationship?: string
  all_air_exhaust?: boolean
  recirculated?: boolean
  
  // Exhaust Requirements (ASHRAE 62.1 Table 6-4)
  exhaust_cfm_sf?: number
  exhaust_cfm_unit?: number
  exhaust_unit_type?: string
  exhaust_cfm_min?: number
  exhaust_cfm_max?: number
  exhaust_min_per_room?: number
  exhaust_notes?: string
  exhaust_fixtures_per_sf?: Record<string, number>
  notes?: string
}

// Database-loaded zone type default (from zone_type_defaults table)
export interface DbZoneTypeDefault {
  id: string
  display_name: string
  category: string
  default_sf: number
  switchable?: boolean
  ashrae_space_type_id?: string
  lighting_w_sf?: number
  receptacle_va_sf?: number
  cooling_sf_ton?: number
  heating_btuh_sf?: number
  fixed_kw?: number
  gas_mbh?: number
  ventilation_cfm?: number
  exhaust_cfm?: number
  pool_heater_gas_mbh?: number
  latent_adder?: number
  occupants_per_1000sf?: number
  default_fixtures?: Record<string, number>
  visible_fixtures?: string[]
  default_equipment?: any[]
  requires_standby_power?: boolean
  requires_type1_hood?: boolean
  source_notes?: string
}

interface SettingsState {
  // Custom zone defaults (overrides built-in defaults)
  customZoneDefaults: Record<string, ZoneDefaults>
  // Custom zone types added by user
  customZoneTypes: string[]
  // Custom ASHRAE space types added by user
  customAshraeSpaceTypes: CustomAshraeSpaceType[]
  
  // Database-loaded data (single source of truth when available)
  dbAshraeSpaceTypes: DbAshraeSpaceType[]
  dbZoneTypeDefaults: DbZoneTypeDefault[]
  dbDataLoaded: boolean
  ashraeLoadAttempted: boolean
  
  // Global calculation settings
  electrical: ElectricalSettings
  gas: GasSettings
  dhw: DHWGlobalSettings
  plumbing: PlumbingSettings
  climate: ClimateMultipliers
  
  // Sync status
  isLoading: boolean
  lastSyncedAt: string | null
  syncError: string | null
  
  // Actions
  updateZoneDefaults: (zoneType: string, updates: Partial<ZoneDefaults>) => void
  addCustomZoneType: (id: string, defaults: ZoneDefaults) => void
  deleteCustomZoneType: (id: string) => void
  resetZoneDefaults: (zoneType: string) => void
  resetAllDefaults: () => void
  
  // ASHRAE space type actions
  addCustomAshraeSpaceType: (spaceType: CustomAshraeSpaceType) => void
  updateCustomAshraeSpaceType: (id: string, updates: Partial<CustomAshraeSpaceType>) => void
  deleteCustomAshraeSpaceType: (id: string) => void
  getCustomAshraeSpaceType: (id: string) => CustomAshraeSpaceType | undefined
  
  // Database ASHRAE/Zone actions
  fetchAshraeSpaceTypes: () => Promise<void>
  fetchZoneTypeDefaults: () => Promise<void>
  saveAshraeSpaceType: (spaceType: DbAshraeSpaceType) => Promise<void>
  saveZoneTypeDefault: (zoneDefault: DbZoneTypeDefault) => Promise<void>
  deleteDbAshraeSpaceType: (id: string) => Promise<void>
  deleteDbZoneTypeDefault: (id: string) => Promise<void>
  
  // Global settings actions
  updateElectricalSettings: (updates: Partial<ElectricalSettings>) => void
  updateGasSettings: (updates: Partial<GasSettings>) => void
  updateDHWSettings: (updates: Partial<DHWGlobalSettings>) => void
  updatePlumbingSettings: (updates: Partial<PlumbingSettings>) => void
  updateClimateMultipliers: (climate: keyof ClimateMultipliers, updates: Partial<ClimateMultipliers['temperate']>) => void
  resetGlobalSettings: () => void
  
  // Sync actions
  fetchFromDatabase: () => Promise<void>
  saveToDatabase: () => Promise<void>
  
  // Getters
  getZoneDefaults: (zoneType: string) => ZoneDefaults
  getAllZoneTypes: () => string[]
  isCustomZoneType: (zoneType: string) => boolean
  getDbAshraeSpaceType: (id: string) => DbAshraeSpaceType | undefined
  getDbZoneTypeDefault: (id: string) => DbZoneTypeDefault | undefined
  
  // Unified getters (database only)
  getAllAshraeSpaceTypes: () => DbAshraeSpaceType[]
  getAshraeSpaceType: (id: string) => DbAshraeSpaceType | undefined
  getAshraeCategories: () => string[]
  getAshraeSpaceTypesByCategory: (category: string) => DbAshraeSpaceType[]
  getAshrae62SpaceTypes: () => DbAshraeSpaceType[]
  getAshrae170SpaceTypes: () => DbAshraeSpaceType[]
  calculateDefaultOccupancy: (spaceTypeId: string, areaSf: number) => number
  isUsingDatabase: () => boolean
}

// Default values for global settings
const defaultElectrical: ElectricalSettings = {
  voltage_primary: 208,
  voltage_secondary: 480,
  power_factor: 0.85,
  spare_capacity: 0.20,
  general_va_sf: 3,
  demand_factor: 1.0, // 100% of connected load (conservative default)
}

const defaultGas: GasSettings = {
  min_pressure_wc: 7,
  high_pressure_threshold_cfh: 5000,
  btu_per_cf: 1000,
}

const defaultDHW: DHWGlobalSettings = {
  tankless_unit_btu: 199900,
  storage_factor: 0.7,
  default_peak_duration: 2,
}

const defaultPlumbing: PlumbingSettings = {
  backwash_pit_threshold_gpm: 225,
  hot_water_flow_ratio: 0.6,           // Manual override: Hot water flow = 60% of total
  cold_water_velocity_fps: 5,          // 5 FPS default for cold water
  hot_water_velocity_fps: 4,           // 4 FPS default for hot water (lower to reduce erosion)
  use_calculated_hw_ratio: true,       // Default: use calculated ratio from fixture WSFU
}

// Climate multipliers based on ASHRAE guidelines
// Hot/humid (Miami, LA, Houston): More cooling, less heating
// Cold/dry (NYC, Chicago, Boston): More heating, more ventilation for humidity
// Temperate (SF, Seattle, Portland): Balanced baseline
const defaultClimate: ClimateMultipliers = {
  hot_humid: { cooling: 1.15, heating: 0.70, ventilation: 1.10 },
  cold_dry: { cooling: 0.85, heating: 1.25, ventilation: 1.15 },
  temperate: { cooling: 1.00, heating: 1.00, ventilation: 1.00 },
}

// Settings ID for the single shared settings row
const SHARED_SETTINGS_ID = 'shared-settings'

// Helper to merge persisted state with defaults (handles new fields)
function mergeWithDefaults<T>(persisted: Partial<T> | undefined, defaults: T): T {
  if (!persisted) return defaults
  return { ...defaults, ...persisted }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      customZoneDefaults: {},
      customZoneTypes: [],
      customAshraeSpaceTypes: [],
      
      // Database-loaded data
      dbAshraeSpaceTypes: [],
      dbZoneTypeDefaults: [],
      dbDataLoaded: false,
      ashraeLoadAttempted: false,
      
      // Global settings with defaults
      electrical: defaultElectrical,
      gas: defaultGas,
      dhw: defaultDHW,
      plumbing: defaultPlumbing,
      climate: defaultClimate,
      
      // Sync status
      isLoading: false,
      lastSyncedAt: null,
      syncError: null,
      
      updateZoneDefaults: (zoneType, updates) => {
        const base = get().customZoneDefaults[zoneType] || builtInDefaults[zoneType as ZoneType] || builtInDefaults.custom
        const merged = { ...base, ...updates }
        
        console.log('updateZoneDefaults:', zoneType)
        console.log('  - Base:', base)
        console.log('  - Updates:', updates)
        console.log('  - Merged (with defaultEquipment?):', merged.defaultEquipment)
        
        set((state) => ({
          customZoneDefaults: {
            ...state.customZoneDefaults,
            [zoneType]: merged,
          },
        }))
        // Auto-save to database
        get().saveToDatabase()
      },
      
      addCustomZoneType: (id, defaults) => {
        set((state) => ({
          customZoneTypes: [...state.customZoneTypes, id],
          customZoneDefaults: {
            ...state.customZoneDefaults,
            [id]: defaults,
          },
        }))
        get().saveToDatabase()
      },
      
      deleteCustomZoneType: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.customZoneDefaults
          return {
            customZoneTypes: state.customZoneTypes.filter(t => t !== id),
            customZoneDefaults: rest,
          }
        })
        get().saveToDatabase()
      },
      
      resetZoneDefaults: (zoneType) => {
        set((state) => {
          const { [zoneType]: _, ...rest } = state.customZoneDefaults
          return { customZoneDefaults: rest }
        })
        get().saveToDatabase()
      },
      
      resetAllDefaults: () => {
        set({
          customZoneDefaults: {},
          customZoneTypes: [],
          customAshraeSpaceTypes: [],
          electrical: defaultElectrical,
          gas: defaultGas,
          dhw: defaultDHW,
          plumbing: defaultPlumbing,
          climate: defaultClimate,
        })
        get().saveToDatabase()
      },
      
      // ASHRAE space type actions
      addCustomAshraeSpaceType: (spaceType) => {
        set((state) => ({
          customAshraeSpaceTypes: [...state.customAshraeSpaceTypes, spaceType],
        }))
        get().saveToDatabase()
      },
      
      updateCustomAshraeSpaceType: (id, updates) => {
        set((state) => ({
          customAshraeSpaceTypes: state.customAshraeSpaceTypes.map((st) =>
            st.id === id ? { ...st, ...updates } : st
          ),
        }))
        get().saveToDatabase()
      },
      
      deleteCustomAshraeSpaceType: (id) => {
        set((state) => ({
          customAshraeSpaceTypes: state.customAshraeSpaceTypes.filter((st) => st.id !== id),
        }))
        get().saveToDatabase()
      },
      
      getCustomAshraeSpaceType: (id) => {
        return get().customAshraeSpaceTypes.find((st) => st.id === id)
      },
      
      // Database ASHRAE/Zone actions
      fetchAshraeSpaceTypes: async () => {
        console.log('[ASHRAE] fetchAshraeSpaceTypes: Starting...')
        set({ ashraeLoadAttempted: true })
        
        if (!isSupabaseConfigured()) {
          console.log('[ASHRAE] Supabase not configured, using hardcoded ASHRAE space types')
          return
        }
        
        try {
          console.log('[ASHRAE] Querying ashrae_space_types table...')
          const { data, error } = await supabase
            .from('ashrae_space_types' as any)
            .select('*')
            .order('category', { ascending: true })
            .order('display_name', { ascending: true })
          
          console.log('[ASHRAE] Query result:', { dataCount: data?.length || 0, error })
          
          if (error) {
            // Table might not exist yet
            if (error.code === '42P01') {
              console.log('[ASHRAE] Table not found, using hardcoded defaults')
              return
            }
            console.error('[ASHRAE] Query error:', error)
            throw error
          }
          
          if (data && data.length > 0) {
            set({ dbAshraeSpaceTypes: data as DbAshraeSpaceType[], dbDataLoaded: true })
            console.log(`[ASHRAE] ✅ Loaded ${data.length} ASHRAE space types from database`)
          } else {
            console.warn('[ASHRAE] ⚠️ Query returned empty results - check RLS policies!')
          }
        } catch (error) {
          console.error('[ASHRAE] ❌ Failed to fetch ASHRAE space types:', error)
        }
      },
      
      fetchZoneTypeDefaults: async () => {
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured, using hardcoded zone defaults')
          return
        }
        
        try {
          const { data, error } = await supabase
            .from('zone_type_defaults' as any)
            .select('*')
            .order('category', { ascending: true })
            .order('display_name', { ascending: true })
          
          if (error) {
            // Table might not exist yet
            if (error.code === '42P01') {
              console.log('zone_type_defaults table not found, using hardcoded defaults')
              return
            }
            throw error
          }
          
          if (data && data.length > 0) {
            set({ dbZoneTypeDefaults: data as DbZoneTypeDefault[], dbDataLoaded: true })
            console.log(`Loaded ${data.length} zone type defaults from database`)
          }
        } catch (error) {
          console.error('Failed to fetch zone type defaults:', error)
        }
      },
      
      saveAshraeSpaceType: async (spaceType) => {
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured, cannot save ASHRAE space type')
          return
        }
        
        try {
          const { error } = await supabase
            .from('ashrae_space_types' as any)
            .upsert(spaceType as any, { onConflict: 'id' })
          
          if (error) throw error
          
          // Refresh from database
          await get().fetchAshraeSpaceTypes()
        } catch (error) {
          console.error('Failed to save ASHRAE space type:', error)
          throw error
        }
      },
      
      saveZoneTypeDefault: async (zoneDefault) => {
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured, cannot save zone type default')
          return
        }
        
        try {
          const { error } = await supabase
            .from('zone_type_defaults' as any)
            .upsert(zoneDefault as any, { onConflict: 'id' })
          
          if (error) throw error
          
          // Refresh from database
          await get().fetchZoneTypeDefaults()
        } catch (error) {
          console.error('Failed to save zone type default:', error)
          throw error
        }
      },
      
      deleteDbAshraeSpaceType: async (id) => {
        if (!isSupabaseConfigured()) return
        
        try {
          const { error } = await supabase
            .from('ashrae_space_types' as any)
            .delete()
            .eq('id', id)
          
          if (error) throw error
          
          // Refresh from database
          await get().fetchAshraeSpaceTypes()
        } catch (error) {
          console.error('Failed to delete ASHRAE space type:', error)
          throw error
        }
      },
      
      deleteDbZoneTypeDefault: async (id) => {
        if (!isSupabaseConfigured()) return
        
        try {
          const { error } = await supabase
            .from('zone_type_defaults' as any)
            .delete()
            .eq('id', id)
          
          if (error) throw error
          
          // Refresh from database
          await get().fetchZoneTypeDefaults()
        } catch (error) {
          console.error('Failed to delete zone type default:', error)
          throw error
        }
      },
      
      getDbAshraeSpaceType: (id) => {
        return get().dbAshraeSpaceTypes.find((st) => st.id === id)
      },
      
      getDbZoneTypeDefault: (id) => {
        return get().dbZoneTypeDefaults.find((zd) => zd.id === id)
      },
      
      // Unified getters - DATABASE ONLY (no hardcoded fallback)
      getAllAshraeSpaceTypes: () => {
        const { dbAshraeSpaceTypes, dbDataLoaded, ashraeLoadAttempted } = get()
        
        // Return database data if loaded
        if (dbDataLoaded && dbAshraeSpaceTypes.length > 0) {
          return dbAshraeSpaceTypes
        }
        
        // Don't warn if fetch hasn't been attempted yet - normal during app startup
        if (!ashraeLoadAttempted) {
          return []
        }
        
        // Only warn if load was attempted but no data - means seed SQL wasn't run
        console.warn('⚠️ ASHRAE space types not loaded from database! Run the seed SQL in Supabase.')
        return []
      },
      
      getAshraeSpaceType: (id) => {
        const allTypes = get().getAllAshraeSpaceTypes()
        return allTypes.find((st) => st.id === id)
      },
      
      getAshraeCategories: () => {
        const allTypes = get().getAllAshraeSpaceTypes()
        const categories = new Set(allTypes.map(st => st.category))
        return Array.from(categories).sort()
      },
      
      getAshraeSpaceTypesByCategory: (category) => {
        const allTypes = get().getAllAshraeSpaceTypes()
        return allTypes.filter(st => st.category === category)
      },
      
      getAshrae62SpaceTypes: () => {
        const allTypes = get().getAllAshraeSpaceTypes()
        return allTypes.filter(st => st.standard === 'ashrae62')
      },
      
      getAshrae170SpaceTypes: () => {
        const allTypes = get().getAllAshraeSpaceTypes()
        return allTypes.filter(st => st.standard === 'ashrae170')
      },
      
      calculateDefaultOccupancy: (spaceTypeId, areaSf) => {
        const spaceType = get().getAshraeSpaceType(spaceTypeId)
        if (!spaceType || !spaceType.default_occupancy) return 0
        return Math.ceil((areaSf / 1000) * spaceType.default_occupancy)
      },
      
      isUsingDatabase: () => {
        const { dbAshraeSpaceTypes, dbDataLoaded } = get()
        return dbDataLoaded && dbAshraeSpaceTypes.length > 0
      },
      
      updateElectricalSettings: (updates) => {
        set((state) => ({
          electrical: { ...state.electrical, ...updates }
        }))
        get().saveToDatabase()
      },
      
      updateGasSettings: (updates) => {
        set((state) => ({
          gas: { ...state.gas, ...updates }
        }))
        get().saveToDatabase()
      },
      
      updateDHWSettings: (updates) => {
        set((state) => ({
          dhw: { ...state.dhw, ...updates }
        }))
        get().saveToDatabase()
      },
      
      updatePlumbingSettings: (updates) => {
        set((state) => ({
          plumbing: { ...state.plumbing, ...updates }
        }))
        get().saveToDatabase()
      },
      
      updateClimateMultipliers: (climateType, updates) => {
        set((state) => ({
          climate: {
            ...state.climate,
            [climateType]: { ...state.climate[climateType], ...updates }
          }
        }))
        get().saveToDatabase()
      },
      
      resetGlobalSettings: () => {
        set({
          electrical: defaultElectrical,
          gas: defaultGas,
          dhw: defaultDHW,
          plumbing: defaultPlumbing,
          climate: defaultClimate,
        })
        get().saveToDatabase()
      },
      
      fetchFromDatabase: async () => {
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured, using local settings')
          return
        }
        
        set({ isLoading: true, syncError: null })
        
        try {
          // Use raw query since shared_settings might not be in typed schema yet
          const { data, error } = await supabase
            .from('shared_settings' as any)
            .select('*')
            .eq('id', SHARED_SETTINGS_ID)
            .single()
          
          if (error) {
            // If no row exists or table doesn't exist, that's okay - we'll use defaults
            if (error.code === 'PGRST116' || error.code === '42P01') {
              console.log('No shared settings found, using defaults')
              set({ isLoading: false, lastSyncedAt: new Date().toISOString() })
              return
            }
            throw error
          }
          
          if (data) {
            const settings = data as any
            set({
              electrical: settings.electrical || defaultElectrical,
              gas: settings.gas || defaultGas,
              dhw: settings.dhw || defaultDHW,
              plumbing: settings.plumbing || defaultPlumbing,
              climate: settings.climate || defaultClimate,
              customZoneDefaults: settings.custom_zone_defaults || {},
              customZoneTypes: settings.custom_zone_types || [],
              isLoading: false,
              lastSyncedAt: settings.updated_at,
            })
          }
        } catch (error) {
          console.error('Failed to fetch settings from database:', error)
          set({ 
            isLoading: false, 
            syncError: error instanceof Error ? error.message : 'Failed to fetch settings'
          })
        }
      },
      
      saveToDatabase: async () => {
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured, settings saved locally only')
          return
        }
        
        const state = get()
        
        try {
          const { error } = await supabase
            .from('shared_settings' as any)
            .upsert({
              id: SHARED_SETTINGS_ID,
              electrical: state.electrical,
              gas: state.gas,
              dhw: state.dhw,
              plumbing: state.plumbing,
              climate: state.climate,
              custom_zone_defaults: state.customZoneDefaults,
              custom_zone_types: state.customZoneTypes,
              updated_at: new Date().toISOString(),
            } as any, {
              onConflict: 'id'
            })
          
          if (error) throw error
          
          set({ lastSyncedAt: new Date().toISOString(), syncError: null })
        } catch (error) {
          console.error('Failed to save settings to database:', error)
          set({ 
            syncError: error instanceof Error ? error.message : 'Failed to save settings'
          })
        }
      },
      
      getZoneDefaults: (zoneType) => {
        const state = get()
        // Check custom overrides first
        if (state.customZoneDefaults[zoneType]) {
          return state.customZoneDefaults[zoneType]
        }
        // Fall back to built-in defaults
        return builtInDefaults[zoneType as ZoneType] || builtInDefaults.custom
      },
      
      getAllZoneTypes: () => {
        const state = get()
        const builtInTypes = Object.keys(builtInDefaults) as string[]
        return [...builtInTypes, ...state.customZoneTypes]
      },
      
      isCustomZoneType: (zoneType) => {
        return get().customZoneTypes.includes(zoneType)
      },
    }),
    {
      name: 'mep-settings-storage',
      // Only persist to localStorage as a cache/fallback
      partialize: (state) => ({
        customZoneDefaults: state.customZoneDefaults,
        customZoneTypes: state.customZoneTypes,
        electrical: state.electrical,
        gas: state.gas,
        dhw: state.dhw,
        plumbing: state.plumbing,
        climate: state.climate,
      }),
      // Merge persisted state with defaults to handle new fields
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined
        return {
          ...currentState,
          customZoneDefaults: persisted?.customZoneDefaults ?? currentState.customZoneDefaults,
          customZoneTypes: persisted?.customZoneTypes ?? currentState.customZoneTypes,
          // Deep merge each settings object to ensure new fields get defaults
          electrical: mergeWithDefaults<ElectricalSettings>(persisted?.electrical, defaultElectrical),
          gas: mergeWithDefaults<GasSettings>(persisted?.gas, defaultGas),
          dhw: mergeWithDefaults<DHWGlobalSettings>(persisted?.dhw, defaultDHW),
          plumbing: mergeWithDefaults<PlumbingSettings>(persisted?.plumbing, defaultPlumbing),
          climate: persisted?.climate ? {
            hot_humid: mergeWithDefaults(persisted.climate.hot_humid, defaultClimate.hot_humid),
            cold_dry: mergeWithDefaults(persisted.climate.cold_dry, defaultClimate.cold_dry),
            temperate: mergeWithDefaults(persisted.climate.temperate, defaultClimate.temperate),
          } : currentState.climate,
        } as SettingsState
      },
    }
  )
)

// Initialize settings from database on app load and subscribe to changes
export const initializeSettings = async () => {
  // Fetch all settings in parallel
  await Promise.all([
    useSettingsStore.getState().fetchFromDatabase(),
    useSettingsStore.getState().fetchAshraeSpaceTypes(),
    useSettingsStore.getState().fetchZoneTypeDefaults(),
  ])
  
  // Subscribe to realtime changes if Supabase is configured
  if (isSupabaseConfigured() && !settingsChannel) {
    settingsChannel = supabase
      .channel('shared-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_settings',
          filter: `id=eq.${SHARED_SETTINGS_ID}`
        },
        (payload) => {
          console.log('Settings changed by another user:', payload)
          // Reload settings when changed by another user
          if (payload.new) {
            const settings = payload.new as any
            useSettingsStore.setState({
              electrical: settings.electrical || useSettingsStore.getState().electrical,
              gas: settings.gas || useSettingsStore.getState().gas,
              dhw: settings.dhw || useSettingsStore.getState().dhw,
              plumbing: settings.plumbing || useSettingsStore.getState().plumbing,
              climate: settings.climate || useSettingsStore.getState().climate,
              customZoneDefaults: settings.custom_zone_defaults || useSettingsStore.getState().customZoneDefaults,
              customZoneTypes: settings.custom_zone_types || useSettingsStore.getState().customZoneTypes,
              lastSyncedAt: settings.updated_at,
            })
          }
        }
      )
      .subscribe()
  }
}

// Cleanup function for when app unmounts
export const cleanupSettings = () => {
  if (settingsChannel) {
    supabase.removeChannel(settingsChannel)
    settingsChannel = null
  }
}
