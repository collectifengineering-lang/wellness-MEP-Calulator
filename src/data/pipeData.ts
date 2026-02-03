// =========================================== 
// PIPE MATERIAL DATA
// Dimensions and roughness for hydronic piping
// =========================================== 

import type { PipeMaterialData, PipeDimension } from '../types/hydronic'

// Copper Type L - Standard hydronic piping
const COPPER_TYPE_L_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '1/2', outerDiameterIn: 0.625, innerDiameterIn: 0.545, wallThicknessIn: 0.040, areaIn2: 0.2333, volumeGalPerFt: 0.0121 },
  { nominalSize: '3/4', outerDiameterIn: 0.875, innerDiameterIn: 0.785, wallThicknessIn: 0.045, areaIn2: 0.4840, volumeGalPerFt: 0.0251 },
  { nominalSize: '1', outerDiameterIn: 1.125, innerDiameterIn: 1.025, wallThicknessIn: 0.050, areaIn2: 0.8254, volumeGalPerFt: 0.0428 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.375, innerDiameterIn: 1.265, wallThicknessIn: 0.055, areaIn2: 1.2566, volumeGalPerFt: 0.0652 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.625, innerDiameterIn: 1.505, wallThicknessIn: 0.060, areaIn2: 1.7793, volumeGalPerFt: 0.0923 },
  { nominalSize: '2', outerDiameterIn: 2.125, innerDiameterIn: 1.985, wallThicknessIn: 0.070, areaIn2: 3.0941, volumeGalPerFt: 0.1605 },
  { nominalSize: '2-1/2', outerDiameterIn: 2.625, innerDiameterIn: 2.465, wallThicknessIn: 0.080, areaIn2: 4.7727, volumeGalPerFt: 0.2476 },
  { nominalSize: '3', outerDiameterIn: 3.125, innerDiameterIn: 2.945, wallThicknessIn: 0.090, areaIn2: 6.8119, volumeGalPerFt: 0.3534 },
  { nominalSize: '4', outerDiameterIn: 4.125, innerDiameterIn: 3.905, wallThicknessIn: 0.110, areaIn2: 11.9771, volumeGalPerFt: 0.6213 },
  { nominalSize: '5', outerDiameterIn: 5.125, innerDiameterIn: 4.875, wallThicknessIn: 0.125, areaIn2: 18.6654, volumeGalPerFt: 0.9683 },
  { nominalSize: '6', outerDiameterIn: 6.125, innerDiameterIn: 5.845, wallThicknessIn: 0.140, areaIn2: 26.8325, volumeGalPerFt: 1.3921 },
]

// Copper Type M - Lighter wall
const COPPER_TYPE_M_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '1/2', outerDiameterIn: 0.625, innerDiameterIn: 0.569, wallThicknessIn: 0.028, areaIn2: 0.2543, volumeGalPerFt: 0.0132 },
  { nominalSize: '3/4', outerDiameterIn: 0.875, innerDiameterIn: 0.811, wallThicknessIn: 0.032, areaIn2: 0.5165, volumeGalPerFt: 0.0268 },
  { nominalSize: '1', outerDiameterIn: 1.125, innerDiameterIn: 1.055, wallThicknessIn: 0.035, areaIn2: 0.8743, volumeGalPerFt: 0.0453 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.375, innerDiameterIn: 1.291, wallThicknessIn: 0.042, areaIn2: 1.3094, volumeGalPerFt: 0.0679 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.625, innerDiameterIn: 1.527, wallThicknessIn: 0.049, areaIn2: 1.8310, volumeGalPerFt: 0.0950 },
  { nominalSize: '2', outerDiameterIn: 2.125, innerDiameterIn: 2.009, wallThicknessIn: 0.058, areaIn2: 3.1701, volumeGalPerFt: 0.1644 },
  { nominalSize: '2-1/2', outerDiameterIn: 2.625, innerDiameterIn: 2.495, wallThicknessIn: 0.065, areaIn2: 4.8889, volumeGalPerFt: 0.2536 },
  { nominalSize: '3', outerDiameterIn: 3.125, innerDiameterIn: 2.981, wallThicknessIn: 0.072, areaIn2: 6.9795, volumeGalPerFt: 0.3621 },
  { nominalSize: '4', outerDiameterIn: 4.125, innerDiameterIn: 3.935, wallThicknessIn: 0.095, areaIn2: 12.1611, volumeGalPerFt: 0.6309 },
]

