import { usePlumbingStore } from '../../../store/usePlumbingStore'
import { NYC_FIXTURE_DATABASE } from '../../../data/nycFixtures'

export default function DHWCalc() {
  const { spaces, currentProject, updateProjectSettings } = usePlumbingStore()
  const settings = currentProject?.settings

  if (!settings) return null

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

  // Apply demand factor
  const peakDemandGPH = totalHotWaterGPH * settings.dhwDemandFactor

  // Calculate storage volume (1 hour peak at delivery temp)
  const tempRise = settings.dhwStorageTemp - settings.coldWaterTemp
  const deliveryTempRise = settings.dhwDeliveryTemp - settings.coldWaterTemp
  const storageFactor = deliveryTempRise / tempRise

  // For storage system
  const storageGallons = peakDemandGPH * storageFactor
  const recoveryGPH = storageGallons * settings.dhwRecoveryFactor

  // Calculate BTU/hr for heater
  const btuPerGallon = 8.33 * tempRise
  const heaterBTUH = recoveryGPH * btuPerGallon
  const heaterMBH = heaterBTUH / 1000

  // Tankless sizing (instantaneous)
  const tanklessGPM = peakDemandGPH / 60
  const tanklessBTUH = tanklessGPM * 60 * 8.33 * (settings.dhwDeliveryTemp - settings.coldWaterTemp)
  const tanklessMBH = tanklessBTUH / 1000

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">DHW Calculator 🔥🐐</h2>
        <p className="text-surface-400">
          Domestic Hot Water sizing based on ASHRAE methodology and fixture demands
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">⚙️ Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Heater Type</label>
                <select
                  value={settings.dhwHeaterType}
                  onChange={(e) => updateProjectSettings({ dhwHeaterType: e.target.value as 'gas' | 'electric' })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                >
                  <option value="gas">Gas</option>
                  <option value="electric">Electric</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">System Type</label>
                <select
                  value={settings.dhwSystemType}
                  onChange={(e) => updateProjectSettings({ dhwSystemType: e.target.value as 'storage' | 'tankless' | 'hybrid' })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                >
                  <option value="storage">Storage Tank</option>
                  <option value="tankless">Tankless</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Storage Temp (°F)</label>
                <input
                  type="number"
                  value={settings.dhwStorageTemp}
                  onChange={(e) => updateProjectSettings({ dhwStorageTemp: parseInt(e.target.value) || 140 })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Delivery Temp (°F)</label>
                <input
                  type="number"
                  value={settings.dhwDeliveryTemp}
                  onChange={(e) => updateProjectSettings({ dhwDeliveryTemp: parseInt(e.target.value) || 110 })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Cold Water Temp (°F)</label>
                <input
                  type="number"
                  value={settings.coldWaterTemp}
                  onChange={(e) => updateProjectSettings({ coldWaterTemp: parseInt(e.target.value) || 55 })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Demand Factor</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.dhwDemandFactor}
                  onChange={(e) => updateProjectSettings({ dhwDemandFactor: parseFloat(e.target.value) || 0.7 })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
                <p className="text-xs text-surface-500 mt-1">Simultaneity factor (0.5-1.0)</p>
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Recovery Factor</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.dhwRecoveryFactor}
                  onChange={(e) => updateProjectSettings({ dhwRecoveryFactor: parseFloat(e.target.value) || 0.7 })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
                <p className="text-xs text-surface-500 mt-1">Recovery rate factor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-800 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-orange-400 mb-1">{Math.round(peakDemandGPH)}</p>
              <p className="text-sm text-surface-400">Peak Demand (GPH)</p>
            </div>
            <div className="bg-surface-800 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-400 mb-1">
                {settings.dhwSystemType === 'tankless' ? tanklessMBH.toFixed(0) : heaterMBH.toFixed(0)}
              </p>
              <p className="text-sm text-surface-400">Heater Size (MBH)</p>
            </div>
          </div>

          {/* System Sizing */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">
              {settings.dhwSystemType === 'storage' ? '📦 Storage Tank Sizing' : 
               settings.dhwSystemType === 'tankless' ? '⚡ Tankless Sizing' : '🔄 Hybrid Sizing'}
            </h3>
            
            {settings.dhwSystemType === 'storage' && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-surface-400">Storage Volume</span>
                  <span className="text-white font-medium">{Math.round(storageGallons)} gallons</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Recovery Rate</span>
                  <span className="text-white font-medium">{Math.round(recoveryGPH)} GPH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Heater Input</span>
                  <span className="text-red-400 font-medium">{heaterMBH.toFixed(0)} MBH</span>
                </div>
              </div>
            )}

            {settings.dhwSystemType === 'tankless' && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-surface-400">Peak Flow Rate</span>
                  <span className="text-white font-medium">{tanklessGPM.toFixed(1)} GPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Temperature Rise</span>
                  <span className="text-white font-medium">{settings.dhwDeliveryTemp - settings.coldWaterTemp}°F</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Heater Input</span>
                  <span className="text-red-400 font-medium">{tanklessMBH.toFixed(0)} MBH</span>
                </div>
              </div>
            )}
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
        </div>
      </div>
    </div>
  )
}
