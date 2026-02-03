import type { DHWSettings, DHWCalcResult, ZoneFixtures, FixtureOverride } from '../types'
import { dhwDefaults, dhwBuildingTypeFactors, fixtureUnits } from '../data/defaults'
import { getFixtureById } from '../data/nycFixtures'

/**
 * Get hot water GPH for a fixture with optional override applied
 */
function getFixtureHotWaterGPH(fixtureId: string, overrides?: FixtureOverride[]): number {
  const fixtureDef = getFixtureById(fixtureId)
  if (!fixtureDef) return 0
  
  // Check for override
  const override = overrides?.find(o => o.fixtureId === fixtureId)
  return override?.hotWaterGPH ?? fixtureDef.hotWaterGPH
}

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
  
  // Heat pump info
  useHeatPump?: boolean
  heatPumpCOP?: number
  electricKWWithoutHeatPump?: number  // What kW would be without heat pump (for comparison)
  electricKWWithHeatPump?: number     // Actual kW with heat pump
  electricKWSavings?: number          // kW saved by using heat pump
  
  // System sizing
  recommendedSystemType: string
  storageGallons: number
  tanklessUnits: number
  recoveryBTUhr: number
  
  // Building type info
  buildingTypeInfo: typeof dhwBuildingTypeFactors.gymnasium
  
  // ASHRAE mixing calculations (for storage systems)
  mixingRatio?: number       // (Tf - Tc) / (Ts - Tc)
  storageTempRise?: number   // Ts - Tc
  deliveryTempRise?: number  // Tf - Tc
  heaterGPH?: number         // GPH flowing through heater (different from fixture GPH for storage)
}

