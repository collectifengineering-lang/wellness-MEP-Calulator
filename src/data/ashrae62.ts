/**
 * ASHRAE 62.1-2022 Ventilation Type Definitions
 * 
 * NOTE: All data is stored in the database (ashrae_space_types table).
 * These are TYPE DEFINITIONS ONLY - no hardcoded data.
 * Use useSettingsStore.getAllAshraeSpaceTypes() to get data.
 */

// ============================================
// ASHRAE 62.1 Space Type Interface
// ============================================

export interface ASHRAE62SpaceType {
  id: string
  category: string
  name: string
  displayName: string
  // Ventilation mode: determines which rates to use
  ventilationMode?: 'cfm_rates' | 'ach' | 'ach_healthcare'
  // People outdoor air rate (CFM per person)
  Rp: number
  // Area outdoor air rate (CFM per sq ft)
  Ra: number
  // ACH-based ventilation (for wellness spaces like saunas)
  ventilationAch?: number
  exhaustAch?: number
  // Default occupant density (people per 1000 sq ft)
  defaultOccupancy: number
  // Air class (1 = low contaminants, 2 = moderate, 3 = high)
  airClass: 1 | 2 | 3
  // Notes
  notes?: string
  // Exhaust requirements (Table 6-2)
  exhaustCfmSf?: number
  exhaustCfmUnit?: number
  exhaustUnitType?: 'toilet' | 'urinal' | 'shower' | 'room' | 'kitchen'
  exhaustCfmMin?: number
  exhaustCfmMax?: number
  exhaustMinPerRoom?: number
  exhaustNotes?: string
  exhaustFixturesPerSf?: {
    wcs?: number
    urinals?: number
    showers?: number
  }
}

// ============================================
// ASHRAE 170 Healthcare Space Interface
// ============================================

export interface ASHRAE170Space {
  id: string
  spaceType: string
  minTotalACH: number
  minOAach: number
  pressureRelationship: 'positive' | 'negative' | 'equal'
  allAirExhaust: boolean
  recirculated: boolean
  notes?: string
}

// ============================================
// Zone Air Distribution Effectiveness (Ez)
// ============================================

export interface EzConfiguration {
  id: string
  description: string
  ez: number
  notes?: string
}

// ============================================
// Exhaust Requirements Interface
// ============================================

export interface ExhaustRequirement {
  id: string
  spaceType: string
  exhaustRate: number
  unit: 'cfm_sf' | 'cfm_unit' | 'cfm_room' | 'ach'
  perUnitType?: string
  exhaustRateIntermittent?: number
  exhaustRateContinuous?: number
  notes?: string
}

// ============================================
// Ez values (rarely change, keep hardcoded)
// ============================================

export const ZONE_EZ_VALUES: EzConfiguration[] = [
  { id: 'CS', description: 'Ceiling supply of cool air', ez: 1.0 },
  { id: 'CSFR', description: 'Ceiling supply of warm air and floor return', ez: 1.0 },
  { id: 'CSCRH', description: 'Ceiling supply of warm air 15°F+ above space temp, ceiling return', ez: 0.8 },
  { id: 'CSCRW', description: 'Ceiling supply of warm air <15°F above space temp, ceiling return', ez: 0.8 },
  { id: 'FSCR', description: 'Floor supply of cool air, ceiling return (>50 fpm at 4.5ft)', ez: 1.0 },
  { id: 'FSCR_LV', description: 'Floor supply, low-velocity displacement or UFAD', ez: 1.2 },
  { id: 'FSFR', description: 'Floor supply of warm air, floor return', ez: 1.0 },
  { id: 'FSCRW', description: 'Floor supply of warm air, ceiling return', ez: 0.7 },
  { id: 'MUEX', description: 'Makeup supply opposite side from exhaust', ez: 0.8 },
  { id: 'MU_EX', description: 'Makeup supply near exhaust', ez: 0.5 },
]

/**
 * Get Ez value by configuration ID
 */
export function getEzValue(configId: string): number {
  const config = ZONE_EZ_VALUES.find(ez => ez.id === configId)
  return config?.ez ?? 1.0
}

// ============================================
// DATABASE-BACKED HELPER FUNCTIONS
// These functions get data from Supabase via the settings store
// ============================================

import { useSettingsStore } from '../store/useSettingsStore'

// Get all ASHRAE 62.1 space types from database
export function getAshrae62SpaceTypes(): ASHRAE62SpaceType[] {
  const store = useSettingsStore.getState()
  const dbTypes = store.getAshrae62SpaceTypes()
  
  // Convert DB format to component format
  return dbTypes.map(db => ({
    id: db.id,
    category: db.category,
    name: db.name,
    displayName: db.display_name,
    ventilationMode: db.ventilation_mode as 'cfm_rates' | 'ach' | 'ach_healthcare' | undefined,
    Rp: db.rp ?? 0,
    Ra: db.ra ?? 0,
    ventilationAch: db.ventilation_ach,
    exhaustAch: db.exhaust_ach,
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
  }))
}

// Get all ASHRAE 170 healthcare space types from database
export function getAshrae170Spaces(): ASHRAE170Space[] {
  const store = useSettingsStore.getState()
  const dbTypes = store.getAshrae170SpaceTypes()
  
  return dbTypes.map(db => ({
    id: db.id,
    spaceType: db.display_name,
    minTotalACH: db.min_total_ach ?? 0,
    minOAach: db.min_oa_ach ?? 0,
    pressureRelationship: (db.pressure_relationship ?? 'equal') as 'positive' | 'negative' | 'equal',
    allAirExhaust: db.all_air_exhaust ?? false,
    recirculated: db.recirculated ?? true,
    notes: db.notes,
  }))
}

