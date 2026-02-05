import { useState, useCallback, useEffect, useRef } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { getZoneDefaults } from '../../data/zoneDefaults'
import { getLegacyFixtureCounts } from '../../data/fixtureUtils'
import type { CalculationResults, ZoneFixtures, LineItem } from '../../types'
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
  PageBreak,
} from 'docx'
import { saveAs } from 'file-saver'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

interface SDPackageReportProps {
  calculations: {
    results: CalculationResults | null
    aggregatedFixtures: ZoneFixtures
    totalSF: number
    mechanicalKVA?: { total: number; breakdown: { name: string; kva: number }[] }
  }
  onClose: () => void
}

interface ReportSection {
  id: string
  title: string
  content: string
  isEditing: boolean
}

// Company logo as base64 for Word export (will be loaded from file input)
let companyLogoBase64: string | null = null

// Key for storing global logo history in localStorage
const GLOBAL_LOGO_HISTORY_KEY = 'mep_calculator_logo_history'

export default function SDPackageReport({ calculations, onClose }: SDPackageReportProps) {
  const { currentProject, zones } = useProjectStore()
  const { results, aggregatedFixtures, totalSF } = calculations
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [sections, setSections] = useState<ReportSection[]>([])
  const [projectTitle, setProjectTitle] = useState(currentProject?.name || 'MEP Schematic Design Package')
  const [projectAddress, setProjectAddress] = useState(currentProject?.clientInfo?.projectAddress || '')
  const [preparedBy, setPreparedBy] = useState('Rafael Figueroa, PE, PMP – Partner & Mechanical Engineer\nChristopher Ocampo, PE, WEDG – Partner & Electrical Engineer\nFrank Perrone – Sr. Plumbing/Fire Protection Engineer')
  
  // Initialize logo from project or global history
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    // First try project-specific logo
    if (currentProject?.reportLogo?.currentLogoUrl) {
      return currentProject.reportLogo.currentLogoUrl
    }
    // Fall back to global history
    try {
      const stored = localStorage.getItem(GLOBAL_LOGO_HISTORY_KEY)
      const history = stored ? JSON.parse(stored) : []
      return history[0] || null
    } catch {
      return null
    }
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Generate AI narrative for a section
  const generateSectionNarrative = useCallback(async (
    sectionType: 'mechanical' | 'electrical' | 'plumbing' | 'fireProtection' | 'executive',
    equipmentData: string
  ): Promise<string> => {
    if (!ANTHROPIC_API_KEY) {
      return `[AI generation unavailable - add VITE_ANTHROPIC_API_KEY]\n\nPlaceholder for ${sectionType} narrative based on:\n${equipmentData}`
    }
    
    // Get concept-level narratives from the project to expand upon
    const conceptNarratives = currentProject?.mepNarratives
    
    const prompts: Record<string, string> = {
      executive: `Write a 2-3 paragraph executive summary for an MEP Schematic Design package for a wellness/fitness facility. 
The purpose is to identify high-level requirements for utility services and MEP systems.
Total area: ${totalSF.toLocaleString()} SF
Number of zones: ${zones.length}
Include reference to Mechanical, Electrical, Plumbing, and Fire Protection systems.
Write in professional engineering report style. Be concise and technical.`,
      
      mechanical: `Write professional engineering narrative for the MECHANICAL section of an MEP Schematic Design package.
Cover Air Conditioning/Heating, Ventilation/Exhaust, Chimneys/Vents/Flues.

${conceptNarratives?.hvac ? `CONCEPT DESIGN NARRATIVE (expand and detail this):
${conceptNarratives.hvac}

` : ''}Use this equipment data:
${equipmentData}

Format with numbered lists and subsections. Include specific equipment model references where appropriate.
Use professional MEP engineering language. Reference industry standards like ASHRAE.
Expand the concept narrative into SD-level detail with specific equipment selections, duct routing concepts, and control sequences.`,
      
      electrical: `Write professional engineering narrative for the ELECTRICAL/FIRE ALARM section of an MEP Schematic Design package.
Cover: service sizing, distribution, emergency power, fire alarm.

${conceptNarratives?.electrical ? `CONCEPT DESIGN NARRATIVE (expand and detail this):
${conceptNarratives.electrical}

` : ''}Use this equipment data:
${equipmentData}

Format with numbered lists. Include voltage, phase, amperage details.
Use professional MEP engineering language.
Expand the concept narrative into SD-level detail with specific panel schedules, circuit sizing, and fire alarm zoning concepts.`,
      
      plumbing: `Write professional engineering narrative for the PLUMBING section of an MEP Schematic Design package.
Cover: Fixtures, Domestic Cold Water, Domestic Hot Water (include water heater specs), Sanitary/Vent, Gas service.

${conceptNarratives?.plumbing ? `CONCEPT DESIGN NARRATIVE (expand and detail this):
${conceptNarratives.plumbing}

` : ''}Use this equipment data:
${equipmentData}

Format with clear subsections. Include pipe sizes and equipment specifications.
Use professional MEP engineering language.
Expand the concept narrative into SD-level detail with specific pipe materials, riser locations, and equipment model selections.`,
      
      fireProtection: `Write professional engineering narrative for the FIRE PROTECTION section of an MEP Schematic Design package.
Cover: Sprinkler system, sprinkler types, special considerations for high-temp areas (saunas).

${conceptNarratives?.fireProtection ? `CONCEPT DESIGN NARRATIVE (expand and detail this):
${conceptNarratives.fireProtection}

` : ''}Use this equipment data:
${equipmentData}

Reference NFPA-13 standards. Include sprinkler count estimates.
Use professional MEP engineering language.
Expand the concept narrative into SD-level detail with specific hazard classifications, coverage areas, and head types.`,
    }
    
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: prompts[sectionType]
          }]
        })
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.content[0].text
    } catch (error) {
      console.error('AI generation error:', error)
      return `[AI generation failed]\n\nManual entry required for ${sectionType} section.\n\nEquipment data:\n${equipmentData}`
    }
  }, [totalSF, zones.length])
  
  // Build equipment data strings for AI context
  const buildEquipmentData = useCallback(() => {
    if (!results || !currentProject) return { mechanical: '', electrical: '', plumbing: '', fireProtection: '' }
    
    // Mechanical data
    const mechanicalData = `
COOLING:
- Total Cooling Capacity: ${results.hvac.totalTons} Tons
- Average: ${Math.round(totalSF / results.hvac.totalTons)} SF/Ton
- Recommended RTU Count: ${results.hvac.rtuCount} units

HEATING:
- Total Heating Capacity: ${results.hvac.totalMBH.toLocaleString()} MBH
- Heating Type: ${currentProject.mechanicalSettings.heatingFuelType === 'gas' ? 'Gas-fired' : 'Electric'}

VENTILATION/EXHAUST:
- Fresh Air: ${results.hvac.totalVentCFM.toLocaleString()} CFM
- Exhaust: ${results.hvac.totalExhaustCFM.toLocaleString()} CFM
${results.hvac.dehumidLbHr > 0 ? `- Pool Dehumidification: ${results.hvac.dehumidLbHr} lb/hr` : ''}

ZONES BY TYPE:
${zones.map(z => {
  const def = getZoneDefaults(z.type)
  return `- ${z.name} (${def.displayName}): ${z.sf} SF`
}).join('\n')}

SPECIAL EQUIPMENT:
${zones.filter(z => {
  const d = getZoneDefaults(z.type)
  // Check actual zone data, not just defaults
  const hasGasLineItems = z.lineItems?.some(li => li.category === 'gas' && li.value > 0)
  const hasElectricLineItems = z.lineItems?.some(li => li.category === 'electrical' && li.value > 0)
  const hasDehumid = z.processLoads?.dehumid_lb_hr > 0
  return hasGasLineItems || hasElectricLineItems || hasDehumid || d.requires_type1_hood || z.type.includes('sauna') || z.type.includes('banya') || z.type.includes('steam')
}).map(z => {
  const d = getZoneDefaults(z.type)
  const items: string[] = []
  // Get actual equipment from line items
  const gasPoolHeater = z.lineItems?.find(li => li.category === 'gas' && li.name.toLowerCase().includes('pool'))
  const electricPoolHeater = z.lineItems?.find(li => li.category === 'electrical' && li.name.toLowerCase().includes('pool'))
  const gasHeaters = z.lineItems?.filter(li => li.category === 'gas' && li.value > 0 && !li.name.toLowerCase().includes('pool'))
  const actualDehumid = z.processLoads?.dehumid_lb_hr
  gasHeaters?.forEach(gh => items.push(`${gh.name}: ${gh.value} ${gh.unit}`))
  if (actualDehumid && actualDehumid > 0) items.push(`Dehumid: ${actualDehumid} lb/hr`)
  if (electricPoolHeater) items.push(`Electric pool heater: ${electricPoolHeater.value} kW`)
  if (gasPoolHeater) items.push(`Gas pool heater: ${gasPoolHeater.value} MBH`)
  if (d.requires_type1_hood) items.push('Type I hood required')
  if (d.requires_mau) items.push(`MUA: ${d.mau_cfm || 0} CFM`)
  return `${z.name}: ${items.join(', ')}`
}).join('\n')}
`
    
    // Electrical data
    const electricalData = `
SERVICE SIZING:
- Total Connected Load: ${results.electrical.totalKW.toLocaleString()} kW / ${results.electrical.totalKVA.toLocaleString()} kVA
- At 208V/3PH: ${results.electrical.amps_208v.toLocaleString()}A
- At 480V/3PH: ${results.electrical.amps_480v.toLocaleString()}A
- Recommended Service: ${results.electrical.recommendedService}
- Panelboards Required: ${results.electrical.panelCount}

PROJECT SETTINGS:
- Primary Voltage: ${currentProject.electricalSettings.voltage}V
- Phase: ${currentProject.electricalSettings.phase}-phase
- Demand Factor: ${(currentProject.electricalSettings.demandFactor * 100).toFixed(0)}%
- Power Factor: ${currentProject.electricalSettings.powerFactor}
- Spare Capacity: ${(currentProject.electricalSettings.spareCapacity * 100).toFixed(0)}%

LOAD BREAKDOWN BY ZONE:
${zones.map(z => {
  const lightingKW = z.sf * z.rates.lighting_w_sf / 1000
  const receptacleKW = z.sf * z.rates.receptacle_va_sf / 1000
  return `- ${z.name}: ${(lightingKW + receptacleKW).toFixed(1)} kW (lighting + receptacles)`
}).join('\n')}

SPECIAL ELECTRICAL LOADS:
${zones.filter(z => z.lineItems && z.lineItems.length > 0).map(z => {
  return z.lineItems.filter((li: LineItem) => li.category === 'power' || li.category === 'other')
    .map((li: LineItem) => `- ${z.name}: ${li.name} - ${li.quantity} x ${li.value} ${li.unit}`)
    .join('\n')
}).filter(s => s).join('\n')}
`
    
    // Plumbing data
    const legacyFixtures = getLegacyFixtureCounts(aggregatedFixtures)
    const plumbingData = `
FIXTURES:
- Water Closets: ${legacyFixtures.wcs}
- Lavatories: ${legacyFixtures.lavs}
- Showers: ${legacyFixtures.showers}
- Floor Drains: ${legacyFixtures.floorDrains}
- Service Sinks: ${legacyFixtures.serviceSinks}
- Washing Machines: ${legacyFixtures.washingMachines}
- Dryers: ${legacyFixtures.dryers}

DOMESTIC COLD WATER:
- Total WSFU: ${results.plumbing.totalWSFU}
- Peak Demand: ${results.plumbing.peakGPM} GPM
- Recommended Main Size: ${results.plumbing.coldWaterMainSize}
- Meter Size: ${results.plumbing.recommendedMeterSize}

DOMESTIC HOT WATER:
- System Type: ${currentProject.dhwSettings.systemType}
- Heater Type: ${currentProject.dhwSettings.heaterType}
- Peak GPH: ${results.dhw.peakGPH}
- Total BTU: ${(results.dhw.grossBTU / 1000).toLocaleString()} MBH
- Storage: ${results.dhw.storageGallons} gallons
- Tankless Units: ${results.dhw.tanklessUnits} (@ ${currentProject.dhwSettings.tanklessUnitBtu.toLocaleString()} BTU each)
- Storage Temp: ${currentProject.dhwSettings.storageTemp}°F
- Delivery Temp: ${currentProject.dhwSettings.deliveryTemp}°F

SANITARY/VENT:
- Total DFU: ${results.plumbing.totalDFU}
- Recommended Drain Size: ${results.plumbing.recommendedDrainSize}

GAS SERVICE:
- Total Gas Load: ${results.gas.totalMBH.toLocaleString()} MBH / ${results.gas.totalCFH.toLocaleString()} CFH
- Recommended Pressure: ${results.gas.recommendedPressure}
- Recommended Pipe Size: ${results.gas.recommendedPipeSize}

GAS EQUIPMENT:
${results.gas.equipmentBreakdown.map(eq => `- ${eq.name}: ${eq.mbh.toLocaleString()} MBH`).join('\n')}
`
    
    // Fire Protection data
    const fireProtectionData = `
FACILITY INFO:
- Total Area: ${totalSF.toLocaleString()} SF
- Occupancy Type: Group A-3 (Assembly)
- Estimated Sprinkler Count: ~${Math.ceil(totalSF / 130)} heads

SPECIAL CONSIDERATIONS:
${zones.filter(z => z.type.includes('sauna') || z.type.includes('banya') || z.type.includes('steam'))
  .map(z => `- ${z.name}: High-temperature sprinkler heads required`).join('\n') || '- None'}

HAZARD CLASSIFICATION:
- Light Hazard: Office, reception, locker rooms
- Ordinary Hazard Group 1: Storage, mechanical
- Ordinary Hazard Group 2: Commercial kitchen (if applicable)
`
    
    return { mechanical: mechanicalData, electrical: electricalData, plumbing: plumbingData, fireProtection: fireProtectionData }
  }, [results, currentProject, zones, aggregatedFixtures, totalSF])
  
  // Generate all sections
  const generateReport = useCallback(async () => {
    setIsGenerating(true)
    
    const equipmentData = buildEquipmentData()
    
    try {
      // Generate all sections in parallel
      const [executive, mechanical, electrical, plumbing, fireProtection] = await Promise.all([
        generateSectionNarrative('executive', `Total SF: ${totalSF}, Zones: ${zones.length}`),
        generateSectionNarrative('mechanical', equipmentData.mechanical),
        generateSectionNarrative('electrical', equipmentData.electrical),
        generateSectionNarrative('plumbing', equipmentData.plumbing),
        generateSectionNarrative('fireProtection', equipmentData.fireProtection),
      ])
      
      setSections([
        { id: 'executive', title: 'Executive Summary', content: executive, isEditing: false },
        { id: 'mechanical', title: 'Mechanical', content: mechanical, isEditing: false },
        { id: 'electrical', title: 'Electrical/Fire Alarm', content: electrical, isEditing: false },
        { id: 'plumbing', title: 'Plumbing', content: plumbing, isEditing: false },
        { id: 'fireProtection', title: 'Fire Protection (Sprinklers/Standpipe)', content: fireProtection, isEditing: false },
      ])
    } catch (error) {
      console.error('Report generation error:', error)
    }
    
    setIsGenerating(false)
  }, [buildEquipmentData, generateSectionNarrative, totalSF, zones.length])
  
  // Update section content
  const updateSection = useCallback((id: string, content: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s))
  }, [])
  
  // Toggle edit mode
  const toggleEdit = useCallback((id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, isEditing: !s.isEditing } : s))
  }, [])
  
  // Handle logo upload
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setLogoUrl(base64)
      companyLogoBase64 = base64.split(',')[1] // Store base64 without data URI prefix
    }
    reader.readAsDataURL(file)
  }, [])
  
  // Export to Word
  const exportToWord = useCallback(async () => {
    if (!currentProject || !results) return
    
    const legacyFixtures = getLegacyFixtureCounts(aggregatedFixtures)
    
    // Create header with logo if available
    const headerChildren: Paragraph[] = []
    
    if (companyLogoBase64) {
      try {
        // Decode base64 to ArrayBuffer for ImageRun
        const binaryString = atob(companyLogoBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        headerChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: bytes,
                transformation: { width: 120, height: 60 },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.LEFT,
          })
        )
      } catch (e) {
        console.error('Logo error:', e)
      }
    }
    
    headerChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'COLLECTIF', bold: true, size: 28 }),
          new TextRun({ text: ' MEP', size: 28 }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    )
    
    // Build fixture schedule table
    const fixtureTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Zone Name', alignment: AlignmentType.LEFT })] }),
          new TableCell({ children: [new Paragraph({ text: 'WCs', alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: 'LAVs', alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: 'Showers', alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: 'Floor Drains', alignment: AlignmentType.CENTER })] }),
        ],
        tableHeader: true,
      }),
      ...zones.filter(z => {
        const lf = getLegacyFixtureCounts(z.fixtures)
        return lf.wcs > 0 || lf.lavs > 0 || lf.showers > 0 || lf.floorDrains > 0
      }).map(z => {
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
    
    // Gas equipment table
    const gasTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Equipment' })] }),
          new TableCell({ children: [new Paragraph({ text: 'MBH', alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: 'CFH', alignment: AlignmentType.RIGHT })] }),
        ],
        tableHeader: true,
      }),
      ...results.gas.equipmentBreakdown.map(eq => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: eq.name })] }),
          new TableCell({ children: [new Paragraph({ text: eq.mbh.toLocaleString(), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: eq.cfh.toLocaleString(), alignment: AlignmentType.RIGHT })] }),
        ],
      })),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: results.gas.totalMBH.toLocaleString(), bold: true })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: results.gas.totalCFH.toLocaleString(), bold: true })], alignment: AlignmentType.RIGHT })] }),
        ],
      }),
    ]
    
    // Electrical load table
    const electricalTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Load Category' })] }),
          new TableCell({ children: [new Paragraph({ text: 'Value', alignment: AlignmentType.RIGHT })] }),
        ],
        tableHeader: true,
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Total Connected Load (kW)' })] }),
          new TableCell({ children: [new Paragraph({ text: results.electrical.totalKW.toLocaleString() + ' kW', alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Total Connected Load (kVA)' })] }),
          new TableCell({ children: [new Paragraph({ text: results.electrical.totalKVA.toLocaleString() + ' kVA', alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Service @ 208V/3PH' })] }),
          new TableCell({ children: [new Paragraph({ text: results.electrical.amps_208v.toLocaleString() + 'A', alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Service @ 480V/3PH' })] }),
          new TableCell({ children: [new Paragraph({ text: results.electrical.amps_480v.toLocaleString() + 'A', alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Recommended Service', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: results.electrical.recommendedService, bold: true })], alignment: AlignmentType.RIGHT })] }),
        ],
      }),
    ]
    
    // Create document
    const doc = new Document({
      sections: [{
        headers: {
          default: new Header({ children: headerChildren }),
        },
        children: [
          // Title Page
          new Paragraph({ text: '', spacing: { after: 400 } }),
          new Paragraph({
            text: 'COLLECTIF',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: projectTitle,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          }),
          ...(projectAddress ? [new Paragraph({
            text: projectAddress,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })] : []),
          new Paragraph({
            text: 'MEP Schematic Design Package',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          new Paragraph({
            text: 'Prepared by:',
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
          ...preparedBy.split('\n').map(line => new Paragraph({
            text: line,
            alignment: AlignmentType.CENTER,
          })),
          new Paragraph({ children: [new PageBreak()] }),
          
          // Table of Contents
          new Paragraph({
            text: 'Contents',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 },
          }),
          new Paragraph({ text: 'Executive Summary', spacing: { after: 100 } }),
          new Paragraph({ text: 'Mechanical', spacing: { after: 100 } }),
          new Paragraph({ text: 'Electrical/Fire Alarm', spacing: { after: 100 } }),
          new Paragraph({ text: 'Plumbing', spacing: { after: 100 } }),
          new Paragraph({ text: 'Fire Protection (Sprinklers/Standpipe)', spacing: { after: 100 } }),
          new Paragraph({ text: 'Appendix: Fixture Schedule', spacing: { after: 100 } }),
          new Paragraph({ text: 'Appendix: Electrical Load Calculator', spacing: { after: 100 } }),
          new Paragraph({ text: 'Appendix: Gas Equipment Schedule', spacing: { after: 100 } }),
          new Paragraph({ children: [new PageBreak()] }),
          
          // Basis of Design
          new Paragraph({
            text: 'Basis of Design',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'The purpose of this report is as follows:',
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: '1. Identify high-level requirements for utility services required for the program, based on the estimated programming spaces.',
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: '2. Identify high-level requirements for Mechanical, Electrical, Fire Alarm, Plumbing, and Fire Protection for all spaces.',
            spacing: { after: 200 },
          }),
          
          // Sections
          ...sections.flatMap(section => [
            new Paragraph({
              text: section.title + ':',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            ...section.content.split('\n').filter(p => p.trim()).map(paragraph => 
              new Paragraph({
                text: paragraph,
                spacing: { after: 100 },
              })
            ),
          ]),
          
          // Appendix: Fixture Schedule
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            text: 'Appendix: Plumbing Fixture Schedule',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
          new Table({
            rows: fixtureTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          
          // Appendix: Electrical
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            text: 'Appendix: Electric Service & Feeder Load Calculator',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: `Project: ${projectTitle}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Voltage: ${currentProject.electricalSettings.voltage}V | Phase: ${currentProject.electricalSettings.phase}`,
            spacing: { after: 200 },
          }),
          new Table({
            rows: electricalTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          
          // Appendix: Gas
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            text: 'Appendix: Gas Equipment Schedule',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
          new Table({
            rows: gasTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }],
    })
    
    // Generate and save
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${projectTitle.replace(/\s+/g, '_')}_SD_Package.docx`)
  }, [currentProject, results, sections, projectTitle, projectAddress, preparedBy, zones, aggregatedFixtures])
  
  // Initialize report on mount
  useEffect(() => {
    if (sections.length === 0 && results) {
      generateReport()
    }
  }, [])
  
  if (!currentProject || !results) {
    return null
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
      <div className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header Bar */}
          <div className="bg-surface-800 rounded-t-xl px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">SD Package Report Generator</h2>
              {isGenerating && (
                <span className="text-sm text-amber-400 animate-pulse">
                  🐐 Generating AI narratives...
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isGenerating ? 'Generating...' : 'Regenerate AI'}
              </button>
              <button
                onClick={exportToWord}
                disabled={sections.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Word
              </button>
              <button
                onClick={onClose}
                className="p-2 text-surface-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Report Preview */}
          <div className="bg-white text-gray-900 rounded-b-xl shadow-2xl overflow-hidden">
            {/* Project Info Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Logo Upload */}
                  <div className="mb-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {logoUrl ? (
                      <div className="flex items-center gap-3">
                        <img src={logoUrl} alt="Company Logo" className="h-16 object-contain" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Change Logo
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-500 rounded-lg text-sm text-slate-300 hover:border-white hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Upload Company Logo
                      </button>
                    )}
                  </div>
                  
                  {/* Project Title */}
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-slate-500 focus:border-white focus:outline-none w-full"
                    placeholder="Project Title"
                  />
                  <input
                    type="text"
                    value={projectAddress}
                    onChange={(e) => setProjectAddress(e.target.value)}
                    className="text-sm text-slate-300 bg-transparent border-b border-transparent hover:border-slate-500 focus:border-white focus:outline-none mt-1 w-full"
                    placeholder="Project Address (optional)"
                  />
                  <p className="text-sm text-slate-400 mt-2">MEP Schematic Design Package</p>
                  <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                
                {/* Summary Stats */}
                <div className="text-right text-sm">
                  <div className="text-slate-300">{totalSF.toLocaleString()} SF</div>
                  <div className="text-slate-400">{zones.length} zones</div>
                </div>
              </div>
              
              {/* Prepared By */}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Prepared by:</p>
                <textarea
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  rows={3}
                  className="text-xs text-slate-300 bg-transparent border border-transparent hover:border-slate-500 focus:border-white focus:outline-none w-full resize-none"
                  placeholder="Team members..."
                />
              </div>
            </div>
            
            {/* Report Sections */}
            {sections.length === 0 ? (
              <div className="px-8 py-16 text-center">
                <div className="text-6xl mb-4">🐐</div>
                <p className="text-gray-500">Click "Regenerate AI" to generate the report sections</p>
              </div>
            ) : (
              sections.map((section, idx) => (
                <section key={section.id} className="px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      {idx + 1}. {section.title}
                    </h2>
                    <button
                      onClick={() => toggleEdit(section.id)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        section.isEditing 
                          ? 'bg-emerald-600 text-white' 
                          : 'text-primary-600 hover:bg-primary-50'
                      }`}
                    >
                      {section.isEditing ? '✓ Done' : '✎ Edit'}
                    </button>
                  </div>
                  
                  {section.isEditing ? (
                    <textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, e.target.value)}
                      className="w-full min-h-[300px] p-4 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none resize-y"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-700">
                      {section.content.split('\n').map((para, i) => (
                        para.trim() ? (
                          <p key={i} className="mb-2 leading-relaxed">{para}</p>
                        ) : null
                      ))}
                    </div>
                  )}
                </section>
              ))
            )}
            
            {/* Quick Reference Tables */}
            {sections.length > 0 && (
              <>
                {/* Fixture Schedule */}
                <section className="px-8 py-6 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Fixture Schedule</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="text-left py-2 px-3 font-semibold">Zone</th>
                          <th className="text-right py-2 px-3 font-semibold">WCs</th>
                          <th className="text-right py-2 px-3 font-semibold">LAVs</th>
                          <th className="text-right py-2 px-3 font-semibold">Showers</th>
                          <th className="text-right py-2 px-3 font-semibold">Floor Drains</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zones.filter(z => {
                          const lf = getLegacyFixtureCounts(z.fixtures)
                          return lf.wcs > 0 || lf.lavs > 0 || lf.showers > 0 || lf.floorDrains > 0
                        }).map((z, i) => {
                          const lf = getLegacyFixtureCounts(z.fixtures)
                          return (
                            <tr key={z.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-2 px-3 font-medium">{z.name}</td>
                              <td className="py-2 px-3 text-right font-mono">{lf.wcs || '-'}</td>
                              <td className="py-2 px-3 text-right font-mono">{lf.lavs || '-'}</td>
                              <td className="py-2 px-3 text-right font-mono">{lf.showers || '-'}</td>
                              <td className="py-2 px-3 text-right font-mono">{lf.floorDrains || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-200 font-semibold">
                          <td className="py-2 px-3">TOTAL</td>
                          <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).wcs}</td>
                          <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).lavs}</td>
                          <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).showers}</td>
                          <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).floorDrains}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
                
                {/* Electrical Summary */}
                <section className="px-8 py-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Electric Service & Feeder Load Calculator</h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 text-gray-600">Project:</td>
                            <td className="py-2 font-medium">{projectTitle}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 text-gray-600">Voltage:</td>
                            <td className="py-2 font-mono">{currentProject.electricalSettings.voltage}V</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 text-gray-600">Phase:</td>
                            <td className="py-2 font-mono">{currentProject.electricalSettings.phase}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 text-gray-600">Total kW:</td>
                            <td className="py-2 font-mono text-right">{results.electrical.totalKW.toLocaleString()}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 text-gray-600">Total kVA:</td>
                            <td className="py-2 font-mono text-right">{results.electrical.totalKVA.toLocaleString()}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 text-gray-600">@ 208V/3PH:</td>
                            <td className="py-2 font-mono text-right">{results.electrical.amps_208v.toLocaleString()}A</td>
                          </tr>
                          <tr className="border-b bg-primary-50">
                            <td className="py-2 font-semibold">Recommended:</td>
                            <td className="py-2 font-mono font-bold text-right text-primary-700">{results.electrical.recommendedService}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
                
                {/* Gas Equipment */}
                {results.gas.equipmentBreakdown.length > 0 && (
                  <section className="px-8 py-6 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Gas Equipment Schedule</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="text-left py-2 px-3">Equipment</th>
                          <th className="text-right py-2 px-3">MBH</th>
                          <th className="text-right py-2 px-3">CFH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.gas.equipmentBreakdown.map((eq, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-2 px-3">{eq.name}</td>
                            <td className="py-2 px-3 text-right font-mono">{eq.mbh.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-mono">{eq.cfh.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-200 font-semibold">
                          <td className="py-2 px-3">TOTAL (w/ {(currentProject.contingency * 100).toFixed(0)}% contingency)</td>
                          <td className="py-2 px-3 text-right font-mono">{results.gas.totalMBH.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{results.gas.totalCFH.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </section>
                )}
              </>
            )}
            
            {/* Footer */}
            <div className="px-8 py-4 bg-gray-100 text-center text-xs text-gray-500">
              <p>Generated by COLLECTIF GOAT MEP Calculator</p>
              <p className="mt-1">© {new Date().getFullYear()} COLLECTIF Engineering PLLC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
