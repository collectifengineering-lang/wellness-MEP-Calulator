/**
 * Fixture Utilities for backwards compatibility
 * Handles both new NYC fixture IDs and legacy fixture keys
 */

import type { ZoneFixtures } from '../types'

// Reverse mapping: new ID -> legacy key
const NEW_TO_LEGACY: Record<string, string> = {
  'shower': 'showers',
  'shower_gang': 'showers',
  'lavatory': 'lavs',
  'lavatory_public': 'lavs',
  'water_closet_tank': 'wcs',
  'water_closet_valve': 'wcs',
  'water_closet_public': 'wcs',
  'urinal_flush_valve': 'wcs',  // Count urinals as WCs for legacy compatibility
  'urinal_flush_tank': 'wcs',
  'floor_drain_2in': 'floorDrains',
  'floor_drain_3in': 'floorDrains',
  'floor_drain_4in': 'floorDrains',
  'area_drain': 'floorDrains',
  'trench_drain': 'floorDrains',
  'service_sink': 'serviceSinks',
  'washing_machine_residential': 'washingMachines',
  'washing_machine_commercial': 'washingMachines',
  'dryer_condensate': 'dryers',
}

/**
 * Get fixture count from dynamic fixtures object
 * Supports both new NYC fixture IDs and legacy keys
 */
export function getFixtureCount(
  fixtures: ZoneFixtures,
  newIds: string[],
  legacyIds: string[] = []
): number {
  let count = 0
  
  // Try new IDs
  for (const id of newIds) {
    count += fixtures[id] || 0
  }
  
  // Try legacy IDs
  for (const id of legacyIds) {
    count += fixtures[id] || 0
  }
  
  return count
}

/**
 * Get all fixture counts in legacy format for backwards compatibility
 * Aggregates new fixture IDs into legacy categories
 */
export function getLegacyFixtureCounts(fixtures: ZoneFixtures): {
  showers: number
  lavs: number
  wcs: number
  floorDrains: number
  serviceSinks: number
  washingMachines: number
  dryers: number
} {
  const counts = {
    showers: 0,
    lavs: 0,
    wcs: 0,
    floorDrains: 0,
    serviceSinks: 0,
    washingMachines: 0,
    dryers: 0,
  }
  
  for (const [fixtureId, count] of Object.entries(fixtures)) {
    if (count <= 0) continue
    
    // Check if it's a legacy key
    if (fixtureId in counts) {
      counts[fixtureId as keyof typeof counts] += count
      continue
    }
    
    // Map new ID to legacy key
    const legacyKey = NEW_TO_LEGACY[fixtureId]
    if (legacyKey && legacyKey in counts) {
      counts[legacyKey as keyof typeof counts] += count
    }
  }
  
  return counts
}

/**
 * Check if fixtures object has any fixtures (non-zero counts)
 */
export function hasFixtures(fixtures: ZoneFixtures): boolean {
  return Object.values(fixtures).some(count => count > 0)
}

/**
 * Get total fixture count
 */
export function getTotalFixtureCount(fixtures: ZoneFixtures): number {
  return Object.values(fixtures).reduce((sum, count) => sum + (count || 0), 0)
}

/**
 * Merge fixtures, combining counts for same fixture types
 */
export function mergeFixtures(...fixtureArrays: ZoneFixtures[]): ZoneFixtures {
  const merged: ZoneFixtures = {}
  
  for (const fixtures of fixtureArrays) {
    for (const [id, count] of Object.entries(fixtures)) {
      merged[id] = (merged[id] || 0) + (count || 0)
    }
  }
  
  return merged
}

/**
 * Convert legacy fixtures format to new format
 */
export function migrateToNewFormat(legacyFixtures: {
  showers?: number
  lavs?: number
  wcs?: number
  floorDrains?: number
  serviceSinks?: number
  washingMachines?: number
  dryers?: number
}): ZoneFixtures {
  const newFixtures: ZoneFixtures = {}
  
  if (legacyFixtures.showers) newFixtures['shower'] = legacyFixtures.showers
  if (legacyFixtures.lavs) newFixtures['lavatory'] = legacyFixtures.lavs
  if (legacyFixtures.wcs) newFixtures['water_closet_tank'] = legacyFixtures.wcs
  if (legacyFixtures.floorDrains) newFixtures['floor_drain_2in'] = legacyFixtures.floorDrains
  if (legacyFixtures.serviceSinks) newFixtures['service_sink'] = legacyFixtures.serviceSinks
  if (legacyFixtures.washingMachines) newFixtures['washing_machine_residential'] = legacyFixtures.washingMachines
  if (legacyFixtures.dryers) newFixtures['dryer_condensate'] = legacyFixtures.dryers
  
  return newFixtures
}
