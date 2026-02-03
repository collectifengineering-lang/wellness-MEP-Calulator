/**
 * Pool Room / Natatorium HVAC Calculations
 * Based on Dectron Natatorium Design Guide and ASHRAE standards
 * 
 * Reference: https://dectron.com/wp-content/uploads/2021/07/dectron-natatorium-design-guide.pdf
 * 
 * MOISTURE LOAD SOURCES (lb/hr):
 * 1. Pool evaporation - from water surface (ASHRAE formula)
 * 2. Spectators - sedentary people ~0.12 lb/hr each
 * 3. Swimmers - active people ~0.7 lb/hr each (higher due to wet skin)
 * 4. Ventilation - outdoor air brings in moisture (can be negative in dry climates)
 */

import { getLocationById } from '../data/ashraeClimate'

// Pool type presets with recommended temperatures and activity factors
export const POOL_TYPE_PRESETS = {
  competition: {
    name: 'Competition',
    waterTempRange: { min: 76, max: 82, default: 79 },
    airTempRange: { min: 75, max: 85, default: 80 },
    activityFactor: 1.0,
    description: 'Olympic/competitive swimming'
  },
  recreational: {
    name: 'Recreational',
    waterTempRange: { min: 80, max: 84, default: 82 },
    airTempRange: { min: 82, max: 85, default: 84 },
    activityFactor: 1.0,
    description: 'Public/municipal pool'
  },
  hotel: {
    name: 'Hotel',
    waterTempRange: { min: 82, max: 86, default: 84 },
    airTempRange: { min: 82, max: 85, default: 84 },
    activityFactor: 0.8,
    description: 'Hotel/resort pool'
  },
  therapy: {
    name: 'Therapy/Rehab',
    waterTempRange: { min: 90, max: 95, default: 92 },
    airTempRange: { min: 80, max: 85, default: 84 },
    activityFactor: 1.0,
    description: 'Physical therapy pool'
  },
  whirlpool: {
    name: 'Whirlpool/Spa',
    waterTempRange: { min: 102, max: 104, default: 103 },
    airTempRange: { min: 80, max: 85, default: 82 },
    activityFactor: 1.0,
    description: 'Hot tub/spa'
  },
  dive: {
    name: 'Diving',
    waterTempRange: { min: 84, max: 88, default: 86 },
    airTempRange: { min: 80, max: 85, default: 82 },
    activityFactor: 1.0,
    description: 'Diving pool'
  },
  lap: {
    name: 'Lap Pool',
    waterTempRange: { min: 78, max: 82, default: 80 },
    airTempRange: { min: 80, max: 85, default: 82 },
    activityFactor: 0.8,
    description: 'Lap swimming'
  },
  elderly: {
    name: 'Elderly/Senior',
    waterTempRange: { min: 85, max: 90, default: 88 },
    airTempRange: { min: 84, max: 85, default: 85 },
    activityFactor: 0.65,
    description: 'Senior swimming programs'
  },
  kids: {
    name: 'Kids Swim School',
    waterTempRange: { min: 88, max: 92, default: 90 },
    airTempRange: { min: 86, max: 92, default: 88 },
    activityFactor: 1.0,
    description: 'Children swim lessons'
  },
  waterpark: {
    name: 'Waterpark/Wave',
    waterTempRange: { min: 82, max: 86, default: 84 },
    airTempRange: { min: 82, max: 85, default: 84 },
    activityFactor: 1.5,
    description: 'Wave pool, water features'
  },
  residential: {
    name: 'Residential',
    waterTempRange: { min: 78, max: 84, default: 80 },
    airTempRange: { min: 78, max: 82, default: 80 },
    activityFactor: 0.5,
    description: 'Home pool'
  },
  cold_plunge: {
    name: 'Cold Plunge',
    waterTempRange: { min: 38, max: 60, default: 50 },
    airTempRange: { min: 75, max: 85, default: 80 },
    activityFactor: 0.5,  // Still water, minimal splashing
    description: 'Cold plunge pool (absorbs humidity)'
  },
} as const

