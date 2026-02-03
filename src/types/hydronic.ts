// =========================================== 
// HYDRONIC PUMP CALCULATOR TYPES
// =========================================== 

export type SystemType = 'closed' | 'open'
export type FluidType = 'water' | 'propylene_glycol' | 'ethylene_glycol'

export type PipeMaterial = 
  | 'copper_type_l'
  | 'copper_type_m'
  | 'steel_sch40'
  | 'steel_sch80'
  | 'pvc_sch40'
  | 'pvc_sch80'
  | 'pex'
  | 'hdpe'
  | 'ppr'

export interface HydronicSystem {
  id: string
  projectId: string | null
  personalCalcId: string | null // for standalone personal calculations
  name: string
  systemType: SystemType
  fluidType: FluidType
  glycolConcentration: number // 0-60%
  fluidTempF: number
  staticHeadFt: number // for open systems
  safetyFactor: number // 0-0.5 (0-50%)
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Personal Calculation workspace
export interface PersonalCalculation {
  id: string
  userId: string
  name: string
  calcType: 'hydronic' | 'pool_dehum' | 'duct' | 'psychrometric'
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface HydronicPipeSection {
  id: string
  systemId: string
  name: string
  flowGpm: number
  pipeMaterial: PipeMaterial
  pipeSizeNominal: string // e.g., '3/4', '1', '1-1/4', '2'
  lengthFt: number
  sortOrder: number
  // Calculated values
  velocityFps?: number
  reynoldsNumber?: number
  frictionFactor?: number
  headLossFt?: number
  // Fittings
  fittings: HydronicFitting[]
  createdAt: Date
}

export interface HydronicFitting {
  id: string
  sectionId: string
  fittingType: string // from fittings library
  quantity: number
  cvOverride?: number // optional manual Cv
  dpOverrideFt?: number // optional manual dP for equipment
  isDefaultCv?: boolean // true if Cv was auto-populated from table (show orange warning)
  createdAt: Date
}

// Pipe dimension data
export interface PipeDimension {
  nominalSize: string
  outerDiameterIn: number
  innerDiameterIn: number
  wallThicknessIn: number
  areaIn2: number
  volumeGalPerFt: number
}

export interface PipeMaterialData {
  id: PipeMaterial
  displayName: string
  roughnessFt: number
  dimensions: PipeDimension[]
}

// Fitting data
export type FittingMethod = 'l_over_d' | 'cv' | 'manual_dp'

export interface FittingData {
  id: string
  displayName: string
  category: 'fitting' | 'valve' | 'device'
  method: FittingMethod
  lOverD?: number // L/D ratio for fittings/valves
  defaultCv?: number // default Cv (size-dependent)
  cvBySizeTable?: Record<string, number> // Cv by nominal pipe size
  requiresCvInput?: boolean // user must enter Cv
  requiresDpInput?: boolean // user must enter dP (for equipment)
  notes?: string
}

// Fluid properties
export interface FluidProperties {
  densityLbFt3: number
  viscosityCp: number // centipoise
  specificGravity: number
  specificHeatBtuLbF: number
}

// Calculation results
export interface SectionCalculation {
  sectionId: string
  sectionName: string
  flowGpm: number
  pipeMaterial: string
  pipeSize: string
  lengthFt: number
  innerDiameterIn: number
  velocityFps: number
  reynoldsNumber: number
  frictionFactor: number
  pipeFrictionLossFt: number
  fittingsLossFt: number
  totalSectionLossFt: number
  volumeGal: number
  warnings: string[]
}

export interface HydronicCalculationResult {
  // Fluid
  fluidType: FluidType
  fluidTemp: number
  glycolConcentration: number
  fluidProperties: FluidProperties
  
  // Section results
  sections: SectionCalculation[]
  
  // Totals
  totalPipeFrictionFt: number
  totalFittingsLossFt: number
  subtotalFrictionFt: number
  staticHeadFt: number
  calculatedHeadFt: number
  safetyFactorPercent: number
  safetyFactorFt: number
  totalPumpHeadFt: number
  totalSystemVolumeGal: number
  maxFlowGpm: number
  
  // Warnings
  warnings: string[]
}
