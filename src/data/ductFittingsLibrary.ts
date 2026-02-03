// =========================================== 
// DUCT FITTINGS LIBRARY
// SMACNA Loss Coefficients and Visual Data
// Based on SMACNA HVAC Duct Fitting Database
// =========================================== 

import type { DuctFittingData, DuctFittingCategory } from '../types/duct'

// =========================================== 
// FITTING CATEGORIES
// =========================================== 
export const DUCT_FITTING_CATEGORIES: { id: DuctFittingCategory; name: string; icon: string }[] = [
  { id: 'elbow', name: 'Elbows', icon: '↪️' },
  { id: 'transition', name: 'Transitions', icon: '◇' },
  { id: 'tee', name: 'Tees & Branches', icon: '⊥' },
  { id: 'wye', name: 'Wyes', icon: '⋎' },
  { id: 'damper', name: 'Dampers', icon: '▬' },
  { id: 'terminal', name: 'Terminals', icon: '▤' },
  { id: 'equipment', name: 'Equipment', icon: '⚙️' },
]

// =========================================== 
// ELBOWS
// =========================================== 
export const DUCT_ELBOWS: DuctFittingData[] = [
  // Rectangular Elbows - Radius
  {
    id: 'elbow_rect_radius_0.5',
    displayName: '90° Rectangular Elbow (R/W = 0.5)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.57,
    hasRadiusRatioOption: true,
    description: 'Rectangular elbow with inner radius, tight radius',
    svgPath: 'M 10 50 L 10 20 Q 10 10 20 10 L 50 10',
    notes: 'R/W = 0.5, no vanes',
  },
  {
    id: 'elbow_rect_radius_1.0',
    displayName: '90° Rectangular Elbow (R/W = 1.0)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.22,
    hasRadiusRatioOption: true,
    description: 'Rectangular elbow with inner radius, standard',
    svgPath: 'M 10 50 L 10 25 Q 10 10 25 10 L 50 10',
    notes: 'R/W = 1.0, no vanes - most common',
  },
  {
    id: 'elbow_rect_radius_1.5',
    displayName: '90° Rectangular Elbow (R/W = 1.5)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.13,
    hasRadiusRatioOption: true,
    description: 'Rectangular elbow with large radius',
    svgPath: 'M 10 50 L 10 30 Q 10 10 30 10 L 50 10',
    notes: 'R/W = 1.5, no vanes - lower loss',
  },
  {
    id: 'elbow_rect_radius_2.0',
    displayName: '90° Rectangular Elbow (R/W = 2.0)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.09,
    hasRadiusRatioOption: true,
    description: 'Rectangular elbow with very large radius',
    svgPath: 'M 10 50 L 10 35 Q 10 10 35 10 L 50 10',
    notes: 'R/W = 2.0, no vanes - lowest loss',
  },
  
  // Mitered Elbows
  {
    id: 'elbow_rect_mitered_no_vanes',
    displayName: '90° Mitered Elbow (No Vanes)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 1.3,
    hasTurningVanesOption: true,
    description: 'Square mitered elbow without turning vanes',
    svgPath: 'M 10 50 L 10 10 L 50 10',
    notes: 'High loss - use with vanes when possible',
  },
  {
    id: 'elbow_rect_mitered_single_vanes',
    displayName: '90° Mitered Elbow (Single Vanes)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.33,
    hasTurningVanesOption: true,
    description: 'Square mitered elbow with single-thickness turning vanes',
    svgPath: 'M 10 50 L 10 10 L 50 10 M 15 35 L 35 15 M 20 40 L 40 20',
    notes: 'Standard turning vanes, 1.5" spacing typical',
  },
  {
    id: 'elbow_rect_mitered_double_vanes',
    displayName: '90° Mitered Elbow (Airfoil Vanes)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.20,
    hasTurningVanesOption: true,
    description: 'Square mitered elbow with double-thickness airfoil vanes',
    svgPath: 'M 10 50 L 10 10 L 50 10 M 15 35 L 35 15 M 20 40 L 40 20 M 25 45 L 45 25',
    notes: 'Lowest loss mitered option',
  },
  
  // 45° Elbows
  {
    id: 'elbow_rect_45_radius',
    displayName: '45° Rectangular Elbow (Radius)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.08,
    description: '45-degree rectangular elbow with radius',
    svgPath: 'M 10 50 L 10 30 Q 10 20 20 15 L 40 5',
    notes: 'Lower loss than 90° elbows',
  },
  {
    id: 'elbow_rect_45_mitered',
    displayName: '45° Rectangular Elbow (Mitered)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.15,
    description: '45-degree mitered rectangular elbow',
    svgPath: 'M 10 50 L 10 25 L 40 5',
    notes: 'Single miter, no vanes needed',
  },
  
  // Round Elbows
  {
    id: 'elbow_round_smooth_90',
    displayName: '90° Round Elbow (Smooth)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.22,
    description: 'Smooth radius round elbow',
    svgPath: 'M 10 50 L 10 25 A 15 15 0 0 1 25 10 L 50 10',
    notes: '5-piece or stamped elbow, R/D = 1.5',
  },
  {
    id: 'elbow_round_3piece_90',
    displayName: '90° Round Elbow (3-Piece)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.42,
    description: '3-piece gored round elbow',
    svgPath: 'M 10 50 L 10 25 L 25 15 L 50 10',
    notes: 'Higher loss than smooth',
  },
  {
    id: 'elbow_round_5piece_90',
    displayName: '90° Round Elbow (5-Piece)',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.32,
    description: '5-piece gored round elbow',
    svgPath: 'M 10 50 L 10 30 L 20 20 L 30 15 L 50 10',
    notes: 'Common construction',
  },
  {
    id: 'elbow_round_45',
    displayName: '45° Round Elbow',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.10,
    description: '45-degree round elbow',
    svgPath: 'M 10 50 L 10 30 A 10 10 0 0 1 20 22 L 40 10',
    notes: 'Lower loss than 90°',
  },
  
  // Flexible Duct Elbows
  {
    id: 'elbow_flex_90',
    displayName: '90° Flex Duct Elbow',
    category: 'elbow',
    method: 'c_coefficient',
    cCoefficient: 0.75,
    description: 'Flexible duct bent 90 degrees',
    svgPath: 'M 10 50 C 10 30 20 20 40 10',
    notes: 'High loss - avoid tight bends in flex',
  },
]