// Steel Schedule 40
const STEEL_SCH40_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '1/2', outerDiameterIn: 0.840, innerDiameterIn: 0.622, wallThicknessIn: 0.109, areaIn2: 0.3039, volumeGalPerFt: 0.0158 },
  { nominalSize: '3/4', outerDiameterIn: 1.050, innerDiameterIn: 0.824, wallThicknessIn: 0.113, areaIn2: 0.5333, volumeGalPerFt: 0.0277 },
  { nominalSize: '1', outerDiameterIn: 1.315, innerDiameterIn: 1.049, wallThicknessIn: 0.133, areaIn2: 0.8643, volumeGalPerFt: 0.0448 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.660, innerDiameterIn: 1.380, wallThicknessIn: 0.140, areaIn2: 1.4957, volumeGalPerFt: 0.0776 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.900, innerDiameterIn: 1.610, wallThicknessIn: 0.145, areaIn2: 2.0359, volumeGalPerFt: 0.1056 },
  { nominalSize: '2', outerDiameterIn: 2.375, innerDiameterIn: 2.067, wallThicknessIn: 0.154, areaIn2: 3.3558, volumeGalPerFt: 0.1740 },
  { nominalSize: '2-1/2', outerDiameterIn: 2.875, innerDiameterIn: 2.469, wallThicknessIn: 0.203, areaIn2: 4.7871, volumeGalPerFt: 0.2483 },
  { nominalSize: '3', outerDiameterIn: 3.500, innerDiameterIn: 3.068, wallThicknessIn: 0.216, areaIn2: 7.3930, volumeGalPerFt: 0.3835 },
  { nominalSize: '4', outerDiameterIn: 4.500, innerDiameterIn: 4.026, wallThicknessIn: 0.237, areaIn2: 12.7303, volumeGalPerFt: 0.6604 },
  { nominalSize: '5', outerDiameterIn: 5.563, innerDiameterIn: 5.047, wallThicknessIn: 0.258, areaIn2: 20.0063, volumeGalPerFt: 1.0378 },
  { nominalSize: '6', outerDiameterIn: 6.625, innerDiameterIn: 6.065, wallThicknessIn: 0.280, areaIn2: 28.8896, volumeGalPerFt: 1.4985 },
  { nominalSize: '8', outerDiameterIn: 8.625, innerDiameterIn: 7.981, wallThicknessIn: 0.322, areaIn2: 50.0270, volumeGalPerFt: 2.5953 },
  { nominalSize: '10', outerDiameterIn: 10.750, innerDiameterIn: 10.020, wallThicknessIn: 0.365, areaIn2: 78.8547, volumeGalPerFt: 4.0906 },
  { nominalSize: '12', outerDiameterIn: 12.750, innerDiameterIn: 11.938, wallThicknessIn: 0.406, areaIn2: 111.9295, volumeGalPerFt: 5.8069 },
]

// Steel Schedule 80
const STEEL_SCH80_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '1/2', outerDiameterIn: 0.840, innerDiameterIn: 0.546, wallThicknessIn: 0.147, areaIn2: 0.2341, volumeGalPerFt: 0.0121 },
  { nominalSize: '3/4', outerDiameterIn: 1.050, innerDiameterIn: 0.742, wallThicknessIn: 0.154, areaIn2: 0.4324, volumeGalPerFt: 0.0224 },
  { nominalSize: '1', outerDiameterIn: 1.315, innerDiameterIn: 0.957, wallThicknessIn: 0.179, areaIn2: 0.7190, volumeGalPerFt: 0.0373 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.660, innerDiameterIn: 1.278, wallThicknessIn: 0.191, areaIn2: 1.2829, volumeGalPerFt: 0.0665 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.900, innerDiameterIn: 1.500, wallThicknessIn: 0.200, areaIn2: 1.7671, volumeGalPerFt: 0.0917 },
  { nominalSize: '2', outerDiameterIn: 2.375, innerDiameterIn: 1.939, wallThicknessIn: 0.218, areaIn2: 2.9530, volumeGalPerFt: 0.1532 },
  { nominalSize: '2-1/2', outerDiameterIn: 2.875, innerDiameterIn: 2.323, wallThicknessIn: 0.276, areaIn2: 4.2382, volumeGalPerFt: 0.2198 },
  { nominalSize: '3', outerDiameterIn: 3.500, innerDiameterIn: 2.900, wallThicknessIn: 0.300, areaIn2: 6.6052, volumeGalPerFt: 0.3426 },
  { nominalSize: '4', outerDiameterIn: 4.500, innerDiameterIn: 3.826, wallThicknessIn: 0.337, areaIn2: 11.4970, volumeGalPerFt: 0.5964 },
  { nominalSize: '6', outerDiameterIn: 6.625, innerDiameterIn: 5.761, wallThicknessIn: 0.432, areaIn2: 26.0667, volumeGalPerFt: 1.3522 },
]

