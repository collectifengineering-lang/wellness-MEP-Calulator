/**
 * Psychrometric Calculator Core
 * Main UI component for the psychrometric calculator
 * Includes interactive chart, process builder, and load calculations
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePsychrometricStore } from '../../store/usePsychrometricStore'
import { getLocationById } from '../../data/ashraeClimate'
import { barometricPressureAtAltitude } from '../../data/psychrometricConstants'
import { clampToSaturation, closestPointOnLine } from '../../calculations/psychrometric'
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
    lastFetchedProjectId,
    lastFetchedPersonalCalcId,
    clearError,
    createSystem,
    updateSystem,
    deleteSystem,
    setCurrentSystem,
    fetchSystemsForProject,
    fetchSystemsForPersonalCalc,
    addPoint,
    updatePoint,
    deletePoint,
    updateProcess,
    getProcessesForSystem,
  } = usePsychrometricStore()
  
  const [mode, setMode] = useState<CalculationMode>('single')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [helpMode, setHelpMode] = useState(false)
  const [showHelpOverlay, setShowHelpOverlay] = useState(false)
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  
  // Track which point is being picked from the chart (for ProcessBuilder)
  const [pickingPointLabel, setPickingPointLabel] = useState<string | null>(null)
  
  // Get current system
  const currentSystem = useMemo(() => {
    return systems.find(s => s.id === currentSystemId)
  }, [systems, currentSystemId])
  
  // Auto-detect mode based on existing data when system changes
  useEffect(() => {
    if (!currentSystemId) return
    
    // Check if this system has processes
    const systemHasProcesses = processes.some(p => p.systemId === currentSystemId)
    const systemPoints = points.filter(p => p.systemId === currentSystemId)
    
    if (systemHasProcesses) {
      // System has processes → use process mode
      setMode('process')
      console.log('[PSYCH UI] Auto-set mode to process (has processes)')
    } else if (systemPoints.some(p => p.pointLabel === 'Mixed')) {
      // Has mixed point → use mixing mode
      setMode('mixing')
      console.log('[PSYCH UI] Auto-set mode to mixing (has Mixed point)')
    } else if (systemPoints.length > 1) {
      // Has multiple points but no processes → might be mixing
      const hasB = systemPoints.some(p => p.pointLabel === 'B')
      if (hasB) {
        setMode('mixing')
        console.log('[PSYCH UI] Auto-set mode to mixing (has A and B)')
      }
    }
    // Otherwise keep current mode (defaults to single for new systems)
  }, [currentSystemId, processes, points])
  
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
      // Process mode uses sequential labels: A, B, C, D, E, F...
      // Include all single-letter uppercase labels
      return allPoints.filter(p => /^[A-Z]$/.test(p.pointLabel))
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
  
  // For process mode: Calculate the next sequential point label
  const { nextProcessPointLabel, isFirstProcess } = useMemo(() => {
    if (mode !== 'process') {
      return { nextProcessPointLabel: 'A', isFirstProcess: true }
    }
    
    // Get all points in the system with sequential labels (A, B, C, D...)
    const sequentialPoints = allSystemPoints.filter(p => 
      /^[A-Z]$/.test(p.pointLabel)
    ).map(p => p.pointLabel)
    
    // Find the next available letter
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let nextLabel = 'A'
    for (let i = 0; i < alphabet.length; i++) {
      if (!sequentialPoints.includes(alphabet[i])) {
        nextLabel = alphabet[i]
        break
      }
    }
    
    // Is first process if we have no processes yet
    const isFirst = systemProcesses.length === 0
    
    return { nextProcessPointLabel: nextLabel, isFirstProcess: isFirst }
  }, [mode, allSystemPoints, systemProcesses])
  
  // Fetch systems on mount
  useEffect(() => {
    const loadSystems = async () => {
      console.log('PsychrometricCalculatorCore: Loading systems...', { projectId, personalCalcId })
      if (projectId) {
        await fetchSystemsForProject(projectId)
        console.log('PsychrometricCalculatorCore: Fetched systems for project', projectId)
      } else if (personalCalcId) {
        await fetchSystemsForPersonalCalc(personalCalcId)
        console.log('PsychrometricCalculatorCore: Fetched systems for personal calc', personalCalcId)
      }
    }
    loadSystems()
  }, [projectId, personalCalcId, fetchSystemsForProject, fetchSystemsForPersonalCalc])
  
  // Auto-select first system or create one if none exist
  // CRITICAL: Only auto-create AFTER we've confirmed no systems exist in DB
  useEffect(() => {
    // Don't do anything while loading or saving
    if (isLoading || isSaving) {
      console.log('[UI] Auto-select: skipping - loading:', isLoading, 'saving:', isSaving)
      return
    }
    
    // Check if we've actually fetched for this project/personal calc
    const hasFetchedForProject = projectId && lastFetchedProjectId === projectId
    const hasFetchedForPersonalCalc = personalCalcId && lastFetchedPersonalCalcId === personalCalcId
    
    console.log('[UI] Auto-select check:', { 
      projectId,
      personalCalcId,
      lastFetchedProjectId,
      lastFetchedPersonalCalcId,
      hasFetchedForProject,
      hasFetchedForPersonalCalc,
    })
    
    // If we haven't fetched yet, wait for the fetch to complete
    if ((projectId && !hasFetchedForProject) || (personalCalcId && !hasFetchedForPersonalCalc)) {
      console.log('[UI] Auto-select: waiting for fetch to complete...')
      return
    }
    
    const relevantSystems = systems.filter(s => 
      (projectId && s.projectId === projectId) ||
      (personalCalcId && s.personalCalcId === personalCalcId)
    )
    
    console.log('[UI] Auto-select effect:', { 
      relevantSystemsCount: relevantSystems.length, 
      currentSystemId,
      systems: systems.map(s => ({ id: s.id, projectId: s.projectId, name: s.name }))
    })
    
    if (relevantSystems.length > 0) {
      // Select the first system if none selected or current not in list
      if (!currentSystemId || !relevantSystems.find(s => s.id === currentSystemId)) {
        console.log('[UI] Auto-selecting first system:', relevantSystems[0].id)
        setCurrentSystem(relevantSystems[0].id)
      }
    } else {
      // Only create if we're sure there are no systems (fetch completed with empty result)
      console.log('[UI] No systems found after fetch - creating one automatically...')
      handleCreateSystem()
    }
  }, [systems, projectId, personalCalcId, currentSystemId, isLoading, isSaving, lastFetchedProjectId, lastFetchedPersonalCalcId])
  
  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])
  
  // Switch modes WITHOUT deleting anything - systems must persist
  const handleModeChange = useCallback((newMode: CalculationMode) => {
    // Simply change the view mode - don't delete any data
    // Single/Mixing modes are for quick calculations (not saved)
    // Process mode shows saved systems
    setMode(newMode)
  }, [])
  
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
  
  // Handle creating a new system
  const handleCreateNewSystem = async () => {
    // Generate a default name based on existing systems
    const existingCount = contextSystems.length
    const defaultName = `System ${existingCount + 1}`
    
    // Get altitude from project location if available
    const defaultAltitude = getDefaultAltitude()
    
    // Create new system with options object, inheriting project location data
    await createSystem({
      projectId: projectId || undefined,
      personalCalcId: projectId ? undefined : (personalCalcId || undefined),
      name: defaultName,
      altitudeFt: defaultAltitude,
    })
  }
  
  // Handle deleting the current system
  const handleDeleteCurrentSystem = async () => {
    if (!currentSystem || contextSystems.length <= 1) return
    
    if (confirm(`Are you sure you want to delete "${currentSystem.name}"? This will delete all points and processes.`)) {
      await deleteSystem(currentSystem.id)
    }
  }
  
  // Handle clearing all points from the current system
  const handleClearAllPoints = async () => {
    if (!currentSystem || systemPoints.length === 0) return
    
    if (confirm(`Clear all ${systemPoints.length} points from "${currentSystem.name}"?`)) {
      // Delete all points for this system
      for (const point of systemPoints) {
        await deletePoint(point.id)
      }
    }
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
    
    // Clear picking mode after placing
    setPickingPointLabel(null)
  }
  
  // Handle click on chart for picking mode (process builder)
  const handleChartClick = (coords: { dryBulbF: number; humidityRatioGrains: number }) => {
    if (pickingPointLabel) {
      handlePlacePoint(pickingPointLabel, coords)
    }
  }
  
  // Handle dragging a point with physics constraints
  const handleDragPoint = useCallback((pointId: string, coords: { dryBulbF: number; humidityRatioGrains: number }) => {
    if (!currentSystem) return
    
    const point = allSystemPoints.find(p => p.id === pointId)
    if (!point) return
    
    const pressure = barometricPressureAtAltitude(currentSystem.altitudeFt)
    
    // Clamp humidity ratio to saturation (can't exceed 100% RH)
    const clampedW = clampToSaturation(coords.dryBulbF, coords.humidityRatioGrains, pressure)
    let finalCoords = { dryBulbF: coords.dryBulbF, humidityRatioGrains: clampedW }
    
    // Check if this point is a MIXED point of ANY mixing process
    const mixingProcessWithThisMixed = systemProcesses.find(p => 
      (p.processType === 'mixing' || p.processType === 'oa_ra_mixing') && 
      p.mixedPointId === pointId
    )
    
    // Also check for "Mixed" point in simple mixing mode (not part of a process)
    const isSimpleMixedPoint = point.pointLabel === 'Mixed' || point.pointLabel === 'MA'
    
    if (mixingProcessWithThisMixed) {
      // This is a mixed point in a process - constrain it to the line between the two source points
      let sourcePoint1Id: string | null = null
      let sourcePoint2Id: string | null = null
      
      if (mixingProcessWithThisMixed.processType === 'oa_ra_mixing') {
        sourcePoint1Id = mixingProcessWithThisMixed.oaPointId || null
        sourcePoint2Id = mixingProcessWithThisMixed.raPointId || null
      } else {
        // Standard mixing process uses pointAId and pointBId
        sourcePoint1Id = mixingProcessWithThisMixed.pointAId || mixingProcessWithThisMixed.startPointId
        sourcePoint2Id = mixingProcessWithThisMixed.pointBId || null
      }
      
      if (sourcePoint1Id && sourcePoint2Id) {
        const source1Result = calculatedPoints[sourcePoint1Id]
        const source2Result = calculatedPoints[sourcePoint2Id]
        
        if (source1Result && source2Result) {
          // Constrain to line between the two source points and get the ratio
          const constrained = closestPointOnLine(
            { dryBulbF: source1Result.dryBulbF, humidityRatioGrains: source1Result.humidityRatioGrains },
            { dryBulbF: source2Result.dryBulbF, humidityRatioGrains: source2Result.humidityRatioGrains },
            finalCoords
          )
          finalCoords = { dryBulbF: constrained.dryBulbF, humidityRatioGrains: constrained.humidityRatioGrains }
          
          // Update the process CFM values based on the new ratio (for OA/RA mixing)
          if (mixingProcessWithThisMixed.processType === 'oa_ra_mixing') {
            const totalCfm = mixingProcessWithThisMixed.cfm || currentSystem.systemCfm
            // closestPointOnLine returns ratio where:
            //   ratio = 0 means at source1 (OA point)
            //   ratio = 1 means at source2 (RA point)
            // So OA% = (1 - ratio): when at OA (ratio=0), OA%=100%; when at RA (ratio=1), OA%=0%
            const oaPercent = 1 - constrained.ratio
            const newOaCfm = Math.round(totalCfm * oaPercent)
            const newRaCfm = totalCfm - newOaCfm
            
            // Update process with new CFM values
            updateProcess(mixingProcessWithThisMixed.id, {
              oaCfm: newOaCfm,
              raCfm: newRaCfm,
            })
          }
        }
      }
    } else if (isSimpleMixedPoint) {
      // Simple mixing mode - "Mixed" point constrained to A-B line
      const pointA = allSystemPoints.find(p => p.pointLabel === 'A')
      const pointB = allSystemPoints.find(p => p.pointLabel === 'B')
      
      // For MA, look for OA and RA
      const oaPoint = allSystemPoints.find(p => p.pointLabel === 'OA')
      const raPoint = allSystemPoints.find(p => p.pointLabel === 'RA')
      
      let source1 = pointA ? calculatedPoints[pointA.id] : (oaPoint ? calculatedPoints[oaPoint.id] : null)
      let source2 = pointB ? calculatedPoints[pointB.id] : (raPoint ? calculatedPoints[raPoint.id] : null)
      
      if (source1 && source2) {
        const constrained = closestPointOnLine(
          { dryBulbF: source1.dryBulbF, humidityRatioGrains: source1.humidityRatioGrains },
          { dryBulbF: source2.dryBulbF, humidityRatioGrains: source2.humidityRatioGrains },
          finalCoords
        )
        finalCoords = { dryBulbF: constrained.dryBulbF, humidityRatioGrains: constrained.humidityRatioGrains }
      }
    }
    
    // Update the point
    updatePoint(pointId, {
      dryBulbF: finalCoords.dryBulbF,
      humidityRatioGrains: finalCoords.humidityRatioGrains,
      inputMode: 'db_w',
    })
    
    // Check if this point is a SOURCE for any mixing process - if so, update the mixed point
    const mixingProcessesUsingThisAsSource = systemProcesses.filter(p => {
      if (p.processType === 'oa_ra_mixing') {
        return p.oaPointId === pointId || p.raPointId === pointId
      } else if (p.processType === 'mixing') {
        return p.pointAId === pointId || p.pointBId === pointId || p.startPointId === pointId
      }
      return false
    })
    
    for (const mixingProcess of mixingProcessesUsingThisAsSource) {
      if (!mixingProcess.mixedPointId) continue
      
      let source1Id: string | null = null
      let source2Id: string | null = null
      let ratio = 0.5 // Default 50/50 mix
      
      if (mixingProcess.processType === 'oa_ra_mixing') {
        source1Id = mixingProcess.oaPointId || null
        source2Id = mixingProcess.raPointId || null
        if (mixingProcess.oaCfm && mixingProcess.raCfm) {
          ratio = mixingProcess.oaCfm / (mixingProcess.oaCfm + mixingProcess.raCfm)
        }
      } else {
        source1Id = mixingProcess.pointAId || mixingProcess.startPointId
        source2Id = mixingProcess.pointBId || null
        // For standard mixing, check if there's a cfmA/cfmB or use 50/50
      }
      
      if (source1Id && source2Id) {
        // Get source coordinates (use finalCoords if this is the point being dragged)
        const source1Db = source1Id === pointId ? finalCoords.dryBulbF : calculatedPoints[source1Id]?.dryBulbF
        const source1W = source1Id === pointId ? finalCoords.humidityRatioGrains : calculatedPoints[source1Id]?.humidityRatioGrains
        const source2Db = source2Id === pointId ? finalCoords.dryBulbF : calculatedPoints[source2Id]?.dryBulbF
        const source2W = source2Id === pointId ? finalCoords.humidityRatioGrains : calculatedPoints[source2Id]?.humidityRatioGrains
        
        if (source1Db !== undefined && source1W !== undefined && source2Db !== undefined && source2W !== undefined) {
          // Calculate new mixed point based on ratio
          const newMixedDb = source1Db * ratio + source2Db * (1 - ratio)
          const newMixedW = source1W * ratio + source2W * (1 - ratio)
          
          updatePoint(mixingProcess.mixedPointId, {
            dryBulbF: newMixedDb,
            humidityRatioGrains: newMixedW,
            inputMode: 'db_w',
          })
        }
      }
    }
    
    // Also handle simple mixing mode (A, B -> Mixed) when not part of a process
    if (point.pointLabel === 'A' || point.pointLabel === 'B') {
      const mixedPoint = allSystemPoints.find(p => p.pointLabel === 'Mixed')
      if (mixedPoint) {
        const pointA = allSystemPoints.find(p => p.pointLabel === 'A')
        const pointB = allSystemPoints.find(p => p.pointLabel === 'B')
        
        if (pointA && pointB) {
          const aDb = pointA.id === pointId ? finalCoords.dryBulbF : calculatedPoints[pointA.id]?.dryBulbF
          const aW = pointA.id === pointId ? finalCoords.humidityRatioGrains : calculatedPoints[pointA.id]?.humidityRatioGrains
          const bDb = pointB.id === pointId ? finalCoords.dryBulbF : calculatedPoints[pointB.id]?.dryBulbF
          const bW = pointB.id === pointId ? finalCoords.humidityRatioGrains : calculatedPoints[pointB.id]?.humidityRatioGrains
          
          if (aDb !== undefined && aW !== undefined && bDb !== undefined && bW !== undefined) {
            // Use CFM ratio if available, otherwise 50/50
            const cfmA = pointA.cfm || 100
            const cfmB = pointB.cfm || 100
            const ratio = cfmA / (cfmA + cfmB)
            
            const newMixedDb = aDb * ratio + bDb * (1 - ratio)
            const newMixedW = aW * ratio + bW * (1 - ratio)
            
            updatePoint(mixedPoint.id, {
              dryBulbF: newMixedDb,
              humidityRatioGrains: newMixedW,
              inputMode: 'db_w',
            })
          }
        }
      }
    }
    
    // Handle OA/RA -> MA in simple mode
    if (point.pointLabel === 'OA' || point.pointLabel === 'RA') {
      const maPoint = allSystemPoints.find(p => p.pointLabel === 'MA')
      if (maPoint) {
        const oaPoint = allSystemPoints.find(p => p.pointLabel === 'OA')
        const raPoint = allSystemPoints.find(p => p.pointLabel === 'RA')
        
        if (oaPoint && raPoint) {
          const oaDb = oaPoint.id === pointId ? finalCoords.dryBulbF : calculatedPoints[oaPoint.id]?.dryBulbF
          const oaW = oaPoint.id === pointId ? finalCoords.humidityRatioGrains : calculatedPoints[oaPoint.id]?.humidityRatioGrains
          const raDb = raPoint.id === pointId ? finalCoords.dryBulbF : calculatedPoints[raPoint.id]?.dryBulbF
          const raW = raPoint.id === pointId ? finalCoords.humidityRatioGrains : calculatedPoints[raPoint.id]?.humidityRatioGrains
          
          if (oaDb !== undefined && oaW !== undefined && raDb !== undefined && raW !== undefined) {
            const cfmOa = oaPoint.cfm || 100
            const cfmRa = raPoint.cfm || 100
            const ratio = cfmOa / (cfmOa + cfmRa)
            
            const newMaDb = oaDb * ratio + raDb * (1 - ratio)
            const newMaW = oaW * ratio + raW * (1 - ratio)
            
            updatePoint(maPoint.id, {
              dryBulbF: newMaDb,
              humidityRatioGrains: newMaW,
              inputMode: 'db_w',
            })
          }
        }
      }
    }
  }, [currentSystem, allSystemPoints, calculatedPoints, systemProcesses, updatePoint, updateProcess])
  
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
          <div className="flex items-center gap-3">
            {/* System Selector Dropdown */}
            {contextSystems.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 uppercase">System:</span>
                <select
                  value={currentSystemId || ''}
                  onChange={(e) => handleSystemChange(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm font-medium"
                >
                  {contextSystems.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* System Name Editor */}
            {currentSystem && (
              <div className="flex items-center gap-2 border-l border-gray-600 pl-3">
                {isEditingName ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                    autoFocus
                    className="bg-gray-800 border-2 border-cyan-500 rounded px-2 py-1 text-sm font-medium w-48"
                    placeholder="Enter system name (e.g., AHU-1)"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-cyan-400">
                      🌡️ {currentSystem.name}
                    </h2>
                    <button
                      onClick={handleNameDoubleClick}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      title="Rename this system"
                    >
                      ✏️ Rename
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* New System Button */}
            <button
              onClick={handleCreateNewSystem}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium transition-colors flex items-center gap-1"
              title="Create a new system (e.g., AHU-2, AC-03)"
            >
              ➕ New System
            </button>
            
            {/* Delete System Button */}
            {currentSystem && contextSystems.length > 1 && (
              <button
                onClick={handleDeleteCurrentSystem}
                className="px-2 py-1.5 bg-red-700 hover:bg-red-600 rounded text-sm transition-colors"
                title="Delete this system"
              >
                🗑️
              </button>
            )}
            
            {/* Clear All Points Button */}
            {systemPoints.length > 0 && (
              <button
                onClick={handleClearAllPoints}
                className="px-2 py-1.5 bg-orange-600 hover:bg-orange-500 rounded text-sm transition-colors"
                title="Clear all points from this system"
              >
                🧹 Clear Points
              </button>
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
                mode={mode}
                nextProcessPointLabel={nextProcessPointLabel}
                isFirstProcess={isFirstProcess}
                pickingPointLabel={pickingPointLabel}
                onPlacePoint={handlePlacePoint}
                onDragPoint={handleDragPoint}
                onDeletePoint={deletePoint}
                onStartProcess={handleStartProcess}
                onChartClick={handleChartClick}
              />
            </div>
            
            {/* Right Panel */}
            <div className="w-96 border-l border-gray-700 flex flex-col overflow-hidden">
              {/* Input Panel */}
              <div className="flex-1 overflow-auto p-4">
                {/* Process mode: Show ProcessBuilder FIRST (with type selector at top) */}
                {mode === 'process' ? (
                  <ProcessBuilder
                    systemId={currentSystem.id}
                    system={currentSystem}
                    points={systemPoints}
                    processes={systemProcesses}
                    calculatedPoints={calculatedPoints}
                    projectLocationId={projectLocationId}
                    pickingPointLabel={pickingPointLabel}
                    editingProcessId={editingProcessId}
                    onEditProcess={setEditingProcessId}
                    onSetPointOnChart={(label) => {
                      // Toggle picking mode - if same label, cancel; otherwise start picking
                      setPickingPointLabel(prev => prev === label ? null : label)
                    }}
                  />
                ) : (
                  /* Single/Mixing mode: Show standard input panel */
                  <PsychrometricInputPanel
                    systemId={currentSystem.id}
                    mode={mode}
                    points={systemPoints}
                    calculatedPoints={calculatedPoints}
                    barometricPressure={barometricPressureAtAltitude(currentSystem.altitudeFt)}
                  />
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
                onEditProcess={setEditingProcessId}
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
        <div 
          onClick={clearError}
          className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg cursor-pointer hover:bg-red-800/90 flex items-center justify-between"
        >
          <span>{error}</span>
          <span className="text-red-400 text-xs">Click to dismiss</span>
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
