/**
 * Floor Utilities
 * 
 * Parses zone names to extract floor information and provides
 * sorting/grouping utilities for organizing zones by floor.
 * 
 * Supported prefixes:
 * - "L1-", "L2-", "LB1-" (Level)
 * - "1F-", "2F-", "B1F-" (Floor)
 * - "1-", "2-", "B1-" (Number only)
 * - "Ground-", "G-", "GF-" (Ground floor)
 * - "Basement-", "B-", "B1-", "B2-" (Basement)
 * - "Roof-", "R-", "RF-" (Roof)
 * - "Mezzanine-", "M-", "MZ-" (Mezzanine)
 * - "Penthouse-", "PH-" (Penthouse)
 */

export interface FloorInfo {
  floor: string           // Normalized floor identifier (e.g., "1", "B1", "R")
  displayName: string     // Display name (e.g., "Level 1", "Basement 1", "Roof")
  sortOrder: number       // Numeric sort order (basement negative, ground 0, floors positive)
  prefix: string          // Original prefix found in name
  nameWithoutPrefix: string // Zone name without the floor prefix
}

// Common floor prefixes and their mappings
const FLOOR_PATTERNS: Array<{
  pattern: RegExp
  getFloor: (match: RegExpMatchArray) => { floor: string; displayName: string; sortOrder: number }
}> = [
  // Basement patterns: B1, B2, B-1, Basement 1, LB1, etc.
  {
    pattern: /^(?:L?B|Basement\s*)[-\s]?(\d+)[-_\s:.]?\s*/i,
    getFloor: (match) => ({
      floor: `B${match[1]}`,
      displayName: `Basement ${match[1]}`,
      sortOrder: -parseInt(match[1], 10),
    }),
  },
  // Simple basement: B-, Basement-
  {
    pattern: /^(?:B|Basement)[-_\s:.]?\s*/i,
    getFloor: () => ({
      floor: 'B1',
      displayName: 'Basement',
      sortOrder: -1,
    }),
  },
  // Cellar
  {
    pattern: /^(?:Cellar|C)[-_\s:.]?\s*/i,
    getFloor: () => ({
      floor: 'C',
      displayName: 'Cellar',
      sortOrder: -2,
    }),
  },
  // Ground floor: G, GF, Ground, L0, Level 0
  {
    pattern: /^(?:G|GF|Ground|L0|Level\s*0)[-_\s:.]?\s*/i,
    getFloor: () => ({
      floor: 'G',
      displayName: 'Ground Floor',
      sortOrder: 0,
    }),
  },
  // Level patterns: L1, L2, Level 1, etc.
  {
    pattern: /^(?:L|Level\s*)[-\s]?(\d+)[-_\s:.]?\s*/i,
    getFloor: (match) => ({
      floor: match[1],
      displayName: `Level ${match[1]}`,
      sortOrder: parseInt(match[1], 10),
    }),
  },
  // Floor patterns: 1F, 2F, 1st Floor, etc.
  {
    pattern: /^(\d+)(?:F|st|nd|rd|th)?\s*(?:Floor)?[-_\s:.]?\s*/i,
    getFloor: (match) => ({
      floor: match[1],
      displayName: `Level ${match[1]}`,
      sortOrder: parseInt(match[1], 10),
    }),
  },
  // Mezzanine: M, MZ, Mezzanine
  {
    pattern: /^(?:M|MZ|Mezz|Mezzanine)[-_\s:.]?\s*/i,
    getFloor: () => ({
      floor: 'M',
      displayName: 'Mezzanine',
      sortOrder: 0.5, // Between ground and first floor
    }),
  },
  // Roof: R, RF, Roof
  {
    pattern: /^(?:R|RF|Roof)[-_\s:.]?\s*/i,
    getFloor: () => ({
      floor: 'R',
      displayName: 'Roof',
      sortOrder: 100, // Always at top
    }),
  },
  // Penthouse: PH, Penthouse
  {
    pattern: /^(?:PH|Penthouse)[-_\s:.]?\s*/i,
    getFloor: () => ({
      floor: 'PH',
      displayName: 'Penthouse',
      sortOrder: 99, // Just below roof
    }),
  },
]

/**
 * Parse a zone name to extract floor information
 * 
 * @param zoneName - The zone name to parse
 * @param explicitFloor - Optional explicit floor override
 * @returns FloorInfo object with parsed floor data
 */
export function parseFloorFromName(zoneName: string, explicitFloor?: string): FloorInfo {
  // If explicit floor is provided, use it
  if (explicitFloor) {
    const normalizedFloor = normalizeFloorId(explicitFloor)
    return {
      floor: normalizedFloor.floor,
      displayName: normalizedFloor.displayName,
      sortOrder: normalizedFloor.sortOrder,
      prefix: '',
      nameWithoutPrefix: zoneName,
    }
  }
  
  // Try to match floor patterns in the zone name
  for (const { pattern, getFloor } of FLOOR_PATTERNS) {
    const match = zoneName.match(pattern)
    if (match) {
      const floorInfo = getFloor(match)
      return {
        ...floorInfo,
        prefix: match[0],
        nameWithoutPrefix: zoneName.slice(match[0].length).trim(),
      }
    }
  }
  
  // No floor prefix found - return as unassigned
  return {
    floor: '',
    displayName: 'Unassigned',
    sortOrder: 1000, // Put unassigned at the end
    prefix: '',
    nameWithoutPrefix: zoneName,
  }
}

