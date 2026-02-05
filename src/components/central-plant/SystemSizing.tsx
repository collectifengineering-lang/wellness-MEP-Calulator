import type { CalculationResults } from '../../types'
import { useProjectStore } from '../../store/useProjectStore'

interface SystemSizingProps {
  results: CalculationResults
}

export default function SystemSizing({ results }: SystemSizingProps) {
  const { currentProject, updateProject, zones } = useProjectStore()
  
  if (!currentProject) return null

  const { electrical, hvac, gas, plumbing } = results
  const totalSF = zones.reduce((sum, z) => sum + z.sf, 0)

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Preliminary System Sizing</h3>
          <p className="text-sm text-surface-400 mt-1">Recommended utility service sizes</p>
        </div>
        
        {/* Contingency Slider */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-400">Contingency:</span>
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={currentProject.contingency * 100}
            onChange={(e) => updateProject({ contingency: Number(e.target.value) / 100 })}
            className="w-32 accent-primary-500"
          />
          <span className="text-sm font-mono text-primary-400 w-12">
            {(currentProject.contingency * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Electrical */}
          <div className="bg-surface-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-medium text-white">Electrical</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Service:</span>
                <span className="text-white font-mono">{electrical.recommendedService}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Total Load:</span>
                <span className="text-amber-400 font-mono">{electrical.totalKVA.toLocaleString()} kVA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">480V:</span>
                <span className="text-surface-300 font-mono">{electrical.amps_480v.toLocaleString()}A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">208V:</span>
                <span className="text-surface-300 font-mono">{electrical.amps_208v.toLocaleString()}A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Panels:</span>
                <span className="text-surface-300 font-mono">~{electrical.panelCount}</span>
              </div>
            </div>
          </div>

          {/* HVAC */}
          <div className="bg-surface-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="font-medium text-white">HVAC</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Space Cooling:</span>
                <span className="text-cyan-400 font-mono">{hvac.totalTons} Tons</span>
              </div>
              {hvac.poolChillerTons > 0 && (
                <div className="flex justify-between pl-2">
                  <span className="text-surface-500">└ Pool Chiller:</span>
                  <span className="text-blue-400 font-mono">{hvac.poolChillerTons} Tons</span>
                </div>
              )}
              {hvac.dehumidLbHr > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-surface-400">Dehumidification:</span>
                    <span className="text-purple-400 font-mono">{hvac.dehumidLbHr} lb/hr</span>
                  </div>
                  <div className="flex justify-between pl-2">
                    <span className="text-surface-500">└ Est. Cooling:</span>
                    <span className="text-purple-300 font-mono">{hvac.dehumidTons} Tons</span>
                  </div>
                </>
              )}
              {hvac.totalPlantTons !== hvac.totalTons && (
                <div className="flex justify-between border-t border-surface-700 pt-2 mt-2">
                  <span className="text-surface-300 font-medium">Total Plant:</span>
                  <span className="text-white font-mono font-medium">{hvac.totalPlantTons} Tons</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-surface-400">SF/Ton:</span>
                <span className="text-surface-300 font-mono">
                  {hvac.totalPlantTons > 0 ? Math.round(totalSF / hvac.totalPlantTons).toLocaleString() : '—'} SF/Ton
                </span>
              </div>
              <div className="flex justify-between border-t border-surface-700 pt-2 mt-2">
                <span className="text-surface-400">Heating:</span>
                <span className="text-orange-400 font-mono">{hvac.totalMBH.toLocaleString()} MBH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Ventilation:</span>
                <span className="text-surface-300 font-mono">{hvac.totalVentCFM.toLocaleString()} CFM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Exhaust:</span>
                <span className="text-surface-300 font-mono">{hvac.totalExhaustCFM.toLocaleString()} CFM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">RTUs:</span>
                <span className="text-surface-300 font-mono">~{hvac.rtuCount}</span>
              </div>
            </div>
          </div>

          {/* Gas */}
          <div className="bg-surface-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <h4 className="font-medium text-white">Gas</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Total Load:</span>
                <span className="text-orange-400 font-mono">{gas.totalCFH.toLocaleString()} CFH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Pressure:</span>
                <span className="text-white font-mono">{gas.recommendedPressure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Service Pipe:</span>
                <span className="text-surface-300 font-mono">{gas.recommendedPipeSize}</span>
              </div>
            </div>
          </div>

          {/* Plumbing */}
          <div className="bg-surface-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h4 className="font-medium text-white">Plumbing</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Water Meter:</span>
                <span className="text-white font-mono">{plumbing.recommendedMeterSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Peak Flow:</span>
                <span className="text-blue-400 font-mono">{plumbing.peakGPM} GPM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Cold Main:</span>
                <span className="text-surface-300 font-mono">{plumbing.coldWaterMainSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Building Drain:</span>
                <span className="text-surface-300 font-mono">{plumbing.recommendedDrainSize}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