export function calculateDHW(
  fixtures: ZoneFixtures,
  settings: DHWSettings,
  contingency: number,
  fixtureOverrides?: FixtureOverride[]
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
  
  // Calculate individual fixture demands (using both new ASPE and legacy fixture IDs)
  const showerCount = getFixtureCount(
    ['shower_private', 'shower_public', 'shower', 'shower_gang'], 
    ['showers']
  )
  const lavCount = getFixtureCount(
    ['lavatory_private', 'lavatory_public', 'lavatory', 'hand_sink'], 
    ['lavs']
  )
  const serviceSinkCount = getFixtureCount(
    ['service_sink'], 
    ['serviceSinks']
  )
  const washerCount = getFixtureCount(
    ['washing_machine_8lb_private', 'washing_machine_8lb_public', 'washing_machine_15lb', 
     'washing_machine_commercial', 'washing_machine_residential'], 
    ['washingMachines']
  )
  
  const showerDemandGPH = showerCount * showerGPH
  const lavDemandGPH = lavCount * lavGPH
  const serviceSinkDemandGPH = serviceSinkCount * fixtureUnits.service_sink.hot_gph
  const washerDemandGPH = washerCount * fixtureUnits.washing_machine.hot_gph
  
  // Calculate hot water demand from all OTHER fixtures in ASPE database
  // Skip the core fixtures we already counted above
  const coreFixtureIds = new Set([
    'shower_private', 'shower_public', 'shower', 'shower_gang', 'showers',
    'lavatory_private', 'lavatory_public', 'lavatory', 'hand_sink', 'lavs',
    'service_sink', 'serviceSinks',
    'washing_machine_8lb_private', 'washing_machine_8lb_public', 'washing_machine_15lb',
    'washing_machine_commercial', 'washing_machine_residential', 'washingMachines'
  ])
  
  let additionalHotWaterGPH = 0
  for (const [fixtureId, count] of Object.entries(fixtures)) {
    if (count <= 0) continue
    if (coreFixtureIds.has(fixtureId)) continue
    
    // Get hot water GPH with override applied
    const hotWaterGPH = getFixtureHotWaterGPH(fixtureId, fixtureOverrides)
    
    if (hotWaterGPH > 0) {
      additionalHotWaterGPH += count * hotWaterGPH
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
  
  // ASHRAE Temperature calculations
  // For STORAGE systems: heater must heat water to storage temp (Ts)
  // For TANKLESS systems: heater delivers directly at delivery temp (Tf)
  const storageTempRise = settings.storageTemp - settings.coldWaterTemp  // Ts - Tc (e.g., 140 - 55 = 85°F)
  const deliveryTempRise = settings.deliveryTemp - settings.coldWaterTemp  // Tf - Tc (e.g., 120 - 55 = 65°F)
  
  // Mixing ratio: hot water from tank gets mixed with cold at fixture
  // Formula: Qs = Qf × (Tf - Tc) / (Ts - Tc)
  const mixingRatio = storageTempRise > 0 ? deliveryTempRise / storageTempRise : 1
  
  // Efficiency based on heater type
  const efficiency = settings.heaterType === 'gas' 
    ? settings.gasEfficiency 
    : settings.electricEfficiency
  
  // Storage tank sizing (ASHRAE method with mixing correction)
  // Storage = (Peak GPH × Peak Duration × Mixing Ratio) / Storage Factor
  // Mixing ratio reduces required storage because we store at higher temp
  const storageFactor = settings.storageFactor ?? buildingFactors.storageFactor
  const peakDuration = settings.peakDuration ?? buildingFactors.typicalPeakDuration
  
  let storageGallons: number
  if (settings.tankSizingMethod === 'manual' && settings.manualStorageGallons) {
    storageGallons = settings.manualStorageGallons
  } else {
    // ASHRAE: Storage accounts for mixing - need less stored hot water at higher temp
    storageGallons = (peakHourGPH * peakDuration * mixingRatio) / storageFactor
  }
  
  // Calculate BTU/hr based on system type
  // ASHRAE: Storage systems sized for RECOVERY rate, tankless for PEAK rate
  let netBTU: number
  let deltaT: number
  let heaterGPH: number  // GPH that actually flows through the heater
  
  if (settings.systemType === 'instantaneous') {
    // TANKLESS: Must meet 100% of instantaneous peak demand
    // Heat ALL gallons to delivery temp (no storage, no mixing)
    // BTU/hr = GPH × 8.33 lb/gal × (Tf - Tc)
    deltaT = deliveryTempRise
    heaterGPH = peakHourGPH  // Full peak demand
    netBTU = heaterGPH * 8.33 * deltaT
  } else if (settings.systemType === 'storage') {
    // STORAGE: Heater sized for RECOVERY rate (smaller than peak)
    // Tank acts as buffer, heater recovers over time
    // Recovery GPH = Storage Volume × Recovery Factor / Peak Duration
    // We heat at storage temp, water mixes with cold at fixture
    deltaT = storageTempRise
    const recoveryGPH = (storageGallons * (settings.recoveryFactor ?? 1.0)) / peakDuration
    heaterGPH = recoveryGPH
    netBTU = heaterGPH * 8.33 * deltaT
  } else {
    // HYBRID: Small storage tank + tankless for peak overflow
    // Tank covers ~60% of peak, tankless handles rest
    // Heater BTU based on delivery temp (tankless component dominates)
    deltaT = deliveryTempRise
    heaterGPH = peakHourGPH * 0.7  // Tank handles 30%, tankless handles 70%
    netBTU = heaterGPH * 8.33 * deltaT
  }
  
  // Gross BTU required (before efficiency loss)
  const grossBTU = netBTU / efficiency
  
  // Apply recovery factor for sizing
  const recoveryFactor = settings.recoveryFactor ?? 1.0
  const recoveryBTUhr = grossBTU * recoveryFactor
  
  // For gas: convert BTU/hr to CFH (natural gas ~1,000 BTU/CF)
  const gasCFH = settings.heaterType === 'gas' ? recoveryBTUhr / 1000 : 0
  
  // For electric: convert BTU/hr to kW (1 kW = 3,412 BTU/hr)
  // If heat pump enabled, divide by COP to get actual electrical input
  let electricKW = 0
  let heatPumpCOP = 1  // Default COP of 1 = resistance heating (100% efficient conversion)
  
  if (settings.heaterType === 'electric') {
    if (settings.useHeatPump && settings.heatPumpCOP > 1) {
      // Heat pump: electrical input = thermal output / COP
      heatPumpCOP = settings.heatPumpCOP
      electricKW = recoveryBTUhr / 3412 / heatPumpCOP
    } else {
      // Standard resistance electric: direct conversion
      electricKW = recoveryBTUhr / 3412
    }
  }
  
  // Tankless units needed (always sized for delivery temp and full peak)
  // This shows how many tankless units would be needed as an alternative
  const tanklessUnitBtu = settings.tanklessUnitBtu ?? dhwDefaults.tankless_unit_btu
  // Tankless must meet full peak demand at delivery temp
  const tanklessBTU = (peakHourGPH * 8.33 * deliveryTempRise / efficiency) * (settings.recoveryFactor ?? 1.0)
  const tanklessUnits = Math.ceil(tanklessBTU / tanklessUnitBtu)
  
  // Apply contingency
  const finalGrossBTU = recoveryBTUhr * (1 + contingency)
  const finalGasCFH = gasCFH * (1 + contingency)
  const finalElectricKW = electricKW * (1 + contingency)
  const finalStorageGallons = storageGallons * (1 + contingency)
  const finalTanklessUnits = Math.ceil(finalGrossBTU / tanklessUnitBtu)

  // Calculate comparison values for heat pump
  const electricKWWithoutHP = recoveryBTUhr / 3412  // What standard resistance would require
  const electricKWWithHP = settings.useHeatPump && settings.heatPumpCOP > 1 
    ? recoveryBTUhr / 3412 / settings.heatPumpCOP 
    : electricKWWithoutHP
  const kWSavings = electricKWWithoutHP - electricKWWithHP

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
    // Heat pump info
    useHeatPump: settings.useHeatPump,
    heatPumpCOP: heatPumpCOP,
    electricKWWithoutHeatPump: Math.round(electricKWWithoutHP * 10) / 10,
    electricKWWithHeatPump: Math.round(electricKWWithHP * 10) / 10,
    electricKWSavings: Math.round(kWSavings * 10) / 10,
    recommendedSystemType: peakHourGPH > 500 ? 'Storage with booster' : 
                           peakHourGPH > 200 ? 'Multiple tankless' : 'Single tankless',
    storageGallons: Math.round(storageGallons),
    tanklessUnits,
    recoveryBTUhr: Math.round(recoveryBTUhr),
    buildingTypeInfo: buildingFactors,
    // ASHRAE mixing info
    mixingRatio,
    storageTempRise,
    deliveryTempRise,
    heaterGPH: Math.round(heaterGPH),
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

// Heat Pump Water Heater COP presets based on commercial manufacturers
// COP = Heating Output (BTU) / Electrical Input (BTU equivalent)
// Higher COP = more efficient, varies by design conditions
export const heatPumpCOPPresets = [
  // Standard conditions (air temp 68°F, inlet water 58°F, outlet 140°F)
  { value: 2.5, label: 'Standard Residential (COP 2.5)', conditions: 'standard', notes: 'Typical residential HPWH' },
  { value: 3.0, label: 'High Efficiency Residential (COP 3.0)', conditions: 'standard', notes: 'Premium residential HPWH' },
  
  // Commercial - Colmac, Lync by Watts, Transom
  { value: 3.2, label: 'Colmac CxA (COP 3.2)', conditions: 'standard', notes: 'Colmac air-source, 140°F outlet' },
  { value: 3.5, label: 'Lync by Watts LYN (COP 3.5)', conditions: 'standard', notes: 'Commercial modular system' },
  { value: 3.8, label: 'Transom HPA (COP 3.8)', conditions: 'standard', notes: 'High performance air-source' },
  { value: 4.0, label: 'Premium Commercial (COP 4.0)', conditions: 'standard', notes: 'Optimal operating conditions' },
  
  // Cold climate ratings (at lower ambient temps)
  { value: 2.0, label: 'Cold Climate 47°F (COP 2.0)', conditions: 'cold_climate', notes: 'Performance at 47°F ambient' },
  { value: 2.2, label: 'Cold Climate Optimized (COP 2.2)', conditions: 'cold_climate', notes: 'Enhanced cold weather design' },
  
  // High temperature output (160°F+)
  { value: 2.8, label: 'High Temp 160°F (COP 2.8)', conditions: 'high_temp', notes: 'Legionella-safe storage temps' },
  { value: 3.0, label: 'CO2 Transcritical (COP 3.0)', conditions: 'high_temp', notes: 'CO2 refrigerant, 185°F capable' },
] as const

export type HeatPumpDesignCondition = 'standard' | 'cold_climate' | 'high_temp' | 'custom'

// Get recommended COP presets based on design conditions
export function getHeatPumpPresetsForConditions(conditions: HeatPumpDesignCondition) {
  if (conditions === 'custom') {
    return heatPumpCOPPresets
  }
  return heatPumpCOPPresets.filter(p => p.conditions === conditions || p.conditions === 'standard')
}

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