export type PoolType = keyof typeof POOL_TYPE_PRESETS

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
  wetDeckAreaSF: number     // deck area around pools (typically 50-100% of pool area)
  spectatorCount: number    // number of spectators (not swimmers)
  swimmerCount: number      // number of active swimmers in pools
  airChangesPerHour: number // 4-6 recommended for natatoriums
  // ASHRAE location for outdoor air moisture calculation
  ashraeLocationId?: string // Location ID from ashraeClimate.ts
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

/**
 * Calculate saturation vapor pressure at a given temperature
 * Uses Antoine equation for water
 * 
 * @param tempF - Temperature in Fahrenheit
 * @returns Vapor pressure in inches of mercury (inHg)
 */
export function calculateSaturationVaporPressure(tempF: number): number {
  // Convert to Celsius for Antoine equation
  const tempC = (tempF - 32) * 5 / 9
  
  // Antoine equation constants for water (valid 1-100°C)
  // log10(P) = A - B / (C + T)
  // where P is in mmHg and T is in °C
  const A = 8.07131
  const B = 1730.63
  const C = 233.426
  
  // For temperatures above 100°C, use different constants
  const A2 = 8.14019
  const B2 = 1810.94
  const C2 = 244.485
  
  let log10P: number
  if (tempC <= 100) {
    log10P = A - B / (C + tempC)
  } else {
    log10P = A2 - B2 / (C2 + tempC)
  }
  
  // Convert from mmHg to inHg (1 inHg = 25.4 mmHg)
  const pressureMMHg = Math.pow(10, log10P)
  const pressureInHg = pressureMMHg / 25.4
  
  return pressureInHg
}

/**
 * Calculate actual vapor pressure based on RH and temperature
 * 
 * @param tempF - Air temperature in Fahrenheit
 * @param relativeHumidity - Relative humidity (0-100)
 * @returns Actual vapor pressure in inches of mercury
 */
export function calculateActualVaporPressure(tempF: number, relativeHumidity: number): number {
  const saturationPressure = calculateSaturationVaporPressure(tempF)
  return saturationPressure * (relativeHumidity / 100)
}

/**
 * Calculate humidity ratio (grains of moisture per lb of dry air)
 * From temperature and relative humidity
 * 
 * @param tempF - Temperature in Fahrenheit
 * @param relativeHumidity - Relative humidity (0-100%)
 * @param elevationFt - Elevation in feet (affects barometric pressure)
 * @returns Humidity ratio in grains/lb
 */
export function calculateHumidityRatio(
  tempF: number,
  relativeHumidity: number,
  elevationFt: number = 0
): number {
  // Calculate saturation pressure at temperature
  const Psat = calculateSaturationVaporPressure(tempF) // inHg
  
  // Actual vapor pressure
  const Pv = Psat * (relativeHumidity / 100)
  
  // Barometric pressure corrected for altitude (standard: 29.92 inHg at sea level)
  const Pb = 29.92 * Math.pow(1 - 0.0000068753 * elevationFt, 5.2559)
  
  // Humidity ratio: W = 0.622 * Pv / (Pb - Pv)
  // Result is in lb water / lb dry air
  const W = 0.622 * Pv / (Pb - Pv)
  
  // Convert to grains (1 lb = 7000 grains)
  return W * 7000
}

/**
 * Calculate moisture load from spectators (sedentary people)
 * Based on ASHRAE Handbook - Fundamentals, Table 1 (Metabolic Heat Generation)
 * Sedentary activity releases ~0.12-0.15 lb/hr of moisture per person
 * 
 * @param spectatorCount - Number of spectators
 * @returns Moisture load in lb/hr
 */
export function calculateSpectatorMoisture(spectatorCount: number): number {
  // Sedentary activity (watching) - about 0.12 lb/hr per person
  const SPECTATOR_MOISTURE_LB_HR = 0.12
  return spectatorCount * SPECTATOR_MOISTURE_LB_HR
}

