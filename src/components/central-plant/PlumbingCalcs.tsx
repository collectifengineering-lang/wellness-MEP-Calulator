import type { CalculationResults, ZoneFixtures, FixtureOverride } from '../../types'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useProjectStore } from '../../store/useProjectStore'
import { NYC_FIXTURE_DATABASE } from '../../data/nycFixtures'

interface PlumbingCalcsProps {
  results: CalculationResults
  fixtures: ZoneFixtures
}

// Helper to get fixture info from database WITH overrides applied
function getFixtureInfo(fixtureId: string, overrides?: FixtureOverride[]) {
  const fixture = NYC_FIXTURE_DATABASE.find(f => f.id === fixtureId)
  if (fixture) {
    // Check for override
    const override = overrides?.find(o => o.fixtureId === fixtureId)
    const wsfuCold = override?.wsfuCold ?? fixture.wsfuCold
    const wsfuHot = override?.wsfuHot ?? fixture.wsfuHot
    const dfu = override?.dfu ?? fixture.dfu
    const hasOverride = override !== undefined
    
    return {
      name: fixture.name,
      wsfu: wsfuCold + (wsfuHot || 0),
      dfu: dfu,
      hasOverride,
      originalWsfu: fixture.wsfuCold + (fixture.wsfuHot || 0),
      originalDfu: fixture.dfu,
    }
  }
  // Fallback for unknown fixtures
  return { 
    name: fixtureId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
    wsfu: 1, 
    dfu: 1,
    hasOverride: false,
    originalWsfu: 1,
    originalDfu: 1,
  }
}

