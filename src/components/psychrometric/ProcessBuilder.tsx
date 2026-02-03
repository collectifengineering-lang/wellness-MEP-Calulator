/**
 * ProcessBuilder Component
 * Build HVAC processes with process type selection first, then point configuration
 * Supports chained processes where end point of one becomes start of next
 */

import { useState, useEffect, useMemo } from 'react'
import { usePsychrometricStore } from '../../store/usePsychrometricStore'
import type { ProcessType, PsychrometricPoint, PsychrometricProcess, StatePointResult } from '../../types/psychrometric'

interface ProcessBuilderProps {
  systemId: string
  points: PsychrometricPoint[]
  processes: PsychrometricProcess[]
  calculatedPoints: Record<string, StatePointResult>
  onProcessCreated?: () => void
  onSetPointOnChart?: (pointType: 'start' | 'end') => void
}

// Process type definitions with technical details
const PROCESS_TYPES: {
  id: ProcessType
  name: string
  technicalName: string
  icon: string
  color: string
  description: string
  constraint: string
}[] = [
  {
    id: 'sensible_heating',
    name: 'Sensible Heating',
    technicalName: 'Sensible Heat Addition',
    icon: '🔥',
    color: '#ef4444',
    description: 'Temperature increase, no moisture change',
    constraint: 'Horizontal right (constant W)',
  },
  {
    id: 'sensible_cooling',
    name: 'Sensible Cooling',
    technicalName: 'Sensible Heat Removal',
    icon: '❄️',
    color: '#3b82f6',
    description: 'Temperature decrease, no condensation',
    constraint: 'Horizontal left (constant W)',
  },
  {
    id: 'evaporative_cooling',
    name: 'Evaporative Cooling',
    technicalName: 'Adiabatic Saturation',
    icon: '💧',
    color: '#06b6d4',
    description: 'Temp drops, humidity rises',
    constraint: 'Along constant WB line',
  },
  {
    id: 'dx_dehumidification',
    name: 'DX Dehumidification',
    technicalName: 'Refrigerant Cooling',
    icon: '🧊',
    color: '#0891b2',
    description: 'Cool below dew point, remove moisture',
    constraint: 'To saturation, then along curve',
  },
  {
    id: 'steam_humidification',
    name: 'Steam Humidification',
    technicalName: 'Isothermal Humidification',
    icon: '♨️',
    color: '#8b5cf6',
    description: 'Add moisture, minimal temp change',
    constraint: 'Nearly vertical up',
  },
  {
    id: 'desiccant_dehumidification',
    name: 'Desiccant Dehum',
    technicalName: 'Desiccant Adsorption',
    icon: '🌀',
    color: '#f59e0b',
    description: 'Remove moisture, temp rises',
    constraint: 'Along constant enthalpy',
  },
  {
    id: 'custom',
    name: 'Custom Process',
    technicalName: 'User-Defined',
    icon: '✏️',
    color: '#9ca3af',
    description: 'Any two points',
    constraint: 'No constraint',
  },
]

