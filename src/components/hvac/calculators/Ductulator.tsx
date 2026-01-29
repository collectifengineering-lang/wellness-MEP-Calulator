import { useState, useMemo } from 'react'

/**
 * SMACNA Ductulator Calculator
 * 
 * Calculates duct sizes based on BOTH velocity AND friction rate constraints
 * Returns the WORST CASE (larger) duct size to satisfy both requirements
 * 
 * Presets:
 * - Low Pressure: 0.08" WC/100ft, 800 FPM (typical branch/residential)
 * - Medium Pressure: 0.15" WC/100ft, 1500 FPM (typical commercial mains)
 * - Custom: User-defined values
 */

// Standard round duct sizes (inches)
const STANDARD_ROUND_SIZES = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48]

// Standard rectangular duct sizes (inches)
const STANDARD_RECT_SIZES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 52, 56, 60]

type PressureMode = 'low' | 'medium' | 'custom'

// Presets for low and medium pressure systems
const PRESSURE_PRESETS = {
  low: { friction: 0.08, velocity: 800 },
  medium: { friction: 0.15, velocity: 1500 },
}

interface DuctResult {
  nominalSize: number
  interiorDiameter: number
  area: number // sq ft
  velocity: number // FPM
  frictionRate: number // in.wg/100ft
}

interface WorstCaseResult {
  recommended: DuctResult
  byFriction: DuctResult
  byVelocity: DuctResult
  governedBy: 'friction' | 'velocity' | 'equal'
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
  const [pressureMode, setPressureMode] = useState<PressureMode>('low')
  const [frictionInput, setFrictionInput] = useState(0.08)
  const [velocityInput, setVelocityInput] = useState(800)
  const [insulation, setInsulation] = useState<'none' | '0.75' | '1'>('none')
  
  const insulationThickness = insulation === '0.75' ? 0.75 : insulation === '1' ? 1 : 0
  
  // Get active friction and velocity values based on mode
  const activeFriction = pressureMode === 'custom' ? frictionInput : PRESSURE_PRESETS[pressureMode].friction
  const activeVelocity = pressureMode === 'custom' ? velocityInput : PRESSURE_PRESETS[pressureMode].velocity
  
  // Helper to calculate duct result for a given diameter
  const calculateDuctResult = (nominalSize: number): DuctResult => {
    const interiorDiameter = nominalSize - (2 * insulationThickness)
    const area = Math.PI * Math.pow(interiorDiameter / 24, 2)
    const velocity = cfm / area
    const frictionRate = calculateFriction(cfm, interiorDiameter)
    return { nominalSize, interiorDiameter, area, velocity, frictionRate }
  }
  
  // Calculate WORST CASE - larger of friction-based or velocity-based sizing
  const worstCaseResult = useMemo((): WorstCaseResult => {
    // Calculate diameter needed by friction constraint
    const diaByFriction = calculateDiameterFromFriction(cfm, activeFriction) + (2 * insulationThickness)
    const sizeByFriction = STANDARD_ROUND_SIZES.find(s => s >= diaByFriction) || Math.ceil(diaByFriction)
    
    // Calculate diameter needed by velocity constraint
    const diaByVelocity = calculateDiameterFromVelocity(cfm, activeVelocity) + (2 * insulationThickness)
    const sizeByVelocity = STANDARD_ROUND_SIZES.find(s => s >= diaByVelocity) || Math.ceil(diaByVelocity)
    
    // Worst case = larger size (satisfies both constraints)
    const worstCaseSize = Math.max(sizeByFriction, sizeByVelocity)
    
    const byFriction = calculateDuctResult(sizeByFriction)
    const byVelocity = calculateDuctResult(sizeByVelocity)
    const recommended = calculateDuctResult(worstCaseSize)
    
    const governedBy: 'friction' | 'velocity' | 'equal' = 
      sizeByFriction > sizeByVelocity ? 'friction' :
      sizeByVelocity > sizeByFriction ? 'velocity' : 'equal'
    
    return { recommended, byFriction, byVelocity, governedBy }
  }, [cfm, activeFriction, activeVelocity, insulationThickness])
  
  // Alias for easier access
  const roundDuct = worstCaseResult.recommended
  
