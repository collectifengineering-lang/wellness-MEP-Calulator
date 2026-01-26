/**
 * NYC Plumbing Code Fixture Database
 * Based on NYC Plumbing Code Tables 709.1, 709.2, and related sections
 * 
 * WSFU = Water Supply Fixture Units
 * DFU = Drainage Fixture Units
 * hotWaterGPH = Hot water demand in gallons per hour (ASHRAE)
 */

export interface FixtureDefinition {
  id: string              // Unique identifier
  name: string            // Display name
  category: string        // Category for grouping
  wsfu: number            // Water Supply Fixture Units
  dfu: number             // Drainage Fixture Units
  hotWaterGPH: number     // Hot water demand (GPH)
  trapSize?: string       // Minimum trap size
  icon: string            // Emoji for display
}

// Categories for organization
export const FIXTURE_CATEGORIES = [
  'Toilets & Urinals',
  'Sinks & Lavatories',
  'Bathing',
  'Appliances',
  'Drains',
  'Specialty',
  'Medical',
  'Commercial Kitchen',
] as const

export type FixtureCategory = typeof FIXTURE_CATEGORIES[number]

// Complete NYC Plumbing Code fixture database
export const NYC_FIXTURE_DATABASE: FixtureDefinition[] = [
  // ============================================
  // TOILETS & URINALS
  // ============================================
  {
    id: 'water_closet_tank',
    name: 'Water Closet (Tank Type)',
    category: 'Toilets & Urinals',
    wsfu: 3,
    dfu: 4,
    hotWaterGPH: 0,
    trapSize: '3"',
    icon: '🚽',
  },
  {
    id: 'water_closet_valve',
    name: 'Water Closet (Flush Valve)',
    category: 'Toilets & Urinals',
    wsfu: 6,
    dfu: 4,
    hotWaterGPH: 0,
    trapSize: '3"',
    icon: '🚽',
  },
  {
    id: 'water_closet_public',
    name: 'Water Closet (Public)',
    category: 'Toilets & Urinals',
    wsfu: 6,
    dfu: 4,
    hotWaterGPH: 0,
    trapSize: '3"',
    icon: '🚽',
  },
  {
    id: 'urinal_flush_valve',
    name: 'Urinal (Flush Valve)',
    category: 'Toilets & Urinals',
    wsfu: 5,
    dfu: 4,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '🚾',
  },
  {
    id: 'urinal_flush_tank',
    name: 'Urinal (Flush Tank)',
    category: 'Toilets & Urinals',
    wsfu: 3,
    dfu: 4,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '🚾',
  },
  {
    id: 'urinal_waterless',
    name: 'Urinal (Waterless)',
    category: 'Toilets & Urinals',
    wsfu: 0,
    dfu: 2,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '🚾',
  },
  {
    id: 'bidet',
    name: 'Bidet',
    category: 'Toilets & Urinals',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 2,
    trapSize: '1.5"',
    icon: '🚿',
  },

  // ============================================
  // SINKS & LAVATORIES
  // ============================================
  {
    id: 'lavatory',
    name: 'Lavatory',
    category: 'Sinks & Lavatories',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 6,
    trapSize: '1.25"',
    icon: '🚰',
  },
  {
    id: 'lavatory_public',
    name: 'Lavatory (Public)',
    category: 'Sinks & Lavatories',
    wsfu: 1.5,
    dfu: 1,
    hotWaterGPH: 6,
    trapSize: '1.25"',
    icon: '🚰',
  },
  {
    id: 'kitchen_sink_residential',
    name: 'Kitchen Sink (Residential)',
    category: 'Sinks & Lavatories',
    wsfu: 1.5,
    dfu: 2,
    hotWaterGPH: 10,
    trapSize: '1.5"',
    icon: '🍽️',
  },
  {
    id: 'kitchen_sink_commercial',
    name: 'Kitchen Sink (Commercial)',
    category: 'Sinks & Lavatories',
    wsfu: 4,
    dfu: 3,
    hotWaterGPH: 30,
    trapSize: '2"',
    icon: '🍽️',
  },
  {
    id: 'service_sink',
    name: 'Service Sink / Mop Basin',
    category: 'Sinks & Lavatories',
    wsfu: 3,
    dfu: 3,
    hotWaterGPH: 15,
    trapSize: '3"',
    icon: '🧹',
  },
  {
    id: 'laundry_tray',
    name: 'Laundry Tray (1-3 compartments)',
    category: 'Sinks & Lavatories',
    wsfu: 4,
    dfu: 2,
    hotWaterGPH: 20,
    trapSize: '1.5"',
    icon: '🧺',
  },
  {
    id: 'bar_sink',
    name: 'Bar Sink',
    category: 'Sinks & Lavatories',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 5,
    trapSize: '1.5"',
    icon: '🍸',
  },
  {
    id: 'hand_sink',
    name: 'Hand Sink (Commercial)',
    category: 'Sinks & Lavatories',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 5,
    trapSize: '1.25"',
    icon: '🤲',
  },

  // ============================================
  // BATHING
  // ============================================
  {
    id: 'shower',
    name: 'Shower',
    category: 'Bathing',
    wsfu: 2,
    dfu: 2,
    hotWaterGPH: 100, // ASHRAE gymnasium
    trapSize: '2"',
    icon: '🚿',
  },
  {
    id: 'shower_gang',
    name: 'Shower (Gang/Group)',
    category: 'Bathing',
    wsfu: 2,
    dfu: 2,
    hotWaterGPH: 100,
    trapSize: '2"',
    icon: '🚿',
  },
  {
    id: 'bathtub',
    name: 'Bathtub',
    category: 'Bathing',
    wsfu: 4,
    dfu: 2,
    hotWaterGPH: 30,
    trapSize: '1.5"',
    icon: '🛁',
  },
  {
    id: 'bathtub_whirlpool',
    name: 'Bathtub (Whirlpool)',
    category: 'Bathing',
    wsfu: 4,
    dfu: 2,
    hotWaterGPH: 50,
    trapSize: '1.5"',
    icon: '🛁',
  },
  {
    id: 'soaking_tub',
    name: 'Soaking Tub (Large)',
    category: 'Bathing',
    wsfu: 6,
    dfu: 3,
    hotWaterGPH: 80,
    trapSize: '2"',
    icon: '🛁',
  },
  {
    id: 'foot_bath',
    name: 'Foot Bath',
    category: 'Bathing',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 10,
    trapSize: '1.5"',
    icon: '🦶',
  },

  // ============================================
  // APPLIANCES
  // ============================================
  {
    id: 'washing_machine_residential',
    name: 'Washing Machine (Residential)',
    category: 'Appliances',
    wsfu: 4,
    dfu: 3,
    hotWaterGPH: 30,
    trapSize: '2"',
    icon: '🧺',
  },
  {
    id: 'washing_machine_commercial',
    name: 'Washing Machine (Commercial)',
    category: 'Appliances',
    wsfu: 8,
    dfu: 6,
    hotWaterGPH: 60,
    trapSize: '3"',
    icon: '🧺',
  },
  {
    id: 'dishwasher_residential',
    name: 'Dishwasher (Residential)',
    category: 'Appliances',
    wsfu: 1.5,
    dfu: 2,
    hotWaterGPH: 15,
    trapSize: '1.5"',
    icon: '🍽️',
  },
  {
    id: 'dishwasher_commercial',
    name: 'Dishwasher (Commercial)',
    category: 'Appliances',
    wsfu: 4,
    dfu: 2,
    hotWaterGPH: 50,
    trapSize: '2"',
    icon: '🍽️',
  },
  {
    id: 'ice_maker',
    name: 'Ice Maker',
    category: 'Appliances',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 0,
    trapSize: '1"',
    icon: '🧊',
  },
  {
    id: 'water_cooler',
    name: 'Water Cooler',
    category: 'Appliances',
    wsfu: 0.5,
    dfu: 0.5,
    hotWaterGPH: 0,
    trapSize: '1"',
    icon: '💧',
  },
  {
    id: 'coffee_maker',
    name: 'Coffee Maker (Commercial)',
    category: 'Appliances',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 5,
    trapSize: '1"',
    icon: '☕',
  },
  {
    id: 'dryer_condensate',
    name: 'Dryer (Condensate Drain)',
    category: 'Appliances',
    wsfu: 0,
    dfu: 4,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '♨️',
  },

  // ============================================
  // DRAINS
  // ============================================
  {
    id: 'floor_drain_2in',
    name: 'Floor Drain (2")',
    category: 'Drains',
    wsfu: 0,
    dfu: 2,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '🕳️',
  },
  {
    id: 'floor_drain_3in',
    name: 'Floor Drain (3")',
    category: 'Drains',
    wsfu: 0,
    dfu: 3,
    hotWaterGPH: 0,
    trapSize: '3"',
    icon: '🕳️',
  },
  {
    id: 'floor_drain_4in',
    name: 'Floor Drain (4")',
    category: 'Drains',
    wsfu: 0,
    dfu: 4,
    hotWaterGPH: 0,
    trapSize: '4"',
    icon: '🕳️',
  },
  {
    id: 'trench_drain',
    name: 'Trench Drain (per 10 ft)',
    category: 'Drains',
    wsfu: 0,
    dfu: 3,
    hotWaterGPH: 0,
    trapSize: '3"',
    icon: '🕳️',
  },
  {
    id: 'area_drain',
    name: 'Area Drain',
    category: 'Drains',
    wsfu: 0,
    dfu: 2,
    hotWaterGPH: 0,
    trapSize: '3"',
    icon: '🕳️',
  },
  {
    id: 'emergency_floor_drain',
    name: 'Emergency Floor Drain',
    category: 'Drains',
    wsfu: 0,
    dfu: 0,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '🚨',
  },

  // ============================================
  // SPECIALTY
  // ============================================
  {
    id: 'drinking_fountain',
    name: 'Drinking Fountain',
    category: 'Specialty',
    wsfu: 0.5,
    dfu: 0.5,
    hotWaterGPH: 0,
    trapSize: '1.25"',
    icon: '⛲',
  },
  {
    id: 'bottle_filler',
    name: 'Bottle Filler',
    category: 'Specialty',
    wsfu: 0.5,
    dfu: 0.5,
    hotWaterGPH: 0,
    trapSize: '1.25"',
    icon: '🍶',
  },
  {
    id: 'hose_bibb',
    name: 'Hose Bibb',
    category: 'Specialty',
    wsfu: 2.5,
    dfu: 0,
    hotWaterGPH: 0,
    icon: '🚿',
  },
  {
    id: 'lawn_sprinkler',
    name: 'Lawn Sprinkler (per head)',
    category: 'Specialty',
    wsfu: 1,
    dfu: 0,
    hotWaterGPH: 0,
    icon: '💦',
  },
  {
    id: 'pool_fill',
    name: 'Pool Fill Valve',
    category: 'Specialty',
    wsfu: 4,
    dfu: 0,
    hotWaterGPH: 0,
    icon: '🏊',
  },
  {
    id: 'hot_tub_fill',
    name: 'Hot Tub Fill',
    category: 'Specialty',
    wsfu: 4,
    dfu: 2,
    hotWaterGPH: 0,
    icon: '♨️',
  },
  {
    id: 'eyewash_station',
    name: 'Eyewash Station',
    category: 'Specialty',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 0,
    trapSize: '1.5"',
    icon: '👁️',
  },
  {
    id: 'emergency_shower',
    name: 'Emergency Shower',
    category: 'Specialty',
    wsfu: 4,
    dfu: 2,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '🚨',
  },
  {
    id: 'dental_unit',
    name: 'Dental Unit (Cuspidor)',
    category: 'Specialty',
    wsfu: 1,
    dfu: 1,
    hotWaterGPH: 0,
    trapSize: '1.25"',
    icon: '🦷',
  },

  // ============================================
  // MEDICAL
  // ============================================
  {
    id: 'clinic_sink',
    name: 'Clinic Sink',
    category: 'Medical',
    wsfu: 3,
    dfu: 3,
    hotWaterGPH: 15,
    trapSize: '1.5"',
    icon: '🏥',
  },
  {
    id: 'bedpan_washer',
    name: 'Bedpan Washer',
    category: 'Medical',
    wsfu: 5,
    dfu: 6,
    hotWaterGPH: 30,
    trapSize: '3"',
    icon: '🏥',
  },
  {
    id: 'flushing_rim_sink',
    name: 'Flushing Rim Sink',
    category: 'Medical',
    wsfu: 6,
    dfu: 6,
    hotWaterGPH: 20,
    trapSize: '3"',
    icon: '🏥',
  },
  {
    id: 'sterilizer',
    name: 'Sterilizer',
    category: 'Medical',
    wsfu: 4,
    dfu: 2,
    hotWaterGPH: 10,
    trapSize: '1.5"',
    icon: '🏥',
  },
  {
    id: 'autopsy_table',
    name: 'Autopsy Table',
    category: 'Medical',
    wsfu: 4,
    dfu: 6,
    hotWaterGPH: 20,
    trapSize: '3"',
    icon: '🏥',
  },

  // ============================================
  // COMMERCIAL KITCHEN
  // ============================================
  {
    id: 'pot_sink_3comp',
    name: 'Pot Sink (3-Compartment)',
    category: 'Commercial Kitchen',
    wsfu: 6,
    dfu: 4,
    hotWaterGPH: 50,
    trapSize: '2"',
    icon: '🍳',
  },
  {
    id: 'prep_sink',
    name: 'Prep Sink',
    category: 'Commercial Kitchen',
    wsfu: 3,
    dfu: 2,
    hotWaterGPH: 20,
    trapSize: '1.5"',
    icon: '🥗',
  },
  {
    id: 'food_waste_disposer',
    name: 'Food Waste Disposer',
    category: 'Commercial Kitchen',
    wsfu: 3,
    dfu: 2,
    hotWaterGPH: 0,
    trapSize: '1.5"',
    icon: '🗑️',
  },
  {
    id: 'grease_interceptor',
    name: 'Grease Interceptor Connection',
    category: 'Commercial Kitchen',
    wsfu: 0,
    dfu: 4,
    hotWaterGPH: 0,
    trapSize: '4"',
    icon: '🛢️',
  },
  {
    id: 'pre_rinse_spray',
    name: 'Pre-Rinse Spray Valve',
    category: 'Commercial Kitchen',
    wsfu: 4,
    dfu: 0,
    hotWaterGPH: 40,
    icon: '💦',
  },
  {
    id: 'steam_kettle',
    name: 'Steam Kettle',
    category: 'Commercial Kitchen',
    wsfu: 4,
    dfu: 2,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '🍲',
  },
  {
    id: 'combi_oven',
    name: 'Combi Oven (Steam)',
    category: 'Commercial Kitchen',
    wsfu: 2,
    dfu: 2,
    hotWaterGPH: 0,
    trapSize: '2"',
    icon: '🔥',
  },
]

