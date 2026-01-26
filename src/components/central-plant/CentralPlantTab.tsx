import { useProjectStore } from '../../store/useProjectStore'
import DHWCalculator from './DHWCalculator'
import PlumbingCalcs from './PlumbingCalcs'
import SystemSizing from './SystemSizing'
import ElectricalServiceSettings from './ElectricalServiceSettings'
import MechanicalLoads from './MechanicalLoads'
import type { CalculationResults, ZoneFixtures } from '../../types'

interface CentralPlantTabProps {
  calculations: {
    results: CalculationResults | null
    aggregatedFixtures: ZoneFixtures
    totalSF: number
  }
}

export default function CentralPlantTab({ calculations }: CentralPlantTabProps) {
  const { currentProject } = useProjectStore()
  const { results, aggregatedFixtures } = calculations

  if (!currentProject || !results) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-surface-400">Add zones in the Zone Builder tab to see central plant calculations</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-white">Central Plant</h2>
          <p className="text-surface-400 mt-1">Configure central plant equipment and view aggregated calculations</p>
        </div>

        {/* Electrical Service Settings */}
        <ElectricalServiceSettings results={results} />

        {/* Mechanical Equipment Loads */}
        <MechanicalLoads results={results} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DHW System */}
          <DHWCalculator results={results} fixtures={aggregatedFixtures} />

          {/* Plumbing Totals */}
          <PlumbingCalcs results={results} fixtures={aggregatedFixtures} />
        </div>

        {/* System Sizing */}
        <SystemSizing results={results} />

        {/* Gas Equipment Breakdown */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-700">
            <h3 className="text-lg font-semibold text-white">Gas Equipment Breakdown</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="text-left py-3 px-4 text-surface-400 font-medium">Equipment</th>
                    <th className="text-right py-3 px-4 text-surface-400 font-medium">MBH</th>
                    <th className="text-right py-3 px-4 text-surface-400 font-medium">CFH</th>
                  </tr>
                </thead>
                <tbody>
                  {results.gas.equipmentBreakdown.map((item, idx) => (
                    <tr key={idx} className="border-b border-surface-700/50">
                      <td className="py-3 px-4 text-white">{item.name}</td>
                      <td className="py-3 px-4 text-right text-surface-300 font-mono">{item.mbh.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-surface-300 font-mono">{item.cfh.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-900">
                    <td className="py-3 px-4 text-white font-semibold">Total</td>
                    <td className="py-3 px-4 text-right text-orange-400 font-mono font-semibold">
                      {results.gas.totalMBH.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-orange-400 font-mono font-semibold">
                      {results.gas.totalCFH.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
