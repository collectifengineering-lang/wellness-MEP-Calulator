import type { Zone, ElectricalCalcResult } from '../types'
import { electricalDefaults, getStandardServiceSize, exceedsMaxServiceSize } from '../data/defaults'
import type { ElectricalSettings } from '../store/useSettingsStore'

export interface ElectricalCalcOptions {
  settings?: Partial<ElectricalSettings>
}

export function calculateElectrical(
  zones: Zone[], 
  _contingency: number, // Unused - electrical uses spare capacity instead of contingency
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
    // Rate-based loads (per SF)
    const lightingKW = zone.sf * zone.rates.lighting_w_sf / 1000
    const receptacleKW = zone.sf * zone.rates.receptacle_va_sf / 1000
    
    // Equipment kW from LINE ITEMS ONLY - NO FALLBACKS
    const lineItemsKW = (zone.lineItems || []).reduce((sum, li) => {
      const unit = li.unit?.toLowerCase() || ''
      if (unit === 'kw') return sum + li.quantity * li.value
      if (unit === 'w') return sum + (li.quantity * li.value) / 1000
      if (unit === 'hp') return sum + li.quantity * li.value * 0.746
      return sum
    }, 0)
    
    // Total = Rate-based + Line Items ONLY
    totalKW += lightingKW + receptacleKW + lineItemsKW
  })

  // Apply demand factor
  const totalWithDemand = totalKW * demandFactor

  // NOTE: Contingency is NOT applied to electrical - use spare capacity only
  // Contingency was previously: totalWithDemand * (1 + contingency)
  // This is intentional per user request - electrical sizing uses spare capacity for growth
  
  // Add spare capacity (design factor for future growth)
  const totalWithSpare = totalWithDemand * (1 + spareCapacity)
  
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
    const lightingKW = zone.sf * zone.rates.lighting_w_sf / 1000
    const receptacleKW = zone.sf * zone.rates.receptacle_va_sf / 1000
    
    // Equipment kW from LINE ITEMS ONLY - NO FALLBACKS
    const lineItemsKW = (zone.lineItems || []).reduce((sum, li) => {
      const unit = li.unit?.toLowerCase() || ''
      if (unit === 'kw') return sum + li.quantity * li.value
      if (unit === 'w') return sum + (li.quantity * li.value) / 1000
      if (unit === 'hp') return sum + li.quantity * li.value * 0.746
      return sum
    }, 0)
    
    const totalKW = lightingKW + receptacleKW + lineItemsKW
    
    // Build description
    let desc = `${zone.sf.toLocaleString()} SF @ ${zone.rates.lighting_w_sf} W/SF + ${zone.rates.receptacle_va_sf} VA/SF`
    if (lineItemsKW > 0) desc += ` + ${lineItemsKW.toFixed(1)} kW equipment`
    
    return {
      zoneName: zone.name,
      kW: Math.round(totalKW * 10) / 10,
      description: desc,
    }
  })
}

// Recalculate service sizing with additional mechanical loads
export function recalculateServiceWithMechanical(
  baseElectrical: ElectricalCalcResult,
  additionalKVA: number,
  voltagePrimary: number = 208,
  demandFactor: number = 1.0,
  spareCapacity: number = 0.15
): ElectricalCalcResult {
  // IMPORTANT: baseElectrical.totalKVA already has demand factor, contingency, and spare applied
  // We need to apply the SAME factors to the mechanical kVA for consistency
  
  // Apply demand factor and spare capacity to mechanical load (same as building load)
  const mechanicalWithDemand = additionalKVA * demandFactor
  const mechanicalWithSpare = mechanicalWithDemand * (1 + spareCapacity)
  
  const totalKVA = baseElectrical.totalKVA + mechanicalWithSpare
  
  // Calculate amps at primary voltage (3-phase)
  const isPrimaryThreePhase = [208, 480].includes(voltagePrimary)
  const amps_primary = isPrimaryThreePhase 
    ? (totalKVA * 1000) / (voltagePrimary * Math.sqrt(3))
    : (totalKVA * 1000) / voltagePrimary
    
  // Get secondary voltage
  const voltageSecondary = voltagePrimary === 208 ? 480 : 208
  const isSecondaryThreePhase = [208, 480].includes(voltageSecondary)
  const amps_secondary = isSecondaryThreePhase
    ? (totalKVA * 1000) / (voltageSecondary * Math.sqrt(3))
    : (totalKVA * 1000) / voltageSecondary
  
  // Get standard service size
  const calculatedAmps = Math.round(amps_primary)
  const standardServiceAmps = getStandardServiceSize(calculatedAmps, voltagePrimary)
  const exceedsMax = exceedsMaxServiceSize(calculatedAmps, voltagePrimary)
  
  // Format service string
  const phaseStr = isPrimaryThreePhase ? '3PH' : '1PH'
  const wireStr = isPrimaryThreePhase ? '4W' : '3W'
  let recommendedService = `${standardServiceAmps}A @ ${voltagePrimary}V/${phaseStr}, ${wireStr}`
  if (exceedsMax) {
    recommendedService = `${standardServiceAmps}A+ @ ${voltagePrimary}V/${phaseStr} (EXCEEDS STANDARD - consider parallel services)`
  }
  
  // Estimate panel count based on load
  const panelCount = Math.max(Math.ceil(totalKVA / 200) + 2, 4)

  return {
    ...baseElectrical,
    totalKVA: Math.round(totalKVA),
    amps_480v: Math.round(voltageSecondary === 480 ? amps_secondary : amps_primary),
    amps_208v: Math.round(voltagePrimary === 208 ? amps_primary : amps_secondary),
    recommendedService,
    panelCount,
    calculatedAmps,
    standardServiceAmps,
    exceedsMaxService: exceedsMax,
    // Track the mechanical component for transparency
    mechanicalKVA: Math.round(mechanicalWithSpare),
  }
}
