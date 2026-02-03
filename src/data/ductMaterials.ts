// =========================================== 
// DUCT MATERIALS DATA
// Roughness values and properties for duct materials
// Based on ASHRAE Fundamentals and SMACNA
// =========================================== 

import type { DuctMaterial, DuctMaterialData } from '../types/duct'

// =========================================== 
// MATERIAL PROPERTIES
// =========================================== 
export const DUCT_MATERIALS: Record<DuctMaterial, DuctMaterialData> = {
  galvanized: {
    id: 'galvanized',
    displayName: 'Galvanized Steel',
    roughnessFt: 0.0003, // 0.09 mm
    description: 'Standard galvanized sheet metal duct',
    maxVelocityFpm: 2500,
    notes: 'Most common duct material for commercial HVAC',
  },
  aluminum: {
    id: 'aluminum',
    displayName: 'Aluminum',
    roughnessFt: 0.0001, // 0.03 mm
    description: 'Smooth aluminum duct',
    maxVelocityFpm: 2500,
    notes: 'Lower friction than galvanized, corrosion resistant',
  },
  stainless: {
    id: 'stainless',
    displayName: 'Stainless Steel',
    roughnessFt: 0.00015, // 0.045 mm
    description: 'Stainless steel duct',
    maxVelocityFpm: 2500,
    notes: 'Used in corrosive or sanitary environments',
  },
  fiberglass: {
    id: 'fiberglass',
    displayName: 'Fiberglass Duct Board',
    roughnessFt: 0.003, // 0.9 mm
    description: 'Fiberglass duct board (internal surface)',
    maxVelocityFpm: 2000,
    notes: 'Higher friction, provides acoustic and thermal insulation',
  },
  flex: {
    id: 'flex',
    displayName: 'Flexible Duct',
    roughnessFt: 0.003, // 0.9 mm - when fully extended
    description: 'Flexible insulated duct',
    maxVelocityFpm: 1500,
    notes: 'Use sparingly, max 5ft recommended. Higher friction when compressed.',
  },
}

// =========================================== 
// LINER PROPERTIES
// Affects both roughness and effective dimensions
// =========================================== 
export const DUCT_LINER = {
  none: {
    id: 'none',
    displayName: 'No Liner',
    thicknessIn: 0,
    roughnessFt: null, // Use material roughness
  },
  '0.75': {
    id: '0.75',
    displayName: '3/4" Liner',
    thicknessIn: 0.75,
    roughnessFt: 0.003, // Fiberglass liner surface
  },
  '1.0': {
    id: '1.0',
    displayName: '1" Liner',
    thicknessIn: 1.0,
    roughnessFt: 0.003, // Fiberglass liner surface
  },
}

// =========================================== 
// AIR PROPERTIES CALCULATION
// Based on altitude and temperature
// =========================================== 

/**
 * Calculate air density at altitude and temperature
 * Using ideal gas law with lapse rate
 */
export function calculateAirDensity(altitudeFt: number, temperatureF: number): number {
  // Standard conditions
  const rhoStd = 0.075 // lb/ft³ at sea level, 70°F
  const tempStdR = 530 // °R (70°F)
  
  // Convert to Rankine
  const tempR = temperatureF + 459.67
  
  // Altitude correction (simplified barometric formula)
  // Pressure ratio: P/P0 ≈ (1 - 0.0000068753 × h)^5.2559
  const pressureRatio = Math.pow(1 - 0.0000068753 * altitudeFt, 5.2559)
  
  // Temperature correction using ideal gas law
  const density = rhoStd * pressureRatio * (tempStdR / tempR)
  
  return density
}

/**
 * Calculate air dynamic viscosity
 * Using Sutherland's formula
 */
export function calculateAirViscosity(temperatureF: number): number {
  // Sutherland's formula for air
  const tempK = (temperatureF + 459.67) * 5 / 9 // Convert °F to K
  const mu0 = 1.716e-5 // Reference viscosity at T0 (Pa·s)
  const T0 = 273.15 // Reference temperature (K)
  const S = 110.4 // Sutherland constant for air (K)
  
  // Sutherland's formula
  const muPaS = mu0 * Math.pow(tempK / T0, 1.5) * ((T0 + S) / (tempK + S))
  
  // Convert to lb/(ft·s): 1 Pa·s = 0.672 lb/(ft·s)
  return muPaS * 0.672
}

/**
 * Get complete air properties at given conditions
 */
export function getAirProperties(altitudeFt: number, temperatureF: number) {
  return {
    densityLbFt3: calculateAirDensity(altitudeFt, temperatureF),
    viscosityLbFtS: calculateAirViscosity(temperatureF),
    specificHeatBtuLbF: 0.24, // Approximately constant for air
  }
}

// =========================================== 
// STANDARD DUCT SIZES
// Common rectangular and round duct sizes
// =========================================== 

export const STANDARD_RECT_WIDTHS = [
  4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
  32, 34, 36, 38, 40, 42, 44, 46, 48, 52, 56, 60, 64, 68, 72, 80, 84, 96
]

export const STANDARD_RECT_HEIGHTS = [
  4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
  32, 34, 36, 38, 40, 42, 44, 46, 48
]

export const STANDARD_ROUND_DIAMETERS = [
  4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24,
  26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
  50, 52, 54, 56, 58, 60
]

// =========================================== 
// VELOCITY LIMITS
// =========================================== 
export const VELOCITY_LIMITS = {
  supply: {
    recommended: 2000,
    max: 2500,
    noise: 'Above 2000 fpm may cause noise issues',
  },
  return: {
    recommended: 1500,
    max: 2000,
    noise: 'Above 1500 fpm may cause noise issues',
  },
  exhaust: {
    recommended: 2000,
    max: 3000,
    noise: 'Higher velocities acceptable in non-occupied areas',
  },
  outside_air: {
    recommended: 1500,
    max: 2000,
    noise: 'Lower velocities for intake louvers',
  },
}

// =========================================== 
// FLEX DUCT CORRECTION
// Flex duct has higher friction when not fully extended
// =========================================== 
export const FLEX_DUCT_CORRECTION = {
  fullyExtended: 1.0,
  typical: 1.5, // 50% higher friction
  compressed: 2.5, // When significantly compressed
  maxRecommendedLength: 5, // feet
}
