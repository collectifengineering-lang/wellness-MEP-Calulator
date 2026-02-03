// =========================================== 
// HYDRONIC PUMP HEAD CALCULATIONS
// Uses Darcy-Weisbach equation for friction loss
// Reference: Bell & Gossett TEH-908A
// =========================================== 

import type {
  HydronicSystem,
  HydronicPipeSection,
  HydronicFitting,
  FluidProperties,
  SectionCalculation,
  HydronicCalculationResult,
} from '../types/hydronic'

import { getFluidProperties } from '../data/fluidProperties'
import { getInnerDiameter, getPipeRoughness, getPipeVolume } from '../data/pipeData'
import { getFitting, calculateEquivalentLength, calculateCvPressureDrop } from '../data/fittingsLibrary'

// Constants
const GRAVITY_FT_S2 = 32.174 // ft/s²

// =========================================== 
// VELOCITY CALCULATION
// v = 0.4085 × Q / d²
// Where: v = velocity (ft/s), Q = flow (GPM), d = ID (inches)
// =========================================== 
export function calculateVelocity(flowGpm: number, innerDiameterIn: number): number {
  if (innerDiameterIn <= 0) return 0
  return (0.4085 * flowGpm) / Math.pow(innerDiameterIn, 2)
}

// =========================================== 
// REYNOLDS NUMBER
// Re = (ρ × v × D) / μ
// With unit conversions for our inputs
// =========================================== 
export function calculateReynoldsNumber(
  velocityFps: number,
  innerDiameterIn: number,
  densityLbFt3: number,
  viscosityCp: number
): number {
  if (viscosityCp <= 0 || innerDiameterIn <= 0) return 0
  
  // Convert inner diameter from inches to feet
  const diameterFt = innerDiameterIn / 12
  
  // Convert centipoise to lb/(ft·s): 1 cP = 6.7197e-4 lb/(ft·s)
  const viscosityLbFtS = viscosityCp * 6.7197e-4
  
  // Re = (ρ × v × D) / μ
  return (densityLbFt3 * velocityFps * diameterFt) / viscosityLbFtS
}

// =========================================== 
// FRICTION FACTOR
// Uses Swamee-Jain explicit approximation (faster than Colebrook iteration)
// f = 0.25 / [log₁₀(ε/3.7D + 5.74/Re^0.9)]²
// Valid for 4000 ≤ Re ≤ 10⁸ and 10⁻⁶ ≤ ε/D ≤ 10⁻²
// =========================================== 
export function calculateFrictionFactor(
  reynoldsNumber: number,
  roughnessFt: number,
  innerDiameterIn: number
): number {
  // Laminar flow (Re < 2300): f = 64/Re
  if (reynoldsNumber < 2300) {
    return 64 / reynoldsNumber
  }
  
  // Transition zone (2300 ≤ Re < 4000): interpolate
  if (reynoldsNumber < 4000) {
    const fLaminar = 64 / 2300
    const fTurbulent = calculateTurbulentFrictionFactor(4000, roughnessFt, innerDiameterIn)
    const t = (reynoldsNumber - 2300) / (4000 - 2300)
    return fLaminar + t * (fTurbulent - fLaminar)
  }
  
  // Turbulent flow (Re ≥ 4000): Swamee-Jain
  return calculateTurbulentFrictionFactor(reynoldsNumber, roughnessFt, innerDiameterIn)
}

function calculateTurbulentFrictionFactor(
  reynoldsNumber: number,
  roughnessFt: number,
  innerDiameterIn: number
): number {
  // Convert diameter to feet for consistency
  const diameterFt = innerDiameterIn / 12
  
  // Relative roughness ε/D
  const relativeRoughness = roughnessFt / diameterFt
  
  // Swamee-Jain equation
  // f = 0.25 / [log₁₀(ε/3.7D + 5.74/Re^0.9)]²
  const term1 = relativeRoughness / 3.7
  const term2 = 5.74 / Math.pow(reynoldsNumber, 0.9)
  const logTerm = Math.log10(term1 + term2)
  
  return 0.25 / Math.pow(logTerm, 2)
}

// =========================================== 
// HEAD LOSS (Darcy-Weisbach)
// h_L = f × (L/D) × (v²/2g)
// Where: h_L = head loss (ft), f = friction factor,
//        L = length (ft), D = diameter (ft), v = velocity (ft/s)
// =========================================== 
export function calculateHeadLoss(
  frictionFactor: number,
  lengthFt: number,
  innerDiameterIn: number,
  velocityFps: number
): number {
  if (innerDiameterIn <= 0) return 0
  
  // Convert diameter to feet
  const diameterFt = innerDiameterIn / 12
  
  // h_L = f × (L/D) × (v²/2g)
  return frictionFactor * (lengthFt / diameterFt) * (Math.pow(velocityFps, 2) / (2 * GRAVITY_FT_S2))
}

