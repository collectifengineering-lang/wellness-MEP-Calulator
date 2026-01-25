import type { ZoneType, ZoneFixtures, ZoneRates } from '../types'

// Export the interface for use in settings store
export interface ZoneDefaults {
  displayName: string
  category: string
  defaultSF: number
  defaultSubType?: 'electric' | 'gas'
  switchable?: boolean
  defaultFixtures: ZoneFixtures
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
}

const defaultFixtures: ZoneFixtures = {
  showers: 0,
  lavs: 0,
  wcs: 0,
  floorDrains: 0,
  serviceSinks: 0,
  washingMachines: 0,
  dryers: 0,
}

const defaultRates: ZoneRates = {
  lighting_w_sf: 1.0,
  receptacle_va_sf: 3.0,
  ventilation_cfm_sf: 0.15,
  exhaust_cfm_sf: 0,
  cooling_sf_ton: 400,
  heating_btuh_sf: 25,
}

// Zone type defaults based on COLLECTIF's Wyncatcher DDR report
export const zoneDefaults: Record<ZoneType, ZoneDefaults> = {
  // CATEGORY 1: Support / Low-Intensity
  reception: {
    displayName: 'Reception / Lounge',
    category: 'Support',
    defaultSF: 1500,
    defaultFixtures: { ...defaultFixtures, lavs: 2, wcs: 2 },
    defaultRates: {
      lighting_w_sf: 1.5,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
  },
  mechanical_room: {
    displayName: 'Mechanical Room',
    category: 'Support',
    defaultSF: 500,
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0, // typically unconditioned
      heating_btuh_sf: 0,
    },
    ventilation_cfm: 500,
    exhaust_cfm: 400,
  },
  retail: {
    displayName: 'Retail',
    category: 'Support',
    defaultSF: 800,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.5,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
  },
  office: {
    displayName: 'Office / Admin',
    category: 'Support',
    defaultSF: 400,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.2,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
  },
  storage: {
    displayName: 'Storage',
    category: 'Support',
    defaultSF: 300,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.8,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
  },

  // CATEGORY 2: Fitness
  open_gym: {
    displayName: 'Open Gym / Fitness Floor',
    category: 'Fitness',
    defaultSF: 5000,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 8,
      ventilation_cfm_sf: 0.20,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
  },
  group_fitness: {
    displayName: 'Group Fitness Studio',
    category: 'Fitness',
    defaultSF: 2000,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.2,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0.25,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
  },

  // CATEGORY 3: Locker / Hygiene
  locker_room: {
    displayName: 'Locker Room',
    category: 'Locker/Hygiene',
    defaultSF: 2500,
    defaultFixtures: { ...defaultFixtures, showers: 10, lavs: 5, wcs: 6, floorDrains: 4 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 30,
    },
    exhaust_cfm_toilet: 50,
    exhaust_cfm_shower: 20,
    // Auto-calculate fixtures based on SF (wellness facility ratios)
    fixtures_per_sf: {
      wcs: 400,          // 1 WC per 400 SF in locker room
      lavs: 500,         // 1 LAV per 500 SF
      showers: 250,      // 1 shower per 250 SF
      floorDrains: 600,  // 1 floor drain per 600 SF
    },
  },
  restroom: {
    displayName: 'Restroom',
    category: 'Locker/Hygiene',
    defaultSF: 150,
    defaultFixtures: { ...defaultFixtures, lavs: 1, wcs: 1, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    exhaust_cfm_toilet: 50,
    // Auto-calculate fixtures based on SF (IBC typical ratios)
    fixtures_per_sf: {
      wcs: 75,           // 1 WC per 75 SF
      lavs: 100,         // 1 LAV per 100 SF
      floorDrains: 300,  // 1 floor drain per 300 SF
    },
  },

  // CATEGORY 4: Thermal / Contrast (Switchable)
  banya_gas: {
    displayName: 'Banya (Gas)',
    category: 'Thermal',
    defaultSF: 500,
    defaultSubType: 'gas',
    switchable: false, // Banya is typically gas-only
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.5,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0.75,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 200,
      heating_btuh_sf: 0,
    },
    // Power Flame J30A-12 Banya Furnace (1,260 MBH)
    // Blower: 1/3 HP @ 3450 RPM ≈ 0.25 kW + controls + ignition system
    fixed_kw: 5,
    gas_mbh: 1260,           // Max capacity per Power Flame spec
    gas_train_size_in: 1.25, // 1-1/4" gas train
    gas_pressure_wc: 4.9,    // Required inlet pressure
    ventilation_cfm: 1260,
    exhaust_cfm: 1260,
    flue_size_in: 10,        // SS Double Wall per Wyncatcher DDR
  },
  sauna_gas: {
    displayName: 'Sauna (Gas)',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.5,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 250,
      heating_btuh_sf: 0,
    },
    fixed_kw: 2,
    gas_mbh: 91,
    ventilation_cfm: 910,
    exhaust_cfm: 910,
    flue_size_in: 8,
  },
  sauna_electric: {
    displayName: 'Sauna (Electric)',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'electric',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.5,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 250,
      heating_btuh_sf: 0,
    },
    fixed_kw: 30,
    ventilation_cfm: 910,
    exhaust_cfm: 910,
  },
  steam_room: {
    displayName: 'Steam Room',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.5,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 150,
      heating_btuh_sf: 0,
    },
    fixed_kw: 15,
    ventilation_cfm: 400,
    exhaust_cfm: 400,
    latent_adder: 0.5,
  },
  cold_plunge: {
    displayName: 'Cold Plunge',
    category: 'Thermal',
    defaultSF: 150,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.10,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
      heating_btuh_sf: 0,
    },
    fixed_kw: 25,
  },
  snow_room: {
    displayName: 'Snow Room',
    category: 'Thermal',
    defaultSF: 100,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 100,
      heating_btuh_sf: 0,
    },
    fixed_kw: 20,
  },

  // CATEGORY 5: Pool / Specialty
  pool_indoor: {
    displayName: 'Pool (Indoor)',
    category: 'Pool/Spa',
    defaultSF: 3000,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 4 },
    defaultRates: {
      lighting_w_sf: 1.5,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 200,
      heating_btuh_sf: 0,
    },
    dehumidification_lb_hr: 75,
    ventilation_cfm: 1870,
    exhaust_cfm: 2050,
    pool_heater_gas_mbh: 600,
  },
  pool_outdoor: {
    displayName: 'Pool (Outdoor)',
    category: 'Pool/Spa',
    defaultSF: 2000,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.5,
      receptacle_va_sf: 1,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    pool_heater_gas_mbh: 600,
  },
  hot_tub: {
    displayName: 'Hot Tub / Spa',
    category: 'Pool/Spa',
    defaultSF: 200,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.10,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 250,
      heating_btuh_sf: 0,
    },
    fixed_kw: 5,
    pool_heater_gas_mbh: 200,
  },
  treatment_room: {
    displayName: 'Treatment Room',
    category: 'Pool/Spa',
    defaultSF: 150,
    defaultFixtures: { ...defaultFixtures, lavs: 1 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
  },

  // CATEGORY 6: Kitchen / Laundry
  // Equipment specs from B&C Tech SP-75 Washer & Huebsch HTT45 Dryer cutsheets
  laundry_commercial: {
    displayName: 'Laundry (Commercial)',
    category: 'Kitchen/Laundry',
    defaultSF: 600,
    defaultSubType: 'gas',
    defaultFixtures: { ...defaultFixtures, floorDrains: 2, serviceSinks: 1, washingMachines: 4, dryers: 6 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 2, // Base receptacle only - equipment calculated separately
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    requires_standby_power: true,
    // Based on B&C Tech SP-75 (75lb washer) & Huebsch HTT45 (45lb stacked dryer)
    laundry_equipment: {
      // SP-75 Washer: 208-240V 3PH w/Electric Heat = 52A @ 60A breaker
      washer_kw: 12.5,          // ~52A @ 240V = 12.5kW (with electric heat)
      washer_amps_208v: 52,     // Full load amps with electric heat
      washer_water_gpm: 11,     // Flow rate @ 45 PSI
      washer_drain_gpm: 62,     // Discharge rate
      washer_dfu: 6,            // 3" drain = 6 DFU per IPC Table 709.1
      // HTT45 Dryer (per pocket): 95,000 BTU/hr gas, 1,200 CFM exhaust
      dryer_gas_mbh: 95,        // MBH per pocket (stacked = 2 pockets = 190 MBH)
      dryer_kw_electric: 27.8,  // kW equivalent if electric (from spec)
      dryer_exhaust_cfm: 1200,  // Max airflow per unit
      dryer_mua_sqin: 288,      // Required make-up air opening per dryer
    },
  },
  laundry_residential: {
    displayName: 'Laundry (Residential)',
    category: 'Kitchen/Laundry',
    defaultSF: 150,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, floorDrains: 1, washingMachines: 1, dryers: 1 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    fixed_kw: 8,
    exhaust_cfm: 200,
  },
  kitchen_commercial: {
    displayName: 'Kitchen (Commercial)',
    category: 'Kitchen/Laundry',
    defaultSF: 700,
    defaultSubType: 'gas',
    defaultFixtures: { ...defaultFixtures, lavs: 2, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 1.5,
      receptacle_va_sf: 15,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
      heating_btuh_sf: 0,
    },
    gas_mbh_per_sf: 0.7,
    requires_type1_hood: true,
    requires_mau: true,
    mau_cfm: 4000,
    grease_interceptor_gal: 500,
  },
  kitchen_light_fb: {
    displayName: 'Kitchen (Light F&B)',
    category: 'Kitchen/Laundry',
    defaultSF: 300,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, lavs: 1, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.2,
      receptacle_va_sf: 10,
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0.20,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    fixed_kw: 15,
  },

  // ============================================
  // NEW ZONE TYPES FROM SPX PLANS
  // ============================================

  // CATEGORY: Co-Work / Event
  cowork: {
    displayName: 'Co-Work Space',
    category: 'Event/CoWork',
    defaultSF: 4000,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.2,
      receptacle_va_sf: 8, // High receptacle for workstations
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
  },
  conference_room: {
    displayName: 'Conference Room',
    category: 'Event/CoWork',
    defaultSF: 500,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.3,
      receptacle_va_sf: 6,
      ventilation_cfm_sf: 0.20, // Higher for occupant density
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300, // Higher for occupant heat gain
      heating_btuh_sf: 25,
    },
  },
  event_space: {
    displayName: 'Event Space / Studio',
    category: 'Event/CoWork',
    defaultSF: 6000,
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 2.0, // Event lighting
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0.25, // High occupant density
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 250, // More cooling for crowds
      heating_btuh_sf: 25,
    },
  },
  screening_room: {
    displayName: 'Screening Room / Theater',
    category: 'Event/CoWork',
    defaultSF: 1000,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.8, // Low ambient lighting
      receptacle_va_sf: 4,
      ventilation_cfm_sf: 0.20,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
      heating_btuh_sf: 25,
    },
    fixed_kw: 5, // AV equipment
  },

  // CATEGORY: Childcare
  child_care: {
    displayName: 'Child Care',
    category: 'Specialty',
    defaultSF: 1200,
    defaultFixtures: { ...defaultFixtures, lavs: 2, wcs: 2, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.5,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.25, // Higher for children
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 30,
    },
  },

  // CATEGORY: Specialty Wellness
  contrast_suite: {
    displayName: 'Contrast Suite (Hot/Cold)',
    category: 'Thermal',
    defaultSF: 1500,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, showers: 2, floorDrains: 4 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 200,
      heating_btuh_sf: 0,
    },
    fixed_kw: 50, // Combined sauna + cold plunge equipment
    ventilation_cfm: 1500,
    exhaust_cfm: 1500,
  },
  recovery_longevity: {
    displayName: 'Recovery & Longevity',
    category: 'Specialty',
    defaultSF: 1600,
    defaultFixtures: { ...defaultFixtures, lavs: 2, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 5, // Medical-grade equipment
      ventilation_cfm_sf: 0.20,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    fixed_kw: 20, // Cryo, compression, etc.
  },

  // CATEGORY: Fitness Studios
  mma_studio: {
    displayName: 'MMA / Boxing Studio',
    category: 'Fitness',
    defaultSF: 2400,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.2,
      receptacle_va_sf: 4,
      ventilation_cfm_sf: 0.30, // High intensity activity
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300, // More cooling needed
      heating_btuh_sf: 25,
    },
  },
  yoga_studio: {
    displayName: 'Yoga Studio',
    category: 'Fitness',
    defaultSF: 800,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.20,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 30, // May want warmer
    },
  },
  pilates_studio: {
    displayName: 'Pilates Studio',
    category: 'Fitness',
    defaultSF: 600,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.2,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
  },
  stretching_area: {
    displayName: 'Stretching / Recovery Area',
    category: 'Fitness',
    defaultSF: 500,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.0,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.15,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
  },

  // CATEGORY: Sports Courts
  basketball_court: {
    displayName: 'Basketball Court (Half)',
    category: 'Sports',
    defaultSF: 2400, // ~50'x50' half court
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.5, // Sports lighting
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.25,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
  },
  padel_court: {
    displayName: 'Padel Court',
    category: 'Sports',
    defaultSF: 2200, // ~66'x33'
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.8, // High sports lighting
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.25,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
  },

  // CATEGORY: F&B
  cafe_light_fb: {
    displayName: 'Café / Light F&B',
    category: 'F&B',
    defaultSF: 1200,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, lavs: 1, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.5,
      receptacle_va_sf: 8, // Espresso machines, etc.
      ventilation_cfm_sf: 0.20,
      exhaust_cfm_sf: 0.15,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    fixed_kw: 10, // Espresso, refrigeration
  },

  // CATEGORY: Outdoor
  terrace: {
    displayName: 'Terrace / Outdoor',
    category: 'Outdoor',
    defaultSF: 2500,
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.5, // Landscape/accent lighting
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0, // Unconditioned
      heating_btuh_sf: 0,
    },
  },

  // Custom zone
  custom: {
    displayName: 'Custom Zone',
    category: 'Custom',
    defaultSF: 1000,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: { ...defaultRates },
  },
}

