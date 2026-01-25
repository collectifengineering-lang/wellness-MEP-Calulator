import { useState } from 'react'
import type { ClimateType } from '../../types'

interface NewProjectModalProps {
  onClose: () => void
  onCreate: (name: string, targetSF: number, climate: ClimateType, electricPrimary: boolean) => void
}

const climateOptions: { value: ClimateType; label: string; description: string }[] = [
  { value: 'hot_humid', label: 'Hot & Humid', description: 'Miami, Houston, New Orleans' },
  { value: 'temperate', label: 'Temperate', description: 'New York, San Francisco, Philadelphia' },
  { value: 'cold_dry', label: 'Cold & Dry', description: 'Chicago, Denver, Minneapolis' },
]

export default function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('')
  const [targetSF, setTargetSF] = useState(20000)
  const [climate, setClimate] = useState<ClimateType>('temperate')
  const [electricPrimary, setElectricPrimary] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate(name.trim(), targetSF, climate, electricPrimary)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface-800 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <h2 className="text-xl font-semibold text-white">New Project</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-surface-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Downtown Bathhouse"
              className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              autoFocus
              required
            />
          </div>

          {/* Target SF */}
          <div>
            <label htmlFor="targetSF" className="block text-sm font-medium text-surface-300 mb-2">
              Target Total Square Footage
            </label>
            <div className="relative">
              <input
                type="number"
                id="targetSF"
                value={targetSF}
                onChange={(e) => setTargetSF(Number(e.target.value))}
                min={100}
                max={500000}
                className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">SF</span>
            </div>
          </div>

          {/* Climate Zone */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Climate Zone
            </label>
            <div className="grid grid-cols-3 gap-2">
              {climateOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setClimate(option.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    climate === option.value
                      ? 'border-primary-500 bg-primary-500/10 text-white'
                      : 'border-surface-600 bg-surface-900 text-surface-300 hover:border-surface-500'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-surface-400 mt-0.5">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Mode */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Primary Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setElectricPrimary(true)}
                className={`p-4 rounded-lg border text-center transition-all ${
                  electricPrimary
                    ? 'border-primary-500 bg-primary-500/10 text-white'
                    : 'border-surface-600 bg-surface-900 text-surface-300 hover:border-surface-500'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="font-medium">Electric Primary</div>
                <div className="text-xs text-surface-400 mt-1">Electric equipment with gas backup</div>
              </button>
              <button
                type="button"
                onClick={() => setElectricPrimary(false)}
                className={`p-4 rounded-lg border text-center transition-all ${
                  !electricPrimary
                    ? 'border-primary-500 bg-primary-500/10 text-white'
                    : 'border-surface-600 bg-surface-900 text-surface-300 hover:border-surface-500'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
                <div className="font-medium">Gas Primary</div>
                <div className="text-xs text-surface-400 mt-1">Gas equipment where available</div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 disabled:text-primary-400 text-white rounded-lg font-medium transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
