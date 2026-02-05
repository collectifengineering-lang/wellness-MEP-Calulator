export * from './database'

export type ClimateType = 'hot_humid' | 'cold_dry' | 'temperate'

// Saved report snapshot for historical reference
export interface SavedReport {
  id: string
  projectId: string
  name: string
  version: number
  createdAt: Date
  notes?: string
  // Snapshot of calculations at time of generation
  snapshot: {
    totalSF: number
    zoneCount: number
    hvac: {
      totalTons: number
      totalMBH: number
      totalVentCFM: number
      totalExhaustCFM: number
      dehumidLbHr: number
      rtuCount: number
    }
    electrical: {
      totalKW: number
      totalKVA: number
      amps_208v: number
      amps_480v: number
      recommendedService: string
      panelCount: number
    }
    plumbing: {
      totalWSFU: number
      totalDFU: number
      peakGPM: number
      coldWaterMainSize: string
      hotWaterMainSize: string
      recommendedDrainSize: string
    }
    dhw: {
      peakGPH: number
      grossBTU: number
      storageGallons: number
      tanklessUnits: number
    }
    gas: {
      totalMBH: number
      totalCFH: number
      recommendedPipeSize: string
    }
    // Zone summary at time of report
    zones: Array<{
      name: string
      type: string
      sf: number
    }>
  }
}

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
  | 'elevator'
  // Residential zone types
  | 'res_kitchen_gas'
  | 'res_kitchen_electric'
  | 'res_bathroom_master'
  | 'res_bathroom_standard'
  | 'res_powder_room'
  | 'res_bedroom_master'
  | 'res_bedroom_standard'
  | 'res_bedroom_guest'
  | 'res_living_room'
  | 'res_dining_room'
  | 'res_family_room'
  | 'res_office'
  | 'res_study'
  | 'res_media_room'
  | 'res_wine_cellar'
  | 'res_pantry'
  | 'res_mudroom'
  | 'res_corridor'
  | 'res_closet_walkin'
  | 'custom'

// Residential ventilation mode per ASHRAE 62.2
export type ResidentialVentilationMode = 'intermittent' | 'continuous'

// Project client/contact information
export interface ProjectClientInfo {
  clientName?: string
  clientCompany?: string
  clientEmail?: string
  clientPhone?: string
  projectAddress?: string
  projectCity?: string
  projectState?: string
  projectZip?: string
  projectDescription?: string
  projectPhase?: 'concept' | 'schematic' | 'dd' | 'cd' | 'construction' | 'as_built'
  projectNumber?: string
  designedBy?: string
  checkedBy?: string
}

// MEP Report Narratives - editable text sections for each trade
export interface MEPNarratives {
  // HVAC narrative (aim for 5 paragraphs)
  hvac: string
  hvacLastGenerated?: Date
  
  // Electrical & Fire Alarm narrative (aim for 3 paragraphs)
  electrical: string
  electricalLastGenerated?: Date
  
  // Plumbing narrative (aim for 4 paragraphs)
  plumbing: string
  plumbingLastGenerated?: Date
  
  // Fire Protection narrative (aim for 2 paragraphs)
  fireProtection: string
  fireProtectionLastGenerated?: Date
}

// Logo history for reports
export interface ReportLogoHistory {
  currentLogoUrl?: string
  previousLogos: string[]  // URLs of previously uploaded logos
}

// Fixture parameter overrides - customize WSFU/DFU/GPH for specific fixtures
export interface FixtureOverride {
  fixtureId: string           // NYC_FIXTURE_DATABASE ID
  wsfuCold?: number           // Override cold WSFU
  wsfuHot?: number            // Override hot WSFU
  dfu?: number                // Override DFU
  hotWaterGPH?: number        // Override hot water demand (GPH)
}

// MEP Narrative Background Information - user-provided context for each trade
export interface NarrativeBackground {
  mechanical?: string         // HVAC/Mechanical background (existing systems, constraints, scope)
  electrical?: string         // Electrical background
  plumbing?: string           // Plumbing background
  fireProtection?: string     // Fire protection background
}

