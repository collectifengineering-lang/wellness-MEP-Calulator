/**
 * ProcessBuilder Component
 * Build HVAC systems with processes
 * 
 * Key features:
 * - OA/RA Mixing as first process with design condition integration
 * - System CFM tracking (OA + RA must equal system CFM)
 * - ASHRAE design condition quick-fills
 * - Sequential process chaining (A → B → C → D...)
 */

import { useState, useMemo, useEffect } from 'react'
import { usePsychrometricStore } from '../../store/usePsychrometricStore'
import { getLocationById } from '../../data/ashraeClimate'
import { calculateStatePoint } from '../../calculations/psychrometric'
import { barometricPressureAtAltitude } from '../../data/psychrometricConstants'
import type { ProcessType, PsychrometricPoint, PsychrometricProcess, StatePointResult, PsychrometricSystem } from '../../types/psychrometric'

interface ProcessBuilderProps {
  systemId: string
  system: PsychrometricSystem
  points: PsychrometricPoint[]
  processes: PsychrometricProcess[]
  calculatedPoints: Record<string, StatePointResult>
  projectLocationId?: string | null  // For ASHRAE design conditions
  pickingPointLabel?: string | null
  editingProcessId?: string | null  // Process being edited
  onProcessCreated?: () => void
  onSetPointOnChart?: (pointLabel: string) => void
  onEditProcess?: (processId: string | null) => void  // Start/stop editing
}