export default function ProcessBuilder({
  systemId,
  points,
  processes,
  calculatedPoints,
  onProcessCreated,
  onSetPointOnChart,
}: ProcessBuilderProps) {
  const { addPoint, updatePoint, addProcess, updateProcess } = usePsychrometricStore()
  
  // Step 1: Process type selection
  const [selectedType, setSelectedType] = useState<ProcessType | null>(null)
  
  // Step 2: Point configuration
  const [processName, setProcessName] = useState('')
  const [cfm, setCfm] = useState(1000)
  
  // Start point config
  const [startPointMode, setStartPointMode] = useState<'existing' | 'new' | 'chain'>('new')
  const [startPointId, setStartPointId] = useState<string>('')
  const [startDb, setStartDb] = useState(70)
  const [startWb, setStartWb] = useState(58)
  
  // End point config  
  const [endPointMode, setEndPointMode] = useState<'existing' | 'new'>('new')
  const [endPointId, setEndPointId] = useState<string>('')
  const [endDb, setEndDb] = useState(55)
  const [endWb, setEndWb] = useState(54)
  
  // Get last process to enable chaining
  const lastProcess = useMemo(() => {
    if (processes.length === 0) return null
    return processes[processes.length - 1]
  }, [processes])
  
  // Get the end point of the last process for chaining
  const lastEndPoint = useMemo(() => {
    if (!lastProcess?.endPointId) return null
    const point = points.find(p => p.id === lastProcess.endPointId)
    const result = point ? calculatedPoints[point.id] : null
    return { point, result }
  }, [lastProcess, points, calculatedPoints])
  
  // Auto-set chain mode if there's a previous process
  useEffect(() => {
    if (lastEndPoint?.point && selectedType) {
      setStartPointMode('chain')
      setStartPointId(lastEndPoint.point.id)
    }
  }, [lastEndPoint, selectedType])
  
  // Get available points for dropdowns
  const availablePoints = useMemo(() => {
    return points.map(p => ({
      point: p,
      result: calculatedPoints[p.id] || null,
    })).filter(p => p.result !== null)
  }, [points, calculatedPoints])
  
  const selectedProcessDef = PROCESS_TYPES.find(p => p.id === selectedType)
  
  // Reset form
  const resetForm = () => {
    setSelectedType(null)
    setProcessName('')
    setCfm(1000)
    setStartPointMode(lastEndPoint ? 'chain' : 'new')
    setStartPointId('')
    setStartDb(70)
    setStartWb(58)
    setEndPointMode('new')
    setEndPointId('')
    setEndDb(55)
    setEndWb(54)
  }
  
  // Handle creating the process
  const handleCreateProcess = async () => {
    if (!selectedType) return
    
    let finalStartPointId = startPointId
    let finalEndPointId = endPointId
    
    // Create start point if needed
    if (startPointMode === 'new') {
      const newPoint = await addPoint(systemId, `P${processes.length + 1}-Start`, 'entering')
      await updatePoint(newPoint.id, {
        dryBulbF: startDb,
        wetBulbF: startWb,
        inputMode: 'db_wb',
      })
      finalStartPointId = newPoint.id
    } else if (startPointMode === 'chain' && lastEndPoint?.point) {
      finalStartPointId = lastEndPoint.point.id
    }
    
    // Create end point if needed
    if (endPointMode === 'new') {
      const newPoint = await addPoint(systemId, `P${processes.length + 1}-End`, 'leaving')
      await updatePoint(newPoint.id, {
        dryBulbF: endDb,
        wetBulbF: endWb,
        inputMode: 'db_wb',
      })
      finalEndPointId = newPoint.id
    }
    
    // Create the process
    const name = processName.trim() || selectedProcessDef?.name || 'Process'
    const newProcess = await addProcess(systemId, name, selectedType)
    
    // Update with start/end points and CFM
    await updateProcess(newProcess.id, {
      startPointId: finalStartPointId || null,
      endPointId: finalEndPointId || null,
      cfm,
    })
    
    resetForm()
    onProcessCreated?.()
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>⚡</span> Add HVAC Process
        </h3>
        {processes.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {processes.length} process{processes.length > 1 ? 'es' : ''} in system
            {lastEndPoint?.result && (
              <span className="text-cyan-400 ml-2">
                • Can chain from {lastEndPoint.result.dryBulbF.toFixed(0)}°F DB
              </span>
            )}
          </p>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        {/* STEP 1: Process Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            1. Select Process Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROCESS_TYPES.map(proc => (
              <button
                key={proc.id}
                onClick={() => {
                  setSelectedType(proc.id)
                  if (!processName) setProcessName(proc.name)
                }}
                className={`p-2 rounded-lg text-left transition-all border ${
                  selectedType === proc.id
                    ? 'bg-gray-700 border-cyan-500 ring-1 ring-cyan-500'
                    : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{proc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{proc.name}</div>
                    <div className="text-xs text-gray-500 truncate">{proc.constraint}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* STEP 2: Point Configuration (only shown after type selected) */}
        {selectedType && (
          <>
            {/* Process Info */}
            {selectedProcessDef && (
              <div 
                className="p-3 rounded-lg border"
                style={{ 
                  backgroundColor: `${selectedProcessDef.color}10`,
                  borderColor: `${selectedProcessDef.color}40`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedProcessDef.icon}</span>
                  <div>
                    <div className="font-medium text-white text-sm">{selectedProcessDef.technicalName}</div>
                    <div className="text-xs text-gray-400">{selectedProcessDef.description}</div>
                  </div>
                </div>
              </div>
            )}
            
            <label className="block text-sm font-medium text-gray-300">
              2. Configure Points
            </label>
            
            {/* Start Point Card */}
            <div className="p-3 bg-cyan-900/20 rounded-lg border border-cyan-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-cyan-400">Start Point (Entering)</span>
                <div className="flex gap-1">
                  {lastEndPoint && (
                    <button
                      onClick={() => {
                        setStartPointMode('chain')
                        setStartPointId(lastEndPoint.point!.id)
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        startPointMode === 'chain'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Chain ⛓️
                    </button>
                  )}
                  <button
                    onClick={() => setStartPointMode('existing')}
                    className={`px-2 py-1 text-xs rounded ${
                      startPointMode === 'existing'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    onClick={() => setStartPointMode('new')}
                    className={`px-2 py-1 text-xs rounded ${
                      startPointMode === 'new'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    New
                  </button>
                </div>
              </div>
              
              {startPointMode === 'chain' && lastEndPoint?.result && (
                <div className="text-sm text-gray-300 bg-gray-800/50 rounded p-2">
                  <span className="text-cyan-400">⛓️ Chained from previous:</span>{' '}
                  {lastEndPoint.result.dryBulbF.toFixed(1)}°F DB, {lastEndPoint.result.wetBulbF.toFixed(1)}°F WB
                </div>
              )}
              
              {startPointMode === 'existing' && (
                <select
                  value={startPointId}
                  onChange={(e) => setStartPointId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select point...</option>
                  {availablePoints.map(({ point, result }) => (
                    <option key={point.id} value={point.id}>
                      {point.pointLabel} ({result?.dryBulbF.toFixed(1)}°F, {result?.wetBulbF.toFixed(1)}°F WB)
                    </option>
                  ))}
                </select>
              )}
              
              {startPointMode === 'new' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dry Bulb (°F)</label>
                    <input
                      type="number"
                      value={startDb}
                      onChange={(e) => setStartDb(parseFloat(e.target.value) || 70)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Wet Bulb (°F)</label>
                    <input
                      type="number"
                      value={startWb}
                      onChange={(e) => setStartWb(parseFloat(e.target.value) || 58)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => onSetPointOnChart?.('start')}
                    className="col-span-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                  >
                    📍 Set on Chart
                  </button>
                </div>
              )}
            </div>
            
            {/* Arrow between points */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-gray-500">
                <span>↓</span>
                <span className="text-xs">{selectedProcessDef?.name}</span>
                <span>↓</span>
              </div>
            </div>
            
            {/* End Point Card */}
            <div className="p-3 bg-red-900/20 rounded-lg border border-red-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-red-400">End Point (Leaving)</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEndPointMode('existing')}
                    className={`px-2 py-1 text-xs rounded ${
                      endPointMode === 'existing'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    onClick={() => setEndPointMode('new')}
                    className={`px-2 py-1 text-xs rounded ${
                      endPointMode === 'new'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    New
                  </button>
                </div>
              </div>
              
              {endPointMode === 'existing' && (
                <select
                  value={endPointId}
                  onChange={(e) => setEndPointId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select point...</option>
                  {availablePoints.map(({ point, result }) => (
                    <option key={point.id} value={point.id}>
                      {point.pointLabel} ({result?.dryBulbF.toFixed(1)}°F, {result?.wetBulbF.toFixed(1)}°F WB)
                    </option>
                  ))}
                </select>
              )}
              
              {endPointMode === 'new' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dry Bulb (°F)</label>
                    <input
                      type="number"
                      value={endDb}
                      onChange={(e) => setEndDb(parseFloat(e.target.value) || 55)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Wet Bulb (°F)</label>
                    <input
                      type="number"
                      value={endWb}
                      onChange={(e) => setEndWb(parseFloat(e.target.value) || 54)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => onSetPointOnChart?.('end')}
                    className="col-span-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                  >
                    📍 Set on Chart
                  </button>
                </div>
              )}
            </div>
            
            {/* Process Name & CFM */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Process Name</label>
                <input
                  type="text"
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
                  placeholder="e.g., AHU-1 Cooling"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Airflow (CFM)</label>
                <input
                  type="number"
                  value={cfm}
                  onChange={(e) => setCfm(parseInt(e.target.value) || 1000)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                  min={0}
                  step={100}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProcess}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
              >
                Add Process
              </button>
            </div>
          </>
        )}
        
        {!selectedType && (
          <p className="text-center text-gray-500 text-sm py-2">
            Select a process type above to get started
          </p>
        )}
      </div>
    </div>
  )
}
