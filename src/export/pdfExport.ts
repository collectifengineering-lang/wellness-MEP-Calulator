import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import type { Project, Zone, CalculationResults, ZoneFixtures } from '../types'

// Initialize pdfmake fonts
// @ts-expect-error pdfmake vfs typing issue
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.default?.pdfMake?.vfs || pdfFonts

const climateLabels: Record<string, string> = {
  hot_humid: 'Hot & Humid',
  temperate: 'Temperate',
  cold_dry: 'Cold & Dry',
}

export async function exportToPDF(
  project: Project,
  zones: Zone[],
  results: CalculationResults,
  fixtures: ZoneFixtures,
  totalSF: number,
  includeDetailed: boolean
): Promise<void> {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.3,
    },
    header: {
      columns: [
        { text: 'COLLECTIF Engineering PLLC', style: 'headerText', margin: [40, 20, 0, 0] },
        { text: 'MEP Due Diligence Report', style: 'headerText', alignment: 'right', margin: [0, 20, 40, 0] },
      ],
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `${project.name}`, style: 'footerText', margin: [40, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right', margin: [0, 0, 40, 0] },
      ],
    }),
    content: [
      // Title
      { text: project.name, style: 'title' },
      { text: `${totalSF.toLocaleString()} SF | ${climateLabels[project.climate]} | ${new Date().toLocaleDateString()}`, style: 'subtitle' },
      { text: '', margin: [0, 10] },

      // Executive Summary
      { text: 'Executive Summary', style: 'sectionHeader' },
      {
        text: `COLLECTIF ENGINEERING has been engaged to determine the MEP requirements of a ~${Math.round(totalSF / 1000)}k SF wellness facility. This report identifies high-level requirements for utility services, MEP systems, and provides recommendations for landlord negotiation items.`,
        style: 'body',
        margin: [0, 0, 0, 15],
      },

      // 1. HVAC
      { text: '1. HVAC (Mechanical)', style: 'sectionHeader' },
      { text: 'Air Conditioning / Heating:', style: 'subHeader' },
      {
        ul: [
          `Space Cooling: ${results.hvac.totalTons} Tons (${Math.round(totalSF / results.hvac.totalTons)} SF/Ton)`,
          ...(results.hvac.poolChillerTons > 0 ? [`Pool Chiller: ${results.hvac.poolChillerTons} Tons`] : []),
          ...(results.hvac.dehumidLbHr > 0 ? [`Dehumidification: ${results.hvac.dehumidLbHr} lb/hr (~${results.hvac.dehumidTons || Math.round(results.hvac.dehumidLbHr * 0.2)} Tons)`] : []),
          ...(results.hvac.totalPlantTons && results.hvac.totalPlantTons !== results.hvac.totalTons ? [`Total Plant Cooling: ${results.hvac.totalPlantTons} Tons (${Math.round(totalSF / results.hvac.totalPlantTons)} SF/Ton overall)`] : []),
          `Heating: ${results.hvac.totalMBH.toLocaleString()} MBH`,
          `Recommended zoning: ~${results.hvac.rtuCount} RTUs/units for ${zones.length} program areas`,
        ],
        style: 'list',
      },
      { text: 'Ventilation / Exhaust:', style: 'subHeader' },
      {
        ul: [
          `Fresh Air: ${results.hvac.totalVentCFM.toLocaleString()} CFM`,
          `Exhaust: ${results.hvac.totalExhaustCFM.toLocaleString()} CFM`,
        ],
        style: 'list',
      },
      createRecommendationBox('Mechanical', [
        'Landlord to allow roof penetrations for specialty exhaust systems.',
        'Landlord to allow equipment on roof with new dunnage.',
        'Landlord to allow exhaust flues along exterior facade.',
      ]),

      // 2. Electrical
      { text: '2. Electrical / Fire Alarm', style: 'sectionHeader', pageBreak: 'before' },
      {
        ol: [
          `Estimated service size: ${results.electrical.amps_208v.toLocaleString()}A at 208V/3PH, 4W (or ${results.electrical.amps_480v.toLocaleString()}A at 480V/3PH, 4W)`,
          'Service based on: mechanical/plumbing loads, pool equipment, elevator, and general lighting/receptacle at 3 VA/SF.',
          `Approximately ${results.electrical.panelCount} panelboards required for distribution.`,
          'A ~60kW generator shall be provided for emergency and standby loads.',
          'Fire alarm: Manual system with horn/strobe notification devices.',
        ],
        style: 'list',
      },
      createRecommendationBox('Electrical', [
        'Landlord to provide incoming utility and coordination with utility company.',
        `Landlord to provide main switchboard rated ${results.electrical.recommendedService}.`,
        'Landlord to provide panelboards described above.',
        'Landlord to provide emergency power source for egress lighting and exhaust fans.',
      ]),

      // 3. Plumbing
      { text: '3. Plumbing', style: 'sectionHeader' },
      { text: 'Domestic Cold Water:', style: 'subHeader' },
      {
        ul: [
          `Base Building: ${results.plumbing.coldWaterMainSize} Cold Water Connection`,
          `Peak Demand: ${results.plumbing.peakGPM} GPM (${results.plumbing.totalWSFU} WSFU)`,
        ],
        style: 'list',
      },
      { text: 'Domestic Hot Water:', style: 'subHeader' },
      {
        ul: [
          `Hot Water Plant: ${results.dhw.tanklessUnits} Tankless Water Heaters @ 199,900 BTU each`,
          `Total: ${(results.dhw.grossBTU / 1000).toLocaleString()} MBH`,
          `Storage: ${results.dhw.storageGallons.toLocaleString()} gallons`,
        ],
        style: 'list',
      },
      { text: 'Sanitary:', style: 'subHeader' },
      {
        ul: [
          `Building Drain: ${results.plumbing.recommendedDrainSize} (${results.plumbing.totalDFU} DFU)`,
        ],
        style: 'list',
      },
      { text: 'Gas:', style: 'subHeader' },
      {
        ul: [
          `Total Gas Load: ${results.gas.totalCFH.toLocaleString()} CFH at minimum ${results.gas.recommendedPressure}`,
          `Service Pipe: ${results.gas.recommendedPipeSize}`,
        ],
        style: 'list',
      },
      createRecommendationBox('Plumbing', [
        'Landlord shall provide domestic water service to building.',
        'Landlord shall provide high pressure gas service with meter rig.',
        `Minimum building drain size: ${results.plumbing.recommendedDrainSize}.`,
      ]),

      // 4. Fire Protection
      { text: '4. Fire Protection (Sprinklers)', style: 'sectionHeader' },
      {
        ol: [
          'Occupancy: Group A-3, Fire Protection required per applicable building code and NFPA-13.',
          'Sprinkler main: 4" base building, 3" per floor loop.',
          `Estimated sprinkler count: ~${Math.ceil(totalSF / 130)} heads total.`,
          'High-temp sprinkler heads required for sauna/banya areas.',
        ],
        style: 'list',
      },
      createRecommendationBox('Fire Protection', [
        'Landlord shall provide Fire Protection system per applicable building code and NFPA.',
        'System shall include water service, risers, and base building layout.',
      ]),

      // Detailed calculations appendix
      ...(includeDetailed ? createDetailedAppendix(project, zones, results, fixtures) : []),
    ],
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
      subtitle: { fontSize: 10, color: '#666666', margin: [0, 0, 0, 20] },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 15, 0, 8], color: '#1a1a1a' },
      subHeader: { fontSize: 10, bold: true, margin: [0, 8, 0, 4] },
      body: { fontSize: 10 },
      list: { fontSize: 9, margin: [0, 0, 0, 10] },
      headerText: { fontSize: 8, color: '#666666' },
      footerText: { fontSize: 8, color: '#999999' },
      tableHeader: { fontSize: 9, bold: true, fillColor: '#f0f0f0' },
      tableCell: { fontSize: 9 },
    },
  }

  pdfMake.createPdf(docDefinition).download(`${project.name || 'MEP-Report'}.pdf`)
}

