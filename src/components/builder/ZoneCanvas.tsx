import { useState } from 'react'
import ZoneBlock from './ZoneBlock'
import ZoneEditor from './ZoneEditor'
import TotalsBar from './TotalsBar'
import AddZoneModal from './AddZoneModal'
import { useProjectStore } from '../../store/useProjectStore'
import type { Zone, CalculationResults, ZoneFixtures } from '../../types'

interface ZoneCanvasProps {
  calculations: {
    results: CalculationResults | null
    aggregatedFixtures: ZoneFixtures
    totalSF: number
  }
}

export default function ZoneCanvas({ calculations }: ZoneCanvasProps) {
  const { zones, currentProject } = useProjectStore()
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const totalSF = calculations.totalSF
  const targetSF = currentProject?.targetSF || 1

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Canvas */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Zones Grid */}
        {zones.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No zones yet</h3>
              <p className="text-surface-400 mb-6 max-w-sm">
                Start building your facility by adding zones. Each zone represents a distinct area with its own MEP requirements.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add First Zone
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Zone Blocks Grid */}
            <div className="grid gap-3 auto-rows-min" style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            }}>
              {zones.map(zone => {
                // Calculate proportional height based on SF
                const percentage = (zone.sf / targetSF) * 100
                const minHeight = 120
                const maxHeight = 300
                const height = Math.min(maxHeight, Math.max(minHeight, percentage * 3))
                
                return (
                  <ZoneBlock
                    key={zone.id}
                    zone={zone}
                    totalSF={totalSF}
                    height={height}
                    isSelected={selectedZone?.id === zone.id}
                    onClick={() => setSelectedZone(zone)}
                  />
                )
              })}
              
              {/* Add Zone Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="min-h-[120px] border-2 border-dashed border-surface-600 hover:border-primary-500 rounded-xl flex flex-col items-center justify-center gap-2 text-surface-400 hover:text-primary-400 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium">Add Zone</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Totals Sidebar */}
      <TotalsBar calculations={calculations} />

      {/* Zone Editor Slide-out */}
      {selectedZone && (
        <ZoneEditor
          zone={selectedZone}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* Add Zone Modal */}
      {showAddModal && (
        <AddZoneModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
