import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { zoneDefaults as builtInDefaults } from '../../data/zoneDefaults'
import type { ZoneDefaults } from '../../data/zoneDefaults'

interface ZoneDefaultsEditorProps {
  zoneTypeId: string
  onClose: () => void
}

export default function ZoneDefaultsEditor({ zoneTypeId, onClose }: ZoneDefaultsEditorProps) {
  const { 
    getZoneDefaults, 
    updateZoneDefaults, 
    resetZoneDefaults, 
    deleteCustomZoneType,
    isCustomZoneType 
  } = useSettingsStore()
  
  const isCustom = isCustomZoneType(zoneTypeId)
  const builtInDefault = builtInDefaults[zoneTypeId as keyof typeof builtInDefaults]
  const currentDefaults = getZoneDefaults(zoneTypeId)
  
  const [localDefaults, setLocalDefaults] = useState<ZoneDefaults>(currentDefaults)

  useEffect(() => {
    setLocalDefaults(currentDefaults)
  }, [zoneTypeId])

  const handleSave = () => {
    updateZoneDefaults(zoneTypeId, localDefaults)
    onClose()
  }

  const handleReset = () => {
    if (isCustom) {
      if (confirm('Delete this custom zone type? This cannot be undone.')) {
        deleteCustomZoneType(zoneTypeId)
        onClose()
      }
    } else {
      if (confirm('Reset to original defaults?')) {
        resetZoneDefaults(zoneTypeId)
        setLocalDefaults(builtInDefault)
      }
    }
  }

  const updateField = <K extends keyof ZoneDefaults>(field: K, value: ZoneDefaults[K]) => {
    setLocalDefaults(prev => ({ ...prev, [field]: value }))
  }

  const updateRate = (field: string, value: number) => {
    setLocalDefaults(prev => ({
      ...prev,
      defaultRates: { ...prev.defaultRates, [field]: value }
    }))
  }

  const updateFixture = (field: string, value: number) => {
    setLocalDefaults(prev => ({
      ...prev,
      defaultFixtures: { ...prev.defaultFixtures, [field]: value }
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface-800 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div>
            <h2 className="text-xl font-semibold text-white">{localDefaults.displayName}</h2>
            <p className="text-sm text-surface-400">{localDefaults.category} • {isCustom ? 'Custom Type' : 'Built-in Type'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-700 rounded-lg">
            <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Display Name</label>
              <input
                type="text"
                value={localDefaults.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Category</label>
              <select
                value={localDefaults.category}
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
              <label className="block text-sm font-medium text-surface-300 mb-2">Default Square Footage</label>
              <input
                type="number"
                value={localDefaults.defaultSF}
                onChange={(e) => updateField('defaultSF', Number(e.target.value))}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-surface-300">
                <input
                  type="checkbox"
                  checked={localDefaults.switchable || false}
                  onChange={(e) => updateField('switchable', e.target.checked)}
                  className="rounded bg-surface-700 border-surface-600"
                />
                Switchable (Electric/Gas)
              </label>
            </div>
          </div>

          {/* Rate-Based Defaults */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Rate-Based Defaults (per SF)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Lighting (W/SF)</label>
                <input
                  type="number"
                  step="0.1"
                  value={localDefaults.defaultRates.lighting_w_sf}
                  onChange={(e) => updateRate('lighting_w_sf', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Receptacles (VA/SF)</label>
                <input
                  type="number"
                  step="0.1"
                  value={localDefaults.defaultRates.receptacle_va_sf}
                  onChange={(e) => updateRate('receptacle_va_sf', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Ventilation (CFM/SF)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localDefaults.defaultRates.ventilation_cfm_sf}
                  onChange={(e) => updateRate('ventilation_cfm_sf', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Exhaust (CFM/SF)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localDefaults.defaultRates.exhaust_cfm_sf}
                  onChange={(e) => updateRate('exhaust_cfm_sf', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Cooling (SF/Ton)</label>
                <input
                  type="number"
                  value={localDefaults.defaultRates.cooling_sf_ton}
                  onChange={(e) => updateRate('cooling_sf_ton', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Heating (BTU/SF)</label>
                <input
                  type="number"
                  value={localDefaults.defaultRates.heating_btuh_sf}
                  onChange={(e) => updateRate('heating_btuh_sf', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Fixed Loads */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Fixed Loads (not per SF)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Fixed kW</label>
                <input
                  type="number"
                  step="0.1"
                  value={localDefaults.fixed_kw || 0}
                  onChange={(e) => updateField('fixed_kw', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Gas (MBH)</label>
                <input
                  type="number"
                  value={localDefaults.gas_mbh || 0}
                  onChange={(e) => updateField('gas_mbh', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Ventilation (CFM)</label>
                <input
                  type="number"
                  value={localDefaults.ventilation_cfm || 0}
                  onChange={(e) => updateField('ventilation_cfm', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Exhaust (CFM)</label>
                <input
                  type="number"
                  value={localDefaults.exhaust_cfm || 0}
                  onChange={(e) => updateField('exhaust_cfm', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Pool Heater (MBH)</label>
                <input
                  type="number"
                  value={localDefaults.pool_heater_gas_mbh || 0}
                  onChange={(e) => updateField('pool_heater_gas_mbh', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Dehumid (lb/hr)</label>
                <input
                  type="number"
                  value={localDefaults.dehumidification_lb_hr || 0}
                  onChange={(e) => updateField('dehumidification_lb_hr', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Exhaust per Fixture */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Exhaust per Fixture</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Per Toilet (CFM)</label>
                <input
                  type="number"
                  value={localDefaults.exhaust_cfm_toilet || 0}
                  onChange={(e) => updateField('exhaust_cfm_toilet', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Per Shower (CFM)</label>
                <input
                  type="number"
                  value={localDefaults.exhaust_cfm_shower || 0}
                  onChange={(e) => updateField('exhaust_cfm_shower', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Default Fixtures */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Default Fixture Counts</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(localDefaults.defaultFixtures).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs text-surface-400 mb-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => updateFixture(key, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Special Options */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Special Options</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-surface-300">
                <input
                  type="checkbox"
                  checked={localDefaults.requires_standby_power || false}
                  onChange={(e) => updateField('requires_standby_power', e.target.checked || undefined)}
                  className="rounded bg-surface-700 border-surface-600"
                />
                Requires Standby Power
              </label>
              <label className="flex items-center gap-2 text-sm text-surface-300">
                <input
                  type="checkbox"
                  checked={localDefaults.requires_type1_hood || false}
                  onChange={(e) => updateField('requires_type1_hood', e.target.checked || undefined)}
                  className="rounded bg-surface-700 border-surface-600"
                />
                Requires Type I Hood
              </label>
              <label className="flex items-center gap-2 text-sm text-surface-300">
                <input
                  type="checkbox"
                  checked={localDefaults.requires_mau || false}
                  onChange={(e) => updateField('requires_mau', e.target.checked || undefined)}
                  className="rounded bg-surface-700 border-surface-600"
                />
                Requires Makeup Air Unit
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700 bg-surface-800">
          <button
            onClick={handleReset}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCustom 
                ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20'
                : 'text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            {isCustom ? 'Delete Zone Type' : 'Reset to Default'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
