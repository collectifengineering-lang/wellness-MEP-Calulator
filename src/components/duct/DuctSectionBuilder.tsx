// =========================================== 
// DUCT SECTION BUILDER
// Visual path builder for duct sections
// =========================================== 

import { useState } from 'react'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Grip,
  Box,
  Circle,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { useDuctStore } from '../../store/useDuctStore'
import { DuctFittingsPicker } from './DuctFittingsPicker'
import { DUCT_MATERIALS, STANDARD_RECT_WIDTHS, STANDARD_RECT_HEIGHTS, STANDARD_ROUND_DIAMETERS } from '../../data/ductMaterials'
import { getDuctFitting } from '../../data/ductFittingsLibrary'
import type { DuctSection, DuctShape, DuctMaterial, DuctLiner, DuctSectionType } from '../../types/duct'

interface DuctSectionBuilderProps {
  systemId: string
}

export function DuctSectionBuilder({ systemId }: DuctSectionBuilderProps) {
  const { 
    sections, 
    calculationResults,
    addSection, 
    updateSection, 
    deleteSection,
    addFitting,
    deleteFitting,
  } = useDuctStore()
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showFittingsPicker, setShowFittingsPicker] = useState<string | null>(null)
  
  const systemSections = sections
    .filter(s => s.systemId === systemId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  
  const result = calculationResults[systemId]
  
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
  
  const getSectionResult = (sectionId: string) => {
    return result?.sections.find(s => s.sectionId === sectionId)
  }
  
  const handleAddSection = async (type: DuctSectionType) => {
    const section = await addSection(systemId, type)
    setExpandedSections(prev => new Set([...prev, section.id]))
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Add Section Buttons - Fixed Header */}
      <div className="flex-shrink-0 p-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Add:</span>
          <button
            onClick={() => handleAddSection('straight')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            <Box className="w-4 h-4 text-blue-400" />
            Straight Duct
          </button>
          <button
            onClick={() => handleAddSection('flex')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            <Circle className="w-4 h-4 text-orange-400" />
            Flex Duct
          </button>
          <button
            onClick={() => handleAddSection('equipment')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            Equipment
          </button>
        </div>
      </div>
      
      {/* Sections List - Scrollable */}
      <div className="flex-1 overflow-auto p-4">
        {systemSections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No duct sections yet</p>
            <p className="text-sm">Add sections to build your duct path</p>
          </div>
        ) : (
          <div className="space-y-2">
            {systemSections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                isExpanded={expandedSections.has(section.id)}
                result={getSectionResult(section.id)}
                onToggle={() => toggleExpanded(section.id)}
                onUpdate={(updates) => updateSection(section.id, updates)}
                onDelete={() => deleteSection(section.id)}
                onAddFitting={() => setShowFittingsPicker(section.id)}
                onDeleteFitting={deleteFitting}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Fittings Picker Modal */}
      {showFittingsPicker && (
        <DuctFittingsPicker
          onSelect={(fittingType) => {
            addFitting(showFittingsPicker, fittingType)
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
  section: DuctSection
  index: number
  isExpanded: boolean
  result?: { velocityFpm: number; totalSectionLossInWc: number; warnings: string[] }
  onToggle: () => void
  onUpdate: (updates: Partial<DuctSection>) => void
  onDelete: () => void
  onAddFitting: () => void
  onDeleteFitting: (fittingId: string) => void
}

function SectionCard({
  section,
  index,
  isExpanded,
  result,
  onToggle,
  onUpdate,
  onDelete,
  onAddFitting,
  onDeleteFitting,
}: SectionCardProps) {
  const hasWarnings = (result?.warnings?.length || 0) > 0
  
  const getSectionIcon = () => {
    switch (section.sectionType) {
      case 'flex': return <Circle className="w-4 h-4 text-orange-400" />
      case 'equipment': return <Zap className="w-4 h-4 text-yellow-400" />
      default: return <Box className="w-4 h-4 text-blue-400" />
    }
  }
  
  const getDimensionDisplay = () => {
    if (section.shape === 'round') {
      return `Ø${section.diameterIn}"`
    }
    return `${section.widthIn}" × ${section.heightIn}"`
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg border ${hasWarnings ? 'border-amber-600/50' : 'border-gray-700'}`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
        onClick={onToggle}
      >
        <Grip className="w-4 h-4 text-gray-500" />
        {getSectionIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">#{index + 1}</span>
            <span className="font-medium text-white truncate">{section.name}</span>
            {hasWarnings && (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{section.cfm} CFM</span>
            <span>{getDimensionDisplay()}</span>
            <span>{section.lengthFt} ft</span>
            {result && (
              <>
                <span className="text-cyan-400">{Math.round(result.velocityFpm)} fpm</span>
                <span className="text-green-400">{result.totalSectionLossInWc.toFixed(3)}" WC</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-700">
          {/* Section Properties */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {/* Name */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={section.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
              />
            </div>
            
            {/* CFM */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">CFM</label>
              <input
                type="number"
                value={section.cfm}
                onChange={(e) => onUpdate({ cfm: parseFloat(e.target.value) || 0 })}
                min={0}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
              />
            </div>
            
            {/* Length */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Length (ft)</label>
              <input
                type="number"
                value={section.lengthFt}
                onChange={(e) => onUpdate({ lengthFt: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.5}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
              />
            </div>
            
            {/* Shape */}
            {section.sectionType !== 'equipment' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Shape</label>
                <select
                  value={section.shape}
                  onChange={(e) => onUpdate({ shape: e.target.value as DuctShape })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                >
                  <option value="rectangular">Rectangular</option>
                  <option value="round">Round</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Dimensions */}
          {section.sectionType !== 'equipment' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {section.shape === 'round' ? (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Diameter (in)</label>
                  <select
                    value={section.diameterIn}
                    onChange={(e) => onUpdate({ diameterIn: parseFloat(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                  >
                    {STANDARD_ROUND_DIAMETERS.map(d => (
                      <option key={d} value={d}>{d}"</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Width (in)</label>
                    <select
                      value={section.widthIn}
                      onChange={(e) => onUpdate({ widthIn: parseFloat(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                    >
                      {STANDARD_RECT_WIDTHS.map(w => (
                        <option key={w} value={w}>{w}"</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Height (in)</label>
                    <select
                      value={section.heightIn}
                      onChange={(e) => onUpdate({ heightIn: parseFloat(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                    >
                      {STANDARD_RECT_HEIGHTS.map(h => (
                        <option key={h} value={h}>{h}"</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              
              {/* Material */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Material</label>
                <select
                  value={section.material}
                  onChange={(e) => onUpdate({ material: e.target.value as DuctMaterial })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                >
                  {Object.values(DUCT_MATERIALS).map(m => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
              </div>
              
              {/* Liner */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Liner</label>
                <select
                  value={section.liner}
                  onChange={(e) => onUpdate({ liner: e.target.value as DuctLiner })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                >
                  <option value="none">No Liner</option>
                  <option value="0.75">3/4" Liner</option>
                  <option value="1.0">1" Liner</option>
                </select>
              </div>
            </div>
          )}
          
          {/* Equipment Settings */}
          {section.sectionType === 'equipment' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Equipment Type</label>
                <select
                  value={section.equipmentType || ''}
                  onChange={(e) => onUpdate({ equipmentType: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="coil">Cooling/Heating Coil</option>
                  <option value="filter">Filter</option>
                  <option value="silencer">Silencer</option>
                  <option value="vav_box">VAV Box</option>
                  <option value="mixing_box">Mixing Box</option>
                  <option value="electric_heater">Electric Heater</option>
                  <option value="humidifier">Humidifier</option>
                  <option value="other">Other (Manual dP)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pressure Drop (in. WC)</label>
                <input
                  type="number"
                  value={section.fixedPressureDrop || ''}
                  onChange={(e) => onUpdate({ fixedPressureDrop: parseFloat(e.target.value) || undefined })}
                  step={0.01}
                  min={0}
                  placeholder="Enter dP"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          )}
          
          {/* Fittings */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">Fittings</h4>
              <button
                onClick={onAddFitting}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Fitting
              </button>
            </div>
            
            {section.fittings.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No fittings added</p>
            ) : (
              <div className="space-y-1">
                {section.fittings.map(fitting => {
                  const fittingData = getDuctFitting(fitting.fittingType)
                  return (
                    <div
                      key={fitting.id}
                      className="flex items-center justify-between px-2 py-1.5 bg-gray-700/50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">
                          {fitting.quantity}× {fittingData?.displayName || fitting.fittingType}
                        </span>
                        {fittingData?.cCoefficient && (
                          <span className="text-xs text-gray-500">
                            (C={fittingData.cCoefficient})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onDeleteFitting(fitting.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Warnings */}
          {hasWarnings && (
            <div className="mt-3 p-2 bg-amber-900/20 border border-amber-700/30 rounded">
              {result?.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
