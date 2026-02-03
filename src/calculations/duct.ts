// =========================================== 
// DUCTWORK PRESSURE DROP CALCULATIONS
// Based on ASHRAE Fundamentals & SMACNA
// Uses Darcy-Weisbach equation
// =========================================== 

import type {
  DuctSystem,
  DuctSection,
  AirProperties,
  DuctSectionCalculation,
  DuctCalculationResult,
  DuctLiner,
  DuctMaterial,
} from '../types/duct'
import { DUCT_MATERIALS, DUCT_LINER, getAirProperties, VELOCITY_LIMITS, FLEX_DUCT_CORRECTION } from '../data/ductMaterials'
import { getDuctFitting } from '../data/ductFittingsLibrary'

// =========================================== 
// CONSTANTS
// =========================================== 
const GRAVITY = 32.174 // ft/s²

// =========================================== 
// GEOMETRY CALCULATIONS
// =========================================== 

/**
 * Get effective internal dimensions accounting for duct liner
 */
export function getEffectiveDimensions(
  width: number,
  height: number,
  liner: DuctLiner
): { effectiveWidth: number; effectiveHeight: number; linerThickness: number } {
  const linerData = DUCT_LINER[liner]
  const linerThickness = linerData.thicknessIn
  
  // Liner reduces internal dimensions on all sides
  const effectiveWidth = Math.max(width - 2 * linerThickness, 1)
  const effectiveHeight = Math.max(height - 2 * linerThickness, 1)
  
  return { effectiveWidth, effectiveHeight, linerThickness }
}

/**
 * Get effective diameter for round duct with liner
 */
export function getEffectiveDiameter(diameter: number, liner: DuctLiner): number {
  const linerData = DUCT_LINER[liner]
  const linerThickness = linerData.thicknessIn
  return Math.max(diameter - 2 * linerThickness, 1)
}

/**
 * Calculate hydraulic diameter for rectangular duct
 * Dh = 4A/P = 2WH/(W+H)
 */
export function calculateHydraulicDiameter(width: number, height: number): number {
  return (2 * width * height) / (width + height)
}

/**
 * Calculate cross-sectional area
 */
export function calculateArea(width: number, height: number, isRound: boolean = false): number {
  if (isRound) {
    // width is diameter for round
    return Math.PI * Math.pow(width / 2, 2) / 144 // in² to ft²
  }
  return (width * height) / 144 // in² to ft²
}

/**
 * Calculate air velocity from CFM and area
 */
export function calculateVelocity(cfm: number, areaFt2: number): number {
  return cfm / areaFt2 // fpm
}

// =========================================== 
// FRICTION CALCULATIONS
// =========================================== 

/**
 * Calculate Reynolds number for air flow
 * Re = ρVD/μ
 */
export function calculateReynoldsNumber(
  velocityFpm: number,
  hydraulicDiameterIn: number,
  airProps: AirProperties
): number {
  // Convert velocity to ft/s
  const velocityFps = velocityFpm / 60
  // Convert diameter to ft
  const diameterFt = hydraulicDiameterIn / 12
  
  // Re = ρVD/μ
  return (airProps.densityLbFt3 * velocityFps * diameterFt) / airProps.viscosityLbFtS
}

/**
 * Calculate friction factor using Swamee-Jain equation
 * (Explicit approximation to Colebrook-White)
 */
export function calculateFrictionFactor(
  reynoldsNumber: number,
  roughnessFt: number,
  hydraulicDiameterFt: number
): number {
  if (reynoldsNumber < 2300) {
    // Laminar flow
    return 64 / reynoldsNumber
  }
  
  // Turbulent flow - Swamee-Jain equation
  const relativeRoughness = roughnessFt / hydraulicDiameterFt
  
  const term1 = relativeRoughness / 3.7
  const term2 = 5.74 / Math.pow(reynoldsNumber, 0.9)
  
  const f = 0.25 / Math.pow(Math.log10(term1 + term2), 2)
  
  return f
}

/**
 * Calculate velocity pressure
 * Pv = ρV²/(2gc) in lbf/ft²
 * Convert to inches WC: × 12/62.4 (water density = 62.4 lb/ft³)
 */
export function calculateVelocityPressure(velocityFpm: number, densityLbFt3: number): number {
  const velocityFps = velocityFpm / 60
  
  // Pv in lbf/ft² = ρV²/(2gc)
  const pvLbfFt2 = (densityLbFt3 * Math.pow(velocityFps, 2)) / (2 * GRAVITY)
  
  // Convert to in. WC (1 in. WC = 5.2 lbf/ft²)
  return pvLbfFt2 / 5.2
}

/**
 * Calculate straight duct friction loss using Darcy-Weisbach
 * ΔP = f(L/D)(ρV²/2gc)
 */
