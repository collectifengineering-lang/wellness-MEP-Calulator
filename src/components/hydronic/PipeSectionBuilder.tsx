// =========================================== 
// PIPE SECTION BUILDER
// Editable grid for pipe sections with inline fittings
// =========================================== 

import { useState } from 'react'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Wrench,
} from 'lucide-react'
import { useHydronicStore } from '../../store/useHydronicStore'
import { PIPE_MATERIALS, getAvailableSizes } from '../../data/pipeData'
import { getFitting } from '../../data/fittingsLibrary'
import { FittingsPicker } from './FittingsPicker'
import type { HydronicPipeSection, HydronicFitting, PipeMaterial } from '../../types/hydronic'

interface PipeSectionBuilderProps {
  systemId: string
}

export function PipeSectionBuilder({ systemId }: PipeSectionBuilderProps) {
  const {
    getSectionsForSystem,
    calculationResults,
    addSection,
    updateSection,
    deleteSection,
    addFitting,
    updateFitting,
    deleteFitting,
  } = useHydronicStore()
  
  const sections = getSectionsForSystem(systemId)
  const result = calculationResults[systemId]
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showFittingsPicker, setShowFittingsPicker] = useState<string | null>(null)
  
  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }
  
  const handleAddSection = async () => {
    const section = await addSection(systemId)
    setExpandedSections(prev => new Set(prev).add(section.id))
  }
  
  const getSectionResult = (sectionId: string) => {
    return result?.sections.find(s => s.sectionId === sectionId)
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Pipe Sections</h2>
          <button
            onClick={handleAddSection}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>
      </div>
      
      {/* Sections List - Scrollable */}
      <div className="flex-1 overflow-auto p-4">
        {sections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No pipe sections yet.</p>
            <button
              onClick={handleAddSection}
              className="mt-2 text-blue-400 hover:text-blue-300"
            >
              Add your first section
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                sectionResult={getSectionResult(section.id)}
                isExpanded={expandedSections.has(section.id)}
                onToggleExpand={() => toggleExpanded(section.id)}
                onUpdate={(updates) => updateSection(section.id, updates)}
                onDelete={() => deleteSection(section.id)}
                onUpdateFitting={updateFitting}
                onDeleteFitting={deleteFitting}
                onShowFittingsPicker={() => setShowFittingsPicker(section.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Fittings Picker Modal */}
      {showFittingsPicker && (
        <FittingsPicker
          onSelect={(type, qty) => {
            addFitting(showFittingsPicker, type, qty)
            setShowFittingsPicker(null)
          }}
          onClose={() => setShowFittingsPicker(null)}
        />
      )}
    </div>
  )
}

// =========================================== 
// SECTION CARD COMPONENT
// =========================================== 
interface SectionCardProps {
  section: HydronicPipeSection
  sectionResult?: {
    velocityFps: number
    reynoldsNumber: number
    pipeFrictionLossFt: number
    fittingsLossFt: number
    totalSectionLossFt: number
    volumeGal: number
    warnings: string[]
  }
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<HydronicPipeSection>) => void
  onDelete: () => void
  onUpdateFitting: (id: string, updates: Partial<HydronicFitting>) => void
  onDeleteFitting: (id: string) => void
  onShowFittingsPicker: () => void
}

