import { useState, useMemo } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { NYC_FIXTURE_DATABASE, FIXTURE_CATEGORIES } from '../../data/nycFixtures'
import type { FixtureOverride } from '../../types'

export default function FixtureOverrides() {
  const { currentProject, updateProject } = useProjectStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const overrides = currentProject?.fixtureOverrides || []

  // Filter fixtures based on search and category
  const filteredFixtures = useMemo(() => {
    let results = NYC_FIXTURE_DATABASE

    if (selectedCategory) {
      results = results.filter(f => f.category === selectedCategory)
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase()
      results = results.filter(f =>
        f.name.toLowerCase().includes(lower) ||
        f.category.toLowerCase().includes(lower) ||
        f.id.toLowerCase().includes(lower)
      )
    }

    return results.slice(0, 15) // Limit dropdown results
  }, [searchTerm, selectedCategory])

  // Get fixture by ID from database
  const getFixtureById = (id: string) => NYC_FIXTURE_DATABASE.find(f => f.id === id)

  // Add fixture to overrides
  const addOverride = (fixtureId: string) => {
    if (overrides.some(o => o.fixtureId === fixtureId)) return // Already exists
    
    const fixture = getFixtureById(fixtureId)
    if (!fixture) return

    const newOverride: FixtureOverride = {
      fixtureId,
      wsfuCold: fixture.wsfuCold,
      wsfuHot: fixture.wsfuHot,
      dfu: fixture.dfu,
      hotWaterGPH: fixture.hotWaterGPH,
    }

    updateProject({ fixtureOverrides: [...overrides, newOverride] })
    setSearchTerm('')
    setShowDropdown(false)
  }

  // Update an override field
  const updateOverride = (fixtureId: string, field: keyof FixtureOverride, value: number) => {
    const updated = overrides.map(o =>
      o.fixtureId === fixtureId ? { ...o, [field]: value } : o
    )
    updateProject({ fixtureOverrides: updated })
  }

  // Remove an override
  const removeOverride = (fixtureId: string) => {
    updateProject({ fixtureOverrides: overrides.filter(o => o.fixtureId !== fixtureId) })
  }

  // Reset override to original values
  const resetOverride = (fixtureId: string) => {
    const fixture = getFixtureById(fixtureId)
    if (!fixture) return

    const updated = overrides.map(o =>
      o.fixtureId === fixtureId
        ? { ...o, wsfuCold: fixture.wsfuCold, wsfuHot: fixture.wsfuHot, dfu: fixture.dfu, hotWaterGPH: fixture.hotWaterGPH }
        : o
    )
    updateProject({ fixtureOverrides: updated })
  }

  if (!currentProject) return null

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <span>🔧</span> Fixture Parameter Overrides
      </h3>
      <p className="text-sm text-surface-400 mb-4">
        Override WSFU, DFU, or hot water demand (GPH) for specific fixture types. 
        These overrides apply globally to all calculations in this project.
      </p>

      {/* Search Section */}
      <div className="relative mb-4">
        <div className="flex gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
          >
            <option value="">All Categories</option>
            {FIXTURE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search fixtures to add override..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
            />
            
            {/* Search icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dropdown Results */}
        {showDropdown && (searchTerm || selectedCategory) && filteredFixtures.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-surface-800 border border-surface-600 rounded-lg shadow-xl max-h-72 overflow-y-auto">
            {filteredFixtures.map(fixture => {
              const isOverridden = overrides.some(o => o.fixtureId === fixture.id)
              return (
                <button
                  key={fixture.id}
                  onClick={() => addOverride(fixture.id)}
                  disabled={isOverridden}
                  className={`w-full px-4 py-3 text-left transition-colors border-b border-surface-700/50 last:border-0 ${
                    isOverridden
                      ? 'bg-surface-700/30 cursor-not-allowed'
                      : 'hover:bg-surface-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="mr-2">{fixture.icon}</span>
                      <span className={isOverridden ? 'text-surface-500' : 'text-white'}>
                        {fixture.name}
                      </span>
                      {isOverridden && (
                        <span className="ml-2 text-xs text-emerald-500">(already overridden)</span>
                      )}
                    </div>
                    <span className="text-xs text-surface-500">{fixture.category}</span>
                  </div>
                  <div className="text-xs text-surface-400 mt-1">
                    WSFU: {fixture.wsfuCold + fixture.wsfuHot} • DFU: {fixture.dfu} • GPH: {fixture.hotWaterGPH}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Click outside to close dropdown */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>

      {/* Override List */}
      {overrides.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm font-medium text-surface-300 mb-2">
            Active Overrides ({overrides.length})
          </div>
          
          {overrides.map(override => {
            const fixture = getFixtureById(override.fixtureId)
            if (!fixture) return null

            const hasChanges = 
              override.wsfuCold !== fixture.wsfuCold ||
              override.wsfuHot !== fixture.wsfuHot ||
              override.dfu !== fixture.dfu ||
              override.hotWaterGPH !== fixture.hotWaterGPH

            return (
              <div
                key={override.fixtureId}
                className="bg-surface-900/50 rounded-lg p-4 border border-surface-700"
              >
                {/* Fixture Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span>{fixture.icon}</span>
                    <span className="text-white font-medium">{fixture.name}</span>
                    {hasChanges && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                        Modified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resetOverride(override.fixtureId)}
                      className="text-xs text-surface-400 hover:text-white transition-colors"
                      title="Reset to original values"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => removeOverride(override.fixtureId)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Override Fields */}
                <div className="grid grid-cols-4 gap-3">
                  {/* WSFU Cold */}
                  <div>
                    <label className="block text-xs text-surface-500 mb-1">
                      WSFU Cold
                      <span className="text-surface-600 ml-1">(orig: {fixture.wsfuCold})</span>
                    </label>
                    <input
                      type="number"
                      value={override.wsfuCold ?? fixture.wsfuCold}
                      onChange={(e) => updateOverride(override.fixtureId, 'wsfuCold', parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.1}
                      className={`w-full px-3 py-2 bg-surface-800 border rounded-lg text-sm ${
                        override.wsfuCold !== fixture.wsfuCold
                          ? 'border-amber-500/50 text-amber-300'
                          : 'border-surface-600 text-white'
                      }`}
                    />
                  </div>

                  {/* WSFU Hot */}
                  <div>
                    <label className="block text-xs text-surface-500 mb-1">
                      WSFU Hot
                      <span className="text-surface-600 ml-1">(orig: {fixture.wsfuHot})</span>
                    </label>
                    <input
                      type="number"
                      value={override.wsfuHot ?? fixture.wsfuHot}
                      onChange={(e) => updateOverride(override.fixtureId, 'wsfuHot', parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.1}
                      className={`w-full px-3 py-2 bg-surface-800 border rounded-lg text-sm ${
                        override.wsfuHot !== fixture.wsfuHot
                          ? 'border-amber-500/50 text-amber-300'
                          : 'border-surface-600 text-white'
                      }`}
                    />
                  </div>

                  {/* DFU */}
                  <div>
                    <label className="block text-xs text-surface-500 mb-1">
                      DFU
                      <span className="text-surface-600 ml-1">(orig: {fixture.dfu})</span>
                    </label>
                    <input
                      type="number"
                      value={override.dfu ?? fixture.dfu}
                      onChange={(e) => updateOverride(override.fixtureId, 'dfu', parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.5}
                      className={`w-full px-3 py-2 bg-surface-800 border rounded-lg text-sm ${
                        override.dfu !== fixture.dfu
                          ? 'border-amber-500/50 text-amber-300'
                          : 'border-surface-600 text-white'
                      }`}
                    />
                  </div>

                  {/* Hot Water GPH */}
                  <div>
                    <label className="block text-xs text-surface-500 mb-1">
                      Hot GPH
                      <span className="text-surface-600 ml-1">(orig: {fixture.hotWaterGPH})</span>
                    </label>
                    <input
                      type="number"
                      value={override.hotWaterGPH ?? fixture.hotWaterGPH}
                      onChange={(e) => updateOverride(override.fixtureId, 'hotWaterGPH', parseFloat(e.target.value) || 0)}
                      min={0}
                      step={1}
                      className={`w-full px-3 py-2 bg-surface-800 border rounded-lg text-sm ${
                        override.hotWaterGPH !== fixture.hotWaterGPH
                          ? 'border-amber-500/50 text-amber-300'
                          : 'border-surface-600 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-surface-500 bg-surface-900/30 rounded-lg border border-dashed border-surface-700">
          <div className="text-2xl mb-2">🔍</div>
          <p>No fixture overrides configured.</p>
          <p className="text-sm mt-1">Search for a fixture above to customize its parameters.</p>
        </div>
      )}

      {/* Info Note */}
      <div className="mt-4 text-xs text-surface-500 bg-surface-900/50 rounded p-3">
        <strong className="text-surface-400">Note:</strong> Overrides affect all plumbing and DHW calculations. 
        WSFU values are from ASPE Table 5-18. Hot water GPH is based on ASHRAE Service Water Heating methodology.
      </div>
    </div>
  )
}
