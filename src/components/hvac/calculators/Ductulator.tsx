import { useState, useMemo } from 'react'

/**
 * SMACNA Ductulator Calculator
 * 
 * Calculates duct sizes based on airflow and friction rate
 * Includes internal insulation feature for actual interior dimensions
 */

// Friction chart approximation (SMACNA)
// D = 0.109 * (Q^0.5) * (f^-0.225)
// where Q = CFM, f = friction rate (in w.g./100ft), D = diameter (inches)

interface DuctSize {
  width: number
  height: number
  aspectRatio: string
  equivalentDia: number
  velocity: number
  area: number
}

export default function Ductulator() {
  const [cfm, setCfm] = useState(1000)
  const [frictionRate, setFrictionRate] = useState(0.08)
  const [velocityLimit, setVelocityLimit] = useState(2000)
  const [insulation, setInsulation] = useState<'none' | '0.75' | '1'>('none')
  
  // Calculate round duct diameter
  const roundDuct = useMemo(() => {
    // SMACNA friction chart equation
    const diameter = 0.109 * Math.pow(cfm, 0.5) * Math.pow(frictionRate, -0.225)
    
    // Account for insulation
    const insulationThickness = insulation === '0.75' ? 0.75 : insulation === '1' ? 1 : 0
    const effectiveDiameter = diameter + (2 * insulationThickness)
    
    // Standard round duct sizes (nominal)
    const standardSizes = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48]
    const nominalSize = standardSizes.find(s => s >= effectiveDiameter) || effectiveDiameter
    
    // Interior diameter (after insulation)
    const interiorDiameter = nominalSize - (2 * insulationThickness)
    
    // Calculate actual area and velocity
    const area = Math.PI * Math.pow(interiorDiameter / 24, 2) // sq ft
    const velocity = cfm / area
    
    return {
      calculatedDia: diameter,
      nominalSize,
      interiorDiameter,
      area,
      velocity,
      insulationNote: insulationThickness > 0 
        ? `(${insulationThickness}" insulation reduces ID to ${interiorDiameter.toFixed(1)}")`
        : '',
    }
  }, [cfm, frictionRate, insulation])
  
  // Calculate rectangular equivalents
  const rectangularDucts = useMemo((): DuctSize[] => {
    const targetDia = roundDuct.calculatedDia
    const insulationThickness = insulation === '0.75' ? 0.75 : insulation === '1' ? 1 : 0
    
    // Common aspect ratios
    const aspectRatios = [
      { ratio: '1:1', factor: 1.0 },
      { ratio: '2:1', factor: 2.0 },
      { ratio: '3:1', factor: 3.0 },
      { ratio: '4:1', factor: 4.0 },
      { ratio: '1.5:1', factor: 1.5 },
      { ratio: '2.5:1', factor: 2.5 },
    ]
    
    return aspectRatios.map(({ ratio, factor }) => {
      // Equivalent diameter formula: De = 1.30 * (a*b)^0.625 / (a+b)^0.25
      // Solve for dimensions given De and aspect ratio
      // For a given aspect ratio r = a/b, we can derive:
      // De = 1.30 * (r*b^2)^0.625 / ((r+1)*b)^0.25
      // b = De^(1/0.375) * ((r+1)^0.25 / (1.30 * r^0.625))^(1/0.375)
      
      const r = factor
      const coefficient = Math.pow((Math.pow(r + 1, 0.25)) / (1.30 * Math.pow(r, 0.625)), 1 / 0.375)
      let height = Math.pow(targetDia, 1 / 0.375) * coefficient
      let width = height * r
      
      // Add insulation to get nominal size
      const nominalWidth = width + (2 * insulationThickness)
      const nominalHeight = height + (2 * insulationThickness)
      
      // Round to nearest standard sizes
      const standardSizes = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 52, 56, 60]
      const stdWidth = standardSizes.find(s => s >= nominalWidth) || Math.ceil(nominalWidth / 2) * 2
      const stdHeight = standardSizes.find(s => s >= nominalHeight) || Math.ceil(nominalHeight / 2) * 2
      
      // Interior dimensions
      const interiorWidth = stdWidth - (2 * insulationThickness)
      const interiorHeight = stdHeight - (2 * insulationThickness)
      
      // Recalculate equivalent diameter with actual sizes
      const actualDe = 1.30 * Math.pow(interiorWidth * interiorHeight, 0.625) / Math.pow(interiorWidth + interiorHeight, 0.25)
      
      // Area and velocity
      const area = (interiorWidth * interiorHeight) / 144 // sq ft
      const velocity = cfm / area
      
      return {
        width: stdWidth,
        height: stdHeight,
        aspectRatio: ratio,
        equivalentDia: actualDe,
        velocity,
        area,
      }
    }).sort((a, b) => a.velocity - b.velocity)
  }, [roundDuct.calculatedDia, cfm, insulation])
  
  // Check velocity limit
  const isVelocityOk = roundDuct.velocity <= velocityLimit
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">🌀 Ductulator</h2>
        <p className="text-surface-400">SMACNA-based duct sizing calculator</p>
      </div>
      
      {/* Inputs */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Inputs</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Airflow (CFM)</label>
            <input
              type="number"
              value={cfm}
              onChange={(e) => setCfm(Number(e.target.value))}
              min={100}
              max={100000}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-lg font-medium"
            />
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Friction Rate (in w.g./100ft)</label>
            <input
              type="number"
              value={frictionRate}
              onChange={(e) => setFrictionRate(Number(e.target.value))}
              min={0.01}
              max={0.5}
              step={0.01}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
            <div className="text-xs text-surface-500 mt-1">Typical: 0.08 - 0.10</div>
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Velocity Limit (FPM)</label>
            <input
              type="number"
              value={velocityLimit}
              onChange={(e) => setVelocityLimit(Number(e.target.value))}
              min={500}
              max={5000}
              step={100}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
            <div className="text-xs text-surface-500 mt-1">Max: 2000 typical</div>
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
            <div className="text-xs text-surface-500 mt-1">Reduces effective ID</div>
          </div>
        </div>
      </div>
      
      {/* Round Duct Result */}
      <div className={`rounded-xl border p-6 mb-6 ${
        isVelocityOk ? 'bg-cyan-900/30 border-cyan-700' : 'bg-red-900/30 border-red-700'
      }`}>
        <h3 className="text-lg font-semibold text-white mb-4">⚫ Round Duct</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-cyan-400">{roundDuct.nominalSize}"</div>
            <div className="text-sm text-surface-400">Nominal Diameter</div>
            {roundDuct.insulationNote && (
              <div className="text-xs text-amber-400 mt-1">{roundDuct.insulationNote}</div>
            )}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{roundDuct.calculatedDia.toFixed(1)}"</div>
            <div className="text-sm text-surface-400">Calculated Dia</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isVelocityOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {Math.round(roundDuct.velocity).toLocaleString()}
            </div>
            <div className="text-sm text-surface-400">Velocity (FPM)</div>
            {!isVelocityOk && <div className="text-xs text-red-400">Exceeds limit!</div>}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{roundDuct.area.toFixed(2)}</div>
            <div className="text-sm text-surface-400">Area (SF)</div>
          </div>
        </div>
      </div>
      
      {/* Rectangular Equivalents */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">▬ Rectangular Equivalents</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-400 border-b border-surface-700">
                <th className="pb-3 pr-4">Aspect</th>
                <th className="pb-3 pr-4">Size (W×H)</th>
                <th className="pb-3 pr-4">Equiv. Dia</th>
                <th className="pb-3 pr-4">Area (SF)</th>
                <th className="pb-3">Velocity</th>
              </tr>
            </thead>
            <tbody>
              {rectangularDucts.map((duct, i) => {
                const velOk = duct.velocity <= velocityLimit
                return (
                  <tr key={i} className="border-b border-surface-700/50">
                    <td className="py-3 pr-4 text-surface-300">{duct.aspectRatio}</td>
                    <td className="py-3 pr-4">
                      <span className="text-cyan-400 font-medium">{duct.width}" × {duct.height}"</span>
                    </td>
                    <td className="py-3 pr-4 text-white">{duct.equivalentDia.toFixed(1)}"</td>
                    <td className="py-3 pr-4 text-white">{duct.area.toFixed(2)}</td>
                    <td className={`py-3 font-medium ${velOk ? 'text-emerald-400' : 'text-red-400'}`}>
                      {Math.round(duct.velocity).toLocaleString()} FPM
                      {!velOk && <span className="text-xs ml-1">⚠️</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {insulation !== 'none' && (
          <div className="mt-4 p-3 bg-amber-900/30 rounded-lg border border-amber-700 text-sm text-amber-300">
            <strong>Note:</strong> Sizes shown are nominal (exterior). Internal lining of {insulation}" 
            reduces effective interior dimensions. Actual airflow area is calculated using interior dimensions.
          </div>
        )}
      </div>
      
      {/* Quick Reference */}
      <div className="mt-6 bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Quick Reference</h3>
        
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="text-surface-400 font-medium mb-2">Typical Friction Rates</h4>
            <ul className="space-y-1 text-surface-300">
              <li>• Low velocity systems: 0.05 - 0.08 in w.g./100ft</li>
              <li>• Medium velocity: 0.08 - 0.10 in w.g./100ft</li>
              <li>• High velocity: 0.10 - 0.15 in w.g./100ft</li>
            </ul>
          </div>
          <div>
            <h4 className="text-surface-400 font-medium mb-2">Recommended Velocities</h4>
            <ul className="space-y-1 text-surface-300">
              <li>• Main ducts: 1200 - 1800 FPM</li>
              <li>• Branch ducts: 800 - 1200 FPM</li>
              <li>• Flexible ducts: 800 FPM max</li>
              <li>• Above occupied: 1000 FPM max (noise)</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Coming Soon */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-surface-800/50 rounded-xl border border-surface-700 p-6 text-center opacity-60">
          <div className="text-3xl mb-2">📏</div>
          <div className="text-white font-medium">Duct Pressure Drop</div>
          <div className="text-sm text-surface-400">Coming Soon</div>
        </div>
        <div className="bg-surface-800/50 rounded-xl border border-surface-700 p-6 text-center opacity-60">
          <div className="text-3xl mb-2">🔧</div>
          <div className="text-white font-medium">Pipe Pressure Drop</div>
          <div className="text-sm text-surface-400">Coming Soon</div>
        </div>
      </div>
    </div>
  )
}
