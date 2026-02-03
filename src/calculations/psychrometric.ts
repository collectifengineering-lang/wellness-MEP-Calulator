// =========================================== 
// PSYCHROMETRIC CALCULATION ENGINE
// Based on ASHRAE Fundamentals Handbook
// =========================================== 

import {
  getSaturationPressure,
  barometricPressureAtAltitude,
  MW_RATIO,
  CP_AIR,
  CP_VAPOR,
  HG_0F,
  grainsToLb,
  lbToGrains,
} from '../data/psychrometricConstants'

import type {
  StatePointResult,
  MixingResult,
  ProcessResult,
  PsychInputMode,
  AtmosphericConditions,
} from '../types/psychrometric'

// =========================================== 
// ATMOSPHERIC CONDITIONS
// =========================================== 

/**
 * Calculate atmospheric conditions at a given altitude
 */
export function getAtmosphericConditions(altitudeFt: number): AtmosphericConditions {
  const pressurePsia = barometricPressureAtAltitude(altitudeFt)
  const pressureInHg = pressurePsia * (29.921 / 14.696)
  
  // Standard air density corrected for altitude
  // ρ = P / (R * T) where R = 53.352 ft·lbf/lb·°R
  const T = 530 // 70°F in Rankine
  const densityLbFt3 = (pressurePsia * 144) / (53.352 * T)
  
  return {
    altitudeFt,
    barometricPressurePsia: pressurePsia,
    barometricPressureInHg: pressureInHg,
    airDensityLbFt3: densityLbFt3,
  }
}

// =========================================== 
// CORE PSYCHROMETRIC CALCULATIONS
// =========================================== 

/**
 * Calculate humidity ratio from vapor pressure
 * W = 0.621945 * Pw / (P - Pw)
 */
export function humidityRatioFromVaporPressure(
  vaporPressurePsia: number,
  barometricPressurePsia: number
): number {
  return MW_RATIO * vaporPressurePsia / (barometricPressurePsia - vaporPressurePsia)
}

/**
 * Calculate vapor pressure from humidity ratio
 * Pw = W * P / (0.621945 + W)
 */
export function vaporPressureFromHumidityRatio(
  humidityRatioLb: number,
  barometricPressurePsia: number
): number {
  return humidityRatioLb * barometricPressurePsia / (MW_RATIO + humidityRatioLb)
}

/**
 * Calculate relative humidity from vapor pressure and saturation pressure
 * RH = 100 * Pw / Pws
 */
export function relativeHumidityFromPressures(
  vaporPressurePsia: number,
  saturationPressurePsia: number
): number {
  return 100 * vaporPressurePsia / saturationPressurePsia
}

/**
 * Calculate dew point temperature from vapor pressure
 * Iterative calculation finding T where Pws(T) = Pw
 */
export function dewPointFromVaporPressure(vaporPressurePsia: number): number {
  // Newton-Raphson iteration
  let T = 60 // Initial guess
  for (let i = 0; i < 20; i++) {
    const Pws = getSaturationPressure(T)
    const error = Pws - vaporPressurePsia
    if (Math.abs(error) < 0.0001) break
    
    // Estimate derivative using finite difference
    const dT = 0.1
    const dPws = (getSaturationPressure(T + dT) - Pws) / dT
    T = T - error / dPws
  }
  return T
}

/**
 * Calculate wet bulb temperature from state properties
 * Iterative calculation using psychrometric relation
 */
