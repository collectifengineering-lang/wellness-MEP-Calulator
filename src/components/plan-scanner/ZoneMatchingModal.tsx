import { useState, useMemo, useEffect } from 'react'
import { ExtractedSpace } from '../../store/useScannerStore'
import { useSettingsStore, DbZoneTypeDefault } from '../../store/useSettingsStore'

interface Props {
  isOpen: boolean
  onClose: () => void
  spaces: ExtractedSpace[]
  onUpdateSpaces: (spaces: ExtractedSpace[]) => void
  onExport: (target: 'concept-mep' | 'hvac' | 'plumbing' | 'electrical') => void
}

type MatchingMode = 'residential' | 'commercial'

// Build AI prompt dynamically from database zone types
const getMatchingPrompt = (mode: MatchingMode, spaceNames: string[], zoneTypes: DbZoneTypeDefault[]) => {
  // Filter zone types based on mode
  const filteredTypes = zoneTypes.filter(zt => {
    const cat = (zt.category || '').toLowerCase()
    if (mode === 'residential') {
      return cat.includes('residential') || cat.includes('general') || 
             ['bedroom', 'living_room', 'kitchen_residential', 'bathroom_residential', 'dining_room', 
              'garage', 'basement', 'home_office', 'closet', 'hallway', 'storage', 'utility_room',
              'laundry_residential'].includes(zt.id)
    }
    // Commercial shows wellness, commercial, and general
    return !cat.includes('residential') || cat.includes('general')
  })
  
  const zoneTypesList = filteredTypes
    .map(zt => `- ${zt.id}: ${zt.display_name}`)
    .join('\n')

  return `
You are matching architectural space names to MEP zone types for ${mode === 'residential' ? 'RESIDENTIAL' : 'COMMERCIAL'} buildings.

SPACES TO MATCH (use 0-based index):
${spaceNames.map((name, i) => `${i}. "${name}"`).join('\n')}

AVAILABLE ZONE TYPES (use the ID before the colon):
${zoneTypesList}

Respond with JSON ONLY - no explanation:
{
  "matches": [
    {"index": 0, "zoneType": "bedroom", "confidence": "high"},
    {"index": 1, "zoneType": "living_room", "confidence": "medium"}
  ]
}

MATCHING RULES:
- "index" is the 0-based position from the spaces list above
- "zoneType" MUST be one of the IDs listed above (the text BEFORE the colon)
- Match EVERY space - provide a match for all ${spaceNames.length} spaces
- For hallways/corridors/foyers, use "hallway" or "lobby"
- For kitchens in ${mode === 'residential' ? 'homes' : 'commercial'}, use "${mode === 'residential' ? 'kitchen_residential' : 'kitchen_commercial'}"
- For bathrooms, use "${mode === 'residential' ? 'bathroom_residential' : 'restroom'}"
- If unsure, pick the closest match - do NOT skip any space
`
}

