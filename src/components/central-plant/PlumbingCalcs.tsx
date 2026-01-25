import type { CalculationResults, ZoneFixtures } from '../../types'
import { fixtureUnits } from '../../data/defaults'

interface PlumbingCalcsProps {
  results: CalculationResults
  fixtures: ZoneFixtures
}

export default function PlumbingCalcs({ results, fixtures }: PlumbingCalcsProps) {
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
        <p className="text-sm text-surface-400 mt-1">WSFU/DFU method with Hunter's Curve</p>
      </div>

      <div className="p-6 space-y-6">
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

        {/* Results */}
        <div className="bg-surface-900 rounded-lg p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-surface-300 mb-2">Water Supply</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Total WSFU:</span>
                <span className="text-cyan-400 font-mono">{plumbing.totalWSFU}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Peak Flow:</span>
                <span className="text-white font-mono">{plumbing.peakGPM} GPM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Water Meter:</span>
                <span className="text-white font-mono">{plumbing.recommendedMeterSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Cold Water Main:</span>
                <span className="text-white font-mono">{plumbing.coldWaterMainSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Hot Water Main:</span>
                <span className="text-white font-mono">{plumbing.hotWaterMainSize}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-surface-700 pt-4">
            <h4 className="text-sm font-medium text-surface-300 mb-2">Drainage</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Total DFU:</span>
                <span className="text-amber-400 font-mono">{plumbing.totalDFU}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Building Drain:</span>
                <span className="text-white font-mono">{plumbing.recommendedDrainSize}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="text-xs text-surface-500">
          <p>* WSFU values based on IPC/UPC public use fixtures</p>
          <p>* GPM conversion uses Hunter's Curve approximation</p>
        </div>
      </div>
    </div>
  )
}