/**
 * Calculate moisture load from swimmers (active people in/around water)
 * Higher moisture rate due to:
 * - Higher metabolic activity
 * - Wet skin evaporation when out of water
 * Based on ASHRAE: moderate activity + wet skin factor
 * 
 * @param swimmerCount - Number of active swimmers
 * @returns Moisture load in lb/hr
 */
export function calculateSwimmerMoisture(swimmerCount: number): number {
  // Active swimming + wet skin evaporation - about 0.7 lb/hr per person
  // This is higher than spectators due to physical activity and wet skin
  const SWIMMER_MOISTURE_LB_HR = 0.7
  return swimmerCount * SWIMMER_MOISTURE_LB_HR
}

/**
 * Calculate moisture load from outdoor air ventilation
 * When outdoor air is more humid than indoor, it adds to dehumidification load
 * When outdoor air is drier, it helps reduce the load (negative value)
 * 
 * Formula: Moisture lb/hr = 4.5 × CFM × ΔW ÷ 7000
 * Where ΔW = (outdoor humidity ratio - indoor humidity ratio) in grains/lb
 * 
 * @param outdoorAirCFM - Outdoor air CFM
 * @param indoorHumidityRatio - Indoor humidity ratio (grains/lb)
 * @param outdoorHumidityRatio - Outdoor humidity ratio (grains/lb)
 * @returns Moisture load in lb/hr (positive = adds moisture, negative = removes moisture)
 */
export function calculateVentilationMoisture(
  outdoorAirCFM: number,
  indoorHumidityRatio: number,
  outdoorHumidityRatio: number
): number {
  // 4.5 is derived from air density (0.075 lb/ft³) × 60 min/hr = 4.5 lb/(CFM·hr)
  // Then divide by 7000 to convert grains to lb
  const deltaW = outdoorHumidityRatio - indoorHumidityRatio
  return (4.5 * outdoorAirCFM * deltaW) / 7000
}

/**
 * Get outdoor humidity ratio from ASHRAE location data
 * Uses summer design conditions (0.4% values - worst case for dehumidification)
 * 
 * @param locationId - ASHRAE location ID
 * @returns Outdoor humidity ratio in grains/lb, or null if location not found
 */
export function getOutdoorHumidityRatio(locationId: string | undefined): number | null {
  if (!locationId) return null
  const location = getLocationById(locationId)
  if (!location) return null
  return location.summer_hr // Already in grains/lb
}

/**
 * Get location elevation for calculations
 */
export function getLocationElevation(locationId: string | undefined): number {
  if (!locationId) return 0
  const location = getLocationById(locationId)
  return location?.elevation_ft || 0
}

/**
 * Calculate evaporation rate for a single pool
 * Based on ASHRAE formula from Dectron guide
 * 
 * wp = 0.1 × A × Fa × (Pw - Pa)
 * 
 * Where:
 * - wp = evaporation rate (lb/hr)
 * - A = pool surface area (ft²)
 * - Fa = activity factor
 * - Pw = saturation vapor pressure at water surface temperature
 * - Pa = partial vapor pressure at room air conditions
 * 
 * COLD POOLS: When water temperature is below room dew point (Pw < Pa),
 * condensation occurs on the water surface, ABSORBING moisture from the air.
 * This gives a NEGATIVE lb/hr which reduces total dehumidification load.
 * 
 * @param pool - Pool configuration
 * @param airTempF - Room air temperature (°F)
 * @param relativeHumidity - Room relative humidity (%)
 * @returns Evaporation rate in lb/hr (negative for cold pools = condensation/absorption)
 */
export function calculatePoolEvaporation(
  pool: PoolConfig,
  airTempF: number,
  relativeHumidity: number
): number {
  // Vapor pressure at water surface (saturated at water temp)
  const Pw = calculateSaturationVaporPressure(pool.waterTempF)
  
  // Actual vapor pressure in room air
  const Pa = calculateActualVaporPressure(airTempF, relativeHumidity)
  
  // Evaporation formula from ASHRAE/Dectron
  // wp = 0.1 × A × Fa × (Pw - Pa)
  // POSITIVE = evaporation (hot pool adds moisture)
  // NEGATIVE = condensation (cold pool absorbs moisture)
  const evaporationLbHr = 0.1 * pool.surfaceAreaSF * pool.activityFactor * (Pw - Pa)
  
  return evaporationLbHr
}

