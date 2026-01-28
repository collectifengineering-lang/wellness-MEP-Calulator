import { useState } from 'react'
import { useHVACStore } from '../../../store/useHVACStore'
import { ASHRAE62_SPACE_TYPES, getCategories, getSpaceTypesByCategory, calculateDefaultOccupancy } from '../../../data/ashrae62'
import type { ASHRAE62SpaceType } from '../../../data/ashrae62'

export default function HVACSpaceCanvas() {
  const { spaces, deleteSpace, zones } = useHVACStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSpace, setEditingSpace] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter spaces by search
  const filteredSpaces = spaces.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.spaceType.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Group by zone assignment
  const unassignedSpaces = filteredSpaces.filter(s => !s.zoneId)
  const assignedSpaces = filteredSpaces.filter(s => s.zoneId)
  
  const getZoneName = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId)
    return zone?.name || 'Unknown Zone'
  }
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Spaces</h2>
          <p className="text-surface-400">Add and configure spaces for ventilation calculations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <span>+</span> Add Space
        </button>
      </div>
      
      {/* Search & Stats */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spaces..."
            className="w-full max-w-md px-4 py-2 bg-surface-800 border border-surface-600 rounded-lg text-white placeholder-surface-500"
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-surface-400">
          <span>{spaces.length} spaces</span>
          <span>•</span>
          <span>{spaces.reduce((sum, s) => sum + s.areaSf, 0).toLocaleString()} SF total</span>
        </div>
      </div>
      
      {/* Space Grid */}
      {spaces.length === 0 ? (
        <div className="text-center py-16 bg-surface-800 rounded-xl border border-surface-700">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-white mb-2">No spaces yet</h3>
          <p className="text-surface-400 mb-4">Add spaces to start calculating ventilation requirements</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            Add Your First Space
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unassigned Spaces */}
          {unassignedSpaces.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-400 uppercase mb-3">
                Unassigned ({unassignedSpaces.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassignedSpaces.map(space => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    onEdit={() => setEditingSpace(space.id)}
                    onDelete={() => deleteSpace(space.id)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Assigned Spaces (grouped by zone) */}
          {assignedSpaces.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-400 uppercase mb-3">
                Assigned to Zones ({assignedSpaces.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedSpaces.map(space => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    zoneName={getZoneName(space.zoneId!)}
                    onEdit={() => setEditingSpace(space.id)}
                    onDelete={() => deleteSpace(space.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Add Modal */}
      {showAddModal && (
        <AddSpaceModal onClose={() => setShowAddModal(false)} />
      )}
      
      {/* Edit Modal */}
      {editingSpace && (
        <EditSpaceModal
          spaceId={editingSpace}
          onClose={() => setEditingSpace(null)}
        />
      )}
    </div>
  )
}

// ============================================
// Space Card Component
// ============================================

interface SpaceCardProps {
  space: ReturnType<typeof useHVACStore.getState>['spaces'][0]
  zoneName?: string
  onEdit: () => void
  onDelete: () => void
}

function SpaceCard({ space, zoneName, onEdit, onDelete }: SpaceCardProps) {
  const spaceType = ASHRAE62_SPACE_TYPES.find(st => st.id === space.spaceType)
  const occupancy = space.occupancyOverride ?? calculateDefaultOccupancy(space.spaceType, space.areaSf)
  
  // Calculate Vbz
  const Rp = spaceType?.Rp ?? 5
  const Ra = spaceType?.Ra ?? 0.06
  const Vbz = (Rp * occupancy) + (Ra * space.areaSf)
  
  return (
    <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 hover:border-surface-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-medium">{space.name}</h4>
          <div className="text-sm text-surface-400">{spaceType?.displayName || space.spaceType}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-surface-400 hover:text-red-400 hover:bg-surface-700 rounded transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {zoneName && (
        <div className="mb-3 px-2 py-1 bg-cyan-600/20 text-cyan-400 text-xs rounded inline-block">
          {zoneName}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-surface-500">Area</div>
          <div className="text-white">{space.areaSf.toLocaleString()} SF</div>
        </div>
        <div>
          <div className="text-surface-500">Height</div>
          <div className="text-white">{space.ceilingHeightFt} ft</div>
        </div>
        <div>
          <div className="text-surface-500">Occupancy</div>
          <div className="text-white">{occupancy} people</div>
        </div>
        <div>
          <div className="text-surface-500">Vbz</div>
          <div className="text-cyan-400 font-medium">{Math.round(Vbz)} CFM</div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-surface-700 flex justify-between text-xs text-surface-500">
        <span>Rp: {Rp} CFM/person</span>
        <span>Ra: {Ra} CFM/SF</span>
      </div>
    </div>
  )
}

// ============================================
// Add Space Modal
// ============================================

function AddSpaceModal({ onClose }: { onClose: () => void }) {
  const { addSpace } = useHVACStore()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<ASHRAE62SpaceType | null>(null)
  const [form, setForm] = useState({
    name: '',
    areaSf: 500,
    ceilingHeightFt: 10,
  })
  
  const categories = getCategories()
  
  const handleSelectType = (type: ASHRAE62SpaceType) => {
    setSelectedType(type)
    if (!form.name) {
      setForm(f => ({ ...f, name: type.displayName }))
    }
  }
  
  const handleAdd = () => {
    if (!selectedType) return
    
    addSpace({
      name: form.name || selectedType.displayName,
      spaceType: selectedType.id,
      areaSf: form.areaSf,
      ceilingHeightFt: form.ceilingHeightFt,
    })
    
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Add Space</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-white">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedType ? (
            <>
              {/* Category Selection */}
              <div className="mb-4">
                <label className="block text-sm text-surface-400 mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat
                          ? 'bg-cyan-600 text-white'
                          : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Space Types */}
              <div className="grid grid-cols-2 gap-2">
                {(selectedCategory 
                  ? getSpaceTypesByCategory(selectedCategory) 
                  : ASHRAE62_SPACE_TYPES.slice(0, 20)
                ).map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type)}
                    className="text-left p-3 bg-surface-900 rounded-lg border border-surface-700 hover:border-cyan-600 transition-colors"
                  >
                    <div className="text-white font-medium">{type.displayName}</div>
                    <div className="text-xs text-surface-400 mt-1">
                      Rp: {type.Rp} | Ra: {type.Ra} | {type.defaultOccupancy}/1000SF
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Selected Type */}
              <div className="mb-4 p-3 bg-cyan-600/20 rounded-lg border border-cyan-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-cyan-400 font-medium">{selectedType.displayName}</div>
                    <div className="text-sm text-surface-400">{selectedType.category}</div>
                  </div>
                  <button
                    onClick={() => setSelectedType(null)}
                    className="text-surface-400 hover:text-white"
                  >
                    Change
                  </button>
                </div>
              </div>
              
              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Space Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={selectedType.displayName}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">Area (SF)</label>
                    <input
                      type="number"
                      value={form.areaSf}
                      onChange={(e) => setForm(f => ({ ...f, areaSf: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">Ceiling Height (ft)</label>
                    <input
                      type="number"
                      value={form.ceilingHeightFt}
                      onChange={(e) => setForm(f => ({ ...f, ceilingHeightFt: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                    />
                  </div>
                </div>
                
                {/* Preview */}
                <div className="p-3 bg-surface-900 rounded-lg">
                  <div className="text-sm text-surface-400 mb-2">Preview</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-surface-500">Occupancy</div>
                      <div className="text-white">{calculateDefaultOccupancy(selectedType.id, form.areaSf)} people</div>
                    </div>
                    <div>
                      <div className="text-surface-500">Vbz (OA)</div>
                      <div className="text-cyan-400 font-medium">
                        {Math.round(
                          (selectedType.Rp * calculateDefaultOccupancy(selectedType.id, form.areaSf)) + 
                          (selectedType.Ra * form.areaSf)
                        )} CFM
                      </div>
                    </div>
                    <div>
                      <div className="text-surface-500">Volume</div>
                      <div className="text-white">{(form.areaSf * form.ceilingHeightFt).toLocaleString()} CF</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedType}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-surface-700 disabled:text-surface-500 text-white font-medium rounded-lg transition-colors"
          >
            Add Space
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Edit Space Modal
// ============================================

function EditSpaceModal({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const { spaces, updateSpace, zones } = useHVACStore()
  const space = spaces.find(s => s.id === spaceId)
  
  const [form, setForm] = useState({
    name: space?.name || '',
    areaSf: space?.areaSf || 500,
    ceilingHeightFt: space?.ceilingHeightFt || 10,
    occupancyOverride: space?.occupancyOverride,
    zoneId: space?.zoneId,
    notes: space?.notes || '',
  })
  
  if (!space) return null
  
  const spaceType = ASHRAE62_SPACE_TYPES.find(st => st.id === space.spaceType)
  const defaultOccupancy = calculateDefaultOccupancy(space.spaceType, form.areaSf)
  
  const handleSave = () => {
    updateSpace(spaceId, {
      name: form.name,
      areaSf: form.areaSf,
      ceilingHeightFt: form.ceilingHeightFt,
      occupancyOverride: form.occupancyOverride,
      zoneId: form.zoneId,
      notes: form.notes,
    })
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Edit Space</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-white">✕</button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="p-3 bg-surface-900 rounded-lg">
            <div className="text-cyan-400 font-medium">{spaceType?.displayName || space.spaceType}</div>
            <div className="text-xs text-surface-400 mt-1">
              Rp: {spaceType?.Rp || 5} CFM/person | Ra: {spaceType?.Ra || 0.06} CFM/SF
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Space Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1">Area (SF)</label>
              <input
                type="number"
                value={form.areaSf}
                onChange={(e) => setForm(f => ({ ...f, areaSf: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-1">Ceiling Height (ft)</label>
              <input
                type="number"
                value={form.ceilingHeightFt}
                onChange={(e) => setForm(f => ({ ...f, ceilingHeightFt: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">
              Occupancy Override 
              <span className="text-surface-500 ml-1">(default: {defaultOccupancy})</span>
            </label>
            <input
              type="number"
              value={form.occupancyOverride ?? ''}
              onChange={(e) => setForm(f => ({ 
                ...f, 
                occupancyOverride: e.target.value ? Number(e.target.value) : undefined 
              }))}
              placeholder={String(defaultOccupancy)}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Assign to Zone</label>
            <select
              value={form.zoneId || ''}
              onChange={(e) => setForm(f => ({ ...f, zoneId: e.target.value || undefined }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              <option value="">-- Unassigned --</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white resize-none"
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
