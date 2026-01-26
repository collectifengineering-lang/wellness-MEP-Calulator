import type { CalculationResults, ZoneFixtures } from '../../types'

interface TotalsBarProps {
  calculations: {
    results: CalculationResults | null
    aggregatedFixtures: ZoneFixtures
    mechanicalKVA: { total: number; breakdown: { name: string; kva: number }[] }
    totalSF: number
  }
}

export default function TotalsBar({ calculations }: TotalsBarProps) {
  const { results, aggregatedFixtures, mechanicalKVA, totalSF } = calculations

  if (!results) {
    return (
      <aside className="w-72 bg-surface-800 border-l border-surface-700 p-4 overflow-y-auto">
        <div className="text-surface-400 text-sm">Add zones to see totals</div>
      </aside>
    )
  }

  const sections = [
    {
      title: 'Space',
      items: [
        { label: 'Total SF', value: totalSF.toLocaleString(), unit: 'SF', color: 'text-white' },
      ],
    },
    {
      title: 'HVAC',
      items: [
        { label: 'Cooling', value: results.hvac.totalTons.toLocaleString(), unit: 'Tons', color: 'text-cyan-400' },
        results.hvac.poolChillerTons > 0 && { label: '└ Pool Chiller', value: results.hvac.poolChillerTons.toLocaleString(), unit: 'Tons', color: 'text-blue-400' },
        { label: 'Heating', value: results.hvac.totalMBH.toLocaleString(), unit: 'MBH', color: 'text-orange-400' },
        { label: 'Ventilation', value: results.hvac.totalVentCFM.toLocaleString(), unit: 'CFM', color: 'text-emerald-400' },
        { label: 'Exhaust', value: results.hvac.totalExhaustCFM.toLocaleString(), unit: 'CFM', color: 'text-amber-400' },
        results.hvac.dehumidLbHr > 0 && { label: 'Dehumid', value: results.hvac.dehumidLbHr.toString(), unit: 'lb/hr', color: 'text-blue-400' },
      ].filter(Boolean),
    },
    {
      title: 'Electrical',
      items: [
        // Building load is total minus mechanical
        { label: 'Building Load', value: Math.round(results.electrical.totalKVA - mechanicalKVA.total).toLocaleString(), unit: 'kVA', color: 'text-amber-400' },
        mechanicalKVA.total > 0 && { label: 'Mech. Equip', value: Math.round(mechanicalKVA.total).toLocaleString(), unit: 'kVA', color: 'text-cyan-400' },
        { label: 'Total Load', value: results.electrical.totalKVA.toLocaleString(), unit: 'kVA', color: 'text-yellow-400', bold: true },
        { label: 'Service', value: results.electrical.recommendedService, color: 'text-white' },
        { label: '@ 480V', value: results.electrical.amps_480v.toLocaleString(), unit: 'A', color: 'text-surface-300' },
        { label: '@ 208V', value: results.electrical.amps_208v.toLocaleString(), unit: 'A', color: 'text-surface-300' },
      ].filter(Boolean),
    },
    {
      title: 'Gas',
      items: [
        { label: 'Total Load', value: results.gas.totalCFH.toLocaleString(), unit: 'CFH', color: 'text-orange-400' },
        { label: 'Pressure', value: results.gas.recommendedPressure, color: 'text-white' },
        { label: 'Pipe Size', value: results.gas.recommendedPipeSize, color: 'text-surface-300' },
      ],
    },
    {
      title: 'DHW',
      items: [
        { label: 'Peak Demand', value: results.dhw.peakGPH.toLocaleString(), unit: 'GPH', color: 'text-cyan-400' },
        { label: 'Recovery', value: (results.dhw.grossBTU / 1000).toLocaleString(), unit: 'MBH', color: 'text-orange-400' },
        { label: 'Storage', value: results.dhw.storageGallons.toLocaleString(), unit: 'gal', color: 'text-blue-400' },
        { label: 'Tankless Units', value: results.dhw.tanklessUnits.toString(), unit: '', color: 'text-white' },
      ],
    },
    {
      title: 'Plumbing',
      items: [
        { label: 'Total WSFU', value: results.plumbing.totalWSFU.toString(), unit: '', color: 'text-cyan-400' },
        { label: 'Total DFU', value: results.plumbing.totalDFU.toString(), unit: '', color: 'text-amber-400' },
        { label: 'Peak Flow', value: results.plumbing.peakGPM.toString(), unit: 'GPM', color: 'text-blue-400' },
        { label: 'Water Main', value: results.plumbing.coldWaterMainSize, unit: '', color: 'text-white' },
        { label: 'Building Drain', value: results.plumbing.recommendedDrainSize, unit: '', color: 'text-white' },
      ],
    },
    {
      title: 'Fixtures',
      items: [
        aggregatedFixtures.showers > 0 && { label: 'Showers', value: aggregatedFixtures.showers.toString(), color: 'text-surface-300' },
        aggregatedFixtures.lavs > 0 && { label: 'Lavatories', value: aggregatedFixtures.lavs.toString(), color: 'text-surface-300' },
        aggregatedFixtures.wcs > 0 && { label: 'WCs', value: aggregatedFixtures.wcs.toString(), color: 'text-surface-300' },
        aggregatedFixtures.floorDrains > 0 && { label: 'Floor Drains', value: aggregatedFixtures.floorDrains.toString(), color: 'text-surface-300' },
      ].filter(Boolean),
    },
  ]

  return (
    <aside className="w-72 bg-surface-800 border-l border-surface-700 overflow-y-auto">
      <div className="p-4 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-white">Project Totals</h3>
        <p className="text-xs text-surface-400 mt-0.5">Real-time calculations</p>
      </div>

      <div className="p-4 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx}>
            <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">
              {section.title}
            </h4>
            <div className="space-y-1.5">
              {section.items.map((item, itemIdx) => (
                item && (
                  <div key={itemIdx} className="flex items-center justify-between">
                    <span className="text-sm text-surface-300">{item.label}</span>
                    <span className={`text-sm font-mono ${item.color}`}>
                      {item.value}
                      {'unit' in item && item.unit && <span className="text-surface-500 ml-1">{item.unit}</span>}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
