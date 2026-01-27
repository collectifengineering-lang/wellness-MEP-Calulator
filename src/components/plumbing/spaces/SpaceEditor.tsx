import { useState } from 'react'
import { usePlumbingStore, type PlumbingSpace } from '../../../store/usePlumbingStore'
import { NYC_FIXTURE_DATABASE } from '../../../data/nycFixtures'
import { AddFixtureModal } from '../../builder/AddFixtureModal'

interface SpaceEditorProps {
  space: PlumbingSpace
  onClose: () => void
}

export default function SpaceEditor({ space, onClose }: SpaceEditorProps) {
  const { updateSpace, updateSpaceFixtures } = usePlumbingStore()
  const [showAddFixture, setShowAddFixture] = useState(false)

  // Get visible fixtures (ones with count > 0)
  const visibleFixtureIds = Object.entries(space.fixtures)
    .filter(([_, count]) => count > 0)
    .map(([id]) => id)

  const handleNameChange = (name: string) => {
    updateSpace(space.id, { name })
  }

  const handleSFChange = (sf: number) => {
    updateSpace(space.id, { sf })
  }

  const handleFixtureChange = (fixtureId: string, count: number) => {
    updateSpaceFixtures(space.id, { [fixtureId]: Math.max(0, count) })
  }

  const handleAddFixture = (fixtureId: string, quantity: number) => {
    updateSpaceFixtures(space.id, { [fixtureId]: quantity })
    setShowAddFixture(false)
  }

  const handleRemoveFixture = (fixtureId: string) => {
    updateSpaceFixtures(space.id, { [fixtureId]: 0 })
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Edit Space 🐐</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-700 rounded transition-colors"
        >
          <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Basic Info */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-surface-400 mb-1">Space Name</label>
          <input
            type="text"
            value={space.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-pink-500 focus:outline-none"
          />
        </div>
        
        <div>
          <label className="block text-sm text-surface-400 mb-1">Square Footage</label>
          <input
            type="number"
            value={space.sf}
            onChange={(e) => handleSFChange(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-pink-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-surface-400 mb-1">Occupancy (optional)</label>
          <input
            type="number"
            value={space.occupancy || ''}
            onChange={(e) => updateSpace(space.id, { occupancy: parseInt(e.target.value) || undefined })}
            placeholder="Number of occupants"
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-pink-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Fixtures Section */}
      <div className="border-t border-surface-700 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-white">Fixtures 🚿</h4>
          <button
            onClick={() => setShowAddFixture(true)}
            className="text-sm text-pink-400 hover:text-pink-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Fixture
          </button>
        </div>

        {visibleFixtureIds.length === 0 ? (
          <p className="text-sm text-surface-500 italic text-center py-4">
            No fixtures yet. Click "Add Fixture" to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {visibleFixtureIds.map(fixtureId => {
              const fixture = NYC_FIXTURE_DATABASE.find(f => f.id === fixtureId)
              const count = space.fixtures[fixtureId] || 0
              
              return (
                <div key={fixtureId} className="flex items-center gap-3 bg-surface-700/50 rounded-lg p-3">
                  <span className="text-xl">{fixture?.icon || '🔧'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {fixture?.name || fixtureId}
                    </p>
                    <p className="text-xs text-surface-400">
                      WSFU: {fixture?.wsfuTotal || 0} | DFU: {fixture?.dfu || 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFixtureChange(fixtureId, count - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-surface-600 hover:bg-surface-500 rounded text-white transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => handleFixtureChange(fixtureId, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-surface-600 border border-surface-500 rounded text-center text-white text-sm"
                    />
                    <button
                      onClick={() => handleFixtureChange(fixtureId, count + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-surface-600 hover:bg-surface-500 rounded text-white transition-colors"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleRemoveFixture(fixtureId)}
                      className="p-1 hover:bg-red-500/20 rounded text-surface-500 hover:text-red-400 transition-colors"
                      title="Remove fixture"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="border-t border-surface-700 pt-4 mt-4">
        <label className="block text-sm text-surface-400 mb-1">Notes</label>
        <textarea
          value={space.notes || ''}
          onChange={(e) => updateSpace(space.id, { notes: e.target.value })}
          placeholder="Any notes about this space..."
          className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-pink-500 focus:outline-none resize-none h-20"
        />
      </div>

      {/* Add Fixture Modal */}
      {showAddFixture && (
        <AddFixtureModal
          isOpen={showAddFixture}
          onClose={() => setShowAddFixture(false)}
          onAddFixture={handleAddFixture}
          existingFixtures={space.fixtures}
        />
      )}
    </div>
  )
}
