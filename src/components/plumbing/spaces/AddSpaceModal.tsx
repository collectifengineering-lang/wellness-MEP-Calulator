import { useState } from 'react'

interface AddSpaceModalProps {
  onClose: () => void
  onAdd: (name: string, sf: number) => void
}

export default function AddSpaceModal({ onClose, onAdd }: AddSpaceModalProps) {
  const [name, setName] = useState('')
  const [sf, setSf] = useState(500)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAdd(name.trim(), sf)
    }
  }

  // Common space presets
  const presets = [
    { name: 'Restroom', sf: 200, icon: '🚻' },
    { name: 'Locker Room', sf: 800, icon: '🚿' },
    { name: 'Kitchen', sf: 400, icon: '🍳' },
    { name: 'Laundry', sf: 300, icon: '🧺' },
    { name: 'Mechanical Room', sf: 200, icon: '⚙️' },
    { name: 'Break Room', sf: 250, icon: '☕' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Add Space 🐐</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-700 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-6">
          <p className="text-sm text-surface-400 mb-3">Quick Start:</p>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setName(preset.name)
                  setSf(preset.sf)
                }}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  name === preset.name
                    ? 'border-pink-500 bg-pink-500/10 text-white'
                    : 'border-surface-600 bg-surface-700 text-surface-300 hover:border-surface-500'
                }`}
              >
                <span className="text-2xl block mb-1">{preset.icon}</span>
                <span className="text-xs">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Space Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Men's Restroom, Kitchen..."
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-pink-500 focus:outline-none"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Square Footage</label>
            <input
              type="number"
              value={sf}
              onChange={(e) => setSf(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-surface-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Add Space 🐐
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