// =========================================== 
// TRANSITIONS
// =========================================== 
export const DUCT_TRANSITIONS: DuctFittingData[] = [
  // Rectangular Transitions
  {
    id: 'trans_rect_converging_30',
    displayName: 'Rectangular Transition (Converging, 30°)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.02,
    description: 'Converging rectangular transition, 30° included angle',
    svgPath: 'M 5 45 L 5 15 L 15 20 L 15 40 Z M 15 30 L 55 30',
    notes: 'Low loss due to gradual change',
  },
  {
    id: 'trans_rect_converging_45',
    displayName: 'Rectangular Transition (Converging, 45°)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.04,
    description: 'Converging rectangular transition, 45° included angle',
    svgPath: 'M 5 45 L 5 15 L 20 22 L 20 38 Z M 20 30 L 55 30',
    notes: 'Standard converging transition',
  },
  {
    id: 'trans_rect_diverging_15',
    displayName: 'Rectangular Transition (Diverging, 15°)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.10,
    description: 'Diverging rectangular transition, 15° included angle',
    svgPath: 'M 5 35 L 5 25 L 20 20 L 20 40 Z M 20 30 L 55 30',
    notes: 'Low loss diverging - optimal angle',
  },
  {
    id: 'trans_rect_diverging_30',
    displayName: 'Rectangular Transition (Diverging, 30°)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.25,
    description: 'Diverging rectangular transition, 30° included angle',
    svgPath: 'M 5 35 L 5 25 L 25 15 L 25 45 Z M 25 30 L 55 30',
    notes: 'Higher loss due to flow separation',
  },
  {
    id: 'trans_rect_diverging_45',
    displayName: 'Rectangular Transition (Diverging, 45°)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.40,
    description: 'Diverging rectangular transition, 45° included angle',
    svgPath: 'M 5 35 L 5 25 L 30 10 L 30 50 Z M 30 30 L 55 30',
    notes: 'High loss - avoid if possible',
  },
  
  // Round Transitions
  {
    id: 'trans_round_converging',
    displayName: 'Round Transition (Converging)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.03,
    description: 'Converging round transition/reducer',
    svgPath: 'M 5 40 L 5 20 L 55 25 L 55 35 Z',
    notes: 'Low loss for round duct',
  },
  {
    id: 'trans_round_diverging',
    displayName: 'Round Transition (Diverging)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.15,
    description: 'Diverging round transition/increaser',
    svgPath: 'M 5 35 L 5 25 L 55 15 L 55 45 Z',
    notes: 'Higher loss than converging',
  },
  
  // Offsets
  {
    id: 'trans_offset_15',
    displayName: 'Offset (15°)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.05,
    description: '15-degree offset transition',
    svgPath: 'M 5 45 L 5 35 L 30 25 L 30 35 L 55 25 L 55 15',
    notes: 'Two transitions at 15°',
  },
  {
    id: 'trans_offset_30',
    displayName: 'Offset (30°)',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.15,
    description: '30-degree offset transition',
    svgPath: 'M 5 45 L 5 35 L 25 20 L 25 30 L 55 15 L 55 5',
    notes: 'Standard offset',
  },
  
  // Round to Rectangular
  {
    id: 'trans_round_to_rect',
    displayName: 'Round to Rectangular Transition',
    category: 'transition',
    method: 'c_coefficient',
    cCoefficient: 0.12,
    description: 'Transition from round to rectangular duct',
    svgPath: 'M 5 35 A 10 10 0 0 1 5 25 L 55 15 L 55 45 Z',
    notes: 'Common at equipment connections',
  },
]

