import type { ZoneFixtures, PlumbingCalcResult } from '../types'
import { getFixtureById, LEGACY_FIXTURE_MAPPING } from '../data/nycFixtures'
import { sanitarySizing, waterMeterSizing } from '../data/defaults'

// Standard pipe sizes (inches) for water supply
const STANDARD_PIPE_SIZES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 6, 8]

// Extended interface to handle commercial laundry and velocity settings
interface PlumbingCalcOptions {
  useCommercialLaundry?: boolean
  coldWaterVelocityFPS?: number   // Design velocity for cold water (default 5 FPS)
  hotWaterVelocityFPS?: number    // Design velocity for hot water (default 4 FPS)
  hotWaterFlowRatio?: number      // Hot water flow as fraction of total (default: calculated from fixtures)
                                   // If not provided, will be calculated from fixture WSFU values
                                   // Manual override: set to specific value (0.3-0.8 typical)
  useCalculatedHWRatio?: boolean  // If true, always use fixture-calculated ratio instead of manual
  // Legacy fields for backwards compatibility
  designVelocityFPS?: number      // @deprecated - use coldWaterVelocityFPS
  hotWaterDemandFactor?: number   // @deprecated - use hotWaterFlowRatio
}

/**
 * Calculate plumbing loads from dynamic fixtures using NYC Plumbing Code database
 */
export function calculatePlumbing(fixtures: ZoneFixtures, options?: PlumbingCalcOptions): PlumbingCalcResult {
  // Use new fields or fall back to legacy fields
  const coldWaterVelocity = options?.coldWaterVelocityFPS ?? options?.designVelocityFPS ?? 5
  const hotWaterVelocity = options?.hotWaterVelocityFPS ?? options?.designVelocityFPS ?? 4
  
  // Calculate HW ratio from fixture units (ASPE method)
  const calculatedRatio = calculateHotWaterRatioFromFixtures(fixtures)
  
  // Use calculated ratio unless manual override is provided
  // If useCalculatedHWRatio is true, always use calculated
  // Otherwise use manual if provided, else calculated
  let hotWaterFactor: number
  if (options?.useCalculatedHWRatio) {
    hotWaterFactor = calculatedRatio.ratio
  } else if (options?.hotWaterFlowRatio !== undefined) {
    hotWaterFactor = options.hotWaterFlowRatio
  } else if (options?.hotWaterDemandFactor !== undefined) {
    hotWaterFactor = options.hotWaterDemandFactor
  } else {
    // Default: use calculated ratio from fixtures
    hotWaterFactor = calculatedRatio.ratio
  }
  
  let totalWSFU = 0
  let totalDFU = 0
  
  // Iterate over all fixtures and calculate totals
  for (const [fixtureId, count] of Object.entries(fixtures)) {
    if (count <= 0) continue
    
    // Map legacy IDs to new IDs
    const mappedId = LEGACY_FIXTURE_MAPPING[fixtureId] || fixtureId
    
    // Look up fixture in database
    const fixtureDef = getFixtureById(mappedId)
    
    if (fixtureDef) {
      // Use wsfuTotal from ASPE tables (or fall back to legacy wsfu)
      const wsfu = 'wsfuTotal' in fixtureDef ? (fixtureDef as any).wsfuTotal : (fixtureDef as any).wsfu || 0
      totalWSFU += count * wsfu
      totalDFU += count * fixtureDef.dfu
    } else {
      // Fallback for unknown fixtures - use conservative estimates
      console.warn(`Unknown fixture type: ${fixtureId}, using default values`)
      totalWSFU += count * 2  // Conservative default WSFU
      totalDFU += count * 2   // Conservative default DFU
    }
  }

  // Convert WSFU to GPM using Hunter's Curve approximation
  const peakGPM = wsfuToGPM(totalWSFU)

  // Determine water meter size
  let recommendedMeterSize = '4"'
  for (const threshold of waterMeterSizing) {
    if (peakGPM <= threshold.maxGPM) {
      recommendedMeterSize = threshold.size
      break
    }
  }

  // Determine drain size
  let recommendedDrainSize = '6"'
  for (const threshold of sanitarySizing.thresholds) {
    if (totalDFU <= threshold.maxDFU) {
      recommendedDrainSize = threshold.pipeSize
      break
    }
  }

  // Cold water main size (velocity-based with COLD WATER velocity)
  const coldWaterMainSize = getPipeSizeByVelocity(peakGPM, coldWaterVelocity)
  
  // Hot water main (based on flow ratio and HOT WATER velocity)
  const hotWaterGPM = peakGPM * hotWaterFactor
  const hotWaterMainSize = getPipeSizeByVelocity(hotWaterGPM, hotWaterVelocity)
  
  // Calculate actual velocities for the selected pipe sizes
  const coldPipeDia = parseFloat(coldWaterMainSize.replace('"', ''))
  const hotPipeDia = parseFloat(hotWaterMainSize.replace('"', ''))
  const coldActualVelocity = calculateVelocity(peakGPM, coldPipeDia)
  const hotActualVelocity = calculateVelocity(hotWaterGPM, hotPipeDia)

  return {
    totalWSFU: Math.round(totalWSFU),
    totalDFU: Math.round(totalDFU),
    peakGPM: Math.round(peakGPM),
    recommendedMeterSize,
    recommendedDrainSize,
    coldWaterMainSize,
    hotWaterMainSize,
    // Velocity-based sizing details - now separate for hot and cold
    coldWaterDesignVelocityFPS: coldWaterVelocity,
    hotWaterDesignVelocityFPS: hotWaterVelocity,
    hotWaterFlowRatio: hotWaterFactor,
    coldWaterGPM: Math.round(peakGPM),
    hotWaterGPM: Math.round(hotWaterGPM),
    coldActualVelocityFPS: Math.round(coldActualVelocity * 10) / 10,
    hotActualVelocityFPS: Math.round(hotActualVelocity * 10) / 10,
    // Calculated ratio from fixture units (ASPE method)
    calculatedHWRatio: calculatedRatio.ratio,
    wsfuCold: calculatedRatio.totalWsfuCold,
    wsfuHot: calculatedRatio.totalWsfuHot,
  }
}