export function wetBulbFromState(
  dryBulbF: number,
  humidityRatioLb: number,
  barometricPressurePsia: number
): number {
  // Iterative solution
  // At wet bulb: W = ((2830 - 0.24*Twb)*Wswb - 0.556*(Tdb - Twb)) / (2830 + 0.444*Tdb - Twb)
  
  let Twb = dryBulbF - 10 // Initial guess
  for (let i = 0; i < 30; i++) {
    const Pws_wb = getSaturationPressure(Twb)
    const Wswb = humidityRatioFromVaporPressure(Pws_wb, barometricPressurePsia)
    
    // Psychrometric relation (ASHRAE)
    const W_calc = ((2830 - 0.24 * Twb) * Wswb - 0.556 * (dryBulbF - Twb)) / (2830 + 0.444 * dryBulbF - Twb)
    
    const error = humidityRatioLb - W_calc
    if (Math.abs(error) < 0.000001) break
    
    // Adjust Twb
    Twb = Twb + error * 100
    
    // Bound Twb between reasonable limits
    if (Twb > dryBulbF) Twb = dryBulbF
    if (Twb < -40) Twb = -40
  }
  
  return Twb
}

/**
 * Calculate humidity ratio from wet bulb temperature
 * Using psychrometric relation from ASHRAE
 */
export function humidityRatioFromWetBulb(
  dryBulbF: number,
  wetBulbF: number,
  barometricPressurePsia: number
): number {
  const Pws_wb = getSaturationPressure(wetBulbF)
  const Wswb = humidityRatioFromVaporPressure(Pws_wb, barometricPressurePsia)
  
  // Psychrometric equation (ASHRAE Fundamentals)
  // W = ((2830 - 0.24*Twb)*Wswb - 0.556*(Tdb - Twb)) / (2830 + 0.444*Tdb - Twb)
  const W = ((2830 - 0.24 * wetBulbF) * Wswb - 0.556 * (dryBulbF - wetBulbF)) / (2830 + 0.444 * dryBulbF - wetBulbF)
  
  return Math.max(0, W) // Humidity ratio can't be negative
}

/**
 * Calculate enthalpy of moist air
 * h = 0.240*Tdb + W*(1061 + 0.444*Tdb) Btu/lb_da
 */
export function calculateEnthalpy(dryBulbF: number, humidityRatioLb: number): number {
  return CP_AIR * dryBulbF + humidityRatioLb * (HG_0F + CP_VAPOR * dryBulbF)
}

/**
 * Calculate specific volume of moist air
 * v = 0.370486 * (Tdb + 459.67) * (1 + 1.6078*W) / P ft³/lb_da
 */
export function calculateSpecificVolume(
  dryBulbF: number,
  humidityRatioLb: number,
  barometricPressurePsia: number
): number {
  const T_R = dryBulbF + 459.67 // Rankine
  return 0.370486 * T_R * (1 + 1.6078 * humidityRatioLb) / barometricPressurePsia
}

// =========================================== 
// COMPLETE STATE POINT CALCULATION
// =========================================== 

/**
 * Calculate complete state point from dry bulb and wet bulb
 */
export function stateFromDbWb(
  dryBulbF: number,
  wetBulbF: number,
  barometricPressurePsia: number
): StatePointResult {
  // Calculate humidity ratio from wet bulb
  const humidityRatioLb = humidityRatioFromWetBulb(dryBulbF, wetBulbF, barometricPressurePsia)
  
  // Calculate vapor pressure
  const vaporPressure = vaporPressureFromHumidityRatio(humidityRatioLb, barometricPressurePsia)
  
  // Calculate saturation pressure at dry bulb
  const saturationPressure = getSaturationPressure(dryBulbF)
  
  // Calculate relative humidity
  const rh = relativeHumidityFromPressures(vaporPressure, saturationPressure)
  
  // Calculate dew point
  const dewPoint = dewPointFromVaporPressure(vaporPressure)
  
  // Calculate enthalpy
  const enthalpy = calculateEnthalpy(dryBulbF, humidityRatioLb)
  
  // Calculate specific volume
  const specificVolume = calculateSpecificVolume(dryBulbF, humidityRatioLb, barometricPressurePsia)
  
  return {
    dryBulbF,
    wetBulbF,
    dewPointF: dewPoint,
    relativeHumidity: Math.min(100, Math.max(0, rh)),
    humidityRatioGrains: lbToGrains(humidityRatioLb),
    humidityRatioLb,
    enthalpyBtuLb: enthalpy,
    specificVolumeFt3Lb: specificVolume,
    vaporPressurePsia: vaporPressure,
    saturationPressurePsia: saturationPressure,
  }
}

