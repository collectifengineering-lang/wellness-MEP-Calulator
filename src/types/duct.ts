// =========================================== 
// DUCTWORK PRESSURE DROP CALCULATOR TYPES
// =========================================== 

export type DuctSystemType = 'supply' | 'return' | 'exhaust' | 'outside_air'
export type DuctShape = 'rectangular' | 'round' | 'oval'
export type DuctMaterial = 'galvanized' | 'aluminum' | 'stainless' | 'fiberglass' | 'flex'
export type DuctLiner = 'none' | '0.75' | '1.0'
export type DuctSectionType = 'straight' | 'flex' | 'equipment'
export type FilterCondition = 'clean' | 'dirty'

// =========================================== 
// DUCT SYSTEM
// =========================================== 
export interface DuctSystem {
  id: string
  projectId: string | null
  personalCalcId: string | null
  name: string
  systemType: DuctSystemType
  totalCfm: number
  altitudeFt: number
  temperatureF: number
  safetyFactor: number // 0.15 - 0.50
  maxVelocityFpm?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// =========================================== 
// DUCT SECTION
// =========================================== 
export interface DuctSection {
  id: string
  systemId: string
  name: string
  sectionType: DuctSectionType
  cfm: number
  
  // Shape & Dimensions
  shape: DuctShape
  widthIn: number // for rectangular/oval
  heightIn: number // for rectangular
  diameterIn: number // for round
  
  // Properties
  lengthFt: number
  material: DuctMaterial
  liner: DuctLiner
  
  // Equipment-specific
  equipmentType?: string
  fixedPressureDrop?: number // in. WC
  filterMerv?: number
  filterCondition?: FilterCondition
  coilRows?: number
  
  sortOrder: number
  
  // Calculated values (not stored)
  velocityFpm?: number
  pressureDropInWc?: number
  
  // Fittings
  fittings: DuctFitting[]
  createdAt: Date
}

// =========================================== 
// DUCT FITTING
// =========================================== 
export interface DuctFitting {
  id: string
  sectionId: string
  fittingType: string // references library ID
  fittingCategory: DuctFittingCategory
  quantity: number
  
  // Override values
  cCoefficientOverride?: number
  fixedDpOverride?: number // in. WC
  
  // Fitting-specific
  elbowRadiusRatio?: number // R/W ratio
  hasTurningVanes?: boolean
  damperPositionPercent?: number // 0-100%
  
  notes?: string
  createdAt: Date
}

// =========================================== 
// FITTING LIBRARY TYPES
// =========================================== 
export type DuctFittingCategory = 
  | 'elbow'
  | 'transition'
  | 'tee'
  | 'wye'
  | 'damper'
  | 'terminal'
  | 'equipment'

export type DuctFittingMethod = 'c_coefficient' | 'fixed_dp'

export interface DuctFittingData {
  id: string
  displayName: string
  category: DuctFittingCategory
  method: DuctFittingMethod
  
  // For C-coefficient method
  cCoefficient?: number
  cCoefficientRange?: { min: number; max: number }
  cCoefficientByRatio?: Record<string, number> // For elbows by R/W ratio
  
  // For fixed dP method
  defaultDp?: number // in. WC
  
  // UI
  description?: string
  svgPath?: string // Path to SVG icon
  imageUrl?: string
  
  // Fitting-specific options
  hasTurningVanesOption?: boolean
  hasRadiusRatioOption?: boolean
  hasDamperPositionOption?: boolean
  
  notes?: string
}

// =========================================== 
// AIR PROPERTIES
// =========================================== 
export interface AirProperties {
  densityLbFt3: number
  viscosityLbFtS: number
  specificHeatBtuLbF: number
}

// =========================================== 
// CALCULATION RESULTS
// =========================================== 
export interface DuctSectionCalculation {
  sectionId: string
  sectionName: string
  sectionType: DuctSectionType
  cfm: number
  
  // Dimensions
  shape: DuctShape
  nominalWidth?: number
  nominalHeight?: number
  nominalDiameter?: number
  effectiveWidth?: number
  effectiveHeight?: number
  effectiveDiameter?: number
  hydraulicDiameterIn: number
  areaFt2: number
  
  // Flow properties
  velocityFpm: number
  velocityPressureInWc: number
  reynoldsNumber: number
  frictionFactor: number
  
  // Pressure drops
  straightDuctLossInWc: number
  fittingsLossInWc: number
  totalSectionLossInWc: number
  
  // Warnings
  warnings: string[]
}

export interface DuctCalculationResult {
  // Air properties
  altitudeFt: number
  temperatureF: number
  airProperties: AirProperties
  
  // Section results
  sections: DuctSectionCalculation[]
  
  // Totals
  totalStraightDuctLoss: number
  totalFittingsLoss: number
  subtotalLoss: number
  safetyFactorPercent: number
  safetyFactorInWc: number
  totalSystemLoss: number
  
  // System info
  maxVelocityFpm: number
  totalCfm: number
  
  // Warnings
  warnings: string[]
}

// =========================================== 
// DUCT MATERIAL DATA
// =========================================== 
export interface DuctMaterialData {
  id: DuctMaterial
  displayName: string
  roughnessFt: number
  description?: string
  maxVelocityFpm?: number // Recommended max velocity
  notes?: string
}