// PVC Schedule 40
const PVC_SCH40_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '1/2', outerDiameterIn: 0.840, innerDiameterIn: 0.622, wallThicknessIn: 0.109, areaIn2: 0.3039, volumeGalPerFt: 0.0158 },
  { nominalSize: '3/4', outerDiameterIn: 1.050, innerDiameterIn: 0.824, wallThicknessIn: 0.113, areaIn2: 0.5333, volumeGalPerFt: 0.0277 },
  { nominalSize: '1', outerDiameterIn: 1.315, innerDiameterIn: 1.049, wallThicknessIn: 0.133, areaIn2: 0.8643, volumeGalPerFt: 0.0448 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.660, innerDiameterIn: 1.380, wallThicknessIn: 0.140, areaIn2: 1.4957, volumeGalPerFt: 0.0776 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.900, innerDiameterIn: 1.610, wallThicknessIn: 0.145, areaIn2: 2.0359, volumeGalPerFt: 0.1056 },
  { nominalSize: '2', outerDiameterIn: 2.375, innerDiameterIn: 2.067, wallThicknessIn: 0.154, areaIn2: 3.3558, volumeGalPerFt: 0.1740 },
  { nominalSize: '2-1/2', outerDiameterIn: 2.875, innerDiameterIn: 2.469, wallThicknessIn: 0.203, areaIn2: 4.7871, volumeGalPerFt: 0.2483 },
  { nominalSize: '3', outerDiameterIn: 3.500, innerDiameterIn: 3.068, wallThicknessIn: 0.216, areaIn2: 7.3930, volumeGalPerFt: 0.3835 },
  { nominalSize: '4', outerDiameterIn: 4.500, innerDiameterIn: 4.026, wallThicknessIn: 0.237, areaIn2: 12.7303, volumeGalPerFt: 0.6604 },
  { nominalSize: '6', outerDiameterIn: 6.625, innerDiameterIn: 6.065, wallThicknessIn: 0.280, areaIn2: 28.8896, volumeGalPerFt: 1.4985 },
]

// PVC Schedule 80
const PVC_SCH80_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '1/2', outerDiameterIn: 0.840, innerDiameterIn: 0.546, wallThicknessIn: 0.147, areaIn2: 0.2341, volumeGalPerFt: 0.0121 },
  { nominalSize: '3/4', outerDiameterIn: 1.050, innerDiameterIn: 0.742, wallThicknessIn: 0.154, areaIn2: 0.4324, volumeGalPerFt: 0.0224 },
  { nominalSize: '1', outerDiameterIn: 1.315, innerDiameterIn: 0.957, wallThicknessIn: 0.179, areaIn2: 0.7190, volumeGalPerFt: 0.0373 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.660, innerDiameterIn: 1.278, wallThicknessIn: 0.191, areaIn2: 1.2829, volumeGalPerFt: 0.0665 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.900, innerDiameterIn: 1.500, wallThicknessIn: 0.200, areaIn2: 1.7671, volumeGalPerFt: 0.0917 },
  { nominalSize: '2', outerDiameterIn: 2.375, innerDiameterIn: 1.939, wallThicknessIn: 0.218, areaIn2: 2.9530, volumeGalPerFt: 0.1532 },
  { nominalSize: '3', outerDiameterIn: 3.500, innerDiameterIn: 2.900, wallThicknessIn: 0.300, areaIn2: 6.6052, volumeGalPerFt: 0.3426 },
  { nominalSize: '4', outerDiameterIn: 4.500, innerDiameterIn: 3.826, wallThicknessIn: 0.337, areaIn2: 11.4970, volumeGalPerFt: 0.5964 },
]