/**
 * Calculate complete state point from dry bulb and relative humidity
 */
export function stateFromDbRh(
  dryBulbF: number,
  relativeHumidity: number,
  barometricPressurePsia: number
): StatePointResult {
  // Calculate saturation pressure at dry bulb
  const saturationPressure = getSaturationPressure(dryBulbF)
  
  // Calculate vapor pressure from RH
  const vaporPressure = (relativeHumidity / 100) * saturationPressure
  
  // Calculate humidity ratio
  const humidityRatioLb = humidityRatioFromVaporPressure(vaporPressure, barometricPressurePsia)
  
  // Calculate dew point
  const dewPoint = dewPointFromVaporPressure(vaporPressure)
  
  // Calculate wet bulb
  const wetBulb = wetBulbFromState(dryBulbF, humidityRatioLb, barometricPressurePsia)
  
  // Calculate enthalpy
  const enthalpy = calculateEnthalpy(dryBulbF, humidityRatioLb)
  
  // Calculate specific volume
  const specificVolume = calculateSpecificVolume(dryBulbF, humidityRatioLb, barometricPressurePsia)
  
  return {
    dryBulbF,
    wetBulbF: wetBulb,
    dewPointF: dewPoint,
    relativeHumidity: Math.min(100, Math.max(0, relativeHumidity)),
    humidityRatioGrains: lbToGrains(humidityRatioLb),
    humidityRatioLb,
    enthalpyBtuLb: enthalpy,
    specificVolumeFt3Lb: specificVolume,
    vaporPressurePsia: vaporPressure,
    saturationPressurePsia: saturationPressure,
  }
}

/**
 * Calculate complete state point from dry bulb and dew point
 */
export function stateFromDbDp(
  dryBulbF: number,
  dewPointF: number,
  barometricPressurePsia: number
): StatePointResult {
  // Calculate vapor pressure from dew point (Pws at dew point = Pw)
  const vaporPressure = getSaturationPressure(dewPointF)
  
  // Calculate saturation pressure at dry bulb
  const saturationPressure = getSaturationPressure(dryBulbF)
  
  // Calculate relative humidity
  const rh = relativeHumidityFromPressures(vaporPressure, saturationPressure)
  
  // Calculate humidity ratio
  const humidityRatioLb = humidityRatioFromVaporPressure(vaporPressure, barometricPressurePsia)
  
  // Calculate wet bulb
  const wetBulb = wetBulbFromState(dryBulbF, humidityRatioLb, barometricPressurePsia)
  
  // Calculate enthalpy
  const enthalpy = calculateEnthalpy(dryBulbF, humidityRatioLb)
  
  // Calculate specific volume
  const specificVolume = calculateSpecificVolume(dryBulbF, humidityRatioLb, barometricPressurePsia)
  
  return {
    dryBulbF,
    wetBulbF: wetBulb,
    dewPointF,
    relativeHumidity: Math.min(100, Math.max(0, rh)),
    humidityRatioGrains: lbToGrains(humidityRatioLb),
    humidityRatioLb,
    enthalpyBtuLb: enthalpy,
    specificVolumeFt3Lb: specificVolume,
    vaporPressurePsia: vaporPressure,
    saturationPressurePsia: saturationPressure,
  }
}

/**
 * Calculate complete state point from dry bulb and humidity ratio
 */
