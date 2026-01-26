import { useState } from 'react'
import { useProjectStore, generateDefaultLineItems } from '../../store/useProjectStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import type { Zone, LineItem } from '../../types'

interface LineItemsEditorProps {
  zone: Zone
  onUpdate?: (updates: Partial<Zone>) => void
}

const categoryOptions = [
  { value: 'lighting', label: '💡 Lighting', unit: 'kW' },
  { value: 'power', label: '🔌 Power', unit: 'kW' },
  { value: 'ventilation', label: '🌬️ Ventilation', unit: 'CFM' },
  { value: 'exhaust', label: '💨 Exhaust', unit: 'CFM' },
  { value: 'cooling', label: '❄️ Cooling', unit: 'Tons' },
  { value: 'heating', label: '🔥 Heating', unit: 'MBH' },
  { value: 'gas', label: '⛽ Gas', unit: 'MBH' },
  { value: 'other', label: '📦 Other', unit: '' },
] as const

export default function LineItemsEditor({ zone, onUpdate }: LineItemsEditorProps) {
  const { addLineItem, deleteLineItem, updateZone } = useProjectStore()
  const { getZoneDefaults } = useSettingsStore()
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState({
    category: 'power' as LineItem['category'],
    name: '',
    quantity: 1,
    unit: 'kW',
    value: 0,
  })

  // Regenerate default line items from zone defaults
  const handleResetToDefaults = () => {
    if (!confirm('This will replace all current line items with default equipment. Continue?')) return
    
    const defaults = getZoneDefaults(zone.type)
    const defaultItems = generateDefaultLineItems(defaults, zone.sf, zone.subType)
    
    // Update zone with new line items
    updateZone(zone.id, { lineItems: defaultItems })
    if (onUpdate) {
      onUpdate({ lineItems: defaultItems })
    }
  }

  const handleAddItem = () => {
    if (!newItem.name.trim()) return
    addLineItem(zone.id, {
      category: newItem.category,
      name: newItem.name.trim(),
      quantity: newItem.quantity,
      unit: newItem.unit,
      value: newItem.value,
    })
    setNewItem({
      category: 'power',
      name: '',
      quantity: 1,
      unit: 'kW',
      value: 0,
    })
    setIsAdding(false)
  }

  const handleCategoryChange = (category: LineItem['category']) => {
    const defaultUnit = categoryOptions.find(c => c.value === category)?.unit || ''
    setNewItem({ ...newItem, category, unit: defaultUnit })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-surface-300">Line Items (Specific Equipment)</label>
        <div className="flex items-center gap-2">
          {!isAdding && (
            <>
              <button
                onClick={handleResetToDefaults}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                title="Reset to default equipment for this zone type"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Defaults
              </button>
              <button
                onClick={() => setIsAdding(true)}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </>
          )}
        </div>
      </div>

      {/* Existing Line Items */}
      <div className="space-y-2">
        {zone.lineItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 p-2 bg-surface-900 rounded-lg">
            <span className="text-xs px-2 py-1 bg-surface-700 rounded">
              {categoryOptions.find(c => c.value === item.category)?.label.split(' ')[0]}
            </span>
            <span className="flex-1 text-sm text-white truncate">{item.name}</span>
            <span className="text-sm text-surface-400">
              {item.quantity} × {item.value} {item.unit}
            </span>
            <button
              onClick={() => deleteLineItem(zone.id, item.id)}
              className="p-1 hover:bg-surface-700 rounded"
            >
              <svg className="w-4 h-4 text-surface-500 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add New Item Form */}
      {isAdding && (
        <div className="mt-3 p-4 bg-surface-900 rounded-lg border border-surface-600 space-y-3">
          {/* Category */}
          <div>
            <label className="text-xs text-surface-400 mb-1 block">Category</label>
            <select
              value={newItem.category}
              onChange={(e) => handleCategoryChange(e.target.value as LineItem['category'])}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
            >
              {categoryOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-surface-400 mb-1 block">Equipment Name</label>
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g., Exhaust Fan EF-1"
              className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white text-sm"
            />
          </div>

          {/* Quantity, Value, Unit */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Qty</label>
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
                <option value="HP">HP</option>
                <option value="CFM">CFM</option>
                <option value="Tons">Tons</option>
                <option value="MBH">MBH</option>
                <option value="BTU">BTU</option>
                <option value="CFH">CFH</option>
                <option value="GPM">GPM</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 px-3 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              disabled={!newItem.name.trim()}
              className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 text-white rounded-lg text-sm"
            >
              Add Item
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {zone.lineItems.length === 0 && !isAdding && (
        <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <p className="text-xs text-amber-400 mb-2">
            ⚠️ No equipment line items! Click "Reset Defaults" to load default equipment for this zone type.
          </p>
          <button
            onClick={handleResetToDefaults}
            className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium"
          >
            Load Default Equipment
          </button>
        </div>
      )}
      
      {/* Line Item Totals - Show what adds up */}
      {zone.lineItems.length > 0 && (
        <div className="mt-3 p-3 bg-surface-900/80 border border-surface-600 rounded-lg">
          <div className="text-xs text-surface-500 mb-2 uppercase tracking-wider font-medium">
            📊 Line Items Total (Equipment Only)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(() => {
              const elecKW = zone.lineItems
                .filter(li => li.category === 'power' || li.category === 'lighting')
                .reduce((sum, li) => sum + (li.unit === 'kW' ? li.quantity * li.value : (li.quantity * li.value) / 1000), 0)
              const gasMBH = zone.lineItems
                .filter(li => li.category === 'gas')
                .reduce((sum, li) => sum + (li.unit === 'MBH' ? li.quantity * li.value : li.quantity * li.value / 1000), 0)
              const ventCFM = zone.lineItems
                .filter(li => li.category === 'ventilation')
                .reduce((sum, li) => sum + li.quantity * li.value, 0)
              const exhCFM = zone.lineItems
                .filter(li => li.category === 'exhaust')
                .reduce((sum, li) => sum + li.quantity * li.value, 0)
              
              return (
                <>
                  {elecKW > 0 && (
                    <div className="flex justify-between">
                      <span className="text-surface-400">⚡ Electrical:</span>
                      <span className="text-white font-mono">{elecKW.toFixed(1)} kW</span>
                    </div>
                  )}
                  {gasMBH > 0 && (
                    <div className="flex justify-between">
                      <span className="text-surface-400">🔥 Gas:</span>
                      <span className="text-orange-400 font-mono">{gasMBH.toFixed(0)} MBH</span>
                    </div>
                  )}
                  {ventCFM > 0 && (
                    <div className="flex justify-between">
                      <span className="text-surface-400">🌬️ Ventilation:</span>
                      <span className="text-emerald-400 font-mono">{Math.round(ventCFM)} CFM</span>
                    </div>
                  )}
                  {exhCFM > 0 && (
                    <div className="flex justify-between">
                      <span className="text-surface-400">💨 Exhaust:</span>
                      <span className="text-amber-400 font-mono">{Math.round(exhCFM)} CFM</span>
                    </div>
                  )}
                  {elecKW === 0 && gasMBH === 0 && ventCFM === 0 && exhCFM === 0 && (
                    <div className="col-span-2 text-surface-500 italic">No utility loads in line items</div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
