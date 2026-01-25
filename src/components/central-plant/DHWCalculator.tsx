import { useProjectStore } from '../../store/useProjectStore'
import { gasHeaterEfficiencyPresets, type DHWCalcBreakdown } from '../../calculations/dhw'
import { dhwDefaults, dhwBuildingTypeFactors } from '../../data/defaults'
import type { CalculationResults, ZoneFixtures, DHWBuildingType, DHWSystemType } from '../../types'

interface DHWCalculatorProps {
  results: CalculationResults & { dhw: CalculationResults['dhw'] & { breakdown?: DHWCalcBreakdown } }
  fixtures: ZoneFixtures
}

export default function DHWCalculator({ results, fixtures }: DHWCalculatorProps) {
  const { currentProject, updateDHWSettings } = useProjectStore()

  if (!currentProject) return null

  const { dhwSettings } = currentProject
  const { dhw } = results
  const breakdown = dhw.breakdown

  // Get building type info
  const buildingTypeInfo = dhwBuildingTypeFactors[dhwSettings.buildingType] || dhwBuildingTypeFactors.gymnasium

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-700">
        <h3 className="text-lg font-semibold text-white">Domestic Hot Water System</h3>
        <p className="text-sm text-surface-400 mt-1">ASHRAE Service Water Heating Method</p>
      </div>

      <div className="p-6 space-y-6">
        {/* System Type Selection */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">System Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['storage', 'instantaneous', 'hybrid'] as DHWSystemType[]).map(type => (
              <button
                key={type}
                onClick={() => updateDHWSettings({ systemType: type })}
                className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                  dhwSettings.systemType === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                }`}
              >
                {type === 'storage' ? '🛢️ Storage Tank' : 
                 type === 'instantaneous' ? '⚡ Tankless' : '🔄 Hybrid'}
              </button>
            ))}
          </div>
          <p className="text-xs text-surface-500 mt-2">
            {dhwSettings.systemType === 'storage' && 'Traditional tank system with stored hot water for peak demands'}
            {dhwSettings.systemType === 'instantaneous' && 'On-demand tankless heaters - no storage, instant hot water'}
            {dhwSettings.systemType === 'hybrid' && 'Combination: small storage tank with tankless booster'}
          </p>
        </div>

        {/* Building Type / Occupancy Selection */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Building Type (ASHRAE)</label>
          <select
            value={dhwSettings.buildingType}
            onChange={(e) => {
              const newType = e.target.value as DHWBuildingType
              const factors = dhwBuildingTypeFactors[newType]
              updateDHWSettings({ 
                buildingType: newType,
                demandFactor: factors.demandDiversity,
                storageFactor: factors.storageFactor,
                peakDuration: factors.typicalPeakDuration,
              })
            }}
            className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white"
          >
            {Object.entries(dhwBuildingTypeFactors).map(([key, info]) => (
              <option key={key} value={key}>{info.name}</option>
            ))}
          </select>
          <p className="text-xs text-surface-500 mt-1">{buildingTypeInfo.notes}</p>
        </div>

        {/* Heater Type */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Energy Source</label>
          <div className="grid grid-cols-2 gap-2">
            {(['gas', 'electric'] as const).map(type => (
              <button
                key={type}
                onClick={() => updateDHWSettings({ heaterType: type })}
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
          </div>
        )}

        {/* Temperature Settings */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Storage Temp (Ts)</label>
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

        {/* ASHRAE Parameters */}
        <div className="bg-surface-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-surface-300 mb-3">ASHRAE Sizing Parameters</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Peak Duration (hrs)</label>
              <input
                type="number"
                value={dhwSettings.peakDuration}
                onChange={(e) => updateDHWSettings({ peakDuration: Number(e.target.value) })}
                min={0.5}
                max={8}
                step={0.5}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Demand Factor</label>
              <input
                type="number"
                value={dhwSettings.demandFactor}
                onChange={(e) => updateDHWSettings({ demandFactor: Number(e.target.value) })}
                min={0.3}
                max={1.0}
                step={0.05}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
              <p className="text-xs text-surface-500 mt-1">Simultaneity/diversity</p>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Storage Factor</label>
              <input
                type="number"
                value={dhwSettings.storageFactor}
                onChange={(e) => updateDHWSettings({ storageFactor: Number(e.target.value) })}
                min={0.5}
                max={0.9}
                step={0.05}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
              <p className="text-xs text-surface-500 mt-1">Usable tank %</p>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Recovery Factor</label>
              <input
                type="number"
                value={dhwSettings.recoveryFactor}
                onChange={(e) => updateDHWSettings({ recoveryFactor: Number(e.target.value) })}
                min={0.8}
                max={1.5}
                step={0.1}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
              <p className="text-xs text-surface-500 mt-1">Heater sizing multiplier</p>
            </div>
          </div>
        </div>

        {/* Tankless Unit Size (for instantaneous/hybrid) */}
        {(dhwSettings.systemType === 'instantaneous' || dhwSettings.systemType === 'hybrid') && (
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Tankless Unit Capacity</label>
            <div className="relative">
              <input
                type="number"
                value={dhwSettings.tanklessUnitBtu}
                onChange={(e) => updateDHWSettings({ tanklessUnitBtu: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">BTU/hr</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Per unit (Navien: 199,900 BTU)</p>
          </div>
        )}

        {/* Fixture Summary */}
        <div className="bg-surface-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-surface-300 mb-3">Fixture Demand Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-400">Showers ({fixtures.showers}):</span>
              <span className="text-white font-mono">{breakdown?.showerDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Lavatories ({fixtures.lavs}):</span>
              <span className="text-white font-mono">{breakdown?.lavDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Service Sinks ({fixtures.serviceSinks}):</span>
              <span className="text-white font-mono">{breakdown?.serviceSinkDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Washers ({fixtures.washingMachines}):</span>
              <span className="text-white font-mono">{breakdown?.washerDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="col-span-2 border-t border-surface-700 mt-2 pt-2 flex justify-between font-medium">
              <span className="text-surface-300">Total Fixture Demand:</span>
              <span className="text-white font-mono">{breakdown?.totalFixtureDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="col-span-2 flex justify-between text-amber-400">
              <span>× Demand Factor ({dhwSettings.demandFactor}):</span>
              <span className="font-mono">{breakdown?.adjustedDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="col-span-2 flex justify-between text-primary-400">
              <span>× Peak Hour Factor ({buildingTypeInfo.peakHourFactor}):</span>
              <span className="font-mono">{breakdown?.peakHourGPH ?? '--'} GPH</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-primary-900/20 border border-primary-700/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-primary-300 mb-3">
            DHW System Results 
            <span className="ml-2 text-xs font-normal text-primary-400">
              ({dhwSettings.systemType === 'storage' ? 'Storage Tank' : 
                dhwSettings.systemType === 'instantaneous' ? 'Tankless' : 'Hybrid'})
            </span>
          </h4>
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
            
            {/* Show storage for storage/hybrid systems */}
            {(dhwSettings.systemType === 'storage' || dhwSettings.systemType === 'hybrid') && (
              <div className="flex justify-between">
                <span className="text-surface-300">Storage Tank:</span>
                <span className="text-cyan-400 font-mono">{dhw.storageGallons.toLocaleString()} gal</span>
              </div>
            )}
            
            {/* Show tankless for instantaneous/hybrid systems */}
            {(dhwSettings.systemType === 'instantaneous' || dhwSettings.systemType === 'hybrid') && (
              <div className="flex justify-between">
                <span className="text-surface-300">Tankless Units:</span>
                <span className="text-emerald-400 font-mono">
                  {dhw.tanklessUnits} × {((dhwSettings.tanklessUnitBtu || dhwDefaults.tankless_unit_btu) / 1000).toFixed(0)}k BTU
                </span>
              </div>
            )}
          </div>
          
          {/* Recommendation */}
          {breakdown && (
            <div className="mt-4 pt-3 border-t border-primary-700/30">
              <p className="text-xs text-primary-400">
                <strong>Recommendation:</strong> {breakdown.recommendedSystemType}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
