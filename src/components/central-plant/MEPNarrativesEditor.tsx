import { useState, useEffect, useRef } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import type { CalculationResults, MEPNarratives } from '../../types'
import { getLocationById, formatLocationDisplay } from '../../data/ashraeClimate'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

interface MEPNarrativesEditorProps {
  results: CalculationResults
}

interface NarrativeSectionProps {
  title: string
  icon: string
  color: string
  value: string
  onChange: (value: string) => void
  onGenerate: () => Promise<void>
  isGenerating: boolean
  lastGenerated?: Date
  paragraphTarget: number
  placeholder: string
}

/**
 * NarrativeSection with ROBUST local state buffering
 * This prevents the textarea from reverting when global state updates (auto-save, realtime sync)
 * 
 * Key behaviors:
 * - Local state is completely independent of external updates WHILE user has made local changes
 * - Syncs to parent immediately on blur or after 1s debounce
 * - ONLY accepts external updates when:
 *   1. Component mounts (initial value)
 *   2. AI generates new content (detected by significant length change while generating)
 *   3. User has NOT made local changes since last sync
 */
function NarrativeSection({ 
  title, 
  icon, 
  color, 
  value, 
  onChange, 
  onGenerate, 
  isGenerating,
  lastGenerated,
  paragraphTarget,
  placeholder
}: NarrativeSectionProps) {
  // Local state for the textarea - completely decoupled from props while dirty
  const [localValue, setLocalValue] = useState(value)
  const [isDirty, setIsDirty] = useState(false)
  const lastSyncedValue = useRef(value)
  const wasGenerating = useRef(false)
  
  // Track when generation completes to accept new AI content
  useEffect(() => {
    // If we were generating and now we're not, AND value changed significantly
    // This means AI generated new content - accept it
    if (wasGenerating.current && !isGenerating && value !== lastSyncedValue.current) {
      console.log('🤖 AI generation complete - accepting new narrative content')
      setLocalValue(value)
      lastSyncedValue.current = value
      setIsDirty(false)
    }
    wasGenerating.current = isGenerating
  }, [isGenerating, value])
  
  // Only sync from parent when NOT dirty (user hasn't made local changes)
  useEffect(() => {
    if (!isDirty && value !== lastSyncedValue.current) {
      // Only accept external updates if user hasn't edited
      console.log('📥 Syncing narrative from parent (not dirty)')
      setLocalValue(value)
      lastSyncedValue.current = value
    }
  }, [value, isDirty])
  
  // Debounced sync to parent - only when dirty
  useEffect(() => {
    if (!isDirty) return
    
    const timer = setTimeout(() => {
      console.log('💾 Debounced save - syncing narrative to parent')
      onChange(localValue)
      lastSyncedValue.current = localValue
      setIsDirty(false)
    }, 1000) // 1 second debounce
    
    return () => clearTimeout(timer)
  }, [localValue, isDirty, onChange])
  
  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    setIsDirty(true)
  }
  
  const handleBlur = () => {
    // Immediately sync to parent on blur if dirty
    if (isDirty && localValue !== lastSyncedValue.current) {
      console.log('👋 Blur - syncing narrative to parent')
      onChange(localValue)
      lastSyncedValue.current = localValue
      setIsDirty(false)
    }
  }
  
  const paragraphCount = localValue ? localValue.split(/\n\n+/).filter(p => p.trim()).length : 0
  
  return (
    <div className={`bg-gradient-to-br from-${color}-900/30 to-surface-900 rounded-lg border border-${color}-500/30 overflow-hidden`}>
      <div className="px-4 py-3 border-b border-surface-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <h4 className={`text-sm font-semibold text-${color}-400`}>{title}</h4>
            <p className="text-xs text-surface-500">
              {paragraphCount}/{paragraphTarget} paragraphs
              {lastGenerated && (
                <span className="ml-2 text-surface-600">
                  • Last generated: {new Date(lastGenerated).toLocaleDateString()}
                </span>
              )}
              {isDirty && (
                <span className="ml-2 text-amber-500">• Saving...</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            isGenerating 
              ? 'bg-surface-700 text-surface-400 cursor-wait' 
              : `bg-${color}-600/20 text-${color}-400 hover:bg-${color}-600/30 border border-${color}-500/30`
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate
            </span>
          )}
        </button>
      </div>
      <div className="p-4">
        <textarea
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={8}
          className="w-full bg-surface-900/50 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-y min-h-[150px]"
        />
      </div>
    </div>
  )
}

