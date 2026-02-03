/**
 * ASHRAE 62.1 Ventilation Calculations
 * 
 * Implements the Ventilation Rate Procedure from ASHRAE Standard 62.1-2022
 * Including multi-zone system calculations and ERV pre-treatment
 */

import type { HVACSpace, HVACZone, HVACSystem, HVACProjectSettings } from '../store/useHVACStore'
import { getSpaceType, calculateDefaultOccupancy } from '../data/ashrae62'
import { getLocationById, getAltitudeCorrectionFactor } from '../data/ashraeClimate'

// ============================================
// Result Types
// ============================================

export interface SpaceVentilationResult {
  spaceId: string
  spaceName: string
  spaceType: string
  areaSf: number
  occupancy: number
  // ASHRAE 62.1 values
  Rp: number           // CFM per person
  Ra: number           // CFM per sq ft
  Vbz: number          // Breathing zone outdoor airflow (CFM)
  Voz: number          // Zone outdoor airflow (after Ez)
  // Exhaust
  exhaustRequired: boolean
  exhaustCfm: number
  // Supply air
  supplyCfm?: number   // Supply air CFM (may be forced by supplyAch)
  // ACH tracking (for results display)
  ventilationAchUsed?: number
  exhaustAchUsed?: number
  supplyAchUsed?: number
  // Load contributions
  coolingLoadBtuh: number
  heatingLoadBtuh: number
}

export interface ZoneVentilationResult {
  zoneId: string
  zoneName: string
  systemId?: string
  ez: number           // Zone air distribution effectiveness
  // Aggregated values
  totalAreaSf: number
  totalOccupancy: number
  totalVbz: number     // Sum of space Vbz
  totalVoz: number     // Sum of space Voz / Ez
  totalExhaustCfm: number
  // Primary zone values
  primaryVoz: number   // Highest Voz in zone (for VAV)
  Zp: number           // Primary OA fraction (Voz / Vpz)
  // Loads
  coolingLoadBtuh: number
  heatingLoadBtuh: number
  // Child spaces
  spaces: SpaceVentilationResult[]
}

export interface SystemVentilationResult {
  systemId: string
  systemName: string
  systemType: 'single_zone' | 'vav_multi_zone' | 'doas_100_oa'
  // System-level values
  totalAreaSf: number
  totalOccupancy: number
  // Ventilation
  Vou: number          // Uncorrected outdoor air intake
  Ev: number           // System ventilation efficiency
  Vot: number          // Total outdoor air (corrected)
  // Diversity applied
  diversityFactor: number
  diversifiedOccupancy: number
  // ERV
  ervEnabled: boolean
  ervSavings: number   // CFM equivalent savings
  // Exhaust
  totalExhaustCfm: number
  // Loads (after ERV)
  coolingLoadBtuh: number
  heatingLoadBtuh: number
  coolingLoadTons: number
  heatingLoadMbh: number
  latentCoolingBtuh: number
  // Child zones
  zones: ZoneVentilationResult[]
}

export interface ProjectVentilationResult {
  // Design conditions
  locationName: string
  coolingDb: number
  coolingWb: number
  heatingDb: number
  indoorSummerDb: number
  indoorWinterDb: number
  altitudeCorrection: number
  // Totals
  totalAreaSf: number
  totalOccupancy: number
  totalVot: number     // Total outdoor air for all systems
  totalExhaustCfm: number
  // Loads
  totalCoolingBtuh: number
  totalHeatingBtuh: number
  totalCoolingTons: number
  totalHeatingMbh: number
  // Systems
  systems: SystemVentilationResult[]
  // Unassigned spaces (not in any zone)
  unassignedSpaces: SpaceVentilationResult[]
}

// ============================================
// Constants
// ============================================

// Air properties (at sea level, standard conditions)
const SENSIBLE_FACTOR = 1.08      // BTU/(hr·CFM·°F)
const TOTAL_FACTOR = 4.5          // BTU/(hr·CFM·Δh) where Δh is BTU/lb

