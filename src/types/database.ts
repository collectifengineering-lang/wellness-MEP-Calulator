export interface Database {
  public: {
    Tables: {
      shared_settings: {
        Row: {
          id: string
          electrical: SharedElectricalSettings
          gas: SharedGasSettings
          dhw: SharedDHWSettings
          plumbing: SharedPlumbingSettings
          climate: SharedClimateMultipliers
          custom_zone_defaults: Record<string, any>
          custom_zone_types: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          electrical?: SharedElectricalSettings
          gas?: SharedGasSettings
          dhw?: SharedDHWSettings
          plumbing?: SharedPlumbingSettings
          climate?: SharedClimateMultipliers
          custom_zone_defaults?: Record<string, any>
          custom_zone_types?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          electrical?: SharedElectricalSettings
          gas?: SharedGasSettings
          dhw?: SharedDHWSettings
          plumbing?: SharedPlumbingSettings
          climate?: SharedClimateMultipliers
          custom_zone_defaults?: Record<string, any>
          custom_zone_types?: string[]
          updated_at?: string
          updated_by?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string | null
          target_sf: number | null
          climate: string | null
          electric_primary: boolean
          dhw_settings: DHWSettings | null
          contingency: number
          result_adjustments: ResultAdjustments | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          target_sf?: number | null
          climate?: string | null
          electric_primary?: boolean
          dhw_settings?: DHWSettings | null
          contingency?: number
          result_adjustments?: ResultAdjustments | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string | null
          target_sf?: number | null
          climate?: string | null
          electric_primary?: boolean
          dhw_settings?: DHWSettings | null
          contingency?: number
          result_adjustments?: ResultAdjustments | null
          created_at?: string
          updated_at?: string
        }
      }
      zones: {
        Row: {
          id: string
          project_id: string
          name: string | null
          zone_type: string | null
          sub_type: string | null
          sf: number | null
          color: string | null
          fixtures: ZoneFixtures | null
          rates: ZoneRates | null
          line_items: LineItem[] | null
          sort_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name?: string | null
          zone_type?: string | null
          sub_type?: string | null
          sf?: number | null
          color?: string | null
          fixtures?: ZoneFixtures | null
          rates?: ZoneRates | null
          line_items?: LineItem[] | null
          sort_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string | null
          zone_type?: string | null
          sub_type?: string | null
          sf?: number | null
          color?: string | null
          fixtures?: ZoneFixtures | null
          rates?: ZoneRates | null
          line_items?: LineItem[] | null
          sort_order?: number | null
          created_at?: string
        }
      }
    }
  }
}

export interface DHWSettings {
  heaterType: 'electric' | 'gas'
  gasEfficiency: number
  electricEfficiency: number
  storageTemp: number
  deliveryTemp: number
  coldWaterTemp: number
  peakDuration: number
}

export interface ResultAdjustments {
  hvacNotes: string
  electricalNotes: string
  gasNotes: string
  waterSanitaryNotes: string
  sprinklerNotes: string
  fireAlarmNotes: string
  overrides: Record<string, number | string>
}

export interface ZoneFixtures {
  showers: number
  lavs: number
  wcs: number
  floorDrains: number
  serviceSinks: number
  washingMachines: number
  dryers: number
}

export interface ZoneRates {
  lighting_w_sf: number
  receptacle_va_sf: number
  ventilation_cfm_sf: number
  exhaust_cfm_sf: number
  cooling_sf_ton: number
  heating_btuh_sf: number
}

export interface LineItem {
  id: string
  category: 'lighting' | 'power' | 'ventilation' | 'exhaust' | 'cooling' | 'heating' | 'gas' | 'other'
  name: string
  quantity: number
  unit: string
  value: number
  notes?: string
}

// Shared settings types for database
export interface SharedElectricalSettings {
  voltage_primary: number
  voltage_secondary: number
  power_factor: number
  spare_capacity: number
  general_va_sf: number
  demand_factor: number
}

export interface SharedGasSettings {
  min_pressure_wc: number
  high_pressure_threshold_cfh: number
  btu_per_cf: number
}

export interface SharedDHWSettings {
  tankless_unit_btu: number
  storage_factor: number
  default_peak_duration: number
}

export interface SharedPlumbingSettings {
  backwash_pit_threshold_gpm: number
  hot_water_demand_factor: number
}

export interface SharedClimateMultipliers {
  hot_humid: { cooling: number; heating: number; ventilation: number }
  cold_dry: { cooling: number; heating: number; ventilation: number }
  temperate: { cooling: number; heating: number; ventilation: number }
}
