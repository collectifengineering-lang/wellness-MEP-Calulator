import { useState, useMemo } from 'react'
import { GAS_APPLIANCES_DATABASE, GAS_APPLIANCE_CATEGORIES, type GasApplianceDefinition } from '../../data/gasAppliances'

interface AddGasApplianceModalProps {
  isOpen: boolean
  onClose: () => void
  onAddAppliance: (appliance: GasApplianceDefinition, quantity: number) => void
}

export default function AddGasApplianceModal({ isOpen, onClose, onAddAppliance }: AddGasApplianceModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedAppliance, setSelectedAppliance] = useState<GasApplianceDefinition | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(GAS_APPLIANCE_CATEGORIES))

  // Filter appliances based on search and category
  const filteredAppliances = useMemo(() => {
    return GAS_APPLIANCES_DATABASE.filter(appliance => {
      const matchesSearch = searchTerm === '' || 
        appliance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appliance.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !selectedCategory || appliance.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  // Group by category
  const groupedAppliances = useMemo(() => {
    const groups: Record<string, GasApplianceDefinition[]> = {}
    for (const category of GAS_APPLIANCE_CATEGORIES) {
      const appliances = filteredAppliances.filter(a => a.category === category)
      if (appliances.length > 0) {
        groups[category] = appliances
      }
    }
    return groups
  }, [filteredAppliances])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleSelectAppliance = (appliance: GasApplianceDefinition) => {
    setSelectedAppliance(appliance)
    setQuantity(1)
  }

  const handleAdd = () => {
    if (selectedAppliance && quantity > 0) {
      onAddAppliance(selectedAppliance, quantity)
      setSelectedAppliance(null)
      setQuantity(1)
    }
  }

  const handleClose = () => {
    setSearchTerm('')
    setSelectedCategory(null)
    setSelectedAppliance(null)
    setQuantity(1)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-surface-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Add Gas Appliance</h2>
            <p className="text-sm text-surface-400 mt-1">ASPE Table 7-3 - Gas Demand for Common Appliances</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-surface-700 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="px-6 py-3 border-b border-surface-700 flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search appliances..."
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-surface-500 focus:outline-none focus:border-primary-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="bg-surface-900 border border-surface-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Categories</option>
            {GAS_APPLIANCE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Appliance List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {Object.entries(groupedAppliances).map(([category, appliances]) => (
              <div key={category} className="bg-surface-900/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-surface-700/50 transition-colors"
                >
                  <span className="font-medium text-surface-200">{category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500">{appliances.length}</span>
                    <svg 
                      className={`w-4 h-4 text-surface-400 transition-transform ${expandedCategories.has(category) ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="px-2 pb-2 space-y-1">
                    {appliances.map(appliance => {
                      const isSelected = selectedAppliance?.id === appliance.id
                      
                      return (
                        <button
                          key={appliance.id}
                          onClick={() => handleSelectAppliance(appliance)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left
                            ${isSelected 
                              ? 'bg-orange-600/30 border border-orange-500' 
                              : 'bg-surface-800 hover:bg-surface-700 border border-transparent'}
                          `}
                        >
                          <span className="text-lg">{appliance.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{appliance.name}</div>
                            <div className="text-xs text-surface-500">
                              {appliance.btuPerHour.toLocaleString()} BTU/hr ({appliance.mbh} MBH)
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            
            {Object.keys(groupedAppliances).length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-surface-500">
                <span className="text-lg">🔍</span>
                <p className="mt-2 text-sm">No appliances found</p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="w-72 border-l border-surface-700 p-4 bg-surface-900/50">
            {selectedAppliance ? (
              <div className="h-full flex flex-col">
                <div className="text-center mb-4">
                  <span className="text-4xl">{selectedAppliance.icon}</span>
                  <h3 className="font-bold text-white mt-2">{selectedAppliance.name}</h3>
                  <p className="text-xs text-surface-400">{selectedAppliance.category}</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between bg-surface-800 rounded-lg px-3 py-2">
                    <span className="text-surface-400">BTU/hr</span>
                    <span className="text-orange-400 font-mono">{selectedAppliance.btuPerHour.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between bg-surface-800 rounded-lg px-3 py-2">
                    <span className="text-surface-400">MBH</span>
                    <span className="text-white font-mono">{selectedAppliance.mbh}</span>
                  </div>
                  <div className="flex justify-between bg-surface-800 rounded-lg px-3 py-2">
                    <span className="text-surface-400">CFH (approx)</span>
                    <span className="text-white font-mono">{Math.round(selectedAppliance.btuPerHour / 1000)}</span>
                  </div>
                  {selectedAppliance.notes && (
                    <div className="bg-surface-800 rounded-lg px-3 py-2">
                      <span className="text-surface-400 text-xs">{selectedAppliance.notes}</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 space-y-3">
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-white text-center font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="bg-orange-900/30 rounded-lg px-3 py-2 text-center">
                    <div className="text-xs text-orange-300">Total Gas Load</div>
                    <div className="text-lg font-bold text-orange-400">
                      {(selectedAppliance.btuPerHour * quantity / 1000).toFixed(0)} MBH
                    </div>
                  </div>
                  <button
                    onClick={handleAdd}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
                  >
                    Add as Line Item
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-surface-500">
                <span className="text-3xl mb-2">🔥</span>
                <p className="text-sm text-center">Select an appliance to see details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-700 flex items-center justify-between">
          <p className="text-xs text-surface-500">
            Source: ASPE Plumbing Engineering Design Handbook Table 7-3
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-surface-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
