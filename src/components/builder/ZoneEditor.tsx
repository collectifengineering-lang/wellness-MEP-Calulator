import { useState, useEffect } from 'react'
import LineItemsEditor from './LineItemsEditor'
import { useProjectStore, calculateProcessLoads } from '../../store/useProjectStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { getZoneCategories, getZoneTypesByCategory, calculateLaundryLoads } from '../../data/zoneDefaults'
import type { Zone, ZoneType, ZoneProcessLoads } from '../../types'

interface ZoneEditorProps {
  zone: Zone
  onClose: () => void
}

// Default process loads for zones that don't have them
const defaultProcessLoads: ZoneProcessLoads = {
  fixed_kw: 0,
  gas_mbh: 0,
  ventilation_cfm: 0,
  exhaust_cfm: 0,
  pool_heater_mbh: 0,
  dehumid_lb_hr: 0,
  flue_size_in: 0,
  ceiling_height_ft: 10,
}

export default function ZoneEditor({ zone, onClose }: ZoneEditorProps) {
  const { updateZone, deleteZone } = useProjectStore()
  const { getZoneDefaults, customZoneTypes } = useSettingsStore()
  const [localZone, setLocalZone] = useState<Zone>({
    ...zone,
    processLoads: zone.processLoads || defaultProcessLoads
  })
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  useEffect(() => {
    setLocalZone({
      ...zone,
      processLoads: zone.processLoads || defaultProcessLoads
    })
  }, [zone])

  const handleUpdate = (updates: Partial<Zone>) => {
    const newZone = { ...localZone, ...updates }
    if (updates.processLoads) {
      newZone.processLoads = { ...localZone.processLoads, ...updates.processLoads }
    }
    setLocalZone(newZone)
    updateZone(zone.id, updates)
  }

  const handleTypeChange = (newType: string) => {
    const defaults = getZoneDefaults(newType)
    const currentDefaults = getZoneDefaults(zone.type)
    const newSubType = defaults.defaultSubType || localZone.subType
    const newSF = localZone.sf || defaults.defaultSF || 1000
    const newProcessLoads = calculateProcessLoads(defaults, newSF, newSubType)
    
    handleUpdate({
      type: newType as ZoneType,
      name: localZone.name === currentDefaults.displayName ? defaults.displayName : localZone.name,
      rates: { ...defaults.defaultRates },
      fixtures: { ...defaults.defaultFixtures },
      subType: newSubType,
      processLoads: newProcessLoads,
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

  // All equipment now goes through Line Items - no more confusing hidden sections!
  const isThermalZone = defaults.category === 'Thermal'

  // ==========================================================================
  // ZONE TOTALS - Simple Math: Rate-based + Line Items + Fixtures
  // ==========================================================================
  
  // 1. RATE-BASED LOADS (per SF)
  const lightingKW = (localZone.sf * localZone.rates.lighting_w_sf) / 1000
  const receptacleKW = (localZone.sf * localZone.rates.receptacle_va_sf) / 1000
  const rateVentCFM = localZone.sf * localZone.rates.ventilation_cfm_sf
  const rateExhaustCFM = localZone.sf * localZone.rates.exhaust_cfm_sf
  const coolingTons = localZone.rates.cooling_sf_ton > 0 ? localZone.sf / localZone.rates.cooling_sf_ton : 0
  const heatingMBH = (localZone.sf * localZone.rates.heating_btuh_sf) / 1000
  
  // 2. FIXTURE-BASED LOADS
  const fixtureExhaustCFM = (defaults.exhaust_cfm_toilet || 0) * localZone.fixtures.wcs +
    (defaults.exhaust_cfm_shower || 0) * localZone.fixtures.showers
  
  // Laundry equipment loads (if laundry zone)
  let laundryKW = 0
  let laundryGasMBH = 0
  let laundryExhaustCFM = 0
  const isGasDryers = localZone.subType === 'gas'
  
  if (defaults.laundry_equipment && (localZone.fixtures.washingMachines > 0 || localZone.fixtures.dryers > 0)) {
    const laundryLoads = calculateLaundryLoads(
      localZone.fixtures.washingMachines || 0,
      localZone.fixtures.dryers || 0,
      isGasDryers ? 'gas' : 'electric',
      localZone.laundryEquipment
    )
    laundryExhaustCFM = laundryLoads.exhaust_cfm
    laundryKW = laundryLoads.washer_kw + (isGasDryers ? 0 : laundryLoads.dryer_kw)
    laundryGasMBH = isGasDryers ? laundryLoads.dryer_gas_mbh : 0
  }
  
  // 3. LINE ITEM TOTALS (the visible equipment!) - SIMPLE MATH!
  const lineItemKW = localZone.lineItems
    .filter(li => li.category === 'power' || li.category === 'lighting')
    .reduce((sum, li) => sum + (li.unit === 'kW' ? li.quantity * li.value : (li.quantity * li.value) / 1000), 0)
  
  const lineItemGasMBH = localZone.lineItems
    .filter(li => li.category === 'gas')
    .reduce((sum, li) => sum + (li.unit === 'MBH' ? li.quantity * li.value : li.quantity * li.value / 1000), 0)
  
  const lineItemVentCFM = localZone.lineItems
    .filter(li => li.category === 'ventilation')
    .reduce((sum, li) => sum + li.quantity * li.value, 0)
  
  const lineItemExhaustCFM = localZone.lineItems
    .filter(li => li.category === 'exhaust')
    .reduce((sum, li) => sum + li.quantity * li.value, 0)
  
  // 4. FINAL TOTALS = Rate-based + Line Items + Fixtures + Laundry
  const totalElecKW = lightingKW + receptacleKW + lineItemKW + laundryKW
  const totalGasMBH = lineItemGasMBH + laundryGasMBH
  const totalVentCFM = rateVentCFM + lineItemVentCFM + laundryExhaustCFM // laundry MUA = exhaust
  const totalExhaustCFM = rateExhaustCFM + fixtureExhaustCFM + lineItemExhaustCFM + laundryExhaustCFM

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Slide-out Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-surface-800 border-l border-surface-700 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-800 border-b border-surface-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: localZone.color }}
            />
            <h2 className="text-lg font-semibold text-white">Edit Zone</h2>
            <span className="text-xs bg-surface-700 px-2 py-1 rounded text-surface-300">
              {defaults.category}
            </span>
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
          {/* Zone Name & Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Zone Name</label>
              <input
                type="text"
                value={localZone.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Square Footage</label>
              <div className="relative">
                <input
                  type="number"
                  value={localZone.sf}
                  onChange={(e) => handleUpdate({ sf: Number(e.target.value) })}
                  min={0}
                  className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 text-sm">SF</span>
              </div>
            </div>
          </div>

          {/* Zone Type Selector */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Zone Type</label>
            <button
              onClick={() => setShowTypeSelector(!showTypeSelector)}
              className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-left flex items-center justify-between"
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

          {/* Sub-Type Toggle for switchable zones */}
          {defaults.switchable && (
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Energy Source</label>
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


          {/* Rate-Based Loads (per SF) */}
          <div>
            <h4 className="text-sm font-medium text-surface-300 mb-3">📐 Rate-Based Loads (per SF)</h4>
            <div className="space-y-2">
              {[
                { key: 'lighting_w_sf', label: 'Lighting', unit: 'W/SF', result: `${lightingKW.toFixed(2)} kW` },
                { key: 'receptacle_va_sf', label: 'Receptacle', unit: 'VA/SF', result: `${receptacleKW.toFixed(2)} kW` },
                { key: 'ventilation_cfm_sf', label: 'Ventilation', unit: 'CFM/SF', result: `${Math.round(rateVentCFM)} CFM` },
                { key: 'exhaust_cfm_sf', label: 'Exhaust', unit: 'CFM/SF', result: `${Math.round(rateExhaustCFM)} CFM` },
                { key: 'cooling_sf_ton', label: 'Cooling', unit: 'SF/Ton', result: coolingTons > 0 ? `${coolingTons.toFixed(2)} Tons` : '—' },
                { key: 'heating_btuh_sf', label: 'Heating', unit: 'BTU/SF', result: heatingMBH > 0 ? `${heatingMBH.toFixed(1)} MBH` : '—' },
              ].map(rate => (
                <div key={rate.key} className="flex items-center gap-2">
                  <label className="w-20 text-sm text-surface-300">{rate.label}</label>
                  <input
                    type="number"
                    value={localZone.rates[rate.key as keyof typeof localZone.rates]}
                    onChange={(e) => handleUpdate({
                      rates: { ...localZone.rates, [rate.key]: Number(e.target.value) }
                    })}
                    step={0.01}
                    min={0}
                    className="flex-1 px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                  />
                  <span className="w-14 text-xs text-surface-400">{rate.unit}</span>
                  <span className="w-20 text-xs text-primary-400 text-right font-mono">{rate.result}</span>
                </div>
              ))}
            </div>
            {isThermalZone && localZone.rates.cooling_sf_ton === 0 && (
              <p className="text-xs text-surface-500 mt-2 italic">
                Note: Thermal zones use process equipment (heaters/chillers), not HVAC cooling.
              </p>
            )}
          </div>

          {/* Fixtures - hide washers/dryers for laundry zones (they're in Equipment section) */}
          <div>
            <h4 className="text-sm font-medium text-surface-300 mb-3">🚿 Fixtures</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'showers', label: 'Showers', icon: '🚿' },
                { key: 'lavs', label: 'Lavs', icon: '🚰' },
                { key: 'wcs', label: 'WCs', icon: '🚽' },
                { key: 'floorDrains', label: 'Floor Drains', icon: '🕳️' },
                { key: 'serviceSinks', label: 'Svc Sinks', icon: '🧹' },
                // Only show washers/dryers if NOT a laundry zone (laundry uses Equipment section)
                ...(!defaults.laundry_equipment ? [
                  { key: 'washingMachines', label: 'Washers', icon: '🧺' },
                  { key: 'dryers', label: 'Dryers', icon: '♨️' },
                ] : []),
              ].map(fixture => (
                <div key={fixture.key}>
                  <label className="text-xs text-surface-400 flex items-center gap-1">
                    <span>{fixture.icon}</span> {fixture.label}
                  </label>
                  <input
                    type="number"
                    value={localZone.fixtures[fixture.key as keyof typeof localZone.fixtures]}
                    onChange={(e) => handleUpdate({
                      fixtures: { ...localZone.fixtures, [fixture.key]: Number(e.target.value) }
                    })}
                    min={0}
                    className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                  />
                </div>
              ))}
            </div>
            {defaults.laundry_equipment && (
              <p className="text-xs text-surface-500 mt-2 italic">
                ℹ️ Washers/Dryers are in the Equipment section above
              </p>
            )}
          </div>

          {/* Line Items */}
          <LineItemsEditor zone={localZone} onUpdate={handleUpdate} />

          {/* Zone Totals Summary - SIMPLE MATH: Rate-based + Line Items! */}
          <div className="bg-gradient-to-br from-primary-900/30 to-surface-900 rounded-lg p-4 border border-primary-500/20">
            <h4 className="text-sm font-semibold text-primary-400 mb-3">📊 Zone Totals</h4>
            
            {/* Electrical */}
            <div className="mb-3 bg-surface-900/50 rounded p-3">
              <div className="text-xs text-surface-500 mb-2 uppercase tracking-wider">⚡ Electrical</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-surface-400">
                  <span>Rate-based ({localZone.rates.lighting_w_sf} + {localZone.rates.receptacle_va_sf} per SF):</span>
                  <span className="font-mono">{(lightingKW + receptacleKW).toFixed(2)} kW</span>
                </div>
                {lineItemKW > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Equipment (Line Items):</span>
                    <span className="font-mono">{lineItemKW.toFixed(2)} kW</span>
                  </div>
                )}
                {laundryKW > 0 && (
                  <div className="flex justify-between text-purple-400">
                    <span>Laundry Equipment:</span>
                    <span className="font-mono">{laundryKW.toFixed(2)} kW</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-surface-700 font-semibold text-white">
                  <span>Total:</span>
                  <span className="font-mono">{totalElecKW.toFixed(1)} kW</span>
                </div>
              </div>
            </div>
            
            {/* Gas */}
            {(totalGasMBH > 0 || lineItemGasMBH > 0) && (
              <div className="mb-3 bg-surface-900/50 rounded p-3">
                <div className="text-xs text-surface-500 mb-2 uppercase tracking-wider">🔥 Gas</div>
                <div className="space-y-1 text-xs">
                  {lineItemGasMBH > 0 && (
                    <div className="flex justify-between text-orange-400">
                      <span>Equipment (Line Items):</span>
                      <span className="font-mono">{lineItemGasMBH.toFixed(0)} MBH</span>
                    </div>
                  )}
                  {laundryGasMBH > 0 && (
                    <div className="flex justify-between text-orange-400">
                      <span>Laundry Dryers:</span>
                      <span className="font-mono">{laundryGasMBH.toFixed(0)} MBH</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-surface-700 font-semibold text-orange-400">
                    <span>Total:</span>
                    <span className="font-mono">{totalGasMBH.toFixed(0)} MBH</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Ventilation / Exhaust */}
            <div className="mb-3 bg-surface-900/50 rounded p-3">
              <div className="text-xs text-surface-500 mb-2 uppercase tracking-wider">💨 Ventilation / Exhaust</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-surface-400">
                    <span>Rate ({localZone.rates.ventilation_cfm_sf}/SF):</span>
                    <span className="font-mono">{Math.round(rateVentCFM)}</span>
                  </div>
                  {lineItemVentCFM > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Line Items:</span>
                      <span className="font-mono">{Math.round(lineItemVentCFM)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-surface-700 font-semibold text-emerald-400">
                    <span>Vent Total:</span>
                    <span className="font-mono">{Math.round(totalVentCFM)} CFM</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-surface-400">
                    <span>Rate ({localZone.rates.exhaust_cfm_sf}/SF):</span>
                    <span className="font-mono">{Math.round(rateExhaustCFM)}</span>
                  </div>
                  {(lineItemExhaustCFM + fixtureExhaustCFM) > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Items+Fixtures:</span>
                      <span className="font-mono">{Math.round(lineItemExhaustCFM + fixtureExhaustCFM)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-surface-700 font-semibold text-amber-400">
                    <span>Exh Total:</span>
                    <span className="font-mono">{Math.round(totalExhaustCFM)} CFM</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* HVAC (Rate-based) */}
            {(coolingTons > 0 || heatingMBH > 0) && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {coolingTons > 0 && (
                  <div className="flex justify-between">
                    <span className="text-surface-400">Cooling:</span>
                    <span className="text-cyan-400 font-mono">{coolingTons.toFixed(1)} Tons</span>
                  </div>
                )}
                {heatingMBH > 0 && (
                  <div className="flex justify-between">
                    <span className="text-surface-400">Heating:</span>
                    <span className="text-red-400 font-mono">{heatingMBH.toFixed(1)} MBH</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Equipment count from Line Items */}
            {localZone.lineItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-surface-700">
                <p className="text-xs text-surface-500">
                  📦 {localZone.lineItems.length} equipment item{localZone.lineItems.length !== 1 ? 's' : ''} in Line Items below
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-surface-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium"
            >
              Done
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
