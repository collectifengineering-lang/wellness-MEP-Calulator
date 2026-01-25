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
  // Occupancy-based ventilation (ASHRAE 62.1)
  occupants_per_1000sf?: number
  rp_cfm_person?: number        // Outdoor air rate per person
  ra_cfm_sf?: number            // Outdoor air rate per area
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

// Default rates (used for custom zones)
export const defaultRates: ZoneRates = {
  lighting_w_sf: 0.90,
  receptacle_va_sf: 5.0,
  ventilation_cfm_sf: 0.18,
  exhaust_cfm_sf: 0,
  cooling_sf_ton: 400,
  heating_btuh_sf: 25,
}

// Zone type defaults based on NYCECC, ASHRAE 62.1, and COLLECTIF standards
export const zoneDefaults: Record<ZoneType, ZoneDefaults> = {
  // ============================================
  // CATEGORY 1: Support / Low-Intensity
  // ============================================
  reception: {
    displayName: 'Reception / Lounge',
    category: 'Support',
    defaultSF: 1500,
    defaultFixtures: { ...defaultFixtures, lavs: 2, wcs: 2 },
    defaultRates: {
      lighting_w_sf: 0.90,
      receptacle_va_sf: 4,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    source_notes: 'NYC Mech Code/ASHRAE 62.1 public spaces; NYCECC lobby 0.90',
  },
  mechanical_room: {
    displayName: 'Mechanical Room',
    category: 'Support',
    defaultSF: 500,
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0.12,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    ventilation_cfm: 500,
    exhaust_cfm: 400,
    source_notes: 'Minimal ventilation; NYCECC mechanical 0.50',
  },
  retail: {
    displayName: 'Retail',
    category: 'Support',
    defaultSF: 800,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.10,
      receptacle_va_sf: 5,
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
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.78,
      receptacle_va_sf: 6,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
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
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.40,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.06,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    source_notes: 'NYCECC storage 0.40-0.60',
  },

  // ============================================
  // CATEGORY 2: Fitness
  // ============================================
  open_gym: {
    displayName: 'Open Gym / Fitness Floor',
    category: 'Fitness',
    defaultSF: 5000,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.72,
      receptacle_va_sf: 12,
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 20,
    rp_cfm_person: 20,
    ra_cfm_sf: 0.06,
    source_notes: 'NYCECC exercise center 0.72; ASHRAE health club/weight 20p/1000SF + Rp=20',
  },
  group_fitness: {
    displayName: 'Group Fitness Studio',
    category: 'Fitness',
    defaultSF: 2000,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.72,
      receptacle_va_sf: 8,
      ventilation_cfm_sf: 0.90,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
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
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.72,
      receptacle_va_sf: 8,
      ventilation_cfm_sf: 1.00,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 30,
    rp_cfm_person: 30,
    ra_cfm_sf: 0.18,
    source_notes: 'Similar to gymnasium play area',
  },
  yoga_studio: {
    displayName: 'Yoga Studio',
    category: 'Fitness',
    defaultSF: 800,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.65,
      receptacle_va_sf: 4,
      ventilation_cfm_sf: 0.40,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
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
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.65,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
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
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.65,
      receptacle_va_sf: 5,
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
  // ============================================
  locker_room: {
    displayName: 'Locker Room',
    category: 'Locker/Hygiene',
    defaultSF: 2500,
    defaultFixtures: { ...defaultFixtures, showers: 10, lavs: 5, wcs: 6, floorDrains: 4 },
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 3,
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
      lavs: 500,
      showers: 250,
      floorDrains: 600,
    },
    source_notes: 'NY Mech Code locker 0.5 cfm/SF exh continuous; NYCECC ~0.60',
  },
  restroom: {
    displayName: 'Restroom',
    category: 'Locker/Hygiene',
    defaultSF: 150,
    defaultFixtures: { ...defaultFixtures, lavs: 1, wcs: 1, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    exhaust_cfm_toilet: 50,
    rp_cfm_person: 7.5,
    ra_cfm_sf: 0.18,
    fixtures_per_sf: {
      wcs: 75,
      lavs: 100,
      floorDrains: 300,
    },
    source_notes: 'Public restroom rates',
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
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 2.00,
      cooling_sf_ton: 200,
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
    source_notes: 'Power Flame J30A-12; Wet thermal; dedicated exh 4-10 ACH typical',
  },
  sauna_gas: {
    displayName: 'Sauna (Gas)',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 250,
      heating_btuh_sf: 0,
    },
    fixed_kw: 2,
    gas_mbh: 91,
    ventilation_cfm: 910,
    exhaust_cfm: 910,
    flue_size_in: 8,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'Dry sauna lower vent',
  },
  sauna_electric: {
    displayName: 'Sauna (Electric)',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'electric',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 250,
      heating_btuh_sf: 0,
    },
    fixed_kw: 30,
    ventilation_cfm: 910,
    exhaust_cfm: 910,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: '30 fixed kW electric heater',
  },
  steam_room: {
    displayName: 'Steam Room',
    category: 'Thermal',
    defaultSF: 200,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 2.00,
      cooling_sf_ton: 150,
      heating_btuh_sf: 0,
    },
    fixed_kw: 15,
    ventilation_cfm: 400,
    exhaust_cfm: 400,
    latent_adder: 0.5,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'Very high latent/exh; 0.5 latent adder',
  },
  cold_plunge: {
    displayName: 'Cold Plunge',
    category: 'Thermal',
    defaultSF: 150,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 1.00,
      cooling_sf_ton: 300,
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
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.20,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 100,
      heating_btuh_sf: 0,
    },
    fixed_kw: 20,
    source_notes: 'Minimal vent + exh; 20 fixed kW',
  },
  contrast_suite: {
    displayName: 'Contrast Suite (Hot/Cold)',
    category: 'Thermal',
    defaultSF: 1500,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, showers: 2, floorDrains: 4 },
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.40,
      exhaust_cfm_sf: 1.50,
      cooling_sf_ton: 200,
      heating_btuh_sf: 0,
    },
    fixed_kw: 50,
    ventilation_cfm: 1500,
    exhaust_cfm: 1500,
    rp_cfm_person: 15,
    ra_cfm_sf: 0.06,
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
    defaultFixtures: { ...defaultFixtures, floorDrains: 4 },
    defaultRates: {
      lighting_w_sf: 0.90,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 200,
      heating_btuh_sf: 0,
    },
    dehumidification_lb_hr: 75,
    ventilation_cfm: 1870,
    exhaust_cfm: 2050,
    pool_heater_gas_mbh: 600,
    source_notes: 'Natatorium special rates (ASHRAE 62.1 Appendix); 0.48 lb/hr dehumid',
  },
  pool_outdoor: {
    displayName: 'Pool (Outdoor)',
    category: 'Pool/Spa',
    defaultSF: 2000,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    pool_heater_gas_mbh: 600,
    source_notes: 'Unconditioned outdoor',
  },
  hot_tub: {
    displayName: 'Hot Tub / Spa',
    category: 'Pool/Spa',
    defaultSF: 200,
    defaultSubType: 'gas',
    switchable: true,
    defaultFixtures: { ...defaultFixtures, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 3,
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
    defaultFixtures: { ...defaultFixtures, lavs: 1 },
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 4,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    rp_cfm_person: 5,
    ra_cfm_sf: 0.06,
    source_notes: 'Similar to health clinic',
  },

  // ============================================
  // CATEGORY 6: Kitchen / Laundry
  // ============================================
  laundry_commercial: {
    displayName: 'Laundry (Commercial)',
    category: 'Kitchen/Laundry',
    defaultSF: 600,
    defaultSubType: 'gas',
    defaultFixtures: { ...defaultFixtures, floorDrains: 2, serviceSinks: 1, washingMachines: 4, dryers: 6 },
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 4,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 2.00,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
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
    source_notes: 'Standby power required; High dryer exhaust; See equipment specs',
  },
  laundry_residential: {
    displayName: 'Laundry (Residential)',
    category: 'Kitchen/Laundry',
    defaultSF: 150,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, floorDrains: 1, washingMachines: 1, dryers: 1 },
    defaultRates: {
      lighting_w_sf: 0.60,
      receptacle_va_sf: 5,
      ventilation_cfm_sf: 0.12,
      exhaust_cfm_sf: 0.50,
      cooling_sf_ton: 400,
      heating_btuh_sf: 25,
    },
    fixed_kw: 8,
    exhaust_cfm: 200,
    ra_cfm_sf: 0.06,
    source_notes: 'Lower exhaust residential',
  },
  kitchen_commercial: {
    displayName: 'Kitchen (Commercial)',
    category: 'Kitchen/Laundry',
    defaultSF: 700,
    defaultSubType: 'gas',
    defaultFixtures: { ...defaultFixtures, lavs: 2, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 12,
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
    source_notes: 'Type 1 hood; MAU 4000 CFM; Grease interceptor 500 gal; Hood exh dominant',
  },
  kitchen_light_fb: {
    displayName: 'Kitchen (Light F&B)',
    category: 'Kitchen/Laundry',
    defaultSF: 300,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, lavs: 1, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 0.90,
      receptacle_va_sf: 8,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0.30,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    fixed_kw: 15,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.12,
    source_notes: 'Light food service',
  },

  // ============================================
  // CATEGORY 7: Event / Co-Work
  // ============================================
  cowork: {
    displayName: 'Co-Work Space',
    category: 'Event/CoWork',
    defaultSF: 4000,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.78,
      receptacle_va_sf: 8,
      ventilation_cfm_sf: 0.18,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 10,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.06,
    source_notes: 'Office-like; High receptacle for workstations',
  },
  conference_room: {
    displayName: 'Conference Room',
    category: 'Event/CoWork',
    defaultSF: 500,
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 6,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 300,
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
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 1.20,
      receptacle_va_sf: 6,
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
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 0.80,
      receptacle_va_sf: 5,
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
    defaultFixtures: { ...defaultFixtures, lavs: 2, wcs: 2, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 4,
      ventilation_cfm_sf: 0.30,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 30,
    },
    occupants_per_1000sf: 50,
    rp_cfm_person: 7.5,
    ra_cfm_sf: 0.18,
    source_notes: 'Daycare rates; Higher vent for children',
  },
  recovery_longevity: {
    displayName: 'Recovery & Longevity',
    category: 'Specialty',
    defaultSF: 1600,
    defaultFixtures: { ...defaultFixtures, lavs: 2, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.72,
      receptacle_va_sf: 6,
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
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 3,
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
    defaultFixtures: { ...defaultFixtures },
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 3,
      ventilation_cfm_sf: 0.50,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    occupants_per_1000sf: 7,
    rp_cfm_person: 30,
    ra_cfm_sf: 0.18,
    source_notes: 'Sports arena; High sports lighting',
  },

  // ============================================
  // CATEGORY 10: F&B
  // ============================================
  cafe_light_fb: {
    displayName: 'Café / Light F&B',
    category: 'F&B',
    defaultSF: 1200,
    defaultSubType: 'electric',
    defaultFixtures: { ...defaultFixtures, lavs: 1, floorDrains: 1 },
    defaultRates: {
      lighting_w_sf: 1.00,
      receptacle_va_sf: 8,
      ventilation_cfm_sf: 0.25,
      exhaust_cfm_sf: 0.20,
      cooling_sf_ton: 350,
      heating_btuh_sf: 25,
    },
    fixed_kw: 10,
    occupants_per_1000sf: 20,
    rp_cfm_person: 10,
    ra_cfm_sf: 0.12,
    source_notes: 'Dining/retail blend; Espresso machines; refrigeration',
  },

  // ============================================
  // CATEGORY 11: Outdoor
  // ============================================
  terrace: {
    displayName: 'Terrace / Outdoor',
    category: 'Outdoor',
    defaultSF: 2500,
    defaultFixtures: { ...defaultFixtures, floorDrains: 2 },
    defaultRates: {
      lighting_w_sf: 0.50,
      receptacle_va_sf: 2,
      ventilation_cfm_sf: 0,
      exhaust_cfm_sf: 0,
      cooling_sf_ton: 0,
      heating_btuh_sf: 0,
    },
    source_notes: 'Unconditioned outdoor',
  },

  // ============================================
  // Custom Zone
  // ============================================
  custom: {
    displayName: 'Custom Zone',
    category: 'Custom',
    defaultSF: 1000,
    defaultFixtures: { ...defaultFixtures },
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

export function calculateLaundryLoads(
  washers: number,
  dryers: number,
  dryerType: 'gas' | 'electric' = 'gas'
): LaundryLoads {
  const defaults = zoneDefaults.laundry_commercial
  const equip = defaults.laundry_equipment!
  
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