  // Generate rectangular equivalents - spread around the round duct area (smaller AND larger)
  const rectangularDucts = useMemo((): RectDuctResult[] => {
    const targetArea = roundDuct.area // sq ft - this is our target/median
    
    const results: RectDuctResult[] = []
    
    // Generate various width/height combinations
    for (const width of STANDARD_RECT_SIZES) {
      for (const height of STANDARD_RECT_SIZES) {
        if (height > width) continue // Skip duplicates (12x8 = 8x12)
        
        const interiorWidth = width - (2 * insulationThickness)
        const interiorHeight = height - (2 * insulationThickness)
        
        if (interiorWidth <= 0 || interiorHeight <= 0) continue
        
        const interiorArea = interiorWidth * interiorHeight
        const areaSqFt = interiorArea / 144
        
        // Include a wider range: ±50% of target area
        const areaRatio = areaSqFt / targetArea
        if (areaRatio < 0.5 || areaRatio > 1.5) continue
        
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
    
    // Sort by area (smallest to largest) so we get a spread
    const sorted = results.sort((a, b) => a.area - b.area)
    
    // Find the index of the duct closest to target area
    let closestIdx = 0
    let closestDiff = Infinity
    sorted.forEach((d, i) => {
      const diff = Math.abs(d.area - targetArea)
      if (diff < closestDiff) {
        closestDiff = diff
        closestIdx = i
      }
    })
    
    // Select ducts around the closest match - 6 smaller, closest, 5 larger (12 total)
    const startIdx = Math.max(0, closestIdx - 6)
    const endIdx = Math.min(sorted.length, startIdx + 12)
    
    return sorted.slice(startIdx, endIdx)
  }, [roundDuct.area, cfm, insulationThickness])
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          🌀 Ductulator <span className="text-surface-500 text-base font-normal">SMACNA-based sizing</span>
        </h2>
        <p className="text-surface-400">Worst-case sizing using BOTH velocity AND friction limits 🐐💨</p>
      </div>
      
      {/* Pressure Mode Selector */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-2 mb-6">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setPressureMode('low')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              pressureMode === 'low'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-surface-900 text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            <div className="text-sm font-semibold">Low Pressure</div>
            <div className={`text-xs mt-0.5 ${pressureMode === 'low' ? 'text-emerald-200' : 'text-surface-500'}`}>
              0.08" WC · 800 FPM
            </div>
          </button>
          <button
            onClick={() => setPressureMode('medium')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              pressureMode === 'medium'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-surface-900 text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            <div className="text-sm font-semibold">Medium Pressure</div>
            <div className={`text-xs mt-0.5 ${pressureMode === 'medium' ? 'text-amber-200' : 'text-surface-500'}`}>
              0.15" WC · 1500 FPM
            </div>
          </button>
          <button
            onClick={() => setPressureMode('custom')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              pressureMode === 'custom'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-surface-900 text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            <div className="text-sm font-semibold">Custom</div>
            <div className={`text-xs mt-0.5 ${pressureMode === 'custom' ? 'text-purple-200' : 'text-surface-500'}`}>
              Set your own values
            </div>
          </button>
        </div>
      </div>
      
      {/* Inputs */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 mb-6">
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
          
          {/* Right column - Friction & Velocity constraints */}
          <div className="space-y-4">
            {/* Friction Rate Input */}
            <div className={pressureMode !== 'custom' ? 'opacity-50' : ''}>
              <label className="block text-sm text-surface-400 mb-1">
                Friction Rate (in.wg/100ft)
                {pressureMode !== 'custom' && <span className="text-cyan-400 ml-2">preset: {activeFriction}</span>}
              </label>
              <input
                type="number"
                value={pressureMode === 'custom' ? frictionInput : activeFriction}
                onChange={(e) => setFrictionInput(Number(e.target.value))}
                disabled={pressureMode !== 'custom'}
                min={0.01}
                max={0.5}
                step={0.01}
                className={`w-full px-3 py-2 border rounded-lg ${
                  pressureMode === 'custom'
                    ? 'bg-surface-900 border-purple-600 text-white'
                    : 'bg-surface-950 border-surface-700 text-surface-500 cursor-not-allowed'
                }`}
              />
            </div>
            
            {/* Velocity Input */}
            <div className={pressureMode !== 'custom' ? 'opacity-50' : ''}>
              <label className="block text-sm text-surface-400 mb-1">
                Max Velocity (FPM)
                {pressureMode !== 'custom' && <span className="text-amber-400 ml-2">preset: {activeVelocity}</span>}
              </label>
              <input
                type="number"
                value={pressureMode === 'custom' ? velocityInput : activeVelocity}
                onChange={(e) => setVelocityInput(Number(e.target.value))}
                disabled={pressureMode !== 'custom'}
                min={500}
                max={5000}
                step={100}
                className={`w-full px-3 py-2 border rounded-lg ${
                  pressureMode === 'custom'
                    ? 'bg-surface-900 border-purple-600 text-white'
                    : 'bg-surface-950 border-surface-700 text-surface-500 cursor-not-allowed'
                }`}
              />
            </div>
            
            {pressureMode === 'custom' && (
              <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-700 text-xs text-purple-300">
                ⚠️ Both constraints are applied - the larger duct size wins
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Worst Case Result */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-surface-800 rounded-xl border border-cyan-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ⚫ Recommended Duct Size
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
            worstCaseResult.governedBy === 'friction' 
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-600' 
              : worstCaseResult.governedBy === 'velocity'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-600'
              : 'bg-emerald-600/30 text-emerald-300 border border-emerald-600'
          }`}>
            {worstCaseResult.governedBy === 'friction' && '⚡ Governed by Friction'}
            {worstCaseResult.governedBy === 'velocity' && '💨 Governed by Velocity'}
            {worstCaseResult.governedBy === 'equal' && '✓ Both Equal'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center bg-surface-900/50 rounded-lg p-4 ring-2 ring-cyan-500">
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
            <div className={`text-2xl font-bold ${roundDuct.velocity <= activeVelocity ? 'text-emerald-400' : 'text-red-400'}`}>
              {Math.round(roundDuct.velocity).toLocaleString()}
            </div>
            <div className="text-sm text-surface-400">Actual Velocity</div>
            <div className="text-xs text-surface-500">≤ {activeVelocity} limit</div>
          </div>
          
          <div className="text-center bg-surface-900/50 rounded-lg p-4">
            <div className={`text-2xl font-bold ${roundDuct.frictionRate <= activeFriction ? 'text-emerald-400' : 'text-amber-400'}`}>
              {roundDuct.frictionRate.toFixed(3)}
            </div>
            <div className="text-sm text-surface-400">Actual Friction</div>
            <div className="text-xs text-surface-500">≤ {activeFriction} limit</div>
          </div>
          
          <div className="text-center bg-surface-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              {(roundDuct.area * 144).toFixed(0)}
            </div>
            <div className="text-sm text-surface-400">Area (sq.in)</div>
          </div>
        </div>
        
        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border ${
            worstCaseResult.governedBy === 'friction' 
              ? 'bg-cyan-900/30 border-cyan-600' 
              : 'bg-surface-900/50 border-surface-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-cyan-400">By Friction Rate</span>
              {worstCaseResult.governedBy === 'friction' && (
                <span className="text-xs bg-cyan-600 px-2 py-0.5 rounded text-white">GOVERNS</span>
              )}
            </div>
            <div className="text-2xl font-bold text-white">{worstCaseResult.byFriction.nominalSize}"</div>
            <div className="text-xs text-surface-400 mt-1">
              @ {activeFriction}" WC → {Math.round(worstCaseResult.byFriction.velocity).toLocaleString()} FPM
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            worstCaseResult.governedBy === 'velocity' 
              ? 'bg-amber-900/30 border-amber-600' 
              : 'bg-surface-900/50 border-surface-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-400">By Velocity Limit</span>
              {worstCaseResult.governedBy === 'velocity' && (
                <span className="text-xs bg-amber-600 px-2 py-0.5 rounded text-white">GOVERNS</span>
              )}
            </div>
            <div className="text-2xl font-bold text-white">{worstCaseResult.byVelocity.nominalSize}"</div>
            <div className="text-xs text-surface-400 mt-1">
              @ {activeVelocity} FPM → {worstCaseResult.byVelocity.frictionRate.toFixed(3)}" WC
            </div>
          </div>
        </div>
        
        {/* Explanation note */}
        <div className="mt-4 p-3 bg-surface-900/50 rounded-lg text-sm text-surface-400">
          <strong className="text-white">Why worst case?</strong> Small ducts at low CFM can easily exceed velocity limits 
          even when friction rate is fine. Using both constraints prevents undersizing.
        </div>
      </div>
      
      {/* Rectangular Equivalents */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          ▬ Rectangular Alternatives
        </h3>
        <p className="text-sm text-surface-400 mb-4">
          Sizes smaller AND larger than {roundDuct.nominalSize}" round ({(roundDuct.area * 144).toFixed(0)} sq.in target)
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
                  <th className="pb-3 pr-4"></th>
                  <th className="pb-3 pr-4">Size (W×H)</th>
                  <th className="pb-3 pr-4">Aspect</th>
                  <th className="pb-3 pr-4">Area (SF)</th>
                  <th className="pb-3 pr-4">Eq. Ø</th>
                  <th className="pb-3 pr-4">Velocity</th>
                  <th className="pb-3">Friction</th>
                </tr>
              </thead>
              <tbody>
                {rectangularDucts.map((duct) => {
                  // Find if this is the closest to target area
                  const areaDiff = Math.abs(duct.area - roundDuct.area)
                  const isClosest = areaDiff === Math.min(...rectangularDucts.map(d => Math.abs(d.area - roundDuct.area)))
                  const areaPercent = (duct.area / roundDuct.area) * 100
                  const isSmaller = duct.area < roundDuct.area
                  const isLarger = duct.area > roundDuct.area
                  
                  return (
                    <tr 
                      key={`${duct.width}x${duct.height}`} 
                      className={`border-b border-surface-700/50 ${isClosest ? 'bg-cyan-900/30 border-cyan-700' : ''}`}
                    >
                      <td className="py-3 pr-2 text-center w-8">
                        {isClosest ? (
                          <span className="text-cyan-400" title="Closest to round duct">≈</span>
                        ) : isSmaller ? (
                          <span className="text-blue-400" title="Smaller area">▼</span>
                        ) : isLarger ? (
                          <span className="text-orange-400" title="Larger area">▲</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`font-medium ${isClosest ? 'text-cyan-400' : 'text-white'}`}>
                          {duct.width}" × {duct.height}"
                        </span>
                        {isClosest && (
                          <span className="ml-2 text-xs text-cyan-400">✓ Best match</span>
                        )}
                        {insulationThickness > 0 && (
                          <div className="text-xs text-amber-400">
                            ID: {duct.interiorWidth}"×{duct.interiorHeight}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-surface-300">{duct.aspectRatio}</td>
                      <td className="py-3 pr-4">
                        <span className={isClosest ? 'text-cyan-400 font-medium' : 'text-white'}>
                          {duct.area.toFixed(2)}
                        </span>
                        <span className={`text-xs ml-1 ${
                          areaPercent >= 95 && areaPercent <= 105 ? 'text-emerald-400' :
                          areaPercent >= 85 && areaPercent <= 115 ? 'text-surface-400' :
                          'text-amber-400'
                        }`}>
                          ({areaPercent.toFixed(0)}%)
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
            
            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs text-surface-400">
              <span><span className="text-blue-400">▼</span> Smaller than round</span>
              <span><span className="text-cyan-400">≈</span> Closest match</span>
              <span><span className="text-orange-400">▲</span> Larger than round</span>
            </div>
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
        <h3 className="text-lg font-semibold text-white mb-4">📋 Preset Reference</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="text-emerald-400 font-medium mb-2">🟢 Low Pressure (0.08" WC, 800 FPM)</h4>
            <ul className="space-y-1 text-surface-300">
              <li>• Residential systems</li>
              <li>• Branch ducts in commercial</li>
              <li>• Flex duct runs</li>
              <li>• Noise-sensitive areas</li>
            </ul>
          </div>
          <div>
            <h4 className="text-amber-400 font-medium mb-2">🟡 Medium Pressure (0.15" WC, 1500 FPM)</h4>
            <ul className="space-y-1 text-surface-300">
              <li>• Commercial main ducts</li>
              <li>• Supply/return mains</li>
              <li>• Industrial applications</li>
              <li>• Long duct runs</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-surface-700">
          <h4 className="text-purple-400 font-medium mb-2">🟣 When to Use Custom</h4>
          <p className="text-surface-400 text-sm">
            Use custom mode when you have specific project requirements, 
            unusual acoustical constraints, or high-pressure systems (VAV boxes, etc.).
            Remember: the calculator always picks the larger duct to satisfy <strong className="text-white">both</strong> constraints.
          </p>
        </div>
      </div>
    </div>
  )
}
