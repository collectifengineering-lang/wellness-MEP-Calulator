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
  // ASHRAE ventilation space type mapping
  defaultVentilationSpaceType?: string  // ASHRAE 62.1/170 space type ID
  defaultVentilationStandard?: 'ashrae62' | 'ashrae170' | 'custom'  // Source standard
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
  // Residential exhaust rates per ASHRAE 62.2 (dual rates for intermittent vs continuous)
  exhaust_cfm_intermittent?: number   // Intermittent fan rate (higher CFM)
  exhaust_cfm_continuous?: number     // Continuous ERV rate (lower CFM)
  ventilation_mode?: 'intermittent' | 'continuous'  // Default mode for residential
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
    defaultVentilationSpaceType: 'reception',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'electrical_room',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'retail_sales',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'office',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'storage_conditioned',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'break_room',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'health_club_weights',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'health_club_aerobics',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'health_club_aerobics',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'yoga_studio',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'pilates_studio',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'spa_relaxation',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'spa_locker_room',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'toilet_public',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'sauna',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'sauna',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'sauna',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'steam_room',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'swimming_pool',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'spa_treatment',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'swimming_pool',
    defaultVentilationStandard: 'ashrae62',
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
    fixed_kw: 50,
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
    defaultVentilationSpaceType: 'swimming_pool',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'swimming_pool',
    defaultVentilationStandard: 'ashrae62',
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
    pool_heater_gas_mbh: 600,
    defaultEquipment: [
      { category: 'gas', name: 'Pool Heater', quantity: 1, unit: 'MBH', value: 600 },
    ],
    source_notes: 'Unconditioned outdoor',
  },
  hot_tub: {
    displayName: 'Hot Tub / Spa',
    category: 'Pool/Spa',
    defaultSF: 200,
    defaultSubType: 'gas',
    switchable: true,
    defaultVentilationSpaceType: 'hot_tub_area',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'spa_treatment',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'spa_massage',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'spa_treatment',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'spa_treatment',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'hotel_laundry',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'residential_laundry',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'kitchen_cooking',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'break_room',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'office',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'conference_meeting',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'hotel_multipurpose',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'auditorium',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'daycare_5plus',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'spa_treatment',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'gym_arena_play',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'gym_arena_play',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'cafe_fast_food',
    defaultVentilationStandard: 'ashrae62',
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
    defaultVentilationSpaceType: 'corridor',
    defaultVentilationStandard: 'custom',
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
    defaultVentilationSpaceType: 'corridor',
    defaultVentilationStandard: 'custom',
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
  // CATEGORY 13: Residential
  // ASHRAE 62.2 ventilation rates for dwelling units
  // ============================================
  res_kitchen_gas: {
    displayName: 'Kitchen (Residential Gas)',
    category: 'Residential',
    defaultSF: 200,
    defaultSubType: 'gas',
    switchable: true,
    defaultVentilationSpaceType: 'residential_kitchen',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {
      kitchen_sink_private: 1,
      dishwasher_private: 1,
      floor_drain_2in: 1,
    },
    visibleFixtures: ['kitchen_sink_private', 'dishwasher_private', 'floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 5,      // Appliances: microwave, toaster, mixer
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 400,
      heating_btuh_sf: 30,
    },
    exhaust_cfm_intermittent: 100,  // ASHRAE 62.2 - vented range hood
    exhaust_cfm_continuous: 25,     // ASHRAE 62.2 - continuous exhaust
    ventilation_mode: 'intermittent',
    occupants_per_1000sf: 10,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    defaultEquipment: [
      { category: 'gas', name: 'Gas Range (Standard)', quantity: 1, unit: 'MBH', value: 65, notes: 'GE Profile 30". HIGH-END: Wolf GR486G 90 MBH' },
      { category: 'power', name: 'Refrigerator', quantity: 1, unit: 'kW', value: 0.5, notes: 'Standard. HIGH-END: Sub-Zero BI-48S 0.8kW' },
      { category: 'power', name: 'Dishwasher', quantity: 1, unit: 'kW', value: 1.8, notes: 'Standard. HIGH-END: Miele G7566SCVi 2.2kW' },
      { category: 'power', name: 'Microwave', quantity: 1, unit: 'kW', value: 1.5 },
      { category: 'exhaust', name: 'Range Hood', quantity: 1, unit: 'CFM', value: 400, notes: 'Standard. HIGH-END: Wolf PW362418 600 CFM' },
    ],
    source_notes: `ASHRAE 62.2 residential kitchen; Gas cooking equipment.
HIGH-END ALTERNATIVES (Wolf/Thermador):
- Wolf 30" Pro Range GR304: 55 MBH
- Wolf 36" Pro Range GR366: 72 MBH
- Wolf 48" Pro Range GR486G: 90 MBH
- Wolf 60" Pro Range GR606DG: 108 MBH
- Wolf 36" Rangetop SRT366: 91 MBH
- Wolf 48" Rangetop SRT486G: 105 MBH
- Thermador Pro Harmony 36" PRG366WH: 72 MBH
- Thermador Pro Grand 48" PRG486WDG: 87 MBH
- Thermador Pro Grand 60" PRG606WEG: 108 MBH`,
  },
  res_kitchen_electric: {
    displayName: 'Kitchen (Residential Electric)',
    category: 'Residential',
    defaultSF: 200,
    defaultSubType: 'electric',
    switchable: true,
    defaultVentilationSpaceType: 'residential_kitchen',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {
      kitchen_sink_private: 1,
      dishwasher_private: 1,
      floor_drain_2in: 1,
    },
    visibleFixtures: ['kitchen_sink_private', 'dishwasher_private', 'floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 400,
      heating_btuh_sf: 30,
    },
    exhaust_cfm_intermittent: 100,
    exhaust_cfm_continuous: 25,
    ventilation_mode: 'intermittent',
    occupants_per_1000sf: 10,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    defaultEquipment: [
      // Standard tier - GE Profile / similar
      { category: 'power', name: 'Electric Range (Standard)', quantity: 1, unit: 'kW', value: 12.5, notes: 'GE Profile 30" slide-in. HIGH-END: Wolf IR36550 10.8kW' },
      { category: 'power', name: 'Refrigerator', quantity: 1, unit: 'kW', value: 0.5, notes: 'Standard. HIGH-END: Sub-Zero BI-48S 0.8kW' },
      { category: 'power', name: 'Dishwasher', quantity: 1, unit: 'kW', value: 1.8, notes: 'Standard. HIGH-END: Miele G7566SCVi 2.2kW' },
      { category: 'power', name: 'Microwave', quantity: 1, unit: 'kW', value: 1.5 },
      { category: 'exhaust', name: 'Range Hood', quantity: 1, unit: 'CFM', value: 400, notes: 'Standard. HIGH-END: Wolf PW362418 600 CFM' },
    ],
    source_notes: `ASHRAE 62.2 residential kitchen; Electric/induction equipment.
HIGH-END ALTERNATIVES (Wolf/Thermador/Miele):
- Wolf 36" Induction Range IR36550: 10.8 kW
- Wolf 36" Induction Cooktop CI365C/B: 11.0 kW
- Thermador 36" Induction Cooktop CIT367YM: 9.6 kW
- Thermador 36" Induction Range PRI36YBIT: 11.2 kW
- Miele 36" Induction Cooktop KM7897FL: 11.1 kW
- Wolf Convection Steam Oven CSO30PE: 5.3 kW
- Wolf Double Wall Oven DO30PE: 9.6 kW
- Sub-Zero 48" Built-In BI-48S: 0.8 kW
- Sub-Zero Wine Storage UW-24: 0.4 kW
- Wolf Warming Drawer WWD30: 0.5 kW`,
  },
  res_bathroom_master: {
    displayName: 'Bathroom (Master)',
    category: 'Residential',
    defaultSF: 120,
    defaultVentilationSpaceType: 'residential_bathroom',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {
      bathtub_whirlpool: 1,
      shower_private: 1,
      lavatory_private: 2,      // Dual sinks
      water_closet_tank_private: 1,
      bidet: 1,
      floor_drain_2in: 1,
    },
    visibleFixtures: ['bathtub_whirlpool', 'shower_private', 'lavatory_private', 'water_closet_tank_private', 'bidet', 'floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 2,      // Hair dryer, shavers
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0.42,     // 50 CFM / 120 SF
      cooling_sf_ton: 400,
      heating_btuh_sf: 35,
    },
    exhaust_cfm_intermittent: 50,   // ASHRAE 62.2 per bathroom
    exhaust_cfm_continuous: 20,     // ASHRAE 62.2 continuous
    ventilation_mode: 'intermittent',
    defaultEquipment: [
      { category: 'exhaust', name: 'Bath Exhaust Fan (Panasonic WhisperGreen)', quantity: 1, unit: 'CFM', value: 80, notes: 'FV-0811VFL5' },
      { category: 'power', name: 'Bath Exhaust Fan', quantity: 1, unit: 'kW', value: 0.05 },
      { category: 'power', name: 'Heated Floor (Electric)', quantity: 1, unit: 'kW', value: 1.5, notes: '~12 W/SF' },
    ],
    source_notes: 'ASHRAE 62.2 private bathroom; Master suite with dual vanity',
  },
  res_bathroom_standard: {
    displayName: 'Bathroom (Standard)',
    category: 'Residential',
    defaultSF: 60,
    defaultVentilationSpaceType: 'residential_bathroom',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {
      bathtub_private: 1,       // Tub/shower combo
      lavatory_private: 1,
      water_closet_tank_private: 1,
    },
    visibleFixtures: ['bathtub_private', 'lavatory_private', 'water_closet_tank_private', 'shower_private'],
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0.83,     // 50 CFM / 60 SF
      cooling_sf_ton: 400,
      heating_btuh_sf: 35,
    },
    exhaust_cfm_intermittent: 50,
    exhaust_cfm_continuous: 20,
    ventilation_mode: 'intermittent',
    defaultEquipment: [
      { category: 'exhaust', name: 'Bath Exhaust Fan (Panasonic WhisperCeiling)', quantity: 1, unit: 'CFM', value: 50, notes: 'FV-0511VQL1' },
      { category: 'power', name: 'Bath Exhaust Fan', quantity: 1, unit: 'kW', value: 0.03 },
    ],
    source_notes: 'ASHRAE 62.2 private bathroom; Standard tub/shower combo',
  },
  res_powder_room: {
    displayName: 'Powder Room',
    category: 'Residential',
    defaultSF: 30,
    defaultVentilationSpaceType: 'residential_bathroom',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {
      lavatory_private: 1,
      water_closet_tank_private: 1,
    },
    visibleFixtures: ['lavatory_private', 'water_closet_tank_private'],
    defaultRates: {
      lighting_w_sf: 1.20,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 1.67,     // 50 CFM / 30 SF
      cooling_sf_ton: 400,
      heating_btuh_sf: 30,
    },
    exhaust_cfm_intermittent: 50,
    exhaust_cfm_continuous: 20,
    ventilation_mode: 'intermittent',
    defaultEquipment: [
      { category: 'exhaust', name: 'Bath Exhaust Fan', quantity: 1, unit: 'CFM', value: 50 },
      { category: 'power', name: 'Bath Exhaust Fan', quantity: 1, unit: 'kW', value: 0.03 },
    ],
    source_notes: 'ASHRAE 62.2 private bathroom; Half bath / powder room',
  },
  res_bedroom_master: {
    displayName: 'Bedroom (Master)',
    category: 'Residential',
    defaultSF: 300,
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 1.5,    // Bedside lamps, chargers
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 500,      // Lower load - sleeping occupancy
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 7,    // ~2 people per bedroom
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE 62.2 dwelling unit; Master bedroom',
  },
  res_bedroom_standard: {
    displayName: 'Bedroom (Standard)',
    category: 'Residential',
    defaultSF: 150,
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 1.5,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 500,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 13,   // ~2 people per bedroom
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE 62.2 dwelling unit; Standard bedroom',
  },
  res_bedroom_guest: {
    displayName: 'Bedroom (Guest)',
    category: 'Residential',
    defaultSF: 180,
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 1.5,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 500,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 11,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE 62.2 dwelling unit; Guest bedroom',
  },
  res_living_room: {
    displayName: 'Living Room',
    category: 'Residential',
    defaultSF: 400,
    defaultSubType: 'gas',     // For fireplace option
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 2,      // TV, lamps, chargers
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 450,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 5,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    defaultEquipment: [
      { category: 'gas', name: 'Gas Fireplace (Direct Vent)', quantity: 1, unit: 'MBH', value: 40, notes: 'Optional - decorative/supplemental heat' },
    ],
    source_notes: 'ASHRAE 62.2 dwelling unit; Optional gas fireplace',
  },
  res_dining_room: {
    displayName: 'Dining Room',
    category: 'Residential',
    defaultSF: 200,
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.90,      // Chandelier/feature lighting
      receptacle_va_sf: 1.5,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 450,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 15,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE 62.2 dwelling unit; Formal dining',
  },
  res_family_room: {
    displayName: 'Family Room',
    category: 'Residential',
    defaultSF: 350,
    defaultSubType: 'gas',
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.70,
      receptacle_va_sf: 2.5,    // TV, gaming, multiple devices
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 8,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    defaultEquipment: [
      { category: 'gas', name: 'Gas Fireplace Insert', quantity: 1, unit: 'MBH', value: 35, notes: 'Optional' },
    ],
    source_notes: 'ASHRAE 62.2 dwelling unit; Casual living space',
  },
  res_office: {
    displayName: 'Home Office',
    category: 'Residential',
    defaultSF: 150,
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 4,      // Computer, monitors, printer
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,      // Higher due to equipment
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 7,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE 62.2 dwelling unit; Work from home office',
  },
  res_study: {
    displayName: 'Study / Library',
    category: 'Residential',
    defaultSF: 200,
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 5,
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE 62.2 dwelling unit; Reading/study room',
  },
  res_media_room: {
    displayName: 'Media Room / Theater',
    category: 'Residential',
    defaultSF: 300,
    defaultVentilationSpaceType: 'residential_living',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.60,      // Dimmable/theatrical
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,      // AV equipment heat load
      heating_btuh_sf: 20,
    },
    fixed_kw: 2,                // AV equipment
    occupants_per_1000sf: 20,   // Theater seating
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    defaultEquipment: [
      { category: 'power', name: 'AV Equipment (Projector, Receiver, Speakers)', quantity: 1, unit: 'kW', value: 2.0 },
    ],
    source_notes: 'ASHRAE 62.2 dwelling unit; Home theater/media room',
  },
  res_wine_cellar: {
    displayName: 'Wine Cellar',
    category: 'Residential',
    defaultSF: 100,
    defaultVentilationSpaceType: 'storage_conditioned',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {
      floor_drain_2in: 1,
    },
    visibleFixtures: ['floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 200,      // 55°F temperature control
      heating_btuh_sf: 0,       // No heating - naturally cool
    },
    defaultEquipment: [
      { category: 'cooling', name: 'Wine Cooling Unit', quantity: 1, unit: 'Tons', value: 0.5 },
      { category: 'power', name: 'Wine Cooling Unit', quantity: 1, unit: 'kW', value: 1.5 },
    ],
    source_notes: 'Wine storage at 55°F, 60-70% RH; Specialized cooling required',
  },
  res_pantry: {
    displayName: 'Pantry',
    category: 'Residential',
    defaultSF: 60,
    defaultVentilationSpaceType: 'storage_conditioned',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: ['floor_drain_2in'],
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 1,      // Occasional small appliance
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 20,
    },
    source_notes: 'Food storage/butler pantry',
  },
  res_mudroom: {
    displayName: 'Mudroom / Entry',
    category: 'Residential',
    defaultSF: 80,
    defaultVentilationSpaceType: 'corridor',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {
      floor_drain_2in: 1,
    },
    visibleFixtures: ['floor_drain_2in', 'service_sink'],
    defaultRates: {
      lighting_w_sf: 0.70,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 30,
    },
    source_notes: 'Entry/transition space; Floor drain for wet items',
  },
  res_corridor: {
    displayName: 'Corridor / Hallway',
    category: 'Residential',
    defaultSF: 100,
    defaultVentilationSpaceType: 'corridor',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 0.5,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 500,
      heating_btuh_sf: 20,
    },
    rp_cfm_person: 0,
    ra_cfm_sf: 0.06,
    source_notes: 'ASHRAE 62.2 corridor; Transfer air only',
  },
  res_closet_walkin: {
    displayName: 'Walk-in Closet',
    category: 'Residential',
    defaultSF: 80,
    defaultVentilationSpaceType: 'storage_conditioned',
    defaultVentilationStandard: 'ashrae62',
    defaultFixtures: {},
    visibleFixtures: [],
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 0.5,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 500,
      heating_btuh_sf: 20,
    },
    source_notes: 'Walk-in closet/dressing area',
  },

  // ============================================
  // Custom Zone
  // ============================================
  custom: {
    displayName: 'Custom Zone',
    category: 'Custom',
    defaultSF: 1000,
    defaultVentilationSpaceType: 'office',
    defaultVentilationStandard: 'custom',
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
  Residential: '#a855f7',     // Purple for residential spaces
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
  // WSFU values for plumbing
  total_wsfu_cold: number
  total_wsfu_hot: number
  total_wsfu_total: number
  // Hot water demand
  hot_water_gph: number
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
  // WSFU values for plumbing calculations
  washer_wsfu_cold?: number
  washer_wsfu_hot?: number
  washer_wsfu_total?: number
  // Hot water GPH per washer
  washer_hot_water_gph?: number
  dryer_gas_mbh?: number
  dryer_kw_electric?: number
  dryer_exhaust_cfm?: number
  dryer_mua_sqin?: number
}

