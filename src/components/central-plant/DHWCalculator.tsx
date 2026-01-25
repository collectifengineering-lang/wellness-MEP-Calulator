import { useProjectStore } from '../../store/useProjectStore'
import { gasHeaterEfficiencyPresets } from '../../calculations/dhw'
import { dhwDefaults } from '../../data/defaults'
import type { CalculationResults, ZoneFixtures } from '../../types'

interface DHWCalculatorProps {
  results: CalculationResults
  fixtures: ZoneFixtures
}

export default function DHWCalculator({ results, fixtures }: DHWCalculatorProps) {
  const { currentProject, updateDHWSettings } = useProjectStore()

  if (!currentProject) return null

  const { dhwSettings } = currentProject
  const { dhw } = results

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-700">
        <h3 className="text-lg font-semibold text-white">Domestic Hot Water System</h3>
        <p className="text-sm text-surface-400 mt-1">ASHRAE method sizing</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Heater Type */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Heater Type</label>
          <div className="grid grid-cols-2 gap-2">
            {['electric', 'gas'].map(type => (
              <button
                key={type}
                onClick={() => updateDHWSettings({ heaterType: type as 'electric' | 'gas' })}
                className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                  dhwSettings.heaterType === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                }`}
              >
                {type === 'electric' ? '⚡ Electric' : '🔥 Gas'}
              </button>
            ))}
          </div>
        </div>

        {/* Gas Efficiency */}
        {dhwSettings.heaterType === 'gas' && (
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Gas Heater Efficiency</label>
            <select
              value={dhwSettings.gasEfficiency}
              onChange={(e) => updateDHWSettings({ gasEfficiency: Number(e.target.value) })}
              className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              {gasHeaterEfficiencyPresets.map(preset => (
                <option key={preset.value} value={preset.value}>{preset.label}</option>
              ))}
            </select>
            <p className="text-xs text-surface-500 mt-1">
              Current efficiency: {(dhwSettings.gasEfficiency * 100).toFixed(0)}%
            </p>
          </div>
        )}

        {/* Temperature Settings */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Storage (Ts)</label>
            <div className="relative">
              <input
                type="number"
                value={dhwSettings.storageTemp}
                onChange={(e) => updateDHWSettings({ storageTemp: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">°F</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Delivery (Tf)</label>
            <div className="relative">
              <input
                type="number"
                value={dhwSettings.deliveryTemp}
                onChange={(e) => updateDHWSettings({ deliveryTemp: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">°F</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Cold Water (Tc)</label>
            <div className="relative">
              <input
                type="number"
                value={dhwSettings.coldWaterTemp}
                onChange={(e) => updateDHWSettings({ coldWaterTemp: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">°F</span>
            </div>
          </div>
        </div>

        {/* Peak Duration */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Peak Duration (hours)</label>
          <input
            type="number"
            value={dhwSettings.peakDuration}
            onChange={(e) => updateDHWSettings({ peakDuration: Number(e.target.value) })}
            min={0.5}
            max={8}
            step={0.5}
            className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white"
          />
        </div>

        {/* Fixture Summary */}
        <div className="bg-surface-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-surface-300 mb-3">Fixture Summary (from zones)</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-400">Showers:</span>
              <span className="text-white font-mono">{fixtures.showers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Lavatories:</span>
              <span className="text-white font-mono">{fixtures.lavs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Service Sinks:</span>
              <span className="text-white font-mono">{fixtures.serviceSinks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Washing Machines:</span>
              <span className="text-white font-mono">{fixtures.washingMachines}</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-primary-900/20 border border-primary-700/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-primary-300 mb-3">DHW System Results</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-300">Peak Demand:</span>
              <span className="text-white font-mono">{dhw.peakGPH.toLocaleString()} GPH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-300">ΔT:</span>
              <span className="text-white font-mono">{dhwSettings.storageTemp - dhwSettings.coldWaterTemp}°F</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-300">Net BTU/hr:</span>
              <span className="text-white font-mono">{dhw.netBTU.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-300">Gross BTU/hr:</span>
              <span className="text-white font-mono">{dhw.grossBTU.toLocaleString()}</span>
            </div>
            {dhwSettings.heaterType === 'gas' && (
              <div className="flex justify-between">
                <span className="text-surface-300">Gas Input:</span>
                <span className="text-orange-400 font-mono">{dhw.gasCFH.toLocaleString()} CFH</span>
              </div>
            )}
            {dhwSettings.heaterType === 'electric' && (
              <div className="flex justify-between">
                <span className="text-surface-300">Electric Input:</span>
                <span className="text-amber-400 font-mono">{dhw.electricKW.toLocaleString()} kW</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-surface-300">Storage Tank:</span>
              <span className="text-white font-mono">{dhw.storageGallons.toLocaleString()} gal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-300">Tankless Units:</span>
              <span className="text-white font-mono">
                {dhw.tanklessUnits} × {(dhwDefaults.tankless_unit_btu / 1000).toFixed(0)}k BTU
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
