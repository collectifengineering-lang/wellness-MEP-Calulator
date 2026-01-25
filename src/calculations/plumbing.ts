import type { ZoneFixtures, PlumbingCalcResult } from '../types'
import { fixtureUnits, sanitarySizing, waterMeterSizing } from '../data/defaults'

// Extended interface to handle commercial laundry
interface PlumbingCalcOptions {
  useCommercialLaundry?: boolean
}

export function calculatePlumbing(fixtures: ZoneFixtures, options?: PlumbingCalcOptions): PlumbingCalcResult {
  const useCommercialWasher = options?.useCommercialLaundry ?? false
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

  // Cold water main size (based on peak GPM)
  const coldWaterMainSize = getWaterMainSize(peakGPM)
  
  // Hot water main (typically smaller, ~60% of cold water demand)
  const hotWaterGPM = peakGPM * 0.6
  const hotWaterMainSize = getWaterMainSize(hotWaterGPM)

  return {
    totalWSFU: Math.round(totalWSFU),
    totalDFU: Math.round(totalDFU),
    peakGPM: Math.round(peakGPM),
    recommendedMeterSize,
    recommendedDrainSize,
    coldWaterMainSize,
    hotWaterMainSize,
  }
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

// Determine water main size based on GPM
function getWaterMainSize(gpm: number): string {
  if (gpm <= 30) return '1"'
  if (gpm <= 50) return '1.25"'
  if (gpm <= 75) return '1.5"'
  if (gpm <= 130) return '2"'
  if (gpm <= 200) return '2.5"'
  if (gpm <= 400) return '3"'
  return '4"'
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
