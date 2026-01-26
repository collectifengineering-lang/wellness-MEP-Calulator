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
  hot_water_demand_factor: number     // Hot water as % of cold (0.5 - 0.7)
  design_velocity_fps: number         // Design velocity for pipe sizing in FPS (default 5)
}

// Climate multipliers for regional adjustments
export interface ClimateMultipliers {
  hot_humid: { cooling: number; heating: number; ventilation: number }
  cold_dry: { cooling: number; heating: number; ventilation: number }
  temperate: { cooling: number; heating: number; ventilation: number }
}

interface SettingsState {
  // Custom zone defaults (overrides built-in defaults)
  customZoneDefaults: Record<string, ZoneDefaults>
  // Custom zone types added by user
  customZoneTypes: string[]
  
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
  hot_water_demand_factor: 0.6,
  design_velocity_fps: 5,  // 5 FPS default - typical range 4-8 FPS
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      customZoneDefaults: {},
      customZoneTypes: [],
      
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
        set((state) => ({
          customZoneDefaults: {
            ...state.customZoneDefaults,
            [zoneType]: {
              ...(state.customZoneDefaults[zoneType] || builtInDefaults[zoneType as ZoneType] || builtInDefaults.custom),
              ...updates,
            },
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
          electrical: defaultElectrical,
          gas: defaultGas,
          dhw: defaultDHW,
          plumbing: defaultPlumbing,
          climate: defaultClimate,
        })
        get().saveToDatabase()
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
    }
  )
)

// Initialize settings from database on app load and subscribe to changes
export const initializeSettings = async () => {
  await useSettingsStore.getState().fetchFromDatabase()
  
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
