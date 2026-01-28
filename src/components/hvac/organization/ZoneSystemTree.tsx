import { useState } from 'react'
import { useHVACStore } from '../../../store/useHVACStore'
import { ZONE_EZ_VALUES } from '../../../data/ashrae62'

export default function ZoneSystemTree() {
  const { 
    spaces, zones, systems,
    deleteZone, deleteSystem,
    assignSpaceToZone, assignZoneToSystem
  } = useHVACStore()
  
  const [showAddZone, setShowAddZone] = useState(false)
  const [showAddSystem, setShowAddSystem] = useState(false)
  const [editingZone, setEditingZone] = useState<string | null>(null)
  const [editingSystem, setEditingSystem] = useState<string | null>(null)
  const [draggedSpace, setDraggedSpace] = useState<string | null>(null)
  const [draggedZone, setDraggedZone] = useState<string | null>(null)
  
  // Group data
  const unassignedSpaces = spaces.filter(s => !s.zoneId)
  const unassignedZones = zones.filter(z => !z.systemId)
  
  const getSpacesInZone = (zoneId: string) => spaces.filter(s => s.zoneId === zoneId)
  const getZonesInSystem = (systemId: string) => zones.filter(z => z.systemId === systemId)
  
  // Drag handlers for spaces
  const handleDragStartSpace = (e: React.DragEvent, spaceId: string) => {
    e.dataTransfer.setData('spaceId', spaceId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedSpace(spaceId)
  }
  
  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault()
    const spaceId = e.dataTransfer.getData('spaceId')
    if (spaceId) {
      assignSpaceToZone(spaceId, undefined)
    }
    setDraggedSpace(null)
  }
  
  // Drag handlers for zones
  const handleDragStartZone = (e: React.DragEvent, zoneId: string) => {
    e.dataTransfer.setData('zoneId', zoneId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedZone(zoneId)
  }
  
  const handleDropZoneOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault()
    const zoneId = e.dataTransfer.getData('zoneId')
    if (zoneId) {
      assignZoneToSystem(zoneId, undefined)
    }
    setDraggedZone(null)
  }
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Zones & Systems</h2>
          <p className="text-surface-400">Organize spaces into zones, and zones into systems</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddZone(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            + Zone
          </button>
          <button
            onClick={() => setShowAddSystem(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
          >
            + System
          </button>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mb-6 p-3 bg-surface-800/50 rounded-lg border border-surface-700 text-sm text-surface-400">
        💡 Drag spaces into zones, and drag zones into systems. Click to edit properties.
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Column 1: Unassigned Spaces */}
        <div>
          <h3 className="text-sm font-semibold text-surface-400 uppercase mb-3">
            Unassigned Spaces ({unassignedSpaces.length})
          </h3>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnUnassigned}
            className={`min-h-[200px] bg-surface-800 rounded-lg border p-3 space-y-2 transition-colors ${
              draggedSpace ? 'border-cyan-500 bg-cyan-900/10' : 'border-surface-700'
            }`}
          >
            {unassignedSpaces.length === 0 ? (
              <div className="text-center py-8 text-surface-500 text-sm">
                {draggedSpace ? '📥 Drop here to unassign' : 'All spaces assigned'}
              </div>
            ) : (
              unassignedSpaces.map(space => (
                <div
                  key={space.id}
                  draggable
                  onDragStart={(e) => handleDragStartSpace(e, space.id)}
                  onDragEnd={() => setDraggedSpace(null)}
                  className={`p-2 bg-surface-900 rounded border cursor-move transition-colors ${
                    draggedSpace === space.id 
                      ? 'border-cyan-400 opacity-50' 
                      : 'border-surface-600 hover:border-cyan-600'
                  }`}
                >
                  <div className="text-white text-sm font-medium">{space.name}</div>
                  <div className="text-xs text-surface-400">{space.areaSf} SF</div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Column 2: Zones */}
        <div>
          <h3 className="text-sm font-semibold text-surface-400 uppercase mb-3">
            Zones ({zones.length})
          </h3>
          <div className="space-y-3">
            {/* Unassigned Zones */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropZoneOnUnassigned}
              className={`min-h-[100px] bg-surface-800 rounded-lg border p-3 transition-colors ${
                draggedZone ? 'border-emerald-500 bg-emerald-900/10' : 'border-surface-700'
              }`}
            >
              <div className="text-xs text-surface-500 mb-2">Unassigned to System</div>
              {unassignedZones.length === 0 ? (
                <div className="text-center py-4 text-surface-500 text-sm">
                  {draggedZone ? '📥 Drop here to unassign' : 'No unassigned zones'}
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedZones.map(zone => (
                    <ZoneCard
                      key={zone.id}
                      zone={zone}
                      spaces={getSpacesInZone(zone.id)}
                      onEdit={() => setEditingZone(zone.id)}
                      onDelete={() => deleteZone(zone.id)}
                      onDropSpace={(spaceId) => assignSpaceToZone(spaceId, zone.id)}
                      onDragStart={(e) => handleDragStartZone(e, zone.id)}
                      onDragEnd={() => setDraggedZone(null)}
                      isDragging={draggedZone === zone.id}
                      draggable
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Column 3: Systems */}
        <div>
          <h3 className="text-sm font-semibold text-surface-400 uppercase mb-3">
            Systems ({systems.length})
          </h3>
          <div className="space-y-3">
            {systems.length === 0 ? (
              <div className="min-h-[200px] bg-surface-800 rounded-lg border border-surface-700 flex items-center justify-center">
                <div className="text-center text-surface-500">
                  <div className="text-3xl mb-2">🐐💨🌀</div>
                  <div className="text-sm">No systems yet - GOAT needs an AHU!</div>
                </div>
              </div>
            ) : (
              systems.map(system => (
                <SystemCard
                  key={system.id}
                  system={system}
                  zones={getZonesInSystem(system.id)}
                  spaces={spaces}
                  onEdit={() => setEditingSystem(system.id)}
                  onDelete={() => deleteSystem(system.id)}
                  onDropZone={(zoneId) => assignZoneToSystem(zoneId, system.id)}
                  onEditZone={setEditingZone}
                  onDropSpaceOnZone={assignSpaceToZone}
                  onDragStartZone={handleDragStartZone}
                  onDragEndZone={() => setDraggedZone(null)}
                  draggedZoneId={draggedZone}
                />
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Add Zone Modal */}
      {showAddZone && (
        <AddZoneModal onClose={() => setShowAddZone(false)} />
      )}
      
      {/* Add System Modal */}
      {showAddSystem && (
        <AddSystemModal onClose={() => setShowAddSystem(false)} />
      )}
      
      {/* Edit Zone Modal */}
      {editingZone && (
        <EditZoneModal zoneId={editingZone} onClose={() => setEditingZone(null)} />
      )}
      
      {/* Edit System Modal */}
      {editingSystem && (
        <EditSystemModal systemId={editingSystem} onClose={() => setEditingSystem(null)} />
      )}
    </div>
  )
}

// ============================================
// Zone Card
// ============================================

interface ZoneCardProps {
  zone: ReturnType<typeof useHVACStore.getState>['zones'][0]
  spaces: ReturnType<typeof useHVACStore.getState>['spaces']
  onEdit: () => void
  onDelete: () => void
  onDropSpace: (spaceId: string) => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
  draggable?: boolean
}

function ZoneCard({ zone, spaces, onEdit, onDelete, onDropSpace, onDragStart, onDragEnd, isDragging, draggable }: ZoneCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        const spaceId = e.dataTransfer.getData('spaceId')
        if (spaceId) onDropSpace(spaceId)
      }}
      className={`p-3 bg-emerald-900/30 rounded-lg border transition-colors ${
        isDragOver ? 'border-emerald-400 bg-emerald-900/50' : 'border-emerald-700'
      } ${draggable ? 'cursor-move' : ''} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-emerald-400 font-medium">{zone.name}</div>
          <div className="text-xs text-surface-400">Ez: {zone.ez}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 text-surface-400 hover:text-white text-xs">✏️</button>
          <button onClick={onDelete} className="p-1 text-surface-400 hover:text-red-400 text-xs">🗑️</button>
        </div>
      </div>
      
      {spaces.length > 0 ? (
        <div className="space-y-1">
          {spaces.map(space => (
            <div key={space.id} className="text-xs text-surface-300 pl-2 border-l border-surface-600">
              {space.name} ({space.areaSf} SF)
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-surface-500 italic">Drop spaces here</div>
      )}
    </div>
  )
}

// ============================================
// System Card
// ============================================

interface SystemCardProps {
  system: ReturnType<typeof useHVACStore.getState>['systems'][0]
  zones: ReturnType<typeof useHVACStore.getState>['zones']
  spaces: ReturnType<typeof useHVACStore.getState>['spaces']
  onEdit: () => void
  onDelete: () => void
  onDropZone: (zoneId: string) => void
  onEditZone: (zoneId: string) => void
  onDropSpaceOnZone: (spaceId: string, zoneId: string) => void
  onDragStartZone: (e: React.DragEvent, zoneId: string) => void
  onDragEndZone: () => void
  draggedZoneId: string | null
}

function SystemCard({ 
  system, zones, spaces, onEdit, onDelete, onDropZone, onEditZone, onDropSpaceOnZone,
  onDragStartZone, onDragEndZone, draggedZoneId
}: SystemCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  
  const systemTypeLabel = {
    single_zone: 'Single Zone',
    vav_multi_zone: 'VAV Multi-Zone',
    doas_100_oa: 'DOAS (100% OA)',
  }[system.systemType]
  
  const getSpacesInZone = (zoneId: string) => spaces.filter(s => s.zoneId === zoneId)
  
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        // Only highlight for zone drops, not space drops
        const types = e.dataTransfer.types
        if (types.includes('zoneid')) {
          setIsDragOver(true)
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const zoneId = e.dataTransfer.getData('zoneId')
        if (zoneId) onDropZone(zoneId)
      }}
      className={`p-3 bg-purple-900/30 rounded-lg border transition-colors ${
        isDragOver ? 'border-purple-400 bg-purple-900/50' : 'border-purple-700'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-purple-400 font-medium">{system.name}</div>
          <div className="text-xs text-surface-400">{systemTypeLabel}</div>
          {system.ervEnabled && (
            <div className="text-xs text-green-400 mt-1">✓ ERV ({Math.round(system.ervSensibleEfficiency * 100)}%)</div>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 text-surface-400 hover:text-white text-xs">✏️</button>
          <button onClick={onDelete} className="p-1 text-surface-400 hover:text-red-400 text-xs">🗑️</button>
        </div>
      </div>
      
      {zones.length > 0 ? (
        <div className="space-y-2">
          {zones.map(zone => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              spaces={getSpacesInZone(zone.id)}
              onEdit={() => onEditZone(zone.id)}
              onDelete={() => {}}
              onDropSpace={(spaceId) => onDropSpaceOnZone(spaceId, zone.id)}
              onDragStart={(e) => onDragStartZone(e, zone.id)}
              onDragEnd={onDragEndZone}
              isDragging={draggedZoneId === zone.id}
              draggable
            />
          ))}
        </div>
      ) : (
        <div className={`text-xs text-surface-500 italic p-2 border border-dashed rounded transition-colors ${
          isDragOver ? 'border-purple-400 text-purple-300' : 'border-surface-600'
        }`}>
          {isDragOver ? '📥 Drop zone here' : 'Drop zones here'}
        </div>
      )}
    </div>
  )
}

// ============================================
// Add Zone Modal
// ============================================

function AddZoneModal({ onClose }: { onClose: () => void }) {
  const { addZone } = useHVACStore()
  const [form, setForm] = useState({
    name: '',
    ez: 1.0,
    heatingSetpoint: 70,
    coolingSetpoint: 75,
  })
  
  const handleAdd = () => {
    addZone(form)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-white">Add Zone</h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Zone Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., North Offices, Lobby"
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">
              Zone Air Distribution Effectiveness (Ez)
            </label>
            <select
              value={form.ez}
              onChange={(e) => setForm(f => ({ ...f, ez: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              {ZONE_EZ_VALUES.map(ez => (
                <option key={ez.id} value={ez.ez}>
                  {ez.ez} - {ez.description}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1">Heating Setpoint (°F)</label>
              <input
                type="number"
                value={form.heatingSetpoint}
                onChange={(e) => setForm(f => ({ ...f, heatingSetpoint: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-1">Cooling Setpoint (°F)</label>
              <input
                type="number"
                value={form.coolingSetpoint}
                onChange={(e) => setForm(f => ({ ...f, coolingSetpoint: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-surface-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg"
          >
            Add Zone
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Edit Zone Modal
// ============================================

function EditZoneModal({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const { zones, updateZone } = useHVACStore()
  const zone = zones.find(z => z.id === zoneId)
  
  const [form, setForm] = useState({
    name: zone?.name || '',
    ez: zone?.ez || 1.0,
    heatingSetpoint: zone?.heatingSetpoint || 70,
    coolingSetpoint: zone?.coolingSetpoint || 75,
  })
  
  if (!zone) return null
  
  const handleSave = () => {
    updateZone(zoneId, form)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-white">Edit Zone</h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Zone Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Ez</label>
            <select
              value={form.ez}
              onChange={(e) => setForm(f => ({ ...f, ez: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              {ZONE_EZ_VALUES.map(ez => (
                <option key={ez.id} value={ez.ez}>
                  {ez.ez} - {ez.description}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1">Heating (°F)</label>
              <input
                type="number"
                value={form.heatingSetpoint}
                onChange={(e) => setForm(f => ({ ...f, heatingSetpoint: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-1">Cooling (°F)</label>
              <input
                type="number"
                value={form.coolingSetpoint}
                onChange={(e) => setForm(f => ({ ...f, coolingSetpoint: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-surface-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Add System Modal
// ============================================

function AddSystemModal({ onClose }: { onClose: () => void }) {
  const { addSystem } = useHVACStore()
  const [form, setForm] = useState({
    name: '',
    systemType: 'vav_multi_zone' as const,
    ervEnabled: false,
    ervSensibleEfficiency: 0.75,
    ervLatentEfficiency: 0.65,
    occupancyDiversity: 0.8,
  })
  
  const handleAdd = () => {
    addSystem(form)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-white">Add System</h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">System Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., AHU-1, DOAS-1"
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">System Type</label>
            <select
              value={form.systemType}
              onChange={(e) => setForm(f => ({ 
                ...f, 
                systemType: e.target.value as typeof form.systemType,
                occupancyDiversity: e.target.value === 'single_zone' ? 1.0 : 0.8
              }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              <option value="single_zone">Single Zone</option>
              <option value="vav_multi_zone">VAV Multi-Zone</option>
              <option value="doas_100_oa">DOAS (100% Outdoor Air)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Occupancy Diversity</label>
            <input
              type="number"
              value={form.occupancyDiversity}
              onChange={(e) => setForm(f => ({ ...f, occupancyDiversity: Number(e.target.value) }))}
              min={0.5}
              max={1.0}
              step={0.05}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
            <p className="text-xs text-surface-500 mt-1">1.0 = no diversity, 0.65 = high diversity</p>
          </div>
          
          <div className="p-3 bg-surface-900 rounded-lg border border-surface-600">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ervEnabled}
                onChange={(e) => setForm(f => ({ ...f, ervEnabled: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-white">Energy Recovery Ventilator (ERV)</span>
            </label>
            
            {form.ervEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Sensible Eff. (%)</label>
                  <input
                    type="number"
                    value={Math.round(form.ervSensibleEfficiency * 100)}
                    onChange={(e) => setForm(f => ({ ...f, ervSensibleEfficiency: Number(e.target.value) / 100 }))}
                    min={50}
                    max={90}
                    className="w-full px-2 py-1 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Latent Eff. (%)</label>
                  <input
                    type="number"
                    value={Math.round(form.ervLatentEfficiency * 100)}
                    onChange={(e) => setForm(f => ({ ...f, ervLatentEfficiency: Number(e.target.value) / 100 }))}
                    min={40}
                    max={80}
                    className="w-full px-2 py-1 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-surface-400 hover:text-white">Cancel</button>
          <button onClick={handleAdd} className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg">
            Add System
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Edit System Modal
// ============================================

function EditSystemModal({ systemId, onClose }: { systemId: string; onClose: () => void }) {
  const { systems, updateSystem } = useHVACStore()
  const system = systems.find(s => s.id === systemId)
  
  const [form, setForm] = useState({
    name: system?.name || '',
    systemType: system?.systemType || 'vav_multi_zone',
    ervEnabled: system?.ervEnabled || false,
    ervSensibleEfficiency: system?.ervSensibleEfficiency || 0.75,
    ervLatentEfficiency: system?.ervLatentEfficiency || 0.65,
    occupancyDiversity: system?.occupancyDiversity || 0.8,
  })
  
  if (!system) return null
  
  const handleSave = () => {
    updateSystem(systemId, form as typeof system)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md">
        <div className="p-4 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-white">Edit System</h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">System Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">System Type</label>
            <select
              value={form.systemType}
              onChange={(e) => setForm(f => ({ ...f, systemType: e.target.value as typeof form.systemType }))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              <option value="single_zone">Single Zone</option>
              <option value="vav_multi_zone">VAV Multi-Zone</option>
              <option value="doas_100_oa">DOAS (100% Outdoor Air)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-surface-400 mb-1">Occupancy Diversity</label>
            <input
              type="number"
              value={form.occupancyDiversity}
              onChange={(e) => setForm(f => ({ ...f, occupancyDiversity: Number(e.target.value) }))}
              min={0.5}
              max={1.0}
              step={0.05}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            />
          </div>
          
          <div className="p-3 bg-surface-900 rounded-lg border border-surface-600">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ervEnabled}
                onChange={(e) => setForm(f => ({ ...f, ervEnabled: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-white">ERV Enabled</span>
            </label>
            
            {form.ervEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Sensible (%)</label>
                  <input
                    type="number"
                    value={Math.round(form.ervSensibleEfficiency * 100)}
                    onChange={(e) => setForm(f => ({ ...f, ervSensibleEfficiency: Number(e.target.value) / 100 }))}
                    className="w-full px-2 py-1 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Latent (%)</label>
                  <input
                    type="number"
                    value={Math.round(form.ervLatentEfficiency * 100)}
                    onChange={(e) => setForm(f => ({ ...f, ervLatentEfficiency: Number(e.target.value) / 100 }))}
                    className="w-full px-2 py-1 bg-surface-800 border border-surface-600 rounded text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-surface-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