// =========================================== 
// TEES & BRANCHES
// =========================================== 
export const DUCT_TEES: DuctFittingData[] = [
  // Supply Tees (Diverging)
  {
    id: 'tee_supply_straight',
    displayName: 'Supply Tee - Straight Through',
    category: 'tee',
    method: 'c_coefficient',
    cCoefficient: 0.35,
    description: 'Supply tee, main flow straight through',
    svgPath: 'M 5 30 L 55 30 M 30 30 L 30 55',
    notes: 'C value for straight-through flow',
  },
  {
    id: 'tee_supply_branch',
    displayName: 'Supply Tee - Branch',
    category: 'tee',
    method: 'c_coefficient',
    cCoefficient: 1.0,
    description: 'Supply tee, flow into branch',
    svgPath: 'M 5 30 L 55 30 M 30 30 L 30 55',
    notes: 'C value for branch flow',
  },
  {
    id: 'tee_supply_45_branch',
    displayName: 'Supply Tee - 45° Branch',
    category: 'tee',
    method: 'c_coefficient',
    cCoefficient: 0.70,
    description: 'Supply tee with 45-degree branch takeoff',
    svgPath: 'M 5 30 L 55 30 M 30 30 L 50 55',
    notes: 'Lower loss than 90° branch',
  },
  
  // Return Tees (Converging)
  {
    id: 'tee_return_straight',
    displayName: 'Return Tee - Straight Through',
    category: 'tee',
    method: 'c_coefficient',
    cCoefficient: 0.08,
    description: 'Return tee, straight-through flow',
    svgPath: 'M 5 30 L 55 30 M 30 5 L 30 30',
    notes: 'C value for straight-through flow',
  },
  {
    id: 'tee_return_branch',
    displayName: 'Return Tee - Branch',
    category: 'tee',
    method: 'c_coefficient',
    cCoefficient: 0.50,
    description: 'Return tee, flow from branch',
    svgPath: 'M 5 30 L 55 30 M 30 5 L 30 30',
    notes: 'C value for branch flow entering',
  },
  
  // Bullhead Tees
  {
    id: 'tee_bullhead',
    displayName: 'Bullhead Tee',
    category: 'tee',
    method: 'c_coefficient',
    cCoefficient: 1.8,
    description: 'Bullhead tee - flow splits both ways',
    svgPath: 'M 30 5 L 30 30 L 5 30 M 30 30 L 55 30',
    notes: 'High loss - avoid if possible',
  },
]

// =========================================== 
// WYES
// =========================================== 
export const DUCT_WYES: DuctFittingData[] = [
  {
    id: 'wye_45_symmetric',
    displayName: '45° Wye (Symmetric)',
    category: 'wye',
    method: 'c_coefficient',
    cCoefficient: 0.30,
    description: 'Symmetric 45-degree wye fitting',
    svgPath: 'M 5 30 L 30 30 L 50 15 M 30 30 L 50 45',
    notes: 'Lower loss than tees for supply',
  },
  {
    id: 'wye_45_conical',
    displayName: '45° Conical Wye',
    category: 'wye',
    method: 'c_coefficient',
    cCoefficient: 0.25,
    description: '45-degree wye with conical branch',
    svgPath: 'M 5 30 L 30 30 L 50 18 M 30 30 L 50 42',
    notes: 'Reduced loss from conical shape',
  },
  {
    id: 'wye_30_branch',
    displayName: '30° Wye',
    category: 'wye',
    method: 'c_coefficient',
    cCoefficient: 0.20,
    description: '30-degree wye fitting',
    svgPath: 'M 5 30 L 30 30 L 55 25 M 30 30 L 55 40',
    notes: 'Low loss branch angle',
  },
]

