import { useState, useEffect } from 'react'
import { 
  POOL_TYPE_PRESETS, 
  type PoolConfig, 
  type PoolType 
} from '../../calculations/pool'

interface PoolEditorProps {
  pool: PoolConfig
  onUpdate: (pool: PoolConfig) => void
  onClose: () => void
  onDelete: () => void
}

export default function PoolEditor({ pool, onUpdate, onClose, onDelete }: PoolEditorProps) {
  const [localPool, setLocalPool] = useState<PoolConfig>(pool)
  
  useEffect(() => {
    setLocalPool(pool)
  }, [pool])
  
  const handleChange = <K extends keyof PoolConfig>(field: K, value: PoolConfig[K]) => {
    const updated = { ...localPool, [field]: value }
    setLocalPool(updated)
    onUpdate(updated)
  }
  
  const handleTypeChange = (newType: PoolType) => {
    const preset = POOL_TYPE_PRESETS[newType]
    const updated: PoolConfig = {
      ...localPool,
      poolType: newType,
      name: preset.name,
      waterTempF: preset.waterTempRange.default,
      activityFactor: preset.activityFactor,
    }
    setLocalPool(updated)
    onUpdate(updated)
  }
  
  const preset = POOL_TYPE_PRESETS[localPool.poolType]
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏊</span>
          <input
            type="text"
            value={localPool.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="bg-transparent border-b border-surface-600 focus:border-primary-500 text-white font-medium px-1 py-0.5 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded"
          >
            Done
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this pool?')) onDelete()
            }}
            className="text-xs px-2 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Pool Type */}
      <div>
        <label className="block text-xs text-surface-400 mb-1">Pool Type</label>
        <select
          value={localPool.poolType}
          onChange={(e) => handleTypeChange(e.target.value as PoolType)}
          className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
        >
          {Object.entries(POOL_TYPE_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>{preset.name} - {preset.description}</option>
          ))}
        </select>
      </div>
      
      {/* Main Parameters */}
      <div className="grid grid-cols-3 gap-4">
        {/* Surface Area */}
        <div>
          <label className="block text-xs text-surface-400 mb-1">Surface Area</label>
          <div className="relative">
            <input
              type="number"
              value={localPool.surfaceAreaSF}
              onChange={(e) => handleChange('surfaceAreaSF', Number(e.target.value))}
              min={50}
              max={50000}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">SF</span>
          </div>
        </div>
        
        {/* Water Temperature */}
        <div>
          <label className="block text-xs text-surface-400 mb-1">
            Water Temp
            <span className="text-surface-500 ml-1">
              ({preset.waterTempRange.min}-{preset.waterTempRange.max}°F)
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={localPool.waterTempF}
              onChange={(e) => handleChange('waterTempF', Number(e.target.value))}
              min={60}
              max={110}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">°F</span>
          </div>
        </div>
        
        {/* Activity Factor */}
        <div>
          <label className="block text-xs text-surface-400 mb-1">
            Activity Factor
            <span className="text-surface-500 ml-1">(0.5-1.5)</span>
          </label>
          <input
            type="number"
            value={localPool.activityFactor}
            onChange={(e) => handleChange('activityFactor', Number(e.target.value))}
            min={0.5}
            max={1.5}
            step={0.05}
            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
          />
        </div>
      </div>
      
      {/* Activity Factor Guide */}
      <div className="bg-surface-900/50 rounded-lg p-3 text-xs text-surface-400">
        <div className="font-medium text-surface-300 mb-2">Activity Factor Guide:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><span className="text-surface-500">Residential:</span> 0.5</div>
          <div><span className="text-surface-500">Elderly:</span> 0.65</div>
          <div><span className="text-surface-500">Hotel/Lap:</span> 0.8</div>
          <div><span className="text-surface-500">Public/Comp:</span> 1.0</div>
          <div><span className="text-surface-500">Therapy:</span> 1.0</div>
          <div><span className="text-surface-500">Whirlpool:</span> 1.0</div>
          <div><span className="text-surface-500">Diving:</span> 1.0</div>
          <div><span className="text-surface-500">Waterpark:</span> 1.5</div>
        </div>
      </div>
      
      {/* Water Temperature Guide */}
      <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3 text-xs">
        <div className="font-medium text-blue-400 mb-1">💡 Temperature Tip</div>
        <div className="text-surface-400">
          <strong className="text-surface-300">{preset.name}</strong>: Typical water temp is{' '}
          <span className="text-white font-mono">{preset.waterTempRange.min}-{preset.waterTempRange.max}°F</span>.
          Room air should be 2°F above the warmest pool water temperature.
        </div>
      </div>
    </div>
  )
}