// =========================================== 
// FITTING PRESSURE DROP CALCULATION
// =========================================== 
export function calculateFittingHeadLoss(
  fitting: HydronicFitting,
  flowGpm: number,
  innerDiameterIn: number,
  frictionFactor: number,
  velocityFps: number,
  specificGravity: number
): number {
  const fittingData = getFitting(fitting.fittingType)
  if (!fittingData) return 0
  
  // Manual dP override
  if (fitting.dpOverrideFt !== undefined && fitting.dpOverrideFt > 0) {
    return fitting.dpOverrideFt * fitting.quantity
  }
  
  // Cv-based calculation
  if (fittingData.method === 'cv' || fittingData.method === 'manual_dp') {
    // Get Cv value (user override or from table)
    let cv = fitting.cvOverride
    if (!cv && fittingData.cvBySizeTable) {
      // Find closest pipe size in table
      const pipeSizes = Object.keys(fittingData.cvBySizeTable)
      // Simple match for now - could improve with interpolation
      for (const size of pipeSizes) {
        // This is a rough match - in production would want better size matching
        cv = fittingData.cvBySizeTable[size]
        break // Just use first available for now if no exact match
      }
    }
    cv = cv || fittingData.defaultCv || 1
    
    if (fittingData.requiresDpInput && !fitting.dpOverrideFt) {
      // Device requires manual dP input but none provided
      return 0
    }
    
    return calculateCvPressureDrop(flowGpm, cv, specificGravity) * fitting.quantity
  }
  
  // L/D method
  if (fittingData.method === 'l_over_d' && fittingData.lOverD) {
    const equivalentLength = calculateEquivalentLength(fittingData.lOverD, innerDiameterIn)
    return calculateHeadLoss(frictionFactor, equivalentLength, innerDiameterIn, velocityFps) * fitting.quantity
  }
  
  return 0
}

// =========================================== 
// CALCULATE SINGLE SECTION
// =========================================== 
export function calculateSection(
  section: HydronicPipeSection,
  fluidProperties: FluidProperties
): SectionCalculation {
  const warnings: string[] = []
  
  // Get pipe properties
  const innerDiameterIn = getInnerDiameter(section.pipeMaterial, section.pipeSizeNominal)
  const roughnessFt = getPipeRoughness(section.pipeMaterial)
  
  if (innerDiameterIn <= 0) {
    warnings.push(`Invalid pipe size: ${section.pipeSizeNominal} for material ${section.pipeMaterial}`)
    return {
      sectionId: section.id,
      sectionName: section.name,
      flowGpm: section.flowGpm,
      pipeMaterial: section.pipeMaterial,
      pipeSize: section.pipeSizeNominal,
      lengthFt: section.lengthFt,
      innerDiameterIn: 0,
      velocityFps: 0,
      reynoldsNumber: 0,
      frictionFactor: 0,
      pipeFrictionLossFt: 0,
      fittingsLossFt: 0,
      totalSectionLossFt: 0,
      volumeGal: 0,
      warnings,
    }
  }
  
  // Calculate velocity
  const velocityFps = calculateVelocity(section.flowGpm, innerDiameterIn)
  
  // Velocity warnings
  if (velocityFps > 8) {
    warnings.push(`High velocity: ${velocityFps.toFixed(1)} fps (recommend < 8 fps)`)
  } else if (velocityFps > 10) {
    warnings.push(`VERY HIGH velocity: ${velocityFps.toFixed(1)} fps - pipe erosion risk`)
  }
  if (velocityFps < 2 && section.flowGpm > 0) {
    warnings.push(`Low velocity: ${velocityFps.toFixed(1)} fps (may cause air/sediment issues)`)
  }
  
  // Calculate Reynolds number
  const reynoldsNumber = calculateReynoldsNumber(
    velocityFps,
    innerDiameterIn,
    fluidProperties.densityLbFt3,
    fluidProperties.viscosityCp
  )
  
  // Calculate friction factor
  const frictionFactor = calculateFrictionFactor(reynoldsNumber, roughnessFt, innerDiameterIn)
  
  // Calculate pipe friction loss
  const pipeFrictionLossFt = calculateHeadLoss(
    frictionFactor,
    section.lengthFt,
    innerDiameterIn,
    velocityFps
  )
  
  // Calculate fittings loss
  let fittingsLossFt = 0
  for (const fitting of section.fittings) {
    fittingsLossFt += calculateFittingHeadLoss(
      fitting,
      section.flowGpm,
      innerDiameterIn,
      frictionFactor,
      velocityFps,
      fluidProperties.specificGravity
    )
  }
  
  // Calculate volume
  const volumeGal = getPipeVolume(section.pipeMaterial, section.pipeSizeNominal, section.lengthFt)
  
  return {
    sectionId: section.id,
    sectionName: section.name,
    flowGpm: section.flowGpm,
    pipeMaterial: section.pipeMaterial,
    pipeSize: section.pipeSizeNominal,
    lengthFt: section.lengthFt,
    innerDiameterIn,
    velocityFps,
    reynoldsNumber,
    frictionFactor,
    pipeFrictionLossFt,
    fittingsLossFt,
    totalSectionLossFt: pipeFrictionLossFt + fittingsLossFt,
    volumeGal,
    warnings,
  }
}