export function stateFromDbW(
  dryBulbF: number,
  humidityRatioGrains: number,
  barometricPressurePsia: number
): StatePointResult {
  const humidityRatioLb = grainsToLb(humidityRatioGrains)
  
  // Calculate vapor pressure
  const vaporPressure = vaporPressureFromHumidityRatio(humidityRatioLb, barometricPressurePsia)
  
  // Calculate saturation pressure at dry bulb
  const saturationPressure = getSaturationPressure(dryBulbF)
  
  // Calculate relative humidity
  const rh = relativeHumidityFromPressures(vaporPressure, saturationPressure)
  
  // Calculate dew point
  const dewPoint = dewPointFromVaporPressure(vaporPressure)
  
  // Calculate wet bulb
  const wetBulb = wetBulbFromState(dryBulbF, humidityRatioLb, barometricPressurePsia)
  
  // Calculate enthalpy
  const enthalpy = calculateEnthalpy(dryBulbF, humidityRatioLb)
  
  // Calculate specific volume
  const specificVolume = calculateSpecificVolume(dryBulbF, humidityRatioLb, barometricPressurePsia)
  
  return {
    dryBulbF,
    wetBulbF: wetBulb,
    dewPointF: dewPoint,
    relativeHumidity: Math.min(100, Math.max(0, rh)),
    humidityRatioGrains,
    humidityRatioLb,
    enthalpyBtuLb: enthalpy,
    specificVolumeFt3Lb: specificVolume,
    vaporPressurePsia: vaporPressure,
    saturationPressurePsia: saturationPressure,
  }
}

/**
 * Calculate state point based on input mode
 */
export function calculateStatePoint(
  inputMode: PsychInputMode,
  inputs: {
    dryBulbF: number
    wetBulbF?: number
    relativeHumidity?: number
    dewPointF?: number
    humidityRatioGrains?: number
  },
  barometricPressurePsia: number
): StatePointResult {
  switch (inputMode) {
    case 'db_wb':
      return stateFromDbWb(inputs.dryBulbF, inputs.wetBulbF!, barometricPressurePsia)
    case 'db_rh':
      return stateFromDbRh(inputs.dryBulbF, inputs.relativeHumidity!, barometricPressurePsia)
    case 'db_dp':
      return stateFromDbDp(inputs.dryBulbF, inputs.dewPointF!, barometricPressurePsia)
    case 'db_w':
      return stateFromDbW(inputs.dryBulbF, inputs.humidityRatioGrains!, barometricPressurePsia)
    default:
      throw new Error(`Unknown input mode: ${inputMode}`)
  }
}

// =========================================== 
// AIR MIXING CALCULATION
// =========================================== 

/**
 * Calculate mixed air state from two airstreams
 */
export function calculateMixing(
  streamA: { state: StatePointResult; cfm: number },
  streamB: { state: StatePointResult; cfm: number },
  barometricPressurePsia: number
): MixingResult {
  const totalCfm = streamA.cfm + streamB.cfm
  
  if (totalCfm === 0) {
    throw new Error('Total CFM cannot be zero')
  }
  
  // Mass flow rates (approximate using specific volumes)
  const massFlowA = streamA.cfm / streamA.state.specificVolumeFt3Lb
  const massFlowB = streamB.cfm / streamB.state.specificVolumeFt3Lb
  const totalMassFlow = massFlowA + massFlowB
  
  const mixRatioA = massFlowA / totalMassFlow
  const mixRatioB = massFlowB / totalMassFlow
  
  // Mixed air humidity ratio (mass-weighted)
  const mixedHumidityRatioLb = 
    mixRatioA * streamA.state.humidityRatioLb + 
    mixRatioB * streamB.state.humidityRatioLb
  
  // Mixed air enthalpy (mass-weighted)
  const mixedEnthalpy = 
    mixRatioA * streamA.state.enthalpyBtuLb + 
    mixRatioB * streamB.state.enthalpyBtuLb
  
  // Calculate mixed dry bulb from enthalpy and humidity ratio
  // h = 0.240*Tdb + W*(1061 + 0.444*Tdb)
  // Solving for Tdb: Tdb = (h - 1061*W) / (0.240 + 0.444*W)
  const mixedDryBulb = (mixedEnthalpy - HG_0F * mixedHumidityRatioLb) / (CP_AIR + CP_VAPOR * mixedHumidityRatioLb)
  
  // Calculate complete mixed state from dry bulb and humidity ratio
  const mixedPoint = stateFromDbW(mixedDryBulb, lbToGrains(mixedHumidityRatioLb), barometricPressurePsia)
  
  return {
    mixedPoint,
    totalCfm,
    mixRatioA,
    mixRatioB,
  }
}

