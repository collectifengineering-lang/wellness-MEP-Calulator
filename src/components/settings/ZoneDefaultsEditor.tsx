import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettingsStore } from '../../store/useSettingsStore'
import { zoneDefaults as builtInDefaults } from '../../data/zoneDefaults'
import type { ZoneDefaults } from '../../data/zoneDefaults'

// Equipment categories with display info
const equipmentCategories = [
  { value: 'power', label: '⚡ Power (kW)', defaultUnit: 'kW' },
  { value: 'lighting', label: '💡 Lighting (kW)', defaultUnit: 'kW' },
  { value: 'gas', label: '🔥 Gas (MBH)', defaultUnit: 'MBH' },
  { value: 'ventilation', label: '🌬️ Ventilation (CFM)', defaultUnit: 'CFM' },
  { value: 'exhaust', label: '💨 Exhaust (CFM)', defaultUnit: 'CFM' },
  { value: 'cooling', label: '❄️ Cooling (Tons)', defaultUnit: 'Tons' },
  { value: 'heating', label: '🔥 Heating (MBH)', defaultUnit: 'MBH' },
  { value: 'other', label: '📦 Other', defaultUnit: '' },
] as const

type EquipmentCategory = typeof equipmentCategories[number]['value']

interface DefaultEquipmentItem {
  id: string
  category: EquipmentCategory
  name: string
  quantity: number
  unit: string
  value: number
  notes?: string
}

