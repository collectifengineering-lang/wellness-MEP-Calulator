import { usePlumbingStore } from '../../../store/usePlumbingStore'
import { NYC_FIXTURE_DATABASE } from '../../../data/nycFixtures'
import { calculatePlumbing } from '../../../calculations/plumbing'
import { getLegacyFixtureCounts, mergeFixtures } from '../../../data/fixtureUtils'
import type { ZoneFixtures } from '../../../types'

export default function PlumbingResults() {
  const { spaces, currentProject } = usePlumbingStore()
  const settings = currentProject?.settings

  if (!settings) return null

  // Aggregate FULL fixtures (keep specific fixture IDs for accurate WSFU/DFU)
  const fullAggregatedFixtures = spaces.reduce((acc, space) => {
    return mergeFixtures(acc, space.fixtures)
  }, {} as ZoneFixtures)
  
  // Convert to legacy format for display only
  const legacyFixtures = getLegacyFixtureCounts(fullAggregatedFixtures)

  // Calculate totals using FULL fixture data (accurate WSFU/DFU from ASPE database)
  let totalWSFU = 0
  let totalDFU = 0
  let totalHotWaterGPH = 0
  spaces.forEach(space => {
    Object.entries(space.fixtures).forEach(([fixtureId, count]) => {
      if (count <= 0) return
      const fixture = NYC_FIXTURE_DATABASE.find(f => f.id === fixtureId)
      if (fixture) {
        totalWSFU += (fixture.wsfuTotal || 0) * count
        totalDFU += fixture.dfu * count
        totalHotWaterGPH += fixture.hotWaterGPH * count
      }
    })
  })

  // Use FULL fixtures for calculation (accurate WSFU per fixture type)
  const plumbingResult = calculatePlumbing(fullAggregatedFixtures, {
    coldWaterVelocityFPS: settings.coldWaterVelocityFps,
    hotWaterVelocityFPS: settings.hotWaterVelocityFps,
    hotWaterFlowRatio: settings.hotWaterFlowRatio,
    useCalculatedHWRatio: settings.useCalculatedHWRatio,
  })

  const totalSF = spaces.reduce((sum, s) => sum + s.sf, 0)
  const totalFixtures = Object.values(legacyFixtures).reduce((sum, count) => sum + count, 0)

  // DHW calculations
  const peakDemandGPH = totalHotWaterGPH * settings.dhwDemandFactor
  const tempRise = settings.dhwStorageTemp - settings.coldWaterTemp
  const deliveryTempRise = settings.dhwDeliveryTemp - settings.coldWaterTemp
  const storageFactor = deliveryTempRise / tempRise
  const storageGallons = peakDemandGPH * storageFactor
  const recoveryGPH = storageGallons * settings.dhwRecoveryFactor
  const heaterBTUH = recoveryGPH * 8.33 * tempRise
  const heaterMBH = heaterBTUH / 1000

  const handleExportPDF = () => {
    alert('PDF export coming soon! 🐐')
  }

  const handleExportExcel = () => {
    alert('Excel export coming soon! 🐐')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Results Summary 📊🐐</h2>
          <p className="text-surface-400">
            Complete plumbing calculation summary for {currentProject?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            📄 Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            📊 Export Excel
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Executive Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-3xl font-bold text-white">{spaces.length}</p>
            <p className="text-sm text-surface-400">Spaces</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{totalSF.toLocaleString()}</p>
            <p className="text-sm text-surface-400">Total SF</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-pink-400">{Math.round(totalWSFU)}</p>
            <p className="text-sm text-surface-400">Total WSFU</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-400">{Math.round(totalDFU)}</p>
            <p className="text-sm text-surface-400">Total DFU</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fixture Summary */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🚿 Fixture Summary</h3>
          <div className="space-y-3">
            {legacyFixtures.wcs > 0 && (
              <div className="flex justify-between">
                <span className="text-surface-400">🚽 Water Closets</span>
                <span className="text-white font-medium">{legacyFixtures.wcs}</span>
              </div>
            )}
            {legacyFixtures.lavs > 0 && (
              <div className="flex justify-between">
                <span className="text-surface-400">🚰 Lavatories</span>
                <span className="text-white font-medium">{legacyFixtures.lavs}</span>
              </div>
            )}
            {legacyFixtures.showers > 0 && (
              <div className="flex justify-between">
                <span className="text-surface-400">🚿 Showers</span>
                <span className="text-white font-medium">{legacyFixtures.showers}</span>
              </div>
            )}
            {legacyFixtures.floorDrains > 0 && (
              <div className="flex justify-between">
                <span className="text-surface-400">🕳️ Floor Drains</span>
                <span className="text-white font-medium">{legacyFixtures.floorDrains}</span>
              </div>
            )}
            {legacyFixtures.serviceSinks > 0 && (
              <div className="flex justify-between">
                <span className="text-surface-400">🧹 Service Sinks</span>
                <span className="text-white font-medium">{legacyFixtures.serviceSinks}</span>
              </div>
            )}
            {legacyFixtures.washingMachines > 0 && (
              <div className="flex justify-between">
                <span className="text-surface-400">🧺 Washing Machines</span>
                <span className="text-white font-medium">{legacyFixtures.washingMachines}</span>
              </div>
            )}
            <div className="border-t border-surface-700 pt-3 mt-3">
              <div className="flex justify-between font-bold">
                <span className="text-white">Total Fixtures</span>
                <span className="text-pink-400">{totalFixtures}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pipe Sizing Summary */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📏 Pipe Sizing</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-surface-400">Cold Water Main</span>
              <span className="text-cyan-400 font-bold text-xl">{plumbingResult.coldWaterMainSize}"</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Hot Water Main</span>
              <span className="text-orange-400 font-bold text-xl">{plumbingResult.hotWaterMainSize}"</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Sanitary Main</span>
              <span className="text-amber-400 font-bold text-xl">{plumbingResult.recommendedDrainSize}"</span>
            </div>
            <div className="border-t border-surface-700 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-surface-400">Peak Flow Rate</span>
                <span className="text-white">{plumbingResult.peakGPM.toFixed(1)} GPM</span>
              </div>
            </div>
          </div>
        </div>

        {/* DHW Summary */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔥 Domestic Hot Water</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-surface-400">System Type</span>
              <span className="text-white capitalize">{settings.dhwSystemType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Peak Demand</span>
              <span className="text-white">{Math.round(peakDemandGPH)} GPH</span>
            </div>
            {settings.dhwSystemType === 'storage' && (
              <div className="flex justify-between">
                <span className="text-surface-400">Storage Volume</span>
                <span className="text-white">{Math.round(storageGallons)} gallons</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-surface-400">Heater Capacity</span>
              <span className="text-red-400 font-bold">{heaterMBH.toFixed(0)} MBH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Heater Type</span>
              <span className="text-white capitalize">{settings.dhwHeaterType}</span>
            </div>
          </div>
        </div>

        {/* Design Parameters */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">⚙️ Design Parameters</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-surface-400">Cold Water Velocity</span>
              <span className="text-white">{settings.coldWaterVelocityFps} FPS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Hot Water Velocity</span>
              <span className="text-white">{settings.hotWaterVelocityFps} FPS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Storage Temp</span>
              <span className="text-white">{settings.dhwStorageTemp}°F</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Delivery Temp</span>
              <span className="text-white">{settings.dhwDeliveryTemp}°F</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Cold Water Temp</span>
              <span className="text-white">{settings.coldWaterTemp}°F</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Demand Factor</span>
              <span className="text-white">{(settings.dhwDemandFactor * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Space Breakdown */}
      <div className="mt-8 bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700 bg-surface-700/50">
          <h3 className="text-lg font-semibold text-white">Space Breakdown</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700 text-sm text-surface-400">
              <th className="px-6 py-3 text-left">Space</th>
              <th className="px-6 py-3 text-center">SF</th>
              <th className="px-6 py-3 text-center">Fixtures</th>
              <th className="px-6 py-3 text-center">WSFU</th>
              <th className="px-6 py-3 text-center">DFU</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map(space => {
              let spaceWSFU = 0
              let spaceDFU = 0
              let fixtureCount = 0
              Object.entries(space.fixtures).forEach(([fixtureId, count]) => {
                if (count <= 0) return
                fixtureCount += count
                const fixture = NYC_FIXTURE_DATABASE.find(f => f.id === fixtureId)
                if (fixture) {
                  spaceWSFU += (fixture.wsfuTotal || 0) * count
                  spaceDFU += fixture.dfu * count
                }
              })
              
              return (
                <tr key={space.id} className="border-b border-surface-700/30 hover:bg-surface-700/30">
                  <td className="px-6 py-3 text-white">{space.name}</td>
                  <td className="px-6 py-3 text-center text-surface-400">{space.sf.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center text-surface-400">{fixtureCount}</td>
                  <td className="px-6 py-3 text-center text-pink-400">{spaceWSFU.toFixed(1)}</td>
                  <td className="px-6 py-3 text-center text-blue-400">{spaceDFU}</td>
                </tr>
              )
            })}
            <tr className="bg-surface-700/50 font-bold">
              <td className="px-6 py-3 text-white">TOTAL</td>
              <td className="px-6 py-3 text-center text-white">{totalSF.toLocaleString()}</td>
              <td className="px-6 py-3 text-center text-white">{totalFixtures}</td>
              <td className="px-6 py-3 text-center text-pink-400">{totalWSFU.toFixed(1)}</td>
              <td className="px-6 py-3 text-center text-blue-400">{Math.round(totalDFU)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-surface-500 text-sm">
        <p>🐐 Generated by Collectif GOAT Plumbing Calculator 🐐</p>
        <p className="mt-1">Calculations based on ASPE, ASHRAE, and local plumbing codes</p>
      </div>
    </div>
  )
}
