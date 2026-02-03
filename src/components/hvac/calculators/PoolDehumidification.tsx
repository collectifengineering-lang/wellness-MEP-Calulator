/**
 * Pool Dehumidification Calculator for HVAC Module
 * Allows selecting a space for pool/natatorium calculations
 * Uses the same calculation logic as Concept MEP Pool Room Tab
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useHVACStore } from '../../../store/useHVACStore'
import {
  calculatePoolRoomLoads,
  getDefaultPoolRoomParams,
  createDefaultPool,
  POOL_TYPE_PRESETS,
  type PoolConfig,
  type PoolRoomParams,
  type PoolRoomResults,
  type PoolType
} from '../../../calculations/pool'

// Pool space configuration stored per-space
interface PoolSpaceConfig {
  pools: PoolConfig[]
  params: PoolRoomParams
}

export default function PoolDehumidification() {
  const { spaces } = useHVACStore()
  
  // Selected space for pool calculations
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  
  // Pool configurations stored in component state (could also be persisted to space metadata)
  const [poolConfigs, setPoolConfigs] = useState<Record<string, PoolSpaceConfig>>({})
  
  // Current pools and params for selected space
  const [pools, setPools] = useState<PoolConfig[]>([])
  const [params, setParams] = useState<PoolRoomParams>(getDefaultPoolRoomParams(2000))
  
  // Editing state
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null)
  
  // Filter spaces to show pool-applicable ones (swimming_pool, natatorium, or user can select any)
  const poolSpaces = useMemo(() => {
    return spaces.filter(s => 
      s.spaceType === 'swimming_pool' ||
      s.spaceType === 'natatorium' ||
      s.name.toLowerCase().includes('pool') ||
      s.name.toLowerCase().includes('natatorium')
    )
  }, [spaces])
  
  // All spaces for selection
  const allSpaces = useMemo(() => spaces.sort((a, b) => a.name.localeCompare(b.name)), [spaces])
  
  // Load config when space changes
  useEffect(() => {
    if (!selectedSpaceId) {
      setPools([])
      setParams(getDefaultPoolRoomParams(2000))
      return
    }
    
    const space = spaces.find(s => s.id === selectedSpaceId)
    const areaSf = space?.areaSf || 2000
    
    // Load saved config or start fresh
    const config = poolConfigs[selectedSpaceId]
    if (config) {
      setPools(config.pools)
      setParams(config.params)
    } else {
      setPools([])
      setParams(getDefaultPoolRoomParams(areaSf))
    }
  }, [selectedSpaceId, poolConfigs, spaces])
  
  // Save config when pools or params change
  const saveConfig = useCallback(() => {
    if (!selectedSpaceId) return
    
    setPoolConfigs(prev => ({
      ...prev,
      [selectedSpaceId]: { pools, params }
    }))
  }, [selectedSpaceId, pools, params])
  
  // Auto-save when pools or params change
  useEffect(() => {
    if (selectedSpaceId && pools.length > 0) {
      saveConfig()
    }
  }, [pools, params, selectedSpaceId, saveConfig])
  
  // Calculate results
  const results = useMemo<PoolRoomResults | null>(() => {
    if (pools.length === 0) return null
    return calculatePoolRoomLoads(pools, params)
  }, [pools, params])
  
  // Pool CRUD operations
  const addPool = (type: PoolType = 'recreational') => {
    const newPool = createDefaultPool(`pool-${Date.now()}`, type)
    setPools([...pools, newPool])
  }
  
  const updatePool = (id: string, updates: Partial<PoolConfig>) => {
    setPools(pools.map(p => p.id === id ? { ...p, ...updates } : p))
  }
  
  const deletePool = (id: string) => {
    setPools(pools.filter(p => p.id !== id))
    if (editingPoolId === id) setEditingPoolId(null)
  }
  
  const selectedSpace = spaces.find(s => s.id === selectedSpaceId)
  const editingPool = editingPoolId ? pools.find(p => p.id === editingPoolId) : null
  
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏊</span>
          <div>
            <h2 className="text-xl font-bold text-white">Pool Dehumidification Calculator 🐐💨</h2>
            <p className="text-sm text-surface-400">
              Calculate ventilation and dehumidification for natatoriums and pool spaces
            </p>
          </div>
        </div>
      </div>
      
      {/* Space Selection */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <label className="block text-sm font-medium text-surface-300 mb-2">
          Select Pool Space
        </label>
        <div className="flex items-center gap-4">
          <select
            value={selectedSpaceId || ''}
            onChange={e => setSelectedSpaceId(e.target.value || null)}
            className="flex-1 px-4 py-2.5 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">-- Select a space --</option>
            
            {poolSpaces.length > 0 && (
              <optgroup label="🏊 Pool Spaces (Detected)">
                {poolSpaces.map(space => (
                  <option key={space.id} value={space.id}>
                    {space.name} ({space.areaSf.toLocaleString()} SF)
                  </option>
                ))}
              </optgroup>
            )}
            
            <optgroup label="📋 All Spaces">
              {allSpaces.map(space => (
                <option key={space.id} value={space.id}>
                  {space.name} ({space.areaSf.toLocaleString()} SF)
                </option>
              ))}
            </optgroup>
          </select>
          
          {selectedSpace && (
            <div className="text-sm text-surface-400">
              <span className="text-cyan-400 font-medium">{selectedSpace.areaSf.toLocaleString()}</span> SF
            </div>
          )}
        </div>
        
        {!selectedSpaceId && spaces.length === 0 && (
          <p className="mt-3 text-sm text-amber-400">
            ⚠️ No spaces found. Add spaces in the Spaces tab first, then select one for pool calculations.
          </p>
        )}
      </div>
      
      {selectedSpaceId && (
        <>
          {/* Room Parameters */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🌡️</span> Room Conditions
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Room Area (SF)</label>
                <input
                  type="number"
                  value={params.roomSF}
                  onChange={e => setParams({ ...params, roomSF: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Wet Deck Area (SF)</label>
                <input
                  type="number"
                  value={params.wetDeckAreaSF}
                  onChange={e => setParams({ ...params, wetDeckAreaSF: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Ceiling Height (ft)</label>
                <input
                  type="number"
                  value={params.ceilingHeightFt}
                  onChange={e => setParams({ ...params, ceilingHeightFt: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Room Air Temp (°F)</label>
                <input
                  type="number"
                  value={params.airTempF}
                  onChange={e => setParams({ ...params, airTempF: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Room RH (%)</label>
                <input
                  type="number"
                  value={params.relativeHumidity}
                  onChange={e => setParams({ ...params, relativeHumidity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Spectators</label>
                <input
                  type="number"
                  value={params.spectatorCount}
                  onChange={e => setParams({ ...params, spectatorCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Air Changes/Hr</label>
                <input
                  type="number"
                  step="0.5"
                  value={params.airChangesPerHour}
                  onChange={e => setParams({ ...params, airChangesPerHour: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Pools List */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🏊‍♂️</span> Pools & Water Features
              </h3>
              <div className="flex items-center gap-2">
                <select
                  onChange={e => {
                    if (e.target.value) {
                      addPool(e.target.value as PoolType)
                      e.target.value = ''
                    }
                  }}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>+ Add Pool</option>
                  {Object.entries(POOL_TYPE_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {pools.length === 0 ? (
              <div className="text-center py-12 text-surface-400">
                <div className="text-4xl mb-3">🏊</div>
                <p>No pools configured for this space</p>
                <p className="text-sm mt-1">Add a pool to calculate dehumidification loads</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pools.map(pool => (
                  <div
                    key={pool.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      editingPoolId === pool.id
                        ? 'bg-cyan-900/20 border-cyan-500'
                        : 'bg-surface-700/50 border-surface-600 hover:border-surface-500'
                    }`}
                    onClick={() => setEditingPoolId(editingPoolId === pool.id ? null : pool.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {pool.poolType === 'whirlpool' ? '🛁' : pool.poolType === 'cold_plunge' ? '🥶' : '🏊'}
                        </span>
                        <div>
                          <div className="font-medium text-white">{pool.name}</div>
                          <div className="text-sm text-surface-400">
                            {pool.surfaceAreaSF.toLocaleString()} SF • {pool.waterTempF}°F • {POOL_TYPE_PRESETS[pool.poolType].name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            deletePool(pool.id)
                          }}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Pool Editor */}
          {editingPool && (
            <div className="bg-surface-800 rounded-xl border border-cyan-500 p-4">
              <h4 className="text-md font-semibold text-white mb-4">Edit: {editingPool.name}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Pool Name</label>
                  <input
                    type="text"
                    value={editingPool.name}
                    onChange={e => updatePool(editingPool.id, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Surface Area (SF)</label>
                  <input
                    type="number"
                    value={editingPool.surfaceAreaSF}
                    onChange={e => updatePool(editingPool.id, { surfaceAreaSF: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Water Temp (°F)</label>
                  <input
                    type="number"
                    value={editingPool.waterTempF}
                    onChange={e => updatePool(editingPool.id, { waterTempF: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Activity Factor</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="1.5"
                    value={editingPool.activityFactor}
                    onChange={e => updatePool(editingPool.id, { activityFactor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => setEditingPoolId(null)}
                className="mt-4 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg text-sm"
              >
                Done Editing
              </button>
            </div>
          )}
          
          {/* Results */}
          {results && (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📊</span> Dehumidification Results
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <ResultCard
                  label="Total Dehumidification"
                  value={results.totalDehumidLbHr.toFixed(1)}
                  unit="lb/hr"
                  icon="💧"
                />
                <ResultCard
                  label="Supply Air"
                  value={results.supplyAirCFM.toFixed(0)}
                  unit="CFM"
                  icon="📤"
                />
                <ResultCard
                  label="Outdoor Air"
                  value={results.outdoorAirCFM.toFixed(0)}
                  unit="CFM"
                  icon="🌬️"
                />
                <ResultCard
                  label="Exhaust Air"
                  value={results.exhaustAirCFM.toFixed(0)}
                  unit="CFM"
                  icon="💨"
                />
                <ResultCard
                  label="Room Volume"
                  value={(results.roomVolumeCF / 1000).toFixed(1)}
                  unit="k CF"
                  icon="📦"
                />
                <ResultCard
                  label="Total Pool Area"
                  value={results.totalPoolAreaSF.toFixed(0)}
                  unit="SF"
                  icon="🏊"
                />
                <ResultCard
                  label="Actual ACH"
                  value={results.actualACH.toFixed(1)}
                  unit="ACH"
                  icon="🔄"
                />
                <ResultCard
                  label="Recommended ACH"
                  value={`${results.recommendedACH.min}-${results.recommendedACH.max}`}
                  unit="ACH"
                  icon="📋"
                />
              </div>
              
              {/* Per-Pool Breakdown */}
              {results.poolBreakdown.length > 1 && (
                <div className="mt-4 pt-4 border-t border-surface-700">
                  <h4 className="text-sm font-medium text-surface-300 mb-3">Per-Pool Evaporation</h4>
                  <div className="space-y-2">
                    {results.poolBreakdown.map(pb => (
                      <div key={pb.id} className="flex items-center justify-between text-sm">
                        <span className="text-surface-400">{pb.name}</span>
                        <span className="text-white font-medium">
                          {pb.lbHr.toFixed(2)} lb/hr ({pb.surfaceAreaSF.toLocaleString()} SF)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Equipment Recommendations */}
              <div className="mt-4 pt-4 border-t border-surface-700">
                <h4 className="text-sm font-medium text-surface-300 mb-3">🐐 Equipment Notes</h4>
                <ul className="space-y-1 text-sm text-surface-400">
                  <li>• Dehumidification unit sized for {results.totalDehumidLbHr.toFixed(1)} lb/hr moisture removal</li>
                  <li>• Consider dedicated outdoor air system (DOAS) for ventilation requirements</li>
                  <li>• Pool space should maintain 50-60% RH to prevent condensation and corrosion</li>
                  <li>• Air temperature should be 2-4°F above water temperature</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}
      
      {!selectedSpaceId && spaces.length > 0 && (
        <div className="bg-surface-800/50 rounded-xl border border-dashed border-surface-600 p-12 text-center">
          <div className="text-5xl mb-4">🏊‍♂️🐐</div>
          <h3 className="text-lg font-semibold text-white mb-2">Select a Pool Space</h3>
          <p className="text-surface-400 max-w-md mx-auto">
            Choose a space from the dropdown above to configure pools and calculate
            dehumidification requirements. GOAT-level pool HVAC awaits! 💨
          </p>
        </div>
      )}
    </div>
  )
}

// Result Card Component
function ResultCard({ 
  label, 
  value, 
  unit, 
  icon 
}: { 
  label: string
  value: string
  unit: string
  icon: string
}) {
  return (
    <div className="bg-surface-700/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-surface-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">
        {value} <span className="text-sm font-normal text-surface-400">{unit}</span>
      </div>
    </div>
  )
}
