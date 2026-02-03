import { useMemo } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { calculateElectrical, getElectricalBreakdown, recalculateServiceWithMechanical } from '../calculations/electrical'
import { calculateHVAC, getHVACBreakdown } from '../calculations/hvac'
import { calculateGas } from '../calculations/gas'
import { calculateDHW } from '../calculations/dhw'
import { calculatePlumbing } from '../calculations/plumbing'
import { calculateMechanicalKVA } from '../components/central-plant/MechanicalLoads'
import { getDefaultMechanicalSettings } from '../data/defaults'
import type { CalculationResults, ZoneFixtures } from '../types'

export function useCalculations() {
  const { currentProject, zones, getAggregatedFixtures } = useProjectStore()
  const { electrical: electricalSettings, gas: gasSettings, dhw: dhwSettings, plumbing: plumbingSettings } = useSettingsStore()

  // Debug: Track total line items to force re-calc when they change
  const totalLineItems = zones.reduce((sum, z) => sum + (z.lineItems?.length || 0), 0)
  const lineItemsHash = zones.map(z => `${z.id}:${z.lineItems?.length || 0}`).join(',')

  return useMemo(() => {
    console.log(`📊 useCalculations running - ${zones.length} zones, ${totalLineItems} total line items`)
    console.log(`   Line items per zone: ${zones.map(z => `${z.name}(${z.lineItems?.length || 0})`).join(', ')}`)
    
    if (!currentProject) {
      return {
        results: null,
        aggregatedFixtures: {
          showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0
        } as ZoneFixtures,
        electricalBreakdown: [],
        hvacBreakdown: [],
        mechanicalKVA: { total: 0, breakdown: [] },
        totalSF: 0,
        settings: { electrical: electricalSettings, gas: gasSettings, dhw: dhwSettings, plumbing: plumbingSettings }
      }
    }

    const contingency = currentProject.contingency
    const climate = currentProject.climate
    const aggregatedFixtures = getAggregatedFixtures()
    const totalSF = zones.reduce((sum, z) => sum + z.sf, 0)

    // Check if there are commercial laundry zones (for plumbing calcs)
    const hasCommercialLaundry = zones.some(z => z.type === 'laundry_commercial')

    // Merge global settings with project-level overrides for electrical
    const projectElectrical = currentProject.electricalSettings
    const mergedElectricalSettings = {
      ...electricalSettings,
      voltage_primary: projectElectrical.voltage,
      voltage_secondary: projectElectrical.voltage === 208 ? 480 : 208,
      power_factor: projectElectrical.powerFactor,
      spare_capacity: projectElectrical.spareCapacity,
      demand_factor: projectElectrical.demandFactor,
    }

    // Get fixture overrides from project
    const fixtureOverrides = currentProject.fixtureOverrides
    
    // Debug: Log fixture overrides
    if (fixtureOverrides && fixtureOverrides.length > 0) {
      console.log(`🔧 useCalculations: ${fixtureOverrides.length} fixture overrides active:`, 
        fixtureOverrides.map(o => `${o.fixtureId}: wsfuCold=${o.wsfuCold}, wsfuHot=${o.wsfuHot}`))
    }

    // Run all calculations with merged settings
    const electrical = calculateElectrical(zones, contingency, { settings: mergedElectricalSettings })
    const hvac = calculateHVAC(zones, climate, contingency)
    const gas = calculateGas(zones, contingency)
    const dhw = calculateDHW(aggregatedFixtures, currentProject.dhwSettings, contingency, fixtureOverrides)
    const plumbing = calculatePlumbing(aggregatedFixtures, { 
      useCommercialLaundry: hasCommercialLaundry,
      coldWaterVelocityFPS: plumbingSettings.cold_water_velocity_fps,
      hotWaterVelocityFPS: plumbingSettings.hot_water_velocity_fps,
      hotWaterFlowRatio: plumbingSettings.hot_water_flow_ratio,
      useCalculatedHWRatio: plumbingSettings.use_calculated_hw_ratio ?? true,
      fixtureOverrides,
    })

    // Add DHW gas load to total gas if using gas heaters
    if (currentProject.dhwSettings.heaterType === 'gas') {
      gas.totalCFH += dhw.gasCFH
      gas.totalMBH += Math.round(dhw.grossBTU / 1000)
      gas.equipmentBreakdown.unshift({
        name: 'Domestic Hot Water - Tankless Heaters',
        mbh: Math.round(dhw.grossBTU / 1000),
        cfh: dhw.gasCFH,
      })
    }

    // Get detailed breakdowns
    const electricalBreakdown = getElectricalBreakdown(zones)
    const hvacBreakdown = getHVACBreakdown(zones, climate)

    // Calculate mechanical equipment electrical loads
    const mechanicalSettings = currentProject.mechanicalSettings || getDefaultMechanicalSettings()
    const mechanicalKVA = calculateMechanicalKVA(
      hvac,
      dhw,
      mechanicalSettings,
      currentProject.dhwSettings.heaterType,
      projectElectrical.powerFactor,
      currentProject.electricPrimary
    )
    
    // Add gas heating load to gas totals if using gas heating (RTU/Boiler)
    if (mechanicalKVA.gasHeating.isGasHeating && mechanicalKVA.gasHeating.consumedMBH > 0) {
      gas.totalCFH += mechanicalKVA.gasHeating.consumedCFH
      gas.totalMBH += mechanicalKVA.gasHeating.consumedMBH
      gas.equipmentBreakdown.unshift({
        name: `Central Heating (Gas RTU/Boiler @ ${Math.round(mechanicalKVA.gasHeating.efficiency * 100)}% eff.)`,
        mbh: mechanicalKVA.gasHeating.consumedMBH,
        cfh: mechanicalKVA.gasHeating.consumedCFH,
      })
    }
    
    // Recalculate electrical with mechanical loads included
    // Pass demand factor and spare capacity so mechanical loads are treated the same as building loads
    const electricalWithMechanical = recalculateServiceWithMechanical(
      electrical,
      mechanicalKVA.total,
      projectElectrical.voltage,
      projectElectrical.demandFactor,
      projectElectrical.spareCapacity
    )
    
    const results: CalculationResults = {
      electrical: electricalWithMechanical,
      hvac,
      gas,
      dhw,
      plumbing,
    }
    
    console.log(`📊 HVAC Results: ${hvac.totalTons} tons, ${hvac.dehumidLbHr} lb/hr dehumid, ${hvac.poolChillerTons} pool chiller tons`)
    console.log(`📊 Electrical: ${electrical.totalKVA} kVA building + ${mechanicalKVA.total.toFixed(1)} kVA mechanical = ${electricalWithMechanical.totalKVA} kVA total`)

    return {
      results,
      aggregatedFixtures,
      electricalBreakdown,
      hvacBreakdown,
      mechanicalKVA,
      totalSF,
      settings: { electrical: electricalSettings, gas: gasSettings, dhw: dhwSettings, plumbing: plumbingSettings }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject, zones, totalLineItems, lineItemsHash, getAggregatedFixtures, electricalSettings, gasSettings, dhwSettings, plumbingSettings])
}
