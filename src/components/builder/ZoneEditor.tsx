import { useState, useEffect, useMemo } from 'react'
import LineItemsEditor from './LineItemsEditor'
import { AddFixtureModal } from './AddFixtureModal'
import { useProjectStore, calculateProcessLoads } from '../../store/useProjectStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { getZoneCategories, getZoneTypesByCategory } from '../../data/zoneDefaults'
import { getFixtureById, LEGACY_FIXTURE_MAPPING } from '../../data/nycFixtures'
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
  const [showAddFixtureModal, setShowAddFixtureModal] = useState(false)

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
  
  // 2. FIXTURE-BASED LOADS (using new fixture IDs, with legacy fallback)
  const getFixtureCount = (newId: string, legacyId?: string): number => {
    // Try new ID first, then legacy ID for backwards compatibility
    return localZone.fixtures[newId] || (legacyId ? localZone.fixtures[legacyId] : 0) || 0
  }
  const wcCount = getFixtureCount('water_closet_tank', 'wcs') + getFixtureCount('water_closet_valve')
  const showerCount = getFixtureCount('shower', 'showers')
  const fixtureExhaustCFM = (defaults.exhaust_cfm_toilet || 0) * wcCount +
    (defaults.exhaust_cfm_shower || 0) * showerCount
  
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
  
  const lineItemDehumidLbHr = localZone.lineItems
    .filter(li => li.category === 'dehumidification')
    .reduce((sum, li) => sum + li.quantity * li.value, 0)
  
  const lineItemCoolingTons = localZone.lineItems
    .filter(li => li.category === 'cooling')
    .reduce((sum, li) => sum + li.quantity * li.value, 0)
  
  const lineItemPoolChillerTons = localZone.lineItems
    .filter(li => li.category === 'pool_chiller')
    .reduce((sum, li) => sum + li.quantity * li.value, 0)
  
  const lineItemHeatingMBH = localZone.lineItems
    .filter(li => li.category === 'heating')
    .reduce((sum, li) => sum + li.quantity * li.value, 0)
  
  // 4. FINAL TOTALS = Rate-based + Line Items + Fixtures
  // ALL equipment (including laundry) should be in Line Items!
  const totalElecKW = lightingKW + receptacleKW + lineItemKW
  const totalGasMBH = lineItemGasMBH
  const totalVentCFM = rateVentCFM + lineItemVentCFM
  const totalExhaustCFM = rateExhaustCFM + fixtureExhaustCFM + lineItemExhaustCFM

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

          {/* Fixtures - Dynamic based on zone type and existing fixtures */}
          <DynamicFixturesSection
            fixtures={localZone.fixtures}
            visibleFixtures={defaults.visibleFixtures || []}
            onUpdate={(newFixtures) => handleUpdate({ fixtures: newFixtures })}
            onShowAddModal={() => setShowAddFixtureModal(true)}
            hasLaundryEquipment={!!defaults.laundry_equipment}
          />

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
            
            {/* HVAC & Equipment */}
            {(coolingTons > 0 || heatingMBH > 0 || lineItemCoolingTons > 0 || lineItemHeatingMBH > 0 || lineItemPoolChillerTons > 0 || lineItemDehumidLbHr > 0) && (
              <div className="mb-3 bg-surface-900/50 rounded p-3">
                <div className="text-xs text-surface-500 mb-2 uppercase tracking-wider">❄️ HVAC / Equipment</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Cooling column */}
                  <div className="space-y-1">
                    {coolingTons > 0 && (
                      <div className="flex justify-between text-surface-400">
                        <span>Space Cooling:</span>
                        <span className="font-mono">{coolingTons.toFixed(1)} tons</span>
                      </div>
                    )}
                    {lineItemCoolingTons > 0 && (
                      <div className="flex justify-between text-cyan-400">
                        <span>+ Line Items:</span>
                        <span className="font-mono">{lineItemCoolingTons.toFixed(1)} tons</span>
                      </div>
                    )}
                    {lineItemPoolChillerTons > 0 && (
                      <div className="flex justify-between text-blue-400">
                        <span>Pool Chiller:</span>
                        <span className="font-mono">{lineItemPoolChillerTons.toFixed(1)} tons</span>
                      </div>
                    )}
                  </div>
                  {/* Heating/Other column */}
                  <div className="space-y-1">
                    {(heatingMBH > 0 || lineItemHeatingMBH > 0) && (
                      <div className="flex justify-between text-orange-400">
                        <span>Heating:</span>
                        <span className="font-mono">{(heatingMBH + lineItemHeatingMBH).toFixed(1)} MBH</span>
                      </div>
                    )}
                    {lineItemDehumidLbHr !== 0 && (
                      <div className={`flex justify-between ${lineItemDehumidLbHr < 0 ? 'text-blue-400' : 'text-cyan-400'}`}>
                        <span>{lineItemDehumidLbHr < 0 ? 'Condensation:' : 'Dehumid:'}</span>
                        <span className="font-mono">{lineItemDehumidLbHr.toFixed(0)} lb/hr</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Equipment count from Line Items */}
            {localZone.lineItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-surface-700">
                <p className="text-xs text-surface-500">
                  📦 {localZone.lineItems.length} equipment item{localZone.lineItems.length !== 1 ? 's' : ''} in Line Items
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

      {/* Add Fixture Modal */}
      <AddFixtureModal
        isOpen={showAddFixtureModal}
        onClose={() => setShowAddFixtureModal(false)}
        existingFixtures={localZone.fixtures}
        onAddFixture={(fixtureId, count) => {
          const newFixtures = { ...localZone.fixtures }
          if (count > 0) {
            newFixtures[fixtureId] = count
          } else {
            delete newFixtures[fixtureId]
          }
          handleUpdate({ fixtures: newFixtures })
        }}
      />
    </>
  )
}

// Dynamic Fixtures Section Component
interface DynamicFixturesSectionProps {
  fixtures: Record<string, number>
  visibleFixtures: string[]
  onUpdate: (fixtures: Record<string, number>) => void
  onShowAddModal: () => void
  hasLaundryEquipment: boolean
}

function DynamicFixturesSection({ 
  fixtures, 
  visibleFixtures, 
  onUpdate, 
  onShowAddModal,
  hasLaundryEquipment 
}: DynamicFixturesSectionProps) {
  // Get all fixture IDs to display:
  // 1. Fixtures that have counts > 0
  // 2. Fixtures in visibleFixtures (even if count is 0)
  // 3. Legacy fixture IDs with counts > 0 (for backwards compatibility)
  const displayedFixtureIds = useMemo(() => {
    const ids = new Set<string>()
    
    // Add visible fixtures from zone defaults
    visibleFixtures.forEach(id => ids.add(id))
    
    // Add fixtures with counts > 0
    Object.entries(fixtures).forEach(([id, count]) => {
      if (count > 0) {
        // Check if it's a legacy ID and convert to new ID
        const newId = LEGACY_FIXTURE_MAPPING[id] || id
        ids.add(newId)
      }
    })
    
    return Array.from(ids)
  }, [fixtures, visibleFixtures])

  // Get fixture info for display
  const displayedFixtures = displayedFixtureIds
    .map(id => {
      const def = getFixtureById(id)
      if (!def) return null
      // Get count from new ID or legacy ID
      const legacyId = Object.entries(LEGACY_FIXTURE_MAPPING).find(([_, newId]) => newId === id)?.[0]
      const count = fixtures[id] || (legacyId ? fixtures[legacyId] : 0) || 0
      return { ...def, count }
    })
    .filter(Boolean) as Array<{ id: string; name: string; icon: string; count: number; wsfuTotal: number; dfu: number }>

  // Handle fixture removal (set to 0)
  const handleRemoveFixture = (fixtureId: string) => {
    const newFixtures = { ...fixtures }
    delete newFixtures[fixtureId]
    // Also check for legacy ID
    const legacyId = Object.entries(LEGACY_FIXTURE_MAPPING).find(([_, newId]) => newId === fixtureId)?.[0]
    if (legacyId) delete newFixtures[legacyId]
    onUpdate(newFixtures)
  }

  // Individual fixture row with local state for better editing
  const FixtureRow = ({ 
    fixture, 
    fixtures, 
    onUpdate, 
    onRemove 
  }: { 
    fixture: { id: string; name: string; icon: string; count: number; wsfuTotal: number; dfu: number }
    fixtures: Record<string, number>
    onUpdate: (fixtures: Record<string, number>) => void
    onRemove: () => void
  }) => {
    const [localValue, setLocalValue] = useState(fixture.count.toString())
    
    // Sync local value when fixture count changes from outside
    useEffect(() => {
      setLocalValue(fixture.count.toString())
    }, [fixture.count])
    
    const handleBlur = () => {
      const newCount = parseInt(localValue) || 0
      if (newCount > 0) {
        onUpdate({ ...fixtures, [fixture.id]: newCount })
      } else {
        // Don't auto-remove on blur, just set to 0
        setLocalValue('0')
        onUpdate({ ...fixtures, [fixture.id]: 0 })
      }
    }
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur()
      }
    }
    
    return (
      <div className="flex items-center gap-2 bg-surface-800 rounded-lg p-2">
        <span className="text-lg">{fixture.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white truncate">{fixture.name}</div>
          <div className="text-[10px] text-surface-500">
            WSFU: {fixture.wsfuTotal} | DFU: {fixture.dfu}
          </div>
        </div>
        <input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={0}
          className="w-14 px-2 py-1 bg-surface-900 border border-surface-600 rounded text-white text-sm text-center focus:border-primary-500 focus:outline-none"
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onRemove()
          }}
          className="p-1 hover:bg-surface-700 rounded text-surface-500 hover:text-red-400 transition-colors"
          title="Remove fixture"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-surface-300">🚿 Fixtures</h4>
        <button
          onClick={onShowAddModal}
          className="px-2 py-1 text-xs bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded flex items-center gap-1"
        >
          <span>+</span> Add Fixture
        </button>
      </div>
      
      {displayedFixtures.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {displayedFixtures.map(fixture => (
            <FixtureRow
              key={fixture.id}
              fixture={fixture}
              fixtures={fixtures}
              onUpdate={onUpdate}
              onRemove={() => handleRemoveFixture(fixture.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-surface-500 text-sm">
          <p>No fixtures assigned</p>
          <button
            onClick={onShowAddModal}
            className="mt-2 text-primary-400 hover:text-primary-300 underline"
          >
            Add fixtures from NYC Plumbing Code
          </button>
        </div>
      )}
      
      {hasLaundryEquipment && (
        <p className="text-xs text-surface-500 mt-2 italic">
          ℹ️ Commercial washers/dryers should be added via Equipment line items
        </p>
      )}
    </div>
  )
}
