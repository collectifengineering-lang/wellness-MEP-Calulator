import type { ZoneFixtures, PlumbingCalcResult } from '../types'
import { fixtureUnits, sanitarySizing, waterMeterSizing } from '../data/defaults'

// Standard pipe sizes (inches) for water supply
const STANDARD_PIPE_SIZES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 6, 8]

// Extended interface to handle commercial laundry and velocity settings
interface PlumbingCalcOptions {
  useCommercialLaundry?: boolean
  designVelocityFPS?: number  // Design velocity in feet per second (default 5)
  hotWaterDemandFactor?: number  // Hot water as % of cold (default 0.6)
}

export function calculatePlumbing(fixtures: ZoneFixtures, options?: PlumbingCalcOptions): PlumbingCalcResult {
  const useCommercialWasher = options?.useCommercialLaundry ?? false
  const designVelocity = options?.designVelocityFPS ?? 5  // Default 5 FPS
  const hotWaterFactor = options?.hotWaterDemandFactor ?? 0.6
  
  const washerUnits = useCommercialWasher ? fixtureUnits.washing_machine_commercial : fixtureUnits.washing_machine
  
  // Calculate total Water Supply Fixture Units (WSFU)
  const totalWSFU =
    fixtures.showers * fixtureUnits.shower.wsfu +
    fixtures.lavs * fixtureUnits.lavatory.wsfu +
    fixtures.wcs * fixtureUnits.water_closet.wsfu +
    fixtures.serviceSinks * fixtureUnits.service_sink.wsfu +
    fixtures.washingMachines * washerUnits.wsfu

  // Calculate total Drainage Fixture Units (DFU)
  const totalDFU =
    fixtures.showers * fixtureUnits.shower.dfu +
    fixtures.lavs * fixtureUnits.lavatory.dfu +
    fixtures.wcs * fixtureUnits.water_closet.dfu +
    fixtures.floorDrains * fixtureUnits.floor_drain.dfu +
    fixtures.serviceSinks * fixtureUnits.service_sink.dfu +
    fixtures.washingMachines * washerUnits.dfu +
    fixtures.dryers * fixtureUnits.dryer.dfu // Add dryer condensate DFU

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

  // Cold water main size (velocity-based)
  const coldWaterMainSize = getPipeSizeByVelocity(peakGPM, designVelocity)
  
  // Hot water main (typically smaller, based on demand factor)
  const hotWaterGPM = peakGPM * hotWaterFactor
  const hotWaterMainSize = getPipeSizeByVelocity(hotWaterGPM, designVelocity)
  
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
    // Velocity-based sizing details
    designVelocityFPS: designVelocity,
    coldWaterGPM: Math.round(peakGPM),
    hotWaterGPM: Math.round(hotWaterGPM),
    coldActualVelocityFPS: Math.round(coldActualVelocity * 10) / 10,
    hotActualVelocityFPS: Math.round(hotActualVelocity * 10) / 10,
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

// Get fixture count summary
export function getFixtureSummary(fixtures: ZoneFixtures): string[] {
  const summary: string[] = []
  if (fixtures.showers > 0) summary.push(`${fixtures.showers} Showers`)
  if (fixtures.lavs > 0) summary.push(`${fixtures.lavs} Lavatories`)
  if (fixtures.wcs > 0) summary.push(`${fixtures.wcs} Water Closets`)
  if (fixtures.floorDrains > 0) summary.push(`${fixtures.floorDrains} Floor Drains`)
  if (fixtures.serviceSinks > 0) summary.push(`${fixtures.serviceSinks} Service Sinks`)
  if (fixtures.washingMachines > 0) summary.push(`${fixtures.washingMachines} Washing Machines`)
  return summary
}
