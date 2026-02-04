// =========================================== 
// PSYCHROMETRIC CALCULATOR TYPES
// =========================================== 

// =========================================== 
// UNIT TYPES
// =========================================== 
export type TempUnit = 'F' | 'C'
export type HumidityUnit = 'grains' | 'lb' // grains/lb or lb/lb

// =========================================== 
// INPUT MODES
// Which two properties were specified
// =========================================== 
export type PsychInputMode = 
  | 'db_wb'   // Dry bulb + Wet bulb
  | 'db_rh'   // Dry bulb + Relative humidity
  | 'db_dp'   // Dry bulb + Dew point
  | 'db_w'    // Dry bulb + Humidity ratio

// =========================================== 
// POINT TYPES
// =========================================== 
export type PointType = 'state' | 'entering' | 'leaving' | 'mixed'

// =========================================== 
// PROCESS TYPES
// =========================================== 
export type ProcessType = 
  | 'sensible_heating'
  | 'sensible_cooling'
  | 'evaporative_cooling'
  | 'steam_humidification'
  | 'dx_dehumidification'
  | 'desiccant_dehumidification'
  | 'mixing'
  | 'oa_ra_mixing'  // Outdoor Air + Return Air mixing (usually first process)
  | 'space_load'    // Space heating/cooling load process
  | 'custom'

// Equipment types for HVAC system sizing integration
export type EquipmentType = 
  | 'cooling_coil'
  | 'heating_coil'
  | 'humidifier'
  | 'dehumidifier'
  | 'energy_recovery'
  | 'other'

// =========================================== 
// PSYCHROMETRIC SYSTEM
// Main container for a calculation session
// =========================================== 
export interface PsychrometricSystem {
  id: string
  projectId: string | null
  personalCalcId: string | null
  userId?: string
  name: string
  
  // System airflow - total CFM for the system
  systemCfm: number
  
  // Atmospheric conditions
  altitudeFt: number
  barometricPressurePsia?: number // Calculated from altitude if not specified
  
  // Unit preferences
  tempUnit: TempUnit
  humidityUnit: HumidityUnit
  
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// =========================================== 
// STATE POINT
// A single air state on the psychrometric chart
// =========================================== 
export interface PsychrometricPoint {
  id: string
  systemId: string
  
  // Identification
  pointLabel: string // 'A', 'B', 'Mixed', 'Entering', 'Leaving'
  pointType: PointType
  
  // Input mode
  inputMode: PsychInputMode
  
  // State properties (always stored in base units)
  dryBulbF: number | null
  wetBulbF: number | null
  dewPointF: number | null
  relativeHumidity: number | null // 0-100%
  humidityRatioGrains: number | null // grains/lb dry air
  enthalpyBtuLb: number | null // Btu/lb dry air
  specificVolumeFt3Lb: number | null // ft³/lb dry air
  
  // For calculations
  cfm: number | null
  
  // Chart position (normalized 0-1)
  chartX?: number
  chartY?: number
  
  sortOrder: number
  createdAt: Date
  updatedAt?: Date
}

// =========================================== 
// HVAC PROCESS
// A transformation between two state points
// =========================================== 
export interface PsychrometricProcess {
  id: string
  systemId: string
  
  name: string
  processType: ProcessType
  
  // Points for standard processes
  startPointId: string | null
  endPointId: string | null
  
  // Points for mixing processes (legacy)
  pointAId?: string | null
  pointBId?: string | null
  mixedPointId?: string | null
  
  // OA/RA Mixing specific fields
  oaPointId?: string | null  // Outdoor air point
  raPointId?: string | null  // Return air point
  oaCfm?: number             // Outdoor air CFM
  raCfm?: number             // Return air CFM
  
  // Flow rate (total for this process)
  cfm: number
  
  // Calculated loads
  totalLoadBtuh?: number
  sensibleLoadBtuh?: number
  latentLoadBtuh?: number
  totalLoadTons?: number
  moistureLbHr?: number
  
  sortOrder: number
  
  // Labels and descriptions for exports
  label?: string       // Short label (e.g., "Preheat Coil", "Cooling Coil")
  description?: string // Longer description (e.g., "Steam preheat for outside air")
  notes?: string       // Additional notes
  
  // Equipment identification for HVAC system sizing
  equipmentType?: EquipmentType | null
  
  createdAt: Date
  updatedAt?: Date
}

// =========================================== 
// CALCULATION RESULTS
// =========================================== 
export interface StatePointResult {
  dryBulbF: number
  wetBulbF: number
  dewPointF: number
  relativeHumidity: number // 0-100
  humidityRatioGrains: number // grains/lb
  humidityRatioLb: number // lb/lb
  enthalpyBtuLb: number
  specificVolumeFt3Lb: number
  vaporPressurePsia: number
  saturationPressurePsia: number
}

export interface MixingResult {
  mixedPoint: StatePointResult
  totalCfm: number
  mixRatioA: number // fraction of stream A (0-1)
  mixRatioB: number // fraction of stream B (0-1)
}

export interface ProcessResult {
  totalLoadBtuh: number
  sensibleLoadBtuh: number
  latentLoadBtuh: number
  totalLoadTons: number
  moistureLbHr: number
  massFlowLbHr: number
  sensibleHeatRatio: number // SHR = Qs / Qt
}

// =========================================== 
// CHART TYPES
// =========================================== 
export interface ChartPoint {
  x: number // normalized 0-1
  y: number // normalized 0-1
  label: string
  state: StatePointResult
}

export interface ChartLine {
  type: 'constant_db' | 'constant_wb' | 'constant_rh' | 'constant_w' | 'constant_h' | 'saturation'
  value: number
  points: { x: number; y: number }[]
}

export interface ChartConfig {
  // Temperature range (dry bulb)
  minTempF: number
  maxTempF: number
  // Humidity ratio range
  minWGrains: number
  maxWGrains: number
  // Grid intervals
  dbInterval: number // degrees F
  wInterval: number // grains/lb
  rhIntervals: number[] // [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
}

// =========================================== 
// UI TYPES
// =========================================== 
export type CalculationMode = 'single' | 'mixing' | 'process'

export interface SinglePointInputs {
  inputMode: PsychInputMode
  dryBulbF: number
  wetBulbF?: number
  relativeHumidity?: number
  dewPointF?: number
  humidityRatioGrains?: number
}

export interface MixingInputs {
  streamA: {
    dryBulbF: number
    wetBulbF: number
    cfm: number
  }
  streamB: {
    dryBulbF: number
    wetBulbF: number
    cfm: number
  }
}

export interface ProcessInputs {
  entering: {
    dryBulbF: number
    wetBulbF: number
  }
  leaving: {
    dryBulbF: number
    wetBulbF: number
  }
  cfm: number
  processType: ProcessType
}

// =========================================== 
// ATMOSPHERIC DATA
// =========================================== 
export interface AtmosphericConditions {
  altitudeFt: number
  barometricPressurePsia: number
  barometricPressureInHg: number
  airDensityLbFt3: number
}

// =========================================== 
// EXPORT TYPES
// =========================================== 
export interface PsychrometricExportData {
  system: PsychrometricSystem
  points: PsychrometricPoint[]
  processes: PsychrometricProcess[]
  atmosphericConditions: AtmosphericConditions
}