// Process type definitions
const PROCESS_TYPES: {
  id: ProcessType
  name: string
  technicalName: string
  icon: string
  color: string
  description: string
  constraint: string
  canBeFirst?: boolean  // Can this be the first process?
}[] = [
  {
    id: 'oa_ra_mixing',
    name: 'OA/RA Mixing',
    technicalName: 'Outdoor + Return Air Mixing',
    icon: '🌬️',
    color: '#22c55e',
    description: 'Mix outdoor air with return air - typically first process',
    constraint: 'OA CFM + RA CFM = System CFM',
    canBeFirst: true,
  },
  {
    id: 'space_load',
    name: 'Space Load',
    technicalName: 'Space Heating/Cooling Load',
    icon: '🏢',
    color: '#f59e0b',
    description: 'Heat/moisture added by the conditioned space',
    constraint: 'Supply to Return air change',
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
    id: 'sensible_heating',
    name: 'Sensible Heating',
    technicalName: 'Sensible Heat Addition',
    icon: '🔥',
    color: '#ef4444',
    description: 'Temperature increase, no moisture change',
    constraint: 'Horizontal right (constant W)',
  },
  {
    id: 'dx_dehumidification',
    name: 'DX Cooling/Dehum',
    technicalName: 'Refrigerant Cooling',
    icon: '🧊',
    color: '#0891b2',
    description: 'Cool below dew point, remove moisture',
    constraint: 'To saturation, then along curve',
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
    color: '#f97316',
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

// Point colors
const POINT_COLORS: Record<string, string> = {
  OA: '#06b6d4',  // cyan - outdoor air
  RA: '#f59e0b',  // amber - return air
  MA: '#22c55e',  // green - mixed air
  SA: '#3b82f6',  // blue - supply air
  A: '#22c55e', B: '#3b82f6', C: '#8b5cf6', D: '#ec4899',
  E: '#f97316', F: '#14b8a6', G: '#ef4444', H: '#06b6d4',
  default: '#a855f7',
}

export default function ProcessBuilder({
  systemId,
  system,
  points,
  processes,
  calculatedPoints,
  projectLocationId,
  pickingPointLabel,
  editingProcessId,
  onProcessCreated,
  onSetPointOnChart,
  onEditProcess,
}: ProcessBuilderProps) {
  const { 
    addPoint, 
    updatePoint, 
    deletePoint,
    addProcess, 
    updateProcess, 
    updateSystem,
    getNextPointLabel,
    getLastProcessEndPoint,
  } = usePsychrometricStore()
  
  // Detect orphan points (not used by any process)
  const orphanPoints = useMemo(() => {
    const usedPointIds = new Set<string>()
    processes.forEach(p => {
      if (p.startPointId) usedPointIds.add(p.startPointId)
      if (p.endPointId) usedPointIds.add(p.endPointId)
      if (p.oaPointId) usedPointIds.add(p.oaPointId)
      if (p.raPointId) usedPointIds.add(p.raPointId)
      if (p.mixedPointId) usedPointIds.add(p.mixedPointId)
    })
    return points.filter(p => !usedPointIds.has(p.id))
  }, [points, processes])
  
  // Get ASHRAE location data
  const ashraeLocation = useMemo(() => {
    if (!projectLocationId) return null
    return getLocationById(projectLocationId)
  }, [projectLocationId])
  
  // Process type selection
  const [selectedType, setSelectedType] = useState<ProcessType | null>(null)
  
  // OA/RA Mixing inputs
  const [oaDb, setOaDb] = useState(95)
  const [oaWb, setOaWb] = useState(75)
  const [raDb, setRaDb] = useState(75)
  const [raWb, setRaWb] = useState(63)
  
  // OA percentage slider (controls OA/RA split)
  const [oaPercent, setOaPercent] = useState(20) // Default 20% OA
  
  // Calculated CFMs from percentage
  const oaCfm = Math.round(system.systemCfm * (oaPercent / 100))
  const raCfm = system.systemCfm - oaCfm
  
  // Standard process inputs
  const [startDb, setStartDb] = useState(70)
  const [startWb, setStartWb] = useState(58)
  const [endDb, setEndDb] = useState(55)
  const [endWb, setEndWb] = useState(54)
  
  // "Close the loop" - select existing point as end
  const [closeLoopPointId, setCloseLoopPointId] = useState<string | null>(null)
  
  // Common
  const [processName, setProcessName] = useState('')
  const [cfm, setCfm] = useState(system.systemCfm)
  
  // Sync CFM with system CFM
  useEffect(() => {
    setCfm(system.systemCfm)
  }, [system.systemCfm])
  
  // Initialize OA conditions from ASHRAE if available
  useEffect(() => {
    if (ashraeLocation) {
      // Default to summer cooling design conditions
      setOaDb(ashraeLocation.cooling_04_db)
      setOaWb(ashraeLocation.cooling_04_mcwb)
    }
  }, [ashraeLocation])
  
  // Sync local state with existing/placed points (real-time update when points change)
  useEffect(() => {
    // Check for OA point
    const oaPoint = points.find(p => p.pointLabel === 'OA')
    if (oaPoint) {
      const oaResult = calculatedPoints[oaPoint.id]
      if (oaResult) {
        setOaDb(oaResult.dryBulbF)
        setOaWb(oaResult.wetBulbF)
      }
    }
    
    // Check for RA point
    const raPoint = points.find(p => p.pointLabel === 'RA')
    if (raPoint) {
      const raResult = calculatedPoints[raPoint.id]
      if (raResult) {
        setRaDb(raResult.dryBulbF)
        setRaWb(raResult.wetBulbF)
      }
    }
    
    // Check for point A (start point for standard processes)
    const pointA = points.find(p => p.pointLabel === 'A')
    if (pointA) {
      const aResult = calculatedPoints[pointA.id]
      if (aResult) {
        setStartDb(aResult.dryBulbF)
        setStartWb(aResult.wetBulbF)
      }
    }
    
    // Check for point B (end point for first process)
    const pointB = points.find(p => p.pointLabel === 'B')
    if (pointB) {
      const bResult = calculatedPoints[pointB.id]
      if (bResult) {
        setEndDb(bResult.dryBulbF)
        setEndWb(bResult.wetBulbF)
      }
    }
    
    // For subsequent processes, check any other sequential labels (C, D, E...)
    // that might have been placed on chart
    const existingLabels = points.filter(p => /^[A-Z]$/.test(p.pointLabel)).map(p => p.pointLabel)
    const alphabet = 'CDEFGHIJKLMNOPQRSTUVWXYZ' // Skip A and B already handled above
    for (const label of alphabet) {
      if (existingLabels.includes(label)) {
        const pt = points.find(p => p.pointLabel === label)
        if (pt) {
          const result = calculatedPoints[pt.id]
          if (result) {
            // Update end point to the latest sequential point found
            setEndDb(result.dryBulbF)
            setEndWb(result.wetBulbF)
          }
        }
      }
    }
  }, [points, calculatedPoints])
  
  // Determine if this is the first process
  const isFirstProcess = processes.length === 0
  
  // Get the last process end point for chaining
  const lastEndPoint = useMemo(() => {
    const point = getLastProcessEndPoint(systemId)
    if (!point) return null
    const result = calculatedPoints[point.id]
    return { point, result }
  }, [systemId, processes, calculatedPoints, getLastProcessEndPoint])
  
  // Get next point labels for standard processes
  const nextLabels = useMemo(() => {
    const existingLabels = points.filter(p => /^[A-Z]$/.test(p.pointLabel)).map(p => p.pointLabel)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    
    if (isFirstProcess) {
      return { startLabel: 'A', endLabel: 'B' }
    }
    
    const startLabel = lastEndPoint?.point?.pointLabel || 'A'
    let endLabel = 'B'
    for (let i = 0; i < alphabet.length; i++) {
      if (!existingLabels.includes(alphabet[i])) {
        endLabel = alphabet[i]
        break
      }
    }
    
    return { startLabel, endLabel }
  }, [points, isFirstProcess, lastEndPoint])
  
  // Calculate mixed air point preview
  const mixedAirPreview = useMemo(() => {
    if (selectedType !== 'oa_ra_mixing') return null
    
    const pressure = barometricPressureAtAltitude(system.altitudeFt)
    
    try {
      const oaState = calculateStatePoint('db_wb', { dryBulbF: oaDb, wetBulbF: oaWb }, pressure)
      const raState = calculateStatePoint('db_wb', { dryBulbF: raDb, wetBulbF: raWb }, pressure)
      
      // Mass-weighted mixing
      const oaMassFlow = oaCfm / oaState.specificVolumeFt3Lb
      const raMassFlow = raCfm / raState.specificVolumeFt3Lb
      const totalMassFlow = oaMassFlow + raMassFlow
      
      const mixedDb = (oaMassFlow * oaDb + raMassFlow * raDb) / totalMassFlow
      const mixedW = (oaMassFlow * oaState.humidityRatioGrains + raMassFlow * raState.humidityRatioGrains) / totalMassFlow
      
      const mixedState = calculateStatePoint('db_w', { dryBulbF: mixedDb, humidityRatioGrains: mixedW }, pressure)
      
      return {
        oaState,
        raState,
        mixedState,
        totalCfm: oaCfm + raCfm,
      }
    } catch {
      return null
    }
  }, [selectedType, oaDb, oaWb, oaCfm, raDb, raWb, raCfm, system.altitudeFt])
  
  const selectedProcessDef = PROCESS_TYPES.find(p => p.id === selectedType)
  
  // Load editing process data when editingProcessId changes
  useEffect(() => {
    if (!editingProcessId) return
    
    const process = processes.find(p => p.id === editingProcessId)
    if (!process) return
    
    setSelectedType(process.processType)
    setProcessName(process.name)
    setCfm(process.cfm)
    
    // Load OA/RA Mixing data
    if (process.processType === 'oa_ra_mixing') {
      if (process.oaCfm && process.raCfm) {
        const total = process.oaCfm + process.raCfm
        setOaPercent(Math.round((process.oaCfm / total) * 100))
      }
      if (process.oaPointId) {
        const oaResult = calculatedPoints[process.oaPointId]
        if (oaResult) {
          setOaDb(oaResult.dryBulbF)
          setOaWb(oaResult.wetBulbF)
        }
      }
      if (process.raPointId) {
        const raResult = calculatedPoints[process.raPointId]
        if (raResult) {
          setRaDb(raResult.dryBulbF)
          setRaWb(raResult.wetBulbF)
        }
      }
    } else {
      // Load standard process data
      if (process.startPointId) {
        const startResult = calculatedPoints[process.startPointId]
        if (startResult) {
          setStartDb(startResult.dryBulbF)
          setStartWb(startResult.wetBulbF)
        }
      }
      if (process.endPointId) {
        const endResult = calculatedPoints[process.endPointId]
        if (endResult) {
          setEndDb(endResult.dryBulbF)
          setEndWb(endResult.wetBulbF)
        }
      }
    }
  }, [editingProcessId, processes, calculatedPoints])
  
  // Reset form
  const resetForm = () => {
    setSelectedType(null)
    setProcessName('')
    setCfm(system.systemCfm)
    setStartDb(70)
    setStartWb(58)
    onEditProcess?.(null) // Exit edit mode
    setEndDb(55)
    setEndWb(54)
    setCloseLoopPointId(null)
  }
  
  // Apply summer design conditions
  const applySummerDesign = (percentile: '04' | '1') => {
    if (!ashraeLocation) return
    if (percentile === '04') {
      setOaDb(ashraeLocation.cooling_04_db)
      setOaWb(ashraeLocation.cooling_04_mcwb)
    } else {
      setOaDb(ashraeLocation.cooling_1_db)
      setOaWb(ashraeLocation.cooling_1_mcwb)
    }
  }
  
  // Apply winter design conditions
  const applyWinterDesign = (percentile: '99' | '996') => {
    if (!ashraeLocation) return
    // Winter design only has DB - estimate WB based on winter humidity ratio
    const winterDb = percentile === '99' ? ashraeLocation.heating_99_db : ashraeLocation.heating_996_db
    // Estimate WB (typically close to DB in cold dry conditions)
    const estimatedWb = Math.max(winterDb - 5, winterDb * 0.9)
    setOaDb(winterDb)
    setOaWb(Math.round(estimatedWb))
  }
  
  // Handle creating OA/RA mixing process
  const handleCreateOaRaMixing = async () => {
    const pressure = barometricPressureAtAltitude(system.altitudeFt)
    
    // Use sequential labels: A = OA, B = RA, C = Mixed Air
    const oaLabel = getNextPointLabel(systemId)
    
    // Create OA point (Point A)
    const oaPoint = await addPoint(systemId, oaLabel, 'state')
    await updatePoint(oaPoint.id, {
      dryBulbF: oaDb,
      wetBulbF: oaWb,
      inputMode: 'db_wb',
      cfm: oaCfm,
    })
    
    // Get next label for RA (Point B)
    const raLabel = getNextPointLabel(systemId)
    const raPoint = await addPoint(systemId, raLabel, 'state')
    await updatePoint(raPoint.id, {
      dryBulbF: raDb,
      wetBulbF: raWb,
      inputMode: 'db_wb',
      cfm: raCfm,
    })
    
    // Calculate and create mixed air point (Point C)
    const oaState = calculateStatePoint('db_wb', { dryBulbF: oaDb, wetBulbF: oaWb }, pressure)
    const raState = calculateStatePoint('db_wb', { dryBulbF: raDb, wetBulbF: raWb }, pressure)
    
    const oaMassFlow = oaCfm / oaState.specificVolumeFt3Lb
    const raMassFlow = raCfm / raState.specificVolumeFt3Lb
    const totalMassFlow = oaMassFlow + raMassFlow
    
    const mixedDb = (oaMassFlow * oaDb + raMassFlow * raDb) / totalMassFlow
    const mixedW = (oaMassFlow * oaState.humidityRatioGrains + raMassFlow * raState.humidityRatioGrains) / totalMassFlow
    
    const maLabel = getNextPointLabel(systemId)
    const maPoint = await addPoint(systemId, maLabel, 'mixed')
    await updatePoint(maPoint.id, {
      dryBulbF: mixedDb,
      humidityRatioGrains: mixedW,
      inputMode: 'db_w',
      cfm: oaCfm + raCfm,
    })
    
    // Create the process
    const name = processName.trim() || 'OA/RA Mixing'
    const newProcess = await addProcess(systemId, name, 'oa_ra_mixing')
    
    await updateProcess(newProcess.id, {
      oaPointId: oaPoint.id,
      raPointId: raPoint.id,
      mixedPointId: maPoint.id,
      startPointId: oaPoint.id,  // OA point for display
      endPointId: maPoint.id,    // Mixed air is the "end" for chaining
      oaCfm,
      raCfm,
      cfm: oaCfm + raCfm,
    })
    
    resetForm()
    onProcessCreated?.()
  }
  
  // Handle creating standard process
  const handleCreateProcess = async () => {
    if (!selectedType) return
    
    if (selectedType === 'oa_ra_mixing') {
      await handleCreateOaRaMixing()
      return
    }
    
    let startPointId: string
    let endPointId: string
    
    if (isFirstProcess) {
      // First process: Create start point
      const startPoint = await addPoint(systemId, nextLabels.startLabel, 'state')
      await updatePoint(startPoint.id, {
        dryBulbF: startDb,
        wetBulbF: startWb,
        inputMode: 'db_wb',
        cfm: cfm,
      })
      startPointId = startPoint.id
      
      // Create end point
      const endPoint = await addPoint(systemId, nextLabels.endLabel, 'state')
      await updatePoint(endPoint.id, {
        dryBulbF: endDb,
        wetBulbF: endWb,
        inputMode: 'db_wb',
        cfm: cfm,
      })
      endPointId = endPoint.id
    } else {
      // Chain from last end point
      if (!lastEndPoint?.point) {
        console.error('No last end point to chain from')
        return
      }
      startPointId = lastEndPoint.point.id
      
      // Check if closing loop to an existing point
      if (closeLoopPointId) {
        // Use existing point - close the loop
        endPointId = closeLoopPointId
      } else {
        // Create new end point
        const nextLabel = getNextPointLabel(systemId)
        const endPoint = await addPoint(systemId, nextLabel, 'state')
        await updatePoint(endPoint.id, {
          dryBulbF: endDb,
          wetBulbF: endWb,
          inputMode: 'db_wb',
          cfm: cfm,
        })
        endPointId = endPoint.id
      }
    }
    
    // Create the process
    const name = processName.trim() || selectedProcessDef?.name || 'Process'
    const newProcess = await addProcess(systemId, name, selectedType)
    
    await updateProcess(newProcess.id, {
      startPointId,
      endPointId,
      cfm,
    })
    
    resetForm()
    onProcessCreated?.()
  }
  
  // Handle updating existing process
  const handleUpdateProcess = async () => {
    if (!editingProcessId || !selectedType) return
    
    const process = processes.find(p => p.id === editingProcessId)
    if (!process) return
    
    // Update name and CFM
    await updateProcess(editingProcessId, {
      name: processName.trim() || process.name,
      cfm,
    })
    
    if (selectedType === 'oa_ra_mixing') {
      // Update OA point
      if (process.oaPointId) {
        await updatePoint(process.oaPointId, {
          dryBulbF: oaDb,
          wetBulbF: oaWb,
          inputMode: 'db_wb',
        })
      }
      
      // Update RA point
      if (process.raPointId) {
        await updatePoint(process.raPointId, {
          dryBulbF: raDb,
          wetBulbF: raWb,
          inputMode: 'db_wb',
        })
      }
      
      // Update OA/RA CFMs and recalculate mixed point
      await updateProcess(editingProcessId, {
        oaCfm,
        raCfm,
        cfm: oaCfm + raCfm,
      })
      
      // Recalculate mixed air point
      if (process.mixedPointId && mixedAirPreview) {
        await updatePoint(process.mixedPointId, {
          dryBulbF: mixedAirPreview.mixedState.dryBulbF,
          humidityRatioGrains: mixedAirPreview.mixedState.humidityRatioGrains,
          inputMode: 'db_w',
        })
      }
    } else {
      // Update standard process points
      if (process.startPointId) {
        await updatePoint(process.startPointId, {
          dryBulbF: startDb,
          wetBulbF: startWb,
          inputMode: 'db_wb',
        })
      }
      
      if (process.endPointId) {
        await updatePoint(process.endPointId, {
          dryBulbF: endDb,
          wetBulbF: endWb,
          inputMode: 'db_wb',
        })
      }
    }
    
    resetForm()
  }
  
  return (
    <div className="space-y-4">
      {/* System Info Header */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🌡️</span> {system.name}
          </h3>
          {ashraeLocation && (
            <span className="text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded">
              📍 {ashraeLocation.name}, {ashraeLocation.state}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">System CFM</label>
            <input
              type="number"
              value={system.systemCfm}
              onChange={(e) => updateSystem(systemId, { systemCfm: parseInt(e.target.value) || 10000 })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              min={0}
              step={500}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Altitude</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={system.altitudeFt}
                onChange={(e) => updateSystem(systemId, { altitudeFt: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
              />
              <span className="text-gray-500 text-sm">ft</span>
            </div>
          </div>
        </div>
        
        {processes.length > 0 && (
          <div className="mt-3 text-xs text-gray-400">
            {processes.length} process{processes.length > 1 ? 'es' : ''} defined
            {lastEndPoint?.result && (
              <span className="text-cyan-400 ml-2">
                • Last point: {lastEndPoint.point?.pointLabel} ({lastEndPoint.result.dryBulbF.toFixed(0)}°F DB)
              </span>
            )}
          </div>
        )}
        
        {/* Orphan Points Warning */}
        {orphanPoints.length > 0 && (
          <div className="mt-3 p-3 bg-orange-900/30 rounded-lg border border-orange-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-400">
                ⚠️ {orphanPoints.length} Orphan Point{orphanPoints.length > 1 ? 's' : ''} (not in any process)
              </span>
              <button
                onClick={() => {
                  if (confirm(`Delete all ${orphanPoints.length} orphan points?`)) {
                    orphanPoints.forEach(p => deletePoint(p.id))
                  }
                }}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded transition-colors"
              >
                🗑️ Delete All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {orphanPoints.map(p => {
                const result = calculatedPoints[p.id]
                return (
                  <div 
                    key={p.id}
                    className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1"
                  >
                    <span className="font-medium text-sm" style={{ color: POINT_COLORS[p.pointLabel] || POINT_COLORS.default }}>
                      {p.pointLabel}
                    </span>
                    {result && (
                      <span className="text-xs text-gray-400">
                        {result.dryBulbF.toFixed(0)}°F
                      </span>
                    )}
                    <button
                      onClick={() => deletePoint(p.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                      title="Delete this point"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Add/Edit Process Section */}
      <div className={`bg-gray-800/50 rounded-lg overflow-hidden ${editingProcessId ? 'ring-2 ring-amber-500' : ''}`}>
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {editingProcessId ? '✏️ Edit Process' : 'Add HVAC Process'}
          </h3>
          {editingProcessId && (
            <button
              onClick={resetForm}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </div>
        
        <div className="p-4 space-y-4">
          {/* Process Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              1. Select Process Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROCESS_TYPES
                .filter(p => isFirstProcess ? p.canBeFirst !== false : true)
                .map(proc => (
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
          
          {/* OA/RA Mixing Configuration */}
          {selectedType === 'oa_ra_mixing' && (
            <>
              <div className="p-3 rounded-lg border bg-green-900/10 border-green-700/40">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🌬️</span>
                  <div>
                    <div className="font-medium text-white text-sm">Outdoor + Return Air Mixing</div>
                    <div className="text-xs text-gray-400">Define OA and RA conditions - Mixed Air point calculated automatically</div>
                  </div>
                </div>
              </div>
              
              {/* ASHRAE Design Condition Quick-Fill */}
              {ashraeLocation && (
                <div className="bg-cyan-900/20 border border-cyan-700/40 rounded-lg p-3">
                  <div className="text-xs text-cyan-400 font-medium mb-2">
                    📊 ASHRAE Design Conditions - {ashraeLocation.name}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Summer (Cooling)</div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => applySummerDesign('04')}
                          className="flex-1 px-2 py-1 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-600/50 rounded text-xs text-orange-300"
                          title={`0.4%: ${ashraeLocation.cooling_04_db}°F DB / ${ashraeLocation.cooling_04_mcwb}°F WB`}
                        >
                          0.4% ({ashraeLocation.cooling_04_db}°F)
                        </button>
                        <button
                          onClick={() => applySummerDesign('1')}
                          className="flex-1 px-2 py-1 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-600/30 rounded text-xs text-orange-300"
                          title={`1%: ${ashraeLocation.cooling_1_db}°F DB / ${ashraeLocation.cooling_1_mcwb}°F WB`}
                        >
                          1% ({ashraeLocation.cooling_1_db}°F)
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Winter (Heating)</div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => applyWinterDesign('996')}
                          className="flex-1 px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-600/50 rounded text-xs text-blue-300"
                          title={`99.6%: ${ashraeLocation.heating_996_db}°F DB`}
                        >
                          99.6% ({ashraeLocation.heating_996_db}°F)
                        </button>
                        <button
                          onClick={() => applyWinterDesign('99')}
                          className="flex-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 rounded text-xs text-blue-300"
                          title={`99%: ${ashraeLocation.heating_99_db}°F DB`}
                        >
                          99% ({ashraeLocation.heating_99_db}°F)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* OA % Slider - Primary Control */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-900/30 to-amber-900/30 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Outdoor Air %</span>
                  <span className="text-lg font-bold text-cyan-400">{oaPercent}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={oaPercent}
                  onChange={(e) => setOaPercent(parseInt(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${oaPercent}%, #f59e0b ${oaPercent}%, #f59e0b 100%)`
                  }}
                />
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-cyan-400">OA: {oaCfm.toLocaleString()} CFM</span>
                  <span className="text-gray-400">System: {system.systemCfm.toLocaleString()} CFM</span>
                  <span className="text-amber-400">RA: {raCfm.toLocaleString()} CFM</span>
                </div>
              </div>
              
              {/* OA Input */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: '#06b6d410', borderColor: '#06b6d440' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-cyan-400">
                    Point A - Outdoor Air ({oaCfm.toLocaleString()} CFM)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dry Bulb (°F)</label>
                    <input
                      type="number"
                      value={oaDb}
                      onChange={(e) => setOaDb(parseFloat(e.target.value) || 95)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Wet Bulb (°F)</label>
                    <input
                      type="number"
                      value={oaWb}
                      onChange={(e) => setOaWb(parseFloat(e.target.value) || 75)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* RA Input */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: '#f59e0b10', borderColor: '#f59e0b40' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-amber-400">
                    Point B - Return Air ({raCfm.toLocaleString()} CFM)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dry Bulb (°F)</label>
                    <input
                      type="number"
                      value={raDb}
                      onChange={(e) => setRaDb(parseFloat(e.target.value) || 75)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Wet Bulb (°F)</label>
                    <input
                      type="number"
                      value={raWb}
                      onChange={(e) => setRaWb(parseFloat(e.target.value) || 63)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Mixed Air Preview */}
              {mixedAirPreview && (
                <div className="p-3 rounded-lg border bg-green-900/10 border-green-700/40">
                  <div className="text-sm font-medium mb-2 text-green-400">
                    Point C - Mixed Air (Calculated)
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">DB:</span>{' '}
                      <span className="text-white font-medium">{mixedAirPreview.mixedState.dryBulbF.toFixed(1)}°F</span>
                    </div>
                    <div>
                      <span className="text-gray-400">WB:</span>{' '}
                      <span className="text-white font-medium">{mixedAirPreview.mixedState.wetBulbF.toFixed(1)}°F</span>
                    </div>
                    <div>
                      <span className="text-gray-400">RH:</span>{' '}
                      <span className="text-white font-medium">{mixedAirPreview.mixedState.relativeHumidity.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Total: {system.systemCfm.toLocaleString()} CFM
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Standard Process Configuration */}
          {selectedType && selectedType !== 'oa_ra_mixing' && (
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
              
              {/* First Process: Start Point Input */}
              {isFirstProcess && (
                <div className="p-3 rounded-lg border" style={{ backgroundColor: `${POINT_COLORS[nextLabels.startLabel] || POINT_COLORS.default}10`, borderColor: `${POINT_COLORS[nextLabels.startLabel] || POINT_COLORS.default}40` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: POINT_COLORS[nextLabels.startLabel] || POINT_COLORS.default }}>
                      Point {nextLabels.startLabel} (Start)
                    </span>
                  </div>
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
                      onClick={() => onSetPointOnChart?.(nextLabels.startLabel)}
                      className={`col-span-2 py-1.5 rounded text-xs transition-colors ${
                        pickingPointLabel === nextLabels.startLabel
                          ? 'bg-cyan-600 text-white animate-pulse'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {pickingPointLabel === nextLabels.startLabel ? '📍 Click on chart...' : '📍 Pick on Chart'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Chained from previous */}
              {!isFirstProcess && lastEndPoint?.result && (
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-300">
                    <span className="text-cyan-400 font-medium">⛓️ Chains from {lastEndPoint.point?.pointLabel}:</span>{' '}
                    {lastEndPoint.result.dryBulbF.toFixed(1)}°F DB, {lastEndPoint.result.wetBulbF.toFixed(1)}°F WB
                  </div>
                </div>
              )}
              
              {/* Arrow */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-gray-500">
                  <span>↓</span>
                  <span className="text-xs">{selectedProcessDef?.name}</span>
                  <span>↓</span>
                </div>
              </div>
              
              {/* End Point - with close loop option */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: `${POINT_COLORS[nextLabels.endLabel] || POINT_COLORS.default}10`, borderColor: `${POINT_COLORS[nextLabels.endLabel] || POINT_COLORS.default}40` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: POINT_COLORS[nextLabels.endLabel] || POINT_COLORS.default }}>
                    {closeLoopPointId ? 'Close Loop To:' : `Point ${nextLabels.endLabel} (End)`}
                  </span>
                  
                  {/* Close loop toggle - only show if there are existing points to close to */}
                  {!isFirstProcess && points.filter(p => /^[A-Z]$/.test(p.pointLabel) && p.pointLabel !== lastEndPoint?.point?.pointLabel).length > 0 && (
                    <button
                      onClick={() => setCloseLoopPointId(closeLoopPointId ? null : points.find(p => p.pointLabel === 'A')?.id || null)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        closeLoopPointId 
                          ? 'bg-amber-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {closeLoopPointId ? '✕ Cancel Loop' : '🔄 Close Loop'}
                    </button>
                  )}
                </div>
                
                {closeLoopPointId ? (
                  /* Close loop mode - select existing point */
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Select existing point to complete the cycle:</label>
                    <div className="flex flex-wrap gap-2">
                      {points
                        .filter(p => /^[A-Z]$/.test(p.pointLabel) && p.pointLabel !== lastEndPoint?.point?.pointLabel)
                        .map(p => {
                          const result = calculatedPoints[p.id]
                          const isSelected = closeLoopPointId === p.id
                          return (
                            <button
                              key={p.id}
                              onClick={() => setCloseLoopPointId(p.id)}
                              className={`px-3 py-2 rounded text-sm transition-colors ${
                                isSelected 
                                  ? 'bg-amber-600 text-white ring-2 ring-amber-400' 
                                  : 'bg-gray-800 hover:bg-gray-700'
                              }`}
                              style={{ borderLeft: `3px solid ${POINT_COLORS[p.pointLabel] || POINT_COLORS.default}` }}
                            >
                              <span className="font-medium" style={{ color: isSelected ? 'white' : POINT_COLORS[p.pointLabel] || POINT_COLORS.default }}>
                                {p.pointLabel}
                              </span>
                              {result && (
                                <span className="text-xs ml-2 opacity-70">
                                  {result.dryBulbF.toFixed(0)}°F
                                </span>
                              )}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                ) : (
                  /* Standard mode - new end point */
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
                      onClick={() => onSetPointOnChart?.(nextLabels.endLabel)}
                      className={`col-span-2 py-1.5 rounded text-xs transition-colors ${
                        pickingPointLabel === nextLabels.endLabel
                          ? 'bg-cyan-600 text-white animate-pulse'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {pickingPointLabel === nextLabels.endLabel ? '📍 Click on chart...' : '📍 Pick on Chart'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Process Name & CFM */}
          {selectedType && (
            <>
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
                {selectedType !== 'oa_ra_mixing' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Airflow (CFM)</label>
                    <input
                      type="number"
                      value={cfm}
                      onChange={(e) => setCfm(parseInt(e.target.value) || system.systemCfm)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                      min={0}
                      step={100}
                    />
                  </div>
                )}
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
                  onClick={editingProcessId ? handleUpdateProcess : handleCreateProcess}
                  disabled={false}
                  className={`flex-1 py-2 ${editingProcessId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-cyan-600 hover:bg-cyan-500'} disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors`}
                >
                  {editingProcessId ? '💾 Update Process' : 'Add Process'}
                </button>
              </div>
            </>
          )}
          
          {!selectedType && (
            <p className="text-center text-gray-500 text-sm py-2">
              {isFirstProcess 
                ? 'Select OA/RA Mixing to start with outdoor and return air conditions'
                : 'Select a process type to continue building the system'
              }
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
