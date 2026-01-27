import type { ZoneType, ZoneFixtures, ZoneRates } from '../types'

// Pool configuration for pool zones
export interface PoolConfig {
  name: string
  type: 'lap' | 'warm' | 'hot' | 'cold' | 'therapy' | 'spa'
  surface_sf: number
  temperature_f: number
  depth_ft: number
  heater_mbh?: number
}

// Export the interface for use in settings store
export interface ZoneDefaults {
  displayName: string
  category: string
  defaultSF: number
  defaultSubType?: 'electric' | 'gas'
  switchable?: boolean
  defaultFixtures: ZoneFixtures
  visibleFixtures?: string[]  // Fixture IDs to show in editor (even if count is 0)
  defaultRates: ZoneRates
  // Fixed loads (not per SF)
  fixed_kw?: number
  gas_mbh?: number
  ventilation_cfm?: number
  exhaust_cfm?: number
  flue_size_in?: number
  dehumidification_lb_hr?: number
  pool_heater_gas_mbh?: number
  gas_mbh_per_dryer?: number
  gas_mbh_per_sf?: number
  mau_cfm?: number
  grease_interceptor_gal?: number
  latent_adder?: number
  requires_standby_power?: boolean
  requires_type1_hood?: boolean
  requires_mau?: boolean
  exhaust_cfm_toilet?: number
  exhaust_cfm_shower?: number
  // Gas equipment details (for reference/reporting)
  gas_train_size_in?: number   // Gas train pipe size in inches
  gas_pressure_wc?: number     // Required gas pressure in " W.C.
  // Auto-calculate fixtures based on SF
  fixtures_per_sf?: {
    wcs?: number        // SF per WC
    lavs?: number       // SF per LAV
    showers?: number    // SF per shower
    floorDrains?: number // SF per floor drain
  }
  // Occupancy-based ventilation (ASHRAE 62.1)
  occupants_per_1000sf?: number
  rp_cfm_person?: number        // Outdoor air rate per person
  ra_cfm_sf?: number            // Outdoor air rate per area
  // ACH-based ventilation (thermal spaces)
  ceiling_height_ft?: number    // Default ceiling height for ACH calc
  ach_ventilation?: number      // Air changes per hour for ventilation
  ach_exhaust?: number          // Air changes per hour for exhaust
  // Equipment load calculation (thermal spaces)
  kw_per_cubic_meter?: number   // kW per m³ for electric heaters (saunas, steam)
  // Pool configuration
  pool_config?: {
    pools: PoolConfig[]
  }
  // Laundry equipment specs (from B&C Tech SP-75 & Huebsch HTT45)
  laundry_equipment?: {
    washer_kw: number           // kW per washer (with electric heat)
    washer_amps_208v: number    // Amps @ 208V per washer
    washer_water_gpm: number    // GPM water flow per washer
    washer_drain_gpm: number    // GPM drain discharge per washer
    washer_dfu: number          // DFU per washer
    dryer_gas_mbh: number       // MBH per dryer pocket (gas)
    dryer_kw_electric: number   // kW per dryer (electric heat)
    dryer_exhaust_cfm: number   // CFM exhaust per dryer
    dryer_mua_sqin: number      // Make-up air opening sq.in. per dryer
  }
  source_notes?: string
  // Default equipment line items - will be added to new zones of this type
  defaultEquipment?: Array<{
    id?: string  // Optional - generated at runtime if not present
    category: 'power' | 'lighting' | 'gas' | 'ventilation' | 'exhaust' | 'cooling' | 'pool_chiller' | 'heating' | 'dehumidification' | 'other'
    name: string
    quantity: number
    unit: string
    value: number
    notes?: string
  }>
}

// Note: Each zone specifies its own defaultFixtures, no global default needed

// Default rates (used for custom zones)
export const defaultRates: ZoneRates = {
  lighting_w_sf: 0.90,
  receptacle_va_sf: 2.0,
  ventilation_cfm_sf: 0.18,
  exhaust_cfm_sf: 0,
  cooling_sf_ton: 400,
  heating_btuh_sf: 25,
}

/**
 * Zone type defaults based on NYCECC, ASHRAE 62.1, and industry standards
 * 
 * RECEPTACLE LOADS: These are general convenience receptacles ONLY.
 * Major mechanical equipment loads are calculated separately via line items.
 * Typical values: 1-2 VA/SF (minimal), 2-3 VA/SF (standard), 4-5 VA/SF (office/computers)
 * 
 * FIXTURE COUNTS: Based on typical commercial facility layouts and NYC Plumbing Code
 */
