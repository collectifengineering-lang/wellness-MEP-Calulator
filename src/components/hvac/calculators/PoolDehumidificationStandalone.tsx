/**
 * Pool Dehumidification Standalone Calculator
 * 
 * A standalone version of the pool dehumidification calculator
 * that doesn't require space selection from the HVAC project.
 * Users can input pool room parameters directly.
 */

import { useState, useMemo } from 'react'
import {
  calculatePoolRoomLoads,
  POOL_TYPE_PRESETS,
  type PoolConfig,
  type PoolRoomParams,
  type PoolRoomResults,
  type PoolType
} from '../../../calculations/pool'

export default function PoolDehumidificationStandalone() {
  // Pool configurations
  const [pools, setPools] = useState<PoolConfig[]>([])
  const [params, setParams] = useState<PoolRoomParams>({
    roomSF: 2000,
    ceilingHeightFt: 15,
    airTempF: 84,
    relativeHumidity: 55,
    wetDeckAreaSF: 500,
    spectatorCount: 10,
    swimmerCount: 8,
    airChangesPerHour: 6,
  })
  
  // Editing state
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null)
  
  // Calculate results
  const results = useMemo<PoolRoomResults | null>(() => {
    if (pools.length === 0) return null
    return calculatePoolRoomLoads(pools, params)
  }, [pools, params])
  
  // Pool CRUD operations
  const addPool = (type: PoolType = 'recreational') => {
    const preset = POOL_TYPE_PRESETS[type]
    const newPool: PoolConfig = {
      id: `pool_${Date.now()}`,
      name: preset.name,
      surfaceAreaSF: type === 'whirlpool' ? 64 : 800,
      waterTempF: preset.waterTempRange.default,
      activityFactor: preset.activityFactor,
      poolType: type,
    }
    setPools(prev => [...prev, newPool])
    setEditingPoolId(newPool.id)
  }
  
  const updatePool = (id: string, updates: Partial<PoolConfig>) => {
    setPools(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }
  
  const deletePool = (id: string) => {
    setPools(prev => prev.filter(p => p.id !== id))
    if (editingPoolId === id) setEditingPoolId(null)
  }
  
  return (
    <div className="space-y-6">
      {/* Room Parameters */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🏠 Pool Room Parameters</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Room Area (SF)</label>
            <input
              type="number"
              value={params.roomSF}
              onChange={(e) => setParams(p => ({ ...p, roomSF: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Ceiling Height (ft)</label>
            <input
              type="number"
              value={params.ceilingHeightFt}
              onChange={(e) => setParams(p => ({ ...p, ceilingHeightFt: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Room Air Temp (°F)</label>
            <input
              type="number"
              value={params.airTempF}
              onChange={(e) => setParams(p => ({ ...p, airTempF: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Room RH (%)</label>
            <input
              type="number"
              value={params.relativeHumidity}
              onChange={(e) => setParams(p => ({ ...p, relativeHumidity: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Wet Deck Area (SF)</label>
            <input
              type="number"
              value={params.wetDeckAreaSF}
              onChange={(e) => setParams(p => ({ ...p, wetDeckAreaSF: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Spectators</label>
            <input
              type="number"
              value={params.spectatorCount}
              onChange={(e) => setParams(p => ({ ...p, spectatorCount: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Swimmers</label>
            <input
              type="number"
              value={params.swimmerCount}
              onChange={(e) => setParams(p => ({ ...p, swimmerCount: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Air Changes/Hour</label>
            <input
              type="number"
              value={params.airChangesPerHour}
              onChange={(e) => setParams(p => ({ ...p, airChangesPerHour: Number(e.target.value) }))}
              step={0.5}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
        </div>
      </div>
      
      {/* Pools Section */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">🏊 Pools & Water Features</h3>
          <div className="flex gap-2 flex-wrap">
            {(['recreational', 'whirlpool', 'therapy', 'cold_plunge'] as PoolType[]).map(type => (
              <button
                key={type}
                onClick={() => addPool(type)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
              >
                + {POOL_TYPE_PRESETS[type].name}
              </button>
            ))}
          </div>
        </div>
        
        {pools.length === 0 ? (
          <div className="text-center py-8 text-surface-400">
            <div className="text-4xl mb-2">🏊</div>
            <p>Add pools or water features to calculate dehumidification loads</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map(pool => (
              <div
                key={pool.id}
                className={`p-4 rounded-lg border transition-colors ${
                  editingPoolId === pool.id
                    ? 'bg-cyan-900/20 border-cyan-500/50'
                    : 'bg-surface-900 border-surface-700 hover:border-surface-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{pool.poolType === 'whirlpool' ? '♨️' : pool.poolType === 'cold_plunge' ? '🧊' : '🏊'}</span>
                    <div>
                      <input
                        type="text"
                        value={pool.name}
                        onChange={(e) => updatePool(pool.id, { name: e.target.value })}
                        className="bg-transparent border-none text-white font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1"
                      />
                      <div className="text-xs text-surface-400">
                        {POOL_TYPE_PRESETS[pool.poolType]?.description || pool.poolType}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPoolId(editingPoolId === pool.id ? null : pool.id)}
                      className="px-3 py-1 text-sm text-surface-400 hover:text-white transition-colors"
                    >
                      {editingPoolId === pool.id ? 'Collapse' : 'Edit'}
                    </button>
                    <button
                      onClick={() => deletePool(pool.id)}
                      className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {editingPoolId === pool.id && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-surface-700">
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Surface Area (SF)</label>
                      <input
                        type="number"
                        value={pool.surfaceAreaSF}
                        onChange={(e) => updatePool(pool.id, { surfaceAreaSF: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Water Temp (°F)</label>
                      <input
                        type="number"
                        value={pool.waterTempF}
                        onChange={(e) => updatePool(pool.id, { waterTempF: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Activity Factor</label>
                      <select
                        value={pool.activityFactor}
                        onChange={(e) => updatePool(pool.id, { activityFactor: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                      >
                        <option value={0.5}>0.5 - Quiet (residential)</option>
                        <option value={0.65}>0.65 - Light (hotel)</option>
                        <option value={0.8}>0.8 - Moderate (lap)</option>
                        <option value={1.0}>1.0 - Active (public)</option>
                        <option value={1.5}>1.5 - High (waterpark)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Pool Type</label>
                      <select
                        value={pool.poolType}
                        onChange={(e) => updatePool(pool.id, { poolType: e.target.value as PoolType })}
                        className="w-full px-2 py-1.5 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                      >
                        {Object.entries(POOL_TYPE_PRESETS).map(([key, preset]) => (
                          <option key={key} value={key}>{preset.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Quick stats */}
                <div className="flex gap-4 mt-2 text-xs text-surface-400">
                  <span>Area: {pool.surfaceAreaSF.toLocaleString()} SF</span>
                  <span>•</span>
                  <span>Water: {pool.waterTempF}°F</span>
                  <span>•</span>
                  <span>Activity: {pool.activityFactor}x</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Results */}
      {results && (
        <div className="bg-gradient-to-br from-cyan-900/30 to-surface-800 rounded-xl border border-cyan-500/30 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Calculation Results</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <ResultCard
              label="Pool Evaporation"
              value={results.poolEvaporationLbHr.toFixed(1)}
              unit="lb/hr"
              icon="💧"
            />
            <ResultCard
              label="Spectator Moisture"
              value={results.spectatorMoistureLbHr.toFixed(1)}
              unit="lb/hr"
              icon="👥"
            />
            <ResultCard
              label="Swimmer Moisture"
              value={results.swimmerMoistureLbHr.toFixed(1)}
              unit="lb/hr"
              icon="🏊"
            />
            <ResultCard
              label="Total Dehumid Load"
              value={results.totalDehumidLbHr.toFixed(1)}
              unit="lb/hr"
              icon="💨"
              highlight
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <ResultCard
              label="Supply Air"
              value={Math.round(results.supplyAirCFM).toLocaleString()}
              unit="CFM"
              icon="🌬️"
            />
            <ResultCard
              label="Outdoor Air"
              value={Math.round(results.outdoorAirCFM).toLocaleString()}
              unit="CFM"
              icon="🍃"
            />
            <ResultCard
              label="Exhaust Air"
              value={Math.round(results.exhaustAirCFM).toLocaleString()}
              unit="CFM"
              icon="🌀"
            />
            <ResultCard
              label="Actual ACH"
              value={results.actualACH.toFixed(1)}
              unit=""
              icon="🔄"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ResultCard
              label="Room Volume"
              value={Math.round(results.roomVolumeCF).toLocaleString()}
              unit="CF"
              icon="📐"
            />
            <ResultCard
              label="Total Pool Area"
              value={Math.round(results.totalPoolAreaSF).toLocaleString()}
              unit="SF"
              icon="🏊"
            />
            <ResultCard
              label="Recommended ACH"
              value={`${results.recommendedACH.min}-${results.recommendedACH.max}`}
              unit=""
              icon="📋"
            />
          </div>
          
          {/* Pool Breakdown */}
          {results.poolBreakdown.length > 0 && (
            <div className="mt-6 pt-4 border-t border-surface-700">
              <h4 className="text-sm font-medium text-surface-300 mb-3">Pool Evaporation Breakdown</h4>
              <div className="space-y-2">
                {results.poolBreakdown.map(pool => (
                  <div key={pool.id} className="flex items-center justify-between text-sm">
                    <span className="text-surface-300">{pool.name}</span>
                    <span className="text-cyan-400 font-mono">{pool.lbHr.toFixed(1)} lb/hr ({pool.surfaceAreaSF} SF)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Result card component
function ResultCard({ 
  label, 
  value, 
  unit, 
  icon,
  highlight = false 
}: { 
  label: string
  value: string
  unit: string
  icon: string
  highlight?: boolean
}) {
  return (
    <div className={`p-4 rounded-lg ${
      highlight 
        ? 'bg-cyan-900/40 border border-cyan-500/50' 
        : 'bg-surface-900/50'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-surface-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${highlight ? 'text-cyan-300' : 'text-white'}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-surface-400">{unit}</span>}
      </div>
    </div>
  )
}
