import { useState, useEffect } from 'react'
import LineItemsEditor from './LineItemsEditor'
import { useProjectStore } from '../../store/useProjectStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { getZoneCategories, getZoneTypesByCategory } from '../../data/zoneDefaults'
import type { Zone, ZoneType } from '../../types'

interface ZoneEditorProps {
  zone: Zone
  onClose: () => void
}

export default function ZoneEditor({ zone, onClose }: ZoneEditorProps) {
  const { updateZone, deleteZone } = useProjectStore()
  const { getZoneDefaults, customZoneTypes } = useSettingsStore()
  const [localZone, setLocalZone] = useState(zone)
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  useEffect(() => {
    setLocalZone(zone)
  }, [zone])

  const handleUpdate = (updates: Partial<Zone>) => {
    const newZone = { ...localZone, ...updates }
    setLocalZone(newZone)
    updateZone(zone.id, updates)
  }

  const handleTypeChange = (newType: string) => {
    const defaults = getZoneDefaults(newType)
    const currentDefaults = getZoneDefaults(zone.type)
    handleUpdate({
      type: newType as ZoneType,
      name: localZone.name === currentDefaults.displayName ? defaults.displayName : localZone.name,
      rates: { ...defaults.defaultRates },
      fixtures: { ...defaults.defaultFixtures },
      subType: defaults.defaultSubType || localZone.subType,
    })
    setShowTypeSelector(false)
  }

  const handleDelete = () => {
    if (confirm(`Delete "${localZone.name}"? This cannot be undone.`)) {
      deleteZone(zone.id)
      onClose()
    }
  }

  const defaults = getZoneDefaults(localZone.type)
  const baseCategories = getZoneCategories()
  const categories = customZoneTypes.length > 0 ? [...baseCategories, 'Custom'] : baseCategories

  // Calculate zone totals
  const lightingKW = (localZone.sf * localZone.rates.lighting_w_sf) / 1000
  const receptacleKVA = (localZone.sf * localZone.rates.receptacle_va_sf) / 1000
  const ventCFM = localZone.sf * localZone.rates.ventilation_cfm_sf + (defaults.ventilation_cfm || 0)
  const exhaustCFM = localZone.sf * localZone.rates.exhaust_cfm_sf + (defaults.exhaust_cfm || 0) +
    (defaults.exhaust_cfm_toilet || 0) * localZone.fixtures.wcs +
    (defaults.exhaust_cfm_shower || 0) * localZone.fixtures.showers
  const coolingTons = localZone.rates.cooling_sf_ton > 0 ? localZone.sf / localZone.rates.cooling_sf_ton : 0

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Slide-out Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-surface-800 border-l border-surface-700 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-800 border-b border-surface-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: localZone.color }}
            />
            <h2 className="text-lg font-semibold text-white">Edit Zone</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Zone Name */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Zone Name</label>
            <input
              type="text"
              value={localZone.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>

          {/* Zone Type */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Zone Type</label>
            <button
              onClick={() => setShowTypeSelector(!showTypeSelector)}
              className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white text-left flex items-center justify-between"
            >
              <span>{defaults.displayName}</span>
              <svg className={`w-4 h-4 text-surface-400 transition-transform ${showTypeSelector ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTypeSelector && (
              <div className="mt-2 bg-surface-900 border border-surface-600 rounded-lg max-h-64 overflow-y-auto">
                {categories.map(category => (
                  <div key={category}>
                    <div className="px-3 py-2 text-xs font-medium text-surface-400 bg-surface-800 sticky top-0">
                      {category}
                    </div>
                    {(category === 'Custom' ? customZoneTypes : getZoneTypesByCategory(category)).map(type => (
                      <button
                        key={type}
                        onClick={() => handleTypeChange(type)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-700 ${
                          type === localZone.type ? 'text-primary-400' : 'text-surface-200'
                        }`}
                      >
                        {getZoneDefaults(type).displayName}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-Type Toggle */}
          {defaults.switchable && (
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Primary Energy</label>
              <div className="grid grid-cols-2 gap-2">
                {['electric', 'gas'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleUpdate({ subType: type as 'electric' | 'gas' })}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      localZone.subType === type
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                    }`}
                  >
                    {type === 'electric' ? '⚡ Electric' : '🔥 Gas'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Square Footage */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Square Footage</label>
            <div className="relative">
              <input
                type="number"
                value={localZone.sf}
                onChange={(e) => handleUpdate({ sf: Number(e.target.value) })}
                min={0}
                className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">SF</span>
            </div>
          </div>

          {/* Fixtures */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Fixtures</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'showers', label: 'Showers' },
                { key: 'lavs', label: 'Lavatories' },
                { key: 'wcs', label: 'Water Closets' },
                { key: 'floorDrains', label: 'Floor Drains' },
                { key: 'serviceSinks', label: 'Service Sinks' },
                { key: 'washingMachines', label: 'Washers' },
                { key: 'dryers', label: 'Dryers' },
              ].map(fixture => (
                <div key={fixture.key}>
                  <label className="text-xs text-surface-400">{fixture.label}</label>
                  <input
                    type="number"
                    value={localZone.fixtures[fixture.key as keyof typeof localZone.fixtures]}
                    onChange={(e) => handleUpdate({
                      fixtures: { ...localZone.fixtures, [fixture.key]: Number(e.target.value) }
                    })}
                    min={0}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rate-Based Loads */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Rate-Based Loads (per SF)</label>
            <div className="space-y-3">
              {[
                { key: 'lighting_w_sf', label: 'Lighting', unit: 'W/SF', result: `${lightingKW.toFixed(1)} kW` },
                { key: 'receptacle_va_sf', label: 'Receptacles', unit: 'VA/SF', result: `${receptacleKVA.toFixed(1)} kVA` },
                { key: 'ventilation_cfm_sf', label: 'Ventilation', unit: 'CFM/SF', result: `${ventCFM.toLocaleString()} CFM` },
                { key: 'exhaust_cfm_sf', label: 'Exhaust', unit: 'CFM/SF', result: `${exhaustCFM.toLocaleString()} CFM` },
                { key: 'cooling_sf_ton', label: 'Cooling', unit: 'SF/Ton', result: coolingTons > 0 ? `${coolingTons.toFixed(1)} Tons` : 'N/A' },
                { key: 'heating_btuh_sf', label: 'Heating', unit: 'BTU/SF', result: '' },
              ].map(rate => (
                <div key={rate.key} className="flex items-center gap-3">
                  <label className="w-24 text-sm text-surface-300">{rate.label}</label>
                  <input
                    type="number"
                    value={localZone.rates[rate.key as keyof typeof localZone.rates]}
                    onChange={(e) => handleUpdate({
                      rates: { ...localZone.rates, [rate.key]: Number(e.target.value) }
                    })}
                    step={0.01}
                    min={0}
                    className="flex-1 px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                  />
                  <span className="w-16 text-xs text-surface-400">{rate.unit}</span>
                  {rate.result && (
                    <span className="w-20 text-xs text-primary-400 text-right">{rate.result}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <LineItemsEditor zone={localZone} onUpdate={handleUpdate} />

          {/* Zone Totals Summary */}
          <div className="bg-surface-900 rounded-lg p-4">
            <h4 className="text-sm font-medium text-surface-300 mb-3">Zone Totals</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-surface-400">Lighting:</span>
                <span className="ml-2 text-white font-mono">{lightingKW.toFixed(1)} kW</span>
              </div>
              <div>
                <span className="text-surface-400">Receptacle:</span>
                <span className="ml-2 text-white font-mono">{receptacleKVA.toFixed(1)} kVA</span>
              </div>
              <div>
                <span className="text-surface-400">Cooling:</span>
                <span className="ml-2 text-white font-mono">{coolingTons.toFixed(1)} Tons</span>
              </div>
              <div>
                <span className="text-surface-400">Ventilation:</span>
                <span className="ml-2 text-white font-mono">{ventCFM.toLocaleString()} CFM</span>
              </div>
              <div>
                <span className="text-surface-400">Exhaust:</span>
                <span className="ml-2 text-white font-mono">{exhaustCFM.toLocaleString()} CFM</span>
              </div>
              {defaults.fixed_kw && (
                <div>
                  <span className="text-surface-400">Fixed Load:</span>
                  <span className="ml-2 text-white font-mono">{defaults.fixed_kw} kW</span>
                </div>
              )}
              {localZone.subType === 'gas' && defaults.gas_mbh && (
                <div>
                  <span className="text-surface-400">Gas:</span>
                  <span className="ml-2 text-white font-mono">{defaults.gas_mbh} MBH</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-surface-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg font-medium"
            >
              Done
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg font-medium"
            >
              Delete Zone
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
