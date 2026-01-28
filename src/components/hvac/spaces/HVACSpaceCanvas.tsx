import { useState, useEffect } from 'react'
import { useHVACStore } from '../../../store/useHVACStore'
import { useScannerStore } from '../../../store/useScannerStore'
import { ASHRAE62_SPACE_TYPES, getCategories, getSpaceTypesByCategory, calculateDefaultOccupancy } from '../../../data/ashrae62'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'
import type { ASHRAE62SpaceType } from '../../../data/ashrae62'

export default function HVACSpaceCanvas() {
  const { spaces, deleteSpace, zones, addSpace } = useHVACStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState<'concept' | 'scanner' | null>(null)
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal('concept')}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
            title="Import from Concept MEP"
          >
            📥 From Concept MEP
          </button>
          <button
            onClick={() => setShowImportModal('scanner')}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
            title="Import from Plan Scanner"
          >
            📐 From Scanner
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <span>+</span> Add Space
          </button>
        </div>
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
          <div className="text-6xl mb-4">🐐🏠</div>
          <h3 className="text-xl font-semibold text-white mb-2">No spaces yet - the barn is empty!</h3>
          <p className="text-surface-400 mb-4">Add spaces so this GOAT can calculate some fresh air 💨</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            Add Your First Space 🐐
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
      
      {/* Import Modal */}
      {showImportModal && (
        <ImportSpacesModal
          source={showImportModal}
          onClose={() => setShowImportModal(null)}
          onImport={(importedSpaces) => {
            importedSpaces.forEach(space => addSpace(space))
            setShowImportModal(null)
          }}
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

// ============================================
// Import Spaces Modal
// ============================================

interface ConceptZone {
  id: string
  name: string
  zone_type: string
  sf: number
}

interface ScanSpace {
  id: string
  name: string
  sf: number
  zone_type?: string
}

interface ConceptProject {
  id: string
  name: string
  zones: ConceptZone[]
}

interface ScanProject {
  id: string
  name: string
  spaces: ScanSpace[]
}

interface ImportableSpace {
  name: string
  areaSf: number
  spaceType: string
  ceilingHeightFt: number
}

interface ImportSpacesModalProps {
  source: 'concept' | 'scanner'
  onClose: () => void
  onImport: (spaces: ImportableSpace[]) => void
}

function ImportSpacesModal({ source, onClose, onImport }: ImportSpacesModalProps) {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<(ConceptProject | ScanProject)[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  
  // Get scanner store for local data
  const { scans } = useScannerStore()
  
  // Load projects from database or local storage
  useEffect(() => {
    loadProjects()
  }, [source])
  
  const loadProjects = async () => {
    setLoading(true)
    try {
      if (source === 'concept') {
        // First try Supabase
        if (isSupabaseConfigured()) {
          const { data: projectsData } = await supabase
            .from('projects' as any)
            .select('id, name')
            .order('updated_at', { ascending: false }) as { data: Array<{ id: string; name: string }> | null }
          
          if (projectsData && projectsData.length > 0) {
            // Load zones for each project
            const projectsWithZones: ConceptProject[] = await Promise.all(
              projectsData.map(async (proj) => {
                const { data: zonesData } = await supabase
                  .from('zones' as any)
                  .select('id, name, zone_type, sf')
                  .eq('project_id', proj.id) as { data: ConceptZone[] | null }
                return { id: proj.id, name: proj.name, zones: zonesData || [] }
              })
            )
            setProjects(projectsWithZones)
            setLoading(false)
            return
          }
        }
        
        // Fallback: Try localStorage (mep-storage from useProjectStore)
        try {
          const localData = localStorage.getItem('mep-storage')
          if (localData) {
            const parsed = JSON.parse(localData)
            if (parsed.state?.projects) {
              const localProjects = parsed.state.projects.map((p: any) => ({
                id: p.id,
                name: p.name,
                zones: p.zones?.map((z: any) => ({
                  id: z.id,
                  name: z.name,
                  zone_type: z.type,
                  sf: z.sf
                })) || []
              }))
              setProjects(localProjects)
            }
          }
        } catch (e) {
          console.log('No local concept projects found')
        }
      } else {
        // Scanner - First try Supabase
        if (isSupabaseConfigured()) {
          const { data: scansData } = await supabase
            .from('scan_projects' as any)
            .select('id, name')
            .order('updated_at', { ascending: false }) as { data: Array<{ id: string; name: string }> | null }
          
          if (scansData && scansData.length > 0) {
            const scansWithSpaces: ScanProject[] = await Promise.all(
              scansData.map(async (scan) => {
                const { data: spacesData } = await supabase
                  .from('scan_spaces' as any)
                  .select('id, name, sf, zone_type')
                  .eq('scan_id', scan.id) as { data: ScanSpace[] | null }
                return { id: scan.id, name: scan.name, spaces: spacesData || [] }
              })
            )
            setProjects(scansWithSpaces)
            setLoading(false)
            return
          }
        }
        
        // Fallback: Use local scanner store
        if (scans && scans.length > 0) {
          const localScans: ScanProject[] = scans.map(scan => ({
            id: scan.id,
            name: scan.name,
            spaces: scan.extractedSpaces?.map(s => ({
              id: s.id,
              name: s.name,
              sf: s.sf,
              zone_type: s.zoneType
            })) || []
          }))
          setProjects(localScans)
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getItems = () => {
    const project = projects.find(p => p.id === selectedProject)
    if (!project) return []
    
    if (source === 'concept') {
      return (project as ConceptProject).zones || []
    } else {
      return (project as ScanProject).spaces || []
    }
  }
  
  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }
  
  const selectAll = () => {
    const items = getItems()
    setSelectedItems(new Set(items.map(i => i.id)))
  }
  
  const deselectAll = () => {
    setSelectedItems(new Set())
  }
  
  // Map zone type to ASHRAE 62.1 space type
  const mapToASHRAESpaceType = (zoneType: string): string => {
    const mapping: Record<string, string> = {
      'office': 'office',
      'conference': 'conference_meeting',
      'lobby': 'lobby_public',
      'reception': 'reception',
      'retail': 'retail_sales',
      'restaurant': 'dining_room',
      'kitchen': 'kitchen_cooking',
      'gym': 'health_club_weights',
      'fitness': 'health_club_aerobics',
      'locker_room': 'spa_locker_room',
      'spa': 'spa_treatment',
      'pool': 'swimming_pool',
      'classroom': 'classroom_9plus',
      'hotel_room': 'bedroom_dorm',
      'corridor': 'corridor',
      'storage': 'storage_conditioned',
      'mechanical': 'electrical_room',
      'restroom': 'toilet_public',
      'laundry_commercial': 'hotel_laundry',
      'yoga_studio': 'yoga_studio',
      'pilates_studio': 'pilates_studio',
      'sauna': 'sauna',
      'steam_room': 'steam_room',
    }
    return mapping[zoneType] || 'office'
  }
  
  const handleImport = () => {
    const items = getItems()
    const selectedItemsList = items.filter(i => selectedItems.has(i.id))
    
    const spacesToImport = selectedItemsList.map(item => {
      const zoneType = source === 'concept' 
        ? (item as ConceptZone).zone_type 
        : (item as ScanSpace).zone_type
      
      return {
        name: item.name,
        areaSf: item.sf || 500,
        spaceType: mapToASHRAESpaceType(zoneType || 'office'),
        ceilingHeightFt: 10,
      }
    })
    
    onImport(spacesToImport)
  }
  
  const items = getItems()
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{source === 'concept' ? '📥' : '📐'}</span>
            <h3 className="text-lg font-semibold text-white">
              Import from {source === 'concept' ? 'Concept MEP' : 'Plan Scanner'} 🐐💨
            </h3>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-white">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 animate-bounce">🐐💨</div>
              <div className="text-surface-400">Loading projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📁</div>
              <div className="text-surface-400">
                No {source === 'concept' ? 'Concept MEP' : 'Plan Scanner'} projects found
              </div>
            </div>
          ) : (
            <>
              {/* Project Selection */}
              <div className="mb-4">
                <label className="block text-sm text-surface-400 mb-2">Select Project</label>
                <select
                  value={selectedProject || ''}
                  onChange={(e) => {
                    setSelectedProject(e.target.value || null)
                    setSelectedItems(new Set())
                  }}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
                >
                  <option value="">-- Select a project --</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({source === 'concept' 
                        ? `${(proj as ConceptProject).zones?.length || 0} zones`
                        : `${(proj as ScanProject).spaces?.length || 0} spaces`
                      })
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Items Selection */}
              {selectedProject && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-surface-400">
                      {source === 'concept' ? 'Zones' : 'Spaces'} to import ({selectedItems.size} selected)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAll}
                        className="text-xs text-surface-400 hover:text-white"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-surface-500">
                      No {source === 'concept' ? 'zones' : 'spaces'} in this project
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {items.map(item => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedItems.has(item.id)
                              ? 'bg-cyan-900/30 border-cyan-600'
                              : 'bg-surface-900 border-surface-700 hover:border-surface-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="w-4 h-4 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">{item.name}</div>
                            <div className="text-xs text-surface-400">
                              {item.sf?.toLocaleString() || 0} SF
                              {source === 'concept' && (item as ConceptZone).zone_type && (
                                <> • {(item as ConceptZone).zone_type}</>
                              )}
                              {source === 'scanner' && (item as ScanSpace).zone_type && (
                                <> • {(item as ScanSpace).zone_type}</>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-surface-700 flex justify-between">
          <div className="text-sm text-surface-500">
            {selectedItems.size > 0 && (
              <>Will import {selectedItems.size} space{selectedItems.size !== 1 ? 's' : ''}</>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedItems.size === 0}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-surface-700 disabled:text-surface-500 text-white font-medium rounded-lg transition-colors"
            >
              Import {selectedItems.size > 0 ? `${selectedItems.size} Space${selectedItems.size !== 1 ? 's' : ''}` : ''} 🐐
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
