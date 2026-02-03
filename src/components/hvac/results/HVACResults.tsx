import { useMemo, useState } from 'react'
import { useHVACStore, type HVACSpace } from '../../../store/useHVACStore'
import { calculateProjectVentilation } from '../../../calculations/ventilation'
import { ASHRAE62_SPACE_TYPES, calculateDefaultOccupancy } from '../../../data/ashrae62'

// Standalone fan aggregation
interface StandaloneFanSummary {
  tag: string
  type: 'exhaust' | 'supply'
  totalCfm: number
  spaces: { name: string; cfm: number }[]
}

function aggregateStandaloneFans(spaces: HVACSpace[]): StandaloneFanSummary[] {
  const exhaustFans: Record<string, StandaloneFanSummary> = {}
  const supplyFans: Record<string, StandaloneFanSummary> = {}
  
  spaces.forEach(space => {
    const volumeCF = space.areaSf * space.ceilingHeightFt
    
    // Exhaust fan
    if (space.exhaustFanTag) {
      const exhaustCfm = space.exhaustAch ? (volumeCF * space.exhaustAch) / 60 : 0
      if (!exhaustFans[space.exhaustFanTag]) {
        exhaustFans[space.exhaustFanTag] = {
          tag: space.exhaustFanTag,
          type: 'exhaust',
          totalCfm: 0,
          spaces: []
        }
      }
      exhaustFans[space.exhaustFanTag].totalCfm += exhaustCfm
      exhaustFans[space.exhaustFanTag].spaces.push({ name: space.name, cfm: Math.round(exhaustCfm) })
    }
    
    // Supply fan
    if (space.supplyFanTag) {
      const supplyCfm = space.supplyAch ? (volumeCF * space.supplyAch) / 60 : 0
      if (!supplyFans[space.supplyFanTag]) {
        supplyFans[space.supplyFanTag] = {
          tag: space.supplyFanTag,
          type: 'supply',
          totalCfm: 0,
          spaces: []
        }
      }
      supplyFans[space.supplyFanTag].totalCfm += supplyCfm
      supplyFans[space.supplyFanTag].spaces.push({ name: space.name, cfm: Math.round(supplyCfm) })
    }
  })
  
  return [
    ...Object.values(exhaustFans),
    ...Object.values(supplyFans)
  ].sort((a, b) => a.tag.localeCompare(b.tag))
}