// =========================================== 
// CALCULATE ENTIRE SYSTEM
// =========================================== 
export function calculateHydronicSystem(
  system: HydronicSystem,
  sections: HydronicPipeSection[]
): HydronicCalculationResult {
  const warnings: string[] = []
  
  // Get fluid properties
  const fluidProperties = getFluidProperties(
    system.fluidType,
    system.glycolConcentration,
    system.fluidTempF
  )
  
  // Calculate each section
  const sectionResults = sections.map(section => 
    calculateSection(section, fluidProperties)
  )
  
  // Collect all warnings
  sectionResults.forEach(result => {
    result.warnings.forEach(w => warnings.push(`${result.sectionName}: ${w}`))
  })
  
  // Sum totals
  const totalPipeFrictionFt = sectionResults.reduce((sum, s) => sum + s.pipeFrictionLossFt, 0)
  const totalFittingsLossFt = sectionResults.reduce((sum, s) => sum + s.fittingsLossFt, 0)
  const subtotalFrictionFt = totalPipeFrictionFt + totalFittingsLossFt
  
  // Static head (only for open systems)
  const staticHeadFt = system.systemType === 'open' ? system.staticHeadFt : 0
  
  // Calculate total before safety factor
  const calculatedHeadFt = subtotalFrictionFt + staticHeadFt
  
  // Apply safety factor
  const safetyFactorPercent = system.safetyFactor * 100
  const safetyFactorFt = calculatedHeadFt * system.safetyFactor
  
  // Total pump head
  const totalPumpHeadFt = calculatedHeadFt + safetyFactorFt
  
  // System volume
  const totalSystemVolumeGal = sectionResults.reduce((sum, s) => sum + s.volumeGal, 0)
  
  // Max flow (for pump sizing)
  const maxFlowGpm = Math.max(...sections.map(s => s.flowGpm), 0)
  
  // Add glycol warning if high concentration
  if (system.glycolConcentration > 50) {
    warnings.push(`High glycol concentration (${system.glycolConcentration}%) - verify pump curve derating`)
  }
  
  // Add low temperature warning for glycol
  if (system.fluidType !== 'water' && system.fluidTempF < 40) {
    warnings.push(`Low temperature with glycol - verify viscosity correction`)
  }
  
  return {
    fluidType: system.fluidType,
    fluidTemp: system.fluidTempF,
    glycolConcentration: system.glycolConcentration,
    fluidProperties,
    sections: sectionResults,
    totalPipeFrictionFt,
    totalFittingsLossFt,
    subtotalFrictionFt,
    staticHeadFt,
    calculatedHeadFt,
    safetyFactorPercent,
    safetyFactorFt,
    totalPumpHeadFt,
    totalSystemVolumeGal,
    maxFlowGpm,
    warnings,
  }
}

// =========================================== 
// HELPER FUNCTIONS
// =========================================== 

/**
 * Quick estimate of pipe size for a given flow rate
 * Uses rule of thumb: 4-8 fps velocity for hydronic systems
 * @returns Suggested nominal pipe size
 */
export function suggestPipeSize(flowGpm: number, targetVelocityFps: number = 6): string {
  // v = 0.4085 × Q / d²
  // d² = 0.4085 × Q / v
  // d = √(0.4085 × Q / v)
  const targetDiameter = Math.sqrt((0.4085 * flowGpm) / targetVelocityFps)
  
  // Common sizes in ascending order
  const commonSizes = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12]
  
  // Find smallest size that meets target
  for (const size of commonSizes) {
    if (size >= targetDiameter) {
      if (size < 1) return `${size * 4}/4` // Format as fraction for small sizes
      return size.toString()
    }
  }
  
  return '12' // Max common size
}

/**
 * Calculate GPM from tonnage (chilled water)
 * Standard: 2.4 GPM/ton at 10°F ΔT
 */
export function tonnageToGpm(tons: number, deltaT: number = 10): number {
  // Q = (tons × 12000) / (500 × ΔT)
  // At ΔT=10: Q = tons × 2.4
  return (tons * 12000) / (500 * deltaT)
}

/**
 * Calculate GPM from MBH (hot water)
 * Standard: 1 GPM per 10 MBH at 20°F ΔT
 */
export function mbhToGpm(mbh: number, deltaT: number = 20): number {
  // Q = MBH × 1000 / (500 × ΔT)
  return (mbh * 1000) / (500 * deltaT)
}

/**
 * Convert head (ft) to pressure (psi)
 */
export function headToPsi(headFt: number, specificGravity: number = 1): number {
  return (headFt * specificGravity) / 2.31
}

/**
 * Convert pressure (psi) to head (ft)
 */
export function psiToHead(psi: number, specificGravity: number = 1): number {
  return (psi * 2.31) / specificGravity
}

/**
 * Calculate pump BHP
 * BHP = (GPM × Head × SG) / (3960 × Efficiency)
 */
export function calculatePumpBhp(
  flowGpm: number,
  headFt: number,
  specificGravity: number = 1,
  efficiency: number = 0.70
): number {
  return (flowGpm * headFt * specificGravity) / (3960 * efficiency)
}
