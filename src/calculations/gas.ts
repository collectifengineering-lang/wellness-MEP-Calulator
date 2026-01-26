import type { Zone, GasCalcResult } from '../types'
import { getZoneDefaults, calculateLaundryLoads } from '../data/zoneDefaults'
import { gasDefaults } from '../data/defaults'
import { getLegacyFixtureCounts } from '../data/fixtureUtils'

export function calculateGas(zones: Zone[], contingency: number): GasCalcResult {
  let totalMBH = 0
  const equipmentBreakdown: { name: string; mbh: number; cfh: number }[] = []

  zones.forEach(zone => {
    const defaults = getZoneDefaults(zone.type)
    
    // 1. LINE ITEMS - ALL gas equipment should be here now!
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
        if (mbh > 0) {
          totalMBH += mbh
          equipmentBreakdown.push({
            name: `${zone.name} - ${li.name}`,
            mbh: Math.round(mbh),
            cfh: Math.round(mbh),
          })
        }
      })
    
    // 2. LAUNDRY GAS DRYERS (calculated from fixture counts)
    // Only add if no dryer line items already exist (avoid double-counting)
    const hasDryerLineItem = zone.lineItems.some(li => 
      li.category === 'gas' && li.name.toLowerCase().includes('dryer')
    )
    const legacyFixtures = getLegacyFixtureCounts(zone.fixtures)
    if (zone.type === 'laundry_commercial' && defaults.laundry_equipment && legacyFixtures.dryers > 0 && zone.subType === 'gas' && !hasDryerLineItem) {
      const laundryLoads = calculateLaundryLoads(
        legacyFixtures.washingMachines || 0,
        legacyFixtures.dryers,
        'gas',
        zone.laundryEquipment
      )
      if (laundryLoads.dryer_gas_mbh > 0) {
        totalMBH += laundryLoads.dryer_gas_mbh
        const pockets = legacyFixtures.dryers * 2
        const mbhPerPocket = zone.laundryEquipment?.dryer_gas_mbh ?? 95
        equipmentBreakdown.push({
          name: `${zone.name} - Gas Dryers (${legacyFixtures.dryers} units, ${pockets} pockets @ ${mbhPerPocket} MBH each)`,
          mbh: laundryLoads.dryer_gas_mbh,
          cfh: laundryLoads.total_gas_cfh,
        })
      }
    }
    
    // 3. COMMERCIAL KITCHEN (rate-based, for zones without line items)
    if (defaults.gas_mbh_per_sf && zone.subType === 'gas') {
      // Only add if no kitchen line items already exist
      const hasKitchenLineItem = zone.lineItems.some(li => li.category === 'gas' && li.name.toLowerCase().includes('kitchen'))
      if (!hasKitchenLineItem) {
        const kitchenMBH = defaults.gas_mbh_per_sf * zone.sf
        totalMBH += kitchenMBH
        equipmentBreakdown.push({
          name: `${zone.name} - Kitchen Equipment`,
          mbh: Math.round(kitchenMBH),
          cfh: Math.round(kitchenMBH),
        })
      }
    }
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