// PEX - Cross-linked Polyethylene
const PEX_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '3/8', outerDiameterIn: 0.500, innerDiameterIn: 0.350, wallThicknessIn: 0.075, areaIn2: 0.0962, volumeGalPerFt: 0.0050 },
  { nominalSize: '1/2', outerDiameterIn: 0.625, innerDiameterIn: 0.475, wallThicknessIn: 0.075, areaIn2: 0.1772, volumeGalPerFt: 0.0092 },
  { nominalSize: '3/4', outerDiameterIn: 0.875, innerDiameterIn: 0.671, wallThicknessIn: 0.102, areaIn2: 0.3537, volumeGalPerFt: 0.0183 },
  { nominalSize: '1', outerDiameterIn: 1.125, innerDiameterIn: 0.863, wallThicknessIn: 0.131, areaIn2: 0.5851, volumeGalPerFt: 0.0303 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.375, innerDiameterIn: 1.053, wallThicknessIn: 0.161, areaIn2: 0.8709, volumeGalPerFt: 0.0452 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.625, innerDiameterIn: 1.243, wallThicknessIn: 0.191, areaIn2: 1.2134, volumeGalPerFt: 0.0630 },
  { nominalSize: '2', outerDiameterIn: 2.125, innerDiameterIn: 1.625, wallThicknessIn: 0.250, areaIn2: 2.0739, volumeGalPerFt: 0.1076 },
]

// HDPE - High Density Polyethylene (SDR 11)
const HDPE_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '1/2', outerDiameterIn: 0.840, innerDiameterIn: 0.686, wallThicknessIn: 0.077, areaIn2: 0.3697, volumeGalPerFt: 0.0192 },
  { nominalSize: '3/4', outerDiameterIn: 1.050, innerDiameterIn: 0.858, wallThicknessIn: 0.096, areaIn2: 0.5781, volumeGalPerFt: 0.0300 },
  { nominalSize: '1', outerDiameterIn: 1.315, innerDiameterIn: 1.075, wallThicknessIn: 0.120, areaIn2: 0.9076, volumeGalPerFt: 0.0471 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.660, innerDiameterIn: 1.356, wallThicknessIn: 0.152, areaIn2: 1.4440, volumeGalPerFt: 0.0749 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.900, innerDiameterIn: 1.552, wallThicknessIn: 0.174, areaIn2: 1.8920, volumeGalPerFt: 0.0981 },
  { nominalSize: '2', outerDiameterIn: 2.375, innerDiameterIn: 1.941, wallThicknessIn: 0.217, areaIn2: 2.9592, volumeGalPerFt: 0.1535 },
  { nominalSize: '3', outerDiameterIn: 3.500, innerDiameterIn: 2.860, wallThicknessIn: 0.320, areaIn2: 6.4242, volumeGalPerFt: 0.3332 },
  { nominalSize: '4', outerDiameterIn: 4.500, innerDiameterIn: 3.678, wallThicknessIn: 0.411, areaIn2: 10.6224, volumeGalPerFt: 0.5510 },
  { nominalSize: '6', outerDiameterIn: 6.625, innerDiameterIn: 5.415, wallThicknessIn: 0.605, areaIn2: 23.0212, volumeGalPerFt: 1.1942 },
]

