import { useState } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { getZoneCategories, getZoneTypesByCategory, getZoneColor, calculateFixturesFromSF } from '../../data/zoneDefaults'
import type { ZoneType } from '../../types'

interface AddZoneModalProps {
  onClose: () => void
}

export default function AddZoneModal({ onClose }: AddZoneModalProps) {
  const { addZone } = useProjectStore()
  const { customZoneTypes, getZoneDefaults } = useSettingsStore()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [squareFootage, setSquareFootage] = useState<number | ''>()

  // Include custom zone types in categories
  const baseCategories = getZoneCategories()
  const categories = customZoneTypes.length > 0 
    ? [...baseCategories, 'Custom'] 
    : baseCategories

  const handleAddZone = () => {
    if (!selectedType) return
    const sf = squareFootage || undefined
    addZone(selectedType as ZoneType, customName || undefined, sf)
    onClose()
  }

  const selectedDefaults = selectedType ? getZoneDefaults(selectedType) : null
  
  // Update SF field when zone type changes
  const handleSelectType = (type: string) => {
    setSelectedType(type)
    const defaults = getZoneDefaults(type)
    setSquareFootage(defaults.defaultSF || 1000)
  }
  
  // Get zone types for a category, including custom types
  const getTypesForCategory = (category: string): string[] => {
    if (category === 'Custom') {
      return customZoneTypes
    }
    return getZoneTypesByCategory(category)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-surface-800 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <h2 className="text-xl font-semibold text-white">Add Zone</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Category Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-surface-300 mb-3">Select Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category)
                    setSelectedType(null)
                  }}
                  className={`p-3 rounded-lg text-left transition-all ${
                    selectedCategory === category
                      ? 'bg-primary-600/20 border-primary-500 text-white'
                      : 'bg-surface-900 border-surface-600 text-surface-300 hover:border-surface-500'
                  } border`}
                >
                  <div className="font-medium text-sm">{category}</div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    {getZoneTypesByCategory(category).length} types
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Zone Type Selection */}
          {selectedCategory && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-surface-300 mb-3">Select Zone Type</label>
              <div className="grid grid-cols-2 gap-2">
                {getTypesForCategory(selectedCategory).map(type => {
                  const defaults = getZoneDefaults(type)
                  const color = selectedCategory === 'Custom' ? '#8b5cf6' : getZoneColor(type as ZoneType)
                  return (
                    <button
                      key={type}
                      onClick={() => handleSelectType(type)}
                      className={`p-4 rounded-lg text-left transition-all ${
                        selectedType === type
                          ? 'ring-2 ring-offset-2 ring-offset-surface-800'
                          : 'hover:bg-surface-700'
                      } bg-surface-900 border border-surface-600`}
                      style={{
                        borderColor: selectedType === type ? color : undefined,
                        // @ts-expect-error CSS custom property for ring color
                        '--tw-ring-color': selectedType === type ? color : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-white">{defaults.displayName}</span>
                      </div>
                      <div className="text-xs text-surface-400 mt-1">
                        Default: {defaults.defaultSF.toLocaleString()} SF
                        {defaults.switchable && ' • Switchable'}
                        {defaults.fixed_kw && ` • ${defaults.fixed_kw} kW fixed`}
                      </div>
                    </button>
                  )
                })}
              </div>
              {getTypesForCategory(selectedCategory).length === 0 && (
                <p className="text-surface-500 text-sm text-center py-4">
                  No zone types in this category. Create one in Settings.
                </p>
              )}
            </div>
          )}

          {/* Customize Zone */}
          {selectedType && selectedDefaults && (
            <div className="space-y-4 border-t border-surface-700 pt-6">
              <h3 className="text-sm font-medium text-surface-300">Zone Details</h3>
              
              {/* Square Footage - REQUIRED */}
              <div>
                <label className="text-xs text-surface-400 mb-1 block">
                  Square Footage <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={squareFootage}
                    onChange={(e) => setSquareFootage(e.target.value ? Number(e.target.value) : '')}
                    placeholder={String(selectedDefaults.defaultSF)}
                    className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white text-lg font-medium pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">SF</span>
                </div>
                {selectedDefaults.fixtures_per_sf && (
                  <p className="text-xs text-amber-400 mt-1">
                    💡 Fixtures will auto-calculate based on SF
                  </p>
                )}
              </div>
              
              {/* Custom Name */}
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Custom Name (Optional)</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={selectedDefaults.displayName}
                  className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                />
              </div>

              {/* Preview */}
              <div className="bg-surface-900 rounded-lg p-4">
                <h4 className="text-xs font-medium text-surface-400 mb-2">Zone Preview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-surface-400">Lighting:</span>
                    <span className="ml-2 text-white">{selectedDefaults.defaultRates.lighting_w_sf} W/SF</span>
                  </div>
                  <div>
                    <span className="text-surface-400">Receptacle:</span>
                    <span className="ml-2 text-white">{selectedDefaults.defaultRates.receptacle_va_sf} VA/SF</span>
                  </div>
                  <div>
                    <span className="text-surface-400">Cooling:</span>
                    <span className="ml-2 text-white">
                      {selectedDefaults.defaultRates.cooling_sf_ton > 0 
                        ? `${selectedDefaults.defaultRates.cooling_sf_ton} SF/Ton` 
                        : 'N/A'}
                    </span>
                  </div>
                  {selectedDefaults.fixed_kw && (
                    <div>
                      <span className="text-surface-400">Fixed Load:</span>
                      <span className="ml-2 text-white">{selectedDefaults.fixed_kw} kW</span>
                    </div>
                  )}
                  {selectedDefaults.gas_mbh && (
                    <div>
                      <span className="text-surface-400">Gas:</span>
                      <span className="ml-2 text-white">{selectedDefaults.gas_mbh} MBH</span>
                    </div>
                  )}
                </div>
                
                {/* Show calculated fixtures for restroom/locker zones */}
                {selectedDefaults.fixtures_per_sf && squareFootage && (
                  <div className="mt-4 pt-4 border-t border-surface-700">
                    <h4 className="text-xs font-medium text-amber-400 mb-2">
                      📊 Auto-Calculated Fixtures ({squareFootage.toLocaleString()} SF)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(() => {
                        const fixtures = calculateFixturesFromSF(selectedType as ZoneType, squareFootage)
                        return (
                          <>
                            {fixtures.wcs && fixtures.wcs > 0 && (
                              <div>
                                <span className="text-surface-400">WCs:</span>
                                <span className="ml-2 text-white font-medium">{fixtures.wcs}</span>
                              </div>
                            )}
                            {fixtures.lavs && fixtures.lavs > 0 && (
                              <div>
                                <span className="text-surface-400">Lavatories:</span>
                                <span className="ml-2 text-white font-medium">{fixtures.lavs}</span>
                              </div>
                            )}
                            {fixtures.showers && fixtures.showers > 0 && (
                              <div>
                                <span className="text-surface-400">Showers:</span>
                                <span className="ml-2 text-white font-medium">{fixtures.showers}</span>
                              </div>
                            )}
                            {fixtures.floorDrains && fixtures.floorDrains > 0 && (
                              <div>
                                <span className="text-surface-400">Floor Drains:</span>
                                <span className="ml-2 text-white font-medium">{fixtures.floorDrains}</span>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-surface-700 bg-surface-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleAddZone}
            disabled={!selectedType}
            className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white rounded-lg font-medium"
          >
            Add Zone
          </button>
        </div>
      </div>
    </div>
  )
}