export function calculateStraightDuctLoss(
  lengthFt: number,
  hydraulicDiameterIn: number,
  frictionFactor: number,
  velocityPressureInWc: number
): number {
  const diameterFt = hydraulicDiameterIn / 12
  
  // ΔP = f × (L/D) × Pv
  return frictionFactor * (lengthFt / diameterFt) * velocityPressureInWc
}

/**
 * Calculate fitting loss using C-coefficient method
 * ΔP = C × Pv
 */
export function calculateFittingLoss(
  cCoefficient: number,
  velocityPressureInWc: number
): number {
  return cCoefficient * velocityPressureInWc
}

// =========================================== 
// GET ROUGHNESS FOR SECTION
// =========================================== 
export function getSectionRoughness(material: DuctMaterial, liner: DuctLiner): number {
  // If liner is present, use liner roughness (fiberglass surface)
  if (liner !== 'none') {
    return DUCT_LINER[liner].roughnessFt!
  }
  
  // Otherwise use material roughness
  return DUCT_MATERIALS[material].roughnessFt
}

// =========================================== 
// SECTION CALCULATION
// =========================================== 
export function calculateDuctSection(
  section: DuctSection,
  airProps: AirProperties,
  systemType: string
): DuctSectionCalculation {
  const warnings: string[] = []
  
  // Handle equipment sections with fixed pressure drop
  if (section.sectionType === 'equipment' && section.fixedPressureDrop !== undefined) {
    return {
      sectionId: section.id,
      sectionName: section.name,
      sectionType: section.sectionType,
      cfm: section.cfm,
      shape: section.shape,
      nominalWidth: section.widthIn,
      nominalHeight: section.heightIn,
      nominalDiameter: section.diameterIn,
      hydraulicDiameterIn: 0,
      areaFt2: 0,
      velocityFpm: 0,
      velocityPressureInWc: 0,
      reynoldsNumber: 0,
      frictionFactor: 0,
      straightDuctLossInWc: section.fixedPressureDrop,
      fittingsLossInWc: 0,
      totalSectionLossInWc: section.fixedPressureDrop,
      warnings: [],
    }
  }
  
  // Calculate effective dimensions with liner
  let effectiveWidth: number
  let effectiveHeight: number
  let effectiveDiameter: number
  let hydraulicDiameterIn: number
  let areaFt2: number
  
  if (section.shape === 'round') {
    effectiveDiameter = getEffectiveDiameter(section.diameterIn, section.liner)
    hydraulicDiameterIn = effectiveDiameter
    areaFt2 = calculateArea(effectiveDiameter, effectiveDiameter, true)
    effectiveWidth = effectiveDiameter
    effectiveHeight = effectiveDiameter
  } else {
    const dims = getEffectiveDimensions(section.widthIn, section.heightIn, section.liner)
    effectiveWidth = dims.effectiveWidth
    effectiveHeight = dims.effectiveHeight
    effectiveDiameter = 0
    hydraulicDiameterIn = calculateHydraulicDiameter(effectiveWidth, effectiveHeight)
    areaFt2 = calculateArea(effectiveWidth, effectiveHeight)
  }
  
  // Calculate velocity
  const velocityFpm = calculateVelocity(section.cfm, areaFt2)
  
  // Check velocity limits
  const limits = VELOCITY_LIMITS[systemType as keyof typeof VELOCITY_LIMITS] || VELOCITY_LIMITS.supply
  if (velocityFpm > limits.max) {
    warnings.push(`Velocity ${Math.round(velocityFpm)} fpm exceeds maximum ${limits.max} fpm`)
  } else if (velocityFpm > limits.recommended) {
    warnings.push(`Velocity ${Math.round(velocityFpm)} fpm exceeds recommended ${limits.recommended} fpm - ${limits.noise}`)
  }
  
  // Calculate velocity pressure
  const velocityPressureInWc = calculateVelocityPressure(velocityFpm, airProps.densityLbFt3)
  
  // Calculate Reynolds number
  const reynoldsNumber = calculateReynoldsNumber(velocityFpm, hydraulicDiameterIn, airProps)
  
  // Get roughness
  let roughness = getSectionRoughness(section.material, section.liner)
  
  // Flex duct correction
  let lengthFt = section.lengthFt
  if (section.material === 'flex' || section.sectionType === 'flex') {
    roughness = DUCT_MATERIALS.flex.roughnessFt * FLEX_DUCT_CORRECTION.typical
    if (lengthFt > FLEX_DUCT_CORRECTION.maxRecommendedLength) {
      warnings.push(`Flex duct length ${lengthFt} ft exceeds recommended ${FLEX_DUCT_CORRECTION.maxRecommendedLength} ft`)
    }
  }
  
  // Calculate friction factor
  const frictionFactor = calculateFrictionFactor(
    reynoldsNumber,
    roughness,
    hydraulicDiameterIn / 12
  )
  
  // Calculate straight duct loss
  const straightDuctLossInWc = calculateStraightDuctLoss(
    lengthFt,
    hydraulicDiameterIn,
    frictionFactor,
    velocityPressureInWc
  )
  
  // Calculate fittings loss
  let fittingsLossInWc = 0
  for (const fitting of section.fittings) {
    const fittingData = getDuctFitting(fitting.fittingType)
    if (!fittingData) continue
    
    if (fittingData.method === 'fixed_dp') {
      // Fixed pressure drop (terminals, equipment)
      const dp = fitting.fixedDpOverride ?? fittingData.defaultDp ?? 0
      fittingsLossInWc += dp * fitting.quantity
    } else {
      // C-coefficient method
      const c = fitting.cCoefficientOverride ?? fittingData.cCoefficient ?? 0
      fittingsLossInWc += calculateFittingLoss(c, velocityPressureInWc) * fitting.quantity
    }
  }
  
  return {
    sectionId: section.id,
    sectionName: section.name,
    sectionType: section.sectionType,
    cfm: section.cfm,
    shape: section.shape,
    nominalWidth: section.widthIn,
    nominalHeight: section.heightIn,
    nominalDiameter: section.diameterIn,
    effectiveWidth: section.shape !== 'round' ? effectiveWidth : undefined,
    effectiveHeight: section.shape !== 'round' ? effectiveHeight : undefined,
    effectiveDiameter: section.shape === 'round' ? effectiveDiameter : undefined,
    hydraulicDiameterIn,
    areaFt2,
    velocityFpm,
    velocityPressureInWc,
    reynoldsNumber,
    frictionFactor,
    straightDuctLossInWc,
    fittingsLossInWc,
    totalSectionLossInWc: straightDuctLossInWc + fittingsLossInWc,
    warnings,
  }
}

