import { useState, useMemo } from 'react'
import ZoneBlock from './ZoneBlock'
import ZoneEditor from './ZoneEditor'
import TotalsBar from './TotalsBar'
import AddZoneModal from './AddZoneModal'
import PDFImportModal from './PDFImportModal'
import { useProjectStore } from '../../store/useProjectStore'
import type { Zone, CalculationResults, ZoneFixtures } from '../../types'
import { groupZonesByFloor, getFloorColor } from '../../data/floorUtils'

interface ZoneCanvasProps {
  calculations: {
    results: CalculationResults | null
    aggregatedFixtures: ZoneFixtures
    mechanicalKVA: { total: number; breakdown: { name: string; kva: number }[] }
    totalSF: number
  }
}

export default function ZoneCanvas({ calculations }: ZoneCanvasProps) {
  const { zones, currentProject } = useProjectStore()
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPDFImport, setShowPDFImport] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'floors'>('floors')
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set())

  const totalSF = calculations.totalSF
  const targetSF = currentProject?.targetSF || 1
  
  // Group zones by floor
  const zonesByFloor = useMemo(() => groupZonesByFloor(zones), [zones])
  
  // Calculate SF per floor
  const floorStats = useMemo(() => {
    const stats = new Map<string, { sf: number; count: number }>()
    for (const [key, { zones: floorZones }] of zonesByFloor) {
      const sf = floorZones.reduce((sum, z) => sum + z.sf, 0)
      stats.set(key, { sf, count: floorZones.length })
    }
    return stats
  }, [zonesByFloor])
  
  const toggleFloorCollapse = (floorKey: string) => {
    setCollapsedFloors(prev => {
      const next = new Set(prev)
      if (next.has(floorKey)) {
        next.delete(floorKey)
      } else {
        next.add(floorKey)
      }
      return next
    })
  }

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
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add First Zone
                </button>
                <button
                  onClick={() => setShowPDFImport(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg font-medium transition-colors border border-surface-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import from PDF
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-surface-400">View:</span>
                <div className="flex bg-surface-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('floors')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      viewMode === 'floors'
                        ? 'bg-primary-600 text-white'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    🏢 By Floor
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary-600 text-white'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    ⊞ Grid
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Zone
                </button>
                <button
                  onClick={() => setShowPDFImport(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white text-sm rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import PDF
                </button>
              </div>
            </div>
            
            {viewMode === 'floors' ? (
              /* Floor-grouped view */
              <div className="space-y-4">
                {Array.from(zonesByFloor.entries()).map(([floorKey, { floorInfo, zones: floorZones }]) => {
                  const stats = floorStats.get(floorKey)
                  const isCollapsed = collapsedFloors.has(floorKey)
                  const floorColor = getFloorColor(floorInfo.floor)
                  
                  return (
                    <div key={floorKey} className="bg-surface-800/50 rounded-xl border border-surface-700 overflow-hidden">
                      {/* Floor Header */}
                      <button
                        onClick={() => toggleFloorCollapse(floorKey)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: floorColor }}
                          >
                            {floorInfo.floor || '?'}
                          </div>
                          <div className="text-left">
                            <div className="text-white font-semibold">{floorInfo.displayName}</div>
                            <div className="text-xs text-surface-400">
                              {stats?.count || 0} zone{(stats?.count || 0) !== 1 ? 's' : ''} • {(stats?.sf || 0).toLocaleString()} SF
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <span className="text-surface-300 font-mono">
                              {totalSF > 0 ? ((stats?.sf || 0) / totalSF * 100).toFixed(1) : 0}%
                            </span>
                            <span className="text-surface-500 ml-1">of total</span>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-surface-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {/* Floor Zones */}
                      {!isCollapsed && (
                        <div className="px-4 pb-4">
                          <div className="grid gap-3 auto-rows-min" style={{
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                          }}>
                            {floorZones.map(zone => {
                              const percentage = (zone.sf / targetSF) * 100
                              const minHeight = 100
                              const maxHeight = 250
                              const height = Math.min(maxHeight, Math.max(minHeight, percentage * 2.5))
                              
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
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* Add Zone to New Floor */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full py-4 border-2 border-dashed border-surface-600 hover:border-primary-500 rounded-xl flex items-center justify-center gap-2 text-surface-400 hover:text-primary-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">Add Zone</span>
                </button>
              </div>
            ) : (
              /* Original Grid View */
              <div className="grid gap-3 auto-rows-min" style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              }}>
                {zones.map(zone => {
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
                
                {/* Import from PDF Button */}
                <button
                  onClick={() => setShowPDFImport(true)}
                  className="min-h-[120px] border-2 border-dashed border-surface-600 hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center gap-2 text-surface-400 hover:text-cyan-400 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-medium">Import PDF</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Totals Sidebar */}
      <TotalsBar calculations={calculations} />

      {/* Zone Editor Slide-out - Use live store data, not snapshot! */}
      {selectedZone && (
        <ZoneEditor
          zone={zones.find(z => z.id === selectedZone.id) || selectedZone}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* Add Zone Modal */}
      {showAddModal && (
        <AddZoneModal onClose={() => setShowAddModal(false)} />
      )}
      
      {/* PDF Import Modal */}
      <PDFImportModal 
        isOpen={showPDFImport} 
        onClose={() => setShowPDFImport(false)} 
      />
    </div>
  )
}
