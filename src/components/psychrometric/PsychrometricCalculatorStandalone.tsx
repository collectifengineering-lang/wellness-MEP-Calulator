/**
 * Psychrometric Calculator Standalone
 * Wrapper for standalone use with personal calculation workflow
 */

import { useState, useEffect, useMemo } from 'react'
import { usePersonalCalcsStore } from '../../store/usePersonalCalcsStore'
import { usePsychrometricStore } from '../../store/usePsychrometricStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import PsychrometricCalculatorCore from './PsychrometricCalculatorCore'

export default function PsychrometricCalculatorStandalone() {
  const {
    calculations,
    currentCalcId,
    fetchUserCalculations,
    createCalculation,
    renameCalculation,
    deleteCalculation,
    setCurrentCalc,
  } = usePersonalCalcsStore()
  
  const { moveSystemsToProject } = usePsychrometricStore()
  
  const [isCreating, setIsCreating] = useState(false)
  const [newCalcName, setNewCalcName] = useState('')
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  
  // Fetch personal calculations on mount
  useEffect(() => {
    fetchUserCalculations('psychrometric')
  }, [])
  
  // Get psychrometric calculations only
  const psychrometricCalcs = useMemo(() => {
    return calculations.filter(c => c.calcType === 'psychrometric')
  }, [calculations])
  
  // Current calculation
  const currentCalc = useMemo(() => {
    return psychrometricCalcs.find(c => c.id === currentCalcId)
  }, [psychrometricCalcs, currentCalcId])
  
  // Fetch projects for assignment
  useEffect(() => {
    async function fetchProjects() {
      if (!isSupabaseConfigured()) return
      
      const { data, error } = await supabase
        .from('hvac_projects')
        .select('id, name')
        .order('name', { ascending: true })
      
      if (!error && data) {
        setProjects(data as { id: string; name: string }[])
      }
    }
    fetchProjects()
  }, [])
  
  // Handle creating new calculation
  const handleCreateCalc = async () => {
    if (!newCalcName.trim()) return
    
    try {
      setIsCreating(true)
      await createCalculation(newCalcName.trim(), 'psychrometric')
      setNewCalcName('')
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create calculation:', error)
      setIsCreating(false)
    }
  }
  
  // Handle assigning to project
  const handleAssignToProject = async (projectId: string) => {
    if (!currentCalcId) return
    
    try {
      await moveSystemsToProject(currentCalcId, projectId)
      await deleteCalculation(currentCalcId)
      setShowProjectPicker(false)
      // Refresh personal calcs list
      fetchUserCalculations('psychrometric')
    } catch (error) {
      console.error('Failed to assign to project:', error)
    }
  }
  
  // Handle name editing
  const handleNameDoubleClick = () => {
    if (currentCalc) {
      setEditName(currentCalc.name)
      setIsEditingName(true)
    }
  }
  
  const handleNameSave = async () => {
    if (currentCalcId && editName.trim()) {
      await renameCalculation(currentCalcId, editName.trim())
    }
    setIsEditingName(false)
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Personal Calculations Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Calculation Selector */}
            <div className="flex items-center gap-2">
              <select
                value={currentCalcId || ''}
                onChange={(e) => setCurrentCalc(e.target.value || null)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm min-w-48"
              >
                <option value="">Select calculation...</option>
                {psychrometricCalcs.map(calc => (
                  <option key={calc.id} value={calc.id}>{calc.name}</option>
                ))}
              </select>
              
              {currentCalc && (
                isEditingName ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                    autoFocus
                    className="bg-gray-700 border border-cyan-500 rounded px-2 py-1 text-sm w-48"
                  />
                ) : (
                  <button
                    onClick={handleNameDoubleClick}
                    className="text-sm text-surface-400 hover:text-white transition-colors"
                    title="Click to rename"
                  >
                    ✏️
                  </button>
                )
              )}
            </div>
            
            {/* Create New */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New calculation name..."
                value={newCalcName}
                onChange={(e) => setNewCalcName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCalc()}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm w-48"
              />
              <button
                onClick={handleCreateCalc}
                disabled={!newCalcName.trim() || isCreating}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
              >
                + New
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {currentCalc && (
              <>
                <button
                  onClick={() => setShowProjectPicker(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm transition-colors"
                >
                  📁 Assign to Project
                </button>
                <button
                  onClick={() => currentCalcId && deleteCalculation(currentCalcId)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
                >
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Link to Project Banner */}
        {currentCalc && (
          <div className="mt-3 flex items-center justify-between gap-4 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <span>⚠️</span>
              <span>Not linked to any project</span>
            </div>
            <button
              onClick={() => setShowProjectPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors"
            >
              🔗 Link to Project
            </button>
          </div>
        )}
      </div>
      
      {/* Calculator Content */}
      <div className="flex-1 overflow-hidden">
        {currentCalcId ? (
          <PsychrometricCalculatorCore
            personalCalcId={currentCalcId}
            standalone={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🌡️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Psychrometric Calculator</h3>
              <p className="text-surface-400 mb-4">
                {psychrometricCalcs.length > 0 
                  ? 'Select an existing calculation or create a new one'
                  : 'Create a new calculation to get started'
                }
              </p>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="text"
                  placeholder="Calculation name..."
                  value={newCalcName}
                  onChange={(e) => setNewCalcName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCalc()}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-64"
                />
                <button
                  onClick={handleCreateCalc}
                  disabled={!newCalcName.trim() || isCreating}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Project Picker Modal */}
      {showProjectPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Assign to Project</h3>
            
            {projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleAssignToProject(project.id)}
                    className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-white">{project.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-surface-400 text-center py-4">No projects found</p>
            )}
            
            <button
              onClick={() => setShowProjectPicker(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
