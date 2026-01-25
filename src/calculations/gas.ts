import type { Zone, GasCalcResult } from '../types'
import { getZoneDefaults, calculateLaundryLoads } from '../data/zoneDefaults'
import { gasDefaults } from '../data/defaults'

export function calculateGas(zones: Zone[], contingency: number): GasCalcResult {
  let totalMBH = 0
  const equipmentBreakdown: { name: string; mbh: number; cfh: number }[] = []

  zones.forEach(zone => {
    const defaults = getZoneDefaults(zone.type)
    
    // Only count gas loads for gas sub-type zones (or always-gas equipment)
    if (zone.subType === 'gas' || defaults.pool_heater_gas_mbh) {
      // Fixed gas loads (sauna, banya, etc.)
      if (defaults.gas_mbh) {
        totalMBH += defaults.gas_mbh
        equipmentBreakdown.push({
          name: `${zone.name} - ${defaults.displayName}`,
          mbh: defaults.gas_mbh,
          cfh: defaults.gas_mbh,
        })
      }
      
      // Pool heaters
      if (defaults.pool_heater_gas_mbh) {
        totalMBH += defaults.pool_heater_gas_mbh
        equipmentBreakdown.push({
          name: `${zone.name} - Pool Heater`,
          mbh: defaults.pool_heater_gas_mbh,
          cfh: defaults.pool_heater_gas_mbh,
        })
      }
      
      // Commercial laundry - use detailed equipment specs
      if (zone.type === 'laundry_commercial' && defaults.laundry_equipment && zone.fixtures.dryers > 0) {
        const laundryLoads = calculateLaundryLoads(
          zone.fixtures.washingMachines || 0,
          zone.fixtures.dryers,
          'gas'
        )
        if (laundryLoads.dryer_gas_mbh > 0) {
          totalMBH += laundryLoads.dryer_gas_mbh
          // Stacked dryers = 2 pockets per unit
          const pockets = zone.fixtures.dryers * 2
          equipmentBreakdown.push({
            name: `${zone.name} - Gas Dryers (${zone.fixtures.dryers} units, ${pockets} pockets @ 95 MBH each)`,
            mbh: laundryLoads.dryer_gas_mbh,
            cfh: laundryLoads.total_gas_cfh,
          })
        }
      }
      // Legacy dryer calculation for non-commercial laundry
      else if (defaults.gas_mbh_per_dryer && zone.fixtures.dryers > 0) {
        const dryerMBH = defaults.gas_mbh_per_dryer * zone.fixtures.dryers
        totalMBH += dryerMBH
        equipmentBreakdown.push({
          name: `${zone.name} - Dryers (${zone.fixtures.dryers}x)`,
          mbh: dryerMBH,
          cfh: dryerMBH,
        })
      }
      
      // Commercial kitchen (per SF)
      if (defaults.gas_mbh_per_sf) {
        const kitchenMBH = defaults.gas_mbh_per_sf * zone.sf
        totalMBH += kitchenMBH
        equipmentBreakdown.push({
          name: `${zone.name} - Kitchen Equipment`,
          mbh: Math.round(kitchenMBH),
          cfh: Math.round(kitchenMBH),
        })
      }
    }
    
    // Line items for gas
    zone.lineItems
      .filter(li => li.category === 'gas')
      .forEach(li => {
        let mbh = 0
        if (li.unit === 'MBH' || li.unit === 'MBTU') {
          mbh = li.quantity * li.value
        } else if (li.unit === 'BTU') {
          mbh = (li.quantity * li.value) / 1000
        } else if (li.unit === 'CFH') {
          mbh = li.quantity * li.value // approximate 1 CFH = 1 MBH for nat gas
        }
        totalMBH += mbh
        equipmentBreakdown.push({
          name: `${zone.name} - ${li.name}`,
          mbh: Math.round(mbh),
          cfh: Math.round(mbh),
        })
      })
  })

  // Total CFH (natural gas ~1,000 BTU/CF, so CFH ≈ MBH for convenience)
  const totalCFH = Math.round(totalMBH)
  
  // Apply contingency
  const totalWithContingency = totalCFH * (1 + contingency)
  
  // Determine recommended pressure and pipe size
  let recommendedPressure = `${gasDefaults.min_pressure_wc}" W.C. (Low Pressure)`
  if (totalWithContingency > gasDefaults.high_pressure_threshold_cfh) {
    recommendedPressure = '2 PSI (High Pressure)'
  }
  
  let recommendedPipeSize = '3"'
  for (const threshold of gasDefaults.service_sizing) {
    if (totalWithContingency <= threshold.maxCFH) {
      recommendedPipeSize = threshold.pipeSize
      break
    }
  }

  return {
    totalCFH: Math.round(totalWithContingency),
    totalMBH: Math.round(totalMBH * (1 + contingency)),
    recommendedPressure,
    recommendedPipeSize,
    equipmentBreakdown,
  }
}
