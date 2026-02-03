// =========================================== 
// HYDRONIC CALCULATOR CORE
// Shared component for project tab and standalone
// =========================================== 

import { useEffect, useState, useRef } from 'react'
import {
  Droplets,
  Plus,
  Trash2,
  Settings,
  AlertTriangle,
  Info,
  Pencil,
  Check,
} from 'lucide-react'
import { useHydronicStore } from '../../store/useHydronicStore'
import { AVAILABLE_GLYCOL_CONCENTRATIONS } from '../../data/fluidProperties'
import { PipeSectionBuilder } from './PipeSectionBuilder'
import { HydronicResults } from './HydronicResults'
import type { HydronicSystem } from '../../types/hydronic'

interface HydronicCalculatorCoreProps {
  projectId?: string | null
  personalCalcId?: string | null
  standalone?: boolean
}

export function HydronicCalculatorCore({
  projectId,
  personalCalcId,
}: HydronicCalculatorCoreProps) {
  const {
    systems,
    currentSystemId,
    calculationResults,
    isLoading,
    isSaving,
    error,
    createSystem,
    updateSystem,
    deleteSystem,
    setCurrentSystem,
    fetchSystemsForProject,
    fetchSystemsForPersonalCalc,
  } = useHydronicStore()
  
  const [showSettings, setShowSettings] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  
  // Fetch systems on mount based on context
  useEffect(() => {
    if (projectId) {
      fetchSystemsForProject(projectId)
    } else if (personalCalcId) {
      fetchSystemsForPersonalCalc(personalCalcId)
    }
  }, [projectId, personalCalcId, fetchSystemsForProject, fetchSystemsForPersonalCalc])
  
  // Filter systems for this context
  const relevantSystems = systems.filter(s => {
    if (projectId) return s.projectId === projectId
    if (personalCalcId) return s.personalCalcId === personalCalcId
    return false
  })
  
  const currentSystem = currentSystemId
    ? systems.find(s => s.id === currentSystemId)
    : relevantSystems[0]
  
  const currentResult = currentSystem
    ? calculationResults[currentSystem.id]
    : null
  
  // Auto-select first system
  useEffect(() => {
    if (!currentSystemId && relevantSystems.length > 0) {
      setCurrentSystem(relevantSystems[0].id)
    }
  }, [relevantSystems, currentSystemId, setCurrentSystem])
  
  const handleCreateSystem = async () => {
    const system = await createSystem({
      projectId: projectId || null,
      personalCalcId: personalCalcId || null,
      name: `System ${relevantSystems.length + 1}`,
    })
    setCurrentSystem(system.id)
  }
  
  const handleDeleteSystem = async () => {
    if (!currentSystem) return
    if (!confirm(`Delete "${currentSystem.name}"? This cannot be undone.`)) return
    await deleteSystem(currentSystem.id)
  }
  
  const handleSystemChange = (field: keyof HydronicSystem, value: any) => {
    if (!currentSystem) return
    updateSystem(currentSystem.id, { [field]: value })
  }
  
  const startEditingName = () => {
    if (currentSystem) {
      setEditName(currentSystem.name)
      setIsEditingName(true)
      setTimeout(() => nameInputRef.current?.focus(), 0)
    }
  }
  
  const saveEditedName = () => {
    if (currentSystem && editName.trim()) {
      handleSystemChange('name', editName.trim())
    }
    setIsEditingName(false)
  }
  
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEditedName()
    if (e.key === 'Escape') setIsEditingName(false)
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-400">Loading hydronic systems...</span>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800/50 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* System Selector */}
          <div className="flex items-center gap-3">
            <Droplets className="w-5 h-5 text-blue-400" />
            
            {relevantSystems.length > 1 && (
              <select
                value={currentSystem?.id || ''}
                onChange={(e) => setCurrentSystem(e.target.value || null)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {relevantSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            
            {/* Editable System Name */}
            {currentSystem && (
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleNameKeyDown}
                      onBlur={saveEditedName}
                      className="bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="System name"
                    />
                    <button
                      onClick={saveEditedName}
                      className="p-1 text-green-400 hover:text-green-300 transition-colors"
                      title="Save name"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {relevantSystems.length <= 1 && (
                      <span className="text-white font-medium">{currentSystem.name}</span>
                    )}
                    <button
                      onClick={startEditingName}
                      className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Rename system"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={handleCreateSystem}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New System
            </button>
            
            {currentSystem && (
              <button
                onClick={handleDeleteSystem}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                title="Delete system"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* System Type & Settings */}
          {currentSystem && (
            <div className="flex items-center gap-4">
              {/* System Type Toggle */}
              <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => handleSystemChange('systemType', 'closed')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    currentSystem.systemType === 'closed'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Closed Loop
                </button>
                <button
                  onClick={() => handleSystemChange('systemType', 'open')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    currentSystem.systemType === 'open'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Open Loop
                </button>
              </div>
              
              {/* Safety Factor */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Safety:</span>
                <input
                  type="number"
                  value={Math.round(currentSystem.safetyFactor * 100)}
                  onChange={(e) =>
                    handleSystemChange('safetyFactor', parseFloat(e.target.value) / 100 || 0)
                  }
                  min={0}
                  max={50}
                  step={5}
                  className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-center"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        
        {/* Settings Panel */}
        {currentSystem && showSettings && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* System Name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">System Name</label>
                <input
                  type="text"
                  value={currentSystem.name}
                  onChange={(e) => handleSystemChange('name', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                />
              </div>
              
              {/* Fluid Type */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fluid Type</label>
                <select
                  value={currentSystem.fluidType}
                  onChange={(e) => handleSystemChange('fluidType', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                >
                  <option value="water">Water</option>
                  <option value="propylene_glycol">Propylene Glycol</option>
                  <option value="ethylene_glycol">Ethylene Glycol</option>
                </select>
              </div>
              
              {/* Glycol Concentration */}
              {currentSystem.fluidType !== 'water' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Glycol Concentration</label>
                  <select
                    value={currentSystem.glycolConcentration}
                    onChange={(e) =>
                      handleSystemChange('glycolConcentration', parseInt(e.target.value))
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                  >
                    {AVAILABLE_GLYCOL_CONCENTRATIONS.filter(c => c > 0).map((c) => (
                      <option key={c} value={c}>
                        {c}%
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Fluid Temperature */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fluid Temperature</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={currentSystem.fluidTempF}
                    onChange={(e) =>
                      handleSystemChange('fluidTempF', parseFloat(e.target.value) || 60)
                    }
                    min={32}
                    max={220}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-gray-400">°F</span>
                </div>
              </div>
              
              {/* Static Head (Open systems only) */}
              {currentSystem.systemType === 'open' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Static Lift</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={currentSystem.staticHeadFt}
                      onChange={(e) =>
                        handleSystemChange('staticHeadFt', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-gray-400">ft</span>
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={currentSystem.notes || ''}
                  onChange={(e) => handleSystemChange('notes', e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            {/* Open Loop Info */}
            {currentSystem.systemType === 'open' && (
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 p-2 rounded">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Open loop systems (e.g., cooling towers) require static lift. This is the vertical
                  height difference that the pump must overcome. Unlike closed loops, gravity does
                  not cancel out in open systems.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {currentSystem ? (
          <>
            {/* Sections Builder */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <PipeSectionBuilder systemId={currentSystem.id} />
            </div>
            
            {/* Results Sidebar */}
            <div className="w-80 border-l border-gray-700 overflow-auto bg-gray-800/30">
              <HydronicResults
                system={currentSystem}
                result={currentResult}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Droplets className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-4">No hydronic systems</p>
              <button
                onClick={handleCreateSystem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Create First System
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Error Toast */}
      {error && (
        <div className="absolute bottom-4 right-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {/* Saving Indicator */}
      {isSaving && (
        <div className="absolute bottom-4 left-4 bg-gray-800 text-gray-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          Saving...
        </div>
      )}
    </div>
  )
}