/**
 * Calculate pipe size based on flow rate and design velocity
 * Formula: d = √(GPM × 0.408 / V)
 * Where: d = diameter in inches, V = velocity in FPS
 * 0.408 = conversion factor (4 / π / 7.48 / 60 × 144)
 */
function getPipeSizeByVelocity(gpm: number, velocityFPS: number): string {
  if (gpm <= 0) return '0.5"'
  
  // Calculate minimum required diameter (inches)
  const minDiameter = Math.sqrt((gpm * 0.408) / velocityFPS)
  
  // Find the next standard pipe size that accommodates this flow
  for (const size of STANDARD_PIPE_SIZES) {
    if (size >= minDiameter) {
      return `${size}"`
    }
  }
  
  return '8"' // Maximum standard size
}

/**
 * Calculate actual velocity for a given flow and pipe diameter
 * Formula: V = GPM × 0.408 / d²
 */
function calculateVelocity(gpm: number, diameterInches: number): number {
  if (gpm <= 0 || diameterInches <= 0) return 0
  return (gpm * 0.408) / (diameterInches * diameterInches)
}

// Hunter's Curve approximation for WSFU to GPM conversion
// Based on IPC/UPC probability tables
function wsfuToGPM(wsfu: number): number {
  if (wsfu <= 0) return 0
  if (wsfu <= 6) return wsfu * 5 // ~5 GPM per FU for very small systems
  if (wsfu <= 10) return 25 + (wsfu - 6) * 2.5
  if (wsfu <= 20) return 35 + (wsfu - 10) * 1.5
  if (wsfu <= 50) return 50 + (wsfu - 20) * 0.75
  if (wsfu <= 100) return 72.5 + (wsfu - 50) * 0.5
  if (wsfu <= 200) return 97.5 + (wsfu - 100) * 0.35
  if (wsfu <= 500) return 132.5 + (wsfu - 200) * 0.25
  return 207.5 + (wsfu - 500) * 0.2
}

/**
 * Get fixture count summary for display (dynamic version)
 */
export function getFixtureSummary(fixtures: ZoneFixtures): string[] {
  const summary: string[] = []
  
  for (const [fixtureId, count] of Object.entries(fixtures)) {
    if (count <= 0) continue
    
    // Map legacy IDs to new IDs
    const mappedId = LEGACY_FIXTURE_MAPPING[fixtureId] || fixtureId
    const fixtureDef = getFixtureById(mappedId)
    
    if (fixtureDef) {
      summary.push(`${count} ${fixtureDef.name}${count > 1 ? 's' : ''}`)
    } else {
      // Fallback for legacy IDs
      const legacyName = fixtureId.replace(/([A-Z])/g, ' $1').trim()
      summary.push(`${count} ${legacyName}`)
    }
  }
  
  return summary
}

/**
 * Calculate total hot water demand in GPH from fixtures
 */
export function calculateHotWaterDemand(fixtures: ZoneFixtures): number {
  let totalGPH = 0
  
  for (const [fixtureId, count] of Object.entries(fixtures)) {
    if (count <= 0) continue
    
    // Map legacy IDs to new IDs
    const mappedId = LEGACY_FIXTURE_MAPPING[fixtureId] || fixtureId
    const fixtureDef = getFixtureById(mappedId)
    
    if (fixtureDef && fixtureDef.hotWaterGPH > 0) {
      totalGPH += count * fixtureDef.hotWaterGPH
    }
  }
  
  return totalGPH
}

/**
 * Calculate hot water ratio from fixture units (ASPE method)
 * Uses wsfuHot and wsfuCold from fixture definitions
 * 
 * Formula: HW Ratio = Total WSFU Hot / Total WSFU (Cold + Hot)
 * 
 * @returns Object with:
 *   - ratio: calculated HW/Total ratio (0-1)
 *   - totalWsfuCold: sum of cold water WSFU
 *   - totalWsfuHot: sum of hot water WSFU
 *   - totalWsfu: total WSFU
 */
export function calculateHotWaterRatioFromFixtures(fixtures: ZoneFixtures): {
  ratio: number
  totalWsfuCold: number
  totalWsfuHot: number
  totalWsfu: number
} {
  let totalWsfuCold = 0
  let totalWsfuHot = 0
  
  for (const [fixtureId, count] of Object.entries(fixtures)) {
    if (count <= 0) continue
    
    // Map legacy IDs to new IDs
    const mappedId = LEGACY_FIXTURE_MAPPING[fixtureId] || fixtureId
    const fixtureDef = getFixtureById(mappedId)
    
    if (fixtureDef) {
      totalWsfuCold += count * fixtureDef.wsfuCold
      totalWsfuHot += count * fixtureDef.wsfuHot
    }
  }
  
  const totalWsfu = totalWsfuCold + totalWsfuHot
  
  // Calculate ratio (avoid division by zero)
  // If no fixtures, default to 0.5 (50% hot water assumption)
  const ratio = totalWsfu > 0 ? totalWsfuHot / totalWsfu : 0.5
  
  return {
    ratio: Math.round(ratio * 100) / 100,  // Round to 2 decimal places
    totalWsfuCold: Math.round(totalWsfuCold * 10) / 10,
    totalWsfuHot: Math.round(totalWsfuHot * 10) / 10,
    totalWsfu: Math.round(totalWsfu * 10) / 10,
  }
}
