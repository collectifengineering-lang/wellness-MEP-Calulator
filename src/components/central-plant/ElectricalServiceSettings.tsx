import { useProjectStore } from '../../store/useProjectStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { getStandardServiceSize, standardServiceSizes, getDefaultMechanicalSettings } from '../../data/defaults'
import { calculateMechanicalKVA } from './MechanicalLoads'
import type { CalculationResults } from '../../types'

interface ElectricalServiceSettingsProps {
  results: CalculationResults
}

export default function ElectricalServiceSettings({ results }: ElectricalServiceSettingsProps) {
  const { currentProject, updateProject } = useProjectStore()
  const { electrical: globalDefaults } = useSettingsStore()
  
  if (!currentProject) return null
  
  const settings = currentProject.electricalSettings
  const mechanicalSettings = currentProject.mechanicalSettings || getDefaultMechanicalSettings()
  
  const handleUpdate = (field: keyof typeof settings, value: number) => {
    updateProject({
      electricalSettings: {
        ...settings,
        [field]: value,
      }
    })
  }

  // Calculate mechanical equipment kVA
  const mechanical = calculateMechanicalKVA(
    results.hvac,
    results.dhw,
    mechanicalSettings,
    currentProject.dhwSettings.heaterType,
    settings.powerFactor,
    currentProject.electricPrimary
  )

  // Calculate demand load (connected + mechanical)
  const connectedKW = results.electrical.totalKW
  const mechanicalKVA = mechanical.total
  const totalConnectedKVA = (connectedKW / settings.powerFactor) + mechanicalKVA
  
  const demandKW = connectedKW * settings.demandFactor
  const demandKVA = demandKW / settings.powerFactor
  const mechanicalDemandKVA = mechanicalKVA * settings.demandFactor // Apply demand factor to mechanical too
  const totalDemandKVA = demandKVA + mechanicalDemandKVA
  const withSpare = totalDemandKVA * (1 + settings.spareCapacity)
  
  // Calculate amps based on project voltage/phase
  const sqrtFactor = settings.phase === 3 ? Math.sqrt(3) : 1
  const calculatedAmps = (withSpare * 1000) / (settings.voltage * sqrtFactor)
  
  // Get standard service size (upsize to next standard)
  const standardAmps = getStandardServiceSize(calculatedAmps, settings.voltage)
  const availableSizes = standardServiceSizes[settings.voltage] || standardServiceSizes[208]
  const exceedsMax = calculatedAmps > availableSizes[availableSizes.length - 1]

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-amber-400">⚡</span> Electrical Service Settings
        </h3>
        <p className="text-sm text-surface-400 mt-1">
          Configure voltage, phase, and demand factor for this project
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Service Configuration */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Voltage */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Service Voltage</label>
            <select
              value={settings.voltage}
              onChange={(e) => handleUpdate('voltage', Number(e.target.value))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              <option value={208}>208V</option>
              <option value={480}>480V</option>
              <option value={240}>240V</option>
              <option value={120}>120V</option>
            </select>
          </div>
          
          {/* Phase */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Phase</label>
            <select
              value={settings.phase}
              onChange={(e) => handleUpdate('phase', Number(e.target.value) as 1 | 3)}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              <option value={3}>3-Phase</option>
              <option value={1}>Single Phase</option>
            </select>
          </div>
          
          {/* Power Factor */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Power Factor</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.70"
                max="1.00"
                value={settings.powerFactor}
                onChange={(e) => handleUpdate('powerFactor', Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">PF</span>
            </div>
          </div>
          
          {/* Spare Capacity */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Spare Capacity</label>
            <div className="relative">
              <input
                type="number"
                step="5"
                min="0"
                max="50"
                value={settings.spareCapacity * 100}
                onChange={(e) => handleUpdate('spareCapacity', Number(e.target.value) / 100)}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Demand Factor - Highlighted */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-amber-400">Demand Factor</label>
              <p className="text-xs text-surface-400 mt-0.5">
                Applied to connected load (global default: {(globalDefaults.demand_factor * 100).toFixed(0)}%)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="50"
                max="100"
                value={settings.demandFactor * 100}
                onChange={(e) => handleUpdate('demandFactor', Number(e.target.value) / 100)}
                className="w-32 accent-amber-500"
              />
              <div className="w-16 text-right">
                <span className="text-xl font-bold text-amber-400">{(settings.demandFactor * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
          
          {/* Quick presets */}
          <div className="flex gap-2 mt-2">
            {[
              { label: '80%', value: 0.80 },
              { label: '85%', value: 0.85 },
              { label: '90%', value: 0.90 },
              { label: '95%', value: 0.95 },
              { label: '100%', value: 1.00 },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => handleUpdate('demandFactor', preset.value)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  settings.demandFactor === preset.value
                    ? 'bg-amber-500 text-black font-medium'
                    : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Breakdown */}
        <div className="bg-surface-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-surface-400 mb-3">Load Calculation Breakdown</h4>
          <div className="space-y-2 text-sm">
            {/* Building Connected Load */}
            <div className="flex justify-between">
              <span className="text-surface-400">Building Connected Load:</span>
              <span className="text-white font-mono">{connectedKW.toLocaleString()} kW</span>
            </div>
            <div className="flex justify-between pl-4 text-surface-500">
              <span>÷ Power Factor ({settings.powerFactor}):</span>
              <span className="font-mono">{Math.round(connectedKW / settings.powerFactor).toLocaleString()} kVA</span>
            </div>
            
            {/* Mechanical Equipment Loads */}
            {mechanicalKVA > 0 && (
              <>
                <div className="flex justify-between text-cyan-400 pt-2">
                  <span>+ Mechanical Equipment:</span>
                  <span className="font-mono">{Math.round(mechanicalKVA).toLocaleString()} kVA</span>
                </div>
                {mechanical.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between pl-4 text-surface-500">
                    <span>{item.name}:</span>
                    <span className="font-mono">{Math.round(item.kva).toLocaleString()} kVA</span>
                  </div>
                ))}
              </>
            )}
            
            {/* Total Connected */}
            <div className="flex justify-between border-t border-surface-700 pt-2 mt-2">
              <span className="text-surface-300 font-medium">Total Connected:</span>
              <span className="text-white font-mono font-medium">{Math.round(totalConnectedKVA).toLocaleString()} kVA</span>
            </div>
            
            {/* Apply Demand Factor */}
            <div className="flex justify-between text-amber-400">
              <span>× Demand Factor ({(settings.demandFactor * 100).toFixed(0)}%):</span>
              <span className="font-mono">{Math.round(totalDemandKVA).toLocaleString()} kVA</span>
            </div>
            
            {/* Add Spare Capacity */}
            <div className="flex justify-between">
              <span className="text-surface-400">+ Spare ({(settings.spareCapacity * 100).toFixed(0)}%):</span>
              <span className="text-white font-mono">{Math.round(withSpare).toLocaleString()} kVA</span>
            </div>
            
            {/* Calculated vs Standard Service Size */}
            <div className="border-t border-surface-700 pt-3 mt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-surface-400">Calculated Amps:</span>
                <span className="text-white font-mono">{Math.round(calculatedAmps).toLocaleString()}A</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-400">↑ Upsize to Standard:</span>
                <span className="text-emerald-400 font-mono font-semibold">{standardAmps.toLocaleString()}A</span>
              </div>
            </div>
            
            {/* Final Recommended Service */}
            <div className={`border-t pt-3 mt-3 ${exceedsMax ? 'border-red-500/50' : 'border-surface-700'}`}>
              <div className="flex justify-between items-start">
                <span className="text-surface-300 font-medium">Recommended Service:</span>
                <div className="text-right">
                  <span className={`text-lg font-bold font-mono ${exceedsMax ? 'text-red-400' : 'text-amber-400'}`}>
                    {standardAmps.toLocaleString()}A @ {settings.voltage}V/{settings.phase}PH
                  </span>
                  <div className="text-xs text-surface-500 mt-0.5">
                    {settings.phase === 3 ? '4-Wire' : '3-Wire'}
                  </div>
                </div>
              </div>
              {exceedsMax && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                  ⚠️ Exceeds max standard service size for {settings.voltage}V. Consider parallel services or higher voltage.
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Available Standard Sizes Reference */}
        <div className="text-xs text-surface-500">
          <span className="font-medium">Standard sizes @ {settings.voltage}V: </span>
          {availableSizes.map((size, i) => (
            <span key={size} className={size === standardAmps ? 'text-emerald-400 font-medium' : ''}>
              {size}A{i < availableSizes.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
        
        {/* Reset to Global Defaults */}
        <div className="flex justify-end">
          <button
            onClick={() => updateProject({
              electricalSettings: {
                voltage: globalDefaults.voltage_primary,
                phase: 3,
                demandFactor: globalDefaults.demand_factor,
                powerFactor: globalDefaults.power_factor,
                spareCapacity: globalDefaults.spare_capacity,
              }
            })}
            className="text-sm text-surface-400 hover:text-white transition-colors"
          >
            Reset to Global Defaults
          </button>
        </div>
      </div>
    </div>
  )
}