/**
 * Calculate supply air CFM based on room volume and air changes per hour
 * Natatoriums typically require 4-6 ACH
 * 
 * @param roomVolumeCF - Room volume in cubic feet
 * @param airChangesPerHour - Target ACH (4-6 recommended)
 * @returns Supply air CFM
 */
export function calculateSupplyAirCFM(roomVolumeCF: number, airChangesPerHour: number): number {
  // CFM = (Volume × ACH) / 60
  return Math.round((roomVolumeCF * airChangesPerHour) / 60)
}

/**
 * Calculate outdoor air CFM per ASHRAE Standard 62.1
 * For natatoriums: 0.48 CFM/ft² of pool + wet deck + 7.5 CFM per spectator
 * 
 * @param poolAreaSF - Total pool surface area (ft²)
 * @param wetDeckAreaSF - Wet deck area around pools (ft²)
 * @param spectatorCount - Number of spectators
 * @returns Outdoor air CFM
 */
export function calculateOutdoorAirCFM(
  poolAreaSF: number,
  wetDeckAreaSF: number,
  spectatorCount: number
): number {
  // Base rate: 0.48 CFM per sq ft of pool and wet deck
  const areaBasedCFM = 0.48 * (poolAreaSF + wetDeckAreaSF)
  
  // Additional for spectators: 7.5 CFM per person
  const spectatorCFM = 7.5 * spectatorCount
  
  return Math.round(areaBasedCFM + spectatorCFM)
}

/**
 * Calculate exhaust air CFM
 * Per Dectron guide: 110% of outdoor air to maintain slight negative pressure
 * 
 * @param outdoorAirCFM - Outdoor air CFM
 * @param exhaustMultiplier - Typically 1.1 (110%)
 * @returns Exhaust air CFM
 */
export function calculateExhaustAirCFM(outdoorAirCFM: number, exhaustMultiplier: number = 1.1): number {
  return Math.round(outdoorAirCFM * exhaustMultiplier)
}

/**
 * Calculate all pool room loads and airflow requirements
 * 
 * @param pools - Array of pool configurations
 * @param params - Room parameters
 * @returns Complete calculation results
 */