// =========================================== 
// DAMPERS
// =========================================== 
export const DUCT_DAMPERS: DuctFittingData[] = [
  {
    id: 'damper_volume_open',
    displayName: 'Volume Damper (Fully Open)',
    category: 'damper',
    method: 'c_coefficient',
    cCoefficient: 0.04,
    hasDamperPositionOption: true,
    description: 'Parallel blade volume damper, fully open',
    svgPath: 'M 5 30 L 55 30 M 20 25 L 20 35 M 30 25 L 30 35 M 40 25 L 40 35',
    notes: 'Minimal loss when open',
  },
  {
    id: 'damper_volume_50',
    displayName: 'Volume Damper (50% Open)',
    category: 'damper',
    method: 'c_coefficient',
    cCoefficient: 2.5,
    hasDamperPositionOption: true,
    description: 'Parallel blade volume damper, 50% open',
    svgPath: 'M 5 30 L 55 30 M 20 22 L 20 38 M 30 22 L 30 38 M 40 22 L 40 38',
    notes: 'Significant pressure drop at 50%',
  },
  {
    id: 'damper_fire',
    displayName: 'Fire Damper (Curtain Type)',
    category: 'damper',
    method: 'c_coefficient',
    cCoefficient: 0.15,
    description: 'Curtain-type fire damper',
    svgPath: 'M 5 30 L 55 30 M 25 15 L 25 45 M 35 15 L 35 45',
    notes: 'UL 555 listed, sleeve mounted',
  },
  {
    id: 'damper_fire_louver',
    displayName: 'Fire Damper (Multi-Blade)',
    category: 'damper',
    method: 'c_coefficient',
    cCoefficient: 0.35,
    description: 'Multi-blade fire damper',
    svgPath: 'M 5 30 L 55 30 M 20 20 L 20 40 M 30 20 L 30 40 M 40 20 L 40 40',
    notes: 'Higher loss than curtain type',
  },
  {
    id: 'damper_smoke',
    displayName: 'Smoke Damper',
    category: 'damper',
    method: 'c_coefficient',
    cCoefficient: 0.20,
    description: 'UL 555S smoke damper',
    svgPath: 'M 5 30 L 55 30 M 25 18 L 25 42 M 35 18 L 35 42',
    notes: 'Leakage Class I or II',
  },
  {
    id: 'damper_combination',
    displayName: 'Combination Fire/Smoke Damper',
    category: 'damper',
    method: 'c_coefficient',
    cCoefficient: 0.40,
    description: 'Combination fire and smoke damper',
    svgPath: 'M 5 30 L 55 30 M 20 15 L 20 45 M 30 15 L 30 45 M 40 15 L 40 45',
    notes: 'UL 555 and 555S listed',
  },
  {
    id: 'damper_backdraft',
    displayName: 'Backdraft Damper',
    category: 'damper',
    method: 'c_coefficient',
    cCoefficient: 0.50,
    description: 'Gravity backdraft damper',
    svgPath: 'M 5 30 L 55 30 M 25 20 L 35 40 M 35 20 L 45 40',
    notes: 'For exhaust applications',
  },
]

