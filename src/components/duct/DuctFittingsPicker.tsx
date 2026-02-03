// =========================================== 
// DUCT FITTINGS PICKER
// Modal for selecting fittings with visual cards
// =========================================== 

import { useState } from 'react'
import { X, Search } from 'lucide-react'
import {
  DUCT_FITTING_CATEGORIES,
  DUCT_ELBOWS,
  DUCT_TRANSITIONS,
  DUCT_TEES,
  DUCT_WYES,
  DUCT_DAMPERS,
  DUCT_TERMINALS,
  DUCT_EQUIPMENT,
} from '../../data/ductFittingsLibrary'
import type { DuctFittingCategory, DuctFittingData } from '../../types/duct'

interface DuctFittingsPickerProps {
  onSelect: (fittingType: string) => void
  onClose: () => void
}

const FITTINGS_BY_CATEGORY: Record<DuctFittingCategory, DuctFittingData[]> = {
  elbow: DUCT_ELBOWS,
  transition: DUCT_TRANSITIONS,
  tee: DUCT_TEES,
  wye: DUCT_WYES,
  damper: DUCT_DAMPERS,
  terminal: DUCT_TERMINALS,
  equipment: DUCT_EQUIPMENT,
}

export function DuctFittingsPicker({ onSelect, onClose }: DuctFittingsPickerProps) {
  const [activeCategory, setActiveCategory] = useState<DuctFittingCategory>('elbow')
  const [searchTerm, setSearchTerm] = useState('')
  
  const fittings = FITTINGS_BY_CATEGORY[activeCategory] || []
  
  const filteredFittings = searchTerm
    ? fittings.filter(f =>
        f.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : fittings
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-[900px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Select Duct Fitting</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Category Tabs */}
        <div className="border-b border-gray-700 px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {DUCT_FITTING_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fittings..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        
        {/* Fittings Grid */}
        <div className="flex-1 overflow-auto p-4">
          {filteredFittings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No fittings found
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredFittings.map(fitting => (
                <FittingCard
                  key={fitting.id}
                  fitting={fitting}
                  onSelect={() => onSelect(fitting.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =========================================== 
// FITTING CARD COMPONENT
// =========================================== 
interface FittingCardProps {
  fitting: DuctFittingData
  onSelect: () => void
}

function FittingCard({ fitting, onSelect }: FittingCardProps) {
  return (
    <button
      onClick={onSelect}
      className="text-left p-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500 rounded-lg transition-all group"
    >
      <div className="flex gap-3">
        {/* SVG Icon */}
        <div className="w-16 h-16 flex-shrink-0 bg-gray-800 rounded flex items-center justify-center">
          {fitting.svgPath ? (
            <svg
              viewBox="0 0 60 60"
              className="w-12 h-12 text-cyan-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={fitting.svgPath} />
            </svg>
          ) : (
            <div className="text-2xl opacity-50">
              {fitting.category === 'elbow' && '↪️'}
              {fitting.category === 'transition' && '◇'}
              {fitting.category === 'tee' && '⊥'}
              {fitting.category === 'wye' && '⋎'}
              {fitting.category === 'damper' && '▬'}
              {fitting.category === 'terminal' && '▤'}
              {fitting.category === 'equipment' && '⚙️'}
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
            {fitting.displayName}
          </h4>
          
          {/* C-coefficient or dP */}
          <div className="mt-1">
            {fitting.method === 'c_coefficient' && fitting.cCoefficient !== undefined && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                C = {fitting.cCoefficient}
              </span>
            )}
            {fitting.method === 'fixed_dp' && fitting.defaultDp !== undefined && (
              <span className="text-xs px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded">
                dP = {fitting.defaultDp}" WC
              </span>
            )}
          </div>
          
          {/* Notes */}
          {fitting.notes && (
            <p className="mt-1 text-xs text-gray-400 line-clamp-2">
              {fitting.notes}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
