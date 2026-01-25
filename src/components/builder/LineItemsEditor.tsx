import { useState } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
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

export default function LineItemsEditor({ zone }: LineItemsEditorProps) {
  const { addLineItem, deleteLineItem } = useProjectStore()
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState({
    category: 'power' as LineItem['category'],
    name: '',
    quantity: 1,
    unit: 'kW',
    value: 0,
  })

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
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        )}
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
        <p className="text-xs text-surface-500 italic">
          No line items. Add specific equipment that isn't covered by rate-based calculations.
        </p>
      )}
    </div>
  )
}
