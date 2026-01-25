import { useState } from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import type { ZoneDefaults } from '../../data/zoneDefaults'

interface NewZoneTypeModalProps {
  onClose: () => void
}

const defaultNewZone: ZoneDefaults = {
  displayName: '',
  category: 'Custom',
  defaultSF: 1000,
  defaultSubType: 'electric',
  switchable: false,
  defaultFixtures: {
    showers: 0,
    lavs: 0,
    wcs: 0,
    floorDrains: 0,
    serviceSinks: 0,
    washingMachines: 0,
    dryers: 0,
  },
  defaultRates: {
    lighting_w_sf: 1.0,
    receptacle_va_sf: 3.0,
    ventilation_cfm_sf: 0.15,
    exhaust_cfm_sf: 0,
    cooling_sf_ton: 400,
    heating_btuh_sf: 25,
  },
}

export default function NewZoneTypeModal({ onClose }: NewZoneTypeModalProps) {
  const { addCustomZoneType, customZoneTypes } = useSettingsStore()
  const [zoneId, setZoneId] = useState('')
  const [defaults, setDefaults] = useState<ZoneDefaults>(defaultNewZone)
  const [error, setError] = useState('')

  const handleCreate = () => {
    // Validate
    if (!zoneId.trim()) {
      setError('Zone ID is required')
      return
    }
    if (!defaults.displayName.trim()) {
      setError('Display name is required')
      return
    }
    
    // Check for duplicates
    const normalizedId = zoneId.toLowerCase().replace(/\s+/g, '_')
    if (customZoneTypes.includes(normalizedId)) {
      setError('A zone type with this ID already exists')
      return
    }

    addCustomZoneType(normalizedId, {
      ...defaults,
      displayName: defaults.displayName.trim(),
    })
    onClose()
  }

  const updateField = <K extends keyof ZoneDefaults>(field: K, value: ZoneDefaults[K]) => {
    setDefaults(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const updateRate = (field: string, value: number) => {
    setDefaults(prev => ({
      ...prev,
      defaultRates: { ...prev.defaultRates, [field]: value }
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-surface-800 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <h2 className="text-xl font-semibold text-white">Create Custom Zone Type</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-700 rounded-lg">
            <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Zone ID <span className="text-surface-500">(lowercase, no spaces)</span>
              </label>
              <input
                type="text"
                value={zoneId}
                onChange={(e) => {
                  setZoneId(e.target.value.toLowerCase().replace(/\s+/g, '_'))
                  setError('')
                }}
                placeholder="e.g., meditation_room"
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Display Name</label>
              <input
                type="text"
                value={defaults.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                placeholder="e.g., Meditation Room"
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Category</label>
                <select
                  value={defaults.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                >
                  <option value="Support">Support</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Locker/Hygiene">Locker/Hygiene</option>
                  <option value="Thermal">Thermal</option>
                  <option value="Pool/Spa">Pool/Spa</option>
                  <option value="Kitchen/Laundry">Kitchen/Laundry</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Default SF</label>
                <input
                  type="number"
                  value={defaults.defaultSF}
                  onChange={(e) => updateField('defaultSF', Number(e.target.value))}
                  className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {/* Quick Rates */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Default Rates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Lighting (W/SF)</label>
                <input
                  type="number"
                  step="0.1"
                  value={defaults.defaultRates.lighting_w_sf}
                  onChange={(e) => updateRate('lighting_w_sf', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Receptacles (VA/SF)</label>
                <input
                  type="number"
                  step="0.1"
                  value={defaults.defaultRates.receptacle_va_sf}
                  onChange={(e) => updateRate('receptacle_va_sf', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Cooling (SF/Ton)</label>
                <input
                  type="number"
                  value={defaults.defaultRates.cooling_sf_ton}
                  onChange={(e) => updateRate('cooling_sf_ton', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Ventilation (CFM/SF)</label>
                <input
                  type="number"
                  step="0.01"
                  value={defaults.defaultRates.ventilation_cfm_sf}
                  onChange={(e) => updateRate('ventilation_cfm_sf', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-surface-500">
            You can edit more detailed settings after creating the zone type.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-surface-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium"
          >
            Create Zone Type
          </button>
        </div>
      </div>
    </div>
  )
}
