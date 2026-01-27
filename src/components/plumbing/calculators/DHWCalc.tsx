import { usePlumbingStore } from '../../../store/usePlumbingStore'
import { NYC_FIXTURE_DATABASE } from '../../../data/nycFixtures'
import { dhwBuildingTypeFactors } from '../../../data/defaults'
import { gasHeaterEfficiencyPresets } from '../../../calculations/dhw'

export default function DHWCalc() {
  const { spaces, currentProject, updateProjectSettings } = usePlumbingStore()
  const settings = currentProject?.settings

  if (!settings) return null

  // Get building type info
  const buildingTypeInfo = dhwBuildingTypeFactors[settings.dhwBuildingType] || dhwBuildingTypeFactors.gymnasium

  // Calculate hot water demand from fixtures
  let totalHotWaterGPH = 0
  const fixtureHotWater: { name: string; icon: string; count: number; gphEach: number; gphTotal: number }[] = []

  const fixtureMap = new Map<string, number>()
  spaces.forEach(space => {
    Object.entries(space.fixtures).forEach(([fixtureId, count]) => {
      if (count > 0) {
        fixtureMap.set(fixtureId, (fixtureMap.get(fixtureId) || 0) + count)
      }
    })
  })

  fixtureMap.forEach((count, fixtureId) => {
    const fixture = NYC_FIXTURE_DATABASE.find(f => f.id === fixtureId)
    if (fixture && fixture.hotWaterGPH > 0) {
      const total = fixture.hotWaterGPH * count
      totalHotWaterGPH += total
      fixtureHotWater.push({
        name: fixture.name,
        icon: fixture.icon,
        count,
        gphEach: fixture.hotWaterGPH,
        gphTotal: total,
      })
    }
  })

  fixtureHotWater.sort((a, b) => b.gphTotal - a.gphTotal)

  // ASHRAE Calculations
  const peakDemandGPH = totalHotWaterGPH * settings.dhwDemandFactor
  const tempRise = settings.dhwStorageTemp - settings.coldWaterTemp
  const deliveryTempRise = settings.dhwDeliveryTemp - settings.coldWaterTemp
  const mixingRatio = deliveryTempRise / tempRise

  // Storage Tank Sizing
  const storageVolume = (peakDemandGPH * settings.dhwPeakDuration) / settings.dhwStorageFactor * mixingRatio
  const recoveryGPH = storageVolume * settings.dhwRecoveryFactor / settings.dhwPeakDuration

  // Heater BTU Calculations
  const btuPerGallon = 8.33 * tempRise
  const grossBTUH = recoveryGPH * btuPerGallon
  const netBTUH = grossBTUH * (settings.dhwHeaterType === 'gas' ? settings.dhwGasEfficiency : 0.98)
  const heaterMBH = grossBTUH / 1000
  const heaterKW = netBTUH / 3412

  // Tankless Sizing
  const tanklessGPM = peakDemandGPH / 60
  const tanklessBTUH = tanklessGPM * 60 * 8.33 * (settings.dhwDeliveryTemp - settings.coldWaterTemp)
  const tanklessMBH = tanklessBTUH / 1000
  const tanklessUnitsNeeded = Math.ceil(tanklessBTUH / settings.dhwTanklessUnitBtu)

  // Gas consumption
  const gasCFH = settings.dhwHeaterType === 'gas' ? heaterMBH : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">DHW Calculator 🔥🐐</h2>
        <p className="text-surface-400">
          ASHRAE Service Water Heating Method - Same calculations as Concept MEP
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* System Type */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">System Type</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['storage', 'tankless', 'hybrid'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => updateProjectSettings({ dhwSystemType: type })}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    settings.dhwSystemType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                  }`}
                >
                  {type === 'storage' ? '🛢️ Tank' : type === 'tankless' ? '⚡ Tankless' : '🔄 Hybrid'}
                </button>
              ))}
            </div>
            <p className="text-xs text-surface-500 mt-2">
              {settings.dhwSystemType === 'storage' && 'Traditional tank with stored hot water'}
              {settings.dhwSystemType === 'tankless' && 'On-demand tankless heaters'}
              {settings.dhwSystemType === 'hybrid' && 'Small tank + tankless booster'}
            </p>
          </div>

          {/* Building Type (ASHRAE) */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Building Type (ASHRAE)</h3>
            <select
              value={settings.dhwBuildingType}
              onChange={(e) => {
                const newType = e.target.value
                const factors = dhwBuildingTypeFactors[newType]
                if (factors) {
                  updateProjectSettings({ 
                    dhwBuildingType: newType,
                    dhwDemandFactor: factors.demandDiversity,
                    dhwStorageFactor: factors.storageFactor,
                    dhwPeakDuration: factors.typicalPeakDuration,
                  })
                }
              }}
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
            >
              {Object.entries(dhwBuildingTypeFactors).map(([key, info]) => (
                <option key={key} value={key}>{info.name}</option>
              ))}
            </select>
            <p className="text-xs text-surface-500 mt-2">{buildingTypeInfo.notes}</p>
          </div>

          {/* Energy Source */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Energy Source</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['gas', 'electric'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => updateProjectSettings({ dhwHeaterType: type })}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    settings.dhwHeaterType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                  }`}
                >
                  {type === 'electric' ? '⚡ Electric' : '🔥 Gas'}
                </button>
              ))}
            </div>

            {/* Gas Efficiency */}
            {settings.dhwHeaterType === 'gas' && (
              <div className="mt-4">
                <label className="block text-xs text-surface-400 mb-1">Gas Efficiency</label>
                <select
                  value={settings.dhwGasEfficiency}
                  onChange={(e) => updateProjectSettings({ dhwGasEfficiency: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                >
                  {gasHeaterEfficiencyPresets.map(preset => (
                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Temperature Settings */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Temperatures</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Storage Temp (Ts)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.dhwStorageTemp}
                    onChange={(e) => updateProjectSettings({ dhwStorageTemp: parseInt(e.target.value) || 140 })}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">°F</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Delivery Temp (Tf)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.dhwDeliveryTemp}
                    onChange={(e) => updateProjectSettings({ dhwDeliveryTemp: parseInt(e.target.value) || 110 })}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">°F</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Cold Water (Tc)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.coldWaterTemp}
                    onChange={(e) => updateProjectSettings({ coldWaterTemp: parseInt(e.target.value) || 55 })}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">°F</span>
                </div>
              </div>
            </div>
          </div>

          {/* ASHRAE Sizing Parameters */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">ASHRAE Parameters</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Peak Duration (hrs)</label>
                <input
                  type="number"
                  value={settings.dhwPeakDuration}
                  onChange={(e) => updateProjectSettings({ dhwPeakDuration: parseFloat(e.target.value) || 2 })}
                  min={0.5}
                  max={8}
                  step={0.5}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Simultaneity Factor</label>
                <input
                  type="number"
                  value={settings.dhwDemandFactor}
                  onChange={(e) => updateProjectSettings({ dhwDemandFactor: parseFloat(e.target.value) || 0.7 })}
                  min={0.3}
                  max={1.0}
                  step={0.05}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
                <p className="text-xs text-surface-500 mt-1">% fixtures operating at once</p>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Storage Factor</label>
                <input
                  type="number"
                  value={settings.dhwStorageFactor}
                  onChange={(e) => updateProjectSettings({ dhwStorageFactor: parseFloat(e.target.value) || 0.7 })}
                  min={0.5}
                  max={0.9}
                  step={0.05}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
                <p className="text-xs text-surface-500 mt-1">Usable tank %</p>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Recovery Factor</label>
                <input
                  type="number"
                  value={settings.dhwRecoveryFactor}
                  onChange={(e) => updateProjectSettings({ dhwRecoveryFactor: parseFloat(e.target.value) || 1.0 })}
                  min={0.8}
                  max={1.5}
                  step={0.1}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
                <p className="text-xs text-surface-500 mt-1">Heater sizing multiplier</p>
              </div>
            </div>
          </div>

          {/* Tankless Unit Size */}
          {(settings.dhwSystemType === 'tankless' || settings.dhwSystemType === 'hybrid') && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3">Tankless Unit</h3>
              <label className="block text-xs text-surface-400 mb-1">Unit Capacity</label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.dhwTanklessUnitBtu}
                  onChange={(e) => updateProjectSettings({ dhwTanklessUnitBtu: parseInt(e.target.value) || 199900 })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">BTU/hr</span>
              </div>
              <p className="text-xs text-surface-500 mt-1">Navien: 199,900 BTU</p>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-800 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-400 mb-1">{Math.round(peakDemandGPH)}</p>
              <p className="text-xs text-surface-400">Peak GPH</p>
            </div>
            <div className="bg-surface-800 border border-blue-500/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400 mb-1">{Math.round(storageVolume)}</p>
              <p className="text-xs text-surface-400">Storage (gal)</p>
            </div>
            <div className="bg-surface-800 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400 mb-1">
                {settings.dhwSystemType === 'tankless' ? tanklessMBH.toFixed(0) : heaterMBH.toFixed(0)}
              </p>
              <p className="text-xs text-surface-400">Heater (MBH)</p>
            </div>
            {settings.dhwHeaterType === 'electric' && (
              <div className="bg-surface-800 border border-yellow-500/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400 mb-1">{heaterKW.toFixed(1)}</p>
                <p className="text-xs text-surface-400">Electric (kW)</p>
              </div>
            )}
            {settings.dhwHeaterType === 'gas' && (
              <div className="bg-surface-800 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-400 mb-1">{gasCFH.toFixed(0)}</p>
                <p className="text-xs text-surface-400">Gas (CFH)</p>
              </div>
            )}
          </div>

          {/* Calculation Breakdown */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-700 bg-surface-700/50">
              <h3 className="font-semibold text-white">
                {settings.dhwSystemType === 'storage' ? '📦 Storage Tank Sizing' : 
                 settings.dhwSystemType === 'tankless' ? '⚡ Tankless Sizing' : '🔄 Hybrid Sizing'}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Total Fixture Demand</span>
                <span className="text-white font-mono">{Math.round(totalHotWaterGPH)} GPH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">× Simultaneity ({(settings.dhwDemandFactor * 100).toFixed(0)}%)</span>
                <span className="text-orange-400 font-mono">{Math.round(peakDemandGPH)} GPH peak</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Temperature Rise (Tc → Ts)</span>
                <span className="text-white font-mono">{settings.coldWaterTemp}°F → {settings.dhwStorageTemp}°F ({tempRise}°F)</span>
              </div>
              
              {settings.dhwSystemType === 'storage' && (
                <>
                  <div className="border-t border-surface-700 pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-400">Peak Duration</span>
                      <span className="text-white font-mono">{settings.dhwPeakDuration} hours</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-400">Storage Factor</span>
                      <span className="text-white font-mono">{(settings.dhwStorageFactor * 100).toFixed(0)}% usable</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium mt-2">
                      <span className="text-blue-400">Recommended Storage</span>
                      <span className="text-blue-400 font-mono">{Math.round(storageVolume)} gallons</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-400">Recovery Rate</span>
                      <span className="text-white font-mono">{Math.round(recoveryGPH)} GPH</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium mt-2">
                      <span className="text-red-400">Heater Input Required</span>
                      <span className="text-red-400 font-mono">{heaterMBH.toFixed(0)} MBH ({Math.round(grossBTUH).toLocaleString()} BTU/hr)</span>
                    </div>
                  </div>
                </>
              )}

              {settings.dhwSystemType === 'tankless' && (
                <>
                  <div className="border-t border-surface-700 pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-400">Peak Flow Rate</span>
                      <span className="text-white font-mono">{tanklessGPM.toFixed(1)} GPM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-400">Delivery Temp Rise</span>
                      <span className="text-white font-mono">{settings.dhwDeliveryTemp - settings.coldWaterTemp}°F</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium mt-2">
                      <span className="text-red-400">Total Heating Required</span>
                      <span className="text-red-400 font-mono">{tanklessMBH.toFixed(0)} MBH</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium mt-2">
                      <span className="text-cyan-400">Units Needed ({(settings.dhwTanklessUnitBtu / 1000).toFixed(0)}k BTU each)</span>
                      <span className="text-cyan-400 font-mono">{tanklessUnitsNeeded} unit{tanklessUnitsNeeded !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Fixture Hot Water Demand */}
          {fixtureHotWater.length > 0 && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-700 bg-surface-700/50">
                <h3 className="font-semibold text-white">Hot Water Demand by Fixture</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-700/50 text-sm text-surface-400">
                    <th className="px-4 py-2 text-left">Fixture</th>
                    <th className="px-4 py-2 text-center">Count</th>
                    <th className="px-4 py-2 text-center">GPH Each</th>
                    <th className="px-4 py-2 text-center">Total GPH</th>
                  </tr>
                </thead>
                <tbody>
                  {fixtureHotWater.map((fixture, i) => (
                    <tr key={i} className="border-b border-surface-700/30">
                      <td className="px-4 py-2">
                        <span className="mr-2">{fixture.icon}</span>
                        {fixture.name}
                      </td>
                      <td className="px-4 py-2 text-center text-white">{fixture.count}</td>
                      <td className="px-4 py-2 text-center text-surface-400">{fixture.gphEach}</td>
                      <td className="px-4 py-2 text-center text-orange-400 font-medium">{fixture.gphTotal}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-700/50 font-bold">
                    <td className="px-4 py-2 text-white" colSpan={3}>Total (before demand factor)</td>
                    <td className="px-4 py-2 text-center text-orange-400">{Math.round(totalHotWaterGPH)} GPH</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* No fixtures warning */}
          {fixtureHotWater.length === 0 && (
            <div className="bg-surface-800 border border-amber-500/30 rounded-xl p-6 text-center">
              <p className="text-amber-400 text-lg mb-2">⚠️ No Hot Water Fixtures</p>
              <p className="text-surface-400">Add spaces with showers, lavatories, or other hot water fixtures to calculate DHW demand.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