export interface Project {
  id: string
  userId: string
  name: string
  targetSF: number
  climate: ClimateType
  electricPrimary: boolean
  ashraeLocationId?: string  // ASHRAE climate location for design conditions
  clientInfo?: ProjectClientInfo  // Client and project information
  mepNarratives?: MEPNarratives  // MEP report narratives for each trade
  reportLogo?: ReportLogoHistory  // Logo history for reports
  fixtureOverrides?: FixtureOverride[]  // Custom fixture parameters (WSFU/DFU/GPH overrides)
  narrativeBackground?: NarrativeBackground  // User background info for MEP narrative generation
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

// HVAC System Types
export type HVACSystemType = 
  | 'chiller_ahu'        // Chiller plant with AHUs (air-cooled or water-cooled chiller)
  | 'heat_pump_ahu'      // Central heat pump plant with AHUs
  | 'vrf_erv'            // VRF (Variable Refrigerant Flow) with ERV/DOAS
  | 'rtu'                // Packaged Rooftop Units
  | 'wshp'               // Water Source Heat Pumps (with cooling tower/boiler)
  | 'split_system'       // Split systems (for smaller projects)
  | 'custom'             // Custom/hybrid system

// HVAC System configuration for a specific system type
export interface HVACSystemConfig {
  type: HVACSystemType
  name: string
  description: string
  coolingKvaPerTon: number        // Electrical load per ton cooling
  heatingKvaPerMbh: number        // Electric heating load per MBH
  hasEnergyRecovery: boolean      // System includes ERV/HRV
  typicalSfPerTon: number         // Typical sizing (SF per ton)
  supportsGasHeat: boolean        // Can use gas heating
  supportsElectricHeat: boolean   // Can use electric heating
  ventilationType: 'integrated' | 'doas' | 'separate'  // How ventilation is handled
  unitSizeRange: { min: number; max: number }  // Typical unit size in tons
}

// Mechanical equipment electrical load settings
export interface MechanicalElectricalSettings {
  // HVAC System Type Selection
  hvacSystemType: HVACSystemType  // Selected HVAC system type
  
  // Conversion factors - adjustable per project (auto-set based on system type)
  coolingKvaPerTon: number       // Default varies by system type
  heatingKvaPerMbh: number       // Default: 0.293 (1 MBH = 293W electric resistance)
  poolChillerKvaPerTon: number   // Default: 1.5 (water-cooled)
  dehumidKvaPerLbHr: number      // Default: 0.4 (dehumidification unit)
  fanHpPer1000Cfm: number        // Default: 0.6 (HP per 1000 CFM for supply/exhaust fans)
  
  // Heating percentage - most heating via heat pumps/energy recovery
  heatingElectricPercent: number // Default: 0.15 (15% of heating is supplemental electric)
  
  // Heating fuel type - switch between electric and gas (RTUs, boilers)
  heatingFuelType: 'electric' | 'gas'  // Default: 'electric'
  gasHeatingEfficiency: number   // Default: 0.90 (90% for condensing boilers/RTUs)
  
  // Include/exclude flags
  includeChiller: boolean        // Include HVAC cooling load
  includeHeating: boolean        // Include electric heating load (if not gas)
  includePoolChiller: boolean    // Include pool water heating/chilling
  includeDehumid: boolean        // Include dehumidification
  includeDhw: boolean            // Include DHW if electric
  includeFans: boolean           // Include fan power for ventilation/exhaust
  
  // HVAC System Description - custom narrative for reports
  hvacSystemDescription?: string // Free-form text describing HVAC systems
  rtuCount?: number              // Override for RTU/AHU count (auto-calculated if not set)
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

// Ventilation unit types
export type VentilationUnit = 'cfm_sf' | 'cfm' | 'ach'

// Ventilation standard source
export type VentilationStandard = 'ashrae62' | 'ashrae170' | 'custom'

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
  floor?: string  // Floor identifier (e.g., "B1", "1", "2", "R" for roof)
  laundryEquipment?: LaundryEquipment  // Optional laundry equipment overrides
  // ASHRAE ventilation fields
  ventilationSpaceType?: string           // ASHRAE 62.1 or 170 space type ID
  ventilationStandard?: VentilationStandard  // Source standard (ashrae62, ashrae170, custom)
  occupants?: number                      // Override (auto-calc from density × SF)
  ceilingHeightFt?: number                // Default 10ft
  ventilationUnit?: VentilationUnit       // Display/input unit for ventilation
  exhaustUnit?: VentilationUnit           // Display/input unit for exhaust
  ventilationOverride?: boolean           // True if user overrode ASHRAE defaults
  exhaustOverride?: boolean               // True if user overrode exhaust defaults
  ventilationCfm?: number                 // Calculated or override ventilation CFM
  exhaustCfm?: number                     // Calculated or override exhaust CFM
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
  
