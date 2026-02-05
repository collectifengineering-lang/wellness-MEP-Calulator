import type { Zone, HVACCalcResult, ClimateType } from '../types'
import { getZoneDefaults } from '../data/zoneDefaults'
import { climateFactors } from '../data/defaults'

/**
 * DEHUMIDIFICATION TO COOLING TONS CONVERSION
 * 
 * Conservative rule of thumb for pool dehumidifiers:
 * - Latent heat of vaporization: ~1,061 BTU/lb
 * - 1 ton = 12,000 BTU/hr
 * - Base conversion: 1,061 / 12,000 = 0.088 tons per lb/hr
 * - Adding ~35% for sensible reheat and equipment loads = 0.12 tons per lb/hr
 * 
 * This aligns with real equipment specs (e.g., Seresco, Dectron pool dehumidifiers)
 */
export const DEHUMID_TONS_PER_LB_HR = 0.12

/**
 * Calculate HVAC loads from zones
 * 
 * VENTILATION/EXHAUST: Uses stored values ONLY (from VentilationSection or pool calc)
 * NO LEGACY FALLBACKS - if values aren't set, they're 0
 */
export function calculateHVAC(zones: Zone[], climate: ClimateType, contingency: number): HVACCalcResult {
  const factors = climateFactors[climate]
  
  let totalTons = 0
  let totalMBH = 0
  let totalVentCFM = 0
  let totalExhaustCFM = 0
  let dehumidLbHr = 0
  let poolChillerTons = 0

  for (const zone of zones) {
    // Per-zone flag: if THIS zone has a dehumidification line item, skip THIS zone's defaults
    let zoneHasLineItemDehumid = false
    const defaults = getZoneDefaults(zone.type)
    
    // COOLING (SF/ton method)
    if (zone.rates.cooling_sf_ton > 0) {
      let tons = zone.sf / zone.rates.cooling_sf_ton
      if (defaults.latent_adder) tons *= (1 + defaults.latent_adder)
      tons *= factors.cooling
      totalTons += tons
    }
    
    // HEATING (BTU/hr/SF)
    if (zone.rates.heating_btuh_sf > 0) {
      totalMBH += (zone.sf * zone.rates.heating_btuh_sf * factors.heating) / 1000
    }
    
    // VENTILATION/EXHAUST - stored values ONLY, no fallbacks
    const ventVal = zone.ventilationCfm
    const exhVal = zone.exhaustCfm
    if (typeof ventVal === 'number') totalVentCFM += ventVal
    if (typeof exhVal === 'number') totalExhaustCFM += exhVal
    
    // LINE ITEMS - equipment loads
    const items = zone.lineItems || []
    for (const li of items) {
      const unit = (li.unit || '').toLowerCase()
      
      if (li.category === 'ventilation' && unit === 'cfm') {
        totalVentCFM += li.quantity * li.value
      }
      if (li.category === 'exhaust' && unit === 'cfm') {
        totalExhaustCFM += li.quantity * li.value
      }
      if (li.category === 'dehumidification' && (unit === 'lb/hr' || unit === 'lbs/hr')) {
        dehumidLbHr += li.quantity * li.value
        zoneHasLineItemDehumid = true
      }
      if (li.category === 'cooling' && unit === 'tons') {
        totalTons += li.quantity * li.value
      }
      if (li.category === 'pool_chiller' && unit === 'tons') {
        poolChillerTons += li.quantity * li.value
        totalTons += li.quantity * li.value
      }
      if (li.category === 'heating' && unit === 'mbh') {
        totalMBH += li.quantity * li.value
      }
    }
    
    // DEHUMIDIFICATION - line items OR zone defaults (not both)
    if (!zoneHasLineItemDehumid && zone.processLoads) {
      const dehumidCapacity = zone.processLoads.dehumid_lb_hr || 0
      if (dehumidCapacity > 0) {
        dehumidLbHr += dehumidCapacity * factors.dehumid
      }
    }
  }

  // Apply contingency
  totalTons *= (1 + contingency)
  totalMBH *= (1 + contingency)
  
  // Estimate RTU count (rough: 1 RTU per 10-15 tons)
  const rtuCount = Math.max(Math.ceil(totalTons / 12), 1)
  
  // Calculate dehumidification cooling equivalent (conservative estimate)
  const dehumidTons = dehumidLbHr * DEHUMID_TONS_PER_LB_HR
  
  // Total plant cooling = space cooling (which includes pool chiller) + dehumid
  // Note: totalTons already includes poolChillerTons from line items
  const totalPlantTons = totalTons + dehumidTons

  return {
    totalTons: Math.round(totalTons * 10) / 10,
    totalMBH: Math.round(totalMBH * 10) / 10,
    totalVentCFM: Math.round(totalVentCFM),
    totalExhaustCFM: Math.round(totalExhaustCFM),
    dehumidLbHr: Math.round(dehumidLbHr),
    dehumidTons: Math.round(dehumidTons * 10) / 10,
    poolChillerTons: Math.round(poolChillerTons * 10) / 10,
    totalPlantTons: Math.round(totalPlantTons * 10) / 10,
    rtuCount,
  }
}

// Get HVAC breakdown by zone - NO FALLBACKS, stored values only
export function getHVACBreakdown(zones: Zone[], climate: ClimateType): {
  zoneName: string
  tons: number
  ventCFM: number
  exhaustCFM: number
  notes: string
}[] {
  const factors = climateFactors[climate]
  
  return zones.map(zone => {
    const defaults = getZoneDefaults(zone.type)
    
    // COOLING - rate-based only
    let tons = 0
    if (zone.rates.cooling_sf_ton > 0) {
      tons = zone.sf / zone.rates.cooling_sf_ton * factors.cooling
      if (defaults.latent_adder) {
        tons *= (1 + defaults.latent_adder)
      }
    }
    
    // VENTILATION/EXHAUST - stored values ONLY, no fallbacks
    // VentilationSection sets these, pool calc sets these - that's it
    let ventCFM = 0
    let exhaustCFM = 0
    const v = zone.ventilationCfm
    const e = zone.exhaustCfm
    if (typeof v === 'number') ventCFM = v
    if (typeof e === 'number') exhaustCFM = e
    
    // LINE ITEMS - add ventilation/exhaust from equipment line items
    const items = zone.lineItems || []
    for (const li of items) {
      const unit = (li.unit || '').toLowerCase()
      if (li.category === 'ventilation' && unit === 'cfm') {
        ventCFM += li.quantity * li.value
      }
      if (li.category === 'exhaust' && unit === 'cfm') {
        exhaustCFM += li.quantity * li.value
      }
    }
    
    // Build notes
    const notes: string[] = []
    if (zone.ventilationOverride) notes.push('Override')
    else if (zone.ventilationSpaceType) notes.push('ASHRAE')
    
    // Equipment from line items
    let lineItemsKW = 0
    for (const li of items) {
      const unit = (li.unit || '').toLowerCase()
      if (unit === 'kw') lineItemsKW += li.quantity * li.value
    }
    if (lineItemsKW > 0) {
      notes.push(`${lineItemsKW.toFixed(0)} kW equip`)
    }
    
    if (defaults.requires_type1_hood) notes.push('Type I hood')
    if (defaults.requires_standby_power) notes.push('Standby power')
    
    return {
      zoneName: zone.name,
      tons: Math.round(tons * 10) / 10,
      ventCFM: Math.round(ventCFM),
      exhaustCFM: Math.round(exhaustCFM),
      notes: notes.join(', '),
    }
  })
}