// =========================================== 
// HVAC PROCESS CALCULATION
// =========================================== 

/**
 * Calculate energy loads for an HVAC process
 */
export function calculateProcess(
  entering: StatePointResult,
  leaving: StatePointResult,
  cfm: number
): ProcessResult {
  // Average specific volume for mass flow calculation
  const avgSpecificVolume = (entering.specificVolumeFt3Lb + leaving.specificVolumeFt3Lb) / 2
  
  // Mass flow rate (lb/hr)
  const massFlowLbHr = (cfm * 60) / avgSpecificVolume
  
  // Enthalpy difference
  const deltaH = leaving.enthalpyBtuLb - entering.enthalpyBtuLb
  
  // Temperature difference
  const deltaT = leaving.dryBulbF - entering.dryBulbF
  
  // Humidity ratio difference (lb/lb)
  const deltaW = leaving.humidityRatioLb - entering.humidityRatioLb
  
  // Total heat (Btu/hr)
  // Qt = m_dot * delta_h
  const totalLoadBtuh = massFlowLbHr * deltaH
  
  // Sensible heat (Btu/hr)
  // Qs = m_dot * cp_moist * delta_T
  // cp_moist ≈ 0.240 + 0.444*W (average)
  const avgW = (entering.humidityRatioLb + leaving.humidityRatioLb) / 2
  const cpMoist = CP_AIR + CP_VAPOR * avgW
  const sensibleLoadBtuh = massFlowLbHr * cpMoist * deltaT
  
  // Latent heat (Btu/hr)
  // QL = m_dot * hfg * delta_W
  // Or simply: QL = Qt - Qs
  const latentLoadBtuh = totalLoadBtuh - sensibleLoadBtuh
  
  // Convert to tons (12,000 Btu/hr = 1 ton)
  const totalLoadTons = totalLoadBtuh / 12000
  
  // Moisture (lb/hr) - positive = humidification, negative = dehumidification
  const moistureLbHr = massFlowLbHr * deltaW
  
  // Sensible Heat Ratio
  const sensibleHeatRatio = totalLoadBtuh !== 0 ? Math.abs(sensibleLoadBtuh / totalLoadBtuh) : 1
  
  return {
    totalLoadBtuh,
    sensibleLoadBtuh,
    latentLoadBtuh,
    totalLoadTons,
    moistureLbHr,
    massFlowLbHr,
    sensibleHeatRatio,
  }
}

// =========================================== 
// SHORTCUT FORMULAS (Standard Air)
// For quick estimates at sea level, 70°F
// =========================================== 

/**
 * Quick sensible heat calculation (standard air)
 * Qs = 1.08 × CFM × ΔT
 */
export function quickSensibleHeat(cfm: number, deltaT: number): number {
  return 1.08 * cfm * deltaT
}

/**
 * Quick total heat calculation (standard air)
 * Qt = 4.5 × CFM × Δh
 */
export function quickTotalHeat(cfm: number, deltaH: number): number {
  return 4.5 * cfm * deltaH
}

/**
 * Quick latent heat calculation (standard air, grains)
 * QL = 0.68 × CFM × ΔW (grains)
 */
export function quickLatentHeat(cfm: number, deltaWGrains: number): number {
  return 0.68 * cfm * deltaWGrains
}

// =========================================== 
// CHART COORDINATE CALCULATIONS
// =========================================== 

/**
 * Convert state point to chart coordinates (0-1 normalized)
 */
export function stateToChartCoords(
  state: StatePointResult,
  config: { minTempF: number; maxTempF: number; minWGrains: number; maxWGrains: number }
): { x: number; y: number } {
  const x = (state.dryBulbF - config.minTempF) / (config.maxTempF - config.minTempF)
  const y = 1 - (state.humidityRatioGrains - config.minWGrains) / (config.maxWGrains - config.minWGrains)
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
}

