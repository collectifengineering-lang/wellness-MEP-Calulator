import { useState, useMemo } from 'react'
import { useHVACStore } from '../../store/useHVACStore'
import { 
  searchLocations, 
  getLocationById,
  formatLocationDisplay,
  formatDesignConditionsPreview,
  getUSStates,
  type ASHRAELocation 
} from '../../data/ashraeClimate'

export default function ProjectSettingsPanel() {
  const { currentProject, updateProjectSettings } = useHVACStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  
  const settings = currentProject?.settings
  
  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchLocations(searchQuery)
  }, [searchQuery])
  
  // Current location
  const currentLocation = settings?.locationId 
    ? getLocationById(settings.locationId) 
    : null
  
  // US States for quick selection
  const usStates = getUSStates()
  
  const handleSelectLocation = (loc: ASHRAELocation) => {
    updateProjectSettings({
      locationId: loc.id,
      customLocation: undefined,
    })
    setSearchQuery('')
    setShowDropdown(false)
  }
  
  const handleCustomLocation = () => {
    setShowCustomForm(true)
    setShowDropdown(false)
  }
  
  const handleSaveCustom = (custom: NonNullable<typeof settings>['customLocation']) => {
    updateProjectSettings({
      locationId: null,
      customLocation: custom,
    })
    setShowCustomForm(false)
  }
  
  if (!settings) return null
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Project Settings</h2>
        <p className="text-surface-400">Configure location and design conditions for ASHRAE 62.1 calculations</p>
      </div>
      
      {/* Location Selection */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📍 Project Location</h3>
        
        {/* Current Selection */}
        {(currentLocation || settings.customLocation) && (
          <div className="mb-4 p-4 bg-surface-900 rounded-lg border border-surface-600">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">
                  {settings.customLocation?.name || 
                   (currentLocation && formatLocationDisplay(currentLocation))}
                </div>
                {currentLocation && (
                  <div className="text-sm text-surface-400 mt-1">
                    {formatDesignConditionsPreview(currentLocation)}
                  </div>
                )}
                {settings.customLocation && (
                  <div className="text-sm text-surface-400 mt-1">
                    Summer: {settings.customLocation.cooling_04_db}°F DB / {settings.customLocation.cooling_04_mcwb}°F WB | 
                    Winter: {settings.customLocation.heating_99_db}°F
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  updateProjectSettings({ locationId: null, customLocation: undefined })
                }}
                className="text-surface-400 hover:text-red-400 transition-colors"
              >
                ✕ Clear
              </button>
            </div>
          </div>
        )}
        
        {/* Search Box */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search city, state, or country..."
            className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-cyan-500 focus:outline-none"
          />
          
          {/* Dropdown */}
          {showDropdown && (searchQuery || true) && (
            <div className="absolute z-20 mt-2 w-full bg-surface-800 border border-surface-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {/* Search Results */}
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-700 transition-colors"
                    >
                      <div className="text-white font-medium">{formatLocationDisplay(loc)}</div>
                      <div className="text-xs text-surface-400 mt-0.5">
                        {formatDesignConditionsPreview(loc)} | Elev: {loc.elevation_ft} ft
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="p-4 text-center text-surface-400">
                  No locations found for "{searchQuery}"
                </div>
              ) : (
                <div className="p-2">
                  {/* Quick Select by State */}
                  <div className="px-3 py-2 text-xs font-semibold text-surface-500 uppercase">
                    US States
                  </div>
                  <div className="grid grid-cols-4 gap-1 px-2 pb-2">
                    {usStates.slice(0, 12).map(state => (
                      <button
                        key={state}
                        onClick={() => setSearchQuery(state)}
                        className="px-2 py-1 text-xs text-surface-300 hover:bg-surface-700 rounded transition-colors"
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Custom Location Option */}
              <div className="border-t border-surface-700 p-2">
                <button
                  onClick={handleCustomLocation}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-700 transition-colors text-cyan-400"
                >
                  ✏️ Enter Custom Location...
                </button>
              </div>
              
              {/* Close */}
              <div className="border-t border-surface-700 p-2">
                <button
                  onClick={() => setShowDropdown(false)}
                  className="w-full text-center px-3 py-2 text-surface-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Custom Location Form */}
        {showCustomForm && (
          <CustomLocationForm 
            onSave={handleSaveCustom}
            onCancel={() => setShowCustomForm(false)}
            initial={settings.customLocation}
          />
        )}
      </div>
      
      {/* Design Conditions Display */}
      {(currentLocation || settings.customLocation) && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🌡️ Design Conditions</h3>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Cooling */}
            <div className="space-y-3">
              <div className="text-cyan-400 font-medium">❄️ Cooling Design</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-surface-700">
                  <span className="text-surface-400">Condition</span>
                  <select
                    value={settings.coolingDesignCondition}
                    onChange={(e) => updateProjectSettings({ 
                      coolingDesignCondition: e.target.value as '0.4%' | '1%' 
                    })}
                    className="bg-surface-900 border border-surface-600 rounded px-2 py-1 text-white"
                  >
                    <option value="0.4%">0.4% (more conservative)</option>
                    <option value="1%">1% (typical)</option>
                  </select>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-700">
                  <span className="text-surface-400">Outdoor Dry Bulb</span>
                  <span className="text-white font-medium">
                    {settings.coolingDesignCondition === '0.4%' 
                      ? (settings.customLocation?.cooling_04_db ?? currentLocation?.cooling_04_db)
                      : (settings.customLocation?.cooling_1_db ?? currentLocation?.cooling_1_db)
                    }°F
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-700">
                  <span className="text-surface-400">Mean Coincident WB</span>
                  <span className="text-white font-medium">
                    {settings.coolingDesignCondition === '0.4%'
                      ? (settings.customLocation?.cooling_04_mcwb ?? currentLocation?.cooling_04_mcwb)
                      : (settings.customLocation?.cooling_1_mcwb ?? currentLocation?.cooling_1_mcwb)
                    }°F
                  </span>
                </div>
              </div>
            </div>
            
            {/* Heating */}
            <div className="space-y-3">
              <div className="text-amber-400 font-medium">🔥 Heating Design</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-surface-700">
                  <span className="text-surface-400">Condition</span>
                  <select
                    value={settings.heatingDesignCondition}
                    onChange={(e) => updateProjectSettings({ 
                      heatingDesignCondition: e.target.value as '99%' | '99.6%' 
                    })}
                    className="bg-surface-900 border border-surface-600 rounded px-2 py-1 text-white"
                  >
                    <option value="99%">99% (typical)</option>
                    <option value="99.6%">99.6% (more conservative)</option>
                  </select>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-700">
                  <span className="text-surface-400">Outdoor Dry Bulb</span>
                  <span className="text-white font-medium">
                    {settings.heatingDesignCondition === '99%'
                      ? (settings.customLocation?.heating_99_db ?? currentLocation?.heating_99_db)
                      : (settings.customLocation?.heating_996_db ?? currentLocation?.heating_996_db)
                    }°F
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-700">
                  <span className="text-surface-400">Elevation</span>
                  <span className="text-white font-medium">
                    {settings.customLocation?.elevation_ft ?? currentLocation?.elevation_ft ?? 0} ft
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Indoor Design Conditions */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🏠 Indoor Design Conditions</h3>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Summer Indoor */}
          <div className="space-y-4">
            <div className="text-cyan-400 font-medium">❄️ Summer (Cooling)</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Dry Bulb (°F)</label>
                <input
                  type="number"
                  value={settings.summerIndoorDb}
                  onChange={(e) => updateProjectSettings({ summerIndoorDb: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Relative Humidity (%)</label>
                <input
                  type="number"
                  value={settings.summerIndoorRh}
                  onChange={(e) => updateProjectSettings({ summerIndoorRh: Number(e.target.value) })}
                  min={30}
                  max={70}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
          
          {/* Winter Indoor */}
          <div className="space-y-4">
            <div className="text-amber-400 font-medium">🔥 Winter (Heating)</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Dry Bulb (°F)</label>
                <input
                  type="number"
                  value={settings.winterIndoorDb}
                  onChange={(e) => updateProjectSettings({ winterIndoorDb: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Relative Humidity (%)</label>
                <input
                  type="number"
                  value={settings.winterIndoorRh}
                  onChange={(e) => updateProjectSettings({ winterIndoorRh: Number(e.target.value) })}
                  min={20}
                  max={50}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Altitude Correction */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">🏔️ Altitude Correction</h3>
            <p className="text-sm text-surface-400 mt-1">
              Automatically adjust air density calculations for locations above 2,000 ft
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.altitudeCorrection}
              onChange={(e) => updateProjectSettings({ altitudeCorrection: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Custom Location Form
// ============================================

interface CustomLocationFormProps {
  onSave: (custom: NonNullable<HVACProjectSettings['customLocation']>) => void
  onCancel: () => void
  initial?: NonNullable<HVACProjectSettings['customLocation']>
}

type HVACProjectSettings = ReturnType<typeof useHVACStore.getState>['currentProject'] extends { settings: infer S } | null ? S : never

function CustomLocationForm({ onSave, onCancel, initial }: CustomLocationFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    cooling_04_db: initial?.cooling_04_db || 95,
    cooling_04_mcwb: initial?.cooling_04_mcwb || 75,
    cooling_1_db: initial?.cooling_1_db || 92,
    cooling_1_mcwb: initial?.cooling_1_mcwb || 74,
    heating_99_db: initial?.heating_99_db || 15,
    heating_996_db: initial?.heating_996_db || 10,
    elevation_ft: initial?.elevation_ft || 0,
  })
  
  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSave(form as NonNullable<HVACProjectSettings['customLocation']>)
  }
  
  return (
    <div className="mt-4 p-4 bg-surface-900 rounded-lg border border-cyan-600">
      <h4 className="text-white font-medium mb-4">Custom Location</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-surface-400 mb-1">Location Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Custom Site, Project Location"
            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">0.4% Cooling DB (°F)</label>
            <input
              type="number"
              value={form.cooling_04_db}
              onChange={(e) => setForm(f => ({ ...f, cooling_04_db: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">0.4% Cooling MCWB (°F)</label>
            <input
              type="number"
              value={form.cooling_04_mcwb}
              onChange={(e) => setForm(f => ({ ...f, cooling_04_mcwb: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">1% Cooling DB (°F)</label>
            <input
              type="number"
              value={form.cooling_1_db}
              onChange={(e) => setForm(f => ({ ...f, cooling_1_db: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">1% Cooling MCWB (°F)</label>
            <input
              type="number"
              value={form.cooling_1_mcwb}
              onChange={(e) => setForm(f => ({ ...f, cooling_1_mcwb: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">99% Heating DB (°F)</label>
            <input
              type="number"
              value={form.heating_99_db}
              onChange={(e) => setForm(f => ({ ...f, heating_99_db: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">99.6% Heating DB (°F)</label>
            <input
              type="number"
              value={form.heating_996_db}
              onChange={(e) => setForm(f => ({ ...f, heating_996_db: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-surface-400 mb-1">Elevation (ft)</label>
            <input
              type="number"
              value={form.elevation_ft}
              onChange={(e) => setForm(f => ({ ...f, elevation_ft: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
            />
          </div>
        </div>
        
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            Save Custom Location
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
