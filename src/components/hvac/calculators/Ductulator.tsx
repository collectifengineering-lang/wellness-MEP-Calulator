import { useState, useMemo } from 'react'

/**
 * SMACNA Ductulator Calculator
 * 
 * Calculates duct sizes based on airflow and EITHER velocity OR friction rate
 * User selects which criteria to size by - the other value is calculated
 */

// Standard round duct sizes (inches)
const STANDARD_ROUND_SIZES = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48]

// Standard rectangular duct sizes (inches)
const STANDARD_RECT_SIZES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 52, 56, 60]

type SizingMode = 'friction' | 'velocity'

interface DuctResult {
  nominalSize: number
  interiorDiameter: number
  area: number // sq ft
  velocity: number // FPM
  frictionRate: number // in.wg/100ft
}

interface RectDuctResult {
  width: number
  height: number
  aspectRatio: string
  interiorWidth: number
  interiorHeight: number
  area: number
  velocity: number
  frictionRate: number
  equivalentDia: number
}

// Calculate friction rate from diameter and CFM (reverse SMACNA formula)
function calculateFriction(cfm: number, diameterIn: number): number {
  // D = 0.109 * Q^0.5 * f^(-0.225)
  // f = (0.109 * Q^0.5 / D)^(1/0.225)
  const f = Math.pow((0.109 * Math.pow(cfm, 0.5)) / diameterIn, 1 / 0.225)
  return f
}

// Calculate diameter from friction rate and CFM (SMACNA formula)
function calculateDiameterFromFriction(cfm: number, frictionRate: number): number {
  return 0.109 * Math.pow(cfm, 0.5) * Math.pow(frictionRate, -0.225)
}

// Calculate diameter from velocity and CFM
function calculateDiameterFromVelocity(cfm: number, velocity: number): number {
  // Area = CFM / velocity (sq ft)
  // Area = π * (D/24)²
  // D = 24 * sqrt(Area / π) = 24 * sqrt(CFM / (velocity * π))
  return 24 * Math.sqrt(cfm / (velocity * Math.PI))
}

// Calculate equivalent diameter for rectangular duct
function calculateEquivalentDia(width: number, height: number): number {
  return 1.30 * Math.pow(width * height, 0.625) / Math.pow(width + height, 0.25)
}