// =========================================== 
// SYSTEM CALCULATION
// =========================================== 
export function calculateDuctSystem(
  system: DuctSystem,
  sections: DuctSection[]
): DuctCalculationResult {
  const warnings: string[] = []
  
  // Get air properties
  const airProps = getAirProperties(system.altitudeFt, system.temperatureF)
  
  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)
  
  // Calculate each section
  const sectionResults: DuctSectionCalculation[] = sortedSections.map(section =>
    calculateDuctSection(section, airProps, system.systemType)
  )
  
  // Aggregate warnings
  for (const result of sectionResults) {
    warnings.push(...result.warnings)
  }
  
  // Calculate totals
  const totalStraightDuctLoss = sectionResults.reduce((sum, s) => sum + s.straightDuctLossInWc, 0)
  const totalFittingsLoss = sectionResults.reduce((sum, s) => sum + s.fittingsLossInWc, 0)
  const subtotalLoss = totalStraightDuctLoss + totalFittingsLoss
  
  // Apply safety factor
  const safetyFactorPercent = system.safetyFactor * 100
  const safetyFactorInWc = subtotalLoss * system.safetyFactor
  const totalSystemLoss = subtotalLoss + safetyFactorInWc
  
  // Find max velocity
  const maxVelocityFpm = Math.max(...sectionResults.map(s => s.velocityFpm), 0)
  
  // System warnings
  if (system.maxVelocityFpm && maxVelocityFpm > system.maxVelocityFpm) {
    warnings.push(`Max velocity ${Math.round(maxVelocityFpm)} fpm exceeds constraint ${system.maxVelocityFpm} fpm`)
  }
  
  return {
    altitudeFt: system.altitudeFt,
    temperatureF: system.temperatureF,
    airProperties: airProps,
    sections: sectionResults,
    totalStraightDuctLoss,
    totalFittingsLoss,
    subtotalLoss,
    safetyFactorPercent,
    safetyFactorInWc,
    totalSystemLoss,
    maxVelocityFpm,
    totalCfm: system.totalCfm,
    warnings,
  }
}

// =========================================== 
// UTILITY FUNCTIONS
// =========================================== 

/**
 * Convert pressure drop from in. WC to Pa
 */
export function inWcToPa(inWc: number): number {
  return inWc * 249.089
}

/**
 * Convert pressure drop from Pa to in. WC
 */
export function paToInWc(pa: number): number {
  return pa / 249.089
}

/**
 * Estimate fan BHP from CFM and total pressure
 * BHP = (CFM × TP) / (6356 × η)
 */
export function estimateFanBhp(
  cfm: number,
  totalPressureInWc: number,
  fanEfficiency: number = 0.65
): number {
  return (cfm * totalPressureInWc) / (6356 * fanEfficiency)
}

/**
 * Calculate equivalent round diameter for rectangular duct
 * De = 1.3(ab)^0.625 / (a+b)^0.25
 */
export function equivalentRoundDiameter(width: number, height: number): number {
  return 1.3 * Math.pow(width * height, 0.625) / Math.pow(width + height, 0.25)
}
