/**
 * ASHRAEDefaultsEditor Component
 * 
 * Manages ASHRAE 62.1 and 170 ventilation space types.
 * Features:
 * - View all built-in ASHRAE 62.1 space types
 * - View ASHRAE 170 healthcare space types (purple)
 * - Add custom space types with flexible units
 * - Edit/delete custom space types
 */

import { useState, useMemo } from 'react'
import { useSettingsStore, type CustomAshraeSpaceType, type DbAshraeSpaceType } from '../../store/useSettingsStore'

type TabType = 'ashrae62' | 'ashrae170' | 'custom'

export default function ASHRAEDefaultsEditor() {
  const { 
    customAshraeSpaceTypes, 
    addCustomAshraeSpaceType, 
    updateCustomAshraeSpaceType, 
    deleteCustomAshraeSpaceType,
    // Database data
    getAllAshraeSpaceTypes,
    saveAshraeSpaceType,
    deleteDbAshraeSpaceType,
    // Unified getters
    isUsingDatabase,
  } = useSettingsStore()
  
  const usingDatabase = isUsingDatabase()
  const allSpaceTypes = getAllAshraeSpaceTypes()
  
  const [activeTab, setActiveTab] = useState<TabType>('ashrae62')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingType, setEditingType] = useState<CustomAshraeSpaceType | null>(null)
  const [editingDbType, setEditingDbType] = useState<DbAshraeSpaceType | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // DATABASE ONLY - no hardcoded fallback
  const ashrae62Data = useMemo(() => {
    return allSpaceTypes.filter(st => st.standard === 'ashrae62')
  }, [allSpaceTypes])
  
  const ashrae170Data = useMemo(() => {
    return allSpaceTypes.filter(st => st.standard === 'ashrae170')
  }, [allSpaceTypes])
  
  // Get unique categories from ASHRAE 62.1
  const categories = useMemo(() => {
    const cats = new Set(ashrae62Data.map(st => st.category))
    return ['all', ...Array.from(cats).sort()]
  }, [ashrae62Data])
  
  // Filter ASHRAE 62.1 space types
  const filteredAshrae62 = useMemo(() => {
    let types = ashrae62Data
    
    if (selectedCategory !== 'all') {
      types = types.filter(st => st.category === selectedCategory)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      types = types.filter(st => 
        st.display_name.toLowerCase().includes(query) ||
        st.category.toLowerCase().includes(query) ||
        st.name.toLowerCase().includes(query)
      )
    }
    
    return types
  }, [ashrae62Data, selectedCategory, searchQuery])
  
  // Filter ASHRAE 170 space types
  const filteredAshrae170 = useMemo(() => {
    if (!searchQuery) return ashrae170Data
    
    const query = searchQuery.toLowerCase()
    return ashrae170Data.filter(st => 
      st.display_name.toLowerCase().includes(query)
    )
  }, [ashrae170Data, searchQuery])
  
  // Filter custom space types
  const filteredCustom = useMemo(() => {
    if (!searchQuery) return customAshraeSpaceTypes
    
    const query = searchQuery.toLowerCase()
    return customAshraeSpaceTypes.filter(st => 
      st.displayName.toLowerCase().includes(query) ||
      st.category.toLowerCase().includes(query)
    )
  }, [customAshraeSpaceTypes, searchQuery])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">ASHRAE Ventilation Defaults</h2>
          <p className="text-surface-400 mt-1">
            View and manage ASHRAE 62.1 and 170 ventilation space types
          </p>
          {/* Data source indicator */}
          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-xs font-medium ${
            usingDatabase 
              ? 'bg-green-900/50 text-green-400 border border-green-700' 
              : 'bg-amber-900/50 text-amber-400 border border-amber-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${usingDatabase ? 'bg-green-400' : 'bg-amber-400'}`} />
            {usingDatabase ? '✓ Using Database' : '⚠ Using Hardcoded Defaults'}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Space Type
        </button>
      </div>
      
      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-surface-700 pb-4">
        <button
          onClick={() => setActiveTab('ashrae62')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'ashrae62'
              ? 'bg-cyan-600 text-white'
              : 'text-surface-400 hover:text-white hover:bg-surface-700'
          }`}
        >
          ASHRAE 62.1 ({ashrae62Data.length})
        </button>
        <button
          onClick={() => setActiveTab('ashrae170')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'ashrae170'
              ? 'bg-purple-600 text-white'
              : 'text-purple-400 hover:text-purple-300 hover:bg-purple-900/30'
          }`}
        >
          ASHRAE 170 Healthcare ({ashrae170Data.length})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'custom'
              ? 'bg-amber-600 text-white'
              : 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/30'
          }`}
        >
          Custom ({customAshraeSpaceTypes.length})
        </button>
      </div>
      
      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search space types..."
            className="w-full px-4 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
        {activeTab === 'ashrae62' && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        )}
      </div>
      
      {/* Content */}
      {activeTab === 'ashrae62' && (
        <div className="bg-surface-800 rounded-lg border border-surface-700 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-surface-900">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-400 uppercase">Space Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-400 uppercase">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-cyan-400 uppercase" title="Ventilation">Rp</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-cyan-400 uppercase" title="Ventilation">Ra</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-red-400 uppercase" title="Exhaust CFM/SF">EXH/SF</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-red-400 uppercase" title="Exhaust CFM/Unit">EXH/Unit</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-surface-400 uppercase">Air Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {filteredAshrae62.map(st => {
                // Build exhaust per unit display
                let exhaustUnitDisplay = ''
                if (st.exhaust_cfm_unit) {
                  const unitLabel = st.exhaust_unit_type === 'toilet' ? '/WC' : 
                                   st.exhaust_unit_type === 'shower' ? '/shwr' : 
                                   st.exhaust_unit_type === 'kitchen' ? '/kit' :
                                   st.exhaust_unit_type === 'room' ? '/rm' : '/unit'
                  if (st.exhaust_cfm_min && st.exhaust_cfm_max && st.exhaust_cfm_min !== st.exhaust_cfm_max) {
                    exhaustUnitDisplay = `${st.exhaust_cfm_min}-${st.exhaust_cfm_max}${unitLabel}`
                  } else {
                    exhaustUnitDisplay = `${st.exhaust_cfm_unit}${unitLabel}`
                  }
                }
                
                return (
                  <tr key={st.id} className="hover:bg-surface-700/50 group">
                    <td className="px-4 py-3 text-sm text-white">
                      <div className="flex items-center justify-between">
                        <span>{st.display_name}</span>
                        {usingDatabase && (
                          <button
                            onClick={() => setEditingDbType(st)}
                            className="opacity-0 group-hover:opacity-100 text-primary-400 hover:text-primary-300 transition-opacity"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-400">{st.category}</td>
                    <td className="px-4 py-3 text-sm text-cyan-400 text-right font-mono">{st.rp || '-'}</td>
                    <td className="px-4 py-3 text-sm text-cyan-400 text-right font-mono">{st.ra || '-'}</td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right font-mono">
                      {st.exhaust_cfm_sf ? st.exhaust_cfm_sf : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right font-mono">
                      {exhaustUnitDisplay || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        st.air_class === 1 ? 'bg-green-900/30 text-green-400' :
                        st.air_class === 2 ? 'bg-amber-900/30 text-amber-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {st.air_class}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredAshrae62.length === 0 && (
            <div className="p-8 text-center text-surface-500">
              No space types match your search
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'ashrae170' && (
        <div className="bg-purple-900/20 rounded-lg border border-purple-500/30 overflow-hidden">
          <table className="w-full">
            <thead className="bg-purple-900/30">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-purple-300 uppercase">Space Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-purple-300 uppercase">Total ACH</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-purple-300 uppercase">OA ACH</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-purple-300 uppercase">Pressure</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-purple-300 uppercase">All Exhaust</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-purple-300 uppercase">Recirculate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/20">
              {filteredAshrae170.map(st => (
                <tr key={st.id} className="hover:bg-purple-900/30 group">
                  <td className="px-4 py-3 text-sm text-purple-200">
                    <div className="flex items-center justify-between">
                      <span>{st.display_name}</span>
                      {usingDatabase && (
                        <button
                          onClick={() => setEditingDbType(st)}
                          className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-purple-300 transition-opacity"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-purple-400 text-right font-mono">{st.min_total_ach}</td>
                  <td className="px-4 py-3 text-sm text-purple-400 text-right font-mono">{st.min_oa_ach}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      st.pressure_relationship === 'positive' ? 'bg-green-900/30 text-green-400' :
                      st.pressure_relationship === 'negative' ? 'bg-red-900/30 text-red-400' :
                      'bg-surface-700 text-surface-300'
                    }`}>
                      {st.pressure_relationship}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {st.all_air_exhaust ? (
                      <span className="text-amber-400">Yes</span>
                    ) : (
                      <span className="text-surface-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {st.recirculated ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-red-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAshrae170.length === 0 && (
            <div className="p-8 text-center text-purple-400">
              No space types match your search
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'custom' && (
        <div className="space-y-4">
          {filteredCustom.length === 0 ? (
            <div className="bg-surface-800 rounded-lg border border-surface-700 p-8 text-center">
              <p className="text-surface-400 mb-4">No custom space types defined</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
              >
                Add Custom Space Type
              </button>
            </div>
          ) : (
            <div className="bg-amber-900/20 rounded-lg border border-amber-500/30 overflow-hidden">
              <table className="w-full">
                <thead className="bg-amber-900/30">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-amber-300 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-amber-300 uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-amber-300 uppercase">Standard</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-amber-300 uppercase">Values</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-amber-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/20">
                  {filteredCustom.map(st => (
                    <tr key={st.id} className="hover:bg-amber-900/30">
                      <td className="px-4 py-3 text-sm text-amber-200">{st.displayName}</td>
                      <td className="px-4 py-3 text-sm text-surface-400">{st.category}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          st.standard === 'ashrae62' ? 'bg-cyan-900/30 text-cyan-400' :
                          st.standard === 'ashrae170' ? 'bg-purple-900/30 text-purple-400' :
                          'bg-surface-700 text-surface-300'
                        }`}>
                          {st.standard === 'ashrae62' ? 'ASHRAE 62.1' :
                           st.standard === 'ashrae170' ? 'ASHRAE 170' : 'Custom'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-400 text-right font-mono">
                        {st.Rp !== undefined && `Rp=${st.Rp} `}
                        {st.Ra !== undefined && `Ra=${st.Ra} `}
                        {st.minTotalACH !== undefined && `${st.minTotalACH} ACH`}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => setEditingType(st)}
                          className="text-amber-400 hover:text-amber-300 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${st.displayName}"?`)) {
                              deleteCustomAshraeSpaceType(st.id)
                            }
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Add/Edit Modal */}
      {(showAddModal || editingType) && (
        <CustomSpaceTypeModal
          existingType={editingType}
          onClose={() => {
            setShowAddModal(false)
            setEditingType(null)
          }}
          onSave={(spaceType) => {
            if (editingType) {
              updateCustomAshraeSpaceType(editingType.id, spaceType)
            } else {
              addCustomAshraeSpaceType(spaceType)
            }
            setShowAddModal(false)
            setEditingType(null)
          }}
        />
      )}
      
      {/* Database Edit Modal */}
      {editingDbType && (
        <DbAshraeEditModal
          spaceType={editingDbType}
          onClose={() => setEditingDbType(null)}
          onSave={async (updatedType) => {
            setIsSaving(true)
            try {
              await saveAshraeSpaceType(updatedType)
              setEditingDbType(null)
            } catch (error) {
              alert('Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'))
            } finally {
              setIsSaving(false)
            }
          }}
          onDelete={async () => {
            if (!confirm(`Delete "${editingDbType.display_name}"? This cannot be undone.`)) return
            setIsSaving(true)
            try {
              await deleteDbAshraeSpaceType(editingDbType.id)
              setEditingDbType(null)
            } catch (error) {
              alert('Failed to delete: ' + (error instanceof Error ? error.message : 'Unknown error'))
            } finally {
              setIsSaving(false)
            }
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}

// Modal for adding/editing custom space types
interface CustomSpaceTypeModalProps {
  existingType: CustomAshraeSpaceType | null
  onClose: () => void
  onSave: (spaceType: CustomAshraeSpaceType) => void
}

function CustomSpaceTypeModal({ existingType, onClose, onSave }: CustomSpaceTypeModalProps) {
  const [formData, setFormData] = useState<Partial<CustomAshraeSpaceType>>(
    existingType || {
      id: `custom_${Date.now()}`,
      category: 'Custom',
      name: '',
      displayName: '',
      standard: 'custom',
      Rp: 5,
      Ra: 0.06,
      defaultOccupancy: 10,
    }
  )
  const [ventType, setVentType] = useState<'occupancy' | 'ach'>(
    existingType?.minTotalACH !== undefined ? 'ach' : 'occupancy'
  )
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.displayName) {
      alert('Please enter a display name')
      return
    }
    
    const spaceType: CustomAshraeSpaceType = {
      id: formData.id || `custom_${Date.now()}`,
      category: formData.category || 'Custom',
      name: formData.name || formData.displayName || '',
      displayName: formData.displayName || '',
      standard: formData.standard || 'custom',
      notes: formData.notes,
    }
    
    if (ventType === 'occupancy') {
      spaceType.Rp = formData.Rp
      spaceType.Ra = formData.Ra
      spaceType.defaultOccupancy = formData.defaultOccupancy
    } else {
      spaceType.minTotalACH = formData.minTotalACH
      spaceType.minOAach = formData.minOAach
      spaceType.pressureRelationship = formData.pressureRelationship
      spaceType.allAirExhaust = formData.allAirExhaust
    }
    
    onSave(spaceType)
  }
  
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-surface-800 border-b border-surface-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {existingType ? 'Edit Custom Space Type' : 'Add Custom Space Type'}
            </h3>
            <button onClick={onClose} className="text-surface-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Display Name *</label>
              <input
                type="text"
                value={formData.displayName || ''}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value, name: e.target.value })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Category</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                placeholder="Custom"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Ventilation Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVentType('occupancy')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    ventType === 'occupancy'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                  }`}
                >
                  Occupancy-Based (62.1)
                </button>
                <button
                  type="button"
                  onClick={() => setVentType('ach')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    ventType === 'ach'
                      ? 'bg-purple-600 text-white'
                      : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                  }`}
                >
                  ACH-Based (170)
                </button>
              </div>
            </div>
            
            {ventType === 'occupancy' ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Rp (CFM/person)</label>
                    <input
                      type="number"
                      value={formData.Rp || 0}
                      onChange={(e) => setFormData({ ...formData, Rp: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      step={0.5}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Ra (CFM/sf)</label>
                    <input
                      type="number"
                      value={formData.Ra || 0}
                      onChange={(e) => setFormData({ ...formData, Ra: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      step={0.01}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Occupancy/1000sf</label>
                    <input
                      type="number"
                      value={formData.defaultOccupancy || 0}
                      onChange={(e) => setFormData({ ...formData, defaultOccupancy: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      min={0}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Total ACH</label>
                    <input
                      type="number"
                      value={formData.minTotalACH || 0}
                      onChange={(e) => setFormData({ ...formData, minTotalACH: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Outdoor Air ACH</label>
                    <input
                      type="number"
                      value={formData.minOAach || 0}
                      onChange={(e) => setFormData({ ...formData, minOAach: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      min={0}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Pressure</label>
                    <select
                      value={formData.pressureRelationship || 'equal'}
                      onChange={(e) => setFormData({ ...formData, pressureRelationship: e.target.value as 'positive' | 'negative' | 'equal' })}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                    >
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="equal">Equal</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allAirExhaust || false}
                        onChange={(e) => setFormData({ ...formData, allAirExhaust: e.target.checked })}
                        className="rounded border-surface-600"
                      />
                      All Air Exhaust
                    </label>
                  </div>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
              >
                {existingType ? 'Save Changes' : 'Add Space Type'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// Modal for editing database ASHRAE space types
interface DbAshraeEditModalProps {
  spaceType: DbAshraeSpaceType
  onClose: () => void
  onSave: (spaceType: DbAshraeSpaceType) => Promise<void>
  onDelete: () => Promise<void>
  isSaving: boolean
}

function DbAshraeEditModal({ spaceType, onClose, onSave, onDelete, isSaving }: DbAshraeEditModalProps) {
  const [formData, setFormData] = useState<DbAshraeSpaceType>(spaceType)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }
  
  const isHealthcare = formData.standard === 'ashrae170'
  
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`rounded-xl border w-full max-w-lg max-h-[90vh] overflow-y-auto ${
          isHealthcare 
            ? 'bg-purple-950 border-purple-500/30' 
            : 'bg-surface-800 border-surface-700'
        }`}>
          <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between ${
            isHealthcare 
              ? 'bg-purple-950 border-purple-500/30' 
              : 'bg-surface-800 border-surface-700'
          }`}>
            <h3 className={`text-lg font-semibold ${isHealthcare ? 'text-purple-200' : 'text-white'}`}>
              Edit: {spaceType.display_name}
            </h3>
            <button onClick={onClose} className="text-surface-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isHealthcare ? 'text-purple-300' : 'text-surface-300'}`}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isHealthcare ? 'text-purple-300' : 'text-surface-300'}`}>
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isHealthcare ? 'text-purple-300' : 'text-surface-300'}`}>
                  Standard
                </label>
                <select
                  value={formData.standard}
                  onChange={(e) => setFormData({ ...formData, standard: e.target.value as any })}
                  className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                >
                  <option value="ashrae62">ASHRAE 62.1</option>
                  <option value="ashrae170">ASHRAE 170</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            
            {!isHealthcare && (
              <>
                <div className="border-t border-surface-700 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-cyan-400 mb-3">Ventilation (ASHRAE 62.1)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Rp (CFM/person)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.rp ?? ''}
                        onChange={(e) => setFormData({ ...formData, rp: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Ra (CFM/SF)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.ra ?? ''}
                        onChange={(e) => setFormData({ ...formData, ra: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Air Class</label>
                      <select
                        value={formData.air_class ?? 1}
                        onChange={(e) => setFormData({ ...formData, air_class: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-surface-700 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-red-400 mb-3">Exhaust Requirements</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">CFM per SF</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.exhaust_cfm_sf ?? ''}
                        onChange={(e) => setFormData({ ...formData, exhaust_cfm_sf: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">CFM per Unit</label>
                      <input
                        type="number"
                        value={formData.exhaust_cfm_unit ?? ''}
                        onChange={(e) => setFormData({ ...formData, exhaust_cfm_unit: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Unit Type</label>
                      <select
                        value={formData.exhaust_unit_type ?? ''}
                        onChange={(e) => setFormData({ ...formData, exhaust_unit_type: e.target.value || undefined })}
                        className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                      >
                        <option value="">-</option>
                        <option value="toilet">Toilet/WC</option>
                        <option value="urinal">Urinal</option>
                        <option value="shower">Showerhead</option>
                        <option value="kitchen">Kitchen</option>
                        <option value="room">Room</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">Min-Max Range</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder="Min"
                          value={formData.exhaust_cfm_min ?? ''}
                          onChange={(e) => setFormData({ ...formData, exhaust_cfm_min: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                        />
                        <span className="text-surface-500">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={formData.exhaust_cfm_max ?? ''}
                          onChange={(e) => setFormData({ ...formData, exhaust_cfm_max: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {isHealthcare && (
              <div className="border-t border-purple-500/30 pt-4 mt-4">
                <h4 className="text-sm font-medium text-purple-400 mb-3">Healthcare ACH (ASHRAE 170)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-purple-300 mb-1">Min Total ACH</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.min_total_ach ?? ''}
                      onChange={(e) => setFormData({ ...formData, min_total_ach: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-purple-300 mb-1">Min OA ACH</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.min_oa_ach ?? ''}
                      onChange={(e) => setFormData({ ...formData, min_oa_ach: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-purple-300 mb-1">Pressure</label>
                    <select
                      value={formData.pressure_relationship ?? 'equal'}
                      onChange={(e) => setFormData({ ...formData, pressure_relationship: e.target.value })}
                      className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white text-sm"
                    >
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="equal">Equal</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-purple-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.all_air_exhaust ?? false}
                        onChange={(e) => setFormData({ ...formData, all_air_exhaust: e.target.checked })}
                        className="rounded border-purple-500/50 bg-purple-900/30"
                      />
                      All Exhaust
                    </label>
                    <label className="flex items-center gap-2 text-sm text-purple-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.recirculated ?? true}
                        onChange={(e) => setFormData({ ...formData, recirculated: e.target.checked })}
                        className="rounded border-purple-500/50 bg-purple-900/30"
                      />
                      Recirculate
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Notes</label>
              <textarea
                value={formData.notes ?? ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
            
            <div className="flex justify-between pt-4 border-t border-surface-700">
              <button
                type="button"
                onClick={onDelete}
                disabled={isSaving}
                className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    isHealthcare 
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-primary-600 hover:bg-primary-500 text-white'
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
