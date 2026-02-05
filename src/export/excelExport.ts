import * as XLSX from 'xlsx'
import type { Project, Zone, CalculationResults, ZoneFixtures } from '../types'

export function exportToExcelFile(
  project: Project,
  zones: Zone[],
  results: CalculationResults,
  fixtures: ZoneFixtures
): void {
  const workbook = XLSX.utils.book_new()
  const totalSF = zones.reduce((sum, z) => sum + z.sf, 0)

  // Sheet 1: Project Summary
  const summaryData = [
    ['COLLECTIF GOAT 🐐 - MEP PROJECT SUMMARY'],
    [],
    ['Project Information'],
    ['Project Name', project.name],
    ['Total Square Footage', totalSF],
    ['Climate Zone', project.climate],
    ['Primary Mode', project.electricPrimary ? 'Electric Primary' : 'Gas Primary'],
    ['Contingency', `${(project.contingency * 100).toFixed(0)}%`],
    ['Generated', new Date().toLocaleDateString()],
    [],
    ['UTILITY TOTALS (with contingency)'],
    [],
    ['ELECTRICAL'],
    ['Total Load (kVA)', results.electrical.totalKVA],
    ['Service @ 480V (Amps)', results.electrical.amps_480v],
    ['Service @ 208V (Amps)', results.electrical.amps_208v],
    ['Recommended Service', results.electrical.recommendedService],
    ['Panel Count (est.)', results.electrical.panelCount],
    [],
    ['HVAC'],
    ['Space Cooling (Tons)', results.hvac.totalTons],
    ['Pool Chiller (Tons)', results.hvac.poolChillerTons || 0],
    ['Dehumidification (lb/hr)', results.hvac.dehumidLbHr],
    ['Dehumid Cooling Est. (Tons)', results.hvac.dehumidTons || 0],
    ['Total Plant Cooling (Tons)', results.hvac.totalPlantTons || results.hvac.totalTons],
    ['SF/Ton (Overall)', results.hvac.totalPlantTons > 0 ? Math.round(totalSF / results.hvac.totalPlantTons) : 0],
    ['Heating (MBH)', results.hvac.totalMBH],
    ['Ventilation (CFM)', results.hvac.totalVentCFM],
    ['Exhaust (CFM)', results.hvac.totalExhaustCFM],
    ['RTU Count (est.)', results.hvac.rtuCount],
    [],
    ['GAS'],
    ['Total Load (CFH)', results.gas.totalCFH],
    ['Total Load (MBH)', results.gas.totalMBH],
    ['Recommended Pressure', results.gas.recommendedPressure],
    ['Service Pipe Size', results.gas.recommendedPipeSize],
    [],
    ['PLUMBING'],
    ['Total WSFU', results.plumbing.totalWSFU],
    ['Total DFU', results.plumbing.totalDFU],
    ['Peak Flow (GPM)', results.plumbing.peakGPM],
    ['Water Meter Size', results.plumbing.recommendedMeterSize],
    ['Cold Water Main', results.plumbing.coldWaterMainSize],
    ['Hot Water Main', results.plumbing.hotWaterMainSize],
    ['Building Drain', results.plumbing.recommendedDrainSize],
    [],
    ['DHW'],
    ['Peak Demand (GPH)', results.dhw.peakGPH],
    ['Net BTU/hr', results.dhw.netBTU],
    ['Gross BTU/hr', results.dhw.grossBTU],
    ['Gas Input (CFH)', results.dhw.gasCFH],
    ['Electric Input (kW)', results.dhw.electricKW],
    ['Storage Tank (gal)', results.dhw.storageGallons],
    ['Tankless Units', results.dhw.tanklessUnits],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  // Sheet 2: Zones Detail
  const zonesHeaders = [
    'Zone Name', 'Type', 'Sub-Type', 'SF', 'Showers', 'Lavatories', 'WCs',
    'Floor Drains', 'Lighting W/SF', 'Receptacle VA/SF', 'Vent CFM/SF',
    'Exhaust CFM/SF', 'Cooling SF/Ton', 'Heating BTU/SF', 'Line Items'
  ]
  const zonesData = zones.map(z => [
    z.name,
    z.type,
    z.subType,
    z.sf,
    z.fixtures.showers,
    z.fixtures.lavs,
    z.fixtures.wcs,
    z.fixtures.floorDrains,
    z.rates.lighting_w_sf,
    z.rates.receptacle_va_sf,
    z.rates.ventilation_cfm_sf,
    z.rates.exhaust_cfm_sf,
    z.rates.cooling_sf_ton,
    z.rates.heating_btuh_sf,
    z.lineItems.length,
  ])
  const zonesSheet = XLSX.utils.aoa_to_sheet([zonesHeaders, ...zonesData])
  zonesSheet['!cols'] = zonesHeaders.map((_, i) => ({ wch: i === 0 ? 25 : 12 }))
  XLSX.utils.book_append_sheet(workbook, zonesSheet, 'Zones')

  // Sheet 3: Fixtures
  const fixturesData = [
    ['FIXTURE SUMMARY'],
    [],
    ['Fixture Type', 'Count', 'WSFU Each', 'Total WSFU', 'DFU Each', 'Total DFU'],
    ['Showers', fixtures.showers, 2.5, fixtures.showers * 2.5, 2, fixtures.showers * 2],
    ['Lavatories', fixtures.lavs, 1.5, fixtures.lavs * 1.5, 1, fixtures.lavs],
    ['Water Closets', fixtures.wcs, 5, fixtures.wcs * 5, 4, fixtures.wcs * 4],
    ['Floor Drains', fixtures.floorDrains, 0, 0, 2, fixtures.floorDrains * 2],
    ['Service Sinks', fixtures.serviceSinks, 3, fixtures.serviceSinks * 3, 3, fixtures.serviceSinks * 3],
    ['Washing Machines', fixtures.washingMachines, 4, fixtures.washingMachines * 4, 3, fixtures.washingMachines * 3],
    [],
    ['TOTALS', '', '', results.plumbing.totalWSFU, '', results.plumbing.totalDFU],
  ]
  const fixturesSheet = XLSX.utils.aoa_to_sheet(fixturesData)
  XLSX.utils.book_append_sheet(workbook, fixturesSheet, 'Fixtures')

  // Sheet 4: Gas Equipment
  const gasData = [
    ['GAS EQUIPMENT BREAKDOWN'],
    [],
    ['Equipment', 'MBH', 'CFH'],
    ...results.gas.equipmentBreakdown.map(eq => [eq.name, eq.mbh, eq.cfh]),
    [],
    ['TOTAL', results.gas.totalMBH, results.gas.totalCFH],
  ]
  const gasSheet = XLSX.utils.aoa_to_sheet(gasData)
  gasSheet['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, gasSheet, 'Gas Equipment')

  // Sheet 5: DHW Calculations
  const dhwData = [
    ['DHW CALCULATIONS'],
    [],
    ['PARAMETERS'],
    ['Heater Type', project.dhwSettings.heaterType],
    ['Efficiency', `${(project.dhwSettings.gasEfficiency * 100).toFixed(0)}%`],
    ['Storage Temp (°F)', project.dhwSettings.storageTemp],
    ['Delivery Temp (°F)', project.dhwSettings.deliveryTemp],
    ['Cold Water Temp (°F)', project.dhwSettings.coldWaterTemp],
    ['Peak Duration (hours)', project.dhwSettings.peakDuration],
    [],
    ['RESULTS'],
    ['Peak Demand (GPH)', results.dhw.peakGPH],
    ['Temperature Rise (ΔT)', project.dhwSettings.storageTemp - project.dhwSettings.coldWaterTemp],
    ['Net BTU/hr', results.dhw.netBTU],
    ['Gross BTU/hr (incl. efficiency)', results.dhw.grossBTU],
    ['Gas Input (CFH)', results.dhw.gasCFH],
    ['Electric Input (kW)', results.dhw.electricKW],
    ['Storage Tank (Gallons)', results.dhw.storageGallons],
    ['Tankless Units Required', results.dhw.tanklessUnits],
    [],
    ['FORMULA REFERENCE'],
    ['Net BTU = GPH × 8.33 × ΔT'],
    ['Gross BTU = Net BTU / Efficiency'],
    ['Gas CFH = Gross BTU / 1,000'],
    ['Electric kW = Gross BTU / 3,412'],
  ]
  const dhwSheet = XLSX.utils.aoa_to_sheet(dhwData)
  dhwSheet['!cols'] = [{ wch: 35 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, dhwSheet, 'DHW Calculations')

  // Sheet 6: Line Items
  const allLineItems: (string | number)[][] = [['Zone', 'Category', 'Equipment Name', 'Qty', 'Value', 'Unit']]
  zones.forEach(z => {
    z.lineItems.forEach(li => {
      allLineItems.push([z.name, li.category, li.name, li.quantity, li.value, li.unit])
    })
  })
  if (allLineItems.length > 1) {
    const lineItemsSheet = XLSX.utils.aoa_to_sheet(allLineItems)
    lineItemsSheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 8 }]
    XLSX.utils.book_append_sheet(workbook, lineItemsSheet, 'Line Items')
  }

  // Download
  XLSX.writeFile(workbook, `${project.name || 'MEP-Calculator'}.xlsx`)
}
