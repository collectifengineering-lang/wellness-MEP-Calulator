/**
 * ProcessBuilder Component
 * Build HVAC processes with preset types and guided constraints
 */

import { useState } from 'react'
import { usePsychrometricStore } from '../../store/usePsychrometricStore'
import type { ProcessType, PsychrometricPoint, StatePointResult } from '../../types/psychrometric'

interface ProcessBuilderProps {
  systemId: string
  points: PsychrometricPoint[]
  calculatedPoints: Record<string, StatePointResult>
  onProcessCreated?: () => void
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
  example: string
}[] = [
  {
    id: 'sensible_heating',
    name: 'Sensible Heating',
    technicalName: 'Sensible Heat Addition',
    icon: '🔥',
    color: '#ef4444',
    description: 'Pure temperature increase with no moisture change',
    constraint: 'Horizontal line to the right (constant humidity ratio)',
    example: 'Hot water coil, electric heater, gas furnace',
  },
  {
    id: 'sensible_cooling',
    name: 'Sensible Cooling',
    technicalName: 'Sensible Heat Removal',
    icon: '❄️',
    color: '#3b82f6',
    description: 'Temperature decrease without condensation',
    constraint: 'Horizontal line to the left (constant humidity ratio)',
    example: 'Chilled water coil above dew point, dry cooling',
  },
  {
    id: 'evaporative_cooling',
    name: 'Evaporative Cooling',
    technicalName: 'Adiabatic Saturation',
    icon: '💧',
    color: '#06b6d4',
    description: 'Cooling by evaporating water - temperature drops, humidity rises',
    constraint: 'Along constant wet bulb / enthalpy line toward saturation',
    example: 'Evaporative cooler (swamp cooler), cooling tower, spray chamber',
  },
  {
    id: 'dx_dehumidification',
    name: 'DX Cooling & Dehumidification',
    technicalName: 'Refrigerant Dehumidification',
    icon: '🧊',
    color: '#06b6d4',
    description: 'Cooling below dew point removes moisture via condensation',
    constraint: 'Diagonal to saturation curve, then follows saturation curve down',
    example: 'DX cooling coil, chilled water coil at low temperature',
  },
  {
    id: 'steam_humidification',
    name: 'Steam Humidification',
    technicalName: 'Isothermal Humidification',
    icon: '♨️',
    color: '#8b5cf6',
    description: 'Adding steam raises humidity with minimal temperature change',
    constraint: 'Nearly vertical line upward (constant dry bulb)',
    example: 'Steam humidifier, electrode boiler humidifier',
  },
  {
    id: 'desiccant_dehumidification',
    name: 'Desiccant Dehumidification',
    technicalName: 'Desiccant Adsorption',
    icon: '🌀',
    color: '#f59e0b',
    description: 'Remove moisture using desiccant - humidity drops, temp rises',
    constraint: 'Along constant enthalpy line (latent heat converts to sensible)',
    example: 'Desiccant wheel, silica gel dehumidifier',
  },
  {
    id: 'mixing',
    name: 'Air Mixing',
    technicalName: 'Adiabatic Mixing',
    icon: '🔄',
    color: '#22c55e',
    description: 'Mixing two airstreams creates a weighted average state',
    constraint: 'Straight line between two air states',
    example: 'Return air + outdoor air mixing, economizer cycle',
  },
  {
    id: 'custom',
    name: 'Custom Process',
    technicalName: 'User-Defined Process',
    icon: '✏️',
    color: '#9ca3af',
    description: 'Define any process between two points',
    constraint: 'No constraint - any path allowed',
    example: 'Complex multi-stage process, combined heating/humidification',
  },
]

