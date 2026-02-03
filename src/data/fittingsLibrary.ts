// =========================================== 
// FITTINGS AND DEVICES LIBRARY
// Comprehensive list for hydronic pressure drop calculations
// =========================================== 

import type { FittingData } from '../types/hydronic'

// =========================================== 
// PIPE FITTINGS (L/D Method)
// L/D = Equivalent Length / Diameter ratio
// Equivalent Length (ft) = L/D × (ID in inches / 12)
// =========================================== 
export const PIPE_FITTINGS: FittingData[] = [
  // Elbows
  {
    id: 'elbow_90_standard',
    displayName: '90° Elbow (Standard)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 30,
    notes: 'Standard radius (r/d = 1)',
  },
  {
    id: 'elbow_90_long_radius',
    displayName: '90° Elbow (Long Radius)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 20,
    notes: 'Long radius (r/d = 1.5)',
  },
  {
    id: 'elbow_90_short_radius',
    displayName: '90° Elbow (Short Radius)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 50,
    notes: 'Short radius (r/d = 0.5)',
  },
  {
    id: 'elbow_45',
    displayName: '45° Elbow',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 16,
  },
  {
    id: 'elbow_90_threaded',
    displayName: '90° Elbow (Threaded)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 60,
    notes: 'Threaded fitting',
  },
  {
    id: 'elbow_45_threaded',
    displayName: '45° Elbow (Threaded)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 26,
    notes: 'Threaded fitting',
  },
  
  // Tees
  {
    id: 'tee_straight_through',
    displayName: 'Tee (Straight Through)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 20,
    notes: 'Flow through run',
  },
  {
    id: 'tee_branch_flow',
    displayName: 'Tee (Branch Flow)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 60,
    notes: 'Flow into branch',
  },
  {
    id: 'tee_branch_converging',
    displayName: 'Tee (Converging Flow)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 60,
    notes: 'Branch converging into run',
  },
  {
    id: 'tee_threaded_straight',
    displayName: 'Tee Threaded (Straight)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 30,
  },
  {
    id: 'tee_threaded_branch',
    displayName: 'Tee Threaded (Branch)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 90,
  },
  
  // Reducers & Transitions
  {
    id: 'reducer_concentric',
    displayName: 'Reducer (Concentric)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 10,
    notes: 'Gradual transition',
  },
  {
    id: 'reducer_eccentric',
    displayName: 'Reducer (Eccentric)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 15,
  },
  {
    id: 'enlarger_sudden',
    displayName: 'Sudden Enlargement',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 30,
  },
  {
    id: 'contraction_sudden',
    displayName: 'Sudden Contraction',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 20,
  },
  
  // Unions & Couplings
  {
    id: 'union',
    displayName: 'Union',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 6,
  },
  {
    id: 'coupling',
    displayName: 'Coupling',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 2,
  },
  
  // Flanges & Connections
  {
    id: 'flange_weld_neck',
    displayName: 'Flange (Weld Neck)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 4,
  },
  {
    id: 'flange_slip_on',
    displayName: 'Flange (Slip-On)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 6,
  },
  
  // Pipe Entry/Exit
  {
    id: 'pipe_entrance_sharp',
    displayName: 'Pipe Entrance (Sharp)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 50,
  },
  {
    id: 'pipe_entrance_rounded',
    displayName: 'Pipe Entrance (Rounded)',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 20,
  },
  {
    id: 'pipe_exit',
    displayName: 'Pipe Exit',
    category: 'fitting',
    method: 'l_over_d',
    lOverD: 30,
  },
]

// =========================================== 
// VALVES (L/D Method)
// =========================================== 
export const VALVES: FittingData[] = [
  // Gate Valves
  {
    id: 'gate_valve_full_open',
    displayName: 'Gate Valve (Full Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 8,
  },
  {
    id: 'gate_valve_3_4_open',
    displayName: 'Gate Valve (3/4 Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 35,
  },
  {
    id: 'gate_valve_1_2_open',
    displayName: 'Gate Valve (1/2 Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 160,
  },
  
  // Globe Valves
  {
    id: 'globe_valve_full_open',
    displayName: 'Globe Valve (Full Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 340,
    notes: 'High resistance - typical control valve',
  },
  {
    id: 'globe_valve_3_4_open',
    displayName: 'Globe Valve (3/4 Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 400,
  },
  {
    id: 'globe_valve_angle',
    displayName: 'Globe Valve (Angle Pattern)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 170,
  },
  
  // Ball Valves
  {
    id: 'ball_valve_full_open',
    displayName: 'Ball Valve (Full Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 3,
    notes: 'Very low resistance when open',
  },
  {
    id: 'ball_valve_reduced_port',
    displayName: 'Ball Valve (Reduced Port)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 10,
  },
  
  // Butterfly Valves
  {
    id: 'butterfly_valve_full_open',
    displayName: 'Butterfly Valve (Full Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 45,
  },
  {
    id: 'butterfly_valve_3_4_open',
    displayName: 'Butterfly Valve (3/4 Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 100,
  },
  
  // Check Valves
  {
    id: 'check_valve_swing',
    displayName: 'Check Valve (Swing)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 100,
    notes: 'Horizontal installation',
  },
  {
    id: 'check_valve_spring',
    displayName: 'Check Valve (Spring/Lift)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 55,
    notes: 'Can be installed in any orientation',
  },
  {
    id: 'check_valve_wafer',
    displayName: 'Check Valve (Wafer/Dual Plate)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 40,
  },
  {
    id: 'check_valve_ball',
    displayName: 'Check Valve (Ball)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 150,
  },
  
  // Plug Valves
  {
    id: 'plug_valve_open',
    displayName: 'Plug Valve (Open)',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 18,
  },
  
  // Foot Valves
  {
    id: 'foot_valve_strainer',
    displayName: 'Foot Valve with Strainer',
    category: 'valve',
    method: 'l_over_d',
    lOverD: 420,
    notes: 'For pump suction',
  },
]

