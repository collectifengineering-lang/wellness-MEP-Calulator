// =========================================== 
// HYDRONIC PDF EXPORT
// Export pump schedule to PDF document
// =========================================== 

import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import type { HydronicSystem, HydronicPipeSection, HydronicCalculationResult } from '../types/hydronic'
import { getPipeMaterial } from '../data/pipeData'
import { getFluidDisplayName } from '../data/fluidProperties'
import { headToPsi, calculatePumpBhp } from '../calculations/hydronic'

// Initialize pdfmake fonts
// @ts-expect-error pdfmake vfs typing issue
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.default?.pdfMake?.vfs || pdfFonts

export async function exportHydronicToPdf(
  system: HydronicSystem,
  _sections: HydronicPipeSection[], // eslint-disable-line @typescript-eslint/no-unused-vars
  result: HydronicCalculationResult,
  projectName?: string
): Promise<void> {
  const estimatedBhp = calculatePumpBhp(
    result.maxFlowGpm,
    result.totalPumpHeadFt,
    result.fluidProperties.specificGravity
  )
  const totalHeadPsi = headToPsi(result.totalPumpHeadFt, result.fluidProperties.specificGravity)
  
  const content: Content[] = [
    // Title
    { text: 'PUMP SCHEDULE', style: 'title' },
    { text: system.name, style: 'subtitle' },
    { text: projectName ? `Project: ${projectName}` : '', style: 'projectName' },
    { text: `Generated: ${new Date().toLocaleDateString()}`, style: 'date' },
    { text: '', margin: [0, 15, 0, 0] },
    
    // Pump Requirements Box
    {
      table: {
        widths: ['*', '*'],
        body: [
          [
            { text: 'PUMP REQUIREMENTS', style: 'sectionHeader', colSpan: 2, fillColor: '#2563eb' },
            {},
          ],
          [
            { text: 'Total Pump Head', style: 'label' },
            { text: `${result.totalPumpHeadFt.toFixed(1)} ft WC (${totalHeadPsi.toFixed(1)} psi)`, style: 'valueHighlight' },
          ],
          [
            { text: 'Max Flow Rate', style: 'label' },
            { text: `${result.maxFlowGpm.toFixed(0)} GPM`, style: 'valueBold' },
          ],
          [
            { text: 'Estimated BHP', style: 'label' },
            { text: `${estimatedBhp.toFixed(2)} HP`, style: 'value' },
          ],
          [
            { text: 'System Type', style: 'label' },
            { text: system.systemType === 'closed' ? 'Closed Loop' : 'Open Loop', style: 'value' },
          ],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 15],
    },
    
    // Head Breakdown
    {
      table: {
        widths: ['*', 100],
        body: [
          [
            { text: 'HEAD BREAKDOWN', style: 'sectionHeader', colSpan: 2, fillColor: '#374151' },
            {},
          ],
          [
            { text: 'Pipe Friction Loss', style: 'label' },
            { text: `${result.totalPipeFrictionFt.toFixed(2)} ft`, style: 'value', alignment: 'right' },
          ],
          [
            { text: 'Fittings & Devices Loss', style: 'label' },
            { text: `${result.totalFittingsLossFt.toFixed(2)} ft`, style: 'value', alignment: 'right' },
          ],
          ...(result.staticHeadFt > 0 ? [[
            { text: 'Static Head', style: 'label' },
            { text: `${result.staticHeadFt.toFixed(2)} ft`, style: 'value', alignment: 'right' },
          ] as TableCell[]] : []),
          [
            { text: 'Subtotal', style: 'label' },
            { text: `${result.calculatedHeadFt.toFixed(2)} ft`, style: 'value', alignment: 'right' },
          ],
          [
            { text: `Safety Factor (${result.safetyFactorPercent.toFixed(0)}%)`, style: 'label' },
            { text: `+${result.safetyFactorFt.toFixed(2)} ft`, style: 'value', alignment: 'right' },
          ],
          [
            { text: 'TOTAL', style: 'labelBold' },
            { text: `${result.totalPumpHeadFt.toFixed(1)} ft`, style: 'valueBold', alignment: 'right' },
          ],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 15],
    },
    
    // Fluid Properties
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            { text: 'FLUID PROPERTIES', style: 'sectionHeader', colSpan: 4, fillColor: '#374151' },
            {}, {}, {},
          ],
          [
            { text: 'Fluid', style: 'smallLabel' },
            { text: getFluidDisplayName(result.fluidType) + (result.glycolConcentration > 0 ? ` (${result.glycolConcentration}%)` : ''), style: 'smallValue' },
            { text: 'Temperature', style: 'smallLabel' },
            { text: `${result.fluidTemp}°F`, style: 'smallValue' },
          ],
          [
            { text: 'Density', style: 'smallLabel' },
            { text: `${result.fluidProperties.densityLbFt3.toFixed(2)} lb/ft³`, style: 'smallValue' },
            { text: 'Viscosity', style: 'smallLabel' },
            { text: `${result.fluidProperties.viscosityCp.toFixed(3)} cP`, style: 'smallValue' },
          ],
          [
            { text: 'Specific Gravity', style: 'smallLabel' },
            { text: result.fluidProperties.specificGravity.toFixed(3), style: 'smallValue' },
            { text: 'System Volume', style: 'smallLabel' },
            { text: `${result.totalSystemVolumeGal.toFixed(1)} gal`, style: 'smallValue' },
          ],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 15],
    },
    
    // Pipe Sections Table
    { text: 'PIPE SECTIONS', style: 'sectionHeaderText', margin: [0, 10, 0, 5] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 45, 75, 35, 45, 45, 55],
        body: [
          [
            { text: 'Section', style: 'tableHeader' },
            { text: 'Flow', style: 'tableHeader' },
            { text: 'Material', style: 'tableHeader' },
            { text: 'Size', style: 'tableHeader' },
            { text: 'Length', style: 'tableHeader' },
            { text: 'Velocity', style: 'tableHeader' },
            { text: 'Loss', style: 'tableHeader' },
          ],
          ...result.sections.map(s => [
            { text: s.sectionName, style: 'tableCell' },
            { text: `${s.flowGpm}`, style: 'tableCell', alignment: 'center' },
            { text: getPipeMaterial(s.pipeMaterial)?.displayName || s.pipeMaterial, style: 'tableCell', fontSize: 7 },
            { text: `${s.pipeSize}"`, style: 'tableCell', alignment: 'center' },
            { text: `${s.lengthFt} ft`, style: 'tableCell', alignment: 'center' },
            { text: `${s.velocityFps.toFixed(1)} fps`, style: 'tableCell', alignment: 'center' },
            { text: `${s.totalSectionLossFt.toFixed(2)} ft`, style: 'tableCell', alignment: 'right' },
          ] as TableCell[]),
        ],
      },
      layout: {
        fillColor: (rowIndex: number) => rowIndex === 0 ? '#4b5563' : (rowIndex % 2 === 0 ? '#f9fafb' : null),
      },
    },
    
    // Warnings
    ...(result.warnings.length > 0 ? [
      { text: 'WARNINGS', style: 'warningHeader', margin: [0, 20, 0, 5] },
      {
        ul: result.warnings,
        style: 'warningText',
      },
    ] as Content[] : []),
  ]
  
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 40],
    content,
    styles: {
      title: {
        fontSize: 18,
        bold: true,
        color: '#1f2937',
        margin: [0, 0, 0, 2],
      },
      subtitle: {
        fontSize: 14,
        color: '#4b5563',
        margin: [0, 0, 0, 2],
      },
      projectName: {
        fontSize: 10,
        color: '#6b7280',
      },
      date: {
        fontSize: 9,
        color: '#9ca3af',
      },
      sectionHeader: {
        fontSize: 10,
        bold: true,
        color: '#ffffff',
        margin: [5, 5, 5, 5],
      },
      sectionHeaderText: {
        fontSize: 11,
        bold: true,
        color: '#374151',
      },
      label: {
        fontSize: 10,
        color: '#4b5563',
        margin: [5, 4, 5, 4],
      },
      labelBold: {
        fontSize: 10,
        bold: true,
        color: '#1f2937',
        margin: [5, 4, 5, 4],
      },
      value: {
        fontSize: 10,
        color: '#1f2937',
        margin: [5, 4, 5, 4],
      },
      valueBold: {
        fontSize: 10,
        bold: true,
        color: '#1f2937',
        margin: [5, 4, 5, 4],
      },
      valueHighlight: {
        fontSize: 12,
        bold: true,
        color: '#2563eb',
        margin: [5, 4, 5, 4],
      },
      smallLabel: {
        fontSize: 8,
        color: '#6b7280',
        margin: [3, 2, 3, 2],
      },
      smallValue: {
        fontSize: 9,
        color: '#1f2937',
        margin: [3, 2, 3, 2],
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        color: '#ffffff',
        margin: [3, 4, 3, 4],
      },
      tableCell: {
        fontSize: 8,
        color: '#374151',
        margin: [3, 3, 3, 3],
      },
      warningHeader: {
        fontSize: 10,
        bold: true,
        color: '#d97706',
      },
      warningText: {
        fontSize: 9,
        color: '#92400e',
      },
    },
    defaultStyle: {
      fontSize: 10,
    },
  }
  
  const filename = `${system.name.replace(/[^a-z0-9]/gi, '_')}_Pump_Schedule.pdf`
  pdfMake.createPdf(docDefinition).download(filename)
}
