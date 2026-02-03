// =========================================== 
// FLUID PROPERTIES DATA
// Water and Glycol mixtures at various temperatures
// Reference: Engineering Toolbox, ASHRAE Fundamentals
// =========================================== 

import type { FluidType, FluidProperties } from '../types/hydronic'

// =========================================== 
// WATER PROPERTIES
// Temperature in °F
// =========================================== 
const WATER_PROPERTIES: Record<number, FluidProperties> = {
  32:  { densityLbFt3: 62.42, viscosityCp: 1.792, specificGravity: 1.000, specificHeatBtuLbF: 1.009 },
  40:  { densityLbFt3: 62.43, viscosityCp: 1.546, specificGravity: 1.000, specificHeatBtuLbF: 1.005 },
  50:  { densityLbFt3: 62.41, viscosityCp: 1.308, specificGravity: 1.000, specificHeatBtuLbF: 1.002 },
  60:  { densityLbFt3: 62.37, viscosityCp: 1.124, specificGravity: 0.999, specificHeatBtuLbF: 1.000 },
  70:  { densityLbFt3: 62.30, viscosityCp: 0.982, specificGravity: 0.998, specificHeatBtuLbF: 0.998 },
  80:  { densityLbFt3: 62.22, viscosityCp: 0.862, specificGravity: 0.997, specificHeatBtuLbF: 0.998 },
  90:  { densityLbFt3: 62.12, viscosityCp: 0.764, specificGravity: 0.995, specificHeatBtuLbF: 0.997 },
  100: { densityLbFt3: 62.00, viscosityCp: 0.684, specificGravity: 0.993, specificHeatBtuLbF: 0.998 },
  110: { densityLbFt3: 61.86, viscosityCp: 0.616, specificGravity: 0.991, specificHeatBtuLbF: 0.998 },
  120: { densityLbFt3: 61.71, viscosityCp: 0.559, specificGravity: 0.989, specificHeatBtuLbF: 0.999 },
  130: { densityLbFt3: 61.55, viscosityCp: 0.511, specificGravity: 0.986, specificHeatBtuLbF: 1.000 },
  140: { densityLbFt3: 61.38, viscosityCp: 0.470, specificGravity: 0.983, specificHeatBtuLbF: 1.001 },
  150: { densityLbFt3: 61.19, viscosityCp: 0.433, specificGravity: 0.980, specificHeatBtuLbF: 1.002 },
  160: { densityLbFt3: 60.99, viscosityCp: 0.401, specificGravity: 0.977, specificHeatBtuLbF: 1.003 },
  170: { densityLbFt3: 60.79, viscosityCp: 0.372, specificGravity: 0.974, specificHeatBtuLbF: 1.005 },
  180: { densityLbFt3: 60.57, viscosityCp: 0.347, specificGravity: 0.970, specificHeatBtuLbF: 1.007 },
  190: { densityLbFt3: 60.35, viscosityCp: 0.324, specificGravity: 0.967, specificHeatBtuLbF: 1.009 },
  200: { densityLbFt3: 60.12, viscosityCp: 0.305, specificGravity: 0.963, specificHeatBtuLbF: 1.011 },
  210: { densityLbFt3: 59.88, viscosityCp: 0.287, specificGravity: 0.959, specificHeatBtuLbF: 1.013 },
  220: { densityLbFt3: 59.63, viscosityCp: 0.271, specificGravity: 0.955, specificHeatBtuLbF: 1.016 },
}