// =========================================== 
// TERMINALS
// =========================================== 
export const DUCT_TERMINALS: DuctFittingData[] = [
  {
    id: 'terminal_diffuser_ceiling',
    displayName: 'Ceiling Diffuser (Square)',
    category: 'terminal',
    method: 'fixed_dp',
    defaultDp: 0.10,
    description: 'Square ceiling diffuser, 4-way throw',
    svgPath: 'M 20 10 L 40 10 L 50 20 L 50 40 L 40 50 L 20 50 L 10 40 L 10 20 Z',
    notes: 'Typical pressure drop 0.05-0.15 in. WC - check cut sheet',
  },
  {
    id: 'terminal_diffuser_round',
    displayName: 'Round Ceiling Diffuser',
    category: 'terminal',
    method: 'fixed_dp',
    defaultDp: 0.08,
    description: 'Round cone ceiling diffuser',
    svgPath: 'M 30 10 A 20 20 0 1 1 30 50 A 20 20 0 1 1 30 10 M 30 20 A 10 10 0 1 1 30 40',
    notes: 'Lower pressure drop than square',
  },
  {
    id: 'terminal_diffuser_linear',
    displayName: 'Linear Slot Diffuser',
    category: 'terminal',
    method: 'fixed_dp',
    defaultDp: 0.12,
    description: 'Linear slot diffuser, single slot',
    svgPath: 'M 5 25 L 55 25 L 55 35 L 5 35 Z M 10 28 L 50 28 L 50 32 L 10 32 Z',
    notes: 'Per slot - multiply for multi-slot',
  },
  {
    id: 'terminal_grille_return',
    displayName: 'Return Air Grille',
    category: 'terminal',
    method: 'fixed_dp',
    defaultDp: 0.05,
    description: 'Return air grille, fixed louver',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 15 20 L 45 20 M 15 30 L 45 30 M 15 40 L 45 40',
    notes: 'Typical return grille',
  },
  {
    id: 'terminal_register',
    displayName: 'Supply Register',
    category: 'terminal',
    method: 'fixed_dp',
    defaultDp: 0.08,
    description: 'Adjustable supply register',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 15 18 L 45 22 M 15 28 L 45 32 M 15 38 L 45 42',
    notes: 'With adjustable blades',
  },
  {
    id: 'terminal_louver_intake',
    displayName: 'Outside Air Louver',
    category: 'terminal',
    method: 'fixed_dp',
    defaultDp: 0.15,
    description: 'Drainable outside air intake louver',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 10 20 L 50 15 M 10 30 L 50 25 M 10 40 L 50 35 M 10 50 L 50 45',
    notes: 'Check mfr data - varies with rain resistance',
  },
  {
    id: 'terminal_louver_exhaust',
    displayName: 'Exhaust Louver',
    category: 'terminal',
    method: 'fixed_dp',
    defaultDp: 0.10,
    description: 'Exhaust air louver',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 10 15 L 50 20 M 10 25 L 50 30 M 10 35 L 50 40 M 10 45 L 50 50',
    notes: 'Drainable or non-drainable',
  },
]