// Sub-component for editing default equipment
function DefaultEquipmentEditor({ 
  equipment, 
  onChange,
  zoneName 
}: { 
  equipment: DefaultEquipmentItem[]
  onChange: (equipment: DefaultEquipmentItem[]) => void
  zoneName: string
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState<Omit<DefaultEquipmentItem, 'id'>>({
    category: 'power',
    name: '',
    quantity: 1,
    unit: 'kW',
    value: 0,
  })

  const handleAdd = () => {
    if (!newItem.name.trim()) return
    onChange([...equipment, { ...newItem, id: uuidv4() }])
    setNewItem({ category: 'power', name: '', quantity: 1, unit: 'kW', value: 0 })
    setIsAdding(false)
  }

  const handleDelete = (id: string) => {
    onChange(equipment.filter(e => e.id !== id))
  }

  const handleUpdate = (id: string, updates: Partial<DefaultEquipmentItem>) => {
    onChange(equipment.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const handleCategoryChange = (category: EquipmentCategory) => {
    const defaultUnit = equipmentCategories.find(c => c.value === category)?.defaultUnit || ''
    setNewItem({ ...newItem, category, unit: defaultUnit })
  }

  return (
    <div className="bg-gradient-to-br from-primary-900/30 to-surface-900 border border-primary-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-primary-400">📦 Default Equipment</h3>
          <p className="text-xs text-surface-400 mt-0.5">Equipment auto-added when creating new "{zoneName}" zones</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Equipment
          </button>
        )}
      </div>

      {/* Existing Equipment - FULLY EDITABLE */}
      {equipment.length > 0 ? (
        <div className="space-y-2 mb-3">
          {equipment.map((item) => (
            <div key={item.id} className="p-2 bg-surface-900 rounded-lg space-y-2">
              {/* Row 1: Category + Name */}
              <div className="flex items-center gap-2">
                <select
                  value={item.category}
                  onChange={(e) => handleUpdate(item.id, { category: e.target.value as EquipmentCategory })}
                  className="text-xs px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white"
                >
                  {equipmentCategories.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdate(item.id, { name: e.target.value })}
                  className="flex-1 px-2 py-1 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                />
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 hover:bg-surface-700 rounded"
                >
                  <svg className="w-4 h-4 text-surface-500 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Row 2: Quantity × Value Unit = Total */}
              <div className="flex items-center gap-2 pl-2">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleUpdate(item.id, { quantity: Number(e.target.value) || 1 })}
                  min={1}
                  className="w-14 px-2 py-1 bg-surface-800 border border-surface-600 rounded text-white text-sm text-center"
                />
                <span className="text-surface-500 text-sm">×</span>
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => handleUpdate(item.id, { value: Number(e.target.value) || 0 })}
                  min={0}
                  step={0.1}
                  className="w-20 px-2 py-1 bg-surface-800 border border-surface-600 rounded text-white text-sm text-right"
                />
                <select
                  value={item.unit}
                  onChange={(e) => handleUpdate(item.id, { unit: e.target.value })}
                  className="px-2 py-1 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                >
                  <option value="kW">kW</option>
                  <option value="W">W</option>
                  <option value="MBH">MBH</option>
                  <option value="CFM">CFM</option>
                  <option value="Tons">Tons</option>
                  <option value="GPM">GPM</option>
                  <option value="lb/hr">lb/hr</option>
                </select>
                <span className="text-xs text-surface-500">
                  = {(item.quantity * item.value).toFixed(1)} {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : !isAdding && (
        <p className="text-xs text-surface-500 italic mb-3">
          No default equipment. Equipment will be generated from fixed load fields above.
        </p>
      )}

      {/* Add New Item Form */}
      {isAdding && (
        <div className="p-3 bg-surface-900 rounded-lg border border-surface-600 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Category</label>
              <select
                value={newItem.category}
                onChange={(e) => handleCategoryChange(e.target.value as EquipmentCategory)}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
              >
                {equipmentCategories.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Equipment Name</label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g., Pool Heater"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Quantity</label>
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                min={1}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Value</label>
              <input
                type="number"
                value={newItem.value}
                onChange={(e) => setNewItem({ ...newItem, value: Number(e.target.value) })}
                min={0}
                step={0.1}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Unit</label>
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
              >
                <option value="kW">kW</option>
                <option value="W">W</option>
                <option value="MBH">MBH</option>
                <option value="CFM">CFM</option>
                <option value="Tons">Tons</option>
                <option value="GPM">GPM</option>
                <option value="lb/hr">lb/hr</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 px-3 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newItem.name.trim()}
              className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 text-white rounded-lg text-sm"
            >
              Add Equipment
            </button>
          </div>
        </div>
      )}

      {/* Equipment Total Preview */}
      {equipment.length > 0 && (
        <div className="mt-3 pt-3 border-t border-surface-700">
          <div className="text-xs text-surface-500 mb-2">Total Default Loads:</div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {(() => {
              const elecKW = equipment
                .filter(e => e.category === 'power' || e.category === 'lighting')
                .reduce((sum, e) => sum + (e.unit === 'kW' ? e.quantity * e.value : (e.quantity * e.value) / 1000), 0)
              const gasMBH = equipment
                .filter(e => e.category === 'gas')
                .reduce((sum, e) => sum + e.quantity * e.value, 0)
              const ventCFM = equipment
                .filter(e => e.category === 'ventilation')
                .reduce((sum, e) => sum + e.quantity * e.value, 0)
              const exhCFM = equipment
                .filter(e => e.category === 'exhaust')
                .reduce((sum, e) => sum + e.quantity * e.value, 0)
              return (
                <>
                  {elecKW > 0 && <span className="text-amber-400">⚡ {elecKW.toFixed(1)} kW</span>}
                  {gasMBH > 0 && <span className="text-orange-400">🔥 {gasMBH.toFixed(0)} MBH</span>}
                  {ventCFM > 0 && <span className="text-emerald-400">🌬️ {Math.round(ventCFM)} CFM</span>}
                  {exhCFM > 0 && <span className="text-cyan-400">💨 {Math.round(exhCFM)} CFM</span>}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

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
    isCustomZoneType,
    customZoneDefaults  // Subscribe to changes in custom defaults
  } = useSettingsStore()
  
  const isCustom = isCustomZoneType(zoneTypeId)
  const builtInDefault = builtInDefaults[zoneTypeId as keyof typeof builtInDefaults]
  const currentDefaults = getZoneDefaults(zoneTypeId)
  
  const [localDefaults, setLocalDefaults] = useState<ZoneDefaults>(currentDefaults)
  const [isSaving, setIsSaving] = useState(false)

  // Update local state when store changes OR when zoneTypeId changes
  useEffect(() => {
    const freshDefaults = getZoneDefaults(zoneTypeId)
    setLocalDefaults(freshDefaults)
  }, [zoneTypeId, customZoneDefaults])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Make a clean copy to avoid any reference issues
      const toSave = JSON.parse(JSON.stringify(localDefaults))
      console.log('Saving zone defaults:', zoneTypeId, toSave)
      updateZoneDefaults(zoneTypeId, toSave)
      // Give the store time to persist
      await new Promise(resolve => setTimeout(resolve, 100))
      onClose()
    } catch (error) {
      console.error('Failed to save zone defaults:', error)
      alert('Failed to save! Check console for details.')
    } finally {
      setIsSaving(false)
    }
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

          {/* DEFAULT EQUIPMENT - Most Important Section! */}
          <DefaultEquipmentEditor 
            equipment={(localDefaults.defaultEquipment || []).map(e => ({ ...e, id: e.id || uuidv4() }))}
            onChange={(equipment) => updateField('defaultEquipment', equipment.length > 0 ? equipment : undefined)}
            zoneName={localDefaults.displayName}
          />
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
              disabled={isSaving}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 text-white rounded-lg text-sm font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