// Default indoor humidity conditions for enthalpy calculation
const INDOOR_SUMMER_HR = 0.009    // Humidity ratio (lb water / lb dry air) at ~50% RH, 75°F
// const INDOOR_WINTER_HR = 0.004    // Humidity ratio at ~30% RH, 70°F (reserved for future use)

// ============================================
// Psychrometric Helpers
// ============================================

/**
 * Estimate humidity ratio from dry bulb and wet bulb temperatures
 * Simplified calculation - for full accuracy use psychrometric library
 */
function estimateHumidityRatio(_db: number, wb: number): number {
  // Simplified psychrometric calculation
  // More accurate would use saturation pressure equations
  const dewPointApprox = wb - ((100 - 80) / 5) // Rough estimate
  const satPressure = Math.exp(17.67 * dewPointApprox / (dewPointApprox + 243.5))
  return 0.622 * satPressure / (14.696 - satPressure)
}

/**
 * Calculate specific enthalpy of moist air
 * h = 0.24 * T + W * (1061 + 0.444 * T)
 * where T is °F and W is humidity ratio (lb/lb)
 */
function calculateEnthalpy(db: number, humidityRatio: number): number {
  return 0.24 * db + humidityRatio * (1061 + 0.444 * db)
}

// ============================================
// Space Calculations
// ============================================

/**
 * Calculate ventilation for a single space
 * 
 * Supports:
 * - ASHRAE 62.1 Rp/Ra rates (default)
 * - Manual Rp/Ra overrides
 * - ACH-based ventilation (ventilationAch, exhaustAch, supplyAch)
 * - Uses MAX of calculated CFM vs ACH-derived CFM
 */
export function calculateSpaceVentilation(
  space: HVACSpace,
  ez: number = 1.0,
  _settings: HVACProjectSettings
): SpaceVentilationResult {
  // Get space type - check both field names for compatibility
  const spaceTypeId = space.ashraeSpaceType || space.spaceType || 'office_space'
  const spaceType = getSpaceType(spaceTypeId)
  
  // Get ventilation rates - use overrides if set, otherwise ASHRAE defaults
  const Rp = space.rpOverride ?? spaceType?.Rp ?? 5
  const Ra = space.raOverride ?? spaceType?.Ra ?? 0.06
  
  // Occupancy - use override or calculate default
  const occupancy = space.occupancyOverride ?? 
    calculateDefaultOccupancy(spaceTypeId, space.areaSf)
  
  // Calculate room volume for ACH conversions
  const volumeCf = space.areaSf * space.ceilingHeightFt
  
  // ============================================
  // ASHRAE 62.1 Ventilation Calculation
  // ============================================
  
  // Breathing zone outdoor airflow: Vbz = Rp × Pz + Ra × Az
  const Vbz_ashrae = (Rp * occupancy) + (Ra * space.areaSf)
  
  // ACH-based ventilation (if set)
  const Vbz_ach = space.ventilationAch 
    ? (space.ventilationAch * volumeCf) / 60 
    : 0
  
  // Use MAX of ASHRAE calculated vs ACH-derived
  const Vbz = Math.max(Vbz_ashrae, Vbz_ach)
  
  // Zone outdoor airflow: Voz = Vbz / Ez
  const Voz = Vbz / ez
  
  // ============================================
  // Exhaust Calculation
  // ============================================
  
  // ASHRAE exhaust requirements (from space type)
  let exhaustCfm_ashrae = 0
  if (spaceType) {
    if (spaceType.exhaustCfmSf) {
      exhaustCfm_ashrae = spaceType.exhaustCfmSf * space.areaSf
    } else if (spaceType.exhaustCfmUnit) {
      // Would need fixture count - estimate based on occupancy
      exhaustCfm_ashrae = spaceType.exhaustCfmUnit * Math.ceil(occupancy / 10)
    }
  }
  
  // ACH-based exhaust (if set)
  const exhaustCfm_ach = space.exhaustAch 
    ? (space.exhaustAch * volumeCf) / 60 
    : 0
  
  // Use MAX of ASHRAE calculated vs ACH-derived
  const exhaustCfm = Math.max(exhaustCfm_ashrae, exhaustCfm_ach)
  
  // ============================================
  // Supply Air Calculation
  // ============================================
  
  // If supplyAch is set, it forces the supply air to that value
  const supplyCfm_ach = space.supplyAch 
    ? (space.supplyAch * volumeCf) / 60 
    : 0
  
  // Supply air is typically the greater of ventilation or exhaust makeup
  // Unless supplyAch is explicitly set, in which case use that
  const supplyCfm = supplyCfm_ach > 0 
    ? supplyCfm_ach 
    : Math.max(Voz, exhaustCfm)
  
  // Load calculations will be done at system level with ERV
  return {
    spaceId: space.id,
    spaceName: space.name,
    spaceType: spaceTypeId,
    areaSf: space.areaSf,
    occupancy,
    Rp,
    Ra,
    Vbz: Math.round(Vbz),
    Voz: Math.round(Voz),
    exhaustRequired: exhaustCfm > 0,
    exhaustCfm: Math.round(exhaustCfm),
    coolingLoadBtuh: 0, // Calculated at system level
    heatingLoadBtuh: 0,
    // Extended results for ACH tracking
    supplyCfm: Math.round(supplyCfm),
    ventilationAchUsed: space.ventilationAch,
    exhaustAchUsed: space.exhaustAch,
    supplyAchUsed: space.supplyAch,
  } as SpaceVentilationResult
}