// Lazy-loaded arrays that get data from database
// These are getters, not constants, to ensure fresh data
export const ASHRAE62_SPACE_TYPES: ASHRAE62SpaceType[] = new Proxy([] as ASHRAE62SpaceType[], {
  get(_target, prop) {
    const data = getAshrae62SpaceTypes()
    if (prop === 'length') return data.length
    if (prop === 'find') return data.find.bind(data)
    if (prop === 'filter') return data.filter.bind(data)
    if (prop === 'map') return data.map.bind(data)
    if (prop === 'slice') return data.slice.bind(data)
    if (prop === 'forEach') return data.forEach.bind(data)
    if (prop === Symbol.iterator) return data[Symbol.iterator].bind(data)
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return data[Number(prop)]
    }
    return Reflect.get(data, prop)
  }
})

export const ASHRAE170_SPACES: ASHRAE170Space[] = new Proxy([] as ASHRAE170Space[], {
  get(_target, prop) {
    const data = getAshrae170Spaces()
    if (prop === 'length') return data.length
    if (prop === 'find') return data.find.bind(data)
    if (prop === 'filter') return data.filter.bind(data)
    if (prop === 'map') return data.map.bind(data)
    if (prop === 'slice') return data.slice.bind(data)
    if (prop === 'forEach') return data.forEach.bind(data)
    if (prop === Symbol.iterator) return data[Symbol.iterator].bind(data)
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return data[Number(prop)]
    }
    return Reflect.get(data, prop)
  }
})

/**
 * Get space type by ID (from database)
 */
export function getSpaceType(id: string): ASHRAE62SpaceType | undefined {
  return getAshrae62SpaceTypes().find(st => st.id === id)
}

/**
 * Get space types by category (from database)
 */
export function getSpaceTypesByCategory(category: string): ASHRAE62SpaceType[] {
  return getAshrae62SpaceTypes().filter(st => st.category === category)
}

/**
 * Get all unique categories (from database)
 */
export function getCategories(): string[] {
  const categories = new Set(getAshrae62SpaceTypes().map(st => st.category))
  return Array.from(categories).sort()
}

/**
 * Calculate default occupancy for a space (from database)
 */
export function calculateDefaultOccupancy(spaceTypeId: string, areaSf: number): number {
  const spaceType = getSpaceType(spaceTypeId)
  if (!spaceType) return 0
  return Math.ceil((areaSf / 1000) * spaceType.defaultOccupancy)
}

/**
 * Get exhaust requirement for a space type (from database - now part of space type)
 */
export function getExhaustRequirement(spaceTypeId: string): ExhaustRequirement | undefined {
  const store = useSettingsStore.getState()
  const spaceType = store.getAshraeSpaceType(spaceTypeId)
  
  if (!spaceType) return undefined
  if (!spaceType.exhaust_cfm_sf && !spaceType.exhaust_cfm_unit) return undefined
  
  return {
    id: spaceType.id,
    spaceType: spaceType.display_name,
    exhaustRate: spaceType.exhaust_cfm_sf ?? spaceType.exhaust_cfm_unit ?? 0,
    unit: spaceType.exhaust_cfm_sf ? 'cfm_sf' : 'cfm_unit',
    perUnitType: spaceType.exhaust_unit_type,
    exhaustRateIntermittent: spaceType.exhaust_cfm_max,
    exhaustRateContinuous: spaceType.exhaust_cfm_min,
    notes: spaceType.exhaust_notes,
  }
}

/**
 * Search space types by name (from database)
 */
export function searchSpaceTypes(query: string): ASHRAE62SpaceType[] {
  const lowerQuery = query.toLowerCase()
  return getAshrae62SpaceTypes().filter(st => 
    st.name.toLowerCase().includes(lowerQuery) ||
    st.displayName.toLowerCase().includes(lowerQuery) ||
    st.category.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Match a space name to ASHRAE type (from database)
 * Returns 'office' as default if no match found
 */
export function matchSpaceNameToASHRAE(name: string): string {
  const lower = name.toLowerCase()
  const allTypes = getAshrae62SpaceTypes()
  const match = allTypes.find(st => 
    st.displayName.toLowerCase().includes(lower) ||
    lower.includes(st.displayName.toLowerCase()) ||
    st.name.toLowerCase().includes(lower)
  )
  return match?.id ?? 'office'
}

/**
 * Match zone type to ASHRAE space type (from database)
 * Returns 'office' as default if no match found
 */
export function matchZoneTypeToASHRAE(zoneType: string): string {
  // Common mappings
  const mappings: Record<string, string> = {
    'office': 'office',
    'reception': 'reception',
    'locker_room': 'spa_locker_room',
    'restroom': 'toilet_public',
    'open_gym': 'health_club_weights',
    'group_fitness': 'health_club_aerobics',
    'yoga_studio': 'yoga_studio',
    'pool_indoor': 'swimming_pool',
    'sauna_electric': 'sauna',
    'sauna_gas': 'sauna',
    'steam_room': 'steam_room',
  }
  return mappings[zoneType] ?? 'office'
}