// Zone colors by category
const zoneColors: Record<string, string> = {
  Support: '#64748b',        // slate
  Fitness: '#10b981',        // emerald
  'Locker/Hygiene': '#0ea5e9', // sky
  Thermal: '#f59e0b',        // amber
  'Pool/Spa': '#06b6d4',     // cyan
  'Kitchen/Laundry': '#8b5cf6', // violet
  'Event/CoWork': '#ec4899', // pink
  Specialty: '#14b8a6',      // teal
  Sports: '#84cc16',         // lime
  'F&B': '#f97316',          // orange
  Outdoor: '#22c55e',        // green
  Custom: '#94a3b8',         // gray
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
): Partial<ZoneFixtures> {
  const defaults = getZoneDefaults(type)
  const fixturesPerSF = defaults.fixtures_per_sf
  
  if (!fixturesPerSF) {
    return defaults.defaultFixtures
  }
  
  return {
    wcs: fixturesPerSF.wcs ? Math.max(1, Math.ceil(sf / fixturesPerSF.wcs)) : defaults.defaultFixtures.wcs,
    lavs: fixturesPerSF.lavs ? Math.max(1, Math.ceil(sf / fixturesPerSF.lavs)) : defaults.defaultFixtures.lavs,
    showers: fixturesPerSF.showers ? Math.ceil(sf / fixturesPerSF.showers) : defaults.defaultFixtures.showers,
    floorDrains: fixturesPerSF.floorDrains ? Math.max(1, Math.ceil(sf / fixturesPerSF.floorDrains)) : defaults.defaultFixtures.floorDrains,
    serviceSinks: defaults.defaultFixtures.serviceSinks,
    washingMachines: defaults.defaultFixtures.washingMachines,
    dryers: defaults.defaultFixtures.dryers,
  }
}