function SectionCard({
  section,
  sectionResult,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onUpdateFitting,
  onDeleteFitting,
  onShowFittingsPicker,
}: SectionCardProps) {
  const availableSizes = getAvailableSizes(section.pipeMaterial)
  const hasWarnings = sectionResult && sectionResult.warnings.length > 0
  
  return (
    <div className={`bg-gray-800 rounded-lg border ${
      hasWarnings ? 'border-amber-600/50' : 'border-gray-700'
    } overflow-hidden`}>
      {/* Section Header */}
      <div className="p-3 flex items-center gap-3">
        <button
          onClick={onToggleExpand}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {/* Section Name */}
        <input
          type="text"
          value={section.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none px-1 py-0.5 text-sm font-medium"
        />
        
        {/* Quick Stats */}
        {sectionResult && (
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span title="Head Loss">
              <span className="text-blue-400">{sectionResult.totalSectionLossFt.toFixed(1)}</span> ft
            </span>
            <span title="Velocity">
              <span className={sectionResult.velocityFps > 8 ? 'text-amber-400' : 'text-green-400'}>
                {sectionResult.velocityFps.toFixed(1)}
              </span> fps
            </span>
          </div>
        )}
        
        {hasWarnings && (
          <AlertCircle className="w-4 h-4 text-amber-400" />
        )}
        
        <button
          onClick={onDelete}
          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
          title="Delete section"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Collapsed Row - Core Inputs */}
      <div className="px-3 pb-3 grid grid-cols-5 gap-2">
        {/* Flow */}
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Flow</label>
          <div className="flex items-center">
            <input
              type="number"
              value={section.flowGpm}
              onChange={(e) => onUpdate({ flowGpm: parseFloat(e.target.value) || 0 })}
              min={0}
              step={5}
              className="w-full bg-gray-700 border border-gray-600 rounded-l px-2 py-1.5 text-sm"
            />
            <span className="bg-gray-600 border border-gray-600 rounded-r px-2 py-1.5 text-xs text-gray-400">
              GPM
            </span>
          </div>
        </div>
        
        {/* Material */}
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Material</label>
          <select
            value={section.pipeMaterial}
            onChange={(e) => onUpdate({ pipeMaterial: e.target.value as PipeMaterial })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
          >
            {PIPE_MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
        
        {/* Size */}
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Size</label>
          <div className="flex items-center">
            <select
              value={section.pipeSizeNominal}
              onChange={(e) => onUpdate({ pipeSizeNominal: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-l px-2 py-1.5 text-sm"
            >
              {availableSizes.map((size) => (
                <option key={size} value={size}>
                  {size}"
                </option>
              ))}
            </select>
            <span className="bg-gray-600 border border-gray-600 rounded-r px-2 py-1.5 text-xs text-gray-400">
              in
            </span>
          </div>
        </div>
        
        {/* Length */}
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Length</label>
          <div className="flex items-center">
            <input
              type="number"
              value={section.lengthFt}
              onChange={(e) => onUpdate({ lengthFt: parseFloat(e.target.value) || 0 })}
              min={0}
              step={10}
              className="w-full bg-gray-700 border border-gray-600 rounded-l px-2 py-1.5 text-sm"
            />
            <span className="bg-gray-600 border border-gray-600 rounded-r px-2 py-1.5 text-xs text-gray-400">
              ft
            </span>
          </div>
        </div>
        
        {/* Add Fittings Button */}
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Fittings</label>
          <button
            onClick={onShowFittingsPicker}
            className="w-full flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded px-2 py-1.5 text-sm transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{section.fittings.length > 0 ? `${section.fittings.length}` : 'Add'}</span>
          </button>
        </div>
      </div>
      
      {/* Expanded Content - Fittings List */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-3 bg-gray-850">
          {/* Fittings */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">Fittings & Devices</span>
              <button
                onClick={onShowFittingsPicker}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + Add
              </button>
            </div>
            
            {section.fittings.length === 0 ? (
              <p className="text-xs text-gray-500">No fittings added</p>
            ) : (
              <div className="space-y-1">
                {section.fittings.map((fitting) => (
                  <FittingRow
                    key={fitting.id}
                    fitting={fitting}
                    onUpdate={(updates) => onUpdateFitting(fitting.id, updates)}
                    onDelete={() => onDeleteFitting(fitting.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-1">
              {sectionResult!.warnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 p-2 rounded"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Detailed Results */}
          {sectionResult && (
            <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Pipe Loss:</span>
                <span className="ml-1 text-gray-300">{sectionResult.pipeFrictionLossFt.toFixed(2)} ft</span>
              </div>
              <div>
                <span className="text-gray-500">Fittings:</span>
                <span className="ml-1 text-gray-300">{sectionResult.fittingsLossFt.toFixed(2)} ft</span>
              </div>
              <div>
                <span className="text-gray-500">Reynolds:</span>
                <span className="ml-1 text-gray-300">{Math.round(sectionResult.reynoldsNumber).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Volume:</span>
                <span className="ml-1 text-gray-300">{sectionResult.volumeGal.toFixed(1)} gal</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =========================================== 
// FITTING ROW COMPONENT
// =========================================== 
interface FittingRowProps {
  fitting: HydronicFitting
  onUpdate: (updates: Partial<HydronicFitting>) => void
  onDelete: () => void
}

function FittingRow({ fitting, onUpdate, onDelete }: FittingRowProps) {
  const fittingData = getFitting(fitting.fittingType)
  
  // Show Cv input for devices that use Cv method (not L/D method)
  const showCvInput = fittingData?.method === 'cv' && !fittingData?.requiresDpInput
  
  return (
    <div className="flex items-center gap-2 bg-gray-700/50 rounded px-2 py-1.5">
      <span className="flex-1 text-xs text-gray-300 truncate">
        {fittingData?.displayName || fitting.fittingType}
      </span>
      
      {/* Quantity */}
      <input
        type="number"
        value={fitting.quantity}
        onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
        min={1}
        className="w-12 bg-gray-600 border border-gray-500 rounded px-1.5 py-0.5 text-xs text-center"
      />
      
      {/* Cv value (for Cv-based devices) */}
      {showCvInput && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Cv:</span>
          <div className="relative">
            <input
              type="number"
              value={fitting.cvOverride || ''}
              onChange={(e) => onUpdate({ cvOverride: parseFloat(e.target.value) || undefined })}
              placeholder="Enter"
              className={`w-16 border rounded px-1.5 py-0.5 text-xs ${
                fitting.isDefaultCv
                  ? 'bg-amber-900/50 border-amber-600 text-amber-200'
                  : 'bg-gray-600 border-gray-500 text-white'
              }`}
              title={fitting.isDefaultCv ? 'Default value from table - verify against actual equipment' : ''}
            />
            {fitting.isDefaultCv && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" title="Default estimate" />
            )}
          </div>
        </div>
      )}
      
      {/* dP Override (for manual dP devices) */}
      {fittingData?.requiresDpInput && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">dP:</span>
          <input
            type="number"
            value={fitting.dpOverrideFt || ''}
            onChange={(e) => onUpdate({ dpOverrideFt: parseFloat(e.target.value) || undefined })}
            placeholder="ft"
            className="w-14 bg-gray-600 border border-gray-500 rounded px-1.5 py-0.5 text-xs"
          />
          <span className="text-xs text-gray-500">ft</span>
        </div>
      )}
      
      <button
        onClick={onDelete}
        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