// ============================================
// Zone Calculations
// ============================================

/**
 * Calculate ventilation for a zone (collection of spaces)
 */
export function calculateZoneVentilation(
  zone: HVACZone,
  spaces: HVACSpace[],
  settings: HVACProjectSettings
): ZoneVentilationResult {
  // Filter spaces belonging to this zone
  const zoneSpaces = spaces.filter(s => s.zoneId === zone.id)
  
  // Calculate each space
  const spaceResults = zoneSpaces.map(space => 
    calculateSpaceVentilation(space, zone.ez, settings)
  )
  
  // Aggregate values
  const totalAreaSf = spaceResults.reduce((sum, s) => sum + s.areaSf, 0)
  const totalOccupancy = spaceResults.reduce((sum, s) => sum + s.occupancy, 0)
  const totalVbz = spaceResults.reduce((sum, s) => sum + s.Vbz, 0)
  const totalVoz = spaceResults.reduce((sum, s) => sum + s.Voz, 0)
  const totalExhaustCfm = spaceResults.reduce((sum, s) => sum + s.exhaustCfm, 0)
  
  // Find primary (critical) zone - highest Voz
  const primaryVoz = Math.max(...spaceResults.map(s => s.Voz), 0)
  
  // Zp = Voz / Vpz (primary OA fraction)
  // For now, assume Vpz = Voz (100% outdoor air at zone level)
  const Zp = primaryVoz > 0 ? 1.0 : 0
  
  return {
    zoneId: zone.id,
    zoneName: zone.name,
    systemId: zone.systemId,
    ez: zone.ez,
    totalAreaSf,
    totalOccupancy,
    totalVbz,
    totalVoz,
    totalExhaustCfm,
    primaryVoz,
    Zp,
    coolingLoadBtuh: 0,
    heatingLoadBtuh: 0,
    spaces: spaceResults,
  }
}

// ============================================
// System Calculations
// ============================================

/**
 * Calculate ventilation for a system (collection of zones)
 */
