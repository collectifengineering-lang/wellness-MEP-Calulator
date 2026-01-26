import type { CalculationResults, ZoneFixtures } from '../../types'
import { fixtureUnits } from '../../data/defaults'
import { useSettingsStore } from '../../store/useSettingsStore'

interface PlumbingCalcsProps {
  results: CalculationResults
  fixtures: ZoneFixtures
}

export default function PlumbingCalcs({ results, fixtures }: PlumbingCalcsProps) {
  const { plumbing: plumbingSettings, updatePlumbingSettings } = useSettingsStore()
  const { plumbing } = results

  // Calculate breakdown
  const fixtureBreakdown = [
    { name: 'Showers', count: fixtures.showers, wsfu: fixtureUnits.shower.wsfu, dfu: fixtureUnits.shower.dfu },
    { name: 'Lavatories', count: fixtures.lavs, wsfu: fixtureUnits.lavatory.wsfu, dfu: fixtureUnits.lavatory.dfu },
    { name: 'Water Closets', count: fixtures.wcs, wsfu: fixtureUnits.water_closet.wsfu, dfu: fixtureUnits.water_closet.dfu },
    { name: 'Floor Drains', count: fixtures.floorDrains, wsfu: fixtureUnits.floor_drain.wsfu, dfu: fixtureUnits.floor_drain.dfu },
    { name: 'Service Sinks', count: fixtures.serviceSinks, wsfu: fixtureUnits.service_sink.wsfu, dfu: fixtureUnits.service_sink.dfu },
    { name: 'Washing Machines', count: fixtures.washingMachines, wsfu: fixtureUnits.washing_machine.wsfu, dfu: fixtureUnits.washing_machine.dfu },
  ].filter(f => f.count > 0)

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-700">
        <h3 className="text-lg font-semibold text-white">Plumbing Calculations</h3>
        <p className="text-sm text-surface-400 mt-1">WSFU/DFU method with velocity-based pipe sizing</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Pipe Sizing Settings */}
        <div className="bg-surface-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-surface-300 mb-3">🔧 Pipe Sizing Parameters</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Design Velocity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={plumbingSettings.design_velocity_fps}
                  onChange={(e) => updatePlumbingSettings({ design_velocity_fps: Number(e.target.value) })}
                  min={2}
                  max={10}
                  step={0.5}
                  className="flex-1 px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
                <span className="text-surface-400 text-sm">FPS</span>
              </div>
              <p className="text-xs text-surface-500 mt-1">Typical: 4-8 FPS. Lower = quieter, larger pipes</p>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Hot Water Demand Factor</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={plumbingSettings.hot_water_demand_factor}
                  onChange={(e) => updatePlumbingSettings({ hot_water_demand_factor: Number(e.target.value) })}
                  min={0.3}
                  max={0.9}
                  step={0.05}
                  className="flex-1 px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
                <span className="text-surface-400 text-sm">×</span>
              </div>
              <p className="text-xs text-surface-500 mt-1">Hot water as fraction of cold water flow</p>
            </div>
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
                <tr key={idx} className="border-b border-surface-700/50">
                  <td className="py-2 text-white">{fixture.name}</td>
                  <td className="py-2 text-right text-surface-300 font-mono">{fixture.count}</td>
                  <td className="py-2 text-right text-surface-300 font-mono">{fixture.wsfu}</td>
                  <td className="py-2 text-right text-surface-300 font-mono">{fixture.dfu}</td>
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

        {/* Notes */}
        <div className="text-xs text-surface-500 space-y-1">
          <p>* WSFU values based on IPC/UPC public use fixtures</p>
          <p>* GPM conversion uses Hunter's Curve approximation</p>
          <p>* Pipe sizing formula: d = √(GPM × 0.408 / V)</p>
          <p>* Design velocity: {plumbingSettings.design_velocity_fps} FPS</p>
        </div>
      </div>
    </div>
  )
}