// =========================================== 
// HYDRONIC DEVICES (Cv or Manual dP)
// Pressure drop: dP (psi) = (GPM / Cv)² × SG
// dP (ft WC) = dP (psi) × 2.31
// =========================================== 
export const HYDRONIC_DEVICES: FittingData[] = [
  // Air Separators
  {
    id: 'air_separator_inline',
    displayName: 'Air Separator (Inline)',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '1': 25,
      '1-1/4': 40,
      '1-1/2': 55,
      '2': 95,
      '2-1/2': 150,
      '3': 220,
      '4': 400,
      '6': 900,
      '8': 1600,
    },
    notes: 'Spirovent, Caleffi, or similar',
  },
  {
    id: 'air_separator_tangential',
    displayName: 'Air Separator (Tangential)',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '2': 120,
      '3': 280,
      '4': 500,
      '6': 1100,
    },
    notes: 'Larger centrifugal type',
  },
  
  // Strainers
  {
    id: 'strainer_y_type',
    displayName: 'Y-Strainer',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '1/2': 6,
      '3/4': 10,
      '1': 16,
      '1-1/4': 26,
      '1-1/2': 38,
      '2': 65,
      '2-1/2': 100,
      '3': 150,
      '4': 275,
      '6': 600,
      '8': 1100,
    },
    notes: 'Clean strainer - add 50% for dirty',
  },
  {
    id: 'strainer_basket',
    displayName: 'Basket Strainer',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '1': 12,
      '1-1/2': 28,
      '2': 50,
      '3': 115,
      '4': 200,
      '6': 450,
      '8': 800,
    },
    notes: 'Larger capacity for debris',
  },
  {
    id: 'strainer_duplex',
    displayName: 'Duplex Strainer',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '2': 40,
      '3': 90,
      '4': 160,
      '6': 360,
      '8': 640,
    },
    notes: 'Continuous operation type',
  },
  
  // Balance Valves
  {
    id: 'balance_valve',
    displayName: 'Balance Valve (Full Open)',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '1/2': 3.2,
      '3/4': 5.5,
      '1': 9,
      '1-1/4': 16,
      '1-1/2': 25,
      '2': 45,
      '2-1/2': 70,
      '3': 110,
      '4': 200,
      '6': 450,
    },
    notes: 'Circuit setter, Flow setter',
  },
  
  // Control Valves (user must enter Cv)
  {
    id: 'control_valve_2way',
    displayName: 'Control Valve (2-Way)',
    category: 'device',
    method: 'cv',
    requiresCvInput: true,
    notes: 'Enter Cv from valve schedule',
  },
  {
    id: 'control_valve_3way',
    displayName: 'Control Valve (3-Way)',
    category: 'device',
    method: 'cv',
    requiresCvInput: true,
    notes: 'Enter Cv from valve schedule - use mixing port Cv',
  },
  {
    id: 'control_valve_pressure_independent',
    displayName: 'PICV (Pressure Independent)',
    category: 'device',
    method: 'cv',
    requiresCvInput: true,
    notes: 'Belimo, Danfoss - enter Cv from schedule',
  },
  
  // Flow Measurement
  {
    id: 'flow_meter_turbine',
    displayName: 'Flow Meter (Turbine)',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '1': 18,
      '1-1/2': 40,
      '2': 70,
      '3': 160,
      '4': 280,
    },
  },
  {
    id: 'flow_meter_ultrasonic',
    displayName: 'Flow Meter (Ultrasonic Inline)',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '2': 100,
      '3': 220,
      '4': 400,
      '6': 900,
    },
    notes: 'Minimal pressure drop',
  },
  
  // Heat Exchangers / Coils (manual dP)
  {
    id: 'coil_ahu',
    displayName: 'AHU Coil',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP from coil schedule (typically 5-15 ft)',
  },
  {
    id: 'coil_fcu',
    displayName: 'FCU/Unit Heater Coil',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP from equipment data (typically 3-8 ft)',
  },
  {
    id: 'heat_exchanger_plate',
    displayName: 'Plate Heat Exchanger',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP from HX selection',
  },
  {
    id: 'heat_exchanger_shell_tube',
    displayName: 'Shell & Tube Heat Exchanger',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP from HX selection',
  },
  
  // Central Equipment (manual dP)
  {
    id: 'chiller_evaporator',
    displayName: 'Chiller Evaporator',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP from chiller schedule (typically 10-25 ft)',
  },
  {
    id: 'chiller_condenser',
    displayName: 'Chiller Condenser',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP from chiller schedule',
  },
  {
    id: 'boiler',
    displayName: 'Boiler',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP from boiler schedule (typically 3-10 ft)',
  },
  {
    id: 'cooling_tower',
    displayName: 'Cooling Tower',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP for fill/spray (typically 5-15 ft)',
  },
  
  // Pumps & Headers
  {
    id: 'pump_suction_diffuser',
    displayName: 'Pump Suction Diffuser',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '2': 35,
      '3': 80,
      '4': 140,
      '6': 320,
      '8': 560,
    },
    notes: 'Bell & Gossett style',
  },
  {
    id: 'triple_duty_valve',
    displayName: 'Triple Duty Valve',
    category: 'device',
    method: 'cv',
    cvBySizeTable: {
      '2': 25,
      '2-1/2': 45,
      '3': 70,
      '4': 125,
      '6': 280,
      '8': 500,
    },
    notes: 'Balance + check + shutoff',
  },
  
  // Expansion & Pressure
  {
    id: 'expansion_tank_connection',
    displayName: 'Expansion Tank Connection',
    category: 'device',
    method: 'l_over_d',
    lOverD: 10,
    notes: 'Minimal when properly sized',
  },
  {
    id: 'prv_pressure_reducing',
    displayName: 'Pressure Reducing Valve',
    category: 'device',
    method: 'cv',
    requiresCvInput: true,
    notes: 'Enter Cv from valve data',
  },
  {
    id: 'pressure_relief_valve',
    displayName: 'Pressure Relief Valve',
    category: 'device',
    method: 'l_over_d',
    lOverD: 0, // No flow in normal operation
    notes: 'No pressure drop in normal operation',
  },
  
  // Miscellaneous
  {
    id: 'flexible_connector',
    displayName: 'Flexible Connector',
    category: 'device',
    method: 'l_over_d',
    lOverD: 20,
    notes: 'Vibration isolator',
  },
  {
    id: 'expansion_loop',
    displayName: 'Expansion Loop',
    category: 'device',
    method: 'l_over_d',
    lOverD: 100,
    notes: 'Per loop - includes elbows',
  },
  {
    id: 'btu_meter',
    displayName: 'BTU Meter Assembly',
    category: 'device',
    method: 'manual_dp',
    requiresDpInput: true,
    notes: 'Enter dP from meter spec (typically 2-5 ft)',
  },
]

