import { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import type { NarrativeBackground } from '../../types'

interface TradeSection {
  key: keyof NarrativeBackground
  title: string
  icon: string
  placeholder: string
}

const TRADE_SECTIONS: TradeSection[] = [
  {
    key: 'mechanical',
    title: 'Mechanical / HVAC',
    icon: '❄️',
    placeholder: `Enter background information for HVAC narrative generation...

Examples:
• Existing HVAC systems to be retained or replaced
• Specific equipment constraints or preferences
• Applicable code requirements beyond standard
• Special ventilation requirements
• Energy efficiency goals (LEED, Passive House, etc.)
• Owner constraints (no natural gas, prefer VRF, etc.)
• Known challenges (limited roof space, noise restrictions)`,
  },
  {
    key: 'electrical',
    title: 'Electrical',
    icon: '⚡',
    placeholder: `Enter background information for electrical narrative generation...

Examples:
• Existing electrical service to be upgraded or retained
• Utility requirements or limitations
• Generator / UPS requirements
• Lighting control requirements
• EV charging provisions
• Special code requirements (Local Law 97, etc.)
• Known constraints (limited electrical room space)`,
  },
  {
    key: 'plumbing',
    title: 'Plumbing',
    icon: '🚿',
    placeholder: `Enter background information for plumbing narrative generation...

Examples:
• Existing plumbing systems to be retained
• Water pressure or supply limitations
• Special fixtures or equipment
• Grease interceptor requirements
• Rainwater harvesting or greywater reuse
• Water heater preferences (heat pump, solar, etc.)
• Known constraints (limited pipe chase space)`,
  },
  {
    key: 'fireProtection',
    title: 'Fire Protection',
    icon: '🔥',
    placeholder: `Enter background information for fire protection narrative generation...

Examples:
• Existing sprinkler system to be modified
• Fire department requirements or preferences
• Special hazard areas (kitchen, data room)
• Fire pump requirements
• Standpipe requirements
• Special suppression systems (clean agent, foam)
• Known challenges (limited fire water supply)`,
  },
]

export default function NarrativeBackgroundSection() {
  const { currentProject, updateProject } = useProjectStore()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [localValues, setLocalValues] = useState<NarrativeBackground>({})

  // Sync local state with project
  useEffect(() => {
    if (currentProject?.narrativeBackground) {
      setLocalValues(currentProject.narrativeBackground)
    }
  }, [currentProject?.narrativeBackground])

  // Debounced save to project
  useEffect(() => {
    if (!currentProject) return
    const timer = setTimeout(() => {
      updateProject({ narrativeBackground: localValues })
    }, 500)
    return () => clearTimeout(timer)
  }, [localValues])

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateField = (key: keyof NarrativeBackground, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }))
  }

  const hasContent = (key: keyof NarrativeBackground) => {
    return !!(localValues[key]?.trim())
  }

  if (!currentProject) return null

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <span>📝</span> MEP Narrative Background Information
      </h3>
      <p className="text-sm text-surface-400 mb-4">
        Provide background information for each trade to improve AI-generated MEP narratives. 
        This information <span className="text-amber-400">takes precedence</span> over auto-generated assumptions 
        when generating report narratives.
      </p>

      <div className="space-y-3">
        {TRADE_SECTIONS.map(section => {
          const isExpanded = expandedSections[section.key]
          const hasValue = hasContent(section.key)
          
          return (
            <div
              key={section.key}
              className={`border rounded-lg transition-colors ${
                hasValue
                  ? 'border-emerald-500/30 bg-emerald-900/10'
                  : 'border-surface-700 bg-surface-900/30'
              }`}
            >
              {/* Section Header (Clickable) */}
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{section.icon}</span>
                  <span className="font-medium text-white">{section.title}</span>
                  {hasValue && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                      Has content
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Section Content (Expandable) */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <textarea
                    value={localValues[section.key] || ''}
                    onChange={(e) => updateField(section.key, e.target.value)}
                    placeholder={section.placeholder}
                    rows={8}
                    className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-600 resize-y min-h-[150px]"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-surface-500">
                    <span>
                      {localValues[section.key]?.length || 0} characters
                    </span>
                    {hasValue && (
                      <button
                        onClick={() => updateField(section.key, '')}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Usage Info */}
      <div className="mt-4 p-3 bg-surface-900/50 rounded-lg border border-surface-700">
        <h4 className="text-sm font-medium text-surface-300 mb-2">💡 How this is used:</h4>
        <ul className="text-xs text-surface-500 space-y-1.5">
          <li>• Background info is included when generating MEP Report Narratives</li>
          <li>• User-provided information <span className="text-amber-400">overrides</span> auto-calculated assumptions</li>
          <li>• Describe existing systems, constraints, code requirements, and scope</li>
          <li>• Free-form text is fine - the AI will extract relevant details</li>
        </ul>
      </div>
    </div>
  )
}
