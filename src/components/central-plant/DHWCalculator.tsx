import { useProjectStore } from '../../store/useProjectStore'
import { gasHeaterEfficiencyPresets, getHeatPumpPresetsForConditions, type DHWCalcBreakdown } from '../../calculations/dhw'
import { dhwDefaults, dhwBuildingTypeFactors } from '../../data/defaults'
import { getLegacyFixtureCounts } from '../../data/fixtureUtils'
import type { CalculationResults, ZoneFixtures, DHWBuildingType, DHWSystemType } from '../../types'

interface DHWCalculatorProps {
  results: CalculationResults & { dhw: CalculationResults['dhw'] & { breakdown?: DHWCalcBreakdown } }
  fixtures: ZoneFixtures
}

export default function DHWCalculator({ results, fixtures }: DHWCalculatorProps) {
  const { currentProject, updateDHWSettings } = useProjectStore()
  
  // Convert full fixtures to legacy format for display
  const legacyFixtures = getLegacyFixtureCounts(fixtures)

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

        {/* Heat Pump Water Heater Options (for electric) */}
        {dhwSettings.heaterType === 'electric' && (
          <div className="bg-surface-900/50 rounded-lg p-4 border border-emerald-700/30">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="useHeatPump"
                checked={dhwSettings.useHeatPump || false}
                onChange={(e) => updateDHWSettings({ useHeatPump: e.target.checked })}
                className="w-4 h-4 rounded border-surface-500 bg-surface-800 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="useHeatPump" className="text-sm font-medium text-surface-300 cursor-pointer">
                🌡️ Heat Pump Water Heater (HPWH)
              </label>
            </div>
            
            {dhwSettings.useHeatPump && (
              <div className="space-y-4 pl-7">
                {/* Design Conditions */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Operating Conditions</label>
                  <select
                    value={dhwSettings.heatPumpDesignConditions || 'standard'}
                    onChange={(e) => {
                      const conditions = e.target.value as 'standard' | 'cold_climate' | 'high_temp' | 'custom'
                      // Set default COP based on conditions
                      const defaultCOPs = {
                        standard: 3.2,
                        cold_climate: 2.1,
                        high_temp: 2.8,
                        custom: dhwSettings.heatPumpCOP || 3.2,
                      }
                      updateDHWSettings({ 
                        heatPumpDesignConditions: conditions,
                        heatPumpCOP: defaultCOPs[conditions]
                      })
                    }}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                  >
                    <option value="standard">Standard (68°F ambient, 140°F outlet)</option>
                    <option value="cold_climate">Cold Climate (47°F ambient)</option>
                    <option value="high_temp">High Temp (160°F+ outlet)</option>
                    <option value="custom">Custom COP</option>
                  </select>
                </div>

                {/* COP Selection */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">
                    Coefficient of Performance (COP)
                    <span className="ml-2 text-emerald-400">Higher = More Efficient</span>
                  </label>
                  {dhwSettings.heatPumpDesignConditions === 'custom' ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={dhwSettings.heatPumpCOP || 3.2}
                        onChange={(e) => updateDHWSettings({ heatPumpCOP: Number(e.target.value) })}
                        min={1.5}
                        max={5.0}
                        step={0.1}
                        className="flex-1 px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      />
                      <span className="flex items-center text-surface-400 text-sm">COP</span>
                    </div>
                  ) : (
                    <select
                      value={dhwSettings.heatPumpCOP || 3.2}
                      onChange={(e) => updateDHWSettings({ heatPumpCOP: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                    >
                      {getHeatPumpPresetsForConditions(dhwSettings.heatPumpDesignConditions || 'standard').map(preset => (
                        <option key={`${preset.value}-${preset.label}`} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Manufacturer references */}
                <div className="text-xs text-surface-500 space-y-1">
                  <p className="font-medium text-surface-400">Manufacturer Reference (at standard conditions):</p>
                  <div className="grid grid-cols-2 gap-x-4">
                    <span>• Colmac CxA: COP 3.2</span>
                    <span>• Lync by Watts: COP 3.5</span>
                    <span>• Transom HPA: COP 3.8</span>
                    <span>• Sanden SANCO2: COP 3.0</span>
                  </div>
                </div>

                {/* Energy Savings Preview */}
                {breakdown && (
                  <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-emerald-400 mb-2">💡 Energy Savings with Heat Pump</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-surface-400">Standard Electric:</span>
                        <span className="ml-2 text-surface-300 font-mono">{breakdown.electricKWWithoutHeatPump?.toFixed(1)} kW</span>
                      </div>
                      <div>
                        <span className="text-surface-400">With Heat Pump:</span>
                        <span className="ml-2 text-emerald-400 font-mono">{breakdown.electricKWWithHeatPump?.toFixed(1)} kW</span>
                      </div>
                      <div className="col-span-2 border-t border-emerald-700/30 pt-2 mt-1">
                        <span className="text-emerald-300 font-medium">
                          Savings: {breakdown.electricKWSavings?.toFixed(1)} kW ({((breakdown.electricKWSavings || 0) / (breakdown.electricKWWithoutHeatPump || 1) * 100).toFixed(0)}% reduction)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!dhwSettings.useHeatPump && (
              <p className="text-xs text-surface-500 pl-7">
                Enable to use heat pump technology for significantly reduced electrical consumption.
                Typical energy savings: 50-75% compared to standard electric resistance heating.
              </p>
            )}
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
              <label className="block text-xs text-surface-400 mb-1">Simultaneity Factor</label>
              <input
                type="number"
                value={dhwSettings.demandFactor}
                onChange={(e) => updateDHWSettings({ demandFactor: Number(e.target.value) })}
                min={0.3}
                max={1.0}
                step={0.05}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
              <p className="text-xs text-surface-500 mt-1">% of fixtures operating at once</p>
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
              <span className="text-surface-400">Showers ({legacyFixtures.showers}):</span>
              <span className="text-white font-mono">{breakdown?.showerDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Lavatories ({legacyFixtures.lavs}):</span>
              <span className="text-white font-mono">{breakdown?.lavDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Service Sinks ({legacyFixtures.serviceSinks}):</span>
              <span className="text-white font-mono">{breakdown?.serviceSinkDemandGPH ?? '--'} GPH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Washers ({legacyFixtures.washingMachines}):</span>
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
                <span className="text-surface-300">
                  Electric Input
                  {dhwSettings.useHeatPump && (
                    <span className="ml-1 text-emerald-400 text-xs">(HPWH COP {dhwSettings.heatPumpCOP})</span>
                  )}:
                </span>
                <span className={`font-mono ${dhwSettings.useHeatPump ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {dhw.electricKW.toLocaleString()} kW
                </span>
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