/**
 * Convert chart coordinates to state inputs
 */
export function chartCoordsToInputs(
  coords: { x: number; y: number },
  config: { minTempF: number; maxTempF: number; minWGrains: number; maxWGrains: number }
): { dryBulbF: number; humidityRatioGrains: number } {
  const dryBulbF = config.minTempF + coords.x * (config.maxTempF - config.minTempF)
  const humidityRatioGrains = config.minWGrains + (1 - coords.y) * (config.maxWGrains - config.minWGrains)
  return { dryBulbF, humidityRatioGrains }
}

/**
 * Generate saturation curve points for chart
 */
export function generateSaturationCurve(
  config: { minTempF: number; maxTempF: number; minWGrains: number; maxWGrains: number },
  barometricPressurePsia: number,
  numPoints: number = 50
): { x: number; y: number; temp: number; w: number }[] {
  const points: { x: number; y: number; temp: number; w: number }[] = []
  const tempStep = (config.maxTempF - config.minTempF) / numPoints
  
  for (let i = 0; i <= numPoints; i++) {
    const temp = config.minTempF + i * tempStep
    const Pws = getSaturationPressure(temp)
    const Ws = humidityRatioFromVaporPressure(Pws, barometricPressurePsia)
    const WsGrains = lbToGrains(Ws)
    
    const x = (temp - config.minTempF) / (config.maxTempF - config.minTempF)
    const y = 1 - (WsGrains - config.minWGrains) / (config.maxWGrains - config.minWGrains)
    
    // Only include points within the chart bounds
    if (y >= 0 && y <= 1) {
      points.push({ x, y, temp, w: WsGrains })
    }
  }
  
  return points
}

/**
 * Generate constant RH curve points
 */
export function generateConstantRhCurve(
  rh: number,
  config: { minTempF: number; maxTempF: number; minWGrains: number; maxWGrains: number },
  barometricPressurePsia: number,
  numPoints: number = 30
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  const tempStep = (config.maxTempF - config.minTempF) / numPoints
  
  for (let i = 0; i <= numPoints; i++) {
    const temp = config.minTempF + i * tempStep
    const state = stateFromDbRh(temp, rh, barometricPressurePsia)
    
    const x = (temp - config.minTempF) / (config.maxTempF - config.minTempF)
    const y = 1 - (state.humidityRatioGrains - config.minWGrains) / (config.maxWGrains - config.minWGrains)
    
    // Only include points within the chart bounds
    if (y >= 0 && y <= 1 && x >= 0 && x <= 1) {
      points.push({ x, y })
    }
  }
  
  return points
}

/**
 * Generate constant wet bulb line points
 */
export function generateConstantWbLine(
  wetBulbF: number,
  config: { minTempF: number; maxTempF: number; minWGrains: number; maxWGrains: number },
  barometricPressurePsia: number,
  numPoints: number = 20
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  
  // Start from wet bulb temp (where Twb = Tdb at saturation)
  const startTemp = wetBulbF
  const endTemp = Math.min(config.maxTempF, wetBulbF + 60) // Typically within 60°F of wb
  const tempStep = (endTemp - startTemp) / numPoints
  
  for (let i = 0; i <= numPoints; i++) {
    const temp = startTemp + i * tempStep
    if (temp < config.minTempF || temp > config.maxTempF) continue
    
    const state = stateFromDbWb(temp, wetBulbF, barometricPressurePsia)
    
    const x = (temp - config.minTempF) / (config.maxTempF - config.minTempF)
    const y = 1 - (state.humidityRatioGrains - config.minWGrains) / (config.maxWGrains - config.minWGrains)
    
    if (y >= 0 && y <= 1 && x >= 0 && x <= 1) {
      points.push({ x, y })
    }
  }
  
  return points
}