// =========================================== 
// PROPYLENE GLYCOL PROPERTIES
// By concentration (%) and temperature (°F)
// =========================================== 
const PROPYLENE_GLYCOL_PROPERTIES: Record<number, Record<number, FluidProperties>> = {
  // 20% Propylene Glycol
  20: {
    32:  { densityLbFt3: 64.05, viscosityCp: 4.50, specificGravity: 1.026, specificHeatBtuLbF: 0.96 },
    40:  { densityLbFt3: 63.92, viscosityCp: 3.60, specificGravity: 1.024, specificHeatBtuLbF: 0.96 },
    50:  { densityLbFt3: 63.74, viscosityCp: 2.90, specificGravity: 1.021, specificHeatBtuLbF: 0.96 },
    60:  { densityLbFt3: 63.55, viscosityCp: 2.40, specificGravity: 1.018, specificHeatBtuLbF: 0.97 },
    70:  { densityLbFt3: 63.36, viscosityCp: 2.00, specificGravity: 1.015, specificHeatBtuLbF: 0.97 },
    80:  { densityLbFt3: 63.17, viscosityCp: 1.70, specificGravity: 1.012, specificHeatBtuLbF: 0.97 },
    100: { densityLbFt3: 62.79, viscosityCp: 1.30, specificGravity: 1.006, specificHeatBtuLbF: 0.97 },
    120: { densityLbFt3: 62.41, viscosityCp: 1.00, specificGravity: 1.000, specificHeatBtuLbF: 0.98 },
    140: { densityLbFt3: 62.03, viscosityCp: 0.82, specificGravity: 0.994, specificHeatBtuLbF: 0.98 },
    160: { densityLbFt3: 61.64, viscosityCp: 0.68, specificGravity: 0.987, specificHeatBtuLbF: 0.98 },
    180: { densityLbFt3: 61.26, viscosityCp: 0.58, specificGravity: 0.981, specificHeatBtuLbF: 0.99 },
    200: { densityLbFt3: 60.87, viscosityCp: 0.50, specificGravity: 0.975, specificHeatBtuLbF: 0.99 },
  },
  // 30% Propylene Glycol
  30: {
    32:  { densityLbFt3: 65.05, viscosityCp: 8.50, specificGravity: 1.042, specificHeatBtuLbF: 0.93 },
    40:  { densityLbFt3: 64.86, viscosityCp: 6.50, specificGravity: 1.039, specificHeatBtuLbF: 0.93 },
    50:  { densityLbFt3: 64.61, viscosityCp: 5.00, specificGravity: 1.035, specificHeatBtuLbF: 0.94 },
    60:  { densityLbFt3: 64.36, viscosityCp: 4.00, specificGravity: 1.031, specificHeatBtuLbF: 0.94 },
    70:  { densityLbFt3: 64.11, viscosityCp: 3.20, specificGravity: 1.027, specificHeatBtuLbF: 0.94 },
    80:  { densityLbFt3: 63.86, viscosityCp: 2.65, specificGravity: 1.023, specificHeatBtuLbF: 0.94 },
    100: { densityLbFt3: 63.36, viscosityCp: 1.90, specificGravity: 1.015, specificHeatBtuLbF: 0.95 },
    120: { densityLbFt3: 62.86, viscosityCp: 1.45, specificGravity: 1.007, specificHeatBtuLbF: 0.95 },
    140: { densityLbFt3: 62.36, viscosityCp: 1.15, specificGravity: 0.999, specificHeatBtuLbF: 0.95 },
    160: { densityLbFt3: 61.86, viscosityCp: 0.92, specificGravity: 0.991, specificHeatBtuLbF: 0.96 },
    180: { densityLbFt3: 61.36, viscosityCp: 0.76, specificGravity: 0.983, specificHeatBtuLbF: 0.96 },
    200: { densityLbFt3: 60.86, viscosityCp: 0.64, specificGravity: 0.975, specificHeatBtuLbF: 0.96 },
  },
  // 40% Propylene Glycol
  40: {
    32:  { densityLbFt3: 66.17, viscosityCp: 18.0, specificGravity: 1.060, specificHeatBtuLbF: 0.90 },
    40:  { densityLbFt3: 65.92, viscosityCp: 13.0, specificGravity: 1.056, specificHeatBtuLbF: 0.90 },
    50:  { densityLbFt3: 65.61, viscosityCp: 9.50, specificGravity: 1.051, specificHeatBtuLbF: 0.90 },
    60:  { densityLbFt3: 65.30, viscosityCp: 7.20, specificGravity: 1.046, specificHeatBtuLbF: 0.91 },
    70:  { densityLbFt3: 64.99, viscosityCp: 5.60, specificGravity: 1.041, specificHeatBtuLbF: 0.91 },
    80:  { densityLbFt3: 64.68, viscosityCp: 4.50, specificGravity: 1.036, specificHeatBtuLbF: 0.91 },
    100: { densityLbFt3: 64.05, viscosityCp: 3.00, specificGravity: 1.026, specificHeatBtuLbF: 0.92 },
    120: { densityLbFt3: 63.43, viscosityCp: 2.15, specificGravity: 1.016, specificHeatBtuLbF: 0.92 },
    140: { densityLbFt3: 62.80, viscosityCp: 1.65, specificGravity: 1.006, specificHeatBtuLbF: 0.92 },
    160: { densityLbFt3: 62.18, viscosityCp: 1.30, specificGravity: 0.996, specificHeatBtuLbF: 0.93 },
    180: { densityLbFt3: 61.55, viscosityCp: 1.05, specificGravity: 0.986, specificHeatBtuLbF: 0.93 },
    200: { densityLbFt3: 60.93, viscosityCp: 0.87, specificGravity: 0.976, specificHeatBtuLbF: 0.93 },
  },
  // 50% Propylene Glycol
  50: {
    32:  { densityLbFt3: 67.42, viscosityCp: 42.0, specificGravity: 1.080, specificHeatBtuLbF: 0.86 },
    40:  { densityLbFt3: 67.11, viscosityCp: 28.0, specificGravity: 1.075, specificHeatBtuLbF: 0.86 },
    50:  { densityLbFt3: 66.73, viscosityCp: 19.0, specificGravity: 1.069, specificHeatBtuLbF: 0.87 },
    60:  { densityLbFt3: 66.36, viscosityCp: 14.0, specificGravity: 1.063, specificHeatBtuLbF: 0.87 },
    70:  { densityLbFt3: 65.98, viscosityCp: 10.5, specificGravity: 1.057, specificHeatBtuLbF: 0.87 },
    80:  { densityLbFt3: 65.61, viscosityCp: 8.00, specificGravity: 1.051, specificHeatBtuLbF: 0.88 },
    100: { densityLbFt3: 64.86, viscosityCp: 5.10, specificGravity: 1.039, specificHeatBtuLbF: 0.88 },
    120: { densityLbFt3: 64.11, viscosityCp: 3.50, specificGravity: 1.027, specificHeatBtuLbF: 0.89 },
    140: { densityLbFt3: 63.36, viscosityCp: 2.55, specificGravity: 1.015, specificHeatBtuLbF: 0.89 },
    160: { densityLbFt3: 62.61, viscosityCp: 1.95, specificGravity: 1.003, specificHeatBtuLbF: 0.89 },
    180: { densityLbFt3: 61.86, viscosityCp: 1.55, specificGravity: 0.991, specificHeatBtuLbF: 0.90 },
    200: { densityLbFt3: 61.11, viscosityCp: 1.25, specificGravity: 0.979, specificHeatBtuLbF: 0.90 },
  },
  // 60% Propylene Glycol
  60: {
    32:  { densityLbFt3: 68.79, viscosityCp: 110.0, specificGravity: 1.102, specificHeatBtuLbF: 0.82 },
    40:  { densityLbFt3: 68.42, viscosityCp: 68.0, specificGravity: 1.096, specificHeatBtuLbF: 0.82 },
    50:  { densityLbFt3: 67.98, viscosityCp: 44.0, specificGravity: 1.089, specificHeatBtuLbF: 0.83 },
    60:  { densityLbFt3: 67.54, viscosityCp: 30.0, specificGravity: 1.082, specificHeatBtuLbF: 0.83 },
    70:  { densityLbFt3: 67.11, viscosityCp: 21.0, specificGravity: 1.075, specificHeatBtuLbF: 0.83 },
    80:  { densityLbFt3: 66.67, viscosityCp: 15.5, specificGravity: 1.068, specificHeatBtuLbF: 0.84 },
    100: { densityLbFt3: 65.79, viscosityCp: 9.20, specificGravity: 1.054, specificHeatBtuLbF: 0.84 },
    120: { densityLbFt3: 64.92, viscosityCp: 6.00, specificGravity: 1.040, specificHeatBtuLbF: 0.85 },
    140: { densityLbFt3: 64.05, viscosityCp: 4.20, specificGravity: 1.026, specificHeatBtuLbF: 0.85 },
    160: { densityLbFt3: 63.17, viscosityCp: 3.10, specificGravity: 1.012, specificHeatBtuLbF: 0.86 },
    180: { densityLbFt3: 62.30, viscosityCp: 2.40, specificGravity: 0.998, specificHeatBtuLbF: 0.86 },
    200: { densityLbFt3: 61.43, viscosityCp: 1.90, specificGravity: 0.984, specificHeatBtuLbF: 0.87 },
  },
}

