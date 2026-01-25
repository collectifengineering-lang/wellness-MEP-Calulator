import type { Zone, HVACCalcResult, ClimateType } from '../types'
import { getZoneDefaults, calculateLaundryLoads } from '../data/zoneDefaults'
import { climateFactors } from '../data/defaults'

export function calculateHVAC(zones: Zone[], climate: ClimateType, contingency: number): HVACCalcResult {
  const factors = climateFactors[climate]
  
  let totalTons = 0
  let totalMBH = 0
  let totalVentCFM = 0
  let totalExhaustCFM = 0
  let dehumidLbHr = 0

  zones.forEach(zone => {
    const defaults = getZoneDefaults(zone.type)
    
    // Cooling (SF/ton method)
    if (zone.rates.cooling_sf_ton > 0) {
      let tons = zone.sf / zone.rates.cooling_sf_ton
      
      // Apply latent adder for steam rooms, etc.
      if (defaults.latent_adder) {
        tons *= (1 + defaults.latent_adder)
      }
      
      // Apply climate factor
      tons *= factors.cooling
      
      totalTons += tons
    }
    
    // Heating (BTU/hr/SF)
    if (zone.rates.heating_btuh_sf > 0) {
      const btuhr = zone.sf * zone.rates.heating_btuh_sf * factors.heating
      totalMBH += btuhr / 1000
    }
    
    // Ventilation
    if (zone.rates.ventilation_cfm_sf > 0) {
      totalVentCFM += zone.sf * zone.rates.ventilation_cfm_sf
    }
    // Fixed ventilation CFM (for special zones like mechanical rooms)
    if (defaults.ventilation_cfm) {
      totalVentCFM += defaults.ventilation_cfm
    }
    
    // Exhaust
    if (zone.rates.exhaust_cfm_sf > 0) {
      totalExhaustCFM += zone.sf * zone.rates.exhaust_cfm_sf
    }
    // Fixed exhaust CFM
    if (defaults.exhaust_cfm) {
      totalExhaustCFM += defaults.exhaust_cfm
    }
    // Per-fixture exhaust (toilets, showers)
    if (defaults.exhaust_cfm_toilet) {
      totalExhaustCFM += zone.fixtures.wcs * defaults.exhaust_cfm_toilet
    }
    if (defaults.exhaust_cfm_shower) {
      totalExhaustCFM += zone.fixtures.showers * defaults.exhaust_cfm_shower
    }
    
    // Commercial laundry exhaust (per dryer unit)
    // Huebsch HTT45: 1,200 CFM max airflow per dryer unit
    if (zone.type === 'laundry_commercial' && defaults.laundry_equipment && zone.fixtures.dryers > 0) {
      const laundryLoads = calculateLaundryLoads(
        zone.fixtures.washingMachines || 0,
        zone.fixtures.dryers,
        zone.subType === 'gas' ? 'gas' : 'electric'
      )
      totalExhaustCFM += laundryLoads.exhaust_cfm
      // Make-up air = exhaust (for laundry, MUA should match exhaust)
      totalVentCFM += laundryLoads.exhaust_cfm
    }
    
    // Line items for ventilation/exhaust
    zone.lineItems.forEach(li => {
      if (li.category === 'ventilation' && li.unit === 'CFM') {
        totalVentCFM += li.quantity * li.value
      }
      if (li.category === 'exhaust' && li.unit === 'CFM') {
        totalExhaustCFM += li.quantity * li.value
      }
    })
    
    // Dehumidification for pool areas
    if (defaults.dehumidification_lb_hr) {
      dehumidLbHr += defaults.dehumidification_lb_hr * factors.dehumid
    }
  })

  // Apply contingency
  totalTons *= (1 + contingency)
  totalMBH *= (1 + contingency)
  
  // Estimate RTU count (rough: 1 RTU per 10-15 tons)
  const rtuCount = Math.max(Math.ceil(totalTons / 12), 1)

  return {
    totalTons: Math.round(totalTons * 10) / 10,
    totalMBH: Math.round(totalMBH * 10) / 10,
    totalVentCFM: Math.round(totalVentCFM),
    totalExhaustCFM: Math.round(totalExhaustCFM),
    dehumidLbHr: Math.round(dehumidLbHr),
    rtuCount,
  }
}

// Get HVAC breakdown by zone
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
    
    let tons = 0
    if (zone.rates.cooling_sf_ton > 0) {
      tons = zone.sf / zone.rates.cooling_sf_ton * factors.cooling
      if (defaults.latent_adder) {
        tons *= (1 + defaults.latent_adder)
      }
    }
    
    let ventCFM = zone.sf * zone.rates.ventilation_cfm_sf
    if (defaults.ventilation_cfm) ventCFM += defaults.ventilation_cfm
    
    let exhaustCFM = zone.sf * zone.rates.exhaust_cfm_sf
    if (defaults.exhaust_cfm) exhaustCFM += defaults.exhaust_cfm
    if (defaults.exhaust_cfm_toilet) exhaustCFM += zone.fixtures.wcs * defaults.exhaust_cfm_toilet
    if (defaults.exhaust_cfm_shower) exhaustCFM += zone.fixtures.showers * defaults.exhaust_cfm_shower
    
    // Laundry exhaust
    if (zone.type === 'laundry_commercial' && defaults.laundry_equipment && zone.fixtures.dryers > 0) {
      const laundryLoads = calculateLaundryLoads(zone.fixtures.washingMachines || 0, zone.fixtures.dryers, 'gas')
      exhaustCFM += laundryLoads.exhaust_cfm
      ventCFM += laundryLoads.exhaust_cfm // MUA
    }
    
    const notes: string[] = []
    if (defaults.dehumidification_lb_hr) {
      notes.push(`Dehumid: ${defaults.dehumidification_lb_hr} lb/hr`)
    }
    if (defaults.requires_type1_hood) {
      notes.push('Type I hood required')
    }
    if (defaults.mau_cfm) {
      notes.push(`MAU: ${defaults.mau_cfm} CFM`)
    }
    if (zone.type === 'laundry_commercial' && zone.fixtures.dryers > 0) {
      notes.push(`${zone.fixtures.dryers} dryers @ 1,200 CFM each`)
    }
    if (defaults.requires_standby_power) {
      notes.push('Standby power required')
    }
    
    return {
      zoneName: zone.name,
      tons: Math.round(tons * 10) / 10,
      ventCFM: Math.round(ventCFM),
      exhaustCFM: Math.round(exhaustCFM),
      notes: notes.join(', '),
    }
  })
}