/**
 * Normalize a floor identifier to standard format
 */
export function normalizeFloorId(floorId: string): { floor: string; displayName: string; sortOrder: number } {
  const upper = floorId.toUpperCase().trim()
  
  // Basement
  if (/^B\d*$/.test(upper)) {
    const num = upper.slice(1) || '1'
    return {
      floor: `B${num}`,
      displayName: `Basement ${num}`,
      sortOrder: -parseInt(num, 10),
    }
  }
  
  // Ground
  if (['G', 'GF', 'GROUND', '0'].includes(upper)) {
    return { floor: 'G', displayName: 'Ground Floor', sortOrder: 0 }
  }
  
  // Mezzanine
  if (['M', 'MZ', 'MEZZ', 'MEZZANINE'].includes(upper)) {
    return { floor: 'M', displayName: 'Mezzanine', sortOrder: 0.5 }
  }
  
  // Roof
  if (['R', 'RF', 'ROOF'].includes(upper)) {
    return { floor: 'R', displayName: 'Roof', sortOrder: 100 }
  }
  
  // Penthouse
  if (['PH', 'PENTHOUSE'].includes(upper)) {
    return { floor: 'PH', displayName: 'Penthouse', sortOrder: 99 }
  }
  
  // Cellar
  if (['C', 'CELLAR'].includes(upper)) {
    return { floor: 'C', displayName: 'Cellar', sortOrder: -2 }
  }
  
  // Numeric floor
  const numMatch = upper.match(/^(\d+)/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    return {
      floor: String(num),
      displayName: `Level ${num}`,
      sortOrder: num,
    }
  }
  
  // Unknown - return as-is
  return {
    floor: floorId,
    displayName: floorId,
    sortOrder: 50,
  }
}

/**
 * Get all unique floors from a list of zones, sorted properly
 */
export function getUniqueFloors(zones: Array<{ name: string; floor?: string }>): FloorInfo[] {
  const floorsMap = new Map<string, FloorInfo>()
  
  for (const zone of zones) {
    const floorInfo = parseFloorFromName(zone.name, zone.floor)
    if (!floorsMap.has(floorInfo.floor)) {
      floorsMap.set(floorInfo.floor, floorInfo)
    }
  }
  
  // Sort by sortOrder
  return Array.from(floorsMap.values()).sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Group zones by floor
 */
export function groupZonesByFloor<T extends { name: string; floor?: string }>(
  zones: T[]
): Map<string, { floorInfo: FloorInfo; zones: T[] }> {
  const groups = new Map<string, { floorInfo: FloorInfo; zones: T[] }>()
  
  for (const zone of zones) {
    const floorInfo = parseFloorFromName(zone.name, zone.floor)
    const key = floorInfo.floor || 'unassigned'
    
    if (!groups.has(key)) {
      groups.set(key, { floorInfo, zones: [] })
    }
    groups.get(key)!.zones.push(zone)
  }
  
  // Sort groups by floor order
  const sortedGroups = new Map(
    Array.from(groups.entries()).sort(
      ([, a], [, b]) => a.floorInfo.sortOrder - b.floorInfo.sortOrder
    )
  )
  
  return sortedGroups
}

/**
 * Generate a zone name with floor prefix
 */
export function generateZoneNameWithFloor(baseName: string, floor: string): string {
  if (!floor) return baseName
  
  const normalized = normalizeFloorId(floor)
  
  // Use L prefix for numeric floors
  if (/^\d+$/.test(normalized.floor)) {
    return `L${normalized.floor}-${baseName}`
  }
  
  // Use the floor code directly for special floors
  return `${normalized.floor}-${baseName}`
}

/**
 * Common floor options for dropdowns
 */
export const COMMON_FLOORS = [
  { value: 'B2', label: 'Basement 2 (B2)' },
  { value: 'B1', label: 'Basement 1 (B1)' },
  { value: 'C', label: 'Cellar (C)' },
  { value: 'G', label: 'Ground Floor (G)' },
  { value: 'M', label: 'Mezzanine (M)' },
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' },
  { value: '5', label: 'Level 5' },
  { value: '6', label: 'Level 6' },
  { value: '7', label: 'Level 7' },
  { value: '8', label: 'Level 8' },
  { value: '9', label: 'Level 9' },
  { value: '10', label: 'Level 10' },
  { value: 'PH', label: 'Penthouse (PH)' },
  { value: 'R', label: 'Roof (R)' },
]

/**
 * Get floor badge color based on floor type
 */
export function getFloorColor(floor: string): string {
  if (!floor) return '#64748b' // slate for unassigned
  
  const upper = floor.toUpperCase()
  
  // Basement - blue tones
  if (upper.startsWith('B') || upper === 'C') return '#3b82f6'
  
  // Ground - green
  if (upper === 'G') return '#22c55e'
  
  // Mezzanine - purple
  if (upper === 'M') return '#a855f7'
  
  // Roof - orange
  if (upper === 'R') return '#f97316'
  
  // Penthouse - gold
  if (upper === 'PH') return '#eab308'
  
  // Numeric floors - gradient from teal to cyan
  const num = parseInt(upper, 10)
  if (!isNaN(num)) {
    const hue = 180 + (num * 10) % 40 // Range from 180 (cyan) to 220 (blue)
    return `hsl(${hue}, 70%, 50%)`
  }
  
  return '#64748b'
}