export function calculateSystemVentilation(
  system: HVACSystem,
  zones: HVACZone[],
  spaces: HVACSpace[],
  settings: HVACProjectSettings
): SystemVentilationResult {
  // Filter zones belonging to this system
  const systemZones = zones.filter(z => z.systemId === system.id)
  
  // Calculate each zone
  const zoneResults = systemZones.map(zone =>
    calculateZoneVentilation(zone, spaces, settings)
  )
  
  // Aggregate values
  const totalAreaSf = zoneResults.reduce((sum, z) => sum + z.totalAreaSf, 0)
  const totalOccupancy = zoneResults.reduce((sum, z) => sum + z.totalOccupancy, 0)
  const totalExhaustCfm = zoneResults.reduce((sum, z) => sum + z.totalExhaustCfm, 0)
  
  // Apply diversity factor
  const diversifiedOccupancy = Math.ceil(totalOccupancy * system.occupancyDiversity)
  
  // Sum of people-related and area-related components
  const sumRpPz = zoneResults.reduce((sum, z) => 
    sum + z.spaces.reduce((s, sp) => s + sp.Rp * sp.occupancy, 0), 0
  )
  const sumRaAz = zoneResults.reduce((sum, z) => 
    sum + z.spaces.reduce((s, sp) => s + sp.Ra * sp.areaSf, 0), 0
  )
  
  // Vou = D × Σ(Rp × Pz) + Σ(Ra × Az)
  const Vou = (system.occupancyDiversity * sumRpPz) + sumRaAz
  
  // System ventilation efficiency (Ev)
  let Ev = 1.0
  
  if (system.systemType === 'vav_multi_zone' && zoneResults.length > 0) {
    // For VAV: Ev = minimum(Voz/Vpz) for all zones
    // Simplified: use the zone with highest OA fraction
    const maxZp = Math.max(...zoneResults.map(z => z.Zp), 0.5)
    // Ev = 0.75 is a common default for multi-zone VAV
    Ev = Math.min(1 / maxZp, 1.0) * 0.85 // Conservative factor
    Ev = Math.max(Ev, 0.6) // Floor at 60%
  } else if (system.systemType === 'doas_100_oa') {
    Ev = 1.0 // 100% OA systems have Ev = 1.0
  }
  
  // Vot = Vou / Ev
  let Vot = Vou / Ev
  
  // Get design temperatures
  const location = settings.locationId ? getLocationById(settings.locationId) : null
  const customLoc = settings.customLocation
  
  let coolingDb = customLoc?.cooling_04_db ?? location?.cooling_04_db ?? 95
  let coolingWb = customLoc?.cooling_04_mcwb ?? location?.cooling_04_mcwb ?? 75
  let heatingDb = customLoc?.heating_99_db ?? location?.heating_99_db ?? 10
  const elevation = customLoc?.elevation_ft ?? location?.elevation_ft ?? 0
  
  // Use 1% conditions if specified
  if (settings.coolingDesignCondition === '1%' && location) {
    coolingDb = location.cooling_1_db
    coolingWb = location.cooling_1_mcwb
  }
  if (settings.heatingDesignCondition === '99.6%' && location) {
    heatingDb = location.heating_996_db
  }
  
  const indoorSummerDb = settings.summerIndoorDb
  const indoorWinterDb = settings.winterIndoorDb
  
  // Altitude correction
  let altitudeCorrection = 1.0
  if (settings.altitudeCorrection && elevation > 2000) {
    altitudeCorrection = getAltitudeCorrectionFactor(elevation)
    // Adjust Vot for altitude (more CFM needed at altitude)
    Vot = Vot / altitudeCorrection
  }
  
  // ERV pre-treatment
  let coolingDbEffective = coolingDb
  let coolingWbEffective = coolingWb
  let heatingDbEffective = heatingDb
  let ervSavings = 0
  
  if (system.ervEnabled) {
    // Pre-treat outdoor air through ERV
    // Sensible: T_leaving = T_outdoor - Es × (T_outdoor - T_indoor)
    coolingDbEffective = coolingDb - system.ervSensibleEfficiency * (coolingDb - indoorSummerDb)
    heatingDbEffective = heatingDb + system.ervSensibleEfficiency * (indoorWinterDb - heatingDb)
    
    // Approximate wet bulb reduction (latent)
    const wbReduction = system.ervLatentEfficiency * (coolingWb - 65) // 65°F is approx indoor WB
    coolingWbEffective = coolingWb - wbReduction
    
    // Calculate CFM equivalent savings (rough approximation)
    const sensibleSavingsCooling = Vot * (coolingDb - coolingDbEffective) / (coolingDb - indoorSummerDb)
    const sensibleSavingsHeating = Vot * (heatingDbEffective - heatingDb) / (indoorWinterDb - heatingDb)
    ervSavings = Math.round(Math.max(sensibleSavingsCooling, sensibleSavingsHeating))
  }
  
  // Calculate loads
  // Sensible: Q = 1.08 × CFM × ΔT
  const deltaTcooling = coolingDbEffective - indoorSummerDb
  const deltaTHeating = indoorWinterDb - heatingDbEffective
  
  const sensibleCoolingBtuh = SENSIBLE_FACTOR * Vot * Math.max(deltaTcooling, 0)
  const sensibleHeatingBtuh = SENSIBLE_FACTOR * Vot * Math.max(deltaTHeating, 0)
  
  // Total cooling (using enthalpy difference)
  const outdoorHR = estimateHumidityRatio(coolingDbEffective, coolingWbEffective)
  const outdoorEnthalpy = calculateEnthalpy(coolingDbEffective, outdoorHR)
  const indoorEnthalpy = calculateEnthalpy(indoorSummerDb, INDOOR_SUMMER_HR)
  const deltaEnthalpy = Math.max(outdoorEnthalpy - indoorEnthalpy, 0)
  
  const totalCoolingBtuh = TOTAL_FACTOR * Vot * deltaEnthalpy
  const latentCoolingBtuh = totalCoolingBtuh - sensibleCoolingBtuh
  
  return {
    systemId: system.id,
    systemName: system.name,
    systemType: system.systemType,
    totalAreaSf,
    totalOccupancy,
    Vou: Math.round(Vou),
    Ev: Math.round(Ev * 100) / 100,
    Vot: Math.round(Vot),
    diversityFactor: system.occupancyDiversity,
    diversifiedOccupancy,
    ervEnabled: system.ervEnabled,
    ervSavings,
    totalExhaustCfm,
    coolingLoadBtuh: Math.round(totalCoolingBtuh),
    heatingLoadBtuh: Math.round(sensibleHeatingBtuh),
    coolingLoadTons: Math.round(totalCoolingBtuh / 12000 * 10) / 10,
    heatingLoadMbh: Math.round(sensibleHeatingBtuh / 1000 * 10) / 10,
    latentCoolingBtuh: Math.round(Math.max(latentCoolingBtuh, 0)),
    zones: zoneResults,
  }
}