function createRecommendationBox(system: string, recommendations: string[]): Content {
  return {
    stack: [
      { text: `LEASE NEGOTIATION RECOMMENDATIONS - ${system.toUpperCase()}`, style: 'subHeader', fontSize: 8 },
      {
        ol: recommendations,
        fontSize: 8,
        margin: [0, 0, 0, 15],
      },
    ],
    fillColor: '#f8f8f8',
    margin: [0, 10, 0, 15],
  }
}

function createDetailedAppendix(
  project: Project,
  zones: Zone[],
  results: CalculationResults,
  fixtures: ZoneFixtures
): Content[] {
  return [
    { text: 'Appendix: Detailed Calculations', style: 'sectionHeader', pageBreak: 'before' },
    
    // Zone Summary Table
    { text: 'Zone Summary', style: 'subHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Zone', style: 'tableHeader' },
            { text: 'SF', style: 'tableHeader' },
            { text: 'Type', style: 'tableHeader' },
            { text: 'Showers', style: 'tableHeader' },
            { text: 'WCs', style: 'tableHeader' },
          ],
          ...zones.map(z => [
            { text: z.name, style: 'tableCell' },
            { text: z.sf.toLocaleString(), style: 'tableCell' },
            { text: z.type.replace(/_/g, ' '), style: 'tableCell' },
            { text: z.fixtures.showers.toString(), style: 'tableCell' },
            { text: z.fixtures.wcs.toString(), style: 'tableCell' },
          ]),
        ],
      },
      margin: [0, 0, 0, 20],
    },

    // Fixture Totals
    { text: 'Fixture Totals', style: 'subHeader' },
    {
      columns: [
        { text: `Showers: ${fixtures.showers}`, width: 'auto' },
        { text: `Lavatories: ${fixtures.lavs}`, width: 'auto' },
        { text: `Water Closets: ${fixtures.wcs}`, width: 'auto' },
        { text: `Floor Drains: ${fixtures.floorDrains}`, width: 'auto' },
      ],
      columnGap: 20,
      margin: [0, 0, 0, 20],
    },

    // Gas Equipment Breakdown
    { text: 'Gas Equipment Breakdown', style: 'subHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto'],
        body: [
          [
            { text: 'Equipment', style: 'tableHeader' },
            { text: 'MBH', style: 'tableHeader' },
            { text: 'CFH', style: 'tableHeader' },
          ],
          ...results.gas.equipmentBreakdown.map(eq => [
            { text: eq.name, style: 'tableCell' },
            { text: eq.mbh.toLocaleString(), style: 'tableCell' },
            { text: eq.cfh.toLocaleString(), style: 'tableCell' },
          ]),
          [
            { text: 'TOTAL', style: 'tableHeader' },
            { text: results.gas.totalMBH.toLocaleString(), style: 'tableHeader' },
            { text: results.gas.totalCFH.toLocaleString(), style: 'tableHeader' },
          ],
        ],
      },
      margin: [0, 0, 0, 20],
    },

    // Calculation Parameters
    { text: 'Calculation Parameters', style: 'subHeader' },
    {
      columns: [
        {
          stack: [
            `Contingency: ${(project.contingency * 100).toFixed(0)}%`,
            `Climate Zone: ${project.climate}`,
            `Primary Mode: ${project.electricPrimary ? 'Electric' : 'Gas'}`,
          ],
        },
        {
          stack: [
            `DHW Heater Type: ${project.dhwSettings.heaterType}`,
            `DHW Efficiency: ${(project.dhwSettings.gasEfficiency * 100).toFixed(0)}%`,
            `Storage Temp: ${project.dhwSettings.storageTemp}°F`,
          ],
        },
      ],
      margin: [0, 0, 0, 20],
    },
  ]
}
