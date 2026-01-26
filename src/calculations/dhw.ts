import type { DHWSettings, DHWCalcResult, ZoneFixtures } from '../types'
import { dhwDefaults, dhwBuildingTypeFactors, fixtureUnits } from '../data/defaults'
import { getFixtureById, LEGACY_FIXTURE_MAPPING } from '../data/nycFixtures'

export interface DHWCalcBreakdown {
  // Fixture demand
  showerDemandGPH: number
  lavDemandGPH: number
  serviceSinkDemandGPH: number
  washerDemandGPH: number
  totalFixtureDemandGPH: number
  
  // Adjusted demand
  adjustedDemandGPH: number  // After demand factor
  peakHourGPH: number        // After peak hour factor
  
  // Energy
  deltaT: number
  netBTUhr: number
  grossBTUhr: number
  efficiency: number
  
  // System sizing
  recommendedSystemType: string
  storageGallons: number
  tanklessUnits: number
  recoveryBTUhr: number
  
  // Building type info
  buildingTypeInfo: typeof dhwBuildingTypeFactors.gymnasium
}

export function calculateDHW(
  fixtures: ZoneFixtures,
  settings: DHWSettings,
  contingency: number
): DHWCalcResult & { breakdown?: DHWCalcBreakdown } {
  // Get building type factors
  const buildingFactors = dhwBuildingTypeFactors[settings.buildingType] || dhwBuildingTypeFactors.gymnasium
  
  // Use building-specific GPH values if not custom, otherwise use defaults from NYC fixture database
  const showerGPH = settings.buildingType !== 'custom' ? buildingFactors.showerGPH : fixtureUnits.shower.hot_gph
  const lavGPH = settings.buildingType !== 'custom' ? buildingFactors.lavGPH : fixtureUnits.lavatory.hot_gph
  
  // Helper to get fixture count (supports both new and legacy IDs)
  const getFixtureCount = (newIds: string[], legacyIds: string[]): number => {
    let count = 0
    // Try new IDs
    for (const id of newIds) {
      count += fixtures[id] || 0
    }
    // Try legacy IDs
    for (const id of legacyIds) {
      count += fixtures[id] || 0
    }
    return count
  }
  
  // Calculate individual fixture demands (using both new and legacy fixture IDs)
  const showerCount = getFixtureCount(['shower', 'shower_gang'], ['showers'])
  const lavCount = getFixtureCount(['lavatory', 'lavatory_public'], ['lavs'])
  const serviceSinkCount = getFixtureCount(['service_sink'], ['serviceSinks'])
  const washerCount = getFixtureCount(['washing_machine_residential', 'washing_machine_commercial'], ['washingMachines'])
  
  const showerDemandGPH = showerCount * showerGPH
  const lavDemandGPH = lavCount * lavGPH
  const serviceSinkDemandGPH = serviceSinkCount * fixtureUnits.service_sink.hot_gph
  const washerDemandGPH = washerCount * fixtureUnits.washing_machine.hot_gph
  
  // Calculate hot water demand from all fixtures in NYC database
  let additionalHotWaterGPH = 0
  for (const [fixtureId, count] of Object.entries(fixtures)) {
    if (count <= 0) continue
    
    // Skip fixtures we've already counted above
    if (['shower', 'shower_gang', 'showers', 'lavatory', 'lavatory_public', 'lavs',
         'service_sink', 'serviceSinks', 'washing_machine_residential', 
         'washing_machine_commercial', 'washingMachines'].includes(fixtureId)) {
      continue
    }
    
    // Map legacy IDs to new IDs
    const mappedId = LEGACY_FIXTURE_MAPPING[fixtureId] || fixtureId
    const fixtureDef = getFixtureById(mappedId)
    
    if (fixtureDef && fixtureDef.hotWaterGPH > 0) {
      additionalHotWaterGPH += count * fixtureDef.hotWaterGPH
    }
  }
  
  // Total fixture demand (unadjusted)
  const totalFixtureDemandGPH = showerDemandGPH + lavDemandGPH + serviceSinkDemandGPH + washerDemandGPH + additionalHotWaterGPH
  
  // Apply demand/diversity factor
  const demandFactor = settings.demandFactor ?? buildingFactors.demandDiversity
  const adjustedDemandGPH = totalFixtureDemandGPH * demandFactor
  
  // Apply peak hour factor
  const peakHourFactor = buildingFactors.peakHourFactor
  const peakHourGPH = adjustedDemandGPH * peakHourFactor
  
  // Temperature calculations
  const deltaT = settings.storageTemp - settings.coldWaterTemp
  
  // Calculate BTU/hr based on peak demand
  // BTU/hr = GPH × 8.33 lb/gal × ΔT °F
  const netBTU = peakHourGPH * 8.33 * deltaT
  
  // Efficiency based on heater type
  const efficiency = settings.heaterType === 'gas' 
    ? settings.gasEfficiency 
    : settings.electricEfficiency
  
  // Gross BTU required (before efficiency loss)
  const grossBTU = netBTU / efficiency
  
  // Apply recovery factor for sizing
  const recoveryFactor = settings.recoveryFactor ?? 1.0
  const recoveryBTUhr = grossBTU * recoveryFactor
  
  // For gas: convert BTU/hr to CFH (natural gas ~1,000 BTU/CF)
  const gasCFH = settings.heaterType === 'gas' ? recoveryBTUhr / 1000 : 0
  
  // For electric: convert BTU/hr to kW (1 kW = 3,412 BTU/hr)
  const electricKW = settings.heaterType === 'electric' ? recoveryBTUhr / 3412 : 0
  
  // Storage tank sizing (ASHRAE method)
  // Storage = (Peak GPH × Peak Duration) / Storage Factor
  const storageFactor = settings.storageFactor ?? buildingFactors.storageFactor
  const peakDuration = settings.peakDuration ?? buildingFactors.typicalPeakDuration
  
  let storageGallons: number
  if (settings.tankSizingMethod === 'manual' && settings.manualStorageGallons) {
    storageGallons = settings.manualStorageGallons
  } else {
    storageGallons = (peakHourGPH * peakDuration) / storageFactor
  }
  
  // Tankless units needed
  const tanklessUnitBtu = settings.tanklessUnitBtu ?? dhwDefaults.tankless_unit_btu
  const tanklessUnits = Math.ceil(recoveryBTUhr / tanklessUnitBtu)
  
  // Apply contingency
  const finalGrossBTU = recoveryBTUhr * (1 + contingency)
  const finalGasCFH = gasCFH * (1 + contingency)
  const finalElectricKW = electricKW * (1 + contingency)
  const finalStorageGallons = storageGallons * (1 + contingency)
  const finalTanklessUnits = Math.ceil(finalGrossBTU / tanklessUnitBtu)

  // Build breakdown for UI
  const breakdown: DHWCalcBreakdown = {
    showerDemandGPH: Math.round(showerDemandGPH),
    lavDemandGPH: Math.round(lavDemandGPH),
    serviceSinkDemandGPH: Math.round(serviceSinkDemandGPH),
    washerDemandGPH: Math.round(washerDemandGPH),
    totalFixtureDemandGPH: Math.round(totalFixtureDemandGPH),
    adjustedDemandGPH: Math.round(adjustedDemandGPH),
    peakHourGPH: Math.round(peakHourGPH),
    deltaT,
    netBTUhr: Math.round(netBTU),
    grossBTUhr: Math.round(grossBTU),
    efficiency,
    recommendedSystemType: peakHourGPH > 500 ? 'Storage with booster' : 
                           peakHourGPH > 200 ? 'Multiple tankless' : 'Single tankless',
    storageGallons: Math.round(storageGallons),
    tanklessUnits,
    recoveryBTUhr: Math.round(recoveryBTUhr),
    buildingTypeInfo: buildingFactors,
  }

  return {
    peakGPH: Math.round(peakHourGPH),
    netBTU: Math.round(netBTU),
    grossBTU: Math.round(finalGrossBTU),
    gasCFH: Math.round(finalGasCFH),
    electricKW: Math.round(finalElectricKW * 10) / 10,
    storageGallons: Math.round(finalStorageGallons),
    tanklessUnits: Math.max(finalTanklessUnits, 1),
    efficiency,
    breakdown,
  }
}

// Gas heater efficiency presets
export const gasHeaterEfficiencyPresets = [
  { value: 0.80, label: 'Standard (80%)' },
  { value: 0.82, label: 'Power Vented (82%)' },
  { value: 0.90, label: 'High Efficiency (90%)' },
  { value: 0.95, label: 'Condensing (95%)' },
  { value: 0.98, label: 'Ultra Condensing (98%)' },
] as const

// Hot water mixing equation helper
// Qs = Qf × (Tf - Tc) / (Ts - Tc)
export function calculateMixingVolume(
  finalVolume: number, // Qf - volume needed at delivery temp
  deliveryTemp: number, // Tf - temperature needed at fixture
  coldTemp: number, // Tc - cold water temperature
  storageTemp: number // Ts - storage tank temperature
): number {
  if (storageTemp <= coldTemp) return finalVolume
  return finalVolume * (deliveryTemp - coldTemp) / (storageTemp - coldTemp)
}