export const zoneDefaults: Record<ZoneType, ZoneDefaults> = {
  // ============================================
  // CATEGORY 1: Support / Low-Intensity
  // ============================================
  reception: {
    displayName: 'Reception / Lounge',
    category: 'Support',
    defaultSF: 1500,
    defaultFixtures: {},  // Reception typically shares restrooms with building
    visibleFixtures: ['drinking_fountain', 'bottle_filler'],
    defaultRates: {
      lighting_w_sf: 0.90,
      receptacle_va_sf: 2,      // Phone chargers, task lights, display screens
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 30,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'NYC Mech Code/ASHRAE 62.1 public spaces; NYCECC lobby 0.90',
  },
  mechanical_room: {
    displayName: 'Mechanical Room',
    category: 'Support',
    defaultSF: 500,
    defaultFixtures: { 
      floor_drain_2in: 2,       // Equipment drains, relief valve discharge
      hose_bibb: 1,             // Maintenance
    },
    visibleFixtures: ['floor_drain_2in', 'floor_drain_3in', 'hose_bibb'],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 3,      // Controls, monitoring equipment
      ventilation_cfm_sf: 0.12,
      exhaust_cfm_sf: 0.12,
      cooling_sf_ton: 400,
      heating_btuh_sf: 15,
    },
    ventilation_cfm: 500,
    exhaust_cfm: 400,
    source_notes: 'Minimal ventilation; NYCECC mechanical 0.50',
  },
  retail: {
    displayName: 'Retail',
    category: 'Support',
    defaultSF: 800,
    defaultFixtures: {},      // Retail typically shares building restrooms
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 1.10,
      receptacle_va_sf: 2,      // POS, display lighting, signage
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 50,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.12,
    source_notes: 'NYCECC retail 1.10-1.20; ASHRAE retail rates',
  },
  office: {
    displayName: 'Office / Admin',
    category: 'Support',
    defaultSF: 400,
    defaultFixtures: {},      // Office typically shares building restrooms
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.78,
      receptacle_va_sf: 4,      // Computers, monitors, printers, chargers
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 5,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'NYCECC open office 0.78; ASHRAE office',
  },
  storage: {
    displayName: 'Storage',
    category: 'Support',
    defaultSF: 300,
    defaultFixtures: {},
    visibleFixtures: ['floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.40,
      receptacle_va_sf: 0.5,    // Minimal - occasional equipment
      ventilation_cfm_sf: 0.12,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 15,
    },
    source_notes: 'NYCECC storage 0.40-0.60',
  },
  break_room: {
    displayName: 'Break Room / Lounge',
    category: 'Support',
    defaultSF: 500,
    defaultFixtures: {
      kitchen_sink_commercial: 1,   // Pantry sink
      floor_drain_2in: 1,
      drinking_fountain: 1,
      dishwasher_private: 1,
    },
    visibleFixtures: ['kitchen_sink_commercial', 'floor_drain_2in', 'drinking_fountain', 'dishwasher_private'],
    defaultRates: {
      lighting_w_sf: 0.90,
      receptacle_va_sf: 5,      // Microwave (~1.5kW), fridge (~0.5kW), coffee maker (~1kW)
      ventilation_cfm_sf: 0.25,
      exhaust_cfm_sf: 0.10,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 25,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE 62.1 break room; Receptacle for small appliances only',
  },

  // ============================================
  // CATEGORY 2: Fitness
  // ============================================
  open_gym: {
    displayName: 'Open Gym / Fitness Floor',
    category: 'Fitness',
    defaultSF: 5000,
    defaultFixtures: {
      drinking_fountain: 2,
      bottle_filler: 2,
    },
    visibleFixtures: ['drinking_fountain', 'bottle_filler', 'floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.72,
      receptacle_va_sf: 2,      // Equipment controls/displays only - motors via line items
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 250,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 20,
    rp_cfm_person: 20,
    ra_cfm_sf: 0.06,
    source_notes: 'NYCECC exercise center 0.72; ASHRAE health club 20p/1000SF',
  },
  group_fitness: {
    displayName: 'Group Fitness Studio',
    category: 'Fitness',
    defaultSF: 2000,
    defaultFixtures: {
      drinking_fountain: 1,
    },
    visibleFixtures: ['drinking_fountain', 'bottle_filler'],
    defaultRates: {
      lighting_w_sf: 0.72,
      receptacle_va_sf: 2,      // AV system, instructor mic, sound
      ventilation_cfm_sf: 0.90,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 200,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 40,
    rp_cfm_person: 40,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE aerobics high Rp=40; high activity',
  },
  mma_studio: {
    displayName: 'MMA / Boxing Studio',
    category: 'Fitness',
    defaultSF: 2400,
    defaultFixtures: {
      drinking_fountain: 1,
      floor_drain_2in: 2,       // Mat cleaning drainage
    },
    visibleFixtures: ['drinking_fountain', 'floor_drain_2in', 'hose_bibb'],
    defaultRates: {
      lighting_w_sf: 0.72,
      receptacle_va_sf: 2,      // Timer displays, sound
      ventilation_cfm_sf: 1.00,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 30,
    rp_cfm_person: 30,
    ra_cfm_sf: 0.18,
    source_notes: 'High activity; similar to gymnasium',
  },
  yoga_studio: {
    displayName: 'Yoga Studio',
    category: 'Fitness',
    defaultSF: 800,
    defaultFixtures: {},
    visibleFixtures: ['drinking_fountain'],
    defaultRates: {
      lighting_w_sf: 0.65,
      receptacle_va_sf: 1.5,    // Minimal - sound system only
      ventilation_cfm_sf: 0.40,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 200,
      heating_btuh_sf: 30,
    },
    occupants_per_1000sf: 15,
    rp_cfm_person: 20,
    ra_cfm_sf: 0.06,
    source_notes: 'Lower intensity than aerobics',
  },
  pilates_studio: {
    displayName: 'Pilates Studio',
    category: 'Fitness',
    defaultSF: 600,
    defaultFixtures: {},
    visibleFixtures: ['drinking_fountain'],
    defaultRates: {
      lighting_w_sf: 0.65,
      receptacle_va_sf: 2,      // Reformer equipment minimal
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 200,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 10,
    rp_cfm_person: 15,
    ra_cfm_sf: 0.06,
    source_notes: 'Moderate intensity',
  },
  stretching_area: {
    displayName: 'Stretching / Recovery Area',
    category: 'Fitness',
    defaultSF: 500,
    defaultFixtures: {},
    visibleFixtures: ['drinking_fountain'],
    defaultRates: {
      lighting_w_sf: 0.65,
      receptacle_va_sf: 1.5,    // Minimal
      ventilation_cfm_sf: 0.25,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 10,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'Lower activity',
  },

  // ============================================
  // CATEGORY 3: Locker / Hygiene
  // NYC Plumbing Code: ~1 WC per 40 persons, 1 LAV per 40 persons, 1 shower per 40 persons
  // ============================================
  locker_room: {
    displayName: 'Locker Room',
    category: 'Locker/Hygiene',
    defaultSF: 2500,
    defaultFixtures: { 
      shower_public: 8,              // For ~100 person capacity
      lavatory_public: 6,            
      water_closet_valve_public: 4,  
      urinal_3_4in_valve: 2,         // Men's side
      floor_drain_2in: 6,            // Shower area drainage
    },
    visibleFixtures: ['shower_public', 'lavatory_public', 'water_closet_valve_public', 'urinal_3_4in_valve', 'floor_drain_2in', 'floor_drain_3in'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 1.5,    // Hair dryers at stations (limited), shavers
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 350,
      heating_btuh_sf: 30,
    },
    exhaust_cfm_toilet: 50,
    exhaust_cfm_shower: 20,
    occupants_per_1000sf: 25,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    fixtures_per_sf: {
      wcs: 400,
      lavs: 400,
      showers: 300,
      floorDrains: 400,
    },
    source_notes: 'NY Mech Code locker 0.5 cfm/SF exh; NYC Plumbing Code fixture ratios',
  },
  restroom: {
    displayName: 'Restroom',
    category: 'Locker/Hygiene',
    defaultSF: 200,
    defaultFixtures: { 
      lavatory_public: 2, 
      water_closet_valve_public: 2, 
      urinal_3_4in_valve: 1,
      floor_drain_2in: 1,
    },
    visibleFixtures: ['lavatory_public', 'water_closet_valve_public', 'urinal_3_4in_valve', 'floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 1,      // Hand dryers typically hardwired
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    exhaust_cfm_toilet: 50,
    rp_cfm_person: 7.5,
    ra_cfm_sf: 0.18,
    fixtures_per_sf: {
      wcs: 100,
      lavs: 100,
      floorDrains: 200,
    },
    source_notes: 'Public restroom rates; NYC Plumbing Code',
  },

  // ============================================
  // CATEGORY 4: Thermal / Contrast
  // ============================================
  banya_gas: {
    displayName: 'Banya (Gas)',
    category: 'Thermal',
    defaultSF: 500,
    defaultSubType: 'gas',
    switchable: false,
    defaultFixtures: { 
      floor_drain_3in: 2,      // Large drains for water/steam
      hose_bibb: 1,            // Cleanup
    },
    visibleFixtures: ['floor_drain_3in', 'hose_bibb'],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 1,      // Minimal - controls only
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 2.00,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    fixed_kw: 5,
    gas_mbh: 1260,
    gas_train_size_in: 1.25,
    gas_pressure_wc: 4.9,
    ventilation_cfm: 1260,
    exhaust_cfm: 1260,
    flue_size_in: 10,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'Power Flame J30A-12; Wet thermal',
  },
  sauna_gas: {
    displayName: 'Sauna (Gas)',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { floor_drain_2in: 1 },
    visibleFixtures: ['floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 1.00,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    fixed_kw: 2,
    gas_mbh: 91,
    flue_size_in: 8,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    ceiling_height_ft: 10,
    ach_ventilation: 6,
    ach_exhaust: 6,
    source_notes: '6 ACH vent + 6 ACH exhaust @ 10ft ceiling',
  },
  sauna_electric: {
    displayName: 'Sauna (Electric)',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'electric',
    switchable: true,
    defaultFixtures: { floor_drain_2in: 1 },
    visibleFixtures: ['floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 1.00,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    fixed_kw: 57,
    kw_per_cubic_meter: 1.0,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    ceiling_height_ft: 10,
    ach_ventilation: 6,
    ach_exhaust: 6,
    source_notes: '1 kW/m³ heater sizing',
  },
  steam_room: {
    displayName: 'Steam Room',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'electric',
    defaultFixtures: { 
      floor_drain_2in: 2,      // Condensate + cleanup
    },
    visibleFixtures: ['floor_drain_2in', 'floor_drain_3in'],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 1.00,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    fixed_kw: 57,
    kw_per_cubic_meter: 1.0,
    latent_adder: 0.5,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    ceiling_height_ft: 10,
    ach_ventilation: 6,
    ach_exhaust: 6,
    source_notes: '1 kW/m³ steam gen; 0.5 latent adder',
  },
  cold_plunge: {
    displayName: 'Cold Plunge',
    category: 'Thermal',
    defaultSF: 150,
    defaultSubType: 'electric',
    defaultFixtures: { 
      floor_drain_2in: 1,
      pool_fill: 1,            // Fill/overflow
    },
    visibleFixtures: ['floor_drain_2in', 'pool_fill', 'hose_bibb'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 1.5,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    fixed_kw: 25,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'Cold plunge chiller equipment',
  },
  snow_room: {
    displayName: 'Snow Room',
    category: 'Thermal',
    defaultSF: 100,
    defaultSubType: 'electric',
    defaultFixtures: { floor_drain_2in: 1 },
    visibleFixtures: ['floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0.20,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    fixed_kw: 20,
    source_notes: 'Snow machine equipment',
  },
  contrast_suite: {
    displayName: 'Contrast Suite (Hot/Cold)',
    category: 'Thermal',
    defaultSF: 1500,
    defaultSubType: 'electric',
    defaultFixtures: { 
      shower_public: 2,        // Rinse between contrasts
      floor_drain_3in: 4,
    },
    visibleFixtures: ['shower_public', 'floor_drain_3in', 'hose_bibb', 'pool_fill'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.40,
      exhaust_cfm_sf: 1.50,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    ventilation_cfm: 1500,
    exhaust_cfm: 1500,
    rp_cfm_person: 15,
    ra_cfm_sf: 0.06,
    defaultEquipment: [
      { category: 'power', name: 'Steam Room - 300 sqft', quantity: 1, unit: 'kW', value: 50 },
      { category: 'power', name: 'Pool Heater', quantity: 1, unit: 'kW', value: 50 },
      { category: 'power', name: 'Sauna - 300 sqft', quantity: 1, unit: 'kW', value: 75 },
      { category: 'power', name: 'Pool Pumps', quantity: 1, unit: 'kW', value: 7 },
      { category: 'pool_chiller', name: 'Pool Chiller', quantity: 1, unit: 'Tons', value: 5 },
    ],
    source_notes: 'Combined sauna + cold plunge; Natatorium-like',
  },

  // ============================================
  // CATEGORY 5: Pool / Spa
  // ============================================
  pool_indoor: {
    displayName: 'Pool (Indoor)',
    category: 'Pool/Spa',
    defaultSF: 3000,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { 
      floor_drain_3in: 4,
      trench_drain: 2,         // Deck perimeter
      pool_fill: 1,
      hose_bibb: 2,
    },
    visibleFixtures: ['floor_drain_3in', 'trench_drain', 'pool_fill', 'hose_bibb'],
    defaultRates: {
      lighting_w_sf: 0.90,
      receptacle_va_sf: 2,      // Pool controls, lighting
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 200,
      heating_btuh_sf: 0,
    },
    dehumidification_lb_hr: 75,
    ventilation_cfm: 1870,
    exhaust_cfm: 2050,
    pool_heater_gas_mbh: 600,
    pool_config: {
      pools: [
        { name: 'Main Pool', type: 'warm', surface_sf: 1200, temperature_f: 84, depth_ft: 4, heater_mbh: 400 },
      ]
    },
    source_notes: 'Natatorium; Configure pools in zone editor',
  },
  pool_outdoor: {
    displayName: 'Pool (Outdoor)',
    category: 'Pool/Spa',
    defaultSF: 2000,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { 
      trench_drain: 4,
    },
    visibleFixtures: ['trench_drain', 'pool_fill', 'hose_bibb'],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 0,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    defaultEquipment: [
      { category: 'gas', name: 'Pool Heater', quantity: 1, unit: 'MBH', value: 1000 },
    ],
    source_notes: 'Unconditioned outdoor',
  },
  hot_tub: {
    displayName: 'Hot Tub / Spa',
    category: 'Pool/Spa',
    defaultSF: 200,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { 
      floor_drain_2in: 1,
      hot_tub_fill: 1,
    },
    visibleFixtures: ['floor_drain_2in', 'hot_tub_fill', 'hose_bibb'],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 250,
      heating_btuh_sf: 0,
    },
    fixed_kw: 5,
    pool_heater_gas_mbh: 200,
    source_notes: 'High exhaust for humidity',
  },
  treatment_room: {
    displayName: 'Treatment Room',
    category: 'Pool/Spa',
    defaultSF: 150,
    defaultFixtures: { lavatory_public: 1 },
    visibleFixtures: ['lavatory_public'],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 2,      // Treatment equipment, warmer, steamer
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 13,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'General treatment room',
  },
  massage_room: {
    displayName: 'Massage Room',
    category: 'Pool/Spa',
    defaultSF: 120,
    defaultFixtures: { lavatory_public: 1 },
    visibleFixtures: ['lavatory_public'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 1.5,    // Oil warmer, music
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 30,
    },
    occupants_per_1000sf: 17,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'Massage therapy room; warmer temps typical',
  },
  couples_treatment: {
    displayName: 'Couples Treatment Room',
    category: 'Pool/Spa',
    defaultSF: 250,
    defaultFixtures: { 
      lavatory_public: 1,
      shower_private: 1,       // Private shower for couples suite
    },
    visibleFixtures: ['lavatory_public', 'shower_private', 'floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 30,
    },
    occupants_per_1000sf: 16,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'Couples massage/treatment room',
  },
  private_suite: {
    displayName: 'Private Suite',
    category: 'Pool/Spa',
    defaultSF: 400,
    defaultFixtures: { 
      lavatory_public: 1, 
      shower_public: 1, 
      water_closet_tank_public: 1,
      floor_drain_2in: 1,
    },
    visibleFixtures: ['lavatory_public', 'shower_public', 'water_closet_tank_public', 'floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0.20,
      cooling_sf_ton: 350,
      heating_btuh_sf: 28,
    },
    occupants_per_1000sf: 10,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'Private spa suite with full bath',
  },

  // ============================================
  // CATEGORY 6: Kitchen / Laundry
  // ============================================
  laundry_commercial: {
    displayName: 'Laundry (Commercial)',
    category: 'Kitchen/Laundry',
    defaultSF: 600,
    defaultSubType: 'gas',
    defaultFixtures: { 
      service_sink: 1,
      trench_drain: 3,
      washing_machine_commercial: 4,
    },
    visibleFixtures: ['service_sink', 'washing_machine_commercial', 'trench_drain'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 2,      // Washer controls only - motors via line items
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 200,
      heating_btuh_sf: 24,
    },
    requires_standby_power: true,
    ra_cfm_sf: 0.12,
    laundry_equipment: {
      washer_kw: 12.5,
      washer_amps_208v: 52,
      washer_water_gpm: 11,
      washer_drain_gpm: 62,
      washer_dfu: 6,
      dryer_gas_mbh: 95,
      dryer_kw_electric: 27.8,
      dryer_exhaust_cfm: 1200,
      dryer_mua_sqin: 288,
    },
    defaultEquipment: [
      { category: 'power', name: 'Commercial Washers (4x)', quantity: 4, unit: 'kW', value: 12.5 },
      { category: 'gas', name: 'Gas Dryers - Stacked (8 pockets)', quantity: 8, unit: 'MBH', value: 95 },
      { category: 'exhaust', name: 'Dryer Exhaust', quantity: 4, unit: 'CFM', value: 1200 },
      { category: 'ventilation', name: 'Laundry Make-Up Air', quantity: 4, unit: 'CFM', value: 1200 },
    ],
    source_notes: 'Commercial laundry; Equipment loads via line items',
  },
  laundry_residential: {
    displayName: 'Laundry (Residential)',
    category: 'Kitchen/Laundry',
    defaultSF: 150,
    defaultSubType: 'electric',
    defaultFixtures: { 
      floor_drain_2in: 1, 
      washing_machine_8lb_private: 1, 
      dryer_condensate: 1,
    },
    visibleFixtures: ['floor_drain_2in', 'washing_machine_8lb_private', 'dryer_condensate'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.12,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    fixed_kw: 8,
    exhaust_cfm: 200,
    ra_cfm_sf: 0.06,
    source_notes: 'Residential-scale laundry',
  },
  kitchen_commercial: {
    displayName: 'Kitchen (Commercial)',
    category: 'Kitchen/Laundry',
    defaultSF: 700,
    defaultSubType: 'gas',
    defaultFixtures: { 
      hand_sink: 2, 
      pot_sink_3comp: 1,
      prep_sink: 1,
      floor_drain_3in: 4,
      grease_interceptor: 1,
      dishwasher_commercial: 1,
    },
    visibleFixtures: ['hand_sink', 'pot_sink_3comp', 'prep_sink', 'floor_drain_3in', 'dishwasher_commercial', 'grease_interceptor'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 6,      // Small equipment - major via line items
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 300,
      heating_btuh_sf: 0,
    },
    gas_mbh: 490,
    requires_type1_hood: true,
    requires_mau: true,
    mau_cfm: 4000,
    grease_interceptor_gal: 500,
    source_notes: 'Type 1 hood; MAU 4000 CFM; Grease interceptor 500 gal',
  },
  kitchen_light_fb: {
    displayName: 'Kitchen (Light F&B)',
    category: 'Kitchen/Laundry',
    defaultSF: 300,
    defaultSubType: 'electric',
    defaultFixtures: { 
      hand_sink: 1, 
      bar_sink: 1,
      floor_drain_2in: 1,
      pot_sink_3comp: 1,
      dishwasher_commercial: 1,
    },
    visibleFixtures: ['hand_sink', 'bar_sink', 'floor_drain_2in', 'dishwasher_commercial', 'pot_sink_3comp'],
    defaultRates: {
      lighting_w_sf: 0.90,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0.30,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    fixed_kw: 15,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.12,
    source_notes: 'Light food service; no Type 1 hood',
  },

  // ============================================
  // CATEGORY 7: Event / Co-Work
  // ============================================
  cowork: {
    displayName: 'Co-Work Space',
    category: 'Event/CoWork',
    defaultSF: 4000,
    defaultFixtures: {
      drinking_fountain: 2,
      bottle_filler: 2,
    },
    visibleFixtures: ['drinking_fountain', 'bottle_filler'],
    defaultRates: {
      lighting_w_sf: 0.78,
      receptacle_va_sf: 4,      // Computers, monitors, chargers
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 10,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'Office-like; workstations',
  },
  conference_room: {
    displayName: 'Conference Room',
    category: 'Event/CoWork',
    defaultSF: 500,
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 3,      // AV system, displays, chargers
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 225,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 15,
    rp_cfm_person: 15,
    ra_cfm_sf: 0.06,
    source_notes: 'Higher vent for occupant density',
  },
  event_space: {
    displayName: 'Event Space / Studio',
    category: 'Event/CoWork',
    defaultSF: 6000,
    defaultFixtures: { 
      floor_drain_2in: 2,
      hose_bibb: 2,
    },
    visibleFixtures: ['floor_drain_2in', 'hose_bibb', 'drinking_fountain'],
    defaultRates: {
      lighting_w_sf: 1.20,
      receptacle_va_sf: 3,      // AV, display, catering warmers
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 250,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 50,
    rp_cfm_person: 7.5,
    ra_cfm_sf: 0.18,
    source_notes: 'Assembly rates; High occupant density',
  },
  screening_room: {
    displayName: 'Screening Room / Theater',
    category: 'Event/CoWork',
    defaultSF: 1000,
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 3,      // AV equipment
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
      heating_btuh_sf: 25,
    },
    fixed_kw: 5,
    occupants_per_1000sf: 150,
    rp_cfm_person: 7.5,
    ra_cfm_sf: 0.06,
    source_notes: 'Theater high density; AV equipment',
  },

  // ============================================
  // CATEGORY 8: Specialty
  // ============================================
  child_care: {
    displayName: 'Child Care',
    category: 'Specialty',
    defaultSF: 1200,
    defaultFixtures: { 
      lavatory_public: 3, 
      water_closet_tank_public: 3, 
      floor_drain_2in: 2,
      drinking_fountain: 2,
    },
    visibleFixtures: ['lavatory_public', 'water_closet_tank_public', 'floor_drain_2in', 'drinking_fountain'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 3,      // Bottle warmers, small appliances
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
      heating_btuh_sf: 30,
    },
    occupants_per_1000sf: 50,
    rp_cfm_person: 7.5,
    ra_cfm_sf: 0.18,
    source_notes: 'Daycare rates; Higher fixture count for children',
  },
  recovery_longevity: {
    displayName: 'Recovery & Longevity',
    category: 'Specialty',
    defaultSF: 1600,
    defaultFixtures: { 
      lavatory_public: 2, 
      floor_drain_2in: 2,
    },
    visibleFixtures: ['lavatory_public', 'floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.72,
      receptacle_va_sf: 3,      // Cryo, compression, monitoring equipment
      ventilation_cfm_sf: 0.25,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    fixed_kw: 20,
    occupants_per_1000sf: 10,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'Cryo; compression; etc. Similar to health club',
  },

  // ============================================
  // CATEGORY 9: Sports
  // ============================================
  basketball_court: {
    displayName: 'Basketball Court (Half)',
    category: 'Sports',
    defaultSF: 2400,
    defaultFixtures: {
      drinking_fountain: 2,
    },
    visibleFixtures: ['drinking_fountain', 'bottle_filler'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 1.5,    // Scoreboard, minimal
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 7,
    rp_cfm_person: 30,
    ra_cfm_sf: 0.18,
    source_notes: 'Gymnasium play area rates; Sports lighting',
  },
  padel_court: {
    displayName: 'Padel Court',
    category: 'Sports',
    defaultSF: 2200,
    defaultFixtures: {
      drinking_fountain: 2,
    },
    visibleFixtures: ['drinking_fountain', 'bottle_filler'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 1.5,
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 7,
    rp_cfm_person: 30,
    ra_cfm_sf: 0.18,
    source_notes: 'Sports arena; Sports lighting',
  },

  // ============================================
  // CATEGORY 10: F&B
  // ============================================
  cafe_light_fb: {
    displayName: 'Café / Light F&B',
    category: 'F&B',
    defaultSF: 1200,
    defaultSubType: 'electric',
    defaultFixtures: { 
      hand_sink: 1, 
      bar_sink: 1,
      floor_drain_2in: 1,
      pot_sink_3comp: 1,
    },
    visibleFixtures: ['hand_sink', 'bar_sink', 'floor_drain_2in', 'dishwasher_commercial', 'pot_sink_3comp'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 5,      // Espresso machines, refrigeration, POS
      ventilation_cfm_sf: 0.25,
      exhaust_cfm_sf: 0.20,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    fixed_kw: 10,
    occupants_per_1000sf: 20,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.12,
    source_notes: 'Dining/retail blend; Espresso, refrigeration',
  },

  // ============================================
  // CATEGORY 11: Outdoor
  // ============================================
  terrace: {
    displayName: 'Terrace / Outdoor',
    category: 'Outdoor',
    defaultSF: 2500,
    defaultFixtures: { 
      area_drain: 4,
      hose_bibb: 2,
      shower_public: 3,
    },
    visibleFixtures: ['area_drain', 'hose_bibb', 'shower_public'],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 1,      // Occasional outdoor outlet
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    source_notes: 'Unconditioned outdoor',
  },

  // ============================================
  // CATEGORY 12: Vertical Transportation
  // ============================================
  elevator: {
    displayName: 'Elevator',
    category: 'Vertical Transportation',
    defaultSF: 100,  // Typical elevator machine room/pit footprint
    defaultFixtures: {
      floor_drain_2in: 1,  // Pit sump/drain
    },
    visibleFixtures: ['floor_drain_2in', 'sump_pump'],
    defaultRates: {
      lighting_w_sf: 0.50,     // Minimal lighting in shaft/machine room
      receptacle_va_sf: 1,     // Minimal receptacles
      ventilation_cfm_sf: 0.10,
      exhaust_cfm_sf: 0.10,    // Machine room ventilation
      cooling_sf_ton: 0,       // Machine room may need cooling
      heating_btuh_sf: 10,
    },
    // Default equipment: Hydraulic elevator (most common for 2-5 floor buildings)
    // Typical specs: 2500-3500 lb capacity, 100-150 fpm
    defaultEquipment: [
      {
        category: 'power',
        name: 'Hydraulic Elevator (25 HP)',
        quantity: 1,
        unit: 'kW',
        value: 25,  // ~25 kW for typical hydraulic elevator (20-30 HP motor)
        notes: 'Hydraulic elevator - 3500 lb, 100 fpm, 2-5 floors',
      },
    ],
    source_notes: 'Hydraulic elevator: 20-30 HP (15-25 kW typical). Includes motor, controls, cab lighting, door operators.',
  },

  // ============================================
  // Custom Zone
  // ============================================
  custom: {
    displayName: 'Custom Zone',
    category: 'Custom',
    defaultSF: 1000,
    defaultFixtures: {},
    visibleFixtures: ['lavatory_public', 'water_closet_valve_public', 'floor_drain_2in'],
    defaultRates: { ...defaultRates },
    source_notes: 'User override',
  },
}

// Zone colors by category
const zoneColors: Record<string, string> = {
  Support: '#64748b',
  Fitness: '#10b981',
  'Locker/Hygiene': '#0ea5e9',
  Thermal: '#f59e0b',
  'Pool/Spa': '#06b6d4',
  'Kitchen/Laundry': '#8b5cf6',
  'Vertical Transportation': '#6366f1',  // Indigo for elevators
  'Event/CoWork': '#ec4899',
  Specialty: '#14b8a6',
  Sports: '#84cc16',
  'F&B': '#f97316',
  Outdoor: '#22c55e',
  Custom: '#94a3b8',
}

export function getZoneDefaults(type: ZoneType): ZoneDefaults {
  return zoneDefaults[type] || zoneDefaults.custom
}

export function getZoneColor(type: ZoneType): string {
  const defaults = getZoneDefaults(type)
  return zoneColors[defaults.category] || zoneColors.Custom
}

export function getZoneCategories(): string[] {
  return [...new Set(Object.values(zoneDefaults).map(d => d.category))]
}

export function getZoneTypesByCategory(category: string): ZoneType[] {
  return (Object.entries(zoneDefaults) as [ZoneType, ZoneDefaults][])
    .filter(([_, defaults]) => defaults.category === category)
    .map(([type]) => type)
}

// Auto-calculate fixtures based on SF for zones with fixtures_per_sf
export function calculateFixturesFromSF(
  type: ZoneType, 
  sf: number
): ZoneFixtures {
  const defaults = getZoneDefaults(type)
  const fixturesPerSF = defaults.fixtures_per_sf
  
  if (!fixturesPerSF) {
    return { ...defaults.defaultFixtures }
  }
  
  // Start with default fixtures
  const fixtures: ZoneFixtures = { ...defaults.defaultFixtures }
  
  // Override with SF-calculated values (using public fixture IDs for commercial spaces)
  if (fixturesPerSF.wcs) {
    fixtures['water_closet_valve_public'] = Math.max(1, Math.ceil(sf / fixturesPerSF.wcs))
  }
  if (fixturesPerSF.lavs) {
    fixtures['lavatory_public'] = Math.max(1, Math.ceil(sf / fixturesPerSF.lavs))
  }
  if (fixturesPerSF.showers) {
    fixtures['shower_public'] = Math.ceil(sf / fixturesPerSF.showers)
  }
  if (fixturesPerSF.floorDrains) {
    fixtures['floor_drain_2in'] = Math.max(1, Math.ceil(sf / fixturesPerSF.floorDrains))
  }
  
  return fixtures
}

// Calculate laundry loads based on equipment counts
export interface LaundryLoads {
  washer_kw: number
  washer_amps_208v: number
  dryer_kw: number
  total_kw: number
  total_amps_208v: number
  dryer_gas_mbh: number
  total_gas_cfh: number
  water_gpm: number
  drain_gpm: number
  total_dfu: number
  exhaust_cfm: number
  mua_sqft: number
}

// Calculate occupants for a zone based on SF
export function calculateOccupants(type: ZoneType, sf: number): number {
  const defaults = getZoneDefaults(type)
  if (defaults.occupants_per_1000sf) {
    return Math.ceil((sf / 1000) * defaults.occupants_per_1000sf)
  }
  // Default: 1 per 200 SF for general spaces
  return Math.ceil(sf / 200)
}

// Calculate ACH-based CFM for thermal zones
export function calculateACHBasedCFM(
  sf: number,
  ach: number,
  ceilingHeight: number = 10
): number {
  // CFM = (SF × Height × ACH) / 60
  return Math.ceil((sf * ceilingHeight * ach) / 60)
}

// Calculate equipment kW based on volume (for electric saunas, steam rooms)
// Formula: 1 kW per cubic meter
export function calculateEquipmentKW(
  sf: number,
  ceilingHeight: number = 10,
  kwPerCubicMeter: number = 1.0
): number {
  // Volume in cubic feet
  const volumeCF = sf * ceilingHeight
  // Convert to cubic meters (1 m³ = 35.315 CF)
  const volumeM3 = volumeCF / 35.315
  // kW = volume × rate
  return Math.ceil(volumeM3 * kwPerCubicMeter)
}

// Get equipment kW for a zone (uses kw_per_cubic_meter if defined, else fixed_kw)
export function getZoneEquipmentKW(type: ZoneType, sf: number, ceilingHeight?: number): number {
  const defaults = getZoneDefaults(type)
  
  // If zone has kW/m³ rate, calculate dynamically
  if (defaults.kw_per_cubic_meter) {
    const height = ceilingHeight || defaults.ceiling_height_ft || 10
    return calculateEquipmentKW(sf, height, defaults.kw_per_cubic_meter)
  }
  
  // Otherwise return fixed kW
  return defaults.fixed_kw || 0
}

// Get ventilation CFM for a zone (considers ACH or CFM/SF)
export function getZoneVentilationCFM(type: ZoneType, sf: number): number {
  const defaults = getZoneDefaults(type)
  
  // If zone has ACH-based ventilation, use that
  if (defaults.ach_ventilation && defaults.ceiling_height_ft) {
    return calculateACHBasedCFM(sf, defaults.ach_ventilation, defaults.ceiling_height_ft)
  }
  
  // If zone has fixed ventilation CFM, use that
  if (defaults.ventilation_cfm) {
    return defaults.ventilation_cfm
  }
  
  // Otherwise use rate-based
  return Math.ceil(sf * defaults.defaultRates.ventilation_cfm_sf)
}

// Get exhaust CFM for a zone (considers ACH or CFM/SF)
export function getZoneExhaustCFM(type: ZoneType, sf: number): number {
  const defaults = getZoneDefaults(type)
  
  // If zone has ACH-based exhaust, use that
  if (defaults.ach_exhaust && defaults.ceiling_height_ft) {
    return calculateACHBasedCFM(sf, defaults.ach_exhaust, defaults.ceiling_height_ft)
  }
  
  // If zone has fixed exhaust CFM, use that
  if (defaults.exhaust_cfm) {
    return defaults.exhaust_cfm
  }
  
  // Otherwise use rate-based
  return Math.ceil(sf * defaults.defaultRates.exhaust_cfm_sf)
}

// Pool heater sizing helper
export function calculatePoolHeaterMBH(
  surfaceSF: number,
  targetTemp: number,
  ambientTemp: number = 70,
  coverFactor: number = 0.5  // 0.5 = covered when not in use
): number {
  // Simplified pool heater sizing:
  // BTU/hr = Surface Area × ΔT × 10 × Cover Factor
  const deltaT = targetTemp - ambientTemp
  const baseMBH = (surfaceSF * deltaT * 10 * coverFactor) / 1000
  // Add 20% for startup/recovery
  return Math.ceil(baseMBH * 1.2)
}

// Custom laundry equipment specs (for zone-level overrides)
export interface CustomLaundryEquipment {
  washer_kw?: number
  washer_amps_208v?: number
  washer_water_gpm?: number
  washer_drain_gpm?: number
  washer_dfu?: number
  dryer_gas_mbh?: number
  dryer_kw_electric?: number
  dryer_exhaust_cfm?: number
  dryer_mua_sqin?: number
}

export function calculateLaundryLoads(
  washers: number,
  dryers: number,
  dryerType: 'gas' | 'electric' = 'gas',
  customEquip?: CustomLaundryEquipment
): LaundryLoads {
  const defaults = zoneDefaults.laundry_commercial
  const defaultEquip = defaults.laundry_equipment!
  
  // Merge custom equipment specs with defaults
  const equip = {
    washer_kw: customEquip?.washer_kw ?? defaultEquip.washer_kw,
    washer_amps_208v: customEquip?.washer_amps_208v ?? defaultEquip.washer_amps_208v,
    washer_water_gpm: customEquip?.washer_water_gpm ?? defaultEquip.washer_water_gpm,
    washer_drain_gpm: customEquip?.washer_drain_gpm ?? defaultEquip.washer_drain_gpm,
    washer_dfu: customEquip?.washer_dfu ?? defaultEquip.washer_dfu,
    dryer_gas_mbh: customEquip?.dryer_gas_mbh ?? defaultEquip.dryer_gas_mbh,
    dryer_kw_electric: customEquip?.dryer_kw_electric ?? defaultEquip.dryer_kw_electric,
    dryer_exhaust_cfm: customEquip?.dryer_exhaust_cfm ?? defaultEquip.dryer_exhaust_cfm,
    dryer_mua_sqin: customEquip?.dryer_mua_sqin ?? defaultEquip.dryer_mua_sqin,
  }
  
  const washer_kw = washers * equip.washer_kw
  const washer_amps_208v = washers * equip.washer_amps_208v
  const water_gpm = washers * equip.washer_water_gpm
  const drain_gpm = washers * equip.washer_drain_gpm
  const washer_dfu = washers * equip.washer_dfu
  
  const dryer_pockets = dryers * 2
  
  let dryer_kw = 0
  let dryer_gas_mbh = 0
  
  if (dryerType === 'electric') {
    dryer_kw = dryer_pockets * equip.dryer_kw_electric
  } else {
    dryer_gas_mbh = dryer_pockets * equip.dryer_gas_mbh
  }
  
  const exhaust_cfm = dryers * equip.dryer_exhaust_cfm
  const mua_sqin = dryers * equip.dryer_mua_sqin
  const mua_sqft = mua_sqin / 144
  
  const total_gas_cfh = dryer_gas_mbh
  
  return {
    washer_kw,
    washer_amps_208v,
    dryer_kw,
    total_kw: washer_kw + dryer_kw,
    total_amps_208v: washer_amps_208v + (dryer_kw * 1000 / 208 / 1.732),
    dryer_gas_mbh,
    total_gas_cfh,
    water_gpm,
    drain_gpm,
    total_dfu: washer_dfu + (dryers * 4),
    exhaust_cfm,
    mua_sqft,
  }
}