export default function ZoneMatchingModal({ isOpen, onClose, spaces, onUpdateSpaces, onExport }: Props) {
  const { dbZoneTypeDefaults, fetchZoneTypeDefaults } = useSettingsStore()
  
  const [matchingMode, setMatchingMode] = useState<MatchingMode>('commercial')
  const [isMatching, setIsMatching] = useState(false)
  const [groupedSpaces, setGroupedSpaces] = useState<ExtractedSpace[]>(spaces)
  
  // Fetch zone types on mount
  useEffect(() => {
    if (dbZoneTypeDefaults.length === 0) {
      fetchZoneTypeDefaults()
    }
  }, [dbZoneTypeDefaults.length, fetchZoneTypeDefaults])
  
  // Update grouped spaces when props change
  useEffect(() => {
    setGroupedSpaces(spaces)
  }, [spaces])
  
  // Group zone types by category for dropdown
  const zoneTypesByCategory = useMemo(() => {
    const grouped: Record<string, typeof dbZoneTypeDefaults> = {}
    
    // Filter by mode
    const filtered = dbZoneTypeDefaults.filter(zt => {
      if (matchingMode === 'residential') {
        return zt.category?.toLowerCase().includes('residential') || 
               ['bedroom', 'living_room', 'kitchen_residential', 'bathroom_residential', 'dining_room', 'garage', 'basement', 'home_office'].includes(zt.id)
      }
      return true // Commercial shows all
    })
    
    filtered.forEach(zt => {
      const category = zt.category || 'Other'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(zt)
    })
    return grouped
  }, [dbZoneTypeDefaults, matchingMode])
  
  // Find similar spaces for grouping suggestions
  const groupingSuggestions = useMemo(() => {
    const suggestions: { ids: string[]; reason: string }[] = []
    
    // Group by similar names (same prefix)
    const byPrefix: Record<string, string[]> = {}
    groupedSpaces.forEach(space => {
      const prefix = space.name.toLowerCase().split(/[\s\-_0-9]/)[0]
      if (prefix.length > 2) {
        if (!byPrefix[prefix]) byPrefix[prefix] = []
        byPrefix[prefix].push(space.id)
      }
    })
    
    Object.entries(byPrefix).forEach(([prefix, ids]) => {
      if (ids.length > 1) {
        suggestions.push({ ids, reason: `Similar names: "${prefix}..."` })
      }
    })
    
    // Group by same zone type
    const byType: Record<string, string[]> = {}
    groupedSpaces.forEach(space => {
      if (space.zoneType) {
        if (!byType[space.zoneType]) byType[space.zoneType] = []
        byType[space.zoneType].push(space.id)
      }
    })
    
    Object.entries(byType).forEach(([type, ids]) => {
      if (ids.length > 1 && type !== 'custom') {
        const typeName = dbZoneTypeDefaults.find(zt => zt.id === type)?.display_name || type
        suggestions.push({ ids, reason: `Same type: ${typeName}` })
      }
    })
    
    // Group by same floor
    const byFloor: Record<string, string[]> = {}
    groupedSpaces.forEach(space => {
      const floor = space.floor || 'Unknown'
      if (!byFloor[floor]) byFloor[floor] = []
      byFloor[floor].push(space.id)
    })
    
    return suggestions
  }, [groupedSpaces, dbZoneTypeDefaults])
  
  // AI Zone Matching
  const handleAIMatch = async () => {
    setIsMatching(true)
    
    try {
      const spaceNames = groupedSpaces.map(s => s.name)
      const prompt = getMatchingPrompt(matchingMode, spaceNames, dbZoneTypeDefaults)
      
      console.log('AI Matching prompt:', prompt)
      
      // Try Claude first
      const claudeKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (!claudeKey) {
        console.error('No Claude API key configured')
        return
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      
      if (!response.ok) {
        console.error('AI response not ok:', response.status)
        return
      }
      
      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      console.log('AI Response:', text)
      
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      
      if (!jsonMatch) {
        console.error('No JSON found in response')
        return
      }
      
      const result = JSON.parse(jsonMatch[0])
      console.log('Parsed result:', result)
      
      if (!result.matches || !Array.isArray(result.matches)) {
        console.error('No matches array in result')
        return
      }
      
      // Apply matches to spaces - also apply zone defaults
      const updated = groupedSpaces.map((space, index) => {
        const match = result.matches.find((m: any) => m.index === index)
        if (match?.zoneType) {
          // Verify it's a valid zone type
          const validZoneType = dbZoneTypeDefaults.find(zt => zt.id === match.zoneType)
          if (validZoneType) {
            // Apply zone defaults with fixtures scaled by SF
            const updatedSpace = applyZoneDefaultsToSpace(space, validZoneType)
            return updatedSpace
          } else {
            console.warn(`Invalid zone type: ${match.zoneType} for space ${space.name}`)
          }
        }
        return space
      })
      
      setGroupedSpaces(updated)
      onUpdateSpaces(updated)
      
    } catch (error) {
      console.error('AI matching failed:', error)
    } finally {
      setIsMatching(false)
    }
  }
  
  // Apply zone defaults to a space, scaling fixtures by SF
  const applyZoneDefaultsToSpace = (space: ExtractedSpace, zoneDefault: DbZoneTypeDefault): ExtractedSpace => {
    const defaultFixtures = zoneDefault.default_fixtures || {}
    const defaultEquipment = zoneDefault.default_equipment || []
    
    // Scale fixtures based on SF if there's a typical SF for the zone
    // Most defaults assume ~100 SF, so we scale proportionally
    const baseSF = 100
    const scaleFactor = space.sf / baseSF
    
    // Scale fixtures - but keep at least 1 of each
    const scaledFixtures: Record<string, number> = {}
    Object.entries(defaultFixtures).forEach(([fixtureId, count]) => {
      // For small spaces, keep count as-is; for larger spaces, scale up
      if (space.sf <= 150) {
        scaledFixtures[fixtureId] = count as number
      } else {
        scaledFixtures[fixtureId] = Math.max(1, Math.round((count as number) * scaleFactor))
      }
    })
    
    return {
      ...space,
      zoneType: zoneDefault.id,
      fixtures: scaledFixtures,
      equipment: defaultEquipment
    }
  }
  
  // Update zone type for a space - also apply defaults immediately
  const handleZoneTypeChange = (spaceId: string, zoneType: string) => {
    const zoneDefault = dbZoneTypeDefaults.find(zt => zt.id === zoneType)
    
    const updated = groupedSpaces.map(s => {
      if (s.id !== spaceId) return s
      
      // If we have zone defaults, apply them with scaling
      if (zoneDefault) {
        return applyZoneDefaultsToSpace(s, zoneDefault)
      }
      
      // Otherwise just set the zone type
      return { ...s, zoneType }
    })
    
    setGroupedSpaces(updated)
    onUpdateSpaces(updated)
  }
  
  // Apply zone defaults to a space (button click)
  const applyZoneDefaults = (spaceId: string) => {
    const space = groupedSpaces.find(s => s.id === spaceId)
    if (!space?.zoneType) return
    
    const zoneDefault = dbZoneTypeDefaults.find(zt => zt.id === space.zoneType)
    if (!zoneDefault) return
    
    const updated = groupedSpaces.map(s => {
      if (s.id === spaceId) {
        return applyZoneDefaultsToSpace(s, zoneDefault)
      }
      return s
    })
    
    setGroupedSpaces(updated)
    onUpdateSpaces(updated)
  }
  
  // Apply defaults to all matched spaces
  const applyAllDefaults = () => {
    const updated = groupedSpaces.map(space => {
      if (!space.zoneType) return space
      
      const zoneDefault = dbZoneTypeDefaults.find(zt => zt.id === space.zoneType)
      if (!zoneDefault) return space
      
      return applyZoneDefaultsToSpace(space, zoneDefault)
    })
    
    setGroupedSpaces(updated)
    onUpdateSpaces(updated)
  }
  
  // Combine selected spaces
  const handleCombineSpaces = (selectedIds: string[]) => {
    if (selectedIds.length < 2) return
    
    const spacesToCombine = groupedSpaces.filter(s => selectedIds.includes(s.id))
    const totalSF = spacesToCombine.reduce((sum, s) => sum + s.sf, 0)
    const firstSpace = spacesToCombine[0]
    
    // Find most common zone type
    const typeCount: Record<string, number> = {}
    spacesToCombine.forEach(s => {
      if (s.zoneType) {
        typeCount[s.zoneType] = (typeCount[s.zoneType] || 0) + 1
      }
    })
    const mostCommonType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    
    const combinedSpace: ExtractedSpace = {
      ...firstSpace,
      id: firstSpace.id,
      name: spacesToCombine.map(s => s.name).join(' + '),
      sf: totalSF,
      zoneType: mostCommonType || firstSpace.zoneType,
      fixtures: {},
      equipment: []
    }
    
    // Remove combined spaces and add new one
    const remaining = groupedSpaces.filter(s => !selectedIds.includes(s.id))
    const updated = [...remaining, combinedSpace]
    
    setGroupedSpaces(updated)
    onUpdateSpaces(updated)
  }
  
  // Count matched vs unmatched
  const matchedCount = groupedSpaces.filter(s => s.zoneType && s.zoneType !== 'custom').length
  const unmatchedCount = groupedSpaces.length - matchedCount
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Zone Matching</h2>
            <p className="text-sm text-surface-400 mt-1">
              Match {groupedSpaces.length} spaces to zone types for MEP calculations
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-surface-700 flex items-center justify-between gap-4 flex-wrap">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-surface-400">Mode:</span>
            <div className="flex bg-surface-700 rounded-lg p-1">
              <button
                onClick={() => setMatchingMode('residential')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  matchingMode === 'residential' ? 'bg-emerald-600 text-white' : 'text-surface-400 hover:text-white'
                }`}
              >
                🏠 Residential
              </button>
              <button
                onClick={() => setMatchingMode('commercial')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  matchingMode === 'commercial' ? 'bg-violet-600 text-white' : 'text-surface-400 hover:text-white'
                }`}
              >
                🏢 Commercial
              </button>
            </div>
          </div>
          
          {/* AI Match Button */}
          <button
            onClick={handleAIMatch}
            disabled={isMatching}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {isMatching ? (
              <>
                <span className="animate-spin">🔄</span>
                Matching...
              </>
            ) : (
              <>
                🤖 AI Match All
              </>
            )}
          </button>
          
          {/* Apply Defaults */}
          <button
            onClick={applyAllDefaults}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium"
          >
            ⚡ Apply All Defaults
          </button>
        </div>
        
        {/* Status Bar */}
        <div className="px-6 py-2 border-b border-surface-700 flex items-center gap-4 text-sm">
          <span className="text-emerald-400">✓ {matchedCount} matched</span>
          {unmatchedCount > 0 && (
            <span className="text-amber-400">⚠ {unmatchedCount} unmatched</span>
          )}
          <span className="text-surface-500">
            {groupedSpaces.reduce((sum, s) => sum + s.sf, 0).toLocaleString()} SF total
          </span>
        </div>
        
        {/* Grouping Suggestions */}
        {groupingSuggestions.length > 0 && (
          <div className="px-6 py-2 border-b border-surface-700 bg-surface-700/30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-surface-400">Group suggestions:</span>
              {groupingSuggestions.slice(0, 3).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleCombineSpaces(suggestion.ids)}
                  className="px-2 py-1 bg-surface-600 hover:bg-surface-500 rounded text-xs text-surface-300"
                >
                  {suggestion.reason} ({suggestion.ids.length})
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Spaces List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {groupedSpaces.map(space => {
              const isMatched = space.zoneType && space.zoneType !== 'custom'
              
              return (
                <div
                  key={space.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isMatched
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-surface-700/50 border-surface-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Space Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{space.name}</span>
                        <span className="text-xs text-surface-400">{space.floor}</span>
                      </div>
                      <div className="text-sm text-surface-400">
                        {space.sf.toLocaleString()} SF
                        {Object.keys(space.fixtures).length > 0 && (
                          <span className="ml-2 text-cyan-400">
                            • {Object.values(space.fixtures).reduce((a, b) => a + b, 0)} fixtures
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Zone Type Dropdown */}
                    <select
                      value={space.zoneType || ''}
                      onChange={(e) => handleZoneTypeChange(space.id, e.target.value)}
                      className={`px-3 py-2 rounded-lg text-sm border ${
                        isMatched
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-surface-700 border-surface-600 text-white'
                      } focus:outline-none focus:border-violet-500`}
                    >
                      <option value="">Select zone type...</option>
                      {Object.entries(zoneTypesByCategory).map(([category, types]) => (
                        <optgroup key={category} label={category}>
                          {types.map(zt => (
                            <option key={zt.id} value={zt.id}>{zt.display_name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    
                    {/* Apply Defaults Button */}
                    {isMatched && (
                      <button
                        onClick={() => applyZoneDefaults(space.id)}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs"
                        title="Apply zone defaults"
                      >
                        ⚡
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Footer - Export Options */}
        <div className="px-6 py-4 border-t border-surface-700 bg-surface-800/80">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-400">
              Export matched spaces to:
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExport('concept-mep')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                🏗️ Concept MEP
                <span className="text-xs opacity-70">(as Zones)</span>
              </button>
              <button
                onClick={() => onExport('hvac')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                ❄️ HVAC
              </button>
              <button
                onClick={() => onExport('plumbing')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                🚿 Plumbing
              </button>
              <button
                onClick={() => onExport('electrical')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                ⚡ Electrical
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
