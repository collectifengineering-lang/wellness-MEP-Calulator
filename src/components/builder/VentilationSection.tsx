/**
 * VentilationSection Component
 * 
 * Handles ASHRAE 62.1/170 ventilation configuration for zones.
 * Features:
 * - ASHRAE space type dropdown (grouped by category)
 * - Auto-calculated occupants (editable)
 * - Ceiling height input
 * - Ventilation/exhaust CFM with unit selector (CFM/sf, CFM, ACH)
 * - Visual indicator for overrides
 * - Purple color scheme for ASHRAE 170 healthcare spaces
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { 
  type ASHRAE62SpaceType,
  type ASHRAE170Space
} from '../../data/ashrae62'
import type { Zone, VentilationUnit, VentilationStandard } from '../../types'
import { useSettingsStore, type DbAshraeSpaceType } from '../../store/useSettingsStore'

interface VentilationSectionProps {
  zone: Zone
  onUpdate: (updates: Partial<Zone>) => void
}

// Helper to convert DB format to ASHRAE62 component format
function dbToAshrae62(db: DbAshraeSpaceType): ASHRAE62SpaceType {
  return {
    id: db.id,
    category: db.category,
    name: db.name,
    displayName: db.display_name,
    Rp: db.rp ?? 0,
    Ra: db.ra ?? 0,
    defaultOccupancy: db.default_occupancy ?? 0,
    airClass: (db.air_class ?? 1) as 1 | 2 | 3,
    notes: db.notes,
    exhaustCfmSf: db.exhaust_cfm_sf,
    exhaustCfmUnit: db.exhaust_cfm_unit,
    exhaustUnitType: db.exhaust_unit_type as any,
    exhaustCfmMin: db.exhaust_cfm_min,
    exhaustCfmMax: db.exhaust_cfm_max,
    exhaustMinPerRoom: db.exhaust_min_per_room,
    exhaustNotes: db.exhaust_notes,
  }
}

// Helper to convert DB format to ASHRAE170 component format
function dbToAshrae170(db: DbAshraeSpaceType): ASHRAE170Space {
  return {
    id: db.id,
    spaceType: db.display_name,
    minTotalACH: db.min_total_ach ?? 0,
    minOAach: db.min_oa_ach ?? 0,
    pressureRelationship: (db.pressure_relationship ?? 'equal') as 'positive' | 'negative' | 'equal',
    allAirExhaust: db.all_air_exhaust ?? false,
    recirculated: db.recirculated ?? true,
    notes: db.notes,
  }
}

// Unit conversion helpers
function cfmToAch(cfm: number, areaSf: number, ceilingHeightFt: number): number {
  const volumeCf = areaSf * ceilingHeightFt
  if (volumeCf === 0) return 0
  return (cfm * 60) / volumeCf
}

function achToCfm(ach: number, areaSf: number, ceilingHeightFt: number): number {
  const volumeCf = areaSf * ceilingHeightFt
  return (ach * volumeCf) / 60
}

function cfmPerSfToCfm(cfmPerSf: number, areaSf: number): number {
  return cfmPerSf * areaSf
}

function cfmToCfmPerSf(cfm: number, areaSf: number): number {
  if (areaSf === 0) return 0
  return cfm / areaSf
}

// Calculate Vbz (breathing zone ventilation) per ASHRAE 62.1
function calculateVbz(spaceType: ASHRAE62SpaceType, occupants: number, areaSf: number): number {
  return (spaceType.Rp * occupants) + (spaceType.Ra * areaSf)
}

// Calculate outdoor air CFM from ASHRAE 170 (uses minOAach, NOT minTotalACH)
function calculateHealthcareOACfm(space: ASHRAE170Space, areaSf: number, ceilingHeightFt: number): number {
  const volumeCf = areaSf * ceilingHeightFt
  // Ventilation (outdoor air) uses minimum outdoor air ACH, not total ACH
  return (space.minOAach * volumeCf) / 60
}

// Calculate total supply CFM from ASHRAE 170 (uses minTotalACH)
function calculateHealthcareTotalCfm(space: ASHRAE170Space, areaSf: number, ceilingHeightFt: number): number {
  const volumeCf = areaSf * ceilingHeightFt
  return (space.minTotalACH * volumeCf) / 60
}

export default function VentilationSection({ zone, onUpdate }: VentilationSectionProps) {
  const { customAshraeSpaceTypes, getZoneDefaults, getAllAshraeSpaceTypes } = useSettingsStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // Get all ASHRAE space types (database first, hardcoded fallback)
  const allDbSpaceTypes = getAllAshraeSpaceTypes()
  
  // Split into 62.1 and 170 types
  const ASHRAE62_SPACE_TYPES = useMemo(() => 
    allDbSpaceTypes.filter(st => st.standard === 'ashrae62').map(dbToAshrae62),
    [allDbSpaceTypes]
  )
  
  const ASHRAE170_SPACES = useMemo(() => 
    allDbSpaceTypes.filter(st => st.standard === 'ashrae170').map(dbToAshrae170),
    [allDbSpaceTypes]
  )
  
  // Get all unique ASHRAE 62.1 categories
  const ASHRAE62_CATEGORIES = useMemo(() => 
    Array.from(new Set(ASHRAE62_SPACE_TYPES.map(st => st.category))).sort(),
    [ASHRAE62_SPACE_TYPES]
  )
  
  // Get zone type defaults to fall back to if zone doesn't have explicit ventilationSpaceType
  const zoneTypeDefaults = getZoneDefaults(zone.type)
  
  // Get current values with defaults
  const ceilingHeight = zone.ceilingHeightFt ?? 10
  const ventilationUnit = zone.ventilationUnit ?? 'cfm'
  const exhaustUnit = zone.exhaustUnit ?? 'cfm'
  const ventilationStandard = zone.ventilationStandard ?? zoneTypeDefaults.defaultVentilationStandard ?? 'ashrae62'
  // Use zone's explicit space type, or fall back to zone type's default
  const spaceTypeId = zone.ventilationSpaceType ?? zoneTypeDefaults.defaultVentilationSpaceType ?? 'office'
  
  // Find current space type (check ASHRAE 62.1, then 170, then custom)
  const ashrae62SpaceType = useMemo(() => 
    ASHRAE62_SPACE_TYPES.find(st => st.id === spaceTypeId),
    [ASHRAE62_SPACE_TYPES, spaceTypeId]
  )
  
  const ashrae170SpaceType = useMemo(() => 
    ASHRAE170_SPACES.find(st => st.id === spaceTypeId),
    [ASHRAE170_SPACES, spaceTypeId]
  )
  
  const customSpaceType = useMemo(() =>
    customAshraeSpaceTypes.find(st => st.id === spaceTypeId),
    [customAshraeSpaceTypes, spaceTypeId]
  )
  
  // Determine if this is a healthcare (ASHRAE 170) space
  const isHealthcareSpace = !!ashrae170SpaceType || ventilationStandard === 'ashrae170'
  
  // Calculate default occupancy based on space type
  const defaultOccupancy = useMemo(() => {
    if (ashrae62SpaceType) {
      // Default occupancy is per 1000 SF
      return Math.ceil((zone.sf / 1000) * ashrae62SpaceType.defaultOccupancy)
    }
    return Math.ceil(zone.sf / 100) // Fallback: 1 person per 100 SF
  }, [ashrae62SpaceType, zone.sf])
  
  const occupants = zone.occupants ?? defaultOccupancy
  
  // Calculate default ventilation (outdoor air) CFM
  const calculatedVentCfm = useMemo(() => {
    if (ashrae170SpaceType) {
      // ASHRAE 170: Use minimum OUTDOOR AIR ACH for ventilation
      return calculateHealthcareOACfm(ashrae170SpaceType, zone.sf, ceilingHeight)
    }
    if (ashrae62SpaceType) {
      return calculateVbz(ashrae62SpaceType, occupants, zone.sf)
    }
    // Fallback to rate-based
    return zone.rates.ventilation_cfm_sf * zone.sf
  }, [ashrae170SpaceType, ashrae62SpaceType, occupants, zone.sf, zone.rates.ventilation_cfm_sf, ceilingHeight])
  
  // Count fixtures for exhaust calculation
  const fixtureCountsForExhaust = useMemo(() => {
    const counts = {
      toilets: 0,
      urinals: 0,
      showers: 0,
      kitchens: 1, // Default 1 kitchen per zone
      rooms: 1,    // Default 1 room
      total: 0
    }
    
    if (!zone.fixtures) {
      // Estimate based on zone type if no fixtures defined
      if (zone.type === 'restroom') {
        counts.toilets = Math.max(1, Math.ceil(zone.sf / 200))
        counts.urinals = Math.ceil(counts.toilets / 2)
      } else if (zone.type === 'locker_room') {
        counts.showers = Math.max(2, Math.ceil(zone.sf / 150))
        counts.toilets = Math.max(1, Math.ceil(zone.sf / 300))
      }
    } else {
      for (const [fixtureId, fixtureCount] of Object.entries(zone.fixtures)) {
        const id = fixtureId.toLowerCase()
        const count = (fixtureCount as number) || 0
        
        if (id.includes('toilet') || id.includes('water closet') || id.includes('wc_')) {
          counts.toilets += count
        } else if (id.includes('urinal')) {
          counts.urinals += count
        } else if (id.includes('shower')) {
          counts.showers += count
        }
      }
    }
    
    counts.total = counts.toilets + counts.urinals + counts.showers
    return counts
  }, [zone.fixtures, zone.type, zone.sf])
  
  // Determine which fixture count to use based on exhaust unit type from ASHRAE space type
  const fixtureCountForExhaust = useMemo(() => {
    const spaceType = ashrae62SpaceType || customSpaceType
    if (!spaceType?.exhaustUnitType) return 0
    
    switch (spaceType.exhaustUnitType) {
      case 'shower':
        return fixtureCountsForExhaust.showers || Math.max(1, Math.ceil(zone.sf / 150))
      case 'toilet':
      case 'urinal':
        return fixtureCountsForExhaust.toilets + fixtureCountsForExhaust.urinals || Math.max(1, Math.ceil(zone.sf / 200))
      case 'kitchen':
        return fixtureCountsForExhaust.kitchens
      case 'room':
        return fixtureCountsForExhaust.rooms
      default:
        return fixtureCountsForExhaust.total
    }
  }, [ashrae62SpaceType, customSpaceType, fixtureCountsForExhaust, zone.sf])
  
  // Calculate default exhaust CFM from ASHRAE space type
  const calculatedExhaustCfm = useMemo(() => {
    // ASHRAE 170 healthcare - all air exhaust
    if (ashrae170SpaceType && ashrae170SpaceType.allAirExhaust) {
      return calculateHealthcareTotalCfm(ashrae170SpaceType, zone.sf, ceilingHeight)
    }
    
    // Get exhaust from ASHRAE 62.1 space type (now includes Table 6-2 data)
    const spaceType = ashrae62SpaceType || customSpaceType
    if (spaceType) {
      let exhaustCfm = 0
      
      // Area-based exhaust (CFM/SF)
      if (spaceType.exhaustCfmSf) {
        exhaustCfm += spaceType.exhaustCfmSf * zone.sf
      }
      
      // Fixture-based exhaust (CFM/unit) - use continuous rate by default
      if (spaceType.exhaustCfmUnit && spaceType.exhaustUnitType) {
        const rate = spaceType.exhaustCfmMin || spaceType.exhaustCfmUnit
        const fixtureExhaust = fixtureCountForExhaust * rate
        
        // Apply minimum per room if specified
        if (spaceType.exhaustMinPerRoom) {
          exhaustCfm += Math.max(spaceType.exhaustMinPerRoom, fixtureExhaust)
        } else {
          exhaustCfm += fixtureExhaust
        }
      }
      
      if (exhaustCfm > 0) return exhaustCfm
    }
    
    // Fallback to rate-based from zone
    return zone.rates.exhaust_cfm_sf * zone.sf
  }, [ashrae170SpaceType, ashrae62SpaceType, customSpaceType, fixtureCountForExhaust, zone.sf, zone.rates.exhaust_cfm_sf, ceilingHeight])
  
  // Generate exhaust formula explanation from ASHRAE space type
  const exhaustFormula = useMemo(() => {
    if (zone.exhaustOverride) return null
    
    // ASHRAE 170 healthcare
    if (ashrae170SpaceType && ashrae170SpaceType.allAirExhaust) {
      const volume = zone.sf * ceilingHeight
      return {
        text: `${ashrae170SpaceType.minTotalACH} ACH × ${volume.toLocaleString()} CF / 60 = ${calculatedExhaustCfm.toFixed(0)} CFM`,
        note: 'All air exhaust required',
        color: 'text-purple-400',
        hasMinMax: false
      }
    }
    
    // Get exhaust from ASHRAE 62.1 space type
    const spaceType = ashrae62SpaceType || customSpaceType
    if (spaceType) {
      const parts: string[] = []
      let hasMinMax = false
      let minCfm = 0
      let maxCfm = 0
      
      // Area-based exhaust
      if (spaceType.exhaustCfmSf) {
        parts.push(`${spaceType.exhaustCfmSf} CFM/SF × ${zone.sf.toLocaleString()} SF`)
      }
      
      // Fixture-based exhaust
      if (spaceType.exhaustCfmUnit && spaceType.exhaustUnitType) {
        hasMinMax = spaceType.exhaustCfmMin !== undefined && spaceType.exhaustCfmMax !== undefined
        const minRate = spaceType.exhaustCfmMin || spaceType.exhaustCfmUnit
        const maxRate = spaceType.exhaustCfmMax || spaceType.exhaustCfmUnit
        
        // Get fixture label
        const unitLabels: Record<string, string> = {
          'toilet': 'WC/urinal',
          'urinal': 'urinal',
          'shower': 'showerhead',
          'kitchen': 'kitchen',
          'room': 'room'
        }
        const label = unitLabels[spaceType.exhaustUnitType] || 'fixture'
        const pluralLabel = fixtureCountForExhaust === 1 ? label : `${label}s`
        
        if (hasMinMax) {
          parts.push(`${minRate}-${maxRate} CFM × ${fixtureCountForExhaust} ${pluralLabel}`)
          minCfm = fixtureCountForExhaust * minRate
          maxCfm = fixtureCountForExhaust * maxRate
          
          // Apply minimum per room
          if (spaceType.exhaustMinPerRoom) {
            minCfm = Math.max(spaceType.exhaustMinPerRoom, minCfm)
            maxCfm = Math.max(spaceType.exhaustMinPerRoom, maxCfm)
          }
        } else {
          parts.push(`${spaceType.exhaustCfmUnit} CFM × ${fixtureCountForExhaust} ${pluralLabel}`)
        }
      }
      
      if (parts.length > 0) {
        return {
          text: parts.join(' + ') + (hasMinMax ? '' : ` = ${calculatedExhaustCfm.toFixed(0)} CFM`),
          note: spaceType.exhaustNotes,
          color: spaceType.exhaustUnitType ? 'text-cyan-400' : 'text-surface-500',
          hasMinMax,
          minCfm: hasMinMax ? minCfm : undefined,
          maxCfm: hasMinMax ? maxCfm : undefined,
          fixtureCount: fixtureCountForExhaust
        }
      }
    }
    
    // Rate-based fallback
    if (zone.rates.exhaust_cfm_sf > 0) {
      return {
        text: `${zone.rates.exhaust_cfm_sf} CFM/SF × ${zone.sf.toLocaleString()} SF = ${calculatedExhaustCfm.toFixed(0)} CFM`,
        note: 'Rate-based (legacy)',
        color: 'text-surface-500',
        hasMinMax: false
      }
    }
    
    return null
  }, [zone.exhaustOverride, ashrae170SpaceType, ashrae62SpaceType, customSpaceType, fixtureCountForExhaust, zone.sf, zone.rates.exhaust_cfm_sf, ceilingHeight, calculatedExhaustCfm])
  
  // Current ventilation/exhaust values (use override if set, otherwise calculated)
  const ventilationCfm = zone.ventilationCfm ?? calculatedVentCfm
  const exhaustCfm = zone.exhaustCfm ?? calculatedExhaustCfm
  
  // SYNC calculated values to zone - but with safeguards to prevent infinite loops
  // Use refs to track last synced values and only update when meaningfully changed
  const lastSyncedVent = useRef<number | null>(null)
  const lastSyncedExh = useRef<number | null>(null)
  
  useEffect(() => {
    // Only sync if NOT in override mode (user/pool hasn't manually set values)
    if (zone.ventilationOverride) return
    
    // Round to avoid floating point comparison issues
    const roundedVent = Math.round(calculatedVentCfm)
    const roundedExh = Math.round(calculatedExhaustCfm)
    
    // Only update if values have actually changed
    if (lastSyncedVent.current !== roundedVent || lastSyncedExh.current !== roundedExh) {
      lastSyncedVent.current = roundedVent
      lastSyncedExh.current = roundedExh
      
      // Batch the update
      onUpdate({ 
        ventilationCfm: roundedVent, 
        exhaustCfm: roundedExh 
      })
    }
  }, [calculatedVentCfm, calculatedExhaustCfm, zone.ventilationOverride])
  // NOTE: onUpdate intentionally NOT in deps - it's stable from parent
  
  // Convert to display units
  const getDisplayValue = (cfm: number, unit: VentilationUnit): number => {
    switch (unit) {
      case 'cfm_sf':
        return cfmToCfmPerSf(cfm, zone.sf)
      case 'ach':
        return cfmToAch(cfm, zone.sf, ceilingHeight)
      case 'cfm':
      default:
        return cfm
    }
  }
  
  // Convert from display units to CFM
  const fromDisplayValue = (value: number, unit: VentilationUnit): number => {
    switch (unit) {
      case 'cfm_sf':
        return cfmPerSfToCfm(value, zone.sf)
      case 'ach':
        return achToCfm(value, zone.sf, ceilingHeight)
      case 'cfm':
      default:
        return value
    }
  }
  
  // Filter space types by search
  const filteredSpaceTypes = useMemo(() => {
    const query = searchQuery.toLowerCase()
    if (!query) return null // Show all when no search
    
    const filtered62 = ASHRAE62_SPACE_TYPES.filter(st =>
      st.displayName.toLowerCase().includes(query) ||
      st.category.toLowerCase().includes(query)
    )
    
    const filtered170 = ASHRAE170_SPACES.filter(st =>
      st.spaceType.toLowerCase().includes(query)
    )
    
    const filteredCustom = customAshraeSpaceTypes.filter(st =>
      st.displayName.toLowerCase().includes(query) ||
      st.category.toLowerCase().includes(query)
    )
    
    return { ashrae62: filtered62, ashrae170: filtered170, custom: filteredCustom }
  }, [searchQuery, customAshraeSpaceTypes])
  
  // Handle space type selection
  const handleSpaceTypeSelect = (id: string, standard: VentilationStandard) => {
    if (id === 'custom') {
      // Custom mode: Enable overrides with current calculated values as starting point
      onUpdate({
        ventilationSpaceType: undefined, // Clear ASHRAE type
        ventilationStandard: 'custom',
        ventilationOverride: true,
        exhaustOverride: true,
        ventilationCfm: calculatedVentCfm, // Start with current calculated value
        exhaustCfm: calculatedExhaustCfm,
      })
    } else {
      onUpdate({
        ventilationSpaceType: id,
        ventilationStandard: standard,
        ventilationOverride: false,
        exhaustOverride: false,
        ventilationCfm: undefined, // Reset to auto-calculate
        exhaustCfm: undefined,
        occupants: undefined, // Reset to default
      })
    }
    setIsDropdownOpen(false)
    setSearchQuery('')
  }
  
  // Check if in custom/manual mode
  const isCustomMode = !zone.ventilationSpaceType && zone.ventilationOverride
  
  // Handle ventilation value change
  const handleVentilationChange = (value: number) => {
    const cfm = fromDisplayValue(value, ventilationUnit)
    onUpdate({
      ventilationCfm: cfm,
      ventilationOverride: true,
    })
  }
  
  // Handle exhaust value change
  const handleExhaustChange = (value: number) => {
    const cfm = fromDisplayValue(value, exhaustUnit)
    onUpdate({
      exhaustCfm: cfm,
      exhaustOverride: true,
    })
  }
  
  // Get display name for current space type
  const currentSpaceTypeName = useMemo(() => {
    if (isCustomMode) return 'Custom Values (Manual Entry)'
    if (ashrae62SpaceType) return ashrae62SpaceType.displayName
    if (ashrae170SpaceType) return ashrae170SpaceType.spaceType
    if (customSpaceType) return customSpaceType.displayName
    return 'Select Space Type'
  }, [isCustomMode, ashrae62SpaceType, ashrae170SpaceType, customSpaceType])
  
  return (
    <div className={`rounded-lg border p-4 space-y-4 ${
      isCustomMode
        ? 'bg-amber-900/20 border-amber-500/30'
        : isHealthcareSpace 
          ? 'bg-purple-900/20 border-purple-500/30' 
          : 'bg-surface-800/50 border-surface-700'
    }`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-medium ${
          isCustomMode ? 'text-amber-300' : 
          isHealthcareSpace ? 'text-purple-300' : 'text-surface-300'
        }`}>
          {isCustomMode ? '💨 Ventilation (Custom Values)' : 
           `💨 Ventilation (ASHRAE ${isHealthcareSpace ? '170' : '62.1'})`}
        </h4>
        {isCustomMode && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
            Manual Entry
          </span>
        )}
        {!isCustomMode && zone.ventilationOverride && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
            Override
          </span>
        )}
      </div>
      
      {/* Space Type Dropdown */}
      <div className="relative">
        <label className="block text-xs text-surface-400 mb-1">Ventilation Space Type</label>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
            isHealthcareSpace
              ? 'bg-purple-900/30 border-purple-500/50 text-purple-200'
              : 'bg-surface-900 border-surface-600 text-surface-200'
          } hover:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
        >
          <div className="flex items-center justify-between">
            <span>{currentSpaceTypeName}</span>
            <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        
        {isDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto bg-surface-900 border border-surface-600 rounded-lg shadow-xl">
            {/* Search */}
            <div className="sticky top-0 bg-surface-900 p-2 border-b border-surface-700">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search space types..."
                className="w-full px-3 py-2 text-sm bg-surface-800 border border-surface-600 rounded text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            </div>
            
            {/* Custom option */}
            <button
              type="button"
              onClick={() => handleSpaceTypeSelect('custom', 'custom')}
              className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:bg-surface-800"
            >
              Custom (Manual Entry)
            </button>
            
            {/* ASHRAE 170 Healthcare (Purple) */}
            <div className="border-t border-purple-500/30">
              <div className="px-3 py-1.5 text-xs font-semibold text-purple-400 bg-purple-900/30">
                Healthcare (ASHRAE 170)
              </div>
              {(filteredSpaceTypes?.ashrae170 ?? ASHRAE170_SPACES).map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSpaceTypeSelect(st.id, 'ashrae170')}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-900/30 ${
                    spaceTypeId === st.id ? 'bg-purple-900/50 text-purple-200' : 'text-purple-300'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{st.spaceType}</span>
                    <span className="text-purple-400 text-xs">{st.minTotalACH} ACH</span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* ASHRAE 62.1 Categories */}
            {ASHRAE62_CATEGORIES.map(category => {
              const categoryTypes = filteredSpaceTypes?.ashrae62 
                ? filteredSpaceTypes.ashrae62.filter(st => st.category === category)
                : ASHRAE62_SPACE_TYPES.filter(st => st.category === category)
              
              if (categoryTypes.length === 0) return null
              
              return (
                <div key={category} className="border-t border-surface-700">
                  <div className="px-3 py-1.5 text-xs font-semibold text-surface-400 bg-surface-800/50">
                    {category}
                  </div>
                  {categoryTypes.map(st => {
                    // Build exhaust info string
                    const exhaustParts: string[] = []
                    if (st.exhaustCfmSf) exhaustParts.push(`${st.exhaustCfmSf} CFM/SF`)
                    if (st.exhaustCfmUnit) {
                      const unitLabel = st.exhaustUnitType === 'toilet' ? '/WC' : 
                                       st.exhaustUnitType === 'shower' ? '/shwr' : 
                                       st.exhaustUnitType === 'kitchen' ? '/kit' : '/unit'
                      if (st.exhaustCfmMin && st.exhaustCfmMax) {
                        exhaustParts.push(`${st.exhaustCfmMin}-${st.exhaustCfmMax}${unitLabel}`)
                      } else {
                        exhaustParts.push(`${st.exhaustCfmUnit}${unitLabel}`)
                      }
                    }
                    const hasExhaust = exhaustParts.length > 0
                    
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSpaceTypeSelect(st.id, 'ashrae62')}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-800 ${
                          spaceTypeId === st.id ? 'bg-primary-900/30 text-primary-200' : 'text-surface-300'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="flex-1">{st.displayName}</span>
                          <div className="text-right text-xs space-y-0.5">
                            <div className="text-surface-500">
                              {st.Rp > 0 ? `${st.Rp}p` : ''}{st.Ra > 0 ? `+${st.Ra}sf` : ''}
                            </div>
                            {hasExhaust && (
                              <div className="text-red-400">
                                EXH: {exhaustParts.join('+')}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
            
            {/* Custom Space Types */}
            {customAshraeSpaceTypes.length > 0 && (
              <div className="border-t border-surface-700">
                <div className="px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-900/20">
                  Custom Space Types
                </div>
                {(filteredSpaceTypes?.custom ?? customAshraeSpaceTypes).map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSpaceTypeSelect(st.id, st.standard)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-800 ${
                      spaceTypeId === st.id ? 'bg-amber-900/30 text-amber-200' : 'text-surface-300'
                    }`}
                  >
                    {st.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Occupants & Ceiling Height */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-surface-400 mb-1">
            Occupants
            {zone.occupants === undefined && (
              <span className="text-surface-500 ml-1">(auto)</span>
            )}
          </label>
          <input
            type="number"
            value={occupants}
            onChange={(e) => onUpdate({ occupants: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm bg-surface-900 border border-surface-600 rounded-lg text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            min={0}
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">Ceiling Height (ft)</label>
          <input
            type="number"
            value={ceilingHeight}
            onChange={(e) => onUpdate({ ceilingHeightFt: parseFloat(e.target.value) || 10 })}
            className="w-full px-3 py-2 text-sm bg-surface-900 border border-surface-600 rounded-lg text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            min={6}
            max={50}
            step={0.5}
          />
        </div>
      </div>
      
      {/* Ventilation CFM */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`text-xs ${isHealthcareSpace ? 'text-purple-400' : 'text-surface-400'}`}>
            Ventilation
            {!zone.ventilationOverride && (
              <span className="text-surface-500 ml-1">(calculated)</span>
            )}
          </label>
          <select
            value={ventilationUnit}
            onChange={(e) => onUpdate({ ventilationUnit: e.target.value as VentilationUnit })}
            className="text-xs bg-surface-800 border border-surface-600 rounded px-2 py-1 text-surface-300"
          >
            <option value="cfm">CFM</option>
            <option value="cfm_sf">CFM/SF</option>
            <option value="ach">ACH</option>
          </select>
        </div>
        <input
          type="number"
          value={getDisplayValue(ventilationCfm, ventilationUnit).toFixed(ventilationUnit === 'cfm' ? 0 : 2)}
          onChange={(e) => handleVentilationChange(parseFloat(e.target.value) || 0)}
          className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 ${
            isHealthcareSpace
              ? 'bg-purple-900/30 border border-purple-500/50 text-purple-200 focus:ring-purple-500/50'
              : zone.ventilationOverride
                ? 'bg-amber-900/20 border border-amber-500/30 text-amber-200 focus:ring-amber-500/50'
                : 'bg-surface-900 border border-surface-600 text-surface-200 focus:ring-primary-500/50'
          }`}
          min={0}
          step={ventilationUnit === 'cfm' ? 10 : 0.01}
        />
        {ashrae62SpaceType && !zone.ventilationOverride && (
          <p className="text-xs text-surface-500 mt-1">
            Vbz = ({ashrae62SpaceType.Rp} × {occupants}) + ({ashrae62SpaceType.Ra} × {zone.sf}) = {calculatedVentCfm.toFixed(0)} CFM
          </p>
        )}
        {ashrae170SpaceType && !zone.ventilationOverride && (
          <p className="text-xs text-purple-400 mt-1">
            {ashrae170SpaceType.minOAach} OA ACH × {(zone.sf * ceilingHeight).toLocaleString()} CF / 60 = {calculatedVentCfm.toFixed(0)} CFM
            <span className="text-purple-500 ml-1">• Outdoor Air</span>
          </p>
        )}
      </div>
      
      {/* Exhaust CFM */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`text-xs ${isHealthcareSpace ? 'text-purple-400' : 'text-surface-400'}`}>
            Exhaust
            {!zone.exhaustOverride && (
              <span className="text-surface-500 ml-1">(calculated)</span>
            )}
          </label>
          <select
            value={exhaustUnit}
            onChange={(e) => onUpdate({ exhaustUnit: e.target.value as VentilationUnit })}
            className="text-xs bg-surface-800 border border-surface-600 rounded px-2 py-1 text-surface-300"
          >
            <option value="cfm">CFM</option>
            <option value="cfm_sf">CFM/SF</option>
            <option value="ach">ACH</option>
          </select>
        </div>
        <input
          type="number"
          value={getDisplayValue(exhaustCfm, exhaustUnit).toFixed(exhaustUnit === 'cfm' ? 0 : 2)}
          onChange={(e) => handleExhaustChange(parseFloat(e.target.value) || 0)}
          className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 ${
            isHealthcareSpace
              ? 'bg-purple-900/30 border border-purple-500/50 text-purple-200 focus:ring-purple-500/50'
              : zone.exhaustOverride
                ? 'bg-amber-900/20 border border-amber-500/30 text-amber-200 focus:ring-amber-500/50'
                : (ashrae62SpaceType?.exhaustCfmUnit || customSpaceType?.exhaustCfmUnit)
                  ? 'bg-cyan-900/20 border border-cyan-500/30 text-cyan-200 focus:ring-cyan-500/50'
                  : 'bg-surface-900 border border-surface-600 text-surface-200 focus:ring-primary-500/50'
          }`}
          min={0}
          step={exhaustUnit === 'cfm' ? 10 : 0.01}
        />
        {exhaustFormula && (
          <div className="mt-1">
            <p className={`text-xs ${exhaustFormula.color}`}>
              {exhaustFormula.text}
            </p>
            {exhaustFormula.hasMinMax && exhaustFormula.minCfm !== undefined && exhaustFormula.maxCfm !== undefined && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-surface-500">Range:</span>
                <span className="text-xs font-medium text-green-400">{exhaustFormula.minCfm} CFM</span>
                <span className="text-xs text-surface-500">→</span>
                <span className="text-xs font-medium text-amber-400">{exhaustFormula.maxCfm} CFM</span>
                <span className="text-xs text-surface-500">(continuous → intermittent)</span>
              </div>
            )}
            {exhaustFormula.note && (
              <p className="text-xs text-surface-500 mt-0.5">
                {exhaustFormula.note}
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Healthcare-specific info */}
      {ashrae170SpaceType && (
        <div className="text-xs text-purple-400 bg-purple-900/20 rounded p-2 space-y-1">
          <div className="flex justify-between">
            <span>Min Total ACH:</span>
            <span className="font-mono">{ashrae170SpaceType.minTotalACH}</span>
          </div>
          <div className="flex justify-between">
            <span>Min Outdoor Air ACH:</span>
            <span className="font-mono">{ashrae170SpaceType.minOAach}</span>
          </div>
          <div className="flex justify-between">
            <span>Pressure:</span>
            <span className="font-mono capitalize">{ashrae170SpaceType.pressureRelationship}</span>
          </div>
          <div className="flex justify-between">
            <span>Recirculation:</span>
            <span className="font-mono">{ashrae170SpaceType.recirculated ? 'Allowed' : 'Not Allowed'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