// =========================================== 
// ETHYLENE GLYCOL PROPERTIES
// By concentration (%) and temperature (°F)
// =========================================== 
const ETHYLENE_GLYCOL_PROPERTIES: Record<number, Record<number, FluidProperties>> = {
  // 20% Ethylene Glycol
  20: {
    32:  { densityLbFt3: 64.55, viscosityCp: 3.00, specificGravity: 1.034, specificHeatBtuLbF: 0.94 },
    40:  { densityLbFt3: 64.42, viscosityCp: 2.50, specificGravity: 1.032, specificHeatBtuLbF: 0.94 },
    50:  { densityLbFt3: 64.24, viscosityCp: 2.10, specificGravity: 1.029, specificHeatBtuLbF: 0.94 },
    60:  { densityLbFt3: 64.05, viscosityCp: 1.80, specificGravity: 1.026, specificHeatBtuLbF: 0.95 },
    70:  { densityLbFt3: 63.86, viscosityCp: 1.55, specificGravity: 1.023, specificHeatBtuLbF: 0.95 },
    80:  { densityLbFt3: 63.67, viscosityCp: 1.35, specificGravity: 1.020, specificHeatBtuLbF: 0.95 },
    100: { densityLbFt3: 63.30, viscosityCp: 1.05, specificGravity: 1.014, specificHeatBtuLbF: 0.95 },
    120: { densityLbFt3: 62.92, viscosityCp: 0.85, specificGravity: 1.008, specificHeatBtuLbF: 0.96 },
    140: { densityLbFt3: 62.54, viscosityCp: 0.70, specificGravity: 1.002, specificHeatBtuLbF: 0.96 },
    160: { densityLbFt3: 62.17, viscosityCp: 0.58, specificGravity: 0.996, specificHeatBtuLbF: 0.96 },
    180: { densityLbFt3: 61.79, viscosityCp: 0.50, specificGravity: 0.990, specificHeatBtuLbF: 0.97 },
    200: { densityLbFt3: 61.42, viscosityCp: 0.43, specificGravity: 0.984, specificHeatBtuLbF: 0.97 },
  },
  // 30% Ethylene Glycol
  30: {
    32:  { densityLbFt3: 66.04, viscosityCp: 5.50, specificGravity: 1.058, specificHeatBtuLbF: 0.90 },
    40:  { densityLbFt3: 65.86, viscosityCp: 4.40, specificGravity: 1.055, specificHeatBtuLbF: 0.90 },
    50:  { densityLbFt3: 65.61, viscosityCp: 3.50, specificGravity: 1.051, specificHeatBtuLbF: 0.91 },
    60:  { densityLbFt3: 65.36, viscosityCp: 2.85, specificGravity: 1.047, specificHeatBtuLbF: 0.91 },
    70:  { densityLbFt3: 65.11, viscosityCp: 2.40, specificGravity: 1.043, specificHeatBtuLbF: 0.91 },
    80:  { densityLbFt3: 64.86, viscosityCp: 2.00, specificGravity: 1.039, specificHeatBtuLbF: 0.92 },
    100: { densityLbFt3: 64.36, viscosityCp: 1.50, specificGravity: 1.031, specificHeatBtuLbF: 0.92 },
    120: { densityLbFt3: 63.86, viscosityCp: 1.15, specificGravity: 1.023, specificHeatBtuLbF: 0.92 },
    140: { densityLbFt3: 63.36, viscosityCp: 0.92, specificGravity: 1.015, specificHeatBtuLbF: 0.93 },
    160: { densityLbFt3: 62.86, viscosityCp: 0.76, specificGravity: 1.007, specificHeatBtuLbF: 0.93 },
    180: { densityLbFt3: 62.36, viscosityCp: 0.64, specificGravity: 0.999, specificHeatBtuLbF: 0.93 },
    200: { densityLbFt3: 61.86, viscosityCp: 0.54, specificGravity: 0.991, specificHeatBtuLbF: 0.94 },
  },
  // 40% Ethylene Glycol
  40: {
    32:  { densityLbFt3: 67.67, viscosityCp: 11.0, specificGravity: 1.084, specificHeatBtuLbF: 0.86 },
    40:  { densityLbFt3: 67.42, viscosityCp: 8.50, specificGravity: 1.080, specificHeatBtuLbF: 0.86 },
    50:  { densityLbFt3: 67.11, viscosityCp: 6.50, specificGravity: 1.075, specificHeatBtuLbF: 0.87 },
    60:  { densityLbFt3: 66.79, viscosityCp: 5.10, specificGravity: 1.070, specificHeatBtuLbF: 0.87 },
    70:  { densityLbFt3: 66.48, viscosityCp: 4.10, specificGravity: 1.065, specificHeatBtuLbF: 0.87 },
    80:  { densityLbFt3: 66.17, viscosityCp: 3.35, specificGravity: 1.060, specificHeatBtuLbF: 0.88 },
    100: { densityLbFt3: 65.54, viscosityCp: 2.40, specificGravity: 1.050, specificHeatBtuLbF: 0.88 },
    120: { densityLbFt3: 64.92, viscosityCp: 1.80, specificGravity: 1.040, specificHeatBtuLbF: 0.89 },
    140: { densityLbFt3: 64.30, viscosityCp: 1.40, specificGravity: 1.030, specificHeatBtuLbF: 0.89 },
    160: { densityLbFt3: 63.67, viscosityCp: 1.10, specificGravity: 1.020, specificHeatBtuLbF: 0.89 },
    180: { densityLbFt3: 63.05, viscosityCp: 0.92, specificGravity: 1.010, specificHeatBtuLbF: 0.90 },
    200: { densityLbFt3: 62.42, viscosityCp: 0.76, specificGravity: 1.000, specificHeatBtuLbF: 0.90 },
  },
  // 50% Ethylene Glycol
  50: {
    32:  { densityLbFt3: 69.41, viscosityCp: 24.0, specificGravity: 1.112, specificHeatBtuLbF: 0.82 },
    40:  { densityLbFt3: 69.10, viscosityCp: 17.5, specificGravity: 1.107, specificHeatBtuLbF: 0.82 },
    50:  { densityLbFt3: 68.73, viscosityCp: 13.0, specificGravity: 1.101, specificHeatBtuLbF: 0.82 },
    60:  { densityLbFt3: 68.35, viscosityCp: 9.80, specificGravity: 1.095, specificHeatBtuLbF: 0.83 },
    70:  { densityLbFt3: 67.98, viscosityCp: 7.60, specificGravity: 1.089, specificHeatBtuLbF: 0.83 },
    80:  { densityLbFt3: 67.61, viscosityCp: 6.00, specificGravity: 1.083, specificHeatBtuLbF: 0.83 },
    100: { densityLbFt3: 66.86, viscosityCp: 4.00, specificGravity: 1.071, specificHeatBtuLbF: 0.84 },
    120: { densityLbFt3: 66.11, viscosityCp: 2.90, specificGravity: 1.059, specificHeatBtuLbF: 0.84 },
    140: { densityLbFt3: 65.36, viscosityCp: 2.20, specificGravity: 1.047, specificHeatBtuLbF: 0.85 },
    160: { densityLbFt3: 64.61, viscosityCp: 1.70, specificGravity: 1.035, specificHeatBtuLbF: 0.85 },
    180: { densityLbFt3: 63.86, viscosityCp: 1.35, specificGravity: 1.023, specificHeatBtuLbF: 0.86 },
    200: { densityLbFt3: 63.11, viscosityCp: 1.10, specificGravity: 1.011, specificHeatBtuLbF: 0.86 },
  },
  // 60% Ethylene Glycol
  60: {
    32:  { densityLbFt3: 71.28, viscosityCp: 60.0, specificGravity: 1.142, specificHeatBtuLbF: 0.77 },
    40:  { densityLbFt3: 70.90, viscosityCp: 42.0, specificGravity: 1.136, specificHeatBtuLbF: 0.77 },
    50:  { densityLbFt3: 70.47, viscosityCp: 30.0, specificGravity: 1.129, specificHeatBtuLbF: 0.78 },
    60:  { densityLbFt3: 70.03, viscosityCp: 22.0, specificGravity: 1.122, specificHeatBtuLbF: 0.78 },
    70:  { densityLbFt3: 69.60, viscosityCp: 16.5, specificGravity: 1.115, specificHeatBtuLbF: 0.78 },
    80:  { densityLbFt3: 69.16, viscosityCp: 12.5, specificGravity: 1.108, specificHeatBtuLbF: 0.79 },
    100: { densityLbFt3: 68.29, viscosityCp: 7.80, specificGravity: 1.094, specificHeatBtuLbF: 0.79 },
    120: { densityLbFt3: 67.42, viscosityCp: 5.30, specificGravity: 1.080, specificHeatBtuLbF: 0.80 },
    140: { densityLbFt3: 66.55, viscosityCp: 3.80, specificGravity: 1.066, specificHeatBtuLbF: 0.80 },
    160: { densityLbFt3: 65.67, viscosityCp: 2.85, specificGravity: 1.052, specificHeatBtuLbF: 0.81 },
    180: { densityLbFt3: 64.80, viscosityCp: 2.20, specificGravity: 1.038, specificHeatBtuLbF: 0.81 },
    200: { densityLbFt3: 63.92, viscosityCp: 1.75, specificGravity: 1.024, specificHeatBtuLbF: 0.82 },
  },
}