export default function HVACResults() {
  const { currentProject, spaces, zones, systems } = useHVACStore()
  const [activeTab, setActiveTab] = useState<'summary' | 'spaces' | 'systems' | 'fans' | 'comparison'>('summary')
  
  const results = useMemo(() => {
    if (!currentProject?.settings) return null
    return calculateProjectVentilation(spaces, zones, systems, currentProject.settings)
  }, [currentProject?.settings, spaces, zones, systems])
  
  // Aggregate standalone fans
  const standaloneFans = useMemo(() => aggregateStandaloneFans(spaces), [spaces])
  
  if (!results) {
    return (
      <div className="p-6 text-center text-surface-400">
        Configure project settings to see results
      </div>
    )
  }
  
  // Build space schedule with code comparison
  const spaceSchedule = spaces.map(space => {
    const spaceType = ASHRAE62_SPACE_TYPES.find(st => st.id === space.spaceType)
    const zone = zones.find(z => z.id === space.zoneId)
    const system = zone ? systems.find(s => s.id === zone.systemId) : null
    const occupancy = space.occupancyOverride ?? calculateDefaultOccupancy(space.spaceType || 'office_space', space.areaSf)
    
    // Code minimum (ASHRAE 62.1 defaults)
    const codeRp = spaceType?.Rp ?? 5
    const codeRa = spaceType?.Ra ?? 0.06
    const codeVbz = (codeRp * occupancy) + (codeRa * space.areaSf)
    
    // Actual (with overrides)
    const actualRp = space.rpOverride ?? codeRp
    const actualRa = space.raOverride ?? codeRa
    const actualVbz = (actualRp * occupancy) + (actualRa * space.areaSf)
    
    // ACH-based (if specified)
    const volumeCF = space.areaSf * space.ceilingHeightFt
    const ventilationCfmFromAch = space.ventilationAch ? (volumeCF * space.ventilationAch) / 60 : null
    const exhaustCfmFromAch = space.exhaustAch ? (volumeCF * space.exhaustAch) / 60 : null
    const supplyCfmFromAch = space.supplyAch ? (volumeCF * space.supplyAch) / 60 : null
    
    // Final values
    const finalVbz = ventilationCfmFromAch ?? actualVbz
    const ez = zone?.ez ?? 1.0
    const Voz = finalVbz / ez
    
    // Compliance check
    const meetsCode = finalVbz >= codeVbz * 0.99 // Allow 1% tolerance
    
    return {
      ...space,
      spaceTypeName: spaceType?.displayName || space.spaceType || 'Unknown',
      zoneName: zone?.name || '-',
      systemName: system?.name || '-',
      occupancy,
      codeRp,
      codeRa,
      codeVbz: Math.round(codeVbz),
      actualRp,
      actualRa,
      actualVbz: Math.round(actualVbz),
      ventilationCfmFromAch: ventilationCfmFromAch ? Math.round(ventilationCfmFromAch) : null,
      exhaustCfmFromAch: exhaustCfmFromAch ? Math.round(exhaustCfmFromAch) : null,
      supplyCfmFromAch: supplyCfmFromAch ? Math.round(supplyCfmFromAch) : null,
      ez,
      Vbz: Math.round(finalVbz),
      Voz: Math.round(Voz),
      meetsCode,
    }
  })
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Results & Export 🐐💨</h2>
          <p className="text-surface-400">ASHRAE 62.1 ventilation analysis for {currentProject?.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(spaceSchedule)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            📥 Export CSV
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-700 pb-2">
        {[
          { id: 'summary', label: '📊 Summary' },
          { id: 'spaces', label: '🏠 Spaces' },
          { id: 'systems', label: '🌀 Systems' },
          { id: 'fans', label: '💨 Standalone Fans' },
          { id: 'comparison', label: '⚖️ Code Comparison' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-600 text-white'
                : 'text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            {tab.label}
            {tab.id === 'fans' && standaloneFans.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-purple-500/30 rounded text-xs">{standaloneFans.length}</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon="🏠"
              label="Total Area"
              value={`${results.totalAreaSf.toLocaleString()} SF`}
              color="text-white"
            />
            <SummaryCard
              icon="👥"
              label="Total Occupancy"
              value={`${results.totalOccupancy} people`}
              color="text-white"
            />
            <SummaryCard
              icon="💨"
              label="Total Outdoor Air"
              value={`${results.totalVot.toLocaleString()} CFM`}
              color="text-cyan-400"
            />
            <SummaryCard
              icon="🌀"
              label="Total Exhaust"
              value={`${results.totalExhaustCfm.toLocaleString()} CFM`}
              color="text-red-400"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon="❄️"
              label="Vent Cooling"
              value={`${results.totalCoolingTons} Tons`}
              subValue={`${results.totalCoolingBtuh.toLocaleString()} BTU/hr`}
              color="text-blue-400"
            />
            <SummaryCard
              icon="🔥"
              label="Vent Heating"
              value={`${results.totalHeatingMbh} MBH`}
              subValue={`${results.totalHeatingBtuh.toLocaleString()} BTU/hr`}
              color="text-amber-400"
            />
            <SummaryCard
              icon="🌀"
              label="Systems"
              value={`${systems.length}`}
              subValue={standaloneFans.length > 0 ? `+ ${standaloneFans.length} standalone fans` : undefined}
              color="text-purple-400"
            />
            <SummaryCard
              icon="📦"
              label="Zones"
              value={`${zones.length}`}
              color="text-emerald-400"
            />
          </div>
          
          {/* Quick System Overview */}
          {results.systems.length > 0 && (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">🌀 HVAC Systems</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.systems.map(system => (
                  <div key={system.systemId} className="p-4 bg-surface-900 rounded-lg border border-purple-600/30">
                    <div className="text-purple-400 font-medium">{system.systemName}</div>
                    <div className="text-xs text-surface-400 mb-2">
                      {system.systemType === 'single_zone' && 'Single Zone'}
                      {system.systemType === 'vav_multi_zone' && 'VAV Multi-Zone'}
                      {system.systemType === 'doas_100_oa' && 'DOAS 100% OA'}
                      {system.ervEnabled && ' + ERV'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-surface-500">Outdoor Air</div>
                        <div className="text-cyan-400 font-medium">{system.Vot.toLocaleString()} CFM</div>
                      </div>
                      <div>
                        <div className="text-surface-500">Zones</div>
                        <div className="text-white">{system.zones.length}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Standalone Fans Quick View */}
          {standaloneFans.length > 0 && (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">💨 Standalone Fans</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {standaloneFans.map(fan => (
                  <div 
                    key={fan.tag} 
                    className={`p-4 rounded-lg border ${
                      fan.type === 'exhaust' 
                        ? 'bg-red-900/20 border-red-600/30' 
                        : 'bg-emerald-900/20 border-emerald-600/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{fan.type === 'exhaust' ? '🔴' : '🟢'}</span>
                      <span className={`font-medium ${fan.type === 'exhaust' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fan.tag}
                      </span>
                    </div>
                    <div className="text-xs text-surface-400 mt-1">{fan.type === 'exhaust' ? 'Exhaust' : 'Supply'}</div>
                    <div className="text-xl font-bold text-white mt-2">{Math.round(fan.totalCfm).toLocaleString()} CFM</div>
                    <div className="text-xs text-surface-500 mt-1">{fan.spaces.length} space(s)</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Spaces Tab */}
      {activeTab === 'spaces' && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <div className="p-4 border-b border-surface-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">📋 Space Ventilation Schedule</h3>
            <span className="text-sm text-surface-400">{spaceSchedule.length} spaces</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-900 text-left text-surface-400">
                  <th className="px-4 py-3 font-medium">Space</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Zone</th>
                  <th className="px-4 py-3 font-medium">System</th>
                  <th className="px-4 py-3 font-medium text-right">Area (SF)</th>
                  <th className="px-4 py-3 font-medium text-right">Height (ft)</th>
                  <th className="px-4 py-3 font-medium text-right">Occ</th>
                  <th className="px-4 py-3 font-medium text-right">Rp</th>
                  <th className="px-4 py-3 font-medium text-right">Ra</th>
                  <th className="px-4 py-3 font-medium text-right">Ez</th>
                  <th className="px-4 py-3 font-medium text-right">Vbz (CFM)</th>
                  <th className="px-4 py-3 font-medium text-right">Voz (CFM)</th>
                </tr>
              </thead>
              <tbody>
                {spaceSchedule.map((space, i) => (
                  <tr 
                    key={space.id} 
                    className={`border-b border-surface-700/50 ${i % 2 === 0 ? 'bg-surface-800' : 'bg-surface-850'}`}
                  >
                    <td className="px-4 py-2 text-white font-medium">{space.name}</td>
                    <td className="px-4 py-2 text-surface-300">{space.spaceTypeName}</td>
                    <td className="px-4 py-2 text-emerald-400">{space.zoneName}</td>
                    <td className="px-4 py-2 text-purple-400">{space.systemName}</td>
                    <td className="px-4 py-2 text-right text-white">{space.areaSf.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-white">{space.ceilingHeightFt}</td>
                    <td className="px-4 py-2 text-right text-white">{space.occupancy}</td>
                    <td className="px-4 py-2 text-right text-surface-400">{space.actualRp}</td>
                    <td className="px-4 py-2 text-right text-surface-400">{space.actualRa}</td>
                    <td className="px-4 py-2 text-right text-surface-400">{space.ez}</td>
                    <td className="px-4 py-2 text-right text-white">{space.Vbz}</td>
                    <td className="px-4 py-2 text-right text-cyan-400 font-medium">{space.Voz}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-900 font-medium">
                  <td className="px-4 py-3 text-white" colSpan={4}>TOTALS</td>
                  <td className="px-4 py-3 text-right text-white">{results.totalAreaSf.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-surface-400">-</td>
                  <td className="px-4 py-3 text-right text-white">{results.totalOccupancy}</td>
                  <td className="px-4 py-3 text-right text-surface-400">-</td>
                  <td className="px-4 py-3 text-right text-surface-400">-</td>
                  <td className="px-4 py-3 text-right text-surface-400">-</td>
                  <td className="px-4 py-3 text-right text-white">
                    {spaceSchedule.reduce((sum, s) => sum + s.Vbz, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-cyan-400">
                    {spaceSchedule.reduce((sum, s) => sum + s.Voz, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      
      {/* Systems Tab */}
      {activeTab === 'systems' && (
        <div className="space-y-6">
          {results.systems.length === 0 ? (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-12 text-center">
              <div className="text-5xl mb-4">🌀🐐</div>
              <h3 className="text-lg font-semibold text-white mb-2">No HVAC Systems Yet</h3>
              <p className="text-surface-400">Create systems in the Zones & Systems tab to see system-level results.</p>
            </div>
          ) : (
            results.systems.map(system => (
              <div key={system.systemId} className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
                <div className="p-4 border-b border-surface-700 bg-purple-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-purple-400">{system.systemName}</h3>
                      <div className="text-sm text-surface-400">
                        {system.systemType === 'single_zone' && 'Single Zone System'}
                        {system.systemType === 'vav_multi_zone' && 'VAV Multi-Zone System'}
                        {system.systemType === 'doas_100_oa' && 'DOAS 100% Outdoor Air'}
                        {system.ervEnabled && ` • ERV`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-cyan-400">{system.Vot.toLocaleString()} CFM</div>
                      <div className="text-xs text-surface-400">Outdoor Air (Vot)</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-surface-500">Zones</div>
                    <div className="text-lg font-medium text-white">{system.zones.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500">Total Area</div>
                    <div className="text-lg font-medium text-white">{system.totalAreaSf.toLocaleString()} SF</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500">Occupancy (Diversified)</div>
                    <div className="text-lg font-medium text-white">{system.diversifiedOccupancy}</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500">Ev (System Efficiency)</div>
                    <div className="text-lg font-medium text-white">{(system.Ev * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500">Vou (Uncorrected)</div>
                    <div className="text-lg font-medium text-white">{system.Vou.toLocaleString()} CFM</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500">Exhaust</div>
                    <div className="text-lg font-medium text-red-400">{system.totalExhaustCfm.toLocaleString()} CFM</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500">Cooling Load</div>
                    <div className="text-lg font-medium text-blue-400">{system.coolingLoadTons} Tons</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500">Heating Load</div>
                    <div className="text-lg font-medium text-amber-400">{system.heatingLoadMbh} MBH</div>
                  </div>
                </div>
                
                {/* Zones in this system */}
                <div className="border-t border-surface-700 p-4">
                  <h4 className="text-sm font-medium text-surface-300 mb-3">Zones in System</h4>
                  <div className="space-y-2">
                    {system.zones.map(zone => (
                      <div key={zone.zoneId} className="flex items-center justify-between p-2 bg-surface-900 rounded-lg">
                        <div>
                          <span className="text-emerald-400 font-medium">{zone.zoneName}</span>
                          <span className="text-surface-500 ml-2 text-sm">Ez: {zone.ez}</span>
                        </div>
                        <div className="text-cyan-400 font-medium">{zone.totalVoz.toLocaleString()} CFM</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Standalone Fans Tab */}
      {activeTab === 'fans' && (
        <div className="space-y-6">
          {standaloneFans.length === 0 ? (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-12 text-center">
              <div className="text-5xl mb-4">💨🐐</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Standalone Fans Tagged</h3>
              <p className="text-surface-400">
                Tag spaces with exhaust or supply fan tags in the space editor to track standalone fans separately from main HVAC systems.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Exhaust Fans */}
                <div className="bg-surface-800 rounded-xl border border-red-600/30 overflow-hidden">
                  <div className="p-4 border-b border-surface-700 bg-red-900/20">
                    <h3 className="text-lg font-semibold text-red-400">🔴 Exhaust Fans</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {standaloneFans.filter(f => f.type === 'exhaust').length === 0 ? (
                      <div className="text-center text-surface-500 py-4">No exhaust fans tagged</div>
                    ) : (
                      standaloneFans.filter(f => f.type === 'exhaust').map(fan => (
                        <div key={fan.tag} className="p-3 bg-surface-900 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-red-400 font-medium">{fan.tag}</span>
                            <span className="text-xl font-bold text-white">{Math.round(fan.totalCfm).toLocaleString()} CFM</span>
                          </div>
                          <div className="space-y-1">
                            {fan.spaces.map((s, i) => (
                              <div key={i} className="flex justify-between text-sm text-surface-400">
                                <span>{s.name}</span>
                                <span>{s.cfm.toLocaleString()} CFM</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Supply Fans */}
                <div className="bg-surface-800 rounded-xl border border-emerald-600/30 overflow-hidden">
                  <div className="p-4 border-b border-surface-700 bg-emerald-900/20">
                    <h3 className="text-lg font-semibold text-emerald-400">🟢 Supply Fans</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {standaloneFans.filter(f => f.type === 'supply').length === 0 ? (
                      <div className="text-center text-surface-500 py-4">No supply fans tagged</div>
                    ) : (
                      standaloneFans.filter(f => f.type === 'supply').map(fan => (
                        <div key={fan.tag} className="p-3 bg-surface-900 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-emerald-400 font-medium">{fan.tag}</span>
                            <span className="text-xl font-bold text-white">{Math.round(fan.totalCfm).toLocaleString()} CFM</span>
                          </div>
                          <div className="space-y-1">
                            {fan.spaces.map((s, i) => (
                              <div key={i} className="flex justify-between text-sm text-surface-400">
                                <span>{s.name}</span>
                                <span>{s.cfm.toLocaleString()} CFM</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              {/* Fan Schedule Table */}
              <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
                <div className="p-4 border-b border-surface-700">
                  <h3 className="text-lg font-semibold text-white">📋 Standalone Fan Schedule</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-900 text-left text-surface-400">
                        <th className="px-4 py-3 font-medium">Tag</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium text-right">CFM</th>
                        <th className="px-4 py-3 font-medium text-right">Spaces</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standaloneFans.map((fan, i) => (
                        <tr key={fan.tag} className={`border-b border-surface-700/50 ${i % 2 === 0 ? 'bg-surface-800' : 'bg-surface-850'}`}>
                          <td className={`px-4 py-2 font-medium ${fan.type === 'exhaust' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {fan.tag}
                          </td>
                          <td className="px-4 py-2 text-surface-300">
                            {fan.type === 'exhaust' ? '🔴 Exhaust' : '🟢 Supply'}
                          </td>
                          <td className="px-4 py-2 text-right text-white font-medium">{Math.round(fan.totalCfm).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-surface-400">{fan.spaces.length}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-900 font-medium">
                        <td className="px-4 py-3 text-white" colSpan={2}>TOTALS</td>
                        <td className="px-4 py-3 text-right text-white">
                          {standaloneFans.reduce((sum, f) => sum + f.totalCfm, 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-surface-400">
                          {standaloneFans.reduce((sum, f) => sum + f.spaces.length, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Code Comparison Tab */}
      {activeTab === 'comparison' && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <div className="p-4 border-b border-surface-700">
            <h3 className="text-lg font-semibold text-white">⚖️ Code Minimum vs Actual Comparison</h3>
            <p className="text-sm text-surface-400 mt-1">Compare ASHRAE 62.1 code minimum ventilation with your actual design values</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-900 text-left text-surface-400">
                  <th className="px-4 py-3 font-medium">Space</th>
                  <th className="px-4 py-3 font-medium text-center" colSpan={2}>Code Min (ASHRAE)</th>
                  <th className="px-4 py-3 font-medium text-center" colSpan={2}>Actual Design</th>
                  <th className="px-4 py-3 font-medium text-center">Vbz Comparison</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
                <tr className="bg-surface-900/50 text-left text-surface-500 text-xs">
                  <th className="px-4 py-1"></th>
                  <th className="px-4 py-1 text-center">Rp</th>
                  <th className="px-4 py-1 text-center">Ra</th>
                  <th className="px-4 py-1 text-center">Rp</th>
                  <th className="px-4 py-1 text-center">Ra</th>
                  <th className="px-4 py-1 text-center">Code / Actual</th>
                  <th className="px-4 py-1 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {spaceSchedule.map((space, i) => (
                  <tr 
                    key={space.id} 
                    className={`border-b border-surface-700/50 ${i % 2 === 0 ? 'bg-surface-800' : 'bg-surface-850'}`}
                  >
                    <td className="px-4 py-2">
                      <div className="text-white font-medium">{space.name}</div>
                      <div className="text-xs text-surface-400">{space.spaceTypeName}</div>
                    </td>
                    <td className="px-4 py-2 text-center text-surface-400">{space.codeRp}</td>
                    <td className="px-4 py-2 text-center text-surface-400">{space.codeRa}</td>
                    <td className={`px-4 py-2 text-center ${space.actualRp !== space.codeRp ? 'text-amber-400' : 'text-surface-400'}`}>
                      {space.actualRp}
                    </td>
                    <td className={`px-4 py-2 text-center ${space.actualRa !== space.codeRa ? 'text-amber-400' : 'text-surface-400'}`}>
                      {space.actualRa}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-surface-400">{space.codeVbz}</span>
                      <span className="text-surface-500 mx-1">/</span>
                      <span className={space.meetsCode ? 'text-cyan-400' : 'text-red-400'}>{space.Vbz}</span>
                      <span className="text-surface-500 ml-1 text-xs">CFM</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {space.meetsCode ? (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">✓ OK</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">⚠ Below</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Summary */}
          <div className="p-4 border-t border-surface-700 bg-surface-900">
            <div className="flex items-center justify-between">
              <div className="text-sm text-surface-400">
                {spaceSchedule.filter(s => s.meetsCode).length} of {spaceSchedule.length} spaces meet code minimum
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-surface-400">Meets Code</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-sm text-surface-400">Below Code</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="text-sm text-surface-400">Override Applied</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Notes */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-3">📝 Notes</h3>
        <ul className="text-sm text-surface-400 space-y-2">
          <li>• All calculations per ASHRAE Standard 62.1-2022 Ventilation Rate Procedure</li>
          <li>• Vbz = (Rp × occupancy) + (Ra × area) - Breathing zone outdoor airflow</li>
          <li>• Voz = Vbz / Ez - Zone outdoor airflow</li>
          <li>• Vot = Vou / Ev - System outdoor air intake (multi-zone systems)</li>
          <li>• Ventilation loads are based on design conditions and do not include envelope or internal loads</li>
          <li>• Standalone fans are tracked separately from main HVAC systems</li>
          {results.altitudeCorrection < 0.95 && (
            <li className="text-amber-400">• Altitude correction factor of {results.altitudeCorrection.toFixed(3)} applied</li>
          )}
        </ul>
      </div>
    </div>
  )
}

// Summary Card Component
interface SummaryCardProps {
  icon: string
  label: string
  value: string
  subValue?: string
  color: string
}

function SummaryCard({ icon, label, value, subValue, color }: SummaryCardProps) {
  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-surface-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subValue && <div className="text-xs text-surface-500 mt-1">{subValue}</div>}
    </div>
  )
}

// Space schedule type
interface SpaceScheduleItem {
  id: string
  name: string
  spaceTypeName: string
  zoneName: string
  systemName: string
  areaSf: number
  ceilingHeightFt: number
  occupancy: number
  codeRp: number
  codeRa: number
  codeVbz: number
  actualRp: number
  actualRa: number
  actualVbz: number
  ventilationCfmFromAch: number | null
  exhaustCfmFromAch: number | null
  supplyCfmFromAch: number | null
  ez: number
  Vbz: number
  Voz: number
  meetsCode: boolean
}

// Export to CSV
function exportToCSV(data: SpaceScheduleItem[]) {
  const headers = [
    'Space', 'Type', 'Zone', 'System', 'Area (SF)', 'Height (ft)', 
    'Occupancy', 'Rp', 'Ra', 'Ez', 'Vbz (CFM)', 'Voz (CFM)'
  ]
  
  const rows = data.map((s: SpaceScheduleItem) => [
    s.name,
    s.spaceTypeName,
    s.zoneName,
    s.systemName,
    s.areaSf,
    s.ceilingHeightFt,
    s.occupancy,
    s.actualRp,
    s.actualRa,
    s.ez,
    s.Vbz,
    s.Voz,
  ])
  
  const csv = [
    headers.join(','),
    ...rows.map((r: (string | number)[]) => r.map((v: string | number) => `"${v}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hvac-ventilation-schedule.csv'
  a.click()
  URL.revokeObjectURL(url)
}
