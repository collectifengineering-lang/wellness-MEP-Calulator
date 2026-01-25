import type { DHWSettings, ResultAdjustments, ClimateType, ProjectElectricalSettings } from '../types'

// Cold water temperature by climate zone (°F)
export const coldWaterTempByClimate: Record<ClimateType, number> = {
  hot_humid: 75,
  temperate: 55,
  cold_dry: 45,
}

// Climate multipliers for HVAC calculations
export const climateFactors: Record<ClimateType, { cooling: number; heating: number; dehumid: number }> = {
  hot_humid: { cooling: 1.15, heating: 0.7, dehumid: 1.3 },
  cold_dry: { cooling: 0.85, heating: 1.25, dehumid: 0.9 },
  temperate: { cooling: 1.0, heating: 1.0, dehumid: 1.0 },
}

// Electrical defaults
export const electricalDefaults = {
  general_va_sf: 3, // lighting + receptacles combined
  spare_capacity: 0.20, // 20% spare
  power_factor: 0.85,
  voltage_options: ['208V/3PH', '480V/3PH'] as const,
  service_thresholds: [
    { maxKVA: 200, serviceAmps: 600 },
    { maxKVA: 500, serviceAmps: 1600 },
    { maxKVA: 1000, serviceAmps: 3000 },
    { maxKVA: 1500, serviceAmps: 4000 },
  ],
}

// Standard electrical service/breaker sizes by voltage
// Based on NEC Article 230 and common switchgear availability
export const standardServiceSizes: Record<number, number[]> = {
  // 120V single phase - residential/light commercial
  120: [100, 125, 150, 200, 225, 400],
  // 208V 3-phase - most common commercial
  208: [100, 150, 200, 225, 400, 600, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000],
  // 240V single/3-phase
  240: [100, 150, 200, 225, 400, 600, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000],
  // 480V 3-phase - large commercial/industrial
  480: [100, 150, 200, 225, 400, 600, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000],
}

// Get the next standard service size above calculated amps
export function getStandardServiceSize(calculatedAmps: number, voltage: number): number {
  const sizes = standardServiceSizes[voltage] || standardServiceSizes[208]
  
  // Find the first standard size that's >= calculated amps
  for (const size of sizes) {
    if (size >= calculatedAmps) {
      return size
    }
  }
  
  // If larger than all standard sizes, return the largest + note
  return sizes[sizes.length - 1]
}

// Check if calculated amps exceeds max standard size
export function exceedsMaxServiceSize(calculatedAmps: number, voltage: number): boolean {
  const sizes = standardServiceSizes[voltage] || standardServiceSizes[208]
  return calculatedAmps > sizes[sizes.length - 1]
}

// Gas defaults
export const gasDefaults = {
  min_pressure_wc: 7, // 7" W.C. minimum
  high_pressure_threshold_cfh: 5000, // above this, recommend high pressure
  service_sizing: [
    { maxCFH: 2000, pipeSize: '1.5"' },
    { maxCFH: 5000, pipeSize: '2"' },
    { maxCFH: 10000, pipeSize: '3"' },
  ],
}

// DHW defaults (ASHRAE + Wyncatcher)
export const dhwDefaults = {
  tankless_unit_btu: 199900, // Navien standard
  storage_temp_f: 140,
  delivery_temp_f: 110,
  temp_rise_f: 46, // from Wyncatcher
  gpm_per_unit: 8.7, // at 46°F rise
  efficiency_presets: {
    standard: 0.80,
    power_vented: 0.82,
    high_efficiency: 0.90,
    condensing: 0.95,
    ultra_condensing: 0.98,
  } as Record<string, number>,
}

// Fixture unit values (IPC-based)
export const fixtureUnits = {
  lavatory: { wsfu: 1.5, dfu: 1, hot_gph: 6 },
  shower: { wsfu: 2.5, dfu: 2, hot_gph: 100 }, // ASHRAE gymnasium
  water_closet: { wsfu: 5.0, dfu: 4, hot_gph: 0 },
  floor_drain: { wsfu: 0, dfu: 2, hot_gph: 0 },
  service_sink: { wsfu: 3.0, dfu: 3, hot_gph: 15 },
  washing_machine: { wsfu: 4.0, dfu: 3, hot_gph: 30 }, // Residential
  // Commercial washer (B&C Tech SP-75): 3" drain = 6 DFU, 11 GPM = ~8 WSFU
  washing_machine_commercial: { wsfu: 8.0, dfu: 6, hot_gph: 60, water_gpm: 11, drain_gpm: 62 },
  // Gas dryer condensate drain
  dryer: { wsfu: 0, dfu: 4, hot_gph: 0 }, // Condensate drain for gas dryers
}

// Sanitary pipe sizing
export const sanitarySizing = {
  thresholds: [
    { maxDFU: 20, pipeSize: '3"' },
    { maxDFU: 160, pipeSize: '4"' },
    { maxDFU: 360, pipeSize: '5"' },
    { maxDFU: 620, pipeSize: '6"' },
  ],
  backwash_pit_required_gpm: 225, // above this, need pit/tank
  backwash_pit_min_gallons: 1000,
}

// Water meter sizing
export const waterMeterSizing = [
  { maxGPM: 30, size: '1"' },
  { maxGPM: 50, size: '1.5"' },
  { maxGPM: 100, size: '2"' },
  { maxGPM: 160, size: '2.5"' },
  { maxGPM: 350, size: '3"' },
  { maxGPM: 700, size: '4"' },
]

export function getDefaultDHWSettings(climate: ClimateType): DHWSettings {
  return {
    heaterType: 'gas',
    gasEfficiency: dhwDefaults.efficiency_presets.condensing,
    electricEfficiency: 0.98,
    storageTemp: dhwDefaults.storage_temp_f,
    deliveryTemp: dhwDefaults.delivery_temp_f,
    coldWaterTemp: coldWaterTempByClimate[climate],
    peakDuration: 2,
  }
}

export function getDefaultElectricalSettings(): ProjectElectricalSettings {
  return {
    voltage: 208,           // 208V 3-phase most common for commercial
    phase: 3,               // 3-phase
    demandFactor: 1.0,      // 100% of connected load (conservative default)
    powerFactor: 0.85,      // Typical commercial power factor
    spareCapacity: 0.20,    // 20% spare capacity
  }
}

export function getDefaultResultAdjustments(): ResultAdjustments {
  return {
    hvacNotes: `• Pool/spa area requires dedicated dehumidification unit
• Steam room creates high latent load requiring cooling adder
• Recommend VRF system with dedicated pool dehumidifier`,
    electricalNotes: `• Service based on mechanical/plumbing loads, pool equipment, elevator, and general lighting/receptacle at 3 VA/SF
• Single electrical service into space preferred`,
    gasNotes: `• High pressure gas service recommended for commercial loads
• All gas equipment to be installed per manufacturer requirements`,
    waterSanitaryNotes: `• Hot water plant recommended in mechanical room on ground floor
• Grease interceptor required for commercial kitchen (if applicable)`,
    sprinklerNotes: `• High-temp sprinkler heads required for sauna/banya areas
• Ansul system required for commercial kitchen hood (if applicable)`,
    fireAlarmNotes: `• Manual fire alarm system with horn/strobe notification devices
• Coordinate with base building fire alarm panel`,
    overrides: {},
  }
}
