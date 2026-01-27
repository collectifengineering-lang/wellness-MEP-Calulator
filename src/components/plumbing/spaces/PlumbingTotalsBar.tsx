import { usePlumbingStore } from '../../../store/usePlumbingStore'
import { NYC_FIXTURE_DATABASE } from '../../../data/nycFixtures'
import { calculatePlumbing } from '../../../calculations/plumbing'
import { getLegacyFixtureCounts } from '../../../data/fixtureUtils'

export default function PlumbingTotalsBar() {
  const { spaces, currentProject } = usePlumbingStore()

  // Aggregate all fixtures
  const aggregatedFixtures = spaces.reduce((acc, space) => {
    const legacy = getLegacyFixtureCounts(space.fixtures)
    return {
      showers: acc.showers + legacy.showers,
      lavs: acc.lavs + legacy.lavs,
      wcs: acc.wcs + legacy.wcs,
      floorDrains: acc.floorDrains + legacy.floorDrains,
      serviceSinks: acc.serviceSinks + legacy.serviceSinks,
      washingMachines: acc.washingMachines + legacy.washingMachines,
      dryers: acc.dryers + legacy.dryers,
    }
  }, { showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0 })

  // Calculate totals from all spaces
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

  // Calculate pipe sizes
  const plumbingResult = calculatePlumbing(aggregatedFixtures, {
    coldWaterVelocityFPS: currentProject?.settings.coldWaterVelocityFps || 8,
    hotWaterVelocityFPS: currentProject?.settings.hotWaterVelocityFps || 5,
    hotWaterFlowRatio: 0.7,
  })

  const totalSF = spaces.reduce((sum, s) => sum + s.sf, 0)
  const totalFixtures = Object.values(aggregatedFixtures).reduce((sum, count) => sum + count, 0)

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Project Totals 🐐</h3>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white">{spaces.length}</p>
          <p className="text-xs text-surface-400">Spaces</p>
        </div>
        <div className="bg-surface-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white">{totalSF.toLocaleString()}</p>
          <p className="text-xs text-surface-400">Total SF</p>
        </div>
        <div className="bg-surface-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white">{totalFixtures}</p>
          <p className="text-xs text-surface-400">Fixtures</p>
        </div>
        <div className="bg-surface-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-pink-400">{Math.round(totalWSFU)}</p>
          <p className="text-xs text-surface-400">Total WSFU</p>
        </div>
      </div>

      {/* Fixture Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-surface-300 mb-3">Fixture Count</h4>
        <div className="space-y-2">
          {aggregatedFixtures.wcs > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">🚽 Water Closets</span>
              <span className="text-white">{aggregatedFixtures.wcs}</span>
            </div>
          )}
          {aggregatedFixtures.lavs > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">🚰 Lavatories</span>
              <span className="text-white">{aggregatedFixtures.lavs}</span>
            </div>
          )}
          {aggregatedFixtures.showers > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">🚿 Showers</span>
              <span className="text-white">{aggregatedFixtures.showers}</span>
            </div>
          )}
          {aggregatedFixtures.floorDrains > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">🕳️ Floor Drains</span>
              <span className="text-white">{aggregatedFixtures.floorDrains}</span>
            </div>
          )}
          {aggregatedFixtures.serviceSinks > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">🧹 Service Sinks</span>
              <span className="text-white">{aggregatedFixtures.serviceSinks}</span>
            </div>
          )}
          {aggregatedFixtures.washingMachines > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">🧺 Washers</span>
              <span className="text-white">{aggregatedFixtures.washingMachines}</span>
            </div>
          )}
        </div>
      </div>

      {/* Plumbing Totals */}
      <div className="border-t border-surface-700 pt-4 mb-6">
        <h4 className="text-sm font-medium text-surface-300 mb-3">Calculations</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Total WSFU</span>
            <span className="text-pink-400 font-medium">{Math.round(totalWSFU)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Total DFU</span>
            <span className="text-blue-400 font-medium">{Math.round(totalDFU)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Peak GPM</span>
            <span className="text-cyan-400 font-medium">{plumbingResult.peakGPM.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Hot Water GPH</span>
            <span className="text-orange-400 font-medium">{Math.round(totalHotWaterGPH)}</span>
          </div>
        </div>
      </div>

      {/* Pipe Sizes */}
      <div className="border-t border-surface-700 pt-4">
        <h4 className="text-sm font-medium text-surface-300 mb-3">Pipe Sizes</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Cold Water Main</span>
            <span className="text-white font-medium">{plumbingResult.coldWaterMainSize}"</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Hot Water Main</span>
            <span className="text-white font-medium">{plumbingResult.hotWaterMainSize}"</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Sanitary Main</span>
            <span className="text-white font-medium">{plumbingResult.recommendedDrainSize}"</span>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg">
        <p className="text-xs text-pink-300">
          💡 Select a space to edit its fixtures, or use the calculator tabs for detailed sizing.
        </p>
      </div>
    </div>
  )
}