export default function MEPNarrativesEditor({ results }: MEPNarrativesEditorProps) {
  const { currentProject, zones, updateProject } = useProjectStore()
  const [generatingSection, setGeneratingSection] = useState<string | null>(null)
  
  if (!currentProject) return null
  
  const narratives = currentProject.mepNarratives || {
    hvac: '',
    electrical: '',
    plumbing: '',
    fireProtection: ''
  }
  
  const updateNarrative = (field: keyof MEPNarratives, value: string, lastGenerated?: Date) => {
    const currentNarratives = currentProject.mepNarratives || {
      hvac: '',
      electrical: '',
      plumbing: '',
      fireProtection: ''
    }
    
    const updates: MEPNarratives = {
      ...currentNarratives,
      [field]: value
    }
    // If lastGenerated is provided, also set the timestamp
    if (lastGenerated) {
      const timestampField = `${field}LastGenerated` as keyof MEPNarratives
      ;(updates as any)[timestampField] = lastGenerated
    }
    updateProject({
      mepNarratives: updates
    })
  }
  
  const { hvac, electrical, plumbing, dhw } = results
  
  // Get location info for jurisdiction-specific code references
  const ashraeLocation = currentProject.ashraeLocationId 
    ? getLocationById(currentProject.ashraeLocationId) 
    : null
  const locationDisplay = ashraeLocation ? formatLocationDisplay(ashraeLocation) : 'Location not specified'
  const cityState = ashraeLocation 
    ? `${ashraeLocation.name}, ${ashraeLocation.state || ashraeLocation.country}`
    : null
  
  // Build context for AI generation - includes location for jurisdiction-specific codes
  const buildHVACContext = () => `
Project: ${currentProject.name}
Location: ${locationDisplay}
${cityState ? `City/State: ${cityState}` : ''}
Total SF: ${currentProject.targetSF?.toLocaleString() || 'N/A'} SF
HVAC System Type: ${currentProject.mechanicalSettings?.hvacSystemType || 'chiller_ahu'}

HVAC EQUIPMENT DATA:
- Cooling Capacity: ${hvac.totalTons} Tons (${Math.round((currentProject.targetSF || 1) / hvac.totalTons)} SF/Ton)
- Heating Capacity: ${hvac.totalMBH.toLocaleString()} MBH
- Heating Fuel: ${currentProject.mechanicalSettings?.heatingFuelType || 'electric'}
- RTU/AHU Count: ${currentProject.mechanicalSettings?.rtuCount || hvac.rtuCount} units
- Ventilation (OA): ${hvac.totalVentCFM.toLocaleString()} CFM
- Exhaust: ${hvac.totalExhaustCFM.toLocaleString()} CFM
${hvac.dehumidLbHr > 0 ? `- Pool Dehumidification: ${hvac.dehumidLbHr} lb/hr` : ''}
${hvac.poolChillerTons > 0 ? `- Pool Chiller: ${hvac.poolChillerTons} tons` : ''}

Zone Types: ${[...new Set(zones.map(z => z.type))].join(', ')}
Total Zones: ${zones.length}
`.trim()

  const buildElectricalContext = () => `
Project: ${currentProject.name}
Location: ${locationDisplay}
${cityState ? `City/State: ${cityState}` : ''}
Total SF: ${currentProject.targetSF?.toLocaleString() || 'N/A'} SF

ELECTRICAL DATA:
- Total Connected Load: ${electrical.totalKW.toFixed(0)} kW / ${electrical.totalKVA.toFixed(0)} kVA
- Service Size: ${electrical.recommendedService}
- Voltage: ${currentProject.electricalSettings?.voltage || 208}V, ${currentProject.electricalSettings?.phase || 3}-Phase
- Panel Count: ${electrical.panelCount} panels
- Demand Factor: ${(currentProject.electricalSettings?.demandFactor || 0.9) * 100}%

MECHANICAL EQUIPMENT LOADS:
- HVAC: ${hvac.totalTons} tons cooling
- DHW: ${dhw.electricKW > 0 ? `${dhw.electricKW.toFixed(1)} kW electric` : `${dhw.gasCFH} CFH gas`}
`.trim()

  const buildPlumbingContext = () => `
Project: ${currentProject.name}
Location: ${locationDisplay}
${cityState ? `City/State: ${cityState}` : ''}
Total SF: ${currentProject.targetSF?.toLocaleString() || 'N/A'} SF

PLUMBING DATA:
- Total WSFU: ${plumbing.totalWSFU}
- Total DFU: ${plumbing.totalDFU}
- Peak Flow: ${plumbing.peakGPM} GPM
- Cold Water Main: ${plumbing.coldWaterMainSize}
- Hot Water Main: ${plumbing.hotWaterMainSize}
- Recommended Drain: ${plumbing.recommendedDrainSize}

DHW SYSTEM:
- System Type: ${currentProject.dhwSettings?.systemType || 'storage'}
- Heater Type: ${currentProject.dhwSettings?.heaterType || 'gas'}
- Peak Demand: ${dhw.peakGPH} GPH
- Storage: ${dhw.storageGallons} gallons
- Heating Capacity: ${dhw.grossBTU.toLocaleString()} BTU/hr

FIXTURE SUMMARY:
- Total Zones: ${zones.length}
`.trim()

  const buildFireProtectionContext = () => `
Project: ${currentProject.name}
Location: ${locationDisplay}
${cityState ? `City/State: ${cityState}` : ''}
Total SF: ${currentProject.targetSF?.toLocaleString() || 'N/A'} SF

BUILDING DATA:
- Total Zones: ${zones.length}
- Zone Types: ${[...new Set(zones.map(z => z.type))].join(', ')}
${zones.some(z => z.type.includes('pool') || z.type.includes('sauna') || z.type.includes('steam')) ? '- Contains wet/thermal areas requiring special sprinkler considerations' : ''}
${zones.some(z => z.type.includes('kitchen')) ? '- Contains commercial kitchen requiring Ansul/wet chemical system' : ''}
`.trim()

  const generateNarrative = async (
    section: 'hvac' | 'electrical' | 'plumbing' | 'fireProtection',
    context: string,
    paragraphTarget: number
  ) => {
    setGeneratingSection(section)
    
    // Build jurisdiction-specific prompt additions
    const jurisdictionPrompt = cityState 
      ? `\n\nIMPORTANT - JURISDICTION REQUIREMENTS:
The project is located in ${cityState}. You MUST research and include:
- The specific building/mechanical/plumbing/electrical/fire codes applicable to this jurisdiction
- The current energy code requirements (e.g., NYCECC, Title 24, IECC version)
- Any local amendments or special requirements
- The name of the local fire department/authority having jurisdiction
- Any relevant local laws (e.g., NYC Local Law 97 for carbon emissions, LL33/LL154 for EV charging)
- Local utility companies if relevant
- Any special permits or approvals required

Be specific about code editions and local amendments. This is critical for compliance.`
      : `\n\nNote: No specific location provided. Use generic IBC/IMC/IPC/NEC references. Recommend verifying local code requirements.`
    
    // Get narrative background for this section
    const narrativeBackground = currentProject.narrativeBackground || {}
    const backgroundKeyMap = {
      hvac: 'mechanical' as const,
      electrical: 'electrical' as const,
      plumbing: 'plumbing' as const,
      fireProtection: 'fireProtection' as const,
    }
    const backgroundKey = backgroundKeyMap[section]
    const sectionBackground = narrativeBackground[backgroundKey]
    
    // Build user background prompt if provided
    const userBackgroundPrompt = sectionBackground?.trim()
      ? `\n\nIMPORTANT - USER-PROVIDED BACKGROUND INFORMATION:
The following background information was provided by the user. This information TAKES PRECEDENCE over any auto-calculated assumptions or defaults. If there is any conflict between this background and calculated values, USE THE USER'S INFORMATION:

${sectionBackground}

Remember: The user's background information is authoritative. Incorporate it fully into the narrative.`
      : ''
    
    const prompts = {
      hvac: `You are an MEP engineer writing the HVAC section of a concept design report. Write ${paragraphTarget} paragraphs covering:
1. Overview of the HVAC system type and approach
2. Cooling system description and capacity
3. Heating system description and fuel type
4. Ventilation strategy per ASHRAE 62.1
5. Special systems (dehumidification, exhaust, pool areas if applicable)

Use professional engineering language. Reference the SPECIFIC codes applicable to the project location. Be specific about equipment types and capacities.${jurisdictionPrompt}${userBackgroundPrompt}`,
      
      electrical: `You are an MEP engineer writing the Electrical & Fire Alarm section of a concept design report. Write ${paragraphTarget} paragraphs covering:
1. Electrical service and distribution overview (reference LOCAL electrical code)
2. Panelboard and branch circuit strategy
3. Fire alarm system overview (reference LOCAL fire code and fire department requirements)

Use professional engineering language. Reference the SPECIFIC codes applicable to the project location. Include the name of the fire department/authority having jurisdiction.${jurisdictionPrompt}${userBackgroundPrompt}`,
      
      plumbing: `You are an MEP engineer writing the Plumbing section of a concept design report. Write ${paragraphTarget} paragraphs covering:
1. Domestic water service and distribution (reference LOCAL plumbing code)
2. Hot water generation system
3. Sanitary drainage and vent system
4. Special plumbing considerations (grease interceptors, floor drains, specialty fixtures)

Use professional engineering language. Reference the SPECIFIC codes applicable to the project location. Include local water authority requirements if applicable.${jurisdictionPrompt}${userBackgroundPrompt}`,
      
      fireProtection: `You are an MEP engineer writing the Fire Protection section of a concept design report. Write ${paragraphTarget} paragraphs covering:
1. Automatic sprinkler system overview (reference LOCAL fire code and NFPA 13)
2. Special hazard considerations (high-temp heads for thermal areas, wet chemical for kitchens if applicable)
3. Fire department connection and local fire department requirements

Use professional engineering language. Reference the SPECIFIC fire code for the jurisdiction. Include the name of the local fire department and any special approval requirements.${jurisdictionPrompt}${userBackgroundPrompt}`
    }
    
    try {
      if (!ANTHROPIC_API_KEY) {
        // Generate default template without AI - includes warning about generic codes
        const fallbackWarning = `⚠️ FALLBACK TEMPLATE - AI generation unavailable. Please verify local code requirements for ${cityState || 'your jurisdiction'}.\n\n`
        
        const defaults = {
          hvac: `${fallbackWarning}The facility will be served by a ${currentProject.mechanicalSettings?.hvacSystemType?.replace(/_/g, ' ') || 'packaged HVAC'} system providing ${hvac.totalTons} tons of cooling capacity and ${hvac.totalMBH.toLocaleString()} MBH of heating. The system is sized at approximately ${Math.round((currentProject.targetSF || 1) / hvac.totalTons)} SF/ton based on the facility's mixed-use programming.

Heating will be provided via ${currentProject.mechanicalSettings?.heatingFuelType === 'gas' ? 'natural gas-fired equipment' : 'electric resistance and heat pump systems'}. The heating system is sized for design day conditions per ASHRAE climate data for the project location.

Ventilation air will be provided per ASHRAE Standard 62.1 requirements, with ${hvac.totalVentCFM.toLocaleString()} CFM of outdoor air distributed throughout the facility. Variable air volume systems may be considered for energy efficiency where applicable.

Exhaust systems totaling ${hvac.totalExhaustCFM.toLocaleString()} CFM will serve restrooms, locker rooms, and specialty areas. All exhaust will be ducted to exterior with appropriate makeup air provisions.

${hvac.dehumidLbHr > 0 ? `Pool and wet areas will be served by dedicated dehumidification units rated for ${hvac.dehumidLbHr} lb/hr moisture removal with heat recovery capability.` : 'Controls will be building automation system (BAS) compatible with scheduling, setback, and monitoring capabilities.'}

[NOTE: Verify applicable mechanical code, energy code, and local amendments for ${cityState || 'your jurisdiction'}.]`,

          electrical: `${fallbackWarning}The electrical service will be ${electrical.recommendedService} at ${currentProject.electricalSettings?.voltage || 208}V, ${currentProject.electricalSettings?.phase || 3}-phase. Service entrance equipment will include main distribution panel with metering provisions per utility requirements.

Power distribution will consist of approximately ${electrical.panelCount} panelboards serving lighting, receptacles, and mechanical equipment. Branch circuits will be provided per NEC requirements with GFCI and AFCI protection where required.

The fire alarm system will be an addressable system per NFPA 72 requirements. The system will include smoke detectors, heat detectors in applicable areas, manual pull stations, horn/strobe notification appliances, and fire alarm control panel with remote annunciator at the main entrance.

[NOTE: Verify applicable electrical code version, local amendments, fire department requirements, and utility company for ${cityState || 'your jurisdiction'}.]`,

          plumbing: `${fallbackWarning}Domestic water service will be ${plumbing.coldWaterMainSize} entering the building with backflow prevention per local code requirements. The system is sized for ${plumbing.peakGPM} GPM peak demand based on ${plumbing.totalWSFU} total water supply fixture units.

Hot water will be generated by a ${currentProject.dhwSettings?.systemType || 'storage'} ${currentProject.dhwSettings?.heaterType || 'gas'}-fired system with ${dhw.storageGallons} gallons of storage capacity. The system is sized for ${dhw.peakGPH} GPH peak demand with ${dhw.grossBTU.toLocaleString()} BTU/hr recovery capacity.

Sanitary drainage will be provided via a conventional gravity system with ${plumbing.recommendedDrainSize} building drain. The system includes ${plumbing.totalDFU} total drainage fixture units with appropriate venting per code.

${zones.some(z => z.type.includes('kitchen')) ? 'Grease interceptor(s) will be provided for kitchen drainage per local requirements. All kitchen fixtures will drain through the interceptor before connecting to the sanitary system.' : 'Floor drains will be provided in mechanical rooms, restrooms, and service areas with trap primers where required.'}

[NOTE: Verify applicable plumbing code, water authority requirements, and local amendments for ${cityState || 'your jurisdiction'}.]`,

          fireProtection: `${fallbackWarning}An automatic wet pipe sprinkler system will be provided throughout the facility per NFPA 13 requirements. The system will be designed by a licensed fire protection engineer and installed by a licensed contractor. Sprinkler coverage will be provided in all areas with appropriate temperature ratings for each space type.

${zones.some(z => z.type.includes('sauna') || z.type.includes('steam') || z.type.includes('banya')) ? 'High-temperature sprinkler heads (intermediate or high temperature rating) will be provided in sauna, steam room, and thermal areas.' : ''} ${zones.some(z => z.type.includes('kitchen')) ? 'Commercial kitchen areas will be protected by a UL-listed wet chemical suppression system (Ansul or equivalent) in addition to sprinkler coverage.' : 'Fire department connection (FDC) and appropriate signage will be provided per local fire department requirements.'}

[NOTE: Verify local fire code, fire department name (AHJ), and special approval requirements for ${cityState || 'your jurisdiction'}.]`
        }
        
        updateNarrative(section, defaults[section], new Date())
      } else {
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
            max_tokens: 1500,
            messages: [{
              role: 'user',
              content: `${prompts[section]}

PROJECT DATA:
${context}

Write the narrative as professional prose paragraphs. Do not use bullet points or numbered lists. Separate paragraphs with blank lines.`
            }]
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          const narrative = data.content?.[0]?.text || ''
          updateNarrative(section, narrative, new Date())
        } else {
          // API error - fall back to template
          console.error(`API returned ${response.status}: ${response.statusText}`)
          const fallbackWarning = `⚠️ API ERROR - Using fallback template. Please verify local code requirements for ${cityState || 'your jurisdiction'}.\n\n`
          updateNarrative(section, fallbackWarning + 'Generation failed. Please try again or enter content manually.', new Date())
        }
      }
    } catch (error) {
      console.error(`Error generating ${section} narrative:`, error)
    } finally {
      setGeneratingSection(null)
    }
  }
  
  // Generate ALL sections at once - collects results then saves all together
  const generateAllNarratives = async () => {
    setGeneratingSection('all')
    
    const sections: Array<{ 
      section: 'hvac' | 'electrical' | 'plumbing' | 'fireProtection', 
      context: string, 
      paragraphTarget: number 
    }> = [
      { section: 'hvac', context: buildHVACContext(), paragraphTarget: 5 },
      { section: 'electrical', context: buildElectricalContext(), paragraphTarget: 3 },
      { section: 'plumbing', context: buildPlumbingContext(), paragraphTarget: 4 },
      { section: 'fireProtection', context: buildFireProtectionContext(), paragraphTarget: 2 },
    ]
    
    const results: Partial<MEPNarratives> = {}
    const now = new Date()
    
    // Get narrative background for injecting into prompts
    const narrativeBackground = currentProject.narrativeBackground || {}
    const backgroundKeyMap = {
      hvac: 'mechanical' as const,
      electrical: 'electrical' as const,
      plumbing: 'plumbing' as const,
      fireProtection: 'fireProtection' as const,
    }
    
    for (const { section, context, paragraphTarget } of sections) {
      setGeneratingSection(section)
      
      const jurisdictionPrompt = cityState 
        ? `\n\nIMPORTANT - JURISDICTION REQUIREMENTS:
The project is located in ${cityState}. You MUST research and include:
- The specific building/mechanical/plumbing/electrical/fire codes applicable to this jurisdiction
- The current energy code requirements (e.g., NYCECC, Title 24, IECC version)
- Any local amendments or special requirements
- The name of the local fire department/authority having jurisdiction
- Any relevant local laws (e.g., NYC Local Law 97 for carbon emissions, LL33/LL154 for EV charging)
- Local utility companies if relevant
- Any special permits or approvals required

Be specific about code editions and local amendments. This is critical for compliance.`
        : `\n\nNote: No specific location provided. Use generic IBC/IMC/IPC/NEC references. Recommend verifying local code requirements.`
      
      // Get section-specific background info
      const backgroundKey = backgroundKeyMap[section]
      const sectionBackground = narrativeBackground[backgroundKey]
      const userBackgroundPrompt = sectionBackground?.trim()
        ? `\n\nIMPORTANT - USER-PROVIDED BACKGROUND INFORMATION:
The following background information was provided by the user. This information TAKES PRECEDENCE over any auto-calculated assumptions or defaults. If there is any conflict between this background and calculated values, USE THE USER'S INFORMATION:

${sectionBackground}

Remember: The user's background information is authoritative. Incorporate it fully into the narrative.`
        : ''
      
      const prompts: Record<string, string> = {
        hvac: `You are an MEP engineer writing the HVAC section of a concept design report. Write ${paragraphTarget} paragraphs covering:
1. Overview of the HVAC system type and approach
2. Cooling system description and capacity
3. Heating system description and fuel type
4. Ventilation strategy per ASHRAE 62.1
5. Special systems (dehumidification, exhaust, pool areas if applicable)

Use professional engineering language. Reference the SPECIFIC codes applicable to the project location. Be specific about equipment types and capacities.${jurisdictionPrompt}${userBackgroundPrompt}`,
        
        electrical: `You are an MEP engineer writing the Electrical & Fire Alarm section of a concept design report. Write ${paragraphTarget} paragraphs covering:
1. Electrical service and distribution overview (reference LOCAL electrical code)
2. Panelboard and branch circuit strategy
3. Fire alarm system overview (reference LOCAL fire code and fire department requirements)

Use professional engineering language. Reference the SPECIFIC codes applicable to the project location. Include the name of the fire department/authority having jurisdiction.${jurisdictionPrompt}${userBackgroundPrompt}`,
        
        plumbing: `You are an MEP engineer writing the Plumbing section of a concept design report. Write ${paragraphTarget} paragraphs covering:
1. Domestic water service and distribution (reference LOCAL plumbing code)
2. Hot water generation system
3. Sanitary drainage and vent system
4. Special plumbing considerations (grease interceptors, floor drains, specialty fixtures)

Use professional engineering language. Reference the SPECIFIC codes applicable to the project location. Include local water authority requirements if applicable.${jurisdictionPrompt}${userBackgroundPrompt}`,
        
        fireProtection: `You are an MEP engineer writing the Fire Protection section of a concept design report. Write ${paragraphTarget} paragraphs covering:
1. Automatic sprinkler system overview (reference LOCAL fire code and NFPA 13)
2. Special hazard considerations (high-temp heads for thermal areas, wet chemical for kitchens if applicable)
3. Fire department connection and local fire department requirements

Use professional engineering language. Reference the SPECIFIC fire code for the jurisdiction. Include the name of the local fire department and any special approval requirements.${jurisdictionPrompt}${userBackgroundPrompt}`
      }
      
      try {
        if (!ANTHROPIC_API_KEY) {
          // Use fallback templates
          const fallbackWarning = `⚠️ FALLBACK TEMPLATE - AI generation unavailable. Please verify local code requirements for ${cityState || 'your jurisdiction'}.\n\n`
          
          const defaults: Record<string, string> = {
            hvac: `${fallbackWarning}The facility will be served by a ${currentProject.mechanicalSettings?.hvacSystemType?.replace(/_/g, ' ') || 'packaged HVAC'} system providing ${hvac.totalTons} tons of cooling capacity and ${hvac.totalMBH.toLocaleString()} MBH of heating.

Ventilation air will be provided per ASHRAE Standard 62.1 requirements, with ${hvac.totalVentCFM.toLocaleString()} CFM of outdoor air.

Exhaust systems totaling ${hvac.totalExhaustCFM.toLocaleString()} CFM will serve restrooms and specialty areas.

[NOTE: Verify applicable mechanical code for ${cityState || 'your jurisdiction'}.]`,

            electrical: `${fallbackWarning}The electrical service will be ${electrical.recommendedService} at ${currentProject.electricalSettings?.voltage || 208}V, ${currentProject.electricalSettings?.phase || 3}-phase.

Power distribution will consist of approximately ${electrical.panelCount} panelboards.

The fire alarm system will be an addressable system per NFPA 72 requirements.

[NOTE: Verify applicable electrical code for ${cityState || 'your jurisdiction'}.]`,

            plumbing: `${fallbackWarning}Domestic water service will be ${plumbing.coldWaterMainSize} entering the building. Peak demand is ${plumbing.peakGPM} GPM.

Hot water will be generated by a ${currentProject.dhwSettings?.heaterType || 'gas'}-fired system with ${dhw.storageGallons} gallons storage.

Sanitary drainage will be via ${plumbing.recommendedDrainSize} building drain.

[NOTE: Verify applicable plumbing code for ${cityState || 'your jurisdiction'}.]`,

            fireProtection: `${fallbackWarning}An automatic wet pipe sprinkler system will be provided per NFPA 13 requirements.

Fire department connection (FDC) will be provided per local requirements.

[NOTE: Verify local fire code and fire department for ${cityState || 'your jurisdiction'}.]`
          }
          
          results[section] = defaults[section]
          ;(results as any)[`${section}LastGenerated`] = now
        } else {
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
              max_tokens: 1500,
              messages: [{
                role: 'user',
                content: `${prompts[section]}

PROJECT DATA:
${context}

Write the narrative as professional prose paragraphs. Do not use bullet points or numbered lists. Separate paragraphs with blank lines.`
              }]
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            const narrative = data.content?.[0]?.text || ''
            results[section] = narrative
            ;(results as any)[`${section}LastGenerated`] = now
          } else {
            console.error(`API error for ${section}: ${response.status}`)
            results[section] = `⚠️ Generation failed for ${section}. Please try again.`
          }
        }
      } catch (error) {
        console.error(`Error generating ${section}:`, error)
        results[section] = `⚠️ Error generating ${section}. Please try again.`
      }
    }
    
    // Update ALL narratives at once
    const currentNarratives = currentProject.mepNarratives || {
      hvac: '',
      electrical: '',
      plumbing: '',
      fireProtection: ''
    }
    
    updateProject({
      mepNarratives: {
        ...currentNarratives,
        ...results
      } as MEPNarratives
    })
    
    setGeneratingSection(null)
  }
  
  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              📝 MEP Report Narratives
            </h3>
            <p className="text-sm text-surface-400 mt-1">
              Edit or generate narrative sections for each trade. These will appear in the Concept and SD Package reports.
            </p>
          </div>
          <button
            onClick={generateAllNarratives}
            disabled={generatingSection !== null}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate All Sections
          </button>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Location Warning */}
        {!ashraeLocation && (
          <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-4 flex items-start gap-3">
            <span className="text-amber-400 text-xl">⚠️</span>
            <div>
              <p className="text-amber-300 font-medium">No Project Location Set</p>
              <p className="text-amber-400/80 text-sm mt-1">
                Set a location in <strong>Project Info</strong> tab to generate jurisdiction-specific code references, 
                energy code requirements, fire department names, and local utility information.
              </p>
            </div>
          </div>
        )}
        
        {/* Location Display */}
        {ashraeLocation && (
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3">
            <span className="text-emerald-400">📍</span>
            <div className="flex-1">
              <p className="text-emerald-300 text-sm font-medium">{locationDisplay}</p>
              <p className="text-emerald-400/70 text-xs">
                Narratives will include {cityState} jurisdiction codes, fire department, and local requirements.
              </p>
            </div>
          </div>
        )}
        
        {/* HVAC Section */}
        <NarrativeSection
          title="HVAC / Mechanical"
          icon="❄️"
          color="cyan"
          value={narratives.hvac}
          onChange={(v) => updateNarrative('hvac', v)}
          onGenerate={() => generateNarrative('hvac', buildHVACContext(), 5)}
          isGenerating={generatingSection === 'hvac'}
          lastGenerated={narratives.hvacLastGenerated}
          paragraphTarget={5}
          placeholder="Describe the HVAC systems including cooling, heating, ventilation, and any special systems like dehumidification. Aim for 5 paragraphs covering system overview, cooling, heating, ventilation, and special systems."
        />
        
        {/* Electrical Section */}
        <NarrativeSection
          title="Electrical & Fire Alarm"
          icon="⚡"
          color="yellow"
          value={narratives.electrical}
          onChange={(v) => updateNarrative('electrical', v)}
          onGenerate={() => generateNarrative('electrical', buildElectricalContext(), 3)}
          isGenerating={generatingSection === 'electrical'}
          lastGenerated={narratives.electricalLastGenerated}
          paragraphTarget={3}
          placeholder="Describe the electrical service, distribution, and fire alarm system. Aim for 3 paragraphs covering service/distribution, branch circuits, and fire alarm."
        />
        
        {/* Plumbing Section */}
        <NarrativeSection
          title="Plumbing"
          icon="🚿"
          color="blue"
          value={narratives.plumbing}
          onChange={(v) => updateNarrative('plumbing', v)}
          onGenerate={() => generateNarrative('plumbing', buildPlumbingContext(), 4)}
          isGenerating={generatingSection === 'plumbing'}
          lastGenerated={narratives.plumbingLastGenerated}
          paragraphTarget={4}
          placeholder="Describe the domestic water, hot water generation, sanitary drainage, and special plumbing systems. Aim for 4 paragraphs covering cold water, hot water, drainage, and special systems."
        />
        
        {/* Fire Protection Section */}
        <NarrativeSection
          title="Fire Protection"
          icon="🔥"
          color="red"
          value={narratives.fireProtection}
          onChange={(v) => updateNarrative('fireProtection', v)}
          onGenerate={() => generateNarrative('fireProtection', buildFireProtectionContext(), 2)}
          isGenerating={generatingSection === 'fireProtection'}
          lastGenerated={narratives.fireProtectionLastGenerated}
          paragraphTarget={2}
          placeholder="Describe the automatic sprinkler system and any special fire suppression requirements. Aim for 2 paragraphs covering the wet pipe system and special hazards."
        />
      </div>
    </div>
  )
}
