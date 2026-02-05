/**
 * Concept MEP Report Export
 * Professional 2-3 page summary report with logo support
 * Exports to both PDF and Word (docx)
 */

import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import type { Project, Zone, CalculationResults, ZoneFixtures } from '../types'
import { getZoneDefaults } from '../data/zoneDefaults'
import { getLegacyFixtureCounts } from '../data/fixtureUtils'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  Header,
  ImageRun,
} from 'docx'
import { saveAs } from 'file-saver'

// Initialize pdfmake fonts
// @ts-expect-error pdfmake vfs typing issue
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.default?.pdfMake?.vfs || pdfFonts

const climateLabels: Record<string, string> = {
  hot_humid: 'Hot & Humid',
  temperate: 'Temperate',
  cold_dry: 'Cold & Dry',
}

// Store logo for exports
let storedLogoBase64: string | null = null
let storedLogoDataUrl: string | null = null

export function setReportLogo(base64: string | null, dataUrl: string | null) {
  storedLogoBase64 = base64
  storedLogoDataUrl = dataUrl
}

export function getReportLogo() {
  return { base64: storedLogoBase64, dataUrl: storedLogoDataUrl }
}

/**
 * Export Concept Report to PDF
 */
export async function exportConceptPDF(
  project: Project,
  zones: Zone[],
  results: CalculationResults,
  fixtures: ZoneFixtures,
  totalSF: number,
  _includeDetailed?: boolean // Reserved for future detailed appendix
): Promise<void> {
  const legacyFixtures = getLegacyFixtureCounts(fixtures)
  
  // Use project's logo if available, otherwise fall back to stored logo
  const logoUrl = project.reportLogo?.currentLogoUrl || storedLogoDataUrl
  
  // Build header with logo - centered on each page
  const headerContent: Content = logoUrl ? {
    stack: [
      { 
        image: logoUrl, 
        width: 50, 
        alignment: 'center' as const,
        margin: [0, 10, 0, 0] 
      },
      { 
        text: 'MEP Concept Report', 
        style: 'headerText', 
        alignment: 'center' as const,
        margin: [0, 2, 0, 0] 
      },
    ],
  } : {
    stack: [
      { text: 'COLLECTIF Engineering PLLC', style: 'headerText', alignment: 'center' as const, margin: [0, 15, 0, 0] },
      { text: 'MEP Concept Report', style: 'headerText', alignment: 'center' as const, margin: [0, 2, 0, 0] },
    ],
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [40, 72, 40, 45], // Top margin for logo clearance
    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.2,
    },
    header: headerContent,
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `${project.name}`, style: 'footerText', margin: [40, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right', margin: [0, 0, 40, 0] },
      ],
    }),
    content: [
      // Title Block
      { text: project.name, style: 'title' },
      { 
        text: `${totalSF.toLocaleString()} SF  •  ${climateLabels[project.climate]}  •  ${new Date().toLocaleDateString()}`, 
        style: 'subtitle' 
      },
      { text: '', margin: [0, 4] },

      // Summary Table
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [
              { text: 'HVAC', style: 'summaryHeader', fillColor: '#e8f4fc' },
              { text: 'ELECTRICAL', style: 'summaryHeader', fillColor: '#fff8e6' },
              { text: 'PLUMBING', style: 'summaryHeader', fillColor: '#e8fcf0' },
              { text: 'GAS', style: 'summaryHeader', fillColor: '#fce8e8' },
            ],
            [
              { text: `${results.hvac.totalPlantTons || results.hvac.totalTons} Tons\n${Math.round(totalSF / (results.hvac.totalPlantTons || results.hvac.totalTons))} SF/Ton`, style: 'summaryValue', fillColor: '#f4fafd' },
              { text: `${results.electrical.totalKVA.toLocaleString()} kVA\n${results.electrical.recommendedService}`, style: 'summaryValue', fillColor: '#fffdf4' },
              { text: `${results.plumbing.peakGPM} GPM\n${results.plumbing.totalWSFU} WSFU`, style: 'summaryValue', fillColor: '#f4fdf8' },
              { text: `${results.gas.totalCFH.toLocaleString()} CFH\n${results.gas.totalMBH.toLocaleString()} MBH`, style: 'summaryValue', fillColor: '#fdf4f4' },
            ],
          ],
        },
        margin: [0, 0, 0, 8],
      },

      // 1. Mechanical
      { text: '1. Mechanical (HVAC)', style: 'sectionHeader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Air Conditioning / Heating:', style: 'subHeader' },
              { 
                ul: [
                  `Space Cooling: ${results.hvac.totalTons} Tons (${Math.round(totalSF / results.hvac.totalTons)} SF/Ton)`,
                  ...(results.hvac.poolChillerTons > 0 ? [`Pool Chiller: ${results.hvac.poolChillerTons} Tons`] : []),
                  ...(results.hvac.dehumidLbHr > 0 ? [`Dehumidification: ${results.hvac.dehumidLbHr} lb/hr (~${results.hvac.dehumidTons || Math.round(results.hvac.dehumidLbHr * 0.2)} Tons)`] : []),
                  ...(results.hvac.totalPlantTons && results.hvac.totalPlantTons !== results.hvac.totalTons ? [`Total Plant Cooling: ${results.hvac.totalPlantTons} Tons (${Math.round(totalSF / results.hvac.totalPlantTons)} SF/Ton overall)`] : []),
                  `Heating: ${results.hvac.totalMBH.toLocaleString()} MBH`,
                ],
                style: 'list',
              },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Ventilation / Exhaust:', style: 'subHeader' },
              { 
                ul: [
                  `Fresh Air (OA): ${results.hvac.totalVentCFM.toLocaleString()} CFM`,
                  `Exhaust: ${results.hvac.totalExhaustCFM.toLocaleString()} CFM`,
                ],
                style: 'list',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 3],
      },
      // HVAC Narrative (from MEP Narratives or legacy hvacSystemDescription)
      ...((narrativeText => narrativeText ? [
        { 
          text: narrativeText, 
          style: 'body', 
          fontSize: 8,
          margin: [0, 0, 0, 6] as [number, number, number, number],
          italics: true,
          color: '#444444',
        }
      ] : [
        { 
          text: `System: ~${project.mechanicalSettings?.rtuCount ?? results.hvac.rtuCount} RTU/AHU units`, 
          style: 'list', 
          fontSize: 8,
          margin: [0, 0, 0, 6] as [number, number, number, number],
        }
      ])(project.mepNarratives?.hvac || project.mechanicalSettings?.hvacSystemDescription)),

      // 2. Electrical
      { text: '2. Electrical / Fire Alarm', style: 'sectionHeader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Service Sizing:', style: 'subHeader' },
              { 
                ul: [
                  `Total Load: ${results.electrical.totalKVA.toLocaleString()} kVA`,
                  `@ 208V/3PH: ${results.electrical.amps_208v.toLocaleString()}A`,
                  `@ 480V/3PH: ${results.electrical.amps_480v.toLocaleString()}A`,
                  `Recommended: ${results.electrical.recommendedService}`,
                ],
                style: 'list',
              },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Distribution:', style: 'subHeader' },
              { 
                ul: [
                  `Panelboards: ~${results.electrical.panelCount} required`,
                  'Emergency: Generator for egress/life safety',
                  'Fire Alarm: Manual pull stations, horn/strobes',
                ],
                style: 'list',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 3],
      },
      // Electrical Narrative (from MEP Narratives)
      ...((text => text ? [
        { 
          text, 
          style: 'body', 
          fontSize: 8,
          margin: [0, 0, 0, 6] as [number, number, number, number],
          italics: true,
          color: '#444444',
        }
      ] : [])(project.mepNarratives?.electrical)),

      // 3. Plumbing
      { text: '3. Plumbing', style: 'sectionHeader' },
      {
        columns: [
          {
            width: '33%',
            stack: [
              { text: 'Domestic Water:', style: 'subHeader' },
              { 
                ul: [
                  `CW Main: ${results.plumbing.coldWaterMainSize}`,
                  `HW Main: ${results.plumbing.hotWaterMainSize}`,
                  `Peak: ${results.plumbing.peakGPM} GPM`,
                  `WSFU: ${results.plumbing.totalWSFU}`,
                ],
                style: 'list',
              },
            ],
          },
          {
            width: '33%',
            stack: [
              { text: 'Hot Water Plant:', style: 'subHeader' },
              { 
                ul: [
                  `${results.dhw.tanklessUnits} Water Heaters`,
                  `${(results.dhw.grossBTU / 1000).toLocaleString()} MBH total`,
                  `Storage: ${results.dhw.storageGallons.toLocaleString()} gal`,
                  `Peak GPH: ${results.dhw.peakGPH}`,
                ],
                style: 'list',
              },
            ],
          },
          {
            width: '33%',
            stack: [
              { text: 'Sanitary / Vent:', style: 'subHeader' },
              { 
                ul: [
                  `Drain: ${results.plumbing.recommendedDrainSize}`,
                  `DFU: ${results.plumbing.totalDFU}`,
                  `Meter: ${results.plumbing.recommendedMeterSize}`,
                ],
                style: 'list',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 3],
      },
      // Plumbing Narrative (from MEP Narratives)
      ...((text => text ? [
        { 
          text, 
          style: 'body', 
          fontSize: 8,
          margin: [0, 0, 0, 6] as [number, number, number, number],
          italics: true,
          color: '#444444',
        }
      ] : [])(project.mepNarratives?.plumbing)),

      // 4. Gas
      { text: '4. Gas Service', style: 'sectionHeader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Gas Load Summary:', style: 'subHeader' },
              { 
                ul: [
                  `Total Load: ${results.gas.totalMBH.toLocaleString()} MBH / ${results.gas.totalCFH.toLocaleString()} CFH`,
                  `Service Pipe: ${results.gas.recommendedPipeSize}`,
                  `Min Pressure: ${results.gas.recommendedPressure}`,
                ],
                style: 'list',
              },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Equipment Breakdown:', style: 'subHeader' },
              { 
                ul: results.gas.equipmentBreakdown.slice(0, 4).map(eq => 
                  `${eq.name}: ${eq.mbh.toLocaleString()} MBH`
                ),
                style: 'list',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 6],
      },

      // 5. Fire Protection
      { text: '5. Fire Protection', style: 'sectionHeader' },
      { 
        ul: [
          `Occupancy: Group A-3 (Assembly), NFPA-13 compliant`,
          `Est. Sprinkler Count: ~${Math.ceil(totalSF / 130)} heads`,
          `System: Wet pipe with high-temp heads in sauna/steam areas`,
        ],
        style: 'list',
        margin: [0, 0, 0, 3],
      },
      // Fire Protection Narrative (from MEP Narratives)
      ...((text => text ? [
        { 
          text, 
          style: 'body', 
          fontSize: 8,
          margin: [0, 0, 0, 6] as [number, number, number, number],
          italics: true,
          color: '#444444',
        }
      ] : [])(project.mepNarratives?.fireProtection)),

      // Zone Schedule (compact)
      { text: 'Zone Schedule', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Zone', style: 'tableHeader', fillColor: '#f0f0f0' },
              { text: 'SF', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'right' as const },
              { text: 'kW', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'right' as const },
              { text: 'Tons', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'right' as const },
              { text: 'Vent CFM', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'right' as const },
              { text: 'Exh CFM', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'right' as const },
            ],
            ...zones.slice(0, 15).map(z => {
              const defaults = getZoneDefaults(z.type)
              const kw = (z.sf * z.rates.lighting_w_sf / 1000) + (z.sf * z.rates.receptacle_va_sf / 1000) + (defaults.fixed_kw || 0)
              const tons = z.rates.cooling_sf_ton > 0 ? z.sf / z.rates.cooling_sf_ton : 0
              const ventCFM = z.sf * z.rates.ventilation_cfm_sf + (defaults.ventilation_cfm || 0)
              const exhCFM = z.sf * z.rates.exhaust_cfm_sf + (defaults.exhaust_cfm || 0)
              return [
                { text: z.name, style: 'tableCell' },
                { text: z.sf.toLocaleString(), style: 'tableCell', alignment: 'right' as const },
                { text: kw.toFixed(1), style: 'tableCell', alignment: 'right' as const },
                { text: tons.toFixed(1), style: 'tableCell', alignment: 'right' as const },
                { text: Math.round(ventCFM).toLocaleString(), style: 'tableCell', alignment: 'right' as const },
                { text: Math.round(exhCFM).toLocaleString(), style: 'tableCell', alignment: 'right' as const },
              ]
            }),
            [
              { text: 'TOTAL', style: 'tableHeader', fillColor: '#e0e0e0' },
              { text: totalSF.toLocaleString(), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'right' as const },
              { text: results.electrical.totalKW.toLocaleString(), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'right' as const },
              { text: results.hvac.totalTons.toFixed(1), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'right' as const },
              { text: results.hvac.totalVentCFM.toLocaleString(), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'right' as const },
              { text: results.hvac.totalExhaustCFM.toLocaleString(), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'right' as const },
            ],
          ],
        },
        margin: [0, 0, 0, 8],
      },

      // Fixture Schedule (compact)
      { text: 'Fixture Schedule', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Zone', style: 'tableHeader', fillColor: '#f0f0f0' },
              { text: 'WCs', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'center' as const },
              { text: 'LAVs', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'center' as const },
              { text: 'Showers', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'center' as const },
              { text: 'FDs', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'center' as const },
              { text: 'Svc Sinks', style: 'tableHeader', fillColor: '#f0f0f0', alignment: 'center' as const },
            ],
            ...zones.filter(z => {
              const lf = getLegacyFixtureCounts(z.fixtures)
              return lf.wcs > 0 || lf.lavs > 0 || lf.showers > 0 || lf.floorDrains > 0 || lf.serviceSinks > 0
            }).slice(0, 10).map(z => {
              const lf = getLegacyFixtureCounts(z.fixtures)
              return [
                { text: z.name, style: 'tableCell' },
                { text: String(lf.wcs || '-'), style: 'tableCell', alignment: 'center' as const },
                { text: String(lf.lavs || '-'), style: 'tableCell', alignment: 'center' as const },
                { text: String(lf.showers || '-'), style: 'tableCell', alignment: 'center' as const },
                { text: String(lf.floorDrains || '-'), style: 'tableCell', alignment: 'center' as const },
                { text: String(lf.serviceSinks || '-'), style: 'tableCell', alignment: 'center' as const },
              ]
            }),
            [
              { text: 'TOTAL', style: 'tableHeader', fillColor: '#e0e0e0' },
              { text: String(legacyFixtures.wcs), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'center' as const },
              { text: String(legacyFixtures.lavs), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'center' as const },
              { text: String(legacyFixtures.showers), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'center' as const },
              { text: String(legacyFixtures.floorDrains), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'center' as const },
              { text: String(legacyFixtures.serviceSinks), style: 'tableHeader', fillColor: '#e0e0e0', alignment: 'center' as const },
            ],
          ],
        },
        margin: [0, 0, 0, 6],
      },

      // Footer notes
      {
        text: `Generated by COLLECTIF GOAT  •  Contingency: ${(project.contingency * 100).toFixed(0)}%  •  ${new Date().toLocaleString()}`,
        style: 'footerNote',
        margin: [0, 4, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 3] },
      subtitle: { fontSize: 9, color: '#666666', margin: [0, 0, 0, 10] },
      sectionHeader: { fontSize: 11, bold: true, margin: [0, 10, 0, 5], color: '#1a1a1a' },
      subHeader: { fontSize: 9, bold: true, margin: [0, 3, 0, 2], color: '#333333' },
      body: { fontSize: 10 },
      list: { fontSize: 9, margin: [0, 0, 0, 5] },
      headerText: { fontSize: 8, color: '#666666' },
      footerText: { fontSize: 8, color: '#999999' },
      footerNote: { fontSize: 7, color: '#999999', italics: true, alignment: 'center' },
      tableHeader: { fontSize: 8, bold: true },
      tableCell: { fontSize: 8 },
      summaryHeader: { fontSize: 9, bold: true, alignment: 'center', margin: [0, 3, 0, 3] },
      summaryValue: { fontSize: 9, alignment: 'center', margin: [0, 4, 0, 4] },
    },
  }

  pdfMake.createPdf(docDefinition).download(`${project.name || 'MEP-Concept'}.pdf`)
}

