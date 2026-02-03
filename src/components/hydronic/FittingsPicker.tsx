// =========================================== 
// FITTINGS PICKER MODAL
// Comprehensive selection of fittings, valves, and devices
// =========================================== 

import { useState, useMemo } from 'react'
import {
  X,
  Search,
  Plus,
  CircleDot,
  Gauge,
  Box,
} from 'lucide-react'
import { FITTING_CATEGORIES, PIPE_FITTINGS, VALVES, HYDRONIC_DEVICES } from '../../data/fittingsLibrary'
import type { FittingData } from '../../types/hydronic'

interface FittingsPickerProps {
  onSelect: (fittingType: string, quantity: number) => void
  onClose: () => void
}

type CategoryId = 'fitting' | 'valve' | 'device'

export function FittingsPicker({ onSelect, onClose }: FittingsPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('fitting')
  const [quantity, setQuantity] = useState(1)
  const [selectedFitting, setSelectedFitting] = useState<FittingData | null>(null)
  
  // Filter fittings by search
  const filteredFittings = useMemo(() => {
    const categoryItems = 
      selectedCategory === 'fitting' ? PIPE_FITTINGS :
      selectedCategory === 'valve' ? VALVES :
      HYDRONIC_DEVICES
    
    if (!searchQuery.trim()) return categoryItems
    
    const query = searchQuery.toLowerCase()
    return categoryItems.filter(f =>
      f.displayName.toLowerCase().includes(query) ||
      f.id.toLowerCase().includes(query) ||
      (f.notes && f.notes.toLowerCase().includes(query))
    )
  }, [selectedCategory, searchQuery])
  
  const handleAdd = () => {
    if (selectedFitting) {
      onSelect(selectedFitting.id, quantity)
      setSelectedFitting(null)
      setQuantity(1)
    }
  }
  
  const handleQuickAdd = (fitting: FittingData) => {
    onSelect(fitting.id, 1)
  }
  
  const getCategoryIcon = (category: CategoryId) => {
    switch (category) {
      case 'fitting': return CircleDot
      case 'valve': return Gauge
      case 'device': return Box
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Add Fitting or Device</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search & Category Tabs */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fittings, valves, devices..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          {/* Category Tabs */}
          <div className="flex gap-2">
            {FITTING_CATEGORIES.map(({ id, displayName }) => {
              const Icon = getCategoryIcon(id as CategoryId)
              return (
                <button
                  key={id}
                  onClick={() => setSelectedCategory(id as CategoryId)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {displayName}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Fittings List */}
        <div className="flex-1 overflow-auto p-2">
          {filteredFittings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items match your search
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredFittings.map((fitting) => (
                <button
                  key={fitting.id}
                  onClick={() => {
                    if (fitting.requiresCvInput || fitting.requiresDpInput) {
                      setSelectedFitting(fitting)
                    } else {
                      handleQuickAdd(fitting)
                    }
                  }}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedFitting?.id === fitting.id
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {fitting.displayName}
                      </div>
                      {fitting.notes && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {fitting.notes}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {fitting.method === 'l_over_d' && fitting.lOverD && (
                          <span className="text-xs text-blue-400">
                            L/D: {fitting.lOverD}
                          </span>
                        )}
                        {fitting.method === 'cv' && !fitting.requiresCvInput && (
                          <span className="text-xs text-green-400">
                            Cv lookup
                          </span>
                        )}
                        {fitting.requiresCvInput && (
                          <span className="text-xs text-amber-400">
                            Requires Cv
                          </span>
                        )}
                        {fitting.requiresDpInput && (
                          <span className="text-xs text-purple-400">
                            Requires dP
                          </span>
                        )}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Item Panel */}
        {selectedFitting && (
          <div className="p-4 border-t border-gray-700 bg-gray-750">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-white">{selectedFitting.displayName}</div>
                <div className="text-xs text-gray-400">
                  {selectedFitting.requiresCvInput && 'You will need to enter the Cv value after adding'}
                  {selectedFitting.requiresDpInput && 'You will need to enter the pressure drop after adding'}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Qty:</span>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-center"
                  />
                </div>
                
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
