import { useMemo } from 'react'
import { useHVACStore } from '../../../store/useHVACStore'
import { calculateProjectVentilation } from '../../../calculations/ventilation'

export default function VentilationSummary() {
  const { currentProject, spaces, zones, systems } = useHVACStore()
  
  const results = useMemo(() => {
    if (!currentProject?.settings) return null
    return calculateProjectVentilation(spaces, zones, systems, currentProject.settings)
  }, [currentProject?.settings, spaces, zones, systems])
  
  if (!results) {
    return (
      <div className="p-6 text-center text-surface-400">
        <div className="text-4xl mb-4">🐐💨</div>
        Configure project settings to see ventilation calculations - this GOAT needs to know where it's breathing!
      </div>
    )
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Ventilation Summary</h2>
        <p className="text-surface-400">ASHRAE 62.1 Ventilation Rate Procedure Results</p>
      </div>
      
      {/* Design Conditions */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">📍 Design Conditions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-surface-400">Location</div>
            <div className="text-white font-medium">{results.locationName}</div>
          </div>
          <div>
            <div className="text-sm text-surface-400">Cooling Design</div>
            <div className="text-cyan-400 font-medium">{results.coolingDb}°F DB / {results.coolingWb}°F WB</div>
          </div>
          <div>
            <div className="text-sm text-surface-400">Heating Design</div>
            <div className="text-amber-400 font-medium">{results.heatingDb}°F DB</div>
          </div>
          <div>
            <div className="text-sm text-surface-400">Altitude Factor</div>
            <div className="text-white font-medium">{results.altitudeCorrection}</div>
          </div>
        </div>
      </div>
      
      {/* Project Totals */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📊 Project Totals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400">{results.totalVot.toLocaleString()}</div>
            <div className="text-sm text-surface-400">Total OA (CFM)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{results.totalExhaustCfm.toLocaleString()}</div>
            <div className="text-sm text-surface-400">Total Exhaust (CFM)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{results.totalCoolingTons}</div>
            <div className="text-sm text-surface-400">Vent Cooling (Tons)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-400">{results.totalHeatingMbh}</div>
            <div className="text-sm text-surface-400">Vent Heating (MBH)</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-surface-600 grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-surface-400">Total Area:</span>
            <span className="text-white">{results.totalAreaSf.toLocaleString()} SF</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-400">Total Occupancy:</span>
            <span className="text-white">{results.totalOccupancy} people</span>
          </div>
        </div>
      </div>
      
      {/* Systems Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">🌀 Systems</h3>
        
        {results.systems.length === 0 ? (
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-8 text-center">
            <div className="text-4xl mb-2">🐐💨🌀</div>
            <div className="text-surface-400">No systems configured - this GOAT is holding its breath!</div>
            <div className="text-sm text-surface-500 mt-1">Add systems in the Zones & Systems tab to let it breathe</div>
          </div>
        ) : (
          results.systems.map(system => (
            <div key={system.systemId} className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
              {/* System Header */}
              <div className="p-4 bg-purple-900/30 border-b border-surface-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-purple-400">{system.systemName}</h4>
                    <div className="text-sm text-surface-400">
                      {system.systemType === 'single_zone' && 'Single Zone'}
                      {system.systemType === 'vav_multi_zone' && 'VAV Multi-Zone'}
                      {system.systemType === 'doas_100_oa' && 'DOAS (100% OA)'}
                      {system.ervEnabled && ` • ERV (${Math.round(system.ervSavings)} CFM saved)`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{system.Vot.toLocaleString()} CFM</div>
                    <div className="text-xs text-surface-400">Outdoor Air (Vot)</div>
                  </div>
                </div>
              </div>
              
              {/* System Stats */}
              <div className="p-4 grid grid-cols-4 gap-4 text-sm border-b border-surface-700">
                <div>
                  <div className="text-surface-400">Vou (uncorrected)</div>
                  <div className="text-white font-medium">{system.Vou.toLocaleString()} CFM</div>
                </div>
                <div>
                  <div className="text-surface-400">System Efficiency (Ev)</div>
                  <div className="text-white font-medium">{(system.Ev * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-surface-400">Diversity</div>
                  <div className="text-white font-medium">{(system.diversityFactor * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-surface-400">Exhaust</div>
                  <div className="text-white font-medium">{system.totalExhaustCfm.toLocaleString()} CFM</div>
                </div>
              </div>
              
              {/* Loads */}
              <div className="p-4 grid grid-cols-3 gap-4 text-sm border-b border-surface-700 bg-surface-900/50">
                <div>
                  <div className="text-surface-400">Cooling Load</div>
                  <div className="text-cyan-400 font-medium">{system.coolingLoadTons} Tons</div>
                  <div className="text-xs text-surface-500">({system.coolingLoadBtuh.toLocaleString()} BTU/hr)</div>
                </div>
                <div>
                  <div className="text-surface-400">Heating Load</div>
                  <div className="text-amber-400 font-medium">{system.heatingLoadMbh} MBH</div>
                  <div className="text-xs text-surface-500">({system.heatingLoadBtuh.toLocaleString()} BTU/hr)</div>
                </div>
                <div>
                  <div className="text-surface-400">Latent Cooling</div>
                  <div className="text-blue-400 font-medium">{(system.latentCoolingBtuh / 12000).toFixed(1)} Tons</div>
                  <div className="text-xs text-surface-500">({system.latentCoolingBtuh.toLocaleString()} BTU/hr)</div>
                </div>
              </div>
              
              {/* Zones */}
              {system.zones.length > 0 && (
                <div className="p-4">
                  <div className="text-sm font-medium text-surface-400 mb-2">Zones ({system.zones.length})</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-surface-500 border-b border-surface-700">
                        <th className="pb-2">Zone</th>
                        <th className="pb-2 text-right">Area</th>
                        <th className="pb-2 text-right">Occ</th>
                        <th className="pb-2 text-right">Ez</th>
                        <th className="pb-2 text-right">Vbz</th>
                        <th className="pb-2 text-right">Voz</th>
                        <th className="pb-2 text-right">Exhaust</th>
                      </tr>
                    </thead>
                    <tbody>
                      {system.zones.map(zone => (
                        <tr key={zone.zoneId} className="border-b border-surface-700/50">
                          <td className="py-2 text-emerald-400">{zone.zoneName}</td>
                          <td className="py-2 text-right text-white">{zone.totalAreaSf.toLocaleString()}</td>
                          <td className="py-2 text-right text-white">{zone.totalOccupancy}</td>
                          <td className="py-2 text-right text-white">{zone.ez}</td>
                          <td className="py-2 text-right text-white">{zone.totalVbz}</td>
                          <td className="py-2 text-right text-cyan-400 font-medium">{zone.totalVoz}</td>
                          <td className="py-2 text-right text-red-400">{zone.totalExhaustCfm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Unassigned Spaces */}
      {results.unassignedSpaces.length > 0 && (
        <div className="bg-surface-800 rounded-xl border border-amber-700 p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-3">⚠️ Unassigned Spaces</h3>
          <p className="text-sm text-surface-400 mb-3">
            These spaces are not assigned to any zone and are calculated independently.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-500 border-b border-surface-700">
                <th className="pb-2">Space</th>
                <th className="pb-2">Type</th>
                <th className="pb-2 text-right">Area</th>
                <th className="pb-2 text-right">Occ</th>
                <th className="pb-2 text-right">Vbz</th>
                <th className="pb-2 text-right">Exhaust</th>
              </tr>
            </thead>
            <tbody>
              {results.unassignedSpaces.map(space => (
                <tr key={space.spaceId} className="border-b border-surface-700/50">
                  <td className="py-2 text-white">{space.spaceName}</td>
                  <td className="py-2 text-surface-400">{space.spaceType}</td>
                  <td className="py-2 text-right text-white">{space.areaSf}</td>
                  <td className="py-2 text-right text-white">{space.occupancy}</td>
                  <td className="py-2 text-right text-cyan-400">{space.Vbz}</td>
                  <td className="py-2 text-right text-red-400">{space.exhaustCfm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
