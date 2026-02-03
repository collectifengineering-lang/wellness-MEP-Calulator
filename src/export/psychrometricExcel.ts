// =========================================== 
// PSYCHROMETRIC EXCEL EXPORT
// Export psychrometric calculations to Excel
// =========================================== 

import * as XLSX from 'xlsx'
import type {
  PsychrometricSystem,
  PsychrometricPoint,
  StatePointResult,
} from '../types/psychrometric'
import { barometricPressureAtAltitude } from '../data/psychrometricConstants'

export function exportPsychrometricToExcel(
  system: PsychrometricSystem,
  points: PsychrometricPoint[],
  calculatedPoints: Record<string, StatePointResult>
): void {
  const workbook = XLSX.utils.book_new()
  const pressure = barometricPressureAtAltitude(system.altitudeFt)
  
  // =========================================== 
  // Sheet 1: Summary
  // =========================================== 
  const summaryData: (string | number | null)[][] = [
    ['PSYCHROMETRIC ANALYSIS - SUMMARY'],
    [],
    ['Analysis Information'],
    ['Name', system.name],
    ['Generated', new Date().toLocaleDateString()],
    [],
    ['Atmospheric Conditions'],
    ['Altitude', `${system.altitudeFt} ft`],
    ['Barometric Pressure', `${pressure.toFixed(3)} psia`],
    ['Barometric Pressure', `${(pressure * 29.921 / 14.696).toFixed(2)} in.Hg`],
    [],
    ['Unit Settings'],
    ['Temperature Unit', system.tempUnit === 'F' ? 'Fahrenheit' : 'Celsius'],
    ['Humidity Unit', system.humidityUnit === 'grains' ? 'grains/lb' : 'lb/lb'],
  ]
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  
  // =========================================== 
  // Sheet 2: State Points
  // =========================================== 
  const pointsHeader = [
    'Point',
    'Type',
    'Dry Bulb (°F)',
    'Wet Bulb (°F)',
    'Dew Point (°F)',
    'RH (%)',
    'Humidity Ratio (gr/lb)',
    'Humidity Ratio (lb/lb)',
    'Enthalpy (Btu/lb)',
    'Sp. Volume (ft³/lb)',
    'Vapor Pressure (psia)',
    'CFM',
  ]
  
  const pointsData: (string | number)[][] = [pointsHeader]
  
  points.forEach(point => {
    const result = calculatedPoints[point.id]
    if (result) {
      pointsData.push([
        point.pointLabel,
        point.pointType,
        result.dryBulbF.toFixed(2),
        result.wetBulbF.toFixed(2),
        result.dewPointF.toFixed(2),
        result.relativeHumidity.toFixed(2),
        result.humidityRatioGrains.toFixed(2),
        result.humidityRatioLb.toFixed(6),
        result.enthalpyBtuLb.toFixed(2),
        result.specificVolumeFt3Lb.toFixed(4),
        result.vaporPressurePsia.toFixed(4),
        point.cfm || 0,
      ])
    }
  })
  
  const pointsSheet = XLSX.utils.aoa_to_sheet(pointsData)
  pointsSheet['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
    { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(workbook, pointsSheet, 'State Points')
  
  // =========================================== 
  // Sheet 3: Process Analysis (if we have 2+ points)
  // =========================================== 
  if (points.length >= 2) {
    const validPoints = points.filter(p => calculatedPoints[p.id])
    
    if (validPoints.length >= 2) {
      const processData: (string | number)[][] = [
        ['PROCESS ANALYSIS'],
        [],
        ['From Point', 'To Point', 'ΔT (°F)', 'ΔW (gr/lb)', 'Δh (Btu/lb)', 'CFM', 'Total (Btuh)', 'Sensible (Btuh)', 'Latent (Btuh)', 'Tons'],
      ]
      
      for (let i = 0; i < validPoints.length - 1; i++) {
        const fromPoint = validPoints[i]
        const toPoint = validPoints[i + 1]
        const fromResult = calculatedPoints[fromPoint.id]
        const toResult = calculatedPoints[toPoint.id]
        
        const cfm = fromPoint.cfm || 1000
        const avgV = (fromResult.specificVolumeFt3Lb + toResult.specificVolumeFt3Lb) / 2
        const massFlow = (cfm * 60) / avgV
        
        const deltaT = toResult.dryBulbF - fromResult.dryBulbF
        const deltaW = toResult.humidityRatioGrains - fromResult.humidityRatioGrains
        const deltaH = toResult.enthalpyBtuLb - fromResult.enthalpyBtuLb
        
        const totalBtuh = massFlow * deltaH
        const avgW = (fromResult.humidityRatioLb + toResult.humidityRatioLb) / 2
        const cpMoist = 0.240 + 0.444 * avgW
        const sensibleBtuh = massFlow * cpMoist * deltaT
        const latentBtuh = totalBtuh - sensibleBtuh
        const tons = totalBtuh / 12000
        
        processData.push([
          fromPoint.pointLabel,
          toPoint.pointLabel,
          deltaT.toFixed(2),
          deltaW.toFixed(2),
          deltaH.toFixed(2),
          cfm,
          Math.round(totalBtuh),
          Math.round(sensibleBtuh),
          Math.round(latentBtuh),
          tons.toFixed(2),
        ])
      }
      
      const processSheet = XLSX.utils.aoa_to_sheet(processData)
      processSheet['!cols'] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 8 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 8 },
      ]
      XLSX.utils.book_append_sheet(workbook, processSheet, 'Process Analysis')
    }
  }
  
  // =========================================== 
  // Sheet 4: Reference
  // =========================================== 
  const referenceData: (string | number)[][] = [
    ['PSYCHROMETRIC REFERENCE'],
    [],
    ['Constants'],
    ['Standard Air Density', '0.075 lb/ft³'],
    ['Standard Pressure', '14.696 psia'],
    ['Grains per Pound', '7000'],
    [],
    ['Formulas Used'],
    ['Humidity Ratio', 'W = 0.622 × Pw / (P - Pw)'],
    ['Enthalpy', 'h = 0.240×Tdb + W×(1061 + 0.444×Tdb) Btu/lb'],
    ['Specific Volume', 'v = 0.370486×(T+459.67)×(1+1.6078×W)/P ft³/lb'],
    [],
    ['Standard Air Heat Transfer'],
    ['Sensible Heat', 'Qs = 1.08 × CFM × ΔT'],
    ['Total Heat', 'Qt = 4.5 × CFM × Δh'],
    ['Latent Heat', 'QL = 0.68 × CFM × ΔW (grains)'],
  ]
  
  const referenceSheet = XLSX.utils.aoa_to_sheet(referenceData)
  referenceSheet['!cols'] = [{ wch: 20 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(workbook, referenceSheet, 'Reference')
  
  // Generate filename and download
  const filename = `psychrometric_${system.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, filename)
}
