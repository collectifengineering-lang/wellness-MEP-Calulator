/**
 * Pool Room / Natatorium HVAC Calculations
 * Based on Dectron Natatorium Design Guide and ASHRAE standards
 * 
 * Reference: https://dectron.com/wp-content/uploads/2021/07/dectron-natatorium-design-guide.pdf
 */

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
  
  // Calculate evaporation for each pool
  const poolBreakdown = pools.map(pool => ({
    id: pool.id,
    name: pool.name,
    lbHr: calculatePoolEvaporation(pool, params.airTempF, params.relativeHumidity),
    surfaceAreaSF: pool.surfaceAreaSF,
  }))
  
  // Total evaporation
  const totalEvaporationLbHr = poolBreakdown.reduce((sum, p) => sum + p.lbHr, 0)
  
  // Airflow calculations
  const supplyAirCFM = calculateSupplyAirCFM(roomVolumeCF, params.airChangesPerHour)
  const outdoorAirCFM = calculateOutdoorAirCFM(totalPoolAreaSF, params.wetDeckAreaSF, params.spectatorCount)
  const exhaustAirCFM = calculateExhaustAirCFM(outdoorAirCFM)
  
  // Calculate actual ACH for reference
  const actualACH = (supplyAirCFM * 60) / roomVolumeCF
  
  return {
    // Dehumidification
    totalEvaporationLbHr: Math.round(totalEvaporationLbHr * 10) / 10,
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
  }
}

/**
 * Get default parameters for a new pool room
 */
export function getDefaultPoolRoomParams(roomSF: number): PoolRoomParams {
  return {
    roomSF,
    ceilingHeightFt: 20,        // Typical for natatoriums
    airTempF: 84,               // 2°F above typical water temp
    relativeHumidity: 55,       // Middle of 50-60% range
    wetDeckAreaSF: Math.round(roomSF * 0.3), // Assume 30% is wet deck
    spectatorCount: 0,
    airChangesPerHour: 5,       // Middle of 4-6 range
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
