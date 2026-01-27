import { usePlumbingStore } from '../../../store/usePlumbingStore'
import { NYC_FIXTURE_DATABASE } from '../../../data/nycFixtures'

export default function FixtureUnitsCalc() {
  const { spaces } = usePlumbingStore()

  // Aggregate fixtures across all spaces with WSFU/DFU calculations
  const fixtureData: {
    id: string
    name: string
    icon: string
    count: number
    wsfuEach: number
    dfuEach: number
    wsfuTotal: number
    dfuTotal: number
  }[] = []

  // Collect all fixtures
  const fixtureMap = new Map<string, number>()
  spaces.forEach(space => {
    Object.entries(space.fixtures).forEach(([fixtureId, count]) => {
      if (count > 0) {
        fixtureMap.set(fixtureId, (fixtureMap.get(fixtureId) || 0) + count)
      }
    })
  })

  // Build fixture data
  fixtureMap.forEach((count, fixtureId) => {
    const fixture = NYC_FIXTURE_DATABASE.find(f => f.id === fixtureId)
    if (fixture) {
      fixtureData.push({
        id: fixtureId,
        name: fixture.name,
        icon: fixture.icon,
        count,
        wsfuEach: fixture.wsfuTotal || 0,
        dfuEach: fixture.dfu,
        wsfuTotal: (fixture.wsfuTotal || 0) * count,
        dfuTotal: fixture.dfu * count,
      })
    }
  })

  // Sort by count descending
  fixtureData.sort((a, b) => b.count - a.count)

  // Calculate totals
  const totalWSFU = fixtureData.reduce((sum, f) => sum + f.wsfuTotal, 0)
  const totalDFU = fixtureData.reduce((sum, f) => sum + f.dfuTotal, 0)
  const totalFixtures = fixtureData.reduce((sum, f) => sum + f.count, 0)

  // Hunter's Curve approximation for GPM
  const calculateGPM = (wsfu: number): number => {
    if (wsfu <= 0) return 0
    if (wsfu <= 10) return wsfu * 1.0
    if (wsfu <= 50) return 10 + (wsfu - 10) * 0.8
    if (wsfu <= 200) return 42 + (wsfu - 50) * 0.5
    return 117 + (wsfu - 200) * 0.3
  }

  const peakGPM = calculateGPM(totalWSFU)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Fixture Unit Calculator 🚰🐐</h2>
        <p className="text-surface-400">
          Water Supply Fixture Units (WSFU) and Drainage Fixture Units (DFU) based on ASPE tables
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white mb-1">{totalFixtures}</p>
          <p className="text-sm text-surface-400">Total Fixtures</p>
        </div>
        <div className="bg-surface-800 border border-pink-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-pink-400 mb-1">{Math.round(totalWSFU)}</p>
          <p className="text-sm text-surface-400">Total WSFU</p>
        </div>
        <div className="bg-surface-800 border border-blue-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400 mb-1">{Math.round(totalDFU)}</p>
          <p className="text-sm text-surface-400">Total DFU</p>
        </div>
        <div className="bg-surface-800 border border-cyan-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-cyan-400 mb-1">{peakGPM.toFixed(1)}</p>
          <p className="text-sm text-surface-400">Peak GPM</p>
        </div>
      </div>

      {/* Fixture Table */}
      {fixtureData.length === 0 ? (
        <div className="text-center py-16 bg-surface-800 border border-surface-700 rounded-xl">
          <div className="text-5xl mb-4">🚿</div>
          <p className="text-surface-400">No fixtures yet. Add spaces with fixtures to see calculations.</p>
        </div>
      ) : (
        <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-surface-300">Fixture</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-surface-300">Count</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-surface-300">WSFU Each</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-surface-300">DFU Each</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-pink-400">Total WSFU</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-blue-400">Total DFU</th>
              </tr>
            </thead>
            <tbody>
              {fixtureData.map((fixture) => (
                <tr key={fixture.id} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{fixture.icon}</span>
                      <span className="text-white">{fixture.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-white font-medium">{fixture.count}</td>
                  <td className="px-4 py-3 text-center text-surface-400">{fixture.wsfuEach}</td>
                  <td className="px-4 py-3 text-center text-surface-400">{fixture.dfuEach}</td>
                  <td className="px-4 py-3 text-center text-pink-400 font-medium">{fixture.wsfuTotal.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-blue-400 font-medium">{fixture.dfuTotal}</td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-surface-700/50 font-bold">
                <td className="px-4 py-3 text-white">TOTAL</td>
                <td className="px-4 py-3 text-center text-white">{totalFixtures}</td>
                <td className="px-4 py-3 text-center text-surface-400">—</td>
                <td className="px-4 py-3 text-center text-surface-400">—</td>
                <td className="px-4 py-3 text-center text-pink-400">{totalWSFU.toFixed(1)}</td>
                <td className="px-4 py-3 text-center text-blue-400">{Math.round(totalDFU)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Space Breakdown */}
      {spaces.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">By Space</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {spaces.map(space => {
              let spaceWSFU = 0
              let spaceDFU = 0
              Object.entries(space.fixtures).forEach(([fixtureId, count]) => {
                if (count <= 0) return
                const fixture = NYC_FIXTURE_DATABASE.find(f => f.id === fixtureId)
                if (fixture) {
                  spaceWSFU += (fixture.wsfuTotal || 0) * count
                  spaceDFU += fixture.dfu * count
                }
              })
              
              return (
                <div key={space.id} className="bg-surface-800 border border-surface-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2 truncate">{space.name}</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-400">WSFU:</span>
                    <span className="text-pink-400">{spaceWSFU.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-400">DFU:</span>
                    <span className="text-blue-400">{spaceDFU}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reference Note */}
      <div className="mt-8 p-4 bg-surface-800/50 border border-surface-700 rounded-lg">
        <p className="text-sm text-surface-400">
          <strong className="text-surface-300">Reference:</strong> WSFU/DFU values based on ASPE Plumbing Engineering Design Handbook. 
          Peak GPM calculated using Hunter's Curve methodology.
        </p>
      </div>
    </div>
  )
}
