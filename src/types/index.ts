export * from './database'

export type ClimateType = 'hot_humid' | 'cold_dry' | 'temperate'

export type ZoneType =
  | 'reception'
  | 'mechanical_room'
  | 'open_gym'
  | 'group_fitness'
  | 'locker_room'
  | 'restroom'
  | 'banya_gas'
  | 'sauna_gas'
  | 'sauna_electric'
  | 'steam_room'
  | 'cold_plunge'
  | 'snow_room'
  | 'pool_indoor'
  | 'pool_outdoor'
  | 'hot_tub'
  | 'laundry_commercial'
  | 'laundry_residential'
  | 'kitchen_commercial'
  | 'kitchen_light_fb'
  | 'treatment_room'
  | 'massage_room'
  | 'couples_treatment'
  | 'private_suite'
  | 'retail'
  | 'office'
  | 'storage'
  | 'break_room'
  // NEW zone types from SPX plans
  | 'cowork'
  | 'conference_room'
  | 'child_care'
  | 'event_space'
  | 'screening_room'
  | 'contrast_suite'
  | 'mma_studio'
  | 'basketball_court'
  | 'padel_court'
  | 'yoga_studio'
  | 'pilates_studio'
  | 'stretching_area'
  | 'cafe_light_fb'
  | 'terrace'
  | 'recovery_longevity'
  | 'custom'

export interface Project {
  id: string
  userId: string
  name: string
  targetSF: number
  climate: ClimateType
  electricPrimary: boolean
  dhwSettings: DHWSettings
  electricalSettings: ProjectElectricalSettings
  mechanicalSettings: MechanicalElectricalSettings  // Mechanical equipment electrical loads
  contingency: number
  resultAdjustments: ResultAdjustments
  poolRoomDesign?: PoolRoomDesign  // Pool room calculator state
  createdAt: Date
  updatedAt: Date
}

// Project-level electrical settings (overrides global defaults)
export interface ProjectElectricalSettings {
  voltage: number           // Primary voltage (208, 480, 240, 120)
  phase: 1 | 3              // Single or three phase
  demandFactor: number      // Demand factor (0.5 - 1.0), default 0.90
  powerFactor: number       // Power factor (0.7 - 1.0)
  spareCapacity: number     // Spare capacity % (0 - 0.50)
}

// Mechanical equipment electrical load settings
export interface MechanicalElectricalSettings {
  // Conversion factors - adjustable per project
  coolingKvaPerTon: number       // Default: 1.2 (typical air-cooled chiller)
  heatingKvaPerMbh: number       // Default: 0.293 (1 MBH = 293W electric resistance)
  poolChillerKvaPerTon: number   // Default: 1.5 (water-cooled, slightly less efficient)
  dehumidKvaPerLbHr: number      // Default: 0.05 (5 kW per 100 lb/hr)
  
  // Include/exclude flags
  includeChiller: boolean        // Include HVAC cooling load
  includeHeating: boolean        // Include electric heating load (if not gas)
  includePoolChiller: boolean    // Include pool water heating/chilling
  includeDehumid: boolean        // Include dehumidification
  includeDhw: boolean            // Include DHW if electric
}

// Process loads that are fixed per zone (not per SF)
export interface ZoneProcessLoads {
  fixed_kw: number           // Fixed electrical load (heaters, equipment)
  gas_mbh: number            // Gas load in MBH
  ventilation_cfm: number    // Fixed ventilation CFM
  exhaust_cfm: number        // Fixed exhaust CFM
  pool_heater_mbh: number    // Pool heater gas load
  dehumid_lb_hr: number      // Dehumidification capacity
  flue_size_in: number       // Flue size for venting
  ceiling_height_ft: number  // Ceiling height for ACH calcs
}

// Laundry equipment specs (editable per zone, all optional for partial overrides)
export interface LaundryEquipment {
  washer_kw?: number
  washer_amps_208v?: number
  washer_water_gpm?: number
  washer_drain_gpm?: number
  washer_dfu?: number
  dryer_gas_mbh?: number
  dryer_kw_electric?: number
  dryer_exhaust_cfm?: number
  dryer_mua_sqin?: number
}

export interface Zone {
  id: string
  projectId: string
  name: string
  type: ZoneType
  subType: 'electric' | 'gas'
  sf: number
  color: string
  fixtures: ZoneFixtures
  rates: ZoneRates
  processLoads: ZoneProcessLoads
  lineItems: LineItem[]
  sortOrder: number
  laundryEquipment?: LaundryEquipment  // Optional laundry equipment overrides
}

// ASHRAE building types for DHW demand factors
export type DHWBuildingType = 
  | 'gymnasium'      // Health clubs, fitness centers, spas
  | 'hotel'          // Hotels, motels
  | 'apartment'      // Multifamily residential
  | 'office'         // Office buildings
  | 'hospital'       // Healthcare facilities
  | 'restaurant'     // Full-service restaurants
  | 'school'         // Schools, universities
  | 'custom'         // Manual entry

export type DHWSystemType = 'storage' | 'instantaneous' | 'hybrid'