// Helper function to get fixture by ID
export function getFixtureById(id: string): FixtureDefinition | undefined {
  return NYC_FIXTURE_DATABASE.find(f => f.id === id)
}

// Helper function to get fixtures by category
export function getFixturesByCategory(category: FixtureCategory): FixtureDefinition[] {
  return NYC_FIXTURE_DATABASE.filter(f => f.category === category)
}

// Legacy fixture ID mapping (old -> new)
export const LEGACY_FIXTURE_MAPPING: Record<string, string> = {
  'showers': 'shower',
  'lavs': 'lavatory',
  'wcs': 'water_closet_tank',
  'floorDrains': 'floor_drain_2in',
  'serviceSinks': 'service_sink',
  'washingMachines': 'washing_machine_residential',
  'dryers': 'dryer_condensate',
}

// Reverse mapping for migration
export const NEW_TO_LEGACY_MAPPING: Record<string, string> = {
  'shower': 'showers',
  'lavatory': 'lavs',
  'water_closet_tank': 'wcs',
  'water_closet_valve': 'wcs',
  'floor_drain_2in': 'floorDrains',
  'floor_drain_3in': 'floorDrains',
  'service_sink': 'serviceSinks',
  'washing_machine_residential': 'washingMachines',
  'washing_machine_commercial': 'washingMachines',
  'dryer_condensate': 'dryers',
}
