// =========================================== 
// HYDRONIC EXCEL EXPORT
// Export pump calculations to Excel spreadsheet
// =========================================== 

import * as XLSX from 'xlsx'
import type { HydronicSystem, HydronicPipeSection, HydronicCalculationResult } from '../types/hydronic'
import { getPipeMaterial } from '../data/pipeData'
import { getFitting } from '../data/fittingsLibrary'
import { getFluidDisplayName } from '../data/fluidProperties'
import { headToPsi, calculatePumpBhp } from '../calculations/hydronic'

export function exportHydronicToExcel(
  system: HydronicSystem,
  sections: HydronicPipeSection[],
  result: HydronicCalculationResult
): void {
  const workbook = XLSX.utils.book_new()
  
  const estimatedBhp = calculatePumpBhp(
    result.maxFlowGpm,
    result.totalPumpHeadFt,
    result.fluidProperties.specificGravity
  )
  const totalHeadPsi = headToPsi(result.totalPumpHeadFt, result.fluidProperties.specificGravity)
  
  // =========================================== 
  // Sheet 1: Summary
  // =========================================== 
  const summaryData: (string | number | null)[][] = [
    ['HYDRONIC PUMP CALCULATOR - SUMMARY'],
    [],
    ['System Information'],
    ['System Name', system.name],
    ['System Type', system.systemType === 'closed' ? 'Closed Loop' : 'Open Loop'],
    ['Generated', new Date().toLocaleDateString()],
    [],
    ['Fluid Properties'],
    ['Fluid Type', getFluidDisplayName(result.fluidType) + (result.glycolConcentration > 0 ? ` (${result.glycolConcentration}%)` : '')],
    ['Operating Temperature', `${result.fluidTemp}°F`],
    ['Density', `${result.fluidProperties.densityLbFt3.toFixed(2)} lb/ft³`],
    ['Viscosity', `${result.fluidProperties.viscosityCp.toFixed(3)} cP`],
    ['Specific Gravity', result.fluidProperties.specificGravity.toFixed(3)],
    [],
    ['PUMP REQUIREMENTS'],
    ['Max Flow Rate', `${result.maxFlowGpm.toFixed(0)} GPM`],
    ['Total Pump Head', `${result.totalPumpHeadFt.toFixed(1)} ft WC`],
    ['Total Pump Head (psi)', `${totalHeadPsi.toFixed(1)} psi`],
    ['Estimated BHP', `${estimatedBhp.toFixed(2)} HP`],
    [],
    ['HEAD BREAKDOWN'],
    ['Pipe Friction Loss', `${result.totalPipeFrictionFt.toFixed(2)} ft`],
    ['Fittings & Devices Loss', `${result.totalFittingsLossFt.toFixed(2)} ft`],
    ...(result.staticHeadFt > 0 ? [['Static Head', `${result.staticHeadFt.toFixed(2)} ft`]] : []),
    ['Subtotal', `${result.calculatedHeadFt.toFixed(2)} ft`],
    [`Safety Factor (${result.safetyFactorPercent.toFixed(0)}%)`, `+${result.safetyFactorFt.toFixed(2)} ft`],
    ['TOTAL PUMP HEAD', `${result.totalPumpHeadFt.toFixed(1)} ft`],
    [],
    ['System Volume', `${result.totalSystemVolumeGal.toFixed(1)} gallons`],
  ]
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  
  // =========================================== 
  // Sheet 2: Pipe Sections
  // =========================================== 
  const sectionsHeader = [
    'Section Name',
    'Flow (GPM)',
    'Material',
    'Size (in)',
    'Length (ft)',
    'Velocity (fps)',
    'Reynolds #',
    'Friction Factor',
    'Pipe Loss (ft)',
    'Fittings Loss (ft)',
    'Total Loss (ft)',
    'Volume (gal)',
  ]
  
  const sectionsRows = result.sections.map(s => [
    s.sectionName,
    s.flowGpm,
    getPipeMaterial(s.pipeMaterial)?.displayName || s.pipeMaterial,
    s.pipeSize,
    s.lengthFt,
    s.velocityFps.toFixed(2),
    Math.round(s.reynoldsNumber),
    s.frictionFactor.toFixed(5),
    s.pipeFrictionLossFt.toFixed(3),
    s.fittingsLossFt.toFixed(3),
    s.totalSectionLossFt.toFixed(3),
    s.volumeGal.toFixed(2),
  ])
  
  const sectionsData = [sectionsHeader, ...sectionsRows]
  const sectionsSheet = XLSX.utils.aoa_to_sheet(sectionsData)
  sectionsSheet['!cols'] = [
    { wch: 25 }, // Name
    { wch: 10 }, // Flow
    { wch: 18 }, // Material
    { wch: 8 },  // Size
    { wch: 10 }, // Length
    { wch: 10 }, // Velocity
    { wch: 12 }, // Reynolds
    { wch: 12 }, // Friction
    { wch: 12 }, // Pipe Loss
    { wch: 14 }, // Fittings Loss
    { wch: 12 }, // Total Loss
    { wch: 10 }, // Volume
  ]
  XLSX.utils.book_append_sheet(workbook, sectionsSheet, 'Pipe Sections')
  
  // =========================================== 
  // Sheet 3: Fittings Detail
  // =========================================== 
  const fittingsHeader = ['Section', 'Fitting/Device', 'Quantity', 'Cv Override', 'dP Override (ft)']
  const fittingsRows: (string | number | null)[][] = []
  
  sections.forEach(section => {
    section.fittings.forEach(fitting => {
      const fittingData = getFitting(fitting.fittingType)
      fittingsRows.push([
        section.name,
        fittingData?.displayName || fitting.fittingType,
        fitting.quantity,
        fitting.cvOverride ?? null,
        fitting.dpOverrideFt ?? null,
      ])
    })
  })
  
  if (fittingsRows.length > 0) {
    const fittingsData = [fittingsHeader, ...fittingsRows]
    const fittingsSheet = XLSX.utils.aoa_to_sheet(fittingsData)
    fittingsSheet['!cols'] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(workbook, fittingsSheet, 'Fittings Detail')
  }
  
  // =========================================== 
  // Sheet 4: Warnings
  // =========================================== 
  if (result.warnings.length > 0) {
    const warningsData = [
      ['WARNINGS'],
      [],
      ...result.warnings.map(w => [w]),
    ]
    const warningsSheet = XLSX.utils.aoa_to_sheet(warningsData)
    warningsSheet['!cols'] = [{ wch: 80 }]
    XLSX.utils.book_append_sheet(workbook, warningsSheet, 'Warnings')
  }
  
  // Download
  const filename = `${system.name.replace(/[^a-z0-9]/gi, '_')}_Pump_Calc.xlsx`
  XLSX.writeFile(workbook, filename)
}
