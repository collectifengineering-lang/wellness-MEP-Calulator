// =========================================== 
// HYDRONIC CALCULATOR STANDALONE
// Standalone version with personal calculations workspace
// Lives in HVAC Calculators section
// =========================================== 

import { useState, useEffect, useRef } from 'react'
import { 
  Droplets, 
  CheckCircle, 
  Loader2, 
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Link,
  X
} from 'lucide-react'
import { HydronicCalculatorCore } from '../../hydronic/HydronicCalculatorCore'
import { useHydronicStore } from '../../../store/useHydronicStore'
import { usePersonalCalcsStore } from '../../../store/usePersonalCalcsStore'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'

interface HVACProject {
  id: string
  name: string
}

export function HydronicCalculatorStandalone() {
  const { 
    fetchSystemsForPersonalCalc, 
    moveSystemsToProject,
    systems,
  } = useHydronicStore()
  
  const {
    calculations,
    currentCalcId,
    isLoading: calcsLoading,
    fetchUserCalculations,
    createCalculation,
    renameCalculation,
    deleteCalculation,
    setCurrentCalc,
    getCurrentCalc,
  } = usePersonalCalcsStore()
  
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNewCalcModal, setShowNewCalcModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [newCalcName, setNewCalcName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [moveSuccess, setMoveSuccess] = useState<string | null>(null)
  const [hvacProjects, setHvacProjects] = useState<HVACProject[]>([])
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const currentCalc = getCurrentCalc()
  
  // Fetch personal calculations on mount
  useEffect(() => {
    fetchUserCalculations('hydronic')
  }, [fetchUserCalculations])
  
  // Fetch HVAC projects for linking
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase
        .from('hvac_projects')
        .select('id, name')
        .order('name', { ascending: true })
        .then(({ data }) => {
          if (data) setHvacProjects(data as HVACProject[])
        })
    }
  }, [])
  
  // Fetch systems when current calc changes
  useEffect(() => {
    if (currentCalcId) {
      fetchSystemsForPersonalCalc(currentCalcId)
    }
  }, [currentCalcId, fetchSystemsForPersonalCalc])
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleCreateCalc = async () => {
    if (!newCalcName.trim()) return
    setIsCreating(true)
    try {
      const calc = await createCalculation(newCalcName.trim(), 'hydronic')
      setCurrentCalc(calc.id)
      setShowNewCalcModal(false)
      setNewCalcName('')
    } catch (error) {
      console.error('Failed to create calculation:', error)
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleRename = async () => {
    if (!currentCalcId || !renameValue.trim()) return
    await renameCalculation(currentCalcId, renameValue.trim())
    setShowRenameModal(false)
  }
  
  const handleDelete = async () => {
    if (!currentCalcId) return
    await deleteCalculation(currentCalcId)
    setShowDeleteConfirm(false)
  }
  
  const handleMoveToProject = async (projectId: string) => {
    if (!currentCalcId) return
    setIsMoving(true)
    
    const project = hvacProjects.find(p => p.id === projectId)
    
    try {
      // Move all systems to the project
      await moveSystemsToProject(currentCalcId, projectId)
      
      // Delete the personal calculation (systems are now in project)
      await deleteCalculation(currentCalcId)
      
      setShowProjectSelector(false)
      setMoveSuccess(project?.name || 'Project')
      setTimeout(() => setMoveSuccess(null), 3000)
      
      // Refresh calculations list
      await fetchUserCalculations('hydronic')
    } catch (error) {
      console.error('Failed to move to project:', error)
    } finally {
      setIsMoving(false)
    }
  }
  
  const openRenameModal = () => {
    if (currentCalc) {
      setRenameValue(currentCalc.name)
      setShowRenameModal(true)
    }
  }
  
  // Get systems count for current calculation
  const systemsForCurrentCalc = systems.filter(s => s.personalCalcId === currentCalcId)
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header with Personal Calculations Dropdown */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Droplets className="w-6 h-6 text-blue-400" />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Hydronic Pump Calculator</h1>
              <p className="text-sm text-gray-400">
                Personal calculations workspace
              </p>
            </div>
          </div>
          
          {/* Personal Calculations Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">My Calculations:</span>
            
            {/* Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors min-w-[200px]"
              >
                <span className="flex-1 text-left text-white truncate">
                  {calcsLoading ? 'Loading...' : currentCalc?.name || 'Select calculation'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-gray-700 rounded-lg shadow-xl border border-gray-600 z-20 overflow-hidden">
                  {calculations.length === 0 ? (
                    <div className="p-3 text-sm text-gray-400 text-center">
                      No saved calculations
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-auto">
                      {calculations.map(calc => (
                        <button
                          key={calc.id}
                          onClick={() => {
                            setCurrentCalc(calc.id)
                            setShowDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            calc.id === currentCalcId
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-200 hover:bg-gray-600'
                          }`}
                        >
                          {calc.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-600 p-2">
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        setShowNewCalcModal(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-gray-600 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New Calculation
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <button
              onClick={() => setShowNewCalcModal(true)}
              className="p-1.5 text-blue-400 hover:bg-gray-700 rounded transition-colors"
              title="New Calculation"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            {currentCalc && (
              <>
                <button
                  onClick={openRenameModal}
                  className="p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white rounded transition-colors"
                  title="Rename"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 text-gray-400 hover:bg-gray-700 hover:text-red-400 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Warning Banner */}
        {currentCalc && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between gap-4 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Not linked to any project</span>
              </div>
              <button
                onClick={() => setShowProjectSelector(true)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
              >
                <Link className="w-3.5 h-3.5" />
                Link to Project
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Calculator Content */}
      <div className="flex-1 overflow-hidden">
        {currentCalc ? (
          <HydronicCalculatorCore
            personalCalcId={currentCalcId}
            standalone={true}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 p-8">
            <div className="text-center">
              <Droplets className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No calculation selected</p>
              <p className="text-sm text-gray-600 mb-4">
                Create a new calculation to get started
              </p>
              <button
                onClick={() => setShowNewCalcModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                New Calculation
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* New Calculation Modal */}
      {showNewCalcModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-96 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">New Calculation</h3>
              <button
                onClick={() => setShowNewCalcModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">Calculation Name</label>
              <input
                type="text"
                value={newCalcName}
                onChange={(e) => setNewCalcName(e.target.value)}
                placeholder="e.g., Office Building Study"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCalc()}
              />
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowNewCalcModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCalc}
                disabled={!newCalcName.trim() || isCreating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-96 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Rename Calculation</h3>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!renameValue.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-96 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Delete Calculation</h3>
            </div>
            <div className="p-4">
              <p className="text-gray-300">
                Are you sure you want to delete "<span className="text-white font-medium">{currentCalc?.name}</span>"?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will delete all {systemsForCurrentCalc.length} hydronic system(s) in this calculation.
              </p>
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Link to Project Modal */}
      {showProjectSelector && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-[450px] overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Link to HVAC Project</h3>
              <p className="text-sm text-gray-400 mt-1">
                Move all systems from "{currentCalc?.name}" to a project. The calculation will appear in the project's Calculators tab.
              </p>
            </div>
            
            <div className="max-h-80 overflow-auto p-2">
              {isMoving ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Moving to project...
                </div>
              ) : hvacProjects.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No HVAC projects available</p>
              ) : (
                <div className="space-y-1">
                  {hvacProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleMoveToProject(project.id)}
                      className="w-full text-left px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-white">{project.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setShowProjectSelector(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Toast */}
      {moveSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg flex items-center gap-2 shadow-xl z-50">
          <CheckCircle className="w-5 h-5" />
          Moved to "{moveSuccess}" successfully
        </div>
      )}
    </div>
  )
}
