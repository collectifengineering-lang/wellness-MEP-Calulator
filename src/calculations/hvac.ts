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
  let poolChillerTons = 0

  zones.forEach(zone => {
    const defaults = getZoneDefaults(zone.type)
    const processLoads = zone.processLoads || {}
    
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
    
    // 1. RATE-BASED ventilation (per SF)
    if (zone.rates.ventilation_cfm_sf > 0) {
      totalVentCFM += zone.sf * zone.rates.ventilation_cfm_sf
    }
    
    // 2. RATE-BASED exhaust (per SF)
    if (zone.rates.exhaust_cfm_sf > 0) {
      totalExhaustCFM += zone.sf * zone.rates.exhaust_cfm_sf
    }
    
    // 3. FIXTURE-BASED exhaust (toilets, showers)
    if (defaults.exhaust_cfm_toilet) {
      totalExhaustCFM += zone.fixtures.wcs * defaults.exhaust_cfm_toilet
    }
    if (defaults.exhaust_cfm_shower) {
      totalExhaustCFM += zone.fixtures.showers * defaults.exhaust_cfm_shower
    }
    
    // 4. LINE ITEMS - All fixed ventilation/exhaust/dehumidification/cooling equipment!
    if (zone.lineItems && zone.lineItems.length > 0) {
      console.log(`🔧 HVAC calc - Zone "${zone.name}" has ${zone.lineItems.length} line items:`)
      zone.lineItems.forEach(li => {
        console.log(`   - ${li.category}: ${li.name} = ${li.quantity} × ${li.value} ${li.unit}`)
      })
    }
    
    (zone.lineItems || []).forEach(li => {
      const unit = li.unit?.toLowerCase() || ''
      
      if (li.category === 'ventilation' && unit === 'cfm') {
        totalVentCFM += li.quantity * li.value
      }
      if (li.category === 'exhaust' && unit === 'cfm') {
        totalExhaustCFM += li.quantity * li.value
      }
      // Sum up dehumidification from line items (e.g., from pool room calculator)
      if (li.category === 'dehumidification' && (unit === 'lb/hr' || unit === 'lbs/hr')) {
        console.log(`   ✅ Adding dehumidification: ${li.quantity} × ${li.value} = ${li.quantity * li.value} lb/hr`)
        dehumidLbHr += li.quantity * li.value
      }
      // Sum up cooling from line items
      if (li.category === 'cooling' && unit === 'tons') {
        totalTons += li.quantity * li.value
      }
      // Sum up pool chiller from line items (tracked separately for mechanical loads)
      if (li.category === 'pool_chiller' && unit === 'tons') {
        console.log(`   ✅ Adding pool chiller: ${li.quantity} × ${li.value} = ${li.quantity * li.value} tons`)
        poolChillerTons += li.quantity * li.value
        // Pool chiller also counts toward total cooling
        totalTons += li.quantity * li.value
      }
      // Sum up heating from line items
      if (li.category === 'heating' && unit === 'mbh') {
        totalMBH += li.quantity * li.value
      }
    })
    
    // 5. LAUNDRY exhaust (calculated from fixture counts)
    if (zone.type === 'laundry_commercial' && defaults.laundry_equipment && zone.fixtures.dryers > 0) {
      const laundryLoads = calculateLaundryLoads(
        zone.fixtures.washingMachines || 0,
        zone.fixtures.dryers,
        zone.subType === 'gas' ? 'gas' : 'electric',
        zone.laundryEquipment
      )
      totalExhaustCFM += laundryLoads.exhaust_cfm
      totalVentCFM += laundryLoads.exhaust_cfm // MUA = exhaust
    }
    
    // Dehumidification for pool areas - prefer zone's processLoads
    const dehumidCapacity = processLoads.dehumid_lb_hr ?? defaults.dehumidification_lb_hr ?? 0
    if (dehumidCapacity > 0) {
      dehumidLbHr += dehumidCapacity * factors.dehumid
    }
  })

  // Apply contingency
  totalTons *= (1 + contingency)
  totalMBH *= (1 + contingency)
  
  // Estimate RTU count (rough: 1 RTU per 10-15 tons)
  const rtuCount = Math.max(Math.ceil(totalTons / 12), 1)

  console.log(`🔧 HVAC Totals: ${totalTons.toFixed(1)} tons, ${dehumidLbHr} lb/hr dehumid, ${poolChillerTons} pool chiller tons`)
  
  return {
    totalTons: Math.round(totalTons * 10) / 10,
    totalMBH: Math.round(totalMBH * 10) / 10,
    totalVentCFM: Math.round(totalVentCFM),
    totalExhaustCFM: Math.round(totalExhaustCFM),
    dehumidLbHr: Math.round(dehumidLbHr),
    poolChillerTons: Math.round(poolChillerTons * 10) / 10,
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
    const processLoads = zone.processLoads || {}
    
    let tons = 0
    if (zone.rates.cooling_sf_ton > 0) {
      tons = zone.sf / zone.rates.cooling_sf_ton * factors.cooling
      if (defaults.latent_adder) {
        tons *= (1 + defaults.latent_adder)
      }
    }
    
    let ventCFM = zone.sf * zone.rates.ventilation_cfm_sf
    const fixedVentCFM = processLoads.ventilation_cfm ?? defaults.ventilation_cfm ?? 0
    if (fixedVentCFM > 0) ventCFM += fixedVentCFM
    
    let exhaustCFM = zone.sf * zone.rates.exhaust_cfm_sf
    const fixedExhaustCFM = processLoads.exhaust_cfm ?? defaults.exhaust_cfm ?? 0
    if (fixedExhaustCFM > 0) exhaustCFM += fixedExhaustCFM
    if (defaults.exhaust_cfm_toilet) exhaustCFM += zone.fixtures.wcs * defaults.exhaust_cfm_toilet
    if (defaults.exhaust_cfm_shower) exhaustCFM += zone.fixtures.showers * defaults.exhaust_cfm_shower
    
    // Laundry exhaust - uses zone's custom specs
    if (zone.type === 'laundry_commercial' && defaults.laundry_equipment && zone.fixtures.dryers > 0) {
      const laundryLoads = calculateLaundryLoads(
        zone.fixtures.washingMachines || 0, 
        zone.fixtures.dryers, 
        zone.subType === 'gas' ? 'gas' : 'electric',
        zone.laundryEquipment
      )
      exhaustCFM += laundryLoads.exhaust_cfm
      ventCFM += laundryLoads.exhaust_cfm // MUA
    }
    
    const notes: string[] = []
    const dehumidCapacity = processLoads.dehumid_lb_hr ?? defaults.dehumidification_lb_hr ?? 0
    if (dehumidCapacity > 0) {
      notes.push(`Dehumid: ${dehumidCapacity} lb/hr`)
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
    // Show equipment load for thermal zones
    const fixedKW = processLoads.fixed_kw ?? defaults.fixed_kw ?? 0
    if (fixedKW > 0) {
      notes.push(`Equipment: ${fixedKW} kW`)
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
