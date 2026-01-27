import { useState } from 'react'
import SpaceBlock from './SpaceBlock'
import SpaceEditor from './SpaceEditor'
import AddSpaceModal from './AddSpaceModal'
import PlumbingTotalsBar from './PlumbingTotalsBar'
import { usePlumbingStore } from '../../../store/usePlumbingStore'

export default function SpaceCanvas() {
  const { spaces, addSpace, deleteSpace } = usePlumbingStore()
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId)

  const handleAddSpace = (name: string, sf: number) => {
    addSpace(name, sf)
    setShowAddModal(false)
  }

  const handleDeleteSpace = (spaceId: string) => {
    if (confirm('Delete this space? 🐐')) {
      deleteSpace(spaceId)
      if (selectedSpaceId === spaceId) {
        setSelectedSpaceId(null)
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Space Builder 🐐</h2>
              <p className="text-sm text-surface-400">
                Add spaces and their fixtures for plumbing calculations
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Space
            </button>
          </div>

          {/* Spaces Grid */}
          {spaces.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🚿🐐</div>
              <h3 className="text-lg font-medium text-white mb-2">No spaces yet!</h3>
              <p className="text-surface-400 mb-6">
                Add your first space to start calculating fixture units
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Space
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {spaces.map(space => (
                <SpaceBlock
                  key={space.id}
                  space={space}
                  isSelected={selectedSpaceId === space.id}
                  onClick={() => setSelectedSpaceId(space.id)}
                  onDelete={() => handleDeleteSpace(space.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Editor or Totals */}
      <div className="w-96 border-l border-surface-700 bg-surface-800/50 overflow-auto">
        {selectedSpace ? (
          <SpaceEditor
            space={selectedSpace}
            onClose={() => setSelectedSpaceId(null)}
          />
        ) : (
          <PlumbingTotalsBar />
        )}
      </div>

      {/* Add Space Modal */}
      {showAddModal && (
        <AddSpaceModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddSpace}
        />
      )}
    </div>
  )
}
