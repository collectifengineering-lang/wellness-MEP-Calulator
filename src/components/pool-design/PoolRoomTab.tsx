import { useState, useEffect, useMemo, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useProjectStore } from '../../store/useProjectStore'
import PoolEditor from './PoolEditor'
import { 
  calculatePoolRoomLoads, 
  getDefaultPoolRoomParams, 
  createDefaultPool,
  POOL_TYPE_PRESETS,
  type PoolConfig,
  type PoolRoomParams,
  type PoolRoomResults,
  type PoolType 
} from '../../calculations/pool'

export default function PoolRoomTab() {
  const { currentProject, zones, updateZone, addLineItem, updatePoolRoomDesign } = useProjectStore()
  
  // State for target zone selection
  const [targetZoneId, setTargetZoneId] = useState<string | null>(null)
  
  // State for pools - loaded per zone
  const [pools, setPools] = useState<PoolConfig[]>([])
  
  // State for room parameters - loaded per zone
  const [params, setParams] = useState<PoolRoomParams>(getDefaultPoolRoomParams(2000))
  
  // State for editing pool
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null)
  
  // Load active zone from saved design on mount
  useEffect(() => {
    if (currentProject?.poolRoomDesign?.activeZoneId && !targetZoneId) {
      setTargetZoneId(currentProject.poolRoomDesign.activeZoneId)
    }
  }, [currentProject?.poolRoomDesign?.activeZoneId, targetZoneId])
  
  // When target zone changes, load that zone's pool configuration
  useEffect(() => {
    if (!targetZoneId) {
      // No zone selected - clear pools
      setPools([])
      setParams(getDefaultPoolRoomParams(2000))
      return
    }
    
    // Get zone SF for default params
    const zone = zones.find(z => z.id === targetZoneId)
    const zoneSF = zone?.sf || 2000
    
    // Load zone's saved pool config or start fresh
    const zoneConfig = currentProject?.poolRoomDesign?.zoneConfigs?.[targetZoneId]
    if (zoneConfig) {
      console.log(`📥 Loading pool config for zone "${zone?.name}": ${zoneConfig.pools.length} pools`)
      setPools(zoneConfig.pools)
      setParams(zoneConfig.params)
    } else {
      console.log(`📥 No pool config for zone "${zone?.name}" - starting fresh`)
      setPools([])
      setParams(getDefaultPoolRoomParams(zoneSF))
    }
  }, [targetZoneId, currentProject?.poolRoomDesign?.zoneConfigs, zones])
  
  // Save current zone's config when pools or params change
  const saveZoneConfig = useCallback(() => {
    if (!targetZoneId) return
    
    // Get existing configs
    const existingConfigs = currentProject?.poolRoomDesign?.zoneConfigs || {}
    
    // Update or remove this zone's config
    const newConfigs = { ...existingConfigs }
    if (pools.length > 0) {
      newConfigs[targetZoneId] = { pools, params }
    } else {
      // Remove config if no pools (clean up)
      delete newConfigs[targetZoneId]
    }
    
    updatePoolRoomDesign({
      zoneConfigs: newConfigs,
      activeZoneId: targetZoneId,
    })
  }, [targetZoneId, pools, params, currentProject?.poolRoomDesign?.zoneConfigs, updatePoolRoomDesign])
  
  // Auto-save when pools or params change (debounced)
  useEffect(() => {
    if (!targetZoneId) return
    const timer = setTimeout(saveZoneConfig, 500)
    return () => clearTimeout(timer)
  }, [pools, params, saveZoneConfig, targetZoneId])
  
  // Get pool-related zones (pool_indoor, pool_outdoor, hot_tub, etc.)
  const poolZones = zones.filter(z => 
    z.type === 'pool_indoor' || 
    z.type === 'pool_outdoor' || 
    z.type === 'hot_tub' ||
    z.type === 'contrast_suite' ||
    z.name.toLowerCase().includes('pool') ||
    z.name.toLowerCase().includes('natatorium')
  )
  
  const allZones = zones
  
  // Update room SF from zone (only the SF, not the whole params - those are loaded above)
  useEffect(() => {
    if (targetZoneId) {
      const zone = zones.find(z => z.id === targetZoneId)
      if (zone && params.roomSF !== zone.sf) {
        // Only update roomSF if it changed (don't override loaded params)
        setParams(prev => ({
          ...prev,
          roomSF: zone.sf,
        }))
      }
    }
  }, [targetZoneId, zones])
  
  // Calculate results whenever pools or params change
  const results: PoolRoomResults | null = useMemo(() => {
    if (pools.length === 0 || params.roomSF === 0) return null
    return calculatePoolRoomLoads(pools, params)
  }, [pools, params])
  
  // Add a new pool
  const handleAddPool = (poolType: PoolType = 'recreational') => {
    const newPool = createDefaultPool(uuidv4(), poolType, 800)
    setPools([...pools, newPool])
    setEditingPoolId(newPool.id)
  }
  
  // Update a pool
  const handleUpdatePool = (updatedPool: PoolConfig) => {
    setPools(pools.map(p => p.id === updatedPool.id ? updatedPool : p))
  }
  
  // Delete a pool
  const handleDeletePool = (poolId: string) => {
    setPools(pools.filter(p => p.id !== poolId))
    if (editingPoolId === poolId) setEditingPoolId(null)
  }
  
  // Apply results to target zone
  const handleApplyToZone = () => {
    if (!targetZoneId || !results) return
    
    const zone = zones.find(z => z.id === targetZoneId)
    if (!zone) return
    
    // Calculate rates from results
    const ventilationCfmSf = results.supplyAirCFM / zone.sf
    const exhaustCfmSf = results.exhaustAirCFM / zone.sf
    
    // Update zone rates
    updateZone(targetZoneId, {
      rates: {
        ...zone.rates,
        ventilation_cfm_sf: Math.round(ventilationCfmSf * 100) / 100,
        exhaust_cfm_sf: Math.round(exhaustCfmSf * 100) / 100,
      }
    })
    
    // Add dehumidification line item
    addLineItem(targetZoneId, {
      category: 'dehumidification',
      name: 'Pool Dehumidification Load',
      quantity: 1,
      unit: 'lb/hr',
      value: results.totalEvaporationLbHr,
      notes: `${pools.length} pool(s): ${pools.map(p => p.name).join(', ')}`,
    })
    
    // Add outdoor air ventilation line item
    addLineItem(targetZoneId, {
      category: 'ventilation',
      name: 'Pool Outdoor Air (ASHRAE 62)',
      quantity: 1,
      unit: 'CFM',
      value: results.outdoorAirCFM,
      notes: `0.48 CFM/ft² × ${results.totalPoolAreaSF + params.wetDeckAreaSF} SF + ${params.spectatorCount} spectators`,
    })
    
    alert(`Applied to ${zone.name}:\n• Dehumidification: ${results.totalEvaporationLbHr} lb/hr\n• Ventilation: ${ventilationCfmSf.toFixed(2)} CFM/SF\n• Exhaust: ${exhaustCfmSf.toFixed(2)} CFM/SF\n• Outdoor Air: ${results.outdoorAirCFM} CFM`)
  }
  
  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-white">Pool Room Design</h2>
          <p className="text-surface-400 mt-1">
            Calculate dehumidification and airflow for natatoriums based on{' '}
            <a 
              href="https://dectron.com/wp-content/uploads/2021/07/dectron-natatorium-design-guide.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 underline"
            >
              Dectron Natatorium Design Guide
            </a>
            {' '}and ASHRAE standards
          </p>
        </div>
        
        {/* Zone Selection */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">1. Select Target Zone</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Target Zone</label>
              <select
                value={targetZoneId || ''}
                onChange={(e) => setTargetZoneId(e.target.value || null)}
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Select a zone...</option>
                {poolZones.length > 0 && (
                  <optgroup label="Pool Zones">
                    {poolZones.map(zone => {
                      const hasConfig = currentProject?.poolRoomDesign?.zoneConfigs?.[zone.id]
                      const poolCount = hasConfig?.pools?.length || 0
                      return (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} ({zone.sf.toLocaleString()} SF){poolCount > 0 ? ` ✓ ${poolCount} pool${poolCount > 1 ? 's' : ''}` : ''}
                        </option>
                      )
                    })}
                  </optgroup>
                )}
                <optgroup label="All Zones">
                  {allZones.filter(z => !poolZones.includes(z)).map(zone => {
                    const hasConfig = currentProject?.poolRoomDesign?.zoneConfigs?.[zone.id]
                    const poolCount = hasConfig?.pools?.length || 0
                    return (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} ({zone.sf.toLocaleString()} SF){poolCount > 0 ? ` ✓ ${poolCount} pool${poolCount > 1 ? 's' : ''}` : ''}
                      </option>
                    )
                  })}
                </optgroup>
              </select>
              {targetZoneId && pools.length > 0 && (
                <p className="text-xs text-green-400 mt-1">✓ This zone has {pools.length} pool{pools.length > 1 ? 's' : ''} configured</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Room SF</label>
              <input
                type="number"
                value={params.roomSF}
                onChange={(e) => setParams({ ...params, roomSF: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
              <p className="text-xs text-surface-500 mt-1">Auto-filled from zone, or enter manually</p>
            </div>
          </div>
        </div>
        
        {/* Room Parameters */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">2. Room Parameters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Ceiling Height</label>
              <div className="relative">
                <input
                  type="number"
                  value={params.ceilingHeightFt}
                  onChange={(e) => setParams({ ...params, ceilingHeightFt: Number(e.target.value) })}
                  min={10}
                  max={50}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">ft</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Air Temperature</label>
              <div className="relative">
                <input
                  type="number"
                  value={params.airTempF}
                  onChange={(e) => setParams({ ...params, airTempF: Number(e.target.value) })}
                  min={70}
                  max={95}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">°F</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Relative Humidity</label>
              <div className="relative">
                <input
                  type="number"
                  value={params.relativeHumidity}
                  onChange={(e) => setParams({ ...params, relativeHumidity: Number(e.target.value) })}
                  min={40}
                  max={70}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Wet Deck Area</label>
              <div className="relative">
                <input
                  type="number"
                  value={params.wetDeckAreaSF}
                  onChange={(e) => setParams({ ...params, wetDeckAreaSF: Number(e.target.value) })}
                  min={0}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">SF</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Spectators</label>
              <input
                type="number"
                value={params.spectatorCount}
                onChange={(e) => setParams({ ...params, spectatorCount: Number(e.target.value) })}
                min={0}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Air Changes/Hour</label>
              <input
                type="number"
                value={params.airChangesPerHour}
                onChange={(e) => setParams({ ...params, airChangesPerHour: Number(e.target.value) })}
                min={4}
                max={8}
                step={0.5}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
              <p className="text-xs text-surface-500 mt-1">4-6 typical</p>
            </div>
          </div>
          
          {/* Calculated room volume */}
          <div className="mt-4 p-3 bg-surface-900/50 rounded-lg">
            <span className="text-sm text-surface-400">Room Volume: </span>
            <span className="text-white font-mono">
              {(params.roomSF * params.ceilingHeightFt).toLocaleString()} CF
            </span>
            <span className="text-surface-500 text-sm ml-2">
              ({params.roomSF.toLocaleString()} SF × {params.ceilingHeightFt} ft)
            </span>
          </div>
        </div>
        
        {/* Pool List */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">3. Pools / Water Bodies</h3>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPool(e.target.value as PoolType)
                    e.target.value = ''
                  }
                }}
                className="px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm"
                defaultValue=""
              >
                <option value="" disabled>+ Add Pool...</option>
                {Object.entries(POOL_TYPE_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {pools.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <p className="mb-4">No pools added yet. Add pools to calculate dehumidification loads.</p>
              <button
                onClick={() => handleAddPool('recreational')}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium"
              >
                + Add Pool
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map(pool => (
                <div 
                  key={pool.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    editingPoolId === pool.id 
                      ? 'bg-primary-900/20 border-primary-500/50' 
                      : 'bg-surface-900 border-surface-700 hover:border-surface-600'
                  }`}
                >
                  {editingPoolId === pool.id ? (
                    <PoolEditor
                      pool={pool}
                      onUpdate={handleUpdatePool}
                      onClose={() => setEditingPoolId(null)}
                      onDelete={() => handleDeletePool(pool.id)}
                    />
                  ) : (
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setEditingPoolId(pool.id)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{pool.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-surface-700 text-surface-300 rounded">
                            {POOL_TYPE_PRESETS[pool.poolType].name}
                          </span>
                        </div>
                        <div className="text-sm text-surface-400 mt-1">
                          {pool.surfaceAreaSF.toLocaleString()} SF • {pool.waterTempF}°F • 
                          Activity: {pool.activityFactor}×
                        </div>
                      </div>
                      <div className="text-right">
                        {results && (() => {
                          const poolResult = results.poolBreakdown.find(p => p.id === pool.id)
                          const lbHr = poolResult?.lbHr || 0
                          const isCondensation = lbHr < 0
                          return (
                            <div className={`font-mono ${isCondensation ? 'text-blue-400' : 'text-cyan-400'}`}>
                              {lbHr > 0 ? '+' : ''}{lbHr.toFixed(1)} lb/hr
                              {isCondensation && <span className="text-xs ml-1">(absorbs)</span>}
                            </div>
                          )
                        })()}
                        <div className="text-xs text-surface-500">Click to edit</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Results */}
        {results && (
          <div className="bg-gradient-to-br from-cyan-900/30 to-surface-900 rounded-xl border border-cyan-500/30 p-6">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">4. Calculated Results</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Dehumidification */}
              <div className="bg-surface-900/50 rounded-lg p-4">
                <div className="text-xs text-surface-400 uppercase tracking-wider mb-1">Dehumidification</div>
                <div className="text-2xl font-bold text-cyan-400 font-mono">
                  {results.totalEvaporationLbHr.toFixed(1)}
                </div>
                <div className="text-sm text-surface-400">lb/hr evaporation</div>
              </div>
              
              {/* Supply Air */}
              <div className="bg-surface-900/50 rounded-lg p-4">
                <div className="text-xs text-surface-400 uppercase tracking-wider mb-1">Supply Air</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {results.supplyAirCFM.toLocaleString()}
                </div>
                <div className="text-sm text-surface-400">CFM ({results.actualACH} ACH)</div>
              </div>
              
              {/* Outdoor Air */}
              <div className="bg-surface-900/50 rounded-lg p-4">
                <div className="text-xs text-surface-400 uppercase tracking-wider mb-1">Outdoor Air</div>
                <div className="text-2xl font-bold text-blue-400 font-mono">
                  {results.outdoorAirCFM.toLocaleString()}
                </div>
                <div className="text-sm text-surface-400">CFM (ASHRAE 62)</div>
              </div>
              
              {/* Exhaust */}
              <div className="bg-surface-900/50 rounded-lg p-4">
                <div className="text-xs text-surface-400 uppercase tracking-wider mb-1">Exhaust Air</div>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {results.exhaustAirCFM.toLocaleString()}
                </div>
                <div className="text-sm text-surface-400">CFM (110% of OA)</div>
              </div>
            </div>
            
            {/* Pool Breakdown */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-surface-300 mb-2">Pool Moisture Contribution</h4>
              <p className="text-xs text-surface-500 mb-2">
                Positive = evaporation (adds moisture) • Negative = condensation (absorbs moisture from cold pools)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700">
                      <th className="text-left py-2 text-surface-400">Pool</th>
                      <th className="text-right py-2 text-surface-400">Area (SF)</th>
                      <th className="text-right py-2 text-surface-400">Water Temp</th>
                      <th className="text-right py-2 text-surface-400">lb/hr</th>
                      <th className="text-right py-2 text-surface-400">Effect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.poolBreakdown.map(pool => {
                      const isCondensation = pool.lbHr < 0
                      return (
                        <tr key={pool.id} className="border-b border-surface-700/50">
                          <td className="py-2 text-white">{pool.name}</td>
                          <td className="py-2 text-right text-surface-300 font-mono">{pool.surfaceAreaSF.toLocaleString()}</td>
                          <td className="py-2 text-right text-surface-300 font-mono">
                            {pools.find(p => p.id === pool.id)?.waterTempF}°F
                          </td>
                          <td className={`py-2 text-right font-mono font-medium ${isCondensation ? 'text-blue-400' : 'text-cyan-400'}`}>
                            {pool.lbHr > 0 ? '+' : ''}{pool.lbHr.toFixed(1)}
                          </td>
                          <td className={`py-2 text-right text-xs ${isCondensation ? 'text-blue-400' : 'text-cyan-400'}`}>
                            {isCondensation ? '❄️ Absorbs' : '💨 Evaporates'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-900/50">
                      <td className="py-2 font-semibold text-white">Net Total</td>
                      <td className="py-2 text-right text-white font-mono">{results.totalPoolAreaSF.toLocaleString()}</td>
                      <td className="py-2"></td>
                      <td className={`py-2 text-right font-mono font-bold ${results.totalEvaporationLbHr < 0 ? 'text-blue-400' : 'text-cyan-400'}`}>
                        {results.totalEvaporationLbHr > 0 ? '+' : ''}{results.totalEvaporationLbHr.toFixed(1)}
                      </td>
                      <td className="py-2 text-right text-xs text-surface-400">
                        {results.totalEvaporationLbHr < 0 ? 'Net absorption' : 'Net evaporation'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            {/* Calculation Notes */}
            <div className="text-xs text-surface-500 space-y-1 mb-4">
              <p>• Moisture: 0.1 × Area × Activity Factor × (Pw - Pa) per ASHRAE</p>
              <p className="pl-3">→ Positive when water temp {">"} dew point (evaporation)</p>
              <p className="pl-3">→ <span className="text-blue-400">Negative when water temp {"<"} dew point (condensation - cold pools absorb moisture!)</span></p>
              <p>• Supply Air: Room Volume ({results.roomVolumeCF.toLocaleString()} CF) × {params.airChangesPerHour} ACH ÷ 60</p>
              <p>• Outdoor Air: 0.48 CFM/ft² × ({results.totalPoolAreaSF} + {params.wetDeckAreaSF} SF) + 7.5 × {params.spectatorCount} spectators</p>
              <p>• Exhaust: 110% of Outdoor Air (maintain negative pressure)</p>
            </div>
            
            {/* Apply Button */}
            <div className="flex justify-end">
              <button
                onClick={handleApplyToZone}
                disabled={!targetZoneId}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  targetZoneId
                    ? 'bg-primary-600 hover:bg-primary-500 text-white'
                    : 'bg-surface-700 text-surface-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {targetZoneId ? `Apply to ${zones.find(z => z.id === targetZoneId)?.name}` : 'Select a zone to apply'}
              </button>
            </div>
          </div>
        )}
        
        {/* Help Section */}
        <div className="bg-surface-800/50 rounded-xl border border-surface-700 p-6">
          <h4 className="text-sm font-medium text-surface-300 mb-3">💡 Design Guidelines (Dectron/ASHRAE)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-surface-400">
            <div>
              <strong className="text-surface-300">Air Temperature:</strong> Set 2°F above warmest pool water temperature
            </div>
            <div>
              <strong className="text-surface-300">Relative Humidity:</strong> Maintain 50-60% for comfort and health
            </div>
            <div>
              <strong className="text-surface-300">Air Changes:</strong> 4-6 ACH minimum for natatoriums
            </div>
            <div>
              <strong className="text-surface-300">Negative Pressure:</strong> 0.05-0.15" W.C. to prevent vapor migration
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
