// =========================================== 
// PSYCHROMETRIC PDF EXPORT
// Export psychrometric calculations to PDF
// =========================================== 

import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import type {
  PsychrometricSystem,
  PsychrometricPoint,
  StatePointResult,
} from '../types/psychrometric'
import { barometricPressureAtAltitude } from '../data/psychrometricConstants'

// Initialize fonts
pdfMake.vfs = pdfFonts.vfs

export function exportPsychrometricToPdf(
  system: PsychrometricSystem,
  points: PsychrometricPoint[],
  calculatedPoints: Record<string, StatePointResult>
): void {
  const pressure = barometricPressureAtAltitude(system.altitudeFt)
  const validPoints = points.filter(p => calculatedPoints[p.id])
  
  // Build document
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [40, 60, 40, 60],
    
    header: {
      columns: [
        { text: 'PSYCHROMETRIC ANALYSIS', style: 'header', margin: [40, 20, 0, 0] },
        { text: new Date().toLocaleDateString(), alignment: 'right', margin: [0, 25, 40, 0], fontSize: 10, color: '#666' },
      ],
    },
    
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: 'center',
      margin: [0, 20, 0, 0],
      fontSize: 9,
      color: '#999',
    }),
    
    content: [
      // Title
      { text: system.name, style: 'title', margin: [0, 0, 0, 20] },
      
      // Atmospheric Conditions
      { text: 'Atmospheric Conditions', style: 'sectionHeader' },
      {
        columns: [
          { width: '50%', text: `Altitude: ${system.altitudeFt} ft` },
          { width: '50%', text: `Barometric Pressure: ${pressure.toFixed(3)} psia (${(pressure * 29.921 / 14.696).toFixed(2)} in.Hg)` },
        ],
        margin: [0, 5, 0, 15],
      },
      
      // State Points Table
      { text: 'State Points', style: 'sectionHeader', margin: [0, 10, 0, 5] },
      buildPointsTable(validPoints, calculatedPoints),
      
      // Process Analysis (if applicable)
      ...(validPoints.length >= 2 ? buildProcessSection(validPoints, calculatedPoints) : []),
      
      // Quick Reference
      { text: 'Quick Reference', style: 'sectionHeader', margin: [0, 20, 0, 5], pageBreak: validPoints.length > 5 ? 'before' : undefined },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [{ text: 'Standard Air Properties', colSpan: 2, style: 'tableHeader' }, {}],
            ['Density', '0.075 lb/ft³'],
            ['Specific Heat (cp)', '0.240 Btu/lb·°F'],
            ['', ''],
            [{ text: 'Heat Transfer Equations', colSpan: 2, style: 'tableHeader' }, {}],
            ['Sensible Heat', 'Qs = 1.08 × CFM × ΔT (Btuh)'],
            ['Total Heat', 'Qt = 4.5 × CFM × Δh (Btuh)'],
            ['Latent Heat', 'QL = 0.68 × CFM × ΔW (Btuh)'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 0],
      },
    ],
    
    styles: {
      header: {
        fontSize: 12,
        bold: true,
        color: '#333',
      },
      title: {
        fontSize: 20,
        bold: true,
        color: '#06b6d4',
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: '#333',
        margin: [0, 10, 0, 5],
      },
      tableHeader: {
        bold: true,
        fillColor: '#f3f4f6',
        color: '#333',
      },
    },
    
    defaultStyle: {
      fontSize: 10,
      color: '#374151',
    },
  }
  
  // Generate and download
  const filename = `psychrometric_${system.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  pdfMake.createPdf(docDefinition).download(filename)
}

function buildPointsTable(
  points: PsychrometricPoint[],
  calculatedPoints: Record<string, StatePointResult>
): Content {
  const headers: TableCell[] = [
    { text: 'Point', style: 'tableHeader' },
    { text: 'DB (°F)', style: 'tableHeader', alignment: 'right' },
    { text: 'WB (°F)', style: 'tableHeader', alignment: 'right' },
    { text: 'DP (°F)', style: 'tableHeader', alignment: 'right' },
    { text: 'RH (%)', style: 'tableHeader', alignment: 'right' },
    { text: 'W (gr/lb)', style: 'tableHeader', alignment: 'right' },
    { text: 'h (Btu/lb)', style: 'tableHeader', alignment: 'right' },
    { text: 'v (ft³/lb)', style: 'tableHeader', alignment: 'right' },
  ]
  
  const body: TableCell[][] = [headers]
  
  points.forEach(point => {
    const result = calculatedPoints[point.id]
    if (result) {
      body.push([
        { text: point.pointLabel, bold: true },
        { text: result.dryBulbF.toFixed(1), alignment: 'right' },
        { text: result.wetBulbF.toFixed(1), alignment: 'right' },
        { text: result.dewPointF.toFixed(1), alignment: 'right' },
        { text: result.relativeHumidity.toFixed(1), alignment: 'right' },
        { text: result.humidityRatioGrains.toFixed(1), alignment: 'right' },
        { text: result.enthalpyBtuLb.toFixed(2), alignment: 'right' },
        { text: result.specificVolumeFt3Lb.toFixed(3), alignment: 'right' },
      ])
    }
  })
  
  return {
    table: {
      headerRows: 1,
      widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 5, 0, 10],
  }
}

function buildProcessSection(
  points: PsychrometricPoint[],
  calculatedPoints: Record<string, StatePointResult>
): Content[] {
  const content: Content[] = [
    { text: 'Process Analysis', style: 'sectionHeader', margin: [0, 15, 0, 5] },
  ]
  
  // Calculate processes between consecutive points
  for (let i = 0; i < points.length - 1; i++) {
    const fromPoint = points[i]
    const toPoint = points[i + 1]
    const fromResult = calculatedPoints[fromPoint.id]
    const toResult = calculatedPoints[toPoint.id]
    
    if (!fromResult || !toResult) continue
    
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
    const shr = totalBtuh !== 0 ? Math.abs(sensibleBtuh / totalBtuh) : 1
    
    const processType = totalBtuh < 0 ? 'Cooling' : 'Heating'
    
    content.push({
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [{ text: `${fromPoint.pointLabel} → ${toPoint.pointLabel} (${processType})`, colSpan: 4, style: 'tableHeader' }, {}, {}, {}],
          ['Total Load:', `${Math.abs(totalBtuh).toLocaleString()} Btuh`, 'Tons:', Math.abs(tons).toFixed(2)],
          ['Sensible:', `${Math.abs(sensibleBtuh).toLocaleString()} Btuh`, 'SHR:', shr.toFixed(3)],
          ['Latent:', `${Math.abs(latentBtuh).toLocaleString()} Btuh`, 'CFM:', cfm.toLocaleString()],
          ['ΔT:', `${deltaT.toFixed(1)} °F`, 'Δh:', `${deltaH.toFixed(2)} Btu/lb`],
          ['ΔW:', `${deltaW.toFixed(1)} gr/lb`, '', ''],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 5, 0, 10],
    })
  }
  
  return content
}
