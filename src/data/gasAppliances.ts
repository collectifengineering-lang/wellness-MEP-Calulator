/**
 * Gas Appliances Database
 * 
 * Values from ASPE Plumbing Engineering Design Handbook Table 7-3
 * "Approximate Gas Demand for Common Appliances"
 * 
 * Note: These values should be used only when manufacturer's data are not available.
 */

export interface GasApplianceDefinition {
  id: string
  name: string
  category: string
  btuPerHour: number      // Input BTU/h
  mbh: number             // MBH (thousands BTU/h)
  notes?: string
  icon: string
}

export const GAS_APPLIANCE_CATEGORIES = [
  'Commercial Kitchen',
  'Residential',
  'Water Heating',
  'Laundry',
  'Miscellaneous',
] as const

export type GasApplianceCategory = typeof GAS_APPLIANCE_CATEGORIES[number]

/**
 * ASPE Table 7-3 - Approximate Gas Demand for Common Appliances
 */
export const GAS_APPLIANCES_DATABASE: GasApplianceDefinition[] = [
  // ============================================
  // COMMERCIAL KITCHEN EQUIPMENT
  // ============================================
  {
    id: 'broiler_small',
    name: 'Broiler (Small)',
    category: 'Commercial Kitchen',
    btuPerHour: 30000,
    mbh: 30,
    icon: '🔥',
  },
  {
    id: 'broiler_large',
    name: 'Broiler (Large)',
    category: 'Commercial Kitchen',
    btuPerHour: 60000,
    mbh: 60,
    icon: '🔥',
  },
  {
    id: 'broiler_roaster_combo',
    name: 'Combination Broiler and Roaster',
    category: 'Commercial Kitchen',
    btuPerHour: 66000,
    mbh: 66,
    icon: '🔥',
  },
  {
    id: 'coffee_maker_3burner',
    name: 'Coffee Maker (3-Burner)',
    category: 'Commercial Kitchen',
    btuPerHour: 18000,
    mbh: 18,
    icon: '☕',
  },
  {
    id: 'coffee_maker_4burner',
    name: 'Coffee Maker (4-Burner)',
    category: 'Commercial Kitchen',
    btuPerHour: 24000,
    mbh: 24,
    icon: '☕',
  },
  {
    id: 'coffee_urn_5gal',
    name: 'Coffee Urn (Single, 5-gal)',
    category: 'Commercial Kitchen',
    btuPerHour: 28000,
    mbh: 28,
    icon: '☕',
  },
  {
    id: 'coffee_urn_10gal',
    name: 'Coffee Urn (Twin, 10-gal)',
    category: 'Commercial Kitchen',
    btuPerHour: 56000,
    mbh: 56,
    icon: '☕',
  },
  {
    id: 'coffee_urn_15gal',
    name: 'Coffee Urn (Twin, 15-gal)',
    category: 'Commercial Kitchen',
    btuPerHour: 84000,
    mbh: 84,
    icon: '☕',
  },
  {
    id: 'deep_fat_fryer_45lb',
    name: 'Deep Fat Fryer (45 lb)',
    category: 'Commercial Kitchen',
    btuPerHour: 50000,
    mbh: 50,
    icon: '🍟',
  },
  {
    id: 'deep_fat_fryer_75lb',
    name: 'Deep Fat Fryer (75 lb)',
    category: 'Commercial Kitchen',
    btuPerHour: 75000,
    mbh: 75,
    icon: '🍟',
  },
  {
    id: 'doughnut_fryer_200lb',
    name: 'Doughnut Fryer (200 lb)',
    category: 'Commercial Kitchen',
    btuPerHour: 72000,
    mbh: 72,
    icon: '🍩',
  },
  {
    id: 'baking_oven_2deck',
    name: 'Baking/Roasting Oven (2-Deck)',
    category: 'Commercial Kitchen',
    btuPerHour: 100000,
    mbh: 100,
    icon: '🍞',
  },
  {
    id: 'baking_oven_3deck',
    name: 'Baking Oven (3-Deck)',
    category: 'Commercial Kitchen',
    btuPerHour: 96000,
    mbh: 96,
    icon: '🍞',
  },
  {
    id: 'revolving_oven',
    name: 'Revolving Oven (4-5 Trays)',
    category: 'Commercial Kitchen',
    btuPerHour: 210000,
    mbh: 210,
    icon: '🍞',
  },
  {
    id: 'convection_oven_section',
    name: 'Convection Oven (per section)',
    category: 'Commercial Kitchen',
    btuPerHour: 60000,
    mbh: 60,
    icon: '🍞',
  },
  {
    id: 'range_hot_top_oven',
    name: 'Range with Hot Top and Oven',
    category: 'Commercial Kitchen',
    btuPerHour: 90000,
    mbh: 90,
    icon: '🍳',
  },
  {
    id: 'range_hot_top',
    name: 'Range with Hot Top (no oven)',
    category: 'Commercial Kitchen',
    btuPerHour: 45000,
    mbh: 45,
    icon: '🍳',
  },
  {
    id: 'range_fry_top_oven',
    name: 'Range with Fry Top and Oven',
    category: 'Commercial Kitchen',
    btuPerHour: 100000,
    mbh: 100,
    icon: '🍳',
  },
  {
    id: 'range_fry_top',
    name: 'Range with Fry Top (no oven)',
    category: 'Commercial Kitchen',
    btuPerHour: 50000,
    mbh: 50,
    icon: '🍳',
  },

  // ============================================
  // RESIDENTIAL EQUIPMENT
  // ============================================
  {
    id: 'clothes_dryer_residential',
    name: 'Clothes Dryer (Residential, Type I)',
    category: 'Residential',
    btuPerHour: 35000,
    mbh: 35,
    icon: '♨️',
  },
  {
    id: 'range_residential',
    name: 'Range (Residential)',
    category: 'Residential',
    btuPerHour: 65000,
    mbh: 65,
    icon: '🍳',
  },
  {
    id: 'stovetop_burner',
    name: 'Stove-Top Burner (each)',
    category: 'Residential',
    btuPerHour: 40000,
    mbh: 40,
    icon: '🔥',
  },
  {
    id: 'oven_residential',
    name: 'Oven (Residential)',
    category: 'Residential',
    btuPerHour: 25000,
    mbh: 25,
    icon: '🍞',
  },
  {
    id: 'log_lighter',
    name: 'Log Lighter',
    category: 'Residential',
    btuPerHour: 25000,
    mbh: 25,
    icon: '🪵',
  },
  {
    id: 'barbecue_grill',
    name: 'Barbecue Grill',
    category: 'Residential',
    btuPerHour: 50000,
    mbh: 50,
    icon: '🍖',
  },

  // ============================================
  // WATER HEATING
  // ============================================
  {
    id: 'water_heater_30gal',
    name: 'Water Heater (30-gal)',
    category: 'Water Heating',
    btuPerHour: 30000,
    mbh: 30,
    icon: '🛢️',
  },
  {
    id: 'water_heater_40_50gal',
    name: 'Water Heater (40-50 gal)',
    category: 'Water Heating',
    btuPerHour: 50000,
    mbh: 50,
    icon: '🛢️',
  },
  {
    id: 'water_heater_75gal',
    name: 'Water Heater (75 gal)',
    category: 'Water Heating',
    btuPerHour: 75000,
    mbh: 75,
    icon: '🛢️',
  },
  {
    id: 'water_heater_100gal',
    name: 'Water Heater (100 gal)',
    category: 'Water Heating',
    btuPerHour: 100000,
    mbh: 100,
    icon: '🛢️',
  },
  {
    id: 'tankless_water_heater',
    name: 'Tankless Water Heater',
    category: 'Water Heating',
    btuPerHour: 199000,
    mbh: 199,
    notes: 'Typical commercial tankless unit',
    icon: '⚡',
  },
  {
    id: 'pool_heater_250k',
    name: 'Pool Heater (250,000 BTU)',
    category: 'Water Heating',
    btuPerHour: 250000,
    mbh: 250,
    icon: '🏊',
  },
  {
    id: 'pool_heater_400k',
    name: 'Pool Heater (400,000 BTU)',
    category: 'Water Heating',
    btuPerHour: 400000,
    mbh: 400,
    icon: '🏊',
  },
  {
    id: 'spa_heater',
    name: 'Spa/Hot Tub Heater',
    category: 'Water Heating',
    btuPerHour: 125000,
    mbh: 125,
    icon: '♨️',
  },

  // ============================================
  // LAUNDRY
  // ============================================
  {
    id: 'clothes_dryer_commercial',
    name: 'Clothes Dryer (Commercial)',
    category: 'Laundry',
    btuPerHour: 95000,
    mbh: 95,
    notes: 'Commercial tumble dryer per pocket',
    icon: '♨️',
  },
  {
    id: 'clothes_dryer_stacked',
    name: 'Stacked Dryer (per pocket)',
    category: 'Laundry',
    btuPerHour: 95000,
    mbh: 95,
    notes: 'Huebsch HTT45 type stacked dryer',
    icon: '♨️',
  },
  {
    id: 'ironer_flatwork',
    name: 'Flatwork Ironer',
    category: 'Laundry',
    btuPerHour: 150000,
    mbh: 150,
    icon: '👔',
  },

  // ============================================
  // MISCELLANEOUS
  // ============================================
  {
    id: 'log_lighter_commercial',
    name: 'Commercial Log Lighter',
    category: 'Miscellaneous',
    btuPerHour: 50000,
    mbh: 50,
    icon: '🪵',
  },
  {
    id: 'bunsen_burner',
    name: 'Bunsen Burner',
    category: 'Miscellaneous',
    btuPerHour: 5000,
    mbh: 5,
    icon: '🔬',
  },
  {
    id: 'gas_engine_per_hp',
    name: 'Gas Engine (per HP)',
    category: 'Miscellaneous',
    btuPerHour: 10000,
    mbh: 10,
    icon: '⚙️',
  },
  {
    id: 'steam_boiler_per_hp',
    name: 'Steam Boiler (per HP)',
    category: 'Miscellaneous',
    btuPerHour: 50000,
    mbh: 50,
    icon: '♨️',
  },
  {
    id: 'unit_heater_30k',
    name: 'Unit Heater (30,000 BTU)',
    category: 'Miscellaneous',
    btuPerHour: 30000,
    mbh: 30,
    icon: '🌡️',
  },
  {
    id: 'unit_heater_60k',
    name: 'Unit Heater (60,000 BTU)',
    category: 'Miscellaneous',
    btuPerHour: 60000,
    mbh: 60,
    icon: '🌡️',
  },
  {
    id: 'unit_heater_100k',
    name: 'Unit Heater (100,000 BTU)',
    category: 'Miscellaneous',
    btuPerHour: 100000,
    mbh: 100,
    icon: '🌡️',
  },
  {
    id: 'infrared_heater',
    name: 'Infrared Heater (per 10,000 BTU)',
    category: 'Miscellaneous',
    btuPerHour: 10000,
    mbh: 10,
    icon: '☀️',
  },
  {
    id: 'sauna_heater_gas',
    name: 'Sauna Heater (Gas)',
    category: 'Miscellaneous',
    btuPerHour: 91000,
    mbh: 91,
    notes: 'Power Flame type sauna heater',
    icon: '🧖',
  },
  {
    id: 'banya_furnace',
    name: 'Banya Furnace',
    category: 'Miscellaneous',
    btuPerHour: 1260000,
    mbh: 1260,
    notes: 'Power Flame J30A-12',
    icon: '🧖',
  },
]

// Helper function to get gas appliance by ID
export function getGasApplianceById(id: string): GasApplianceDefinition | undefined {
  return GAS_APPLIANCES_DATABASE.find(a => a.id === id)
}

// Helper function to get gas appliances by category
export function getGasAppliancesByCategory(category: GasApplianceCategory): GasApplianceDefinition[] {
  return GAS_APPLIANCES_DATABASE.filter(a => a.category === category)
}

// Convert BTU/h to CFH (natural gas ~1,000 BTU/CF)
export function btuToCfh(btu: number): number {
  return Math.round(btu / 1000)
}

// Convert MBH to CFH
export function mbhToCfh(mbh: number): number {
  return Math.round(mbh)
}