/**
 * Export Concept Report to Word (docx)
 */
export async function exportConceptWord(
  project: Project,
  zones: Zone[],
  results: CalculationResults,
  fixtures: ZoneFixtures,
  totalSF: number
): Promise<void> {
  const legacyFixtures = getLegacyFixtureCounts(fixtures)
  
  // Build header with logo
  const headerChildren: Paragraph[] = []
  
  if (storedLogoBase64) {
    try {
      const binaryString = atob(storedLogoBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      headerChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: bytes,
              transformation: { width: 100, height: 50 },
              type: 'png',
            }),
            new TextRun({ text: '          MEP Concept Report', size: 18, color: '666666' }),
          ],
        })
      )
    } catch (e) {
      headerChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'COLLECTIF Engineering PLLC', size: 18, color: '666666' }),
            new TextRun({ text: '     MEP Concept Report', size: 18, color: '666666' }),
          ],
        })
      )
    }
  } else {
    headerChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'COLLECTIF Engineering PLLC', bold: true, size: 20 }),
          new TextRun({ text: '     MEP Concept Report', size: 18, color: '666666' }),
        ],
      })
    )
  }

  // Zone schedule table
  const zoneRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Zone', bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'SF', bold: true, size: 18 })], alignment: AlignmentType.RIGHT })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'kW', bold: true, size: 18 })], alignment: AlignmentType.RIGHT })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tons', bold: true, size: 18 })], alignment: AlignmentType.RIGHT })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Vent CFM', bold: true, size: 18 })], alignment: AlignmentType.RIGHT })] }),
      ],
      tableHeader: true,
    }),
    ...zones.slice(0, 15).map(z => {
      const defaults = getZoneDefaults(z.type)
      const kw = (z.sf * z.rates.lighting_w_sf / 1000) + (z.sf * z.rates.receptacle_va_sf / 1000) + (defaults.fixed_kw || 0)
      const tons = z.rates.cooling_sf_ton > 0 ? z.sf / z.rates.cooling_sf_ton : 0
      const ventCFM = z.sf * z.rates.ventilation_cfm_sf + (defaults.ventilation_cfm || 0)
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: z.name })] }),
          new TableCell({ children: [new Paragraph({ text: z.sf.toLocaleString(), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: kw.toFixed(1), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: tons.toFixed(1), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: Math.round(ventCFM).toLocaleString(), alignment: AlignmentType.RIGHT })] }),
        ],
      })
    }),
  ]

  // Fixture schedule table  
  const fixtureRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Zone', bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'WCs', bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'LAVs', bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Showers', bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'FDs', bold: true, size: 18 })], alignment: AlignmentType.CENTER })] }),
      ],
      tableHeader: true,
    }),
    ...zones.filter(z => {
      const lf = getLegacyFixtureCounts(z.fixtures)
      return lf.wcs > 0 || lf.lavs > 0 || lf.showers > 0 || lf.floorDrains > 0
    }).slice(0, 10).map(z => {
      const lf = getLegacyFixtureCounts(z.fixtures)
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: z.name })] }),
          new TableCell({ children: [new Paragraph({ text: String(lf.wcs || '-'), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: String(lf.lavs || '-'), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: String(lf.showers || '-'), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: String(lf.floorDrains || '-'), alignment: AlignmentType.CENTER })] }),
        ],
      })
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(legacyFixtures.wcs), bold: true })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(legacyFixtures.lavs), bold: true })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(legacyFixtures.showers), bold: true })], alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(legacyFixtures.floorDrains), bold: true })], alignment: AlignmentType.CENTER })] }),
      ],
    }),
  ]

  const doc = new Document({
    sections: [{
      headers: {
        default: new Header({ children: headerChildren }),
      },
      children: [
        // Title
        new Paragraph({
          text: project.name,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `${totalSF.toLocaleString()} SF  •  ${climateLabels[project.climate]}  •  ${new Date().toLocaleDateString()}`,
          spacing: { after: 200 },
        }),

        // 1. Mechanical
        new Paragraph({ text: '1. Mechanical (HVAC)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({ text: `Space Cooling: ${results.hvac.totalTons} Tons (${Math.round(totalSF / results.hvac.totalTons)} SF/Ton)` }),
        ...(results.hvac.poolChillerTons > 0 ? [new Paragraph({ text: `Pool Chiller: ${results.hvac.poolChillerTons} Tons` })] : []),
        ...(results.hvac.dehumidLbHr > 0 ? [new Paragraph({ text: `Dehumidification: ${results.hvac.dehumidLbHr} lb/hr (~${results.hvac.dehumidTons || Math.round(results.hvac.dehumidLbHr * 0.2)} Tons)` })] : []),
        ...(results.hvac.totalPlantTons && results.hvac.totalPlantTons !== results.hvac.totalTons ? [new Paragraph({ text: `Total Plant Cooling: ${results.hvac.totalPlantTons} Tons (${Math.round(totalSF / results.hvac.totalPlantTons)} SF/Ton overall)` })] : []),
        new Paragraph({ text: `Heating: ${results.hvac.totalMBH.toLocaleString()} MBH` }),
        new Paragraph({ text: `RTU/AHU Count: ~${results.hvac.rtuCount} units` }),
        new Paragraph({ text: `Fresh Air: ${results.hvac.totalVentCFM.toLocaleString()} CFM  •  Exhaust: ${results.hvac.totalExhaustCFM.toLocaleString()} CFM` }),
        ...(results.hvac.dehumidLbHr > 0 ? [new Paragraph({ text: `Dehumidification: ${results.hvac.dehumidLbHr} lb/hr` })] : []),
        // HVAC Narrative
        ...(project.mepNarratives?.hvac ? project.mepNarratives.hvac.split('\n\n').map(p => 
          new Paragraph({ text: p.trim(), spacing: { before: 50, after: 50 } })
        ) : []),

        // 2. Electrical
        new Paragraph({ text: '2. Electrical / Fire Alarm', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({ text: `Total Load: ${results.electrical.totalKVA.toLocaleString()} kVA` }),
        new Paragraph({ text: `Service @ 208V/3PH: ${results.electrical.amps_208v.toLocaleString()}A  •  @ 480V: ${results.electrical.amps_480v.toLocaleString()}A` }),
        new Paragraph({ text: `Recommended Service: ${results.electrical.recommendedService}` }),
        new Paragraph({ text: `Panelboards: ~${results.electrical.panelCount} required` }),
        // Electrical Narrative
        ...(project.mepNarratives?.electrical ? project.mepNarratives.electrical.split('\n\n').map(p => 
          new Paragraph({ text: p.trim(), spacing: { before: 50, after: 50 } })
        ) : []),

        // 3. Plumbing
        new Paragraph({ text: '3. Plumbing', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({ text: `Cold Water Main: ${results.plumbing.coldWaterMainSize}  •  Hot Water Main: ${results.plumbing.hotWaterMainSize}` }),
        new Paragraph({ text: `Peak Demand: ${results.plumbing.peakGPM} GPM (${results.plumbing.totalWSFU} WSFU)` }),
        new Paragraph({ text: `Hot Water: ${results.dhw.tanklessUnits} heaters @ ${(results.dhw.grossBTU / 1000).toLocaleString()} MBH total  •  Storage: ${results.dhw.storageGallons.toLocaleString()} gal` }),
        new Paragraph({ text: `Sanitary: ${results.plumbing.recommendedDrainSize} drain (${results.plumbing.totalDFU} DFU)` }),
        // Plumbing Narrative
        ...(project.mepNarratives?.plumbing ? project.mepNarratives.plumbing.split('\n\n').map(p => 
          new Paragraph({ text: p.trim(), spacing: { before: 50, after: 50 } })
        ) : []),

        // 4. Gas
        new Paragraph({ text: '4. Gas Service', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({ text: `Total Load: ${results.gas.totalMBH.toLocaleString()} MBH / ${results.gas.totalCFH.toLocaleString()} CFH` }),
        new Paragraph({ text: `Service: ${results.gas.recommendedPipeSize} @ ${results.gas.recommendedPressure}` }),

        // 5. Fire Protection
        new Paragraph({ text: '5. Fire Protection', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({ text: `Occupancy: Group A-3, NFPA-13 compliant  •  Est. ${Math.ceil(totalSF / 130)} sprinkler heads` }),
        // Fire Protection Narrative
        ...(project.mepNarratives?.fireProtection ? project.mepNarratives.fireProtection.split('\n\n').map(p => 
          new Paragraph({ text: p.trim(), spacing: { before: 50, after: 50 } })
        ) : []),

        // Zone Schedule
        new Paragraph({ text: 'Zone Schedule', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Table({ rows: zoneRows, width: { size: 100, type: WidthType.PERCENTAGE } }),

        // Fixture Schedule
        new Paragraph({ text: 'Fixture Schedule', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Table({ rows: fixtureRows, width: { size: 100, type: WidthType.PERCENTAGE } }),

        // Footer
        new Paragraph({
          text: `Generated by COLLECTIF GOAT  •  Contingency: ${(project.contingency * 100).toFixed(0)}%  •  ${new Date().toLocaleString()}`,
          spacing: { before: 300 },
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${project.name || 'MEP-Concept'}.docx`)
}