// Calculate laundry loads based on equipment counts
export interface LaundryLoads {
  // Electrical
  washer_kw: number
  washer_amps_208v: number
  dryer_kw: number           // If electric dryers
  total_kw: number
  total_amps_208v: number
  // Gas (if gas dryers)
  dryer_gas_mbh: number
  total_gas_cfh: number
  // Water
  water_gpm: number
  drain_gpm: number
  total_dfu: number
  // Ventilation
  exhaust_cfm: number
  mua_sqft: number           // Make-up air in sq.ft.
}

export function calculateLaundryLoads(
  washers: number,
  dryers: number,
  dryerType: 'gas' | 'electric' = 'gas'
): LaundryLoads {
  const defaults = zoneDefaults.laundry_commercial
  const equip = defaults.laundry_equipment!
  
  // Washer loads
  const washer_kw = washers * equip.washer_kw
  const washer_amps_208v = washers * equip.washer_amps_208v
  const water_gpm = washers * equip.washer_water_gpm
  const drain_gpm = washers * equip.washer_drain_gpm
  const washer_dfu = washers * equip.washer_dfu
  
  // Dryer loads (per pocket - stacked dryers have 2 pockets)
  // Assuming stacked dryers = 2 pockets per unit
  const dryer_pockets = dryers * 2
  
  let dryer_kw = 0
  let dryer_gas_mbh = 0
  
  if (dryerType === 'electric') {
    dryer_kw = dryer_pockets * equip.dryer_kw_electric
  } else {
    dryer_gas_mbh = dryer_pockets * equip.dryer_gas_mbh
  }
  
  // Exhaust & make-up air (per dryer unit, not per pocket)
  const exhaust_cfm = dryers * equip.dryer_exhaust_cfm
  const mua_sqin = dryers * equip.dryer_mua_sqin
  const mua_sqft = mua_sqin / 144 // Convert to sq.ft.
  
  // Gas CFH (1 CFH = ~1,000 BTU/hr for natural gas)
  const total_gas_cfh = dryer_gas_mbh // MBH = 1000 BTU/hr, so CFH ≈ MBH
  
  return {
    washer_kw,
    washer_amps_208v,
    dryer_kw,
    total_kw: washer_kw + dryer_kw,
    total_amps_208v: washer_amps_208v + (dryer_kw * 1000 / 208 / 1.732), // Approx 3-phase
    dryer_gas_mbh,
    total_gas_cfh,
    water_gpm,
    drain_gpm,
    total_dfu: washer_dfu + (dryers * 4), // Dryers typically 4 DFU for condensate
    exhaust_cfm,
    mua_sqft,
  }
}