export default function PlumbingCalcs({ results, fixtures }: PlumbingCalcsProps) {
  const { plumbing: plumbingSettings, updatePlumbingSettings } = useSettingsStore()
  const { currentProject } = useProjectStore()
  const { plumbing } = results
  
  // Get fixture overrides from project
  const fixtureOverrides = currentProject?.fixtureOverrides

  // Build fixture breakdown from actual fixture IDs (preserves specific types)
  const fixtureBreakdown = Object.entries(fixtures)
    .filter(([_, count]) => typeof count === 'number' && count > 0)
    .map(([fixtureId, count]) => {
      const info = getFixtureInfo(fixtureId, fixtureOverrides)
      return {
        id: fixtureId,
        name: info.name,
        count: count as number,
        wsfu: info.wsfu,
        dfu: info.dfu,
        hasOverride: info.hasOverride,
        originalWsfu: info.originalWsfu,
        originalDfu: info.originalDfu,
      }
    })
    .sort((a, b) => (b.count * b.wsfu) - (a.count * a.wsfu)) // Sort by total WSFU contribution

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-700">
        <h3 className="text-lg font-semibold text-white">Plumbing Calculations</h3>
        <p className="text-sm text-surface-400 mt-1">WSFU/DFU method with velocity-based pipe sizing</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Pipe Sizing Settings - Separate for Hot and Cold */}
        <div className="bg-surface-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-surface-300 mb-3">🔧 Pipe Sizing Parameters</h4>
          <div className="grid grid-cols-3 gap-4">
            {/* Cold Water Velocity */}
            <div>
              <label className="block text-xs text-surface-400 mb-1">Cold Water Velocity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={plumbingSettings.cold_water_velocity_fps}
                  onChange={(e) => updatePlumbingSettings({ cold_water_velocity_fps: Number(e.target.value) })}
                  min={2}
                  max={10}
                  step={0.5}
                  className="flex-1 px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
                <span className="text-surface-400 text-sm">FPS</span>
              </div>
              <p className="text-xs text-surface-500 mt-1">Typical: 5-8 FPS</p>
            </div>
            
            {/* Hot Water Velocity */}
            <div>
              <label className="block text-xs text-surface-400 mb-1">Hot Water Velocity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={plumbingSettings.hot_water_velocity_fps}
                  onChange={(e) => updatePlumbingSettings({ hot_water_velocity_fps: Number(e.target.value) })}
                  min={2}
                  max={8}
                  step={0.5}
                  className="flex-1 px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
                <span className="text-surface-400 text-sm">FPS</span>
              </div>
              <p className="text-xs text-surface-500 mt-1">Typical: 3-5 FPS (lower for HW)</p>
            </div>
            
            {/* HW/CW Flow Ratio */}
            <div>
              <label className="block text-xs text-surface-400 mb-1">HW/Total Flow Ratio</label>
              
              {/* Toggle for calculated vs manual */}
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plumbingSettings.use_calculated_hw_ratio ?? true}
                    onChange={(e) => updatePlumbingSettings({ use_calculated_hw_ratio: e.target.checked })}
                    className="w-4 h-4 rounded bg-surface-700 border-surface-600 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-xs text-surface-300">Use calculated from fixtures</span>
                </label>
              </div>
              
              {plumbingSettings.use_calculated_hw_ratio ? (
                <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400">From Fixture Units (ASPE):</span>
                    <span className="text-emerald-300 font-mono font-bold">
                      {plumbing.calculatedHWRatio !== undefined ? plumbing.calculatedHWRatio.toFixed(2) : '—'}
                    </span>
                  </div>
                  {plumbing.wsfuCold !== undefined && plumbing.wsfuHot !== undefined && (
                    <div className="text-xs text-emerald-500/80 mt-1">
                      WSFU: {plumbing.wsfuHot} hot / {(plumbing.wsfuCold + plumbing.wsfuHot).toFixed(1)} total
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={plumbingSettings.hot_water_flow_ratio}
                    onChange={(e) => updatePlumbingSettings({ hot_water_flow_ratio: Number(e.target.value) })}
                    min={0.3}
                    max={0.9}
                    step={0.05}
                    className="flex-1 px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                  />
                  <span className="text-surface-400 text-sm">×</span>
                </div>
              )}
              <p className="text-xs text-surface-500 mt-1">
                {plumbingSettings.use_calculated_hw_ratio 
                  ? 'Ratio = Hot WSFU / Total WSFU'
                  : 'HW flow = Total × ratio'}
              </p>
            </div>
          </div>
          
          {/* Explanation */}
          <div className="mt-3 text-xs text-surface-500 bg-surface-900 rounded p-2">
            <strong className="text-surface-400">Note:</strong> Hot water pipes use lower velocity (3-5 FPS) to reduce erosion and noise.
            {plumbingSettings.use_calculated_hw_ratio 
              ? ' Calculated ratio uses fixture WSFU values per ASPE methodology.'
              : ' Manual ratio allows custom override (typical: 0.5-0.7).'}
          </div>
        </div>

        {/* Fixture Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left py-2 text-surface-400 font-medium">Fixture</th>
                <th className="text-right py-2 text-surface-400 font-medium">Qty</th>
                <th className="text-right py-2 text-surface-400 font-medium">WSFU ea.</th>
                <th className="text-right py-2 text-surface-400 font-medium">DFU ea.</th>
                <th className="text-right py-2 text-surface-400 font-medium">Total WSFU</th>
                <th className="text-right py-2 text-surface-400 font-medium">Total DFU</th>
              </tr>
            </thead>
            <tbody>
              {fixtureBreakdown.map((fixture, idx) => (
                <tr key={idx} className={`border-b border-surface-700/50 ${fixture.hasOverride ? 'bg-amber-900/10' : ''}`}>
                  <td className="py-2 text-white">
                    {fixture.name}
                    {fixture.hasOverride && (
                      <span className="ml-2 text-xs text-amber-400" title="Values overridden in Project Info">⚡</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-surface-300 font-mono">{fixture.count}</td>
                  <td className={`py-2 text-right font-mono ${fixture.hasOverride && fixture.wsfu !== fixture.originalWsfu ? 'text-amber-400' : 'text-surface-300'}`}>
                    {fixture.wsfu}
                    {fixture.hasOverride && fixture.wsfu !== fixture.originalWsfu && (
                      <span className="text-xs text-surface-500 ml-1">({fixture.originalWsfu})</span>
                    )}
                  </td>
                  <td className={`py-2 text-right font-mono ${fixture.hasOverride && fixture.dfu !== fixture.originalDfu ? 'text-amber-400' : 'text-surface-300'}`}>
                    {fixture.dfu}
                    {fixture.hasOverride && fixture.dfu !== fixture.originalDfu && (
                      <span className="text-xs text-surface-500 ml-1">({fixture.originalDfu})</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-cyan-400 font-mono">{(fixture.count * fixture.wsfu).toFixed(1)}</td>
                  <td className="py-2 text-right text-amber-400 font-mono">{fixture.count * fixture.dfu}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-900">
                <td colSpan={4} className="py-2 text-white font-semibold">Total</td>
                <td className="py-2 text-right text-cyan-400 font-mono font-semibold">{plumbing.totalWSFU}</td>
                <td className="py-2 text-right text-amber-400 font-mono font-semibold">{plumbing.totalDFU}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Results - Water Supply */}
        <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-cyan-400 mb-3">💧 Water Supply Sizing</h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Cold Water */}
            <div className="bg-surface-900/50 rounded-lg p-3">
              <div className="text-xs text-surface-400 mb-2 uppercase tracking-wider">Cold Water</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-300">Flow Rate:</span>
                  <span className="text-white font-mono">{plumbing.coldWaterGPM || plumbing.peakGPM} GPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-300">Main Size:</span>
                  <span className="text-cyan-400 font-mono font-semibold">{plumbing.coldWaterMainSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-300">Actual Velocity:</span>
                  <span className={`font-mono ${
                    (plumbing.coldActualVelocityFPS || 0) > 8 ? 'text-red-400' : 
                    (plumbing.coldActualVelocityFPS || 0) < 3 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {plumbing.coldActualVelocityFPS?.toFixed(1) || '—'} FPS
                  </span>
                </div>
              </div>
            </div>
            
            {/* Hot Water */}
            <div className="bg-surface-900/50 rounded-lg p-3">
              <div className="text-xs text-surface-400 mb-2 uppercase tracking-wider">Hot Water</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-300">Flow Rate:</span>
                  <span className="text-white font-mono">{plumbing.hotWaterGPM || Math.round(plumbing.peakGPM * 0.6)} GPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-300">Main Size:</span>
                  <span className="text-orange-400 font-mono font-semibold">{plumbing.hotWaterMainSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-300">Actual Velocity:</span>
                  <span className={`font-mono ${
                    (plumbing.hotActualVelocityFPS || 0) > 8 ? 'text-red-400' : 
                    (plumbing.hotActualVelocityFPS || 0) < 3 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {plumbing.hotActualVelocityFPS?.toFixed(1) || '—'} FPS
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Velocity Guide */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-surface-400">Velocity Guide:</span>
            <span className="text-amber-400">{'<'}3 FPS = Slow (oversized)</span>
            <span className="text-green-400">3-8 FPS = Optimal</span>
            <span className="text-red-400">{'>'}8 FPS = High (noise/erosion risk)</span>
          </div>
        </div>

        {/* Results - Drainage */}
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-amber-400 mb-3">🚽 Sanitary / Drainage</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-300">Total DFU:</span>
              <span className="text-amber-400 font-mono">{plumbing.totalDFU}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-300">Building Drain:</span>
              <span className="text-white font-mono font-semibold">{plumbing.recommendedDrainSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-300">Water Meter:</span>
              <span className="text-white font-mono">{plumbing.recommendedMeterSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-300">Peak GPM:</span>
              <span className="text-white font-mono">{plumbing.peakGPM} GPM</span>
            </div>
          </div>
        </div>

        {/* Override Notice */}
        {fixtureOverrides && fixtureOverrides.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <span className="text-amber-400">⚡</span>
            <div>
              <p className="text-sm text-amber-300 font-medium">Fixture Overrides Active</p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                {fixtureOverrides.length} fixture type(s) have custom WSFU/DFU values. 
                Values shown in <span className="text-amber-400">amber</span> are overridden (original in parentheses).
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="text-xs text-surface-500 space-y-1">
          <p>* WSFU/DFU values per NYC Plumbing Code Table P-202.1</p>
          <p>* GPM conversion uses Hunter's Curve approximation</p>
          <p>* Pipe sizing formula: d = √(GPM × 0.408 / V)</p>
          <p>* Cold water design velocity: {plumbingSettings.cold_water_velocity_fps} FPS</p>
          <p>* Hot water design velocity: {plumbingSettings.hot_water_velocity_fps} FPS</p>
          <p>* HW/CW flow ratio: {plumbingSettings.use_calculated_hw_ratio ? 'Calculated from fixtures' : plumbingSettings.hot_water_flow_ratio}</p>
        </div>
      </div>
    </div>
  )
}
