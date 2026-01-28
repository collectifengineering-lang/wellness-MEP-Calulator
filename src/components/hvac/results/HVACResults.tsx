import { useMemo } from 'react'
import { useHVACStore } from '../../../store/useHVACStore'
import { calculateProjectVentilation } from '../../../calculations/ventilation'
import { ASHRAE62_SPACE_TYPES, calculateDefaultOccupancy } from '../../../data/ashrae62'

export default function HVACResults() {
  const { currentProject, spaces, zones, systems } = useHVACStore()
  
  const results = useMemo(() => {
    if (!currentProject?.settings) return null
    return calculateProjectVentilation(spaces, zones, systems, currentProject.settings)
  }, [currentProject?.settings, spaces, zones, systems])
  
  if (!results) {
    return (
      <div className="p-6 text-center text-surface-400">
        Configure project settings to see results
      </div>
    )
  }
  
  // Build space schedule
  const spaceSchedule = spaces.map(space => {
    const spaceType = ASHRAE62_SPACE_TYPES.find(st => st.id === space.spaceType)
    const zone = zones.find(z => z.id === space.zoneId)
    const system = zone ? systems.find(s => s.id === zone.systemId) : null
    const occupancy = space.occupancyOverride ?? calculateDefaultOccupancy(space.spaceType, space.areaSf)
    const Rp = spaceType?.Rp ?? 5
    const Ra = spaceType?.Ra ?? 0.06
    const Vbz = (Rp * occupancy) + (Ra * space.areaSf)
    const ez = zone?.ez ?? 1.0
    const Voz = Vbz / ez
    
    return {
      ...space,
      spaceTypeName: spaceType?.displayName || space.spaceType,
      zoneName: zone?.name || '-',
      systemName: system?.name || '-',
      occupancy,
      Rp,
      Ra,
      ez,
      Vbz: Math.round(Vbz),
      Voz: Math.round(Voz),
    }
  })
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Results & Export</h2>
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
          color="text-purple-400"
        />
        <SummaryCard
          icon="📦"
          label="Zones"
          value={`${zones.length}`}
          color="text-emerald-400"
        />
      </div>
      
      {/* Space Schedule Table */}
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
                  <td className="px-4 py-2 text-right text-surface-400">{space.Rp}</td>
                  <td className="px-4 py-2 text-right text-surface-400">{space.Ra}</td>
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
      
      {/* System Summary Table */}
      {results.systems.length > 0 && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <div className="p-4 border-b border-surface-700">
            <h3 className="text-lg font-semibold text-white">🌀 System Summary</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-900 text-left text-surface-400">
                  <th className="px-4 py-3 font-medium">System</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Zones</th>
                  <th className="px-4 py-3 font-medium text-right">Area (SF)</th>
                  <th className="px-4 py-3 font-medium text-right">Occ</th>
                  <th className="px-4 py-3 font-medium text-right">Vou (CFM)</th>
                  <th className="px-4 py-3 font-medium text-right">Ev</th>
                  <th className="px-4 py-3 font-medium text-right">Vot (CFM)</th>
                  <th className="px-4 py-3 font-medium text-right">Exhaust</th>
                  <th className="px-4 py-3 font-medium text-right">Cool (Tons)</th>
                  <th className="px-4 py-3 font-medium text-right">Heat (MBH)</th>
                </tr>
              </thead>
              <tbody>
                {results.systems.map((system, i) => (
                  <tr 
                    key={system.systemId}
                    className={`border-b border-surface-700/50 ${i % 2 === 0 ? 'bg-surface-800' : 'bg-surface-850'}`}
                  >
                    <td className="px-4 py-2 text-purple-400 font-medium">{system.systemName}</td>
                    <td className="px-4 py-2 text-surface-300">
                      {system.systemType === 'single_zone' && 'Single Zone'}
                      {system.systemType === 'vav_multi_zone' && 'VAV'}
                      {system.systemType === 'doas_100_oa' && 'DOAS'}
                      {system.ervEnabled && ' + ERV'}
                    </td>
                    <td className="px-4 py-2 text-right text-white">{system.zones.length}</td>
                    <td className="px-4 py-2 text-right text-white">{system.totalAreaSf.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-white">{system.diversifiedOccupancy}</td>
                    <td className="px-4 py-2 text-right text-white">{system.Vou.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-surface-400">{(system.Ev * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2 text-right text-cyan-400 font-medium">{system.Vot.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-red-400">{system.totalExhaustCfm.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-blue-400">{system.coolingLoadTons}</td>
                    <td className="px-4 py-2 text-right text-amber-400">{system.heatingLoadMbh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  Rp: number
  Ra: number
  ez: number
  Vbz: number
  Voz: number
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
    s.Rp,
    s.Ra,
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
