import { useState, useMemo } from 'react'
import { NYC_FIXTURE_DATABASE, FIXTURE_CATEGORIES, type FixtureDefinition, type FixtureCategory } from '../../data/nycFixtures'

interface AddFixtureModalProps {
  isOpen: boolean
  onClose: () => void
  onAddFixture: (fixtureId: string, count: number) => void
  existingFixtures: Record<string, number>
}

export function AddFixtureModal({ isOpen, onClose, onAddFixture, existingFixtures }: AddFixtureModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<FixtureCategory | 'all'>('all')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(FIXTURE_CATEGORIES))
  const [selectedFixture, setSelectedFixture] = useState<FixtureDefinition | null>(null)
  const [count, setCount] = useState(1)

  // Filter fixtures based on search and category
  const filteredFixtures = useMemo(() => {
    return NYC_FIXTURE_DATABASE.filter(fixture => {
      const matchesSearch = searchTerm === '' || 
        fixture.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fixture.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || fixture.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  // Group fixtures by category
  const fixturesByCategory = useMemo(() => {
    const grouped: Record<string, FixtureDefinition[]> = {}
    for (const category of FIXTURE_CATEGORIES) {
      grouped[category] = filteredFixtures.filter(f => f.category === category)
    }
    return grouped
  }, [filteredFixtures])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const handleSelectFixture = (fixture: FixtureDefinition) => {
    setSelectedFixture(fixture)
    // Default to 1 if new, or existing count
    setCount(existingFixtures[fixture.id] || 1)
  }

  const handleAddFixture = () => {
    if (selectedFixture && count > 0) {
      onAddFixture(selectedFixture.id, count)
      setSelectedFixture(null)
      setCount(1)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-surface-600">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-600 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Add Fixtures</h2>
            <p className="text-sm text-surface-400">NYC Plumbing Code fixture database</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-700 rounded-lg transition-colors text-surface-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-3 border-b border-surface-700 flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fixtures..."
              className="w-full px-4 py-2 pl-10 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">🔍</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as FixtureCategory | 'all')}
            className="px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {FIXTURE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Fixture List */}
          <div className="flex-1 overflow-y-auto p-4">
            {Object.entries(fixturesByCategory).map(([category, fixtures]) => {
              if (fixtures.length === 0) return null
              const isExpanded = expandedCategories.has(category)
              
              return (
                <div key={category} className="mb-2">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-surface-700/50 hover:bg-surface-700 rounded-lg transition-colors text-left"
                  >
                    <span className="text-surface-400">{isExpanded ? '▼' : '▶'}</span>
                    <span className="font-medium text-white">{category}</span>
                    <span className="text-xs text-surface-500 ml-auto">{fixtures.length} fixtures</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-2">
                      {fixtures.map(fixture => {
                        const isSelected = selectedFixture?.id === fixture.id
                        const hasExisting = existingFixtures[fixture.id] > 0
                        
                        return (
                          <button
                            key={fixture.id}
                            onClick={() => handleSelectFixture(fixture)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left
                              ${isSelected 
                                ? 'bg-primary-600/30 border border-primary-500' 
                                : hasExisting
                                  ? 'bg-emerald-900/20 border border-emerald-700/50 hover:bg-emerald-900/30'
                                  : 'bg-surface-800 hover:bg-surface-700 border border-transparent'}
                            `}
                          >
                            <span className="text-lg">{fixture.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{fixture.name}</div>
                              <div className="text-xs text-surface-500">
                                WSFU: {fixture.wsfu} | DFU: {fixture.dfu}
                                {fixture.hotWaterGPH > 0 && ` | HW: ${fixture.hotWaterGPH} GPH`}
                              </div>
                            </div>
                            {hasExisting && (
                              <span className="px-2 py-0.5 bg-emerald-600/50 text-emerald-200 rounded text-xs">
                                {existingFixtures[fixture.id]}×
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Detail Panel */}
          <div className="w-72 border-l border-surface-700 p-4 bg-surface-900/50">
            {selectedFixture ? (
              <div className="h-full flex flex-col">
                <div className="text-center mb-4">
                  <span className="text-4xl">{selectedFixture.icon}</span>
                  <h3 className="font-bold text-white mt-2">{selectedFixture.name}</h3>
                  <p className="text-xs text-surface-400">{selectedFixture.category}</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between bg-surface-800 rounded-lg px-3 py-2">
                    <span className="text-surface-400">WSFU</span>
                    <span className="text-white font-mono">{selectedFixture.wsfu}</span>
                  </div>
                  <div className="flex justify-between bg-surface-800 rounded-lg px-3 py-2">
                    <span className="text-surface-400">DFU</span>
                    <span className="text-white font-mono">{selectedFixture.dfu}</span>
                  </div>
                  {selectedFixture.hotWaterGPH > 0 && (
                    <div className="flex justify-between bg-surface-800 rounded-lg px-3 py-2">
                      <span className="text-surface-400">Hot Water</span>
                      <span className="text-white font-mono">{selectedFixture.hotWaterGPH} GPH</span>
                    </div>
                  )}
                  {selectedFixture.trapSize && (
                    <div className="flex justify-between bg-surface-800 rounded-lg px-3 py-2">
                      <span className="text-surface-400">Trap Size</span>
                      <span className="text-white font-mono">{selectedFixture.trapSize}</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 space-y-3">
                  <div>
                    <label className="text-xs text-surface-400 block mb-1">Quantity</label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => setCount(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-center text-lg font-mono focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddFixture}
                    disabled={count === 0}
                    className={`
                      w-full py-2.5 rounded-lg font-medium transition-colors
                      ${count > 0
                        ? 'bg-primary-600 hover:bg-primary-500 text-white'
                        : 'bg-surface-700 text-surface-500 cursor-not-allowed'}
                    `}
                  >
                    {existingFixtures[selectedFixture.id] > 0 ? 'Update Count' : 'Add Fixture'}
                  </button>
                  {existingFixtures[selectedFixture.id] > 0 && count === 0 && (
                    <p className="text-xs text-amber-400 text-center">
                      Setting to 0 will remove this fixture
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-surface-500 text-center">
                <div>
                  <div className="text-3xl mb-2">🚿</div>
                  <p className="text-sm">Select a fixture to view details and add it</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-700 flex items-center justify-between">
          <div className="text-xs text-surface-500">
            {filteredFixtures.length} fixtures • {Object.values(existingFixtures).filter(v => v > 0).length} in zone
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