export interface DHWSettings {
  // System configuration
  systemType: DHWSystemType
  heaterType: 'electric' | 'gas'
  buildingType: DHWBuildingType
  
  // Efficiency
  gasEfficiency: number
  electricEfficiency: number
  
  // Temperatures
  storageTemp: number       // Storage tank temperature (°F)
  deliveryTemp: number      // Delivery/fixture temperature (°F)  
  coldWaterTemp: number     // Incoming cold water (°F)
  
  // ASHRAE sizing parameters
  peakDuration: number      // Peak demand duration (hours)
  storageFactor: number     // Usable storage fraction (0.6-0.8, default 0.7)
  demandFactor: number      // Diversity/simultaneity factor (0.5-1.0)
  recoveryFactor: number    // Recovery capacity multiplier (0.8-1.5)
  
  // Tank sizing (for storage systems)
  tankSizingMethod: 'ashrae' | 'fixture_unit' | 'manual'
  manualStorageGallons?: number
  
  // Tankless sizing (for instantaneous systems)
  tanklessUnitBtu: number   // BTU per unit (default 199,900)
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
  category: 'lighting' | 'power' | 'ventilation' | 'exhaust' | 'cooling' | 'heating' | 'gas' | 'dehumidification' | 'other'
  name: string
  quantity: number
  unit: string
  value: number
  notes?: string
}

export interface AggregatedFixtures {
  showers: number
  lavs: number
  wcs: number
  floorDrains: number
  serviceSinks: number
  washingMachines: number
  dryers: number
}

export interface CalculationResults {
  electrical: ElectricalCalcResult
  hvac: HVACCalcResult
  gas: GasCalcResult
  dhw: DHWCalcResult
  plumbing: PlumbingCalcResult
}

export interface ElectricalCalcResult {
  totalKW: number
  totalKVA: number
  amps_480v: number
  amps_208v: number
  recommendedService: string
  panelCount: number
  // Detailed settings and calculations
  voltages?: { primary: number; secondary: number }
  powerFactor?: number
  spareCapacity?: number
  calculatedAmps?: number       // Raw calculated amps
  standardServiceAmps?: number  // Upsized to standard service size
  exceedsMaxService?: boolean   // True if > max standard size for voltage
}

export interface HVACCalcResult {
  totalTons: number
  totalMBH: number
  totalVentCFM: number
  totalExhaustCFM: number
  dehumidLbHr: number
  rtuCount: number
}

export interface GasCalcResult {
  totalCFH: number
  totalMBH: number
  recommendedPressure: string
  recommendedPipeSize: string
  equipmentBreakdown: { name: string; mbh: number; cfh: number }[]
}

export interface DHWCalcResult {
  peakGPH: number
  netBTU: number
  grossBTU: number
  gasCFH: number
  electricKW: number
  storageGallons: number
  tanklessUnits: number
  efficiency: number
}

export interface PlumbingCalcResult {
  totalWSFU: number
  totalDFU: number
  peakGPM: number
  recommendedMeterSize: string
  recommendedDrainSize: string
  coldWaterMainSize: string
  hotWaterMainSize: string
  // Velocity-based sizing details - separate for hot and cold
  coldWaterDesignVelocityFPS?: number
  hotWaterDesignVelocityFPS?: number
  hotWaterFlowRatio?: number
  coldWaterGPM?: number
  hotWaterGPM?: number
  coldActualVelocityFPS?: number
  hotActualVelocityFPS?: number
}

// =====================
// Pool Room Design Types
// =====================

export type PoolType = 
  | 'competition' 
  | 'recreational' 
  | 'hotel' 
  | 'therapy' 
  | 'whirlpool' 
  | 'dive' 
  | 'lap' 
  | 'elderly' 
  | 'kids' 
  | 'waterpark' 
  | 'residential'
  | 'cold_plunge'

export interface PoolConfig {
  id: string
  name: string
  surfaceAreaSF: number
  waterTempF: number
  activityFactor: number  // 0.5 to 1.5
  poolType: PoolType
}

export interface PoolRoomParams {
  roomSF: number            // room floor area (SF)
  ceilingHeightFt: number   // ceiling height (ft), typically 15-25 for natatoriums
  airTempF: number          // room air temperature, typically 82-86°F
  relativeHumidity: number  // typically 50-60%
  wetDeckAreaSF: number     // deck area around pools
  spectatorCount: number    // number of spectators (not swimmers)
  airChangesPerHour: number // 4-6 recommended for natatoriums
}

export interface PoolRoomResults {
  // Dehumidification
  totalEvaporationLbHr: number
  poolBreakdown: Array<{ id: string; name: string; lbHr: number; surfaceAreaSF: number }>
  
  // Airflow
  supplyAirCFM: number
  outdoorAirCFM: number
  exhaustAirCFM: number
  
  // Room metrics
  roomVolumeCF: number
  totalPoolAreaSF: number
  
  // Reference values
  recommendedACH: { min: number; max: number }
  actualACH: number
}

// Stored pool room configuration for a zone
export interface PoolRoomDesign {
  targetZoneId: string | null
  pools: PoolConfig[]
  params: PoolRoomParams
  lastResults?: PoolRoomResults
}