// =========================================== 
// INTERPOLATION HELPER
// =========================================== 
function interpolate(
  x: number,
  x1: number,
  x2: number,
  y1: number,
  y2: number
): number {
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1)
}

function interpolateProperties(
  props1: FluidProperties,
  props2: FluidProperties,
  t: number,
  t1: number,
  t2: number
): FluidProperties {
  return {
    densityLbFt3: interpolate(t, t1, t2, props1.densityLbFt3, props2.densityLbFt3),
    viscosityCp: interpolate(t, t1, t2, props1.viscosityCp, props2.viscosityCp),
    specificGravity: interpolate(t, t1, t2, props1.specificGravity, props2.specificGravity),
    specificHeatBtuLbF: interpolate(t, t1, t2, props1.specificHeatBtuLbF, props2.specificHeatBtuLbF),
  }
}

function getPropertiesFromTable(
  table: Record<number, FluidProperties>,
  tempF: number
): FluidProperties {
  const temps = Object.keys(table).map(Number).sort((a, b) => a - b)
  
  // Clamp to table bounds
  if (tempF <= temps[0]) return table[temps[0]]
  if (tempF >= temps[temps.length - 1]) return table[temps[temps.length - 1]]
  
  // Find bracketing temperatures
  let lower = temps[0]
  let upper = temps[temps.length - 1]
  for (let i = 0; i < temps.length - 1; i++) {
    if (tempF >= temps[i] && tempF <= temps[i + 1]) {
      lower = temps[i]
      upper = temps[i + 1]
      break
    }
  }
  
  return interpolateProperties(
    table[lower],
    table[upper],
    tempF,
    lower,
    upper
  )
}

