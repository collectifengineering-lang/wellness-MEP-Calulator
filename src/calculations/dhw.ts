import type { DHWSettings, DHWCalcResult, ZoneFixtures } from '../types'
import { dhwDefaults, fixtureUnits } from '../data/defaults'

export function calculateDHW(
  fixtures: ZoneFixtures,
  settings: DHWSettings,
  contingency: number
): DHWCalcResult {
  // Calculate peak hourly demand (GPH) using ASHRAE Table 10 values
  const peakGPH =
    fixtures.showers * fixtureUnits.shower.hot_gph +
    fixtures.lavs * fixtureUnits.lavatory.hot_gph +
    fixtures.serviceSinks * fixtureUnits.service_sink.hot_gph +
    fixtures.washingMachines * fixtureUnits.washing_machine.hot_gph

  // Temperature calculations
  const deltaT = settings.storageTemp - settings.coldWaterTemp
  
  // Recovery rate (BTU/hr)
  // Net BTU = GPH × 8.33 lb/gal × ΔT °F
  const netBTU = peakGPH * 8.33 * deltaT
  
  // Efficiency based on heater type
  const efficiency = settings.heaterType === 'gas' 
    ? settings.gasEfficiency 
    : settings.electricEfficiency
  
  // Gross BTU required (before efficiency loss)
  const grossBTU = netBTU / efficiency
  
  // For gas: convert BTU/hr to CFH (natural gas ~1,000 BTU/CF)
  const gasCFH = settings.heaterType === 'gas' ? grossBTU / 1000 : 0
  
  // For electric: convert BTU/hr to kW (1 kW = 3,412 BTU/hr)
  const electricKW = settings.heaterType === 'electric' ? grossBTU / 3412 : 0
  
  // Storage tank sizing
  // Storage factor 0.7 (70% usable)
  const storageFactor = 0.7
  const storageGallons = (peakGPH * settings.peakDuration) / storageFactor
  
  // Calculate number of tankless units needed (based on Navien 199,900 BTU)
  const tanklessUnits = Math.ceil(grossBTU / dhwDefaults.tankless_unit_btu)
  
  // Apply contingency
  const finalGrossBTU = grossBTU * (1 + contingency)
  const finalGasCFH = gasCFH * (1 + contingency)
  const finalElectricKW = electricKW * (1 + contingency)
  const finalStorageGallons = storageGallons * (1 + contingency)

  return {
    peakGPH: Math.round(peakGPH),
    netBTU: Math.round(netBTU),
    grossBTU: Math.round(finalGrossBTU),
    gasCFH: Math.round(finalGasCFH),
    electricKW: Math.round(finalElectricKW * 10) / 10,
    storageGallons: Math.round(finalStorageGallons),
    tanklessUnits: Math.max(tanklessUnits, 1),
    efficiency,
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
