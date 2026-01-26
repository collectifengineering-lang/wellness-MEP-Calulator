import type { Zone, ElectricalCalcResult } from '../types'
import { getZoneDefaults, calculateLaundryLoads } from '../data/zoneDefaults'
import { electricalDefaults, getStandardServiceSize, exceedsMaxServiceSize } from '../data/defaults'
import type { ElectricalSettings } from '../store/useSettingsStore'

export interface ElectricalCalcOptions {
  settings?: Partial<ElectricalSettings>
}

export function calculateElectrical(
  zones: Zone[], 
  contingency: number,
  options?: ElectricalCalcOptions
): ElectricalCalcResult {
  // Merge provided settings with defaults
  const powerFactor = options?.settings?.power_factor ?? electricalDefaults.power_factor
  const spareCapacity = options?.settings?.spare_capacity ?? electricalDefaults.spare_capacity
  const voltagePrimary = options?.settings?.voltage_primary ?? 208
  const voltageSecondary = options?.settings?.voltage_secondary ?? 480
  const demandFactor = options?.settings?.demand_factor ?? 1.0
  
  let totalKW = 0

  zones.forEach(zone => {
    const defaults = getZoneDefaults(zone.type)
    
    // 1. Rate-based loads (per SF)
    const lightingKW = zone.sf * zone.rates.lighting_w_sf / 1000
    const receptacleKW = zone.sf * zone.rates.receptacle_va_sf / 1000
    
    // 2. Line items - ALL equipment loads should be here!
    const lineItemsKW = zone.lineItems
      .filter(li => li.category === 'lighting' || li.category === 'power')
      .reduce((sum, li) => {
        if (li.unit === 'kW') return sum + li.quantity * li.value
        if (li.unit === 'W') return sum + (li.quantity * li.value) / 1000
        return sum
      }, 0)
    
    // 3. Laundry equipment (calculated from fixture counts)
    let laundryKW = 0
    if (zone.type === 'laundry_commercial' && defaults.laundry_equipment) {
      const washers = zone.fixtures.washingMachines || 0
      const dryers = zone.fixtures.dryers || 0
      const dryerType = zone.subType === 'gas' ? 'gas' : 'electric'
      const laundryLoads = calculateLaundryLoads(washers, dryers, dryerType, zone.laundryEquipment)
      laundryKW = laundryLoads.washer_kw + (dryerType === 'electric' ? laundryLoads.dryer_kw : 0)
    }
    
    // Total = Rate-based + Line Items + Laundry
    totalKW += lightingKW + receptacleKW + lineItemsKW + laundryKW
  })

  // Apply demand factor
  const totalWithDemand = totalKW * demandFactor

  // Apply contingency
  const totalWithContingency = totalWithDemand * (1 + contingency)
  
  // Add spare capacity
  const totalWithSpare = totalWithContingency * (1 + spareCapacity)
  
  // Convert to kVA (using power factor)
  const totalKVA = totalWithSpare / powerFactor
  
  // Calculate amps at user-configured voltages (3-phase vs single-phase)
  const isPrimaryThreePhase = [208, 480].includes(voltagePrimary)
  const isSecondaryThreePhase = [208, 480].includes(voltageSecondary)
  
  const amps_primary = isPrimaryThreePhase 
    ? (totalKVA * 1000) / (voltagePrimary * Math.sqrt(3))
    : (totalKVA * 1000) / voltagePrimary
    
  const amps_secondary = isSecondaryThreePhase
    ? (totalKVA * 1000) / (voltageSecondary * Math.sqrt(3))
    : (totalKVA * 1000) / voltageSecondary
  
  // Get standard service size (upsize to next standard)
  const calculatedAmps = Math.round(amps_primary)
  const standardServiceAmps = getStandardServiceSize(calculatedAmps, voltagePrimary)
  const exceedsMax = exceedsMaxServiceSize(calculatedAmps, voltagePrimary)
  
  // Determine phase string
  const phaseStr = isPrimaryThreePhase ? '3PH' : '1PH'
  const wireStr = isPrimaryThreePhase ? '4W' : '3W'
  
  // Format recommended service string
  let recommendedService = `${standardServiceAmps}A @ ${voltagePrimary}V/${phaseStr}, ${wireStr}`
  if (exceedsMax) {
    recommendedService = `${standardServiceAmps}A+ @ ${voltagePrimary}V/${phaseStr} (EXCEEDS STANDARD - consider parallel services)`
  }
  
  // Estimate panel count based on load
  const panelCount = Math.max(Math.ceil(totalKVA / 200) + 2, 4)

  return {
    totalKW: Math.round(totalKW),
    totalKVA: Math.round(totalKVA),
    amps_480v: Math.round(voltageSecondary === 480 ? amps_secondary : amps_primary),
    amps_208v: Math.round(voltagePrimary === 208 ? amps_primary : amps_secondary),
    recommendedService,
    panelCount,
    // Additional detailed info
    voltages: { primary: voltagePrimary, secondary: voltageSecondary },
    powerFactor,
    spareCapacity,
    calculatedAmps,
    standardServiceAmps,
    exceedsMaxService: exceedsMax,
  }
}

// Get electrical breakdown by zone - must match calculateElectrical logic!
export function getElectricalBreakdown(zones: Zone[]): { zoneName: string; kW: number; description: string }[] {
  return zones.map(zone => {
    const defaults = getZoneDefaults(zone.type)
    const lightingKW = zone.sf * zone.rates.lighting_w_sf / 1000
    const receptacleKW = zone.sf * zone.rates.receptacle_va_sf / 1000
    let fixedKW = zone.processLoads?.fixed_kw ?? defaults.fixed_kw ?? 0
    
    // Include laundry equipment loads - same logic as main calculation
    let laundryKW = 0
    if (zone.type === 'laundry_commercial' && defaults.laundry_equipment) {
      const washers = zone.fixtures.washingMachines || 0
      const dryers = zone.fixtures.dryers || 0
      const dryerType = zone.subType === 'gas' ? 'gas' : 'electric'
      const laundryLoads = calculateLaundryLoads(washers, dryers, dryerType, zone.laundryEquipment)
      laundryKW = laundryLoads.washer_kw + (dryerType === 'electric' ? laundryLoads.dryer_kw : 0)
    }
    
    const lineItemsKW = zone.lineItems
      .filter(li => li.category === 'lighting' || li.category === 'power')
      .reduce((sum, li) => li.unit === 'kW' ? sum + li.quantity * li.value : sum + (li.quantity * li.value) / 1000, 0)
    
    const totalKW = lightingKW + receptacleKW + fixedKW + laundryKW + lineItemsKW
    
    // Build description
    let desc = `${zone.sf.toLocaleString()} SF @ ${zone.rates.lighting_w_sf} W/SF + ${zone.rates.receptacle_va_sf} VA/SF`
    if (fixedKW > 0) desc += ` + ${fixedKW} kW equip`
    if (laundryKW > 0) desc += ` + ${laundryKW.toFixed(1)} kW laundry`
    
    return {
      zoneName: zone.name,
      kW: Math.round(totalKW * 10) / 10,
      description: desc,
    }
  })
}
