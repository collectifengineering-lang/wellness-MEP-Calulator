// =========================================== 
// PSYCHROMETRIC CONSTANTS AND FORMULAS
// Based on ASHRAE Fundamentals Handbook
// =========================================== 

// =========================================== 
// PHYSICAL CONSTANTS
// =========================================== 

// Standard atmospheric pressure at sea level
export const STD_PRESSURE_PSIA = 14.696 // psia
export const STD_PRESSURE_IN_HG = 29.921 // in Hg

// Molecular weight ratio of water vapor to dry air
export const MW_RATIO = 0.621945 // Mw/Ma = 18.015/28.966

// Specific heat of dry air at constant pressure (Btu/lb·°F)
export const CP_AIR = 0.240

// Specific heat of water vapor (Btu/lb·°F)
export const CP_VAPOR = 0.444

// Latent heat of vaporization at 32°F (Btu/lb)
export const HFG_32F = 1075.6

// Reference enthalpy at 0°F (for water vapor calculation)
export const HG_0F = 1061.0

// Grains per pound
export const GRAINS_PER_LB = 7000

// Gas constant for dry air (ft·lbf/lb·°R)
export const R_AIR = 53.352

// =========================================== 
// CHART DEFAULTS
// =========================================== 
export const DEFAULT_CHART_CONFIG = {
  minTempF: 20,
  maxTempF: 120,
  minWGrains: 0,
  maxWGrains: 200,
  dbInterval: 10, // °F
  wInterval: 20, // grains/lb
  rhIntervals: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
}

// =========================================== 
// SATURATION PRESSURE CALCULATIONS
// Using ASHRAE correlations (Hyland-Wexler equations)
// =========================================== 

/**
 * Calculate saturation pressure over liquid water (for T >= 32°F)
 * Using ASHRAE Hyland-Wexler correlation
 * @param tempF - Temperature in °F
 * @returns Saturation pressure in psia
 */
export function saturationPressureWater(tempF: number): number {
  const TK = (tempF + 459.67) * 5 / 9 // Convert to Kelvin
  
  // ASHRAE correlation coefficients for water (above 32°F / 273.15K)
  const C8 = -5.8002206e3
  const C9 = 1.3914993e0
  const C10 = -4.8640239e-2
  const C11 = 4.1764768e-5
  const C12 = -1.4452093e-8
  const C13 = 6.5459673e0
  
  const lnPws = C8 / TK + C9 + C10 * TK + C11 * TK * TK + C12 * TK * TK * TK + C13 * Math.log(TK)
  const Pws_Pa = Math.exp(lnPws)
  
  // Convert Pa to psia
  return Pws_Pa / 6894.757
}

/**
 * Calculate saturation pressure over ice (for T < 32°F)
 * Using ASHRAE Hyland-Wexler correlation
 * @param tempF - Temperature in °F
 * @returns Saturation pressure in psia
 */
export function saturationPressureIce(tempF: number): number {
  const TK = (tempF + 459.67) * 5 / 9 // Convert to Kelvin
  
  // ASHRAE correlation coefficients for ice (below 32°F / 273.15K)
  const C1 = -5.6745359e3
  const C2 = 6.3925247e0
  const C3 = -9.6778430e-3
  const C4 = 6.2215701e-7
  const C5 = 2.0747825e-9
  const C6 = -9.4840240e-13
  const C7 = 4.1635019e0
  
  const lnPws = C1 / TK + C2 + C3 * TK + C4 * TK * TK + C5 * TK * TK * TK + C6 * TK * TK * TK * TK + C7 * Math.log(TK)
  const Pws_Pa = Math.exp(lnPws)
  
  // Convert Pa to psia
  return Pws_Pa / 6894.757
}

/**
 * Get saturation pressure at a given temperature
 * Automatically selects water or ice formula
 * @param tempF - Temperature in °F
 * @returns Saturation pressure in psia
 */
export function getSaturationPressure(tempF: number): number {
  if (tempF >= 32) {
    return saturationPressureWater(tempF)
  } else {
    return saturationPressureIce(tempF)
  }
}

// =========================================== 
// ATMOSPHERIC PRESSURE CALCULATIONS
// =========================================== 

/**
 * Calculate barometric pressure at altitude
 * Using barometric formula
 * @param altitudeFt - Altitude in feet
 * @returns Barometric pressure in psia
 */
export function barometricPressureAtAltitude(altitudeFt: number): number {
  // Standard atmosphere model
  // P = P0 * (1 - L*h/T0)^(g*M/(R*L))
  // Simplified for typical conditions
  const P0 = STD_PRESSURE_PSIA
  const exponent = altitudeFt / 27000 // Approximate scale height in feet
  return P0 * Math.exp(-exponent)
}

/**
 * Convert pressure from psia to inches of mercury
 */
export function psiaToInHg(psia: number): number {
  return psia * (STD_PRESSURE_IN_HG / STD_PRESSURE_PSIA)
}

/**
 * Convert pressure from inches of mercury to psia
 */
export function inHgToPsia(inHg: number): number {
  return inHg * (STD_PRESSURE_PSIA / STD_PRESSURE_IN_HG)
}

// =========================================== 
// TEMPERATURE CONVERSIONS
// =========================================== 

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * 5 / 9
}

export function celsiusToFahrenheit(c: number): number {
  return c * 9 / 5 + 32
}

export function fahrenheitToRankine(f: number): number {
  return f + 459.67
}

export function rankineToFahrenheit(r: number): number {
  return r - 459.67
}

// =========================================== 
// HUMIDITY RATIO CONVERSIONS
// =========================================== 

export function grainsToLb(grains: number): number {
  return grains / GRAINS_PER_LB
}

export function lbToGrains(lb: number): number {
  return lb * GRAINS_PER_LB
}

// =========================================== 
// PROCESS TYPE DISPLAY NAMES
// =========================================== 
export const PROCESS_TYPE_NAMES: Record<string, string> = {
  sensible_heating: 'Sensible Heating',
  sensible_cooling: 'Sensible Cooling',
  evaporative_cooling: 'Evaporative Cooling',
  steam_humidification: 'Steam Humidification',
  dx_dehumidification: 'DX Coil Dehumidification',
  desiccant_dehumidification: 'Desiccant Dehumidification',
  mixing: 'Air Mixing',
  custom: 'Custom Process',
}

// =========================================== 
// INPUT MODE DISPLAY NAMES
// =========================================== 
export const INPUT_MODE_NAMES: Record<string, string> = {
  db_wb: 'Dry Bulb / Wet Bulb',
  db_rh: 'Dry Bulb / Relative Humidity',
  db_dp: 'Dry Bulb / Dew Point',
  db_w: 'Dry Bulb / Humidity Ratio',
}
