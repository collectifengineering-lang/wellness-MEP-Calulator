import { usePlumbingStore } from '../../../store/usePlumbingStore'
import { NYC_FIXTURE_DATABASE } from '../../../data/nycFixtures'
import { calculatePlumbing } from '../../../calculations/plumbing'
import { getLegacyFixtureCounts } from '../../../data/fixtureUtils'

export default function PipeSizingCalc() {
  const { spaces, currentProject, updateProjectSettings } = usePlumbingStore()
  const settings = currentProject?.settings

  if (!settings) return null

  // Aggregate fixtures
  const aggregatedFixtures = spaces.reduce((acc, space) => {
    const legacy = getLegacyFixtureCounts(space.fixtures)
    return {
      showers: acc.showers + legacy.showers,
      lavs: acc.lavs + legacy.lavs,
      wcs: acc.wcs + legacy.wcs,
      floorDrains: acc.floorDrains + legacy.floorDrains,
      serviceSinks: acc.serviceSinks + legacy.serviceSinks,
      washingMachines: acc.washingMachines + legacy.washingMachines,
      dryers: acc.dryers + legacy.dryers,
    }
  }, { showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0 })

  // Calculate totals
  let totalWSFU = 0
  let totalDFU = 0
  spaces.forEach(space => {
    Object.entries(space.fixtures).forEach(([fixtureId, count]) => {
      if (count <= 0) return
      const fixture = NYC_FIXTURE_DATABASE.find(f => f.id === fixtureId)
      if (fixture) {
        totalWSFU += (fixture.wsfuTotal || 0) * count
        totalDFU += fixture.dfu * count
      }
    })
  })

  // Calculate pipe sizes with HW ratio setting
  const plumbingResult = calculatePlumbing(aggregatedFixtures, {
    coldWaterVelocityFPS: settings.coldWaterVelocityFps,
    hotWaterVelocityFPS: settings.hotWaterVelocityFps,
    hotWaterFlowRatio: settings.hotWaterFlowRatio ?? 0.6,
    useCalculatedHWRatio: settings.useCalculatedHWRatio ?? true,
  })

  // Pipe size tables
  const pipeSizes = [
    { size: '3/4"', maxWSFU: 14, maxGPM: 8 },
    { size: '1"', maxWSFU: 30, maxGPM: 15 },
    { size: '1-1/4"', maxWSFU: 55, maxGPM: 27 },
    { size: '1-1/2"', maxWSFU: 85, maxGPM: 40 },
    { size: '2"', maxWSFU: 150, maxGPM: 70 },
    { size: '2-1/2"', maxWSFU: 250, maxGPM: 115 },
    { size: '3"', maxWSFU: 420, maxGPM: 175 },
    { size: '4"', maxWSFU: 750, maxGPM: 300 },
  ]

  const drainSizes = [
    { size: '2"', maxDFU: 21 },
    { size: '3"', maxDFU: 42 },
    { size: '4"', maxDFU: 216 },
    { size: '5"', maxDFU: 428 },
    { size: '6"', maxDFU: 720 },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Pipe Sizing Calculator 📏🐐</h2>
        <p className="text-surface-400">
          Water supply and drainage pipe sizing based on fixture units and velocity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">⚙️ Design Parameters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Cold Water Velocity (FPS)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.coldWaterVelocityFps}
                  onChange={(e) => updateProjectSettings({ coldWaterVelocityFps: parseFloat(e.target.value) || 8 })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
                <p className="text-xs text-surface-500 mt-1">Recommended: 4-8 FPS</p>
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Hot Water Velocity (FPS)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.hotWaterVelocityFps}
                  onChange={(e) => updateProjectSettings({ hotWaterVelocityFps: parseFloat(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
                <p className="text-xs text-surface-500 mt-1">Recommended: 4-5 FPS</p>
              </div>

              {/* HW/Total Flow Ratio */}
              <div className="pt-4 border-t border-surface-600">
                <label className="block text-sm text-surface-400 mb-2">HW/Total Flow Ratio</label>
                
                {/* Toggle for calculated vs manual */}
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={settings.useCalculatedHWRatio ?? true}
                    onChange={(e) => updateProjectSettings({ useCalculatedHWRatio: e.target.checked })}
                    className="w-4 h-4 rounded bg-surface-700 border-surface-600 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-xs text-surface-300">Calculate from fixture units</span>
                </label>
                
                {(settings.useCalculatedHWRatio ?? true) ? (
                  <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-400">Calculated (ASPE):</span>
                      <span className="text-emerald-300 font-mono font-bold text-lg">
                        {plumbingResult.calculatedHWRatio?.toFixed(2) ?? '—'}
                      </span>
                    </div>
                    {plumbingResult.wsfuCold !== undefined && plumbingResult.wsfuHot !== undefined && (
                      <div className="text-xs text-emerald-500/80 mt-2">
                        Hot WSFU: {plumbingResult.wsfuHot} / Total: {(plumbingResult.wsfuCold + plumbingResult.wsfuHot).toFixed(1)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      step="0.05"
                      min="0.3"
                      max="0.9"
                      value={settings.hotWaterFlowRatio ?? 0.6}
                      onChange={(e) => updateProjectSettings({ hotWaterFlowRatio: parseFloat(e.target.value) || 0.6 })}
                      className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    />
                    <p className="text-xs text-surface-500 mt-1">Manual: 0.3 - 0.9 typical</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary */}
            <div className="mt-6 pt-4 border-t border-surface-700">
              <h4 className="text-sm font-medium text-surface-300 mb-3">Project Totals</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-400">Total WSFU</span>
                  <span className="text-pink-400 font-medium">{Math.round(totalWSFU)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Total DFU</span>
                  <span className="text-blue-400 font-medium">{Math.round(totalDFU)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Peak GPM</span>
                  <span className="text-cyan-400 font-medium">{plumbingResult.peakGPM.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recommended Sizes */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-800 border border-cyan-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-cyan-400 mb-1">{plumbingResult.coldWaterMainSize}"</p>
              <p className="text-sm text-surface-400">Cold Water Main</p>
              <p className="text-xs text-surface-500 mt-1">
                {plumbingResult.coldActualVelocityFPS?.toFixed(1) || '—'} FPS
              </p>
            </div>
            <div className="bg-surface-800 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-orange-400 mb-1">{plumbingResult.hotWaterMainSize}"</p>
              <p className="text-sm text-surface-400">Hot Water Main</p>
              <p className="text-xs text-surface-500 mt-1">
                {plumbingResult.hotActualVelocityFPS?.toFixed(1) || '—'} FPS
              </p>
            </div>
            <div className="bg-surface-800 border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-400 mb-1">{plumbingResult.recommendedDrainSize}"</p>
              <p className="text-sm text-surface-400">Sanitary Main</p>
              <p className="text-xs text-surface-500 mt-1">{Math.round(totalDFU)} DFU</p>
            </div>
          </div>

          {/* Water Pipe Reference Table */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-700 bg-surface-700/50">
              <h3 className="font-semibold text-white">Water Pipe Sizing Reference</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-surface-400">
                  <th className="px-4 py-2 text-left">Pipe Size</th>
                  <th className="px-4 py-2 text-center">Max WSFU</th>
                  <th className="px-4 py-2 text-center">Max GPM</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {pipeSizes.map((pipe) => {
                  const isSelected = pipe.size === plumbingResult.coldWaterMainSize || pipe.size === plumbingResult.hotWaterMainSize
                  const isAdequate = totalWSFU <= pipe.maxWSFU
                  
                  return (
                    <tr 
                      key={pipe.size} 
                      className={`border-b border-surface-700/30 ${isSelected ? 'bg-cyan-500/10' : ''}`}
                    >
                      <td className="px-4 py-2 text-white font-medium">{pipe.size}</td>
                      <td className="px-4 py-2 text-center text-surface-400">{pipe.maxWSFU}</td>
                      <td className="px-4 py-2 text-center text-surface-400">{pipe.maxGPM}</td>
                      <td className="px-4 py-2 text-center">
                        {isSelected ? (
                          <span className="text-cyan-400 font-medium">✓ Selected</span>
                        ) : isAdequate ? (
                          <span className="text-emerald-400">OK</span>
                        ) : (
                          <span className="text-red-400">Under</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Drain Pipe Reference Table */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-700 bg-surface-700/50">
              <h3 className="font-semibold text-white">Drainage Pipe Sizing Reference</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-surface-400">
                  <th className="px-4 py-2 text-left">Pipe Size</th>
                  <th className="px-4 py-2 text-center">Max DFU</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {drainSizes.map((pipe) => {
                  const isSelected = pipe.size === plumbingResult.recommendedDrainSize
                  const isAdequate = totalDFU <= pipe.maxDFU
                  
                  return (
                    <tr 
                      key={pipe.size} 
                      className={`border-b border-surface-700/30 ${isSelected ? 'bg-amber-500/10' : ''}`}
                    >
                      <td className="px-4 py-2 text-white font-medium">{pipe.size}</td>
                      <td className="px-4 py-2 text-center text-surface-400">{pipe.maxDFU}</td>
                      <td className="px-4 py-2 text-center">
                        {isSelected ? (
                          <span className="text-amber-400 font-medium">✓ Selected</span>
                        ) : isAdequate ? (
                          <span className="text-emerald-400">OK</span>
                        ) : (
                          <span className="text-red-400">Under</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