// =========================================== 
// EQUIPMENT
// =========================================== 
export const DUCT_EQUIPMENT: DuctFittingData[] = [
  // Coils
  {
    id: 'equip_coil_2row',
    displayName: 'Cooling Coil (2-Row)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.25,
    description: '2-row cooling coil, 10 fpi',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 15 15 L 45 15 L 45 45 L 15 45 Z',
    notes: 'Air side only - check coil schedule',
  },
  {
    id: 'equip_coil_4row',
    displayName: 'Cooling Coil (4-Row)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.45,
    description: '4-row cooling coil, 10 fpi',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 13 13 L 47 13 L 47 47 L 13 47 Z',
    notes: 'Air side only - check coil schedule',
  },
  {
    id: 'equip_coil_6row',
    displayName: 'Cooling Coil (6-Row)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.70,
    description: '6-row cooling coil, 10 fpi',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 12 12 L 48 12 L 48 48 L 12 48 Z',
    notes: 'Air side only - check coil schedule',
  },
  {
    id: 'equip_coil_heating',
    displayName: 'Heating Coil (1-Row)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.15,
    description: '1-row hot water heating coil',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 20 20 L 40 20 L 40 40 L 20 40 Z',
    notes: 'Lower pressure drop than cooling',
  },
  
  // Filters
  {
    id: 'equip_filter_merv8_clean',
    displayName: 'Filter MERV 8 (Clean)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.15,
    description: 'MERV 8 pleated filter, clean',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 20 15 L 20 45 M 30 15 L 30 45 M 40 15 L 40 45',
    notes: 'Initial pressure drop',
  },
  {
    id: 'equip_filter_merv8_dirty',
    displayName: 'Filter MERV 8 (Dirty)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.50,
    description: 'MERV 8 pleated filter, final/dirty',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 18 15 L 18 45 M 26 15 L 26 45 M 34 15 L 34 45 M 42 15 L 42 45',
    notes: 'Design for dirty condition',
  },
  {
    id: 'equip_filter_merv13_clean',
    displayName: 'Filter MERV 13 (Clean)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.30,
    description: 'MERV 13 pleated filter, clean',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 15 15 L 15 45 M 22 15 L 22 45 M 29 15 L 29 45 M 36 15 L 36 45 M 43 15 L 43 45',
    notes: 'Initial pressure drop',
  },
  {
    id: 'equip_filter_merv13_dirty',
    displayName: 'Filter MERV 13 (Dirty)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.80,
    description: 'MERV 13 pleated filter, final/dirty',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 13 15 L 13 45 M 19 15 L 19 45 M 25 15 L 25 45 M 31 15 L 31 45 M 37 15 L 37 45 M 43 15 L 43 45',
    notes: 'Design for dirty condition',
  },
  {
    id: 'equip_filter_merv16_clean',
    displayName: 'Filter MERV 16 (Clean)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.45,
    description: 'MERV 16 bag or box filter, clean',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 15 15 L 45 15 L 45 45 L 15 45 Z M 20 20 L 40 20 L 40 40 L 20 40 Z',
    notes: 'Hospital grade filtration',
  },
  {
    id: 'equip_filter_merv16_dirty',
    displayName: 'Filter MERV 16 (Dirty)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 1.00,
    description: 'MERV 16 bag or box filter, final/dirty',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 13 13 L 47 13 L 47 47 L 13 47 Z M 16 16 L 44 16 L 44 44 L 16 44 Z',
    notes: 'Design for dirty condition',
  },
  
  // Other Equipment
  {
    id: 'equip_vav_box',
    displayName: 'VAV Box',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.50,
    description: 'VAV terminal box',
    svgPath: 'M 5 25 L 20 25 L 20 15 L 45 15 L 45 45 L 20 45 L 20 35 L 5 35 Z',
    notes: 'Varies by manufacturer and size',
  },
  {
    id: 'equip_silencer',
    displayName: 'Sound Attenuator (Silencer)',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.35,
    description: 'Rectangular sound attenuator',
    svgPath: 'M 5 15 L 55 15 L 55 45 L 5 45 Z M 10 20 L 10 40 M 20 20 L 20 40 M 30 20 L 30 40 M 40 20 L 40 40 M 50 20 L 50 40',
    notes: '3-5 ft length typical',
  },
  {
    id: 'equip_mixing_box',
    displayName: 'Mixing Box',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.25,
    description: 'Outside air/return air mixing box',
    svgPath: 'M 5 10 L 25 10 L 25 50 L 5 50 Z M 25 30 L 55 30 M 5 20 L 20 20 M 5 40 L 20 40',
    notes: 'With dampers and mixing section',
  },
  {
    id: 'equip_electric_heater',
    displayName: 'Electric Duct Heater',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.08,
    description: 'In-duct electric resistance heater',
    svgPath: 'M 10 20 L 50 20 L 50 40 L 10 40 Z M 15 25 L 45 25 M 15 30 L 45 30 M 15 35 L 45 35',
    notes: 'Low pressure drop',
  },
  {
    id: 'equip_humidifier',
    displayName: 'Steam Humidifier Manifold',
    category: 'equipment',
    method: 'fixed_dp',
    defaultDp: 0.10,
    description: 'In-duct steam humidifier manifold',
    svgPath: 'M 10 10 L 50 10 L 50 50 L 10 50 Z M 15 30 L 45 30 M 25 20 L 25 40 M 35 20 L 35 40',
    notes: 'Minimal pressure drop',
  },
]

// =========================================== 
// COMBINED FITTING LIBRARY
// =========================================== 
export const ALL_DUCT_FITTINGS: DuctFittingData[] = [
  ...DUCT_ELBOWS,
  ...DUCT_TRANSITIONS,
  ...DUCT_TEES,
  ...DUCT_WYES,
  ...DUCT_DAMPERS,
  ...DUCT_TERMINALS,
  ...DUCT_EQUIPMENT,
]

// =========================================== 
// HELPER FUNCTIONS
// =========================================== 
export function getDuctFitting(id: string): DuctFittingData | undefined {
  return ALL_DUCT_FITTINGS.find(f => f.id === id)
}

export function getDuctFittingsByCategory(category: DuctFittingCategory): DuctFittingData[] {
  return ALL_DUCT_FITTINGS.filter(f => f.category === category)
}

export function getDuctFittingCCoefficient(fitting: DuctFittingData): number {
  return fitting.cCoefficient ?? 0
}