// Default WSFU and GPH values for commercial washers (from NYC Plumbing Code / ASPE)
const DEFAULT_WASHER_WSFU_COLD = 6.0
const DEFAULT_WASHER_WSFU_HOT = 6.0
const DEFAULT_WASHER_WSFU_TOTAL = 8.0
const DEFAULT_WASHER_HOT_WATER_GPH = 60

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
    // WSFU values (customizable per zone)
    washer_wsfu_cold: customEquip?.washer_wsfu_cold ?? DEFAULT_WASHER_WSFU_COLD,
    washer_wsfu_hot: customEquip?.washer_wsfu_hot ?? DEFAULT_WASHER_WSFU_HOT,
    washer_wsfu_total: customEquip?.washer_wsfu_total ?? DEFAULT_WASHER_WSFU_TOTAL,
    washer_hot_water_gph: customEquip?.washer_hot_water_gph ?? DEFAULT_WASHER_HOT_WATER_GPH,
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
  
  // WSFU totals
  const total_wsfu_cold = washers * equip.washer_wsfu_cold
  const total_wsfu_hot = washers * equip.washer_wsfu_hot
  const total_wsfu_total = washers * equip.washer_wsfu_total
  
  // Hot water demand
  const hot_water_gph = washers * equip.washer_hot_water_gph
  
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
    // WSFU values
    total_wsfu_cold,
    total_wsfu_hot,
    total_wsfu_total,
    // Hot water demand
    hot_water_gph,
  }
}
