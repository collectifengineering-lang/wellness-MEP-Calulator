import { useState, useEffect } from 'react'
import LineItemsEditor from './LineItemsEditor'
import { useProjectStore, calculateProcessLoads } from '../../store/useProjectStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { getZoneCategories, getZoneTypesByCategory } from '../../data/zoneDefaults'
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
  const processLoads = localZone.processLoads || defaultProcessLoads

  // Determine which sections to show based on zone type/defaults
  const isThermalZone = defaults.category === 'Thermal'
  const isPoolZone = defaults.category === 'Pool/Spa'
  const hasKwPerCubicMeter = !!defaults.kw_per_cubic_meter
  const hasGasEquipment = localZone.subType === 'gas' || defaults.gas_mbh
  const hasFixedVent = (defaults.ventilation_cfm || 0) > 0 || processLoads.ventilation_cfm > 0
  const hasFixedExhaust = (defaults.exhaust_cfm || 0) > 0 || processLoads.exhaust_cfm > 0
  const hasPoolHeater = isPoolZone || processLoads.pool_heater_mbh > 0
  const hasDehumid = (defaults.dehumidification_lb_hr || 0) > 0 || processLoads.dehumid_lb_hr > 0

  // Calculate zone totals
  const lightingKW = (localZone.sf * localZone.rates.lighting_w_sf) / 1000
  const receptacleKVA = (localZone.sf * localZone.rates.receptacle_va_sf) / 1000
  const rateVentCFM = localZone.sf * localZone.rates.ventilation_cfm_sf
  const totalVentCFM = rateVentCFM + processLoads.ventilation_cfm
  const rateExhaustCFM = localZone.sf * localZone.rates.exhaust_cfm_sf
  const fixtureExhaustCFM = (defaults.exhaust_cfm_toilet || 0) * localZone.fixtures.wcs +
    (defaults.exhaust_cfm_shower || 0) * localZone.fixtures.showers
  const totalExhaustCFM = rateExhaustCFM + processLoads.exhaust_cfm + fixtureExhaustCFM
  const coolingTons = localZone.rates.cooling_sf_ton > 0 ? localZone.sf / localZone.rates.cooling_sf_ton : 0
  const heatingMBH = (localZone.sf * localZone.rates.heating_btuh_sf) / 1000

  // Total electrical = lighting + receptacle + fixed equipment
  const totalElecKW = lightingKW + (receptacleKVA * 0.85) + processLoads.fixed_kw
  const totalGasMBH = processLoads.gas_mbh + processLoads.pool_heater_mbh

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

          {/* PROCESS / EQUIPMENT LOADS - Most important for thermal zones */}
          {(isThermalZone || processLoads.fixed_kw > 0 || processLoads.gas_mbh > 0 || hasPoolHeater) && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                🔥 Process / Equipment Loads
                {hasKwPerCubicMeter && (
                  <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded">Auto-calc from SF</span>
                )}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Fixed kW - for electric heaters */}
                {(localZone.subType === 'electric' || processLoads.fixed_kw > 0) && (
                  <div>
                    <label className="text-xs text-surface-400 flex items-center gap-1">
                      Equipment kW
                      {hasKwPerCubicMeter && <span className="text-amber-400">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={processLoads.fixed_kw}
                        onChange={(e) => handleUpdate({
                          processLoads: { ...processLoads, fixed_kw: Number(e.target.value) }
                        })}
                        min={0}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">kW</span>
                    </div>
                  </div>
                )}
                
                {/* Gas MBH - for gas heaters */}
                {hasGasEquipment && (
                  <div>
                    <label className="text-xs text-surface-400">Gas Load</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={processLoads.gas_mbh}
                        onChange={(e) => handleUpdate({
                          processLoads: { ...processLoads, gas_mbh: Number(e.target.value) }
                        })}
                        min={0}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">MBH</span>
                    </div>
                  </div>
                )}

                {/* Pool heater */}
                {hasPoolHeater && (
                  <div>
                    <label className="text-xs text-surface-400">Pool Heater</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={processLoads.pool_heater_mbh}
                        onChange={(e) => handleUpdate({
                          processLoads: { ...processLoads, pool_heater_mbh: Number(e.target.value) }
                        })}
                        min={0}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">MBH</span>
                    </div>
                  </div>
                )}

                {/* Dehumidification */}
                {hasDehumid && (
                  <div>
                    <label className="text-xs text-surface-400">Dehumidification</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={processLoads.dehumid_lb_hr}
                        onChange={(e) => handleUpdate({
                          processLoads: { ...processLoads, dehumid_lb_hr: Number(e.target.value) }
                        })}
                        min={0}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">lb/hr</span>
                    </div>
                  </div>
                )}

                {/* Ceiling height for ACH calculations */}
                {(isThermalZone || hasKwPerCubicMeter) && (
                  <div>
                    <label className="text-xs text-surface-400">Ceiling Height</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={processLoads.ceiling_height_ft}
                        onChange={(e) => handleUpdate({
                          processLoads: { ...processLoads, ceiling_height_ft: Number(e.target.value) }
                        })}
                        min={7}
                        max={30}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">ft</span>
                    </div>
                  </div>
                )}

                {/* Flue size */}
                {(defaults.flue_size_in || processLoads.flue_size_in > 0) && (
                  <div>
                    <label className="text-xs text-surface-400">Flue Size</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={processLoads.flue_size_in}
                        onChange={(e) => handleUpdate({
                          processLoads: { ...processLoads, flue_size_in: Number(e.target.value) }
                        })}
                        min={0}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">in</span>
                    </div>
                  </div>
                )}
              </div>
              {hasKwPerCubicMeter && (
                <p className="text-xs text-amber-400/70 mt-2">
                  * Auto-calculated: {localZone.sf} SF × {processLoads.ceiling_height_ft} ft = {(localZone.sf * processLoads.ceiling_height_ft * 0.0283168).toFixed(1)} m³ @ 1 kW/m³
                </p>
              )}
            </div>
          )}

          {/* EQUIPMENT ASSUMPTIONS (from cutsheets) */}
          {(defaults.laundry_equipment || defaults.source_notes || defaults.gas_train_size_in) && (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-400 mb-3">📋 Equipment Assumptions</h4>
              
              {/* Laundry Equipment Specs (Editable) */}
              {defaults.laundry_equipment && (
                <div className="space-y-3">
                  {/* Washer Section */}
                  <div className="bg-surface-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">🧺 Washers</span>
                      <span className="text-xs text-surface-400">B&C Tech SP-75</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="text-xs text-surface-400">Quantity</label>
                        <input
                          type="number"
                          value={localZone.fixtures.washingMachines}
                          onChange={(e) => handleUpdate({
                            fixtures: { ...localZone.fixtures, washingMachines: Number(e.target.value) }
                          })}
                          min={0}
                          className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-surface-400">kW each</label>
                        <input
                          type="number"
                          value={localZone.laundryEquipment?.washer_kw ?? defaults.laundry_equipment.washer_kw}
                          onChange={(e) => handleUpdate({
                            laundryEquipment: { 
                              ...(localZone.laundryEquipment || defaults.laundry_equipment),
                              washer_kw: Number(e.target.value)
                            }
                          })}
                          step={0.5}
                          min={0}
                          className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-surface-400">Water GPM</label>
                        <input
                          type="number"
                          value={localZone.laundryEquipment?.washer_water_gpm ?? defaults.laundry_equipment.washer_water_gpm}
                          onChange={(e) => handleUpdate({
                            laundryEquipment: { 
                              ...(localZone.laundryEquipment || defaults.laundry_equipment),
                              washer_water_gpm: Number(e.target.value)
                            }
                          })}
                          step={1}
                          min={0}
                          className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-surface-800/50 rounded p-2">
                      <div className="flex justify-between">
                        <span className="text-surface-400">Total kW:</span>
                        <span className="text-amber-400 font-mono">
                          {(localZone.fixtures.washingMachines * (localZone.laundryEquipment?.washer_kw ?? defaults.laundry_equipment.washer_kw)).toFixed(1)} kW
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-400">Total Water:</span>
                        <span className="text-cyan-400 font-mono">
                          {(localZone.fixtures.washingMachines * (localZone.laundryEquipment?.washer_water_gpm ?? defaults.laundry_equipment.washer_water_gpm)).toFixed(0)} GPM
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dryer Section */}
                  <div className="bg-surface-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">♨️ Dryers</span>
                      <span className="text-xs text-surface-400">Stacker Gas/Electric</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="text-xs text-surface-400">Quantity</label>
                        <input
                          type="number"
                          value={localZone.fixtures.dryers}
                          onChange={(e) => handleUpdate({
                            fixtures: { ...localZone.fixtures, dryers: Number(e.target.value) }
                          })}
                          min={0}
                          className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-surface-400">Gas MBH ea.</label>
                        <input
                          type="number"
                          value={localZone.laundryEquipment?.dryer_gas_mbh ?? defaults.laundry_equipment.dryer_gas_mbh}
                          onChange={(e) => handleUpdate({
                            laundryEquipment: { 
                              ...(localZone.laundryEquipment || defaults.laundry_equipment),
                              dryer_gas_mbh: Number(e.target.value)
                            }
                          })}
                          step={5}
                          min={0}
                          className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-surface-400">Exhaust CFM</label>
                        <input
                          type="number"
                          value={localZone.laundryEquipment?.dryer_exhaust_cfm ?? defaults.laundry_equipment.dryer_exhaust_cfm}
                          onChange={(e) => handleUpdate({
                            laundryEquipment: { 
                              ...(localZone.laundryEquipment || defaults.laundry_equipment),
                              dryer_exhaust_cfm: Number(e.target.value)
                            }
                          })}
                          step={50}
                          min={0}
                          className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="text-xs text-surface-400">kW (elec alt)</label>
                        <input
                          type="number"
                          value={localZone.laundryEquipment?.dryer_kw_electric ?? defaults.laundry_equipment.dryer_kw_electric}
                          onChange={(e) => handleUpdate({
                            laundryEquipment: { 
                              ...(localZone.laundryEquipment || defaults.laundry_equipment),
                              dryer_kw_electric: Number(e.target.value)
                            }
                          })}
                          step={1}
                          min={0}
                          className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-surface-400">MUA sq.in.</label>
                        <input
                          type="number"
                          value={localZone.laundryEquipment?.dryer_mua_sqin ?? defaults.laundry_equipment.dryer_mua_sqin}
                          onChange={(e) => handleUpdate({
                            laundryEquipment: { 
                              ...(localZone.laundryEquipment || defaults.laundry_equipment),
                              dryer_mua_sqin: Number(e.target.value)
                            }
                          })}
                          step={10}
                          min={0}
                          className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => handleUpdate({ laundryEquipment: undefined })}
                          className="w-full px-2 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded"
                        >
                          Reset Defaults
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-surface-800/50 rounded p-2">
                      <div className="flex justify-between">
                        <span className="text-surface-400">Total Gas:</span>
                        <span className="text-orange-400 font-mono">
                          {(localZone.fixtures.dryers * (localZone.laundryEquipment?.dryer_gas_mbh ?? defaults.laundry_equipment.dryer_gas_mbh)).toFixed(0)} MBH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-400">Total Exhaust:</span>
                        <span className="text-cyan-400 font-mono">
                          {(localZone.fixtures.dryers * (localZone.laundryEquipment?.dryer_exhaust_cfm ?? defaults.laundry_equipment.dryer_exhaust_cfm)).toLocaleString()} CFM
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-400">Alt Electric:</span>
                        <span className="text-amber-400 font-mono">
                          {(localZone.fixtures.dryers * (localZone.laundryEquipment?.dryer_kw_electric ?? defaults.laundry_equipment.dryer_kw_electric)).toFixed(0)} kW
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-400">MUA Opening:</span>
                        <span className="text-white font-mono">
                          {(localZone.fixtures.dryers * (localZone.laundryEquipment?.dryer_mua_sqin ?? defaults.laundry_equipment.dryer_mua_sqin)).toLocaleString()} sq.in.
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {defaults.requires_standby_power && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/30 px-3 py-2 rounded-lg">
                      <span>⚠️</span>
                      <span>Standby power required for dryer exhaust fans</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Thermal Zone Furnace/Heater Specs */}
              {(defaults.gas_train_size_in || defaults.gas_pressure_wc || (defaults.gas_mbh && defaults.category === 'Thermal')) && (
                <div className="bg-surface-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {localZone.type.includes('banya') ? '🔥 Banya Furnace' : 
                       localZone.type.includes('sauna') ? '🔥 Sauna Heater' : '🔥 Heating Equipment'}
                    </span>
                    <span className="text-xs text-surface-400">
                      {defaults.source_notes?.split(';')[0] || 'See notes'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {defaults.gas_mbh && localZone.subType === 'gas' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-surface-400">Gas input:</span>
                          <span className="text-orange-400 font-mono">{defaults.gas_mbh} MBH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-surface-400">CFH:</span>
                          <span className="text-white font-mono">{defaults.gas_mbh} CFH</span>
                        </div>
                      </>
                    )}
                    {defaults.gas_train_size_in && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Gas train:</span>
                        <span className="text-white font-mono">{defaults.gas_train_size_in}" pipe</span>
                      </div>
                    )}
                    {defaults.gas_pressure_wc && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Gas pressure:</span>
                        <span className="text-white font-mono">{defaults.gas_pressure_wc}" W.C.</span>
                      </div>
                    )}
                    {defaults.flue_size_in && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Flue size:</span>
                        <span className="text-white font-mono">{defaults.flue_size_in}" dia.</span>
                      </div>
                    )}
                    {defaults.fixed_kw && localZone.subType === 'electric' && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-surface-400">Electric heater:</span>
                        <span className="text-amber-400 font-mono">{processLoads.fixed_kw} kW</span>
                      </div>
                    )}
                    {defaults.ventilation_cfm && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Ventilation:</span>
                        <span className="text-cyan-400 font-mono">{defaults.ventilation_cfm} CFM</span>
                      </div>
                    )}
                    {defaults.exhaust_cfm && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Exhaust:</span>
                        <span className="text-cyan-400 font-mono">{defaults.exhaust_cfm} CFM</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Kitchen Equipment */}
              {(defaults.requires_type1_hood || defaults.requires_mau || defaults.grease_interceptor_gal) && (
                <div className="bg-surface-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">🍳 Kitchen Equipment</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {defaults.requires_type1_hood && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Hood type:</span>
                        <span className="text-white font-mono">Type 1 (grease)</span>
                      </div>
                    )}
                    {defaults.mau_cfm && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Make-up air:</span>
                        <span className="text-cyan-400 font-mono">{defaults.mau_cfm.toLocaleString()} CFM</span>
                      </div>
                    )}
                    {defaults.gas_mbh && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Kitchen gas:</span>
                        <span className="text-orange-400 font-mono">{defaults.gas_mbh} MBH</span>
                      </div>
                    )}
                    {defaults.grease_interceptor_gal && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Grease interceptor:</span>
                        <span className="text-white font-mono">{defaults.grease_interceptor_gal} gal</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Pool Equipment */}
              {defaults.pool_heater_gas_mbh && (
                <div className="bg-surface-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">🏊 Pool Equipment</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-surface-400">Pool heater:</span>
                      <span className="text-orange-400 font-mono">{defaults.pool_heater_gas_mbh} MBH</span>
                    </div>
                    {defaults.dehumidification_lb_hr && (
                      <div className="flex justify-between">
                        <span className="text-surface-400">Dehumidification:</span>
                        <span className="text-white font-mono">{defaults.dehumidification_lb_hr} lb/hr</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Source Notes */}
              {defaults.source_notes && (
                <p className="text-xs text-surface-400 mt-2 italic">
                  📝 {defaults.source_notes}
                </p>
              )}
            </div>
          )}

          {/* VENTILATION / EXHAUST - Fixed amounts */}
          {(hasFixedVent || hasFixedExhaust) && (
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3">💨 Fixed Ventilation / Exhaust</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-surface-400">Fixed Ventilation</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={processLoads.ventilation_cfm}
                      onChange={(e) => handleUpdate({
                        processLoads: { ...processLoads, ventilation_cfm: Number(e.target.value) }
                      })}
                      min={0}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">CFM</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-surface-400">Fixed Exhaust</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={processLoads.exhaust_cfm}
                      onChange={(e) => handleUpdate({
                        processLoads: { ...processLoads, exhaust_cfm: Number(e.target.value) }
                      })}
                      min={0}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">CFM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rate-Based Loads (per SF) */}
          <div>
            <h4 className="text-sm font-medium text-surface-300 mb-3">📐 Rate-Based Loads (per SF)</h4>
            <div className="space-y-2">
              {[
                { key: 'lighting_w_sf', label: 'Lighting', unit: 'W/SF', result: `${lightingKW.toFixed(2)} kW` },
                { key: 'receptacle_va_sf', label: 'Receptacle', unit: 'VA/SF', result: `${receptacleKVA.toFixed(2)} kVA` },
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

          {/* Fixtures */}
          <div>
            <h4 className="text-sm font-medium text-surface-300 mb-3">🚿 Fixtures</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'showers', label: 'Showers', icon: '🚿' },
                { key: 'lavs', label: 'Lavs', icon: '🚰' },
                { key: 'wcs', label: 'WCs', icon: '🚽' },
                { key: 'floorDrains', label: 'Floor Drains', icon: '🕳️' },
                { key: 'serviceSinks', label: 'Svc Sinks', icon: '🧹' },
                { key: 'washingMachines', label: 'Washers', icon: '🧺' },
                { key: 'dryers', label: 'Dryers', icon: '♨️' },
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
          </div>

          {/* Line Items */}
          <LineItemsEditor zone={localZone} onUpdate={handleUpdate} />

          {/* Zone Totals Summary */}
          <div className="bg-gradient-to-br from-primary-900/30 to-surface-900 rounded-lg p-4 border border-primary-500/20">
            <h4 className="text-sm font-semibold text-primary-400 mb-3">📊 Zone Totals</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Electrical:</span>
                <span className="text-white font-mono">{totalElecKW.toFixed(1)} kW</span>
              </div>
              {totalGasMBH > 0 && (
                <div className="flex justify-between">
                  <span className="text-surface-400">Gas:</span>
                  <span className="text-white font-mono">{totalGasMBH.toFixed(0)} MBH</span>
                </div>
              )}
              {coolingTons > 0 && (
                <div className="flex justify-between">
                  <span className="text-surface-400">HVAC Cooling:</span>
                  <span className="text-white font-mono">{coolingTons.toFixed(1)} Tons</span>
                </div>
              )}
              {heatingMBH > 0 && (
                <div className="flex justify-between">
                  <span className="text-surface-400">HVAC Heating:</span>
                  <span className="text-white font-mono">{heatingMBH.toFixed(1)} MBH</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-surface-400">Ventilation:</span>
                <span className="text-white font-mono">{totalVentCFM.toLocaleString()} CFM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Exhaust:</span>
                <span className="text-white font-mono">{totalExhaustCFM.toLocaleString()} CFM</span>
              </div>
              {processLoads.fixed_kw > 0 && (
                <div className="flex justify-between col-span-2 pt-2 border-t border-surface-700">
                  <span className="text-amber-400">Equipment Load:</span>
                  <span className="text-amber-400 font-mono">{processLoads.fixed_kw} kW</span>
                </div>
              )}
            </div>
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