export default function Ductulator() {
  const [cfm, setCfm] = useState(1000)
  const [sizingMode, setSizingMode] = useState<SizingMode>('friction')
  const [frictionInput, setFrictionInput] = useState(0.08)
  const [velocityInput, setVelocityInput] = useState(1500)
  const [insulation, setInsulation] = useState<'none' | '0.75' | '1'>('none')
  
  const insulationThickness = insulation === '0.75' ? 0.75 : insulation === '1' ? 1 : 0
  
  // Calculate round duct based on selected mode
  const roundDuct = useMemo((): DuctResult => {
    let calculatedDia: number
    
    if (sizingMode === 'friction') {
      calculatedDia = calculateDiameterFromFriction(cfm, frictionInput)
    } else {
      calculatedDia = calculateDiameterFromVelocity(cfm, velocityInput)
    }
    
    // Add insulation to get nominal size needed
    const effectiveDiameter = calculatedDia + (2 * insulationThickness)
    
    // Round up to standard size
    const nominalSize = STANDARD_ROUND_SIZES.find(s => s >= effectiveDiameter) || Math.ceil(effectiveDiameter)
    
    // Interior diameter after insulation
    const interiorDiameter = nominalSize - (2 * insulationThickness)
    
    // Calculate area and velocity
    const area = Math.PI * Math.pow(interiorDiameter / 24, 2)
    const velocity = cfm / area
    
    // Calculate actual friction rate for this size
    const frictionRate = calculateFriction(cfm, interiorDiameter)
    
    return {
      nominalSize,
      interiorDiameter,
      area,
      velocity,
      frictionRate,
    }
  }, [cfm, sizingMode, frictionInput, velocityInput, insulationThickness])
  
  // Generate rectangular equivalents based on the round duct AREA
  const rectangularDucts = useMemo((): RectDuctResult[] => {
    const targetArea = roundDuct.area // sq ft - match this area
    
    const results: RectDuctResult[] = []
    
    // Generate various width/height combinations that approximate the target area
    for (const width of STANDARD_RECT_SIZES) {
      for (const height of STANDARD_RECT_SIZES) {
        if (height > width) continue // Skip duplicates (12x8 = 8x12)
        
        const interiorWidth = width - (2 * insulationThickness)
        const interiorHeight = height - (2 * insulationThickness)
        
        if (interiorWidth <= 0 || interiorHeight <= 0) continue
        
        const interiorArea = interiorWidth * interiorHeight
        const areaSqFt = interiorArea / 144
        
        // Only include if within ±30% of target area
        const areaRatio = areaSqFt / targetArea
        if (areaRatio < 0.7 || areaRatio > 1.3) continue
        
        const velocity = cfm / areaSqFt
        const equivalentDia = calculateEquivalentDia(interiorWidth, interiorHeight)
        const frictionRate = calculateFriction(cfm, equivalentDia)
        
        // Calculate aspect ratio
        const aspectRatio = (width / height).toFixed(1) + ':1'
        
        results.push({
          width,
          height,
          aspectRatio,
          interiorWidth,
          interiorHeight,
          area: areaSqFt,
          velocity,
          frictionRate,
          equivalentDia,
        })
      }
    }
    
    // Sort by how close the area is to target, then by aspect ratio
    return results
      .sort((a, b) => {
        const aDiff = Math.abs(a.area - targetArea)
        const bDiff = Math.abs(b.area - targetArea)
        return aDiff - bDiff
      })
      .slice(0, 12) // Show top 12 options
  }, [roundDuct.area, cfm, insulationThickness])
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          🌀 Ductulator <span className="text-surface-500 text-base font-normal">SMACNA-based sizing</span>
        </h2>
        <p className="text-surface-400">Size ducts by velocity OR friction rate - the GOAT way! 🐐💨</p>
      </div>
      
      {/* Inputs */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Inputs</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - CFM and Insulation */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1">Airflow (CFM)</label>
              <input
                type="number"
                value={cfm}
                onChange={(e) => setCfm(Number(e.target.value))}
                min={100}
                max={100000}
                className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white text-xl font-bold"
              />
            </div>
            
            <div>
              <label className="block text-sm text-surface-400 mb-1">Internal Insulation</label>
              <select
                value={insulation}
                onChange={(e) => setInsulation(e.target.value as typeof insulation)}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              >
                <option value="none">None</option>
                <option value="0.75">3/4" (0.75")</option>
                <option value="1">1" (1.0")</option>
              </select>
              <div className="text-xs text-surface-500 mt-1">Reduces effective interior dimensions</div>
            </div>
          </div>
          
          {/* Right column - Sizing Mode */}
          <div>
            <label className="block text-sm text-surface-400 mb-2">Size By</label>
            
            {/* Mode Toggle */}
            <div className="flex rounded-lg overflow-hidden border border-surface-600 mb-4">
              <button
                onClick={() => setSizingMode('friction')}
                className={`flex-1 px-4 py-2 font-medium transition-colors ${
                  sizingMode === 'friction'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-surface-900 text-surface-400 hover:text-white'
                }`}
              >
                Friction Rate
              </button>
              <button
                onClick={() => setSizingMode('velocity')}
                className={`flex-1 px-4 py-2 font-medium transition-colors ${
                  sizingMode === 'velocity'
                    ? 'bg-amber-600 text-white'
                    : 'bg-surface-900 text-surface-400 hover:text-white'
                }`}
              >
                Velocity
              </button>
            </div>
            
            {/* Friction Rate Input */}
            <div className={sizingMode !== 'friction' ? 'opacity-40' : ''}>
              <label className="block text-sm text-surface-400 mb-1">
                Friction Rate (in.wg/100ft)
                {sizingMode !== 'friction' && ' - calculated'}
              </label>
              <input
                type="number"
                value={sizingMode === 'friction' ? frictionInput : roundDuct.frictionRate.toFixed(3)}
                onChange={(e) => setFrictionInput(Number(e.target.value))}
                disabled={sizingMode !== 'friction'}
                min={0.01}
                max={0.5}
                step={0.01}
                className={`w-full px-3 py-2 border rounded-lg ${
                  sizingMode === 'friction'
                    ? 'bg-surface-900 border-cyan-600 text-white'
                    : 'bg-surface-950 border-surface-700 text-surface-500 cursor-not-allowed'
                }`}
              />
              {sizingMode === 'friction' && (
                <div className="text-xs text-surface-500 mt-1">Typical: 0.08 - 0.10</div>
              )}
            </div>
            
            {/* Velocity Input */}
            <div className={`mt-3 ${sizingMode !== 'velocity' ? 'opacity-40' : ''}`}>
              <label className="block text-sm text-surface-400 mb-1">
                Velocity (FPM)
                {sizingMode !== 'velocity' && ' - calculated'}
              </label>
              <input
                type="number"
                value={sizingMode === 'velocity' ? velocityInput : Math.round(roundDuct.velocity)}
                onChange={(e) => setVelocityInput(Number(e.target.value))}
                disabled={sizingMode !== 'velocity'}
                min={500}
                max={5000}
                step={100}
                className={`w-full px-3 py-2 border rounded-lg ${
                  sizingMode === 'velocity'
                    ? 'bg-surface-900 border-amber-600 text-white'
                    : 'bg-surface-950 border-surface-700 text-surface-500 cursor-not-allowed'
                }`}
              />
              {sizingMode === 'velocity' && (
                <div className="text-xs text-surface-500 mt-1">Main: 1200-1800, Branch: 800-1200</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Round Duct Result */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-surface-800 rounded-xl border border-cyan-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          ⚫ Round Duct Result
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center bg-surface-900/50 rounded-lg p-4">
            <div className="text-4xl font-bold text-cyan-400">{roundDuct.nominalSize}"</div>
            <div className="text-sm text-surface-400">Nominal Ø</div>
            {insulationThickness > 0 && (
              <div className="text-xs text-amber-400 mt-1">
                ID: {roundDuct.interiorDiameter.toFixed(1)}"
              </div>
            )}
          </div>
          
          <div className="text-center bg-surface-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{roundDuct.area.toFixed(2)}</div>
            <div className="text-sm text-surface-400">Area (SF)</div>
          </div>
          
          <div className="text-center bg-surface-900/50 rounded-lg p-4">
            <div className={`text-2xl font-bold ${sizingMode === 'velocity' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {Math.round(roundDuct.velocity).toLocaleString()}
            </div>
            <div className="text-sm text-surface-400">Velocity (FPM)</div>
            {sizingMode === 'friction' && (
              <div className="text-xs text-surface-500">calculated</div>
            )}
          </div>
          
          <div className="text-center bg-surface-900/50 rounded-lg p-4">
            <div className={`text-2xl font-bold ${sizingMode === 'friction' ? 'text-cyan-400' : 'text-emerald-400'}`}>
              {roundDuct.frictionRate.toFixed(3)}
            </div>
            <div className="text-sm text-surface-400">Friction</div>
            <div className="text-xs text-surface-500">in.wg/100ft</div>
          </div>
          
          <div className="text-center bg-surface-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              {(roundDuct.area * 144).toFixed(0)}
            </div>
            <div className="text-sm text-surface-400">Area (sq.in)</div>
          </div>
        </div>
      </div>
      
      {/* Rectangular Equivalents */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          ▬ Rectangular Alternatives
        </h3>
        <p className="text-sm text-surface-400 mb-4">
          Ducts with similar area to the {roundDuct.nominalSize}" round ({(roundDuct.area * 144).toFixed(0)} sq.in)
        </p>
        
        {rectangularDucts.length === 0 ? (
          <div className="text-center py-8 text-surface-400">
            No suitable rectangular alternatives found for this airflow.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-surface-400 border-b border-surface-700">
                  <th className="pb-3 pr-4">Size (W×H)</th>
                  <th className="pb-3 pr-4">Aspect</th>
                  <th className="pb-3 pr-4">Area (SF)</th>
                  <th className="pb-3 pr-4">Eq. Ø</th>
                  <th className="pb-3 pr-4">Velocity</th>
                  <th className="pb-3">Friction</th>
                </tr>
              </thead>
              <tbody>
                {rectangularDucts.map((duct, i) => {
                  const isClosestArea = i === 0
                  return (
                    <tr 
                      key={`${duct.width}x${duct.height}`} 
                      className={`border-b border-surface-700/50 ${isClosestArea ? 'bg-cyan-900/20' : ''}`}
                    >
                      <td className="py-3 pr-4">
                        <span className={`font-medium ${isClosestArea ? 'text-cyan-400' : 'text-white'}`}>
                          {duct.width}" × {duct.height}"
                        </span>
                        {isClosestArea && (
                          <span className="ml-2 text-xs text-cyan-400">✓ Best match</span>
                        )}
                        {insulationThickness > 0 && (
                          <div className="text-xs text-amber-400">
                            ID: {duct.interiorWidth}"×{duct.interiorHeight}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-surface-300">{duct.aspectRatio}</td>
                      <td className="py-3 pr-4 text-white">
                        {duct.area.toFixed(2)}
                        <span className="text-xs text-surface-500 ml-1">
                          ({((duct.area / roundDuct.area) * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white">{duct.equivalentDia.toFixed(1)}"</td>
                      <td className="py-3 pr-4">
                        <span className={duct.velocity <= 2000 ? 'text-emerald-400' : 'text-amber-400'}>
                          {Math.round(duct.velocity).toLocaleString()}
                        </span>
                        <span className="text-surface-500 text-xs ml-1">FPM</span>
                      </td>
                      <td className="py-3">
                        <span className={duct.frictionRate <= 0.10 ? 'text-emerald-400' : 'text-amber-400'}>
                          {duct.frictionRate.toFixed(3)}
                        </span>
                        <span className="text-surface-500 text-xs ml-1">in.wg</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {insulation !== 'none' && (
          <div className="mt-4 p-3 bg-amber-900/30 rounded-lg border border-amber-700 text-sm text-amber-300">
            <strong>Note:</strong> Sizes shown are nominal (exterior). {insulation}" internal lining 
            reduces effective interior dimensions. Calculations use interior dimensions.
          </div>
        )}
      </div>
      
      {/* Quick Reference */}
      <div className="mt-6 bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Quick Reference</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="text-surface-400 font-medium mb-2">Typical Friction Rates</h4>
            <ul className="space-y-1 text-surface-300">
              <li>• Low velocity systems: <span className="text-cyan-400">0.05 - 0.08</span> in.wg/100ft</li>
              <li>• Medium velocity: <span className="text-cyan-400">0.08 - 0.10</span> in.wg/100ft</li>
              <li>• High velocity: <span className="text-cyan-400">0.10 - 0.15</span> in.wg/100ft</li>
            </ul>
          </div>
          <div>
            <h4 className="text-surface-400 font-medium mb-2">Recommended Velocities</h4>
            <ul className="space-y-1 text-surface-300">
              <li>• Main ducts: <span className="text-amber-400">1200 - 1800</span> FPM</li>
              <li>• Branch ducts: <span className="text-amber-400">800 - 1200</span> FPM</li>
              <li>• Flexible ducts: <span className="text-amber-400">800 max</span> FPM</li>
              <li>• Above occupied (noise): <span className="text-amber-400">1000 max</span> FPM</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
