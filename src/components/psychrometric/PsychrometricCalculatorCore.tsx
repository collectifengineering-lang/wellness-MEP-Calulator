/**
 * Psychrometric Calculator Core
 * Main UI component for the psychrometric calculator
 * Includes interactive chart, process builder, and load calculations
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePsychrometricStore } from '../../store/usePsychrometricStore'
import { getLocationById } from '../../data/ashraeClimate'
import { barometricPressureAtAltitude } from '../../data/psychrometricConstants'
import { exportPsychrometricToExcel } from '../../export/psychrometricExcel'
import { exportPsychrometricToPdf } from '../../export/psychrometricPdf'
import PsychrometricChart from './PsychrometricChart'
import PsychrometricInputPanel from './PsychrometricInputPanel'
import ProcessBuilder from './ProcessBuilder'
import ProcessTable from './ProcessTable'
import HelpOverlay from './HelpOverlay'
import type { CalculationMode, ProcessType } from '../../types/psychrometric'

interface PsychrometricCalculatorCoreProps {
  projectId?: string | null
  personalCalcId?: string | null
  standalone?: boolean // eslint-disable-line @typescript-eslint/no-unused-vars
  projectLocationId?: string | null
}

export default function PsychrometricCalculatorCore({
  projectId,
  personalCalcId,
  projectLocationId,
}: PsychrometricCalculatorCoreProps) {
  const {
    systems,
    points,
    processes,
    calculatedPoints,
    currentSystemId,
    isLoading,
    isSaving,
    error,
    createSystem,
    updateSystem,
    deleteSystem,
    setCurrentSystem,
    fetchSystemsForProject,
    fetchSystemsForPersonalCalc,
    addPoint,
    updatePoint,
    deletePoint,
    getProcessesForSystem,
  } = usePsychrometricStore()
  
  const [mode, setMode] = useState<CalculationMode>('single')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [helpMode, setHelpMode] = useState(false)
  const [showHelpOverlay, setShowHelpOverlay] = useState(false)
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  
  // Get current system
  const currentSystem = useMemo(() => {
    return systems.find(s => s.id === currentSystemId)
  }, [systems, currentSystemId])
  
  // Get ALL points for current system (for cleanup)
  const allSystemPoints = useMemo(() => {
    if (!currentSystemId) return []
    return points.filter(p => p.systemId === currentSystemId)
  }, [points, currentSystemId])
  
  // Get points filtered by mode
  const systemPoints = useMemo(() => {
    if (!currentSystemId) return []
    const allPoints = points.filter(p => p.systemId === currentSystemId)
    
    // Filter based on mode
    if (mode === 'single') {
      return allPoints.filter(p => p.pointLabel === 'A')
    } else if (mode === 'mixing') {
      return allPoints.filter(p => ['A', 'B', 'Mixed'].includes(p.pointLabel))
    } else if (mode === 'process') {
      return allPoints.filter(p => ['Entering', 'Leaving'].includes(p.pointLabel))
    }
    return allPoints
  }, [points, currentSystemId, mode])
  
  // Get processes for current system
  const systemProcesses = useMemo(() => {
    if (!currentSystemId) return []
    return getProcessesForSystem(currentSystemId)
  }, [currentSystemId, processes, getProcessesForSystem])
  
  // Get calculated results for filtered points
  const pointResults = useMemo(() => {
    return systemPoints.map(p => ({
      point: p,
      result: calculatedPoints[p.id] || null,
    }))
  }, [systemPoints, calculatedPoints])
  
  // Fetch systems on mount
  useEffect(() => {
    if (projectId) {
      fetchSystemsForProject(projectId)
    } else if (personalCalcId) {
      fetchSystemsForPersonalCalc(personalCalcId)
    }
  }, [projectId, personalCalcId])
  
  // Auto-select first system or create one
  useEffect(() => {
    const relevantSystems = systems.filter(s => 
      (projectId && s.projectId === projectId) ||
      (personalCalcId && s.personalCalcId === personalCalcId)
    )
    
    if (relevantSystems.length > 0 && !currentSystemId) {
      setCurrentSystem(relevantSystems[0].id)
    }
  }, [systems, projectId, personalCalcId, currentSystemId])
  
  // Clean up points when switching modes
  const handleModeChange = useCallback(async (newMode: CalculationMode) => {
    if (!currentSystemId) {
      setMode(newMode)
      return
    }
    
    // Delete points that don't belong to the new mode
    const pointsToDelete: string[] = []
    
    allSystemPoints.forEach(p => {
      if (newMode === 'single' && p.pointLabel !== 'A') {
        pointsToDelete.push(p.id)
      } else if (newMode === 'mixing' && !['A', 'B', 'Mixed'].includes(p.pointLabel)) {
        pointsToDelete.push(p.id)
      } else if (newMode === 'process' && !['Entering', 'Leaving'].includes(p.pointLabel)) {
        pointsToDelete.push(p.id)
      }
    })
    
    // Delete irrelevant points
    for (const pointId of pointsToDelete) {
      await deletePoint(pointId)
    }
    
    setMode(newMode)
  }, [currentSystemId, allSystemPoints, deletePoint])
  
  // Get default altitude from project location
  const getDefaultAltitude = (): number => {
    if (projectLocationId) {
      const location = getLocationById(projectLocationId)
      if (location) {
        return location.elevation_ft
      }
    }
    return 0
  }
  
  // Handle creating new system
  const handleCreateSystem = async () => {
    const altitude = getDefaultAltitude()
    await createSystem({
      projectId,
      personalCalcId,
      name: 'Psychrometric Analysis',
      altitudeFt: altitude,
    })
  }
  
  // Handle system selection
  const handleSystemChange = (systemId: string) => {
    setCurrentSystem(systemId)
  }
  
  // Handle name editing
  const handleNameDoubleClick = () => {
    if (currentSystem) {
      setEditName(currentSystem.name)
      setIsEditingName(true)
    }
  }
  
  const handleNameSave = () => {
    if (currentSystem && editName.trim()) {
      updateSystem(currentSystem.id, { name: editName.trim() })
    }
    setIsEditingName(false)
  }
  
  // Handle altitude change
  const handleAltitudeChange = (altitudeFt: number) => {
    if (currentSystem) {
      updateSystem(currentSystem.id, { altitudeFt })
    }
  }
  
  // Get location name for display
  const getLocationDisplay = (): string | null => {
    if (projectLocationId) {
      const location = getLocationById(projectLocationId)
      if (location) {
        return `${location.name}, ${location.state || location.country}`
      }
    }
    return null
  }
  
  // Handle placing a point from the chart
  const handlePlacePoint = async (label: string, coords: { dryBulbF: number; humidityRatioGrains: number }) => {
    if (!currentSystemId) return
    
    // Don't allow placing Mixed point - it's always calculated
    if (label === 'Mixed') return
    
    // Check if point with this label already exists
    const existingPoint = allSystemPoints.find(p => p.pointLabel === label)
    
    if (existingPoint) {
      // Update existing point
      updatePoint(existingPoint.id, {
        dryBulbF: coords.dryBulbF,
        humidityRatioGrains: coords.humidityRatioGrains,
        inputMode: 'db_w',
      })
    } else {
      // Create new point
      const newPoint = await addPoint(currentSystemId, label, 'state')
      updatePoint(newPoint.id, {
        dryBulbF: coords.dryBulbF,
        humidityRatioGrains: coords.humidityRatioGrains,
        inputMode: 'db_w',
      })
    }
  }
  
  // Handle dragging a point
  const handleDragPoint = (pointId: string, coords: { dryBulbF: number; humidityRatioGrains: number }) => {
    // Don't allow dragging Mixed point
    const point = allSystemPoints.find(p => p.id === pointId)
    if (point?.pointLabel === 'Mixed') return
    
    updatePoint(pointId, {
      dryBulbF: coords.dryBulbF,
      humidityRatioGrains: coords.humidityRatioGrains,
      inputMode: 'db_w',
    })
  }
  
  // Handle starting a process from the chart
  const handleStartProcess = (processType: ProcessType, startCoords: { dryBulbF: number; humidityRatioGrains: number }) => {
    console.log('Start process:', processType, startCoords)
  }
  
  // Handle export
  const handleExport = (format: 'excel' | 'pdf') => {
    if (!currentSystem) return
    
    if (format === 'excel') {
      exportPsychrometricToExcel(currentSystem, systemPoints, calculatedPoints, systemProcesses)
    } else {
      exportPsychrometricToPdf(currentSystem, systemPoints, calculatedPoints, systemProcesses)
    }
  }
  
  // Convert processes to chart format
  const processLines = useMemo(() => {
    return systemProcesses.map(proc => ({
      id: proc.id,
      name: proc.name,
      processType: proc.processType,
      startPoint: proc.startPointId ? calculatedPoints[proc.startPointId] : null,
      endPoint: proc.endPointId ? calculatedPoints[proc.endPointId] : null,
      color: selectedProcessId === proc.id ? '#fff' : '#9ca3af',
    }))
  }, [systemProcesses, calculatedPoints, selectedProcessId])
  
  // Filter systems for this context
  const contextSystems = useMemo(() => {
    return systems.filter(s => 
      (projectId && s.projectId === projectId) ||
      (personalCalcId && s.personalCalcId === personalCalcId)
    )
  }, [systems, projectId, personalCalcId])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-surface-400">Loading psychrometric data...</div>
      </div>
    )
  }
  
  // Full-screen container class
  const containerClass = isFullScreen
    ? 'fixed inset-0 z-50 bg-gray-900 text-white flex flex-col'
    : 'flex flex-col h-full bg-gray-900 text-white'
  
  return (
    <div className={containerClass}>
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* System Selector */}
            {contextSystems.length > 0 && (
              <select
                value={currentSystemId || ''}
                onChange={(e) => handleSystemChange(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm"
              >
                {contextSystems.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            
            {/* System Name */}
            {currentSystem && (
              isEditingName ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  autoFocus
                  className="bg-gray-800 border border-cyan-500 rounded px-2 py-1 text-sm"
                />
              ) : (
                <h2
                  className="text-lg font-semibold cursor-pointer hover:text-cyan-400 transition-colors"
                  onDoubleClick={handleNameDoubleClick}
                  title="Double-click to rename"
                >
                  🌡️ {currentSystem.name}
                </h2>
              )
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Export Buttons */}
            {currentSystem && (
              <>
                <button
                  onClick={() => handleExport('excel')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm transition-colors flex items-center gap-1"
                >
                  📊 Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors flex items-center gap-1"
                >
                  📄 PDF
                </button>
                <div className="w-px h-6 bg-gray-600" />
              </>
            )}
            
            {/* Full Screen Toggle */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                isFullScreen ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
            >
              {isFullScreen ? '⊙ Exit Full Screen' : '⛶ Full Screen'}
            </button>
            
            {/* Help Mode Toggle */}
            <button
              onClick={() => setHelpMode(!helpMode)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                helpMode ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle help mode - hover over chart elements for explanations"
            >
              💡 Help
            </button>
            
            {/* Full Help */}
            <button
              onClick={() => setShowHelpOverlay(true)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              title="Open full help guide"
            >
              📚 Guide
            </button>
            
            {/* New System Button */}
            <button
              onClick={handleCreateSystem}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
            >
              + New
            </button>
            
            {/* Delete System Button */}
            {currentSystem && contextSystems.length > 1 && (
              <button
                onClick={() => deleteSystem(currentSystem.id)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        
        {/* Atmospheric Settings */}
        {currentSystem && (
          <div className="mt-3 flex items-center gap-6 text-sm">
            {/* Location Display (if from project) */}
            {getLocationDisplay() && (
              <div className="flex items-center gap-2 text-surface-400">
                <span>📍</span>
                <span>{getLocationDisplay()}</span>
                <span className="text-xs text-green-500">(from project)</span>
              </div>
            )}
            
            {/* Altitude */}
            <div className="flex items-center gap-2">
              <label className="text-surface-400">Altitude:</label>
              <input
                type="number"
                value={currentSystem.altitudeFt}
                onChange={(e) => handleAltitudeChange(parseFloat(e.target.value) || 0)}
                className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
              />
              <span className="text-surface-500">ft</span>
            </div>
            
            {/* Barometric Pressure (calculated) */}
            <div className="flex items-center gap-2 text-surface-400">
              <span>Barometric:</span>
              <span className="text-cyan-400">
                {barometricPressureAtAltitude(currentSystem.altitudeFt).toFixed(3)} psia
              </span>
              <span className="text-surface-500">
                ({(barometricPressureAtAltitude(currentSystem.altitudeFt) * 29.921 / 14.696).toFixed(2)} in.Hg)
              </span>
            </div>
            
            {/* Saving Indicator */}
            {isSaving && (
              <span className="text-yellow-400 text-xs animate-pulse">Saving...</span>
            )}
          </div>
        )}
        
        {/* Mode Tabs */}
        <div className="mt-3 flex gap-2">
          {(['single', 'mixing', 'process'] as CalculationMode[]).map(m => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-surface-300 hover:bg-gray-700'
              }`}
            >
              {m === 'single' && '📊 Single Point'}
              {m === 'mixing' && '🔄 Mixing'}
              {m === 'process' && '⚡ HVAC Process'}
            </button>
          ))}
          
          <span className="ml-4 text-xs text-gray-500 self-center">
            {mode === 'single' && 'Calculate properties for a single air state'}
            {mode === 'mixing' && 'Mix two airstreams (A + B → Mixed)'}
            {mode === 'process' && 'Calculate loads for HVAC processes'}
          </span>
        </div>
      </div>
      
      {/* Main Content */}
      {currentSystem ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Section - Chart and Input Panel */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Chart Area */}
            <div className="flex-1 p-4 overflow-hidden">
              <PsychrometricChart
                points={pointResults}
                processLines={processLines}
                barometricPressure={barometricPressureAtAltitude(currentSystem.altitudeFt)}
                helpMode={helpMode}
                onPlacePoint={handlePlacePoint}
                onDragPoint={handleDragPoint}
                onStartProcess={handleStartProcess}
              />
            </div>
            
            {/* Right Panel */}
            <div className="w-96 border-l border-gray-700 flex flex-col overflow-hidden">
              {/* Input Panel */}
              <div className="flex-1 overflow-auto p-4">
                <PsychrometricInputPanel
                  systemId={currentSystem.id}
                  mode={mode}
                  points={systemPoints}
                  calculatedPoints={calculatedPoints}
                  barometricPressure={barometricPressureAtAltitude(currentSystem.altitudeFt)}
                />
                
                {/* Process Builder (in process mode) */}
                {mode === 'process' && (
                  <div className="mt-4">
                    <ProcessBuilder
                      systemId={currentSystem.id}
                      points={systemPoints}
                      processes={systemProcesses}
                      calculatedPoints={calculatedPoints}
                      onSetPointOnChart={(pointType) => {
                        // TODO: Enable chart click mode to set this point
                        console.log('Set point on chart:', pointType)
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom Section - Process Table (when in process mode or has processes) */}
          {(mode === 'process' || systemProcesses.length > 0) && (
            <div className="border-t border-gray-700 max-h-80 overflow-auto">
              <ProcessTable
                processes={systemProcesses}
                points={systemPoints}
                calculatedPoints={calculatedPoints}
                selectedProcessId={selectedProcessId}
                onSelectProcess={setSelectedProcessId}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🌡️</div>
            <h3 className="text-xl font-semibold mb-2">No Analysis Selected</h3>
            <p className="text-surface-400 mb-4">Create a new psychrometric analysis to get started</p>
            <button
              onClick={handleCreateSystem}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
            >
              + Create Analysis
            </button>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Help Overlay */}
      <HelpOverlay
        isOpen={showHelpOverlay}
        onClose={() => setShowHelpOverlay(false)}
      />
    </div>
  )
}