// PP-R - Polypropylene Random (Aquatherm)
const PPR_DIMENSIONS: PipeDimension[] = [
  { nominalSize: '1/2', outerDiameterIn: 0.787, innerDiameterIn: 0.519, wallThicknessIn: 0.134, areaIn2: 0.2115, volumeGalPerFt: 0.0110 },
  { nominalSize: '3/4', outerDiameterIn: 0.984, innerDiameterIn: 0.650, wallThicknessIn: 0.167, areaIn2: 0.3318, volumeGalPerFt: 0.0172 },
  { nominalSize: '1', outerDiameterIn: 1.260, innerDiameterIn: 0.831, wallThicknessIn: 0.214, areaIn2: 0.5425, volumeGalPerFt: 0.0281 },
  { nominalSize: '1-1/4', outerDiameterIn: 1.575, innerDiameterIn: 1.039, wallThicknessIn: 0.268, areaIn2: 0.8478, volumeGalPerFt: 0.0440 },
  { nominalSize: '1-1/2', outerDiameterIn: 1.969, innerDiameterIn: 1.299, wallThicknessIn: 0.335, areaIn2: 1.3256, volumeGalPerFt: 0.0688 },
  { nominalSize: '2', outerDiameterIn: 2.480, innerDiameterIn: 1.637, wallThicknessIn: 0.421, areaIn2: 2.1041, volumeGalPerFt: 0.1091 },
  { nominalSize: '2-1/2', outerDiameterIn: 3.150, innerDiameterIn: 2.079, wallThicknessIn: 0.535, areaIn2: 3.3943, volumeGalPerFt: 0.1761 },
  { nominalSize: '3', outerDiameterIn: 3.543, innerDiameterIn: 2.339, wallThicknessIn: 0.602, areaIn2: 4.2959, volumeGalPerFt: 0.2228 },
  { nominalSize: '4', outerDiameterIn: 4.488, innerDiameterIn: 2.961, wallThicknessIn: 0.763, areaIn2: 6.8870, volumeGalPerFt: 0.3573 },
  { nominalSize: '6', outerDiameterIn: 6.299, innerDiameterIn: 4.157, wallThicknessIn: 1.071, areaIn2: 13.5701, volumeGalPerFt: 0.7039 },
]

// =========================================== 
// PIPE MATERIAL DATABASE
// =========================================== 

export const PIPE_MATERIALS: PipeMaterialData[] = [
  {
    id: 'copper_type_l',
    displayName: 'Copper Type L',
    roughnessFt: 0.000005,
    dimensions: COPPER_TYPE_L_DIMENSIONS,
  },
  {
    id: 'copper_type_m',
    displayName: 'Copper Type M',
    roughnessFt: 0.000005,
    dimensions: COPPER_TYPE_M_DIMENSIONS,
  },
  {
    id: 'steel_sch40',
    displayName: 'Steel Schedule 40',
    roughnessFt: 0.00015,
    dimensions: STEEL_SCH40_DIMENSIONS,
  },
  {
    id: 'steel_sch80',
    displayName: 'Steel Schedule 80',
    roughnessFt: 0.00015,
    dimensions: STEEL_SCH80_DIMENSIONS,
  },
  {
    id: 'pvc_sch40',
    displayName: 'PVC Schedule 40',
    roughnessFt: 0.000005,
    dimensions: PVC_SCH40_DIMENSIONS,
  },
  {
    id: 'pvc_sch80',
    displayName: 'PVC Schedule 80',
    roughnessFt: 0.000005,
    dimensions: PVC_SCH80_DIMENSIONS,
  },
  {
    id: 'pex',
    displayName: 'PEX',
    roughnessFt: 0.000005,
    dimensions: PEX_DIMENSIONS,
  },
  {
    id: 'hdpe',
    displayName: 'HDPE (SDR 11)',
    roughnessFt: 0.000007,
    dimensions: HDPE_DIMENSIONS,
  },
  {
    id: 'ppr',
    displayName: 'PP-R (Aquatherm)',
    roughnessFt: 0.000007,
    dimensions: PPR_DIMENSIONS,
  },
]

// =========================================== 
// HELPER FUNCTIONS
// =========================================== 

export function getPipeMaterial(materialId: string): PipeMaterialData | undefined {
  return PIPE_MATERIALS.find(m => m.id === materialId)
}

export function getPipeDimension(materialId: string, nominalSize: string): PipeDimension | undefined {
  const material = getPipeMaterial(materialId)
  if (!material) return undefined
  return material.dimensions.find(d => d.nominalSize === nominalSize)
}

export function getAvailableSizes(materialId: string): string[] {
  const material = getPipeMaterial(materialId)
  if (!material) return []
  return material.dimensions.map(d => d.nominalSize)
}

export function getInnerDiameter(materialId: string, nominalSize: string): number {
  const dim = getPipeDimension(materialId, nominalSize)
  return dim?.innerDiameterIn ?? 0
}

export function getPipeRoughness(materialId: string): number {
  const material = getPipeMaterial(materialId)
  return material?.roughnessFt ?? 0.00015
}

export function getPipeVolume(materialId: string, nominalSize: string, lengthFt: number): number {
  const dim = getPipeDimension(materialId, nominalSize)
  if (!dim) return 0
  return dim.volumeGalPerFt * lengthFt
}