// =========================================== 
// MAIN API FUNCTIONS
// =========================================== 

export function getFluidProperties(
  fluidType: FluidType,
  glycolConcentration: number,
  tempF: number
): FluidProperties {
  // Water
  if (fluidType === 'water') {
    return getPropertiesFromTable(WATER_PROPERTIES, tempF)
  }
  
  // Glycol - get correct table
  const glycolTable = fluidType === 'propylene_glycol'
    ? PROPYLENE_GLYCOL_PROPERTIES
    : ETHYLENE_GLYCOL_PROPERTIES
  
  // Round concentration to nearest available value
  const availableConcentrations = Object.keys(glycolTable).map(Number).sort((a, b) => a - b)
  
  // Clamp concentration
  let conc = glycolConcentration
  if (conc <= availableConcentrations[0]) conc = availableConcentrations[0]
  if (conc >= availableConcentrations[availableConcentrations.length - 1]) {
    conc = availableConcentrations[availableConcentrations.length - 1]
  }
  
  // Find bracketing concentrations
  let lowerConc = availableConcentrations[0]
  let upperConc = availableConcentrations[availableConcentrations.length - 1]
  for (let i = 0; i < availableConcentrations.length - 1; i++) {
    if (conc >= availableConcentrations[i] && conc <= availableConcentrations[i + 1]) {
      lowerConc = availableConcentrations[i]
      upperConc = availableConcentrations[i + 1]
      break
    }
  }
  
  // Get properties at both concentrations for the temperature
  const propsLower = getPropertiesFromTable(glycolTable[lowerConc], tempF)
  const propsUpper = getPropertiesFromTable(glycolTable[upperConc], tempF)
  
  // Interpolate between concentrations
  if (lowerConc === upperConc) return propsLower
  
  return interpolateProperties(propsLower, propsUpper, conc, lowerConc, upperConc)
}

export function getFluidDensity(
  fluidType: FluidType,
  glycolConcentration: number,
  tempF: number
): number {
  return getFluidProperties(fluidType, glycolConcentration, tempF).densityLbFt3
}

export function getFluidViscosity(
  fluidType: FluidType,
  glycolConcentration: number,
  tempF: number
): number {
  return getFluidProperties(fluidType, glycolConcentration, tempF).viscosityCp
}

export function getFluidSpecificGravity(
  fluidType: FluidType,
  glycolConcentration: number,
  tempF: number
): number {
  return getFluidProperties(fluidType, glycolConcentration, tempF).specificGravity
}

export function getFluidSpecificHeat(
  fluidType: FluidType,
  glycolConcentration: number,
  tempF: number
): number {
  return getFluidProperties(fluidType, glycolConcentration, tempF).specificHeatBtuLbF
}

// Display names
export function getFluidDisplayName(fluidType: FluidType): string {
  switch (fluidType) {
    case 'water': return 'Water'
    case 'propylene_glycol': return 'Propylene Glycol'
    case 'ethylene_glycol': return 'Ethylene Glycol'
  }
}

export const AVAILABLE_GLYCOL_CONCENTRATIONS = [0, 20, 30, 40, 50, 60]