  // Heat Pump settings (for electric systems)
  useHeatPump: boolean            // Enable heat pump water heater mode
  heatPumpCOP: number             // Coefficient of Performance (typically 2.0-4.5)
  heatPumpDesignConditions: 'standard' | 'cold_climate' | 'high_temp' | 'custom'
  
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
  // Report narrative text for each section (editable by user)
  executiveSummary: string
  hvacNotes: string
  electricalNotes: string
  plumbingNotes: string      // Domestic water & sanitary
  gasNotes: string
  waterSanitaryNotes: string // Legacy - use plumbingNotes
  sprinklerNotes: string
  fireAlarmNotes: string
  // Custom overrides for calculated values
  overrides: Record<string, number | string>
}

// Dynamic fixture type - keys are fixture IDs from NYC_FIXTURE_DATABASE
// e.g., { shower: 10, lavatory: 5, water_closet_tank: 6 }
export type ZoneFixtures = Record<string, number>

// Legacy fixture keys for backwards compatibility
export const LEGACY_FIXTURE_KEYS = [
  'showers', 'lavs', 'wcs', 'floorDrains', 'serviceSinks', 'washingMachines', 'dryers'
] as const

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
  category: 'lighting' | 'power' | 'ventilation' | 'exhaust' | 'cooling' | 'pool_chiller' | 'heating' | 'gas' | 'dehumidification' | 'other'
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
  mechanicalKVA?: number        // Mechanical equipment kVA (with demand factor and spare applied)
}

export interface HVACCalcResult {
  totalTons: number
  totalMBH: number
  totalVentCFM: number
  totalExhaustCFM: number
  dehumidLbHr: number
  dehumidTons: number      // Estimated cooling tons for dehumidification equipment
  poolChillerTons: number  // Tracked separately for mechanical loads
  totalPlantTons: number   // Total cooling plant: space + pool chiller + dehumid
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
  hotWaterFlowRatio?: number        // The ratio actually used (either calculated or manual)
  coldWaterGPM?: number
  hotWaterGPM?: number
  coldActualVelocityFPS?: number
  hotActualVelocityFPS?: number
  // Calculated ratio from fixture units (ASPE method)
  calculatedHWRatio?: number        // Ratio calculated from wsfuHot / (wsfuHot + wsfuCold)
  wsfuCold?: number                 // Total cold water fixture units
  wsfuHot?: number                  // Total hot water fixture units
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
  swimmerCount: number      // number of active swimmers in pools
  airChangesPerHour: number // 4-6 recommended for natatoriums
  ashraeLocationId?: string // ASHRAE location ID for outdoor air moisture calculation
}

export interface PoolRoomResults {
  // Total Dehumidification Load (all sources)
  totalDehumidLbHr: number
  
  // Moisture Source Breakdown
  poolEvaporationLbHr: number       // From pool surfaces
  spectatorMoistureLbHr: number     // From spectators (sedentary)
  swimmerMoistureLbHr: number       // From swimmers (active)
  ventilationMoistureLbHr: number   // From outdoor air (can be negative in dry climates)
  
  // Pool breakdown detail
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
  
  // Indoor/Outdoor humidity ratio (grains/lb) for reference
  indoorHumidityRatio?: number
  outdoorHumidityRatio?: number
}

// Pool configuration for a single zone
export interface ZonePoolConfig {
  pools: PoolConfig[]
  params: PoolRoomParams
  lastResults?: PoolRoomResults
}

// Stored pool room configurations - one per zone
export interface PoolRoomDesign {
  // Map of zone ID to pool configuration
  zoneConfigs: Record<string, ZonePoolConfig>
  // Currently selected zone in the UI (for convenience)
  activeZoneId?: string | null
}