export default function ProcessBuilder({
  systemId,
  points,
  calculatedPoints,
  onProcessCreated,
}: ProcessBuilderProps) {
  const { addProcess, updateProcess } = usePsychrometricStore()
  const [selectedType, setSelectedType] = useState<ProcessType | null>(null)
  const [processName, setProcessName] = useState('')
  const [startPointId, setStartPointId] = useState<string>('')
  const [endPointId, setEndPointId] = useState<string>('')
  const [cfm, setCfm] = useState(1000)
  const [showHelp, setShowHelp] = useState(false)
  
  // Get available points with their results
  const availablePoints = points.map(p => ({
    point: p,
    result: calculatedPoints[p.id] || null,
  })).filter(p => p.result !== null)
  
  const selectedProcessDef = PROCESS_TYPES.find(p => p.id === selectedType)
  
  // Handle creating the process
  const handleCreateProcess = async () => {
    if (!selectedType || !processName.trim()) return
    
    const newProcess = await addProcess(systemId, processName.trim(), selectedType)
    
    // Update with start/end points and CFM
    await updateProcess(newProcess.id, {
      startPointId: startPointId || null,
      endPointId: endPointId || null,
      cfm,
    })
    
    // Reset form
    setSelectedType(null)
    setProcessName('')
    setStartPointId('')
    setEndPointId('')
    setCfm(1000)
    
    onProcessCreated?.()
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>⚡</span> Add HVAC Process
        </h3>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className={`px-2 py-1 rounded text-sm transition-colors ${
            showHelp ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ? Help
        </button>
      </div>
      
      {/* Help panel */}
      {showHelp && (
        <div className="mb-4 p-3 bg-indigo-900/50 rounded-lg border border-indigo-700 text-sm">
          <p className="text-indigo-200 mb-2">
            <strong>How to use:</strong> Select a process type, then define start and end points. 
            The calculator will compute sensible, latent, and total loads based on the airflow (CFM).
          </p>
          <p className="text-indigo-300">
            💡 Tip: For processes like cooling or heating, the end point should follow the physical constraints 
            of the process (e.g., sensible heating keeps humidity ratio constant).
          </p>
        </div>
      )}
      
      {/* Process Type Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Process Type</label>
        <div className="grid grid-cols-2 gap-2">
          {PROCESS_TYPES.map(proc => (
            <button
              key={proc.id}
              onClick={() => {
                setSelectedType(proc.id)
                if (!processName) setProcessName(proc.name)
              }}
              className={`p-3 rounded-lg text-left transition-all ${
                selectedType === proc.id
                  ? 'bg-gray-700 ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-500'
                  : 'bg-gray-900/50 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{proc.icon}</span>
                <span className="font-medium text-white text-sm">{proc.name}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{proc.description}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Process Details */}
      {selectedProcessDef && (
        <div className="mb-4 p-3 rounded-lg border" style={{ 
          backgroundColor: `${selectedProcessDef.color}10`,
          borderColor: `${selectedProcessDef.color}40`,
        }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{selectedProcessDef.icon}</span>
            <div className="flex-1">
              <h4 className="font-medium text-white">{selectedProcessDef.technicalName}</h4>
              <p className="text-sm text-gray-300 mt-1">{selectedProcessDef.description}</p>
              <div className="mt-2 text-xs">
                <span className="text-gray-500">Path: </span>
                <span className="text-gray-400">{selectedProcessDef.constraint}</span>
              </div>
              <div className="mt-1 text-xs">
                <span className="text-gray-500">Example: </span>
                <span className="text-gray-400">{selectedProcessDef.example}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Process Configuration */}
      {selectedType && (
        <div className="space-y-4">
          {/* Process Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Process Name</label>
            <input
              type="text"
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              placeholder="e.g., AHU-1 Cooling Coil"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          
          {/* Start/End Points */}
          {selectedType !== 'mixing' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Point (Entering)</label>
                <select
                  value={startPointId}
                  onChange={(e) => setStartPointId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select point...</option>
                  {availablePoints.map(({ point, result }) => (
                    <option key={point.id} value={point.id}>
                      {point.pointLabel} ({result?.dryBulbF.toFixed(1)}°F, {result?.relativeHumidity.toFixed(0)}% RH)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Point (Leaving)</label>
                <select
                  value={endPointId}
                  onChange={(e) => setEndPointId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select point...</option>
                  {availablePoints.map(({ point, result }) => (
                    <option key={point.id} value={point.id}>
                      {point.pointLabel} ({result?.dryBulbF.toFixed(1)}°F, {result?.relativeHumidity.toFixed(0)}% RH)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* CFM Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Airflow (CFM)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={cfm}
                onChange={(e) => setCfm(parseInt(e.target.value) || 0)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                min={0}
                step={100}
              />
              <span className="text-gray-500 text-sm">CFM</span>
            </div>
          </div>
          
          {/* Create Button */}
          <button
            onClick={handleCreateProcess}
            disabled={!processName.trim()}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            Add Process
          </button>
        </div>
      )}
      
      {!selectedType && (
        <p className="text-center text-gray-500 text-sm py-4">
          Select a process type to get started
        </p>
      )}
    </div>
  )
}
