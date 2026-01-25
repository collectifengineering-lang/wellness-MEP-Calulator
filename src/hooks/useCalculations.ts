import { useMemo } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { calculateElectrical, getElectricalBreakdown } from '../calculations/electrical'
import { calculateHVAC, getHVACBreakdown } from '../calculations/hvac'
import { calculateGas } from '../calculations/gas'
import { calculateDHW } from '../calculations/dhw'
import { calculatePlumbing } from '../calculations/plumbing'
import type { CalculationResults, ZoneFixtures } from '../types'

export function useCalculations() {
  const { currentProject, zones, getAggregatedFixtures } = useProjectStore()
  const { electrical: electricalSettings, gas: gasSettings, dhw: dhwSettings, plumbing: plumbingSettings } = useSettingsStore()

  return useMemo(() => {
    if (!currentProject) {
      return {
        results: null,
        aggregatedFixtures: {
          showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0
        } as ZoneFixtures,
        electricalBreakdown: [],
        hvacBreakdown: [],
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

    // Run all calculations with merged settings
    const electrical = calculateElectrical(zones, contingency, { settings: mergedElectricalSettings })
    const hvac = calculateHVAC(zones, climate, contingency)
    const gas = calculateGas(zones, contingency)
    const dhw = calculateDHW(aggregatedFixtures, currentProject.dhwSettings, contingency)
    const plumbing = calculatePlumbing(aggregatedFixtures, { useCommercialLaundry: hasCommercialLaundry })

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

    const results: CalculationResults = {
      electrical,
      hvac,
      gas,
      dhw,
      plumbing,
    }

    return {
      results,
      aggregatedFixtures,
      electricalBreakdown,
      hvacBreakdown,
      totalSF,
      settings: { electrical: electricalSettings, gas: gasSettings, dhw: dhwSettings, plumbing: plumbingSettings }
    }
  }, [currentProject, zones, getAggregatedFixtures, electricalSettings, gasSettings, dhwSettings, plumbingSettings])
}