export function calculatePoolRoomLoads(
  pools: PoolConfig[],
  params: PoolRoomParams
): PoolRoomResults {
  // Calculate room volume
  const roomVolumeCF = params.roomSF * params.ceilingHeightFt
  
  // Calculate total pool area
  const totalPoolAreaSF = pools.reduce((sum, pool) => sum + pool.surfaceAreaSF, 0)
  
  // Get elevation for humidity ratio calculations
  const elevation = getLocationElevation(params.ashraeLocationId)
  
  // =============================================
  // MOISTURE SOURCE 1: Pool Evaporation
  // =============================================
  const poolBreakdown = pools.map(pool => ({
    id: pool.id,
    name: pool.name,
    lbHr: calculatePoolEvaporation(pool, params.airTempF, params.relativeHumidity),
    surfaceAreaSF: pool.surfaceAreaSF,
  }))
  const poolEvaporationLbHr = poolBreakdown.reduce((sum, p) => sum + p.lbHr, 0)
  
  // =============================================
  // MOISTURE SOURCE 2: Spectators (sedentary)
  // =============================================
  const spectatorMoistureLbHr = calculateSpectatorMoisture(params.spectatorCount)
  
  // =============================================
  // MOISTURE SOURCE 3: Swimmers (active)
  // =============================================
  const swimmerMoistureLbHr = calculateSwimmerMoisture(params.swimmerCount)
  
  // =============================================
  // Airflow calculations (needed for ventilation moisture)
  // =============================================
  const supplyAirCFM = calculateSupplyAirCFM(roomVolumeCF, params.airChangesPerHour)
  // Include swimmers in outdoor air calculation (people in pool zone need fresh air)
  const outdoorAirCFM = calculateOutdoorAirCFM(
    totalPoolAreaSF, 
    params.wetDeckAreaSF, 
    params.spectatorCount + params.swimmerCount
  )
  const exhaustAirCFM = calculateExhaustAirCFM(outdoorAirCFM)
  
  // =============================================
  // MOISTURE SOURCE 4: Ventilation (outdoor air)
  // =============================================
  // Calculate indoor humidity ratio from room conditions
  const indoorHumidityRatio = calculateHumidityRatio(
    params.airTempF, 
    params.relativeHumidity, 
    elevation
  )
  
  // Get outdoor humidity ratio from ASHRAE location (summer design conditions)
  const outdoorHumidityRatio = getOutdoorHumidityRatio(params.ashraeLocationId)
  
  // Calculate ventilation moisture load (positive = adds moisture, negative = helps)
  let ventilationMoistureLbHr = 0
  if (outdoorHumidityRatio !== null) {
    ventilationMoistureLbHr = calculateVentilationMoisture(
      outdoorAirCFM,
      indoorHumidityRatio,
      outdoorHumidityRatio
    )
  }
  
  // =============================================
  // TOTAL DEHUMIDIFICATION LOAD
  // =============================================
  const totalDehumidLbHr = 
    poolEvaporationLbHr + 
    spectatorMoistureLbHr + 
    swimmerMoistureLbHr + 
    ventilationMoistureLbHr
  
  // Calculate actual ACH for reference
  const actualACH = (supplyAirCFM * 60) / roomVolumeCF
  
  return {
    // Total Dehumidification Load
    totalDehumidLbHr: Math.round(totalDehumidLbHr * 10) / 10,
    
    // Moisture Source Breakdown
    poolEvaporationLbHr: Math.round(poolEvaporationLbHr * 10) / 10,
    spectatorMoistureLbHr: Math.round(spectatorMoistureLbHr * 10) / 10,
    swimmerMoistureLbHr: Math.round(swimmerMoistureLbHr * 10) / 10,
    ventilationMoistureLbHr: Math.round(ventilationMoistureLbHr * 10) / 10,
    
    // Pool breakdown detail
    poolBreakdown,
    
    // Airflow
    supplyAirCFM,
    outdoorAirCFM,
    exhaustAirCFM,
    
    // Room metrics
    roomVolumeCF: Math.round(roomVolumeCF),
    totalPoolAreaSF: Math.round(totalPoolAreaSF),
    
    // Reference
    recommendedACH: { min: 4, max: 6 },
    actualACH: Math.round(actualACH * 10) / 10,
    
    // Humidity ratios for reference
    indoorHumidityRatio: Math.round(indoorHumidityRatio * 10) / 10,
    outdoorHumidityRatio: outdoorHumidityRatio !== null 
      ? Math.round(outdoorHumidityRatio * 10) / 10 
      : undefined,
  }
}

/**
 * Get default parameters for a new pool room
 * @param roomSF - Room square footage
 * @param ashraeLocationId - Optional ASHRAE location ID from project settings
 */
export function getDefaultPoolRoomParams(roomSF: number, ashraeLocationId?: string): PoolRoomParams {
  return {
    roomSF,
    ceilingHeightFt: 20,        // Typical for natatoriums
    airTempF: 84,               // 2°F above typical water temp
    relativeHumidity: 55,       // Middle of 50-60% range
    wetDeckAreaSF: Math.round(roomSF * 0.3), // Assume 30% is wet deck
    spectatorCount: 0,
    swimmerCount: 0,            // Active swimmers in pools
    airChangesPerHour: 5,       // Middle of 4-6 range
    ashraeLocationId,           // From project settings
  }
}

/**
 * Create a new pool with defaults based on type
 */
export function createDefaultPool(
  id: string,
  poolType: PoolType = 'recreational',
  surfaceAreaSF: number = 1000
): PoolConfig {
  const preset = POOL_TYPE_PRESETS[poolType]
  return {
    id,
    name: preset.name,
    surfaceAreaSF,
    waterTempF: preset.waterTempRange.default,
    activityFactor: preset.activityFactor,
    poolType,
  }
}