// ============================================
// Project-Level Calculations
// ============================================

/**
 * Calculate complete ventilation analysis for a project
 */
export function calculateProjectVentilation(
  spaces: HVACSpace[],
  zones: HVACZone[],
  systems: HVACSystem[],
  settings: HVACProjectSettings
): ProjectVentilationResult {
  // Get design conditions
  const location = settings.locationId ? getLocationById(settings.locationId) : null
  const customLoc = settings.customLocation
  
  let coolingDb = customLoc?.cooling_04_db ?? location?.cooling_04_db ?? 95
  let coolingWb = customLoc?.cooling_04_mcwb ?? location?.cooling_04_mcwb ?? 75
  let heatingDb = customLoc?.heating_99_db ?? location?.heating_99_db ?? 10
  const elevation = customLoc?.elevation_ft ?? location?.elevation_ft ?? 0
  
  if (settings.coolingDesignCondition === '1%' && location) {
    coolingDb = location.cooling_1_db
    coolingWb = location.cooling_1_mcwb
  }
  if (settings.heatingDesignCondition === '99.6%' && location) {
    heatingDb = location.heating_996_db
  }
  
  const locationName = customLoc?.name ?? 
    (location ? `${location.name}, ${location.state || location.country}` : 'Not specified')
  
  // Calculate altitude correction
  let altitudeCorrection = 1.0
  if (settings.altitudeCorrection && elevation > 2000) {
    altitudeCorrection = getAltitudeCorrectionFactor(elevation)
  }
  
  // Calculate each system
  const systemResults = systems.map(system =>
    calculateSystemVentilation(system, zones, spaces, settings)
  )
  
  // Find unassigned spaces
  const assignedSpaceIds = new Set(
    zones.flatMap(z => spaces.filter(s => s.zoneId === z.id).map(s => s.id))
  )
  const unassignedSpaces = spaces
    .filter(s => !assignedSpaceIds.has(s.id))
    .map(s => calculateSpaceVentilation(s, 1.0, settings))
  
  // Aggregate totals
  const totalAreaSf = systemResults.reduce((sum, s) => sum + s.totalAreaSf, 0) +
    unassignedSpaces.reduce((sum, s) => sum + s.areaSf, 0)
  const totalOccupancy = systemResults.reduce((sum, s) => sum + s.totalOccupancy, 0) +
    unassignedSpaces.reduce((sum, s) => sum + s.occupancy, 0)
  const totalVot = systemResults.reduce((sum, s) => sum + s.Vot, 0) +
    unassignedSpaces.reduce((sum, s) => sum + s.Voz, 0)
  const totalExhaustCfm = systemResults.reduce((sum, s) => sum + s.totalExhaustCfm, 0) +
    unassignedSpaces.reduce((sum, s) => sum + s.exhaustCfm, 0)
  
  const totalCoolingBtuh = systemResults.reduce((sum, s) => sum + s.coolingLoadBtuh, 0)
  const totalHeatingBtuh = systemResults.reduce((sum, s) => sum + s.heatingLoadBtuh, 0)
  
  return {
    locationName,
    coolingDb,
    coolingWb,
    heatingDb,
    indoorSummerDb: settings.summerIndoorDb,
    indoorWinterDb: settings.winterIndoorDb,
    altitudeCorrection: Math.round(altitudeCorrection * 1000) / 1000,
    totalAreaSf,
    totalOccupancy,
    totalVot: Math.round(totalVot),
    totalExhaustCfm: Math.round(totalExhaustCfm),
    totalCoolingBtuh: Math.round(totalCoolingBtuh),
    totalHeatingBtuh: Math.round(totalHeatingBtuh),
    totalCoolingTons: Math.round(totalCoolingBtuh / 12000 * 10) / 10,
    totalHeatingMbh: Math.round(totalHeatingBtuh / 1000 * 10) / 10,
    systems: systemResults,
    unassignedSpaces,
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate required exhaust for specific fixtures
 */
export function calculateFixtureExhaust(
  toilets: number,
  urinals: number,
  showers: number,
  isPublic: boolean = true
): number {
  const toiletCfm = isPublic ? 70 : 25
  const urinalCfm = isPublic ? 70 : 25
  const showerCfm = 20
  
  return (toilets * toiletCfm) + (urinals * urinalCfm) + (showers * showerCfm)
}

/**
 * Estimate occupancy diversity factor based on system type and zone count
 */
export function estimateDiversityFactor(
  systemType: 'single_zone' | 'vav_multi_zone' | 'doas_100_oa',
  zoneCount: number
): number {
  if (systemType === 'single_zone') return 1.0
  if (systemType === 'doas_100_oa') return 0.9
  
  // VAV multi-zone: diversity increases with more zones
  if (zoneCount <= 2) return 0.95
  if (zoneCount <= 5) return 0.85
  if (zoneCount <= 10) return 0.75
  return 0.65
}