// =========================================== 
// COMBINED LIST
// =========================================== 
export const ALL_FITTINGS: FittingData[] = [
  ...PIPE_FITTINGS,
  ...VALVES,
  ...HYDRONIC_DEVICES,
]

// =========================================== 
// HELPER FUNCTIONS
// =========================================== 

export function getFitting(id: string): FittingData | undefined {
  return ALL_FITTINGS.find(f => f.id === id)
}

export function getFittingsByCategory(category: 'fitting' | 'valve' | 'device'): FittingData[] {
  return ALL_FITTINGS.filter(f => f.category === category)
}

export function getFittingCv(fitting: FittingData, pipeSize: string): number | undefined {
  if (fitting.cvBySizeTable && pipeSize in fitting.cvBySizeTable) {
    return fitting.cvBySizeTable[pipeSize]
  }
  return fitting.defaultCv
}

/**
 * Calculate equivalent length for L/D type fittings
 * @param lOverD - L/D ratio
 * @param innerDiameterIn - Pipe inner diameter in inches
 * @returns Equivalent length in feet
 */
export function calculateEquivalentLength(lOverD: number, innerDiameterIn: number): number {
  return (lOverD * innerDiameterIn) / 12
}

/**
 * Calculate pressure drop from Cv
 * @param flowGpm - Flow rate in GPM
 * @param cv - Flow coefficient
 * @param specificGravity - Fluid specific gravity (1.0 for water)
 * @returns Pressure drop in feet of water column
 */
export function calculateCvPressureDrop(
  flowGpm: number,
  cv: number,
  specificGravity: number = 1.0
): number {
  if (cv <= 0) return 0
  // dP (psi) = (GPM / Cv)² × SG
  const dpPsi = Math.pow(flowGpm / cv, 2) * specificGravity
  // Convert to ft WC: 1 psi = 2.31 ft WC
  return dpPsi * 2.31
}

// Display groupings for UI
export const FITTING_CATEGORIES = [
  { id: 'fitting', displayName: 'Pipe Fittings', items: PIPE_FITTINGS },
  { id: 'valve', displayName: 'Valves', items: VALVES },
  { id: 'device', displayName: 'Hydronic Devices', items: HYDRONIC_DEVICES },
]
