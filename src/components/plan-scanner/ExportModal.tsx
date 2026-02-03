import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanProject } from '../../store/useScannerStore'
import { useProjectStore, createNewProject } from '../../store/useProjectStore'
import { usePlumbingStore, createPlumbingProject } from '../../store/usePlumbingStore'
import { useHVACStore, createHVACProject, HVACSpace } from '../../store/useHVACStore'
import { useAuthStore } from '../../store/useAuthStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import type { ZoneFixtures, ZoneType, Zone } from '../../types'
import { zoneDefaults, defaultRates } from '../../data/zoneDefaults'
import { ASHRAE62_SPACE_TYPES, matchSpaceNameToASHRAE, getSpaceType, ASHRAE62SpaceType } from '../../data/ashrae62'

interface ExportModalProps {
  scan: ScanProject
  onClose: () => void
}

type ExportTarget = 'concept-mep' | 'plumbing' | 'hvac' | 'electrical'

// Space type matching for HVAC export
interface SpaceTypeMapping {
  spaceId: string
  spaceName: string
  suggestedTypeId: string  // ASHRAE space type ID
  selectedTypeId: string
}

export default function ExportModal({ scan, onClose }: ExportModalProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setCurrentProject: setMEPCurrentProject, setZones } = useProjectStore()
  const { setCurrentProject: setPlumbingCurrentProject, setSpaces } = usePlumbingStore()
  const { setCurrentProject: setHVACCurrentProject, addSpace: addHVACSpace } = useHVACStore()
  
  const [selectedTargets, setSelectedTargets] = useState<ExportTarget[]>(['concept-mep'])
  const [projectName, setProjectName] = useState(scan.name)
  const [linkProjects, setLinkProjects] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  // HVAC space type matching modal state
  const [showHVACMatching, setShowHVACMatching] = useState(false)
  const [spaceTypeMappings, setSpaceTypeMappings] = useState<SpaceTypeMapping[]>([])
  
  // Initialize space type mappings when HVAC is selected
  const initializeHVACMappings = () => {
    const mappings: SpaceTypeMapping[] = scan.extractedSpaces.map(space => {
      const suggestedTypeId = matchSpaceNameToASHRAE(space.name)
      return {
        spaceId: space.id,
        spaceName: space.name,
        suggestedTypeId,
        selectedTypeId: suggestedTypeId || 'office',
      }
    })
    setSpaceTypeMappings(mappings)
    setShowHVACMatching(true)
  }
  
  // Group ASHRAE space types by category for dropdown
  const spaceTypesByCategory = useMemo(() => {
    const categories: Record<string, ASHRAE62SpaceType[]> = {}
    ASHRAE62_SPACE_TYPES.forEach(type => {
      if (!categories[type.category]) {
        categories[type.category] = []
      }
      categories[type.category].push(type)
    })
    return categories
  }, [])

  const toggleTarget = (target: ExportTarget) => {
    setSelectedTargets(prev =>
      prev.includes(target)
        ? prev.filter(t => t !== target)
        : [...prev, target]
    )
  }

  const handleExport = async () => {
    if (selectedTargets.length === 0 || !projectName.trim()) return
    
    // If HVAC is selected, show the space type matching modal first
    if (selectedTargets.includes('hvac') && !showHVACMatching) {
      initializeHVACMappings()
      return
    }
    
    setExporting(true)
    
    try {
      const userId = user?.id || 'dev-user'
      
      // Export to Concept MEP
      if (selectedTargets.includes('concept-mep')) {
        await exportToConceptMEP(userId, projectName)
      }
      
      // Export to Plumbing
      if (selectedTargets.includes('plumbing')) {
        await exportToPlumbing(userId, projectName)
      }
      
      // Export to HVAC
      if (selectedTargets.includes('hvac')) {
        await exportToHVAC(userId, projectName)
      }
      
      // Navigate to the first selected target
      if (selectedTargets.includes('concept-mep')) {
        navigate('/concept-mep')
      } else if (selectedTargets.includes('plumbing')) {
        navigate('/plumbing')
      } else if (selectedTargets.includes('hvac')) {
        navigate('/hvac')
      }
      
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }
  
  const exportToHVAC = async (userId: string, name: string) => {
    // Create HVAC project
    const project = createHVACProject(userId, name)
    setHVACCurrentProject(project)
    
    // Create HVAC spaces from extracted spaces with matched ASHRAE types
    for (const mapping of spaceTypeMappings) {
      const extractedSpace = scan.extractedSpaces.find(s => s.id === mapping.spaceId)
      if (!extractedSpace) continue
      
      const ashraeType = ASHRAE62_SPACE_TYPES.find(t => t.id === mapping.selectedTypeId)
      
      // Calculate ASHRAE occupancy from area and density
      const ashraeOccupancy = ashraeType 
        ? Math.ceil(extractedSpace.sf / (1000 / ashraeType.defaultOccupancy))
        : Math.ceil(extractedSpace.sf / 100)
      
      // Use the greater of seat count or ASHRAE occupancy
      const finalOccupancy = Math.max(
        extractedSpace.seatCountManual ?? extractedSpace.seatCountAI ?? 0,
        ashraeOccupancy
      )
      
      const hvacSpace: Omit<HVACSpace, 'id'> = {
        projectId: project.id,
        name: extractedSpace.name,
        ashraeSpaceType: mapping.selectedTypeId,
        areaSf: extractedSpace.sf,
        ceilingHeightFt: 10, // Default
        occupancyOverride: finalOccupancy,
        zoneId: null,
        notes: `Imported from Plan Scan. ASHRAE type: ${ashraeType?.name || 'Unknown'}`,
        floor: extractedSpace.floor,
      }
      
      addHVACSpace(hvacSpace)
    }
    
    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      await supabase.from('hvac_projects').insert({
        id: project.id,
        user_id: userId,
        name,
        settings: project.settings,
      } as never)
    }
  }

  // Map extracted zone type to valid ZoneType
  const mapToZoneType = (extracted: string | undefined): ZoneType => {
    if (!extracted) return 'storage' // Default fallback
    
    // Direct mappings
    const mappings: Record<string, ZoneType> = {
      'lobby': 'reception',
      'reception': 'reception',
      'locker_room_male': 'locker_room',
      'locker_room_female': 'locker_room',
      'locker_room_unisex': 'locker_room',
      'locker_room': 'locker_room',
      'restroom_public': 'restroom',
      'restroom_private': 'restroom',
      'restroom': 'restroom',
      'shower_room': 'locker_room',
      'pool_lap': 'pool_indoor',
      'pool_therapy': 'pool_indoor',
      'pool_plunge_hot': 'hot_tub',
      'pool_plunge_cold': 'cold_plunge',
      'spa_treatment': 'treatment_room',
      'massage_room': 'massage_room',
      'fitness_cardio': 'open_gym',
      'fitness_weights': 'open_gym',
      'fitness_studio': 'group_fitness',
      'mechanical_room': 'mechanical_room',
      'storage': 'storage',
      'office_private': 'office',
      'office_open': 'office',
      'conference_room': 'conference_room',
      'sauna_dry': 'sauna_electric',
      'sauna_wet': 'sauna_electric',
      'steam_room': 'steam_room',
      'break_room': 'break_room',
      'kitchen_commercial': 'kitchen_commercial',
      'retail': 'retail',
      'other': 'storage',
    }
    
    return mappings[extracted] || 'storage'
  }

  const exportToConceptMEP = async (userId: string, name: string) => {
    const totalSF = scan.extractedSpaces.reduce((sum, s) => sum + s.sf, 0)
    
    // Create project using helper
    const project = createNewProject(userId, name, totalSF, 'temperate', true)
    
    // Build zones from extracted spaces
    const zones: Zone[] = scan.extractedSpaces.map((space, index) => {
      const zoneType = mapToZoneType(space.zoneType)
      const defaults = zoneDefaults[zoneType]
      
      // Convert extracted fixtures to ZoneFixtures format
      const fixtures: ZoneFixtures = {}
      if (space.fixtures.toilets) fixtures.water_closet_public = space.fixtures.toilets
      if (space.fixtures.urinals) fixtures.urinal_public = space.fixtures.urinals
      if (space.fixtures.lavatories) fixtures.lavatory_public = space.fixtures.lavatories
      if (space.fixtures.showers) fixtures.shower_public = space.fixtures.showers
      if (space.fixtures.floor_drains) fixtures.floor_drain_2in = space.fixtures.floor_drains
      if (space.fixtures.drinking_fountains) fixtures.drinking_fountain = space.fixtures.drinking_fountains
      
      return {
        id: uuidv4(),
        projectId: project.id,
        name: space.name,
        type: zoneType,
        subType: defaults?.defaultSubType || 'electric',
        sf: space.sf,
        color: '#64748b',
        fixtures,
        rates: defaults?.defaultRates || { ...defaultRates },
        processLoads: {
          fixed_kw: 0,
          gas_mbh: 0,
          ventilation_cfm: 0,
          exhaust_cfm: 0,
          pool_heater_mbh: 0,
          dehumid_lb_hr: 0,
          flue_size_in: 0,
          ceiling_height_ft: 10,
        },
        lineItems: [],
        sortOrder: index,
      } as Zone
    })
    
    // Set in store
    setMEPCurrentProject(project)
    setZones(zones)
    
    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      await supabase.from('projects').insert({
        id: project.id,
        user_id: userId,
        name,
        target_sf: totalSF,
        climate: 'temperate',
        electric_primary: true,
        contingency: 0.25,
        dhw_settings: project.dhwSettings,
        electrical_settings: project.electricalSettings,
        mechanical_settings: project.mechanicalSettings,
      } as never)
      
      // Save zones
      if (zones.length > 0) {
        await supabase.from('zones').insert(
          zones.map(z => ({
            id: z.id,
            project_id: project.id,
            name: z.name,
            zone_type: z.type,
            sub_type: z.subType,
            sf: z.sf,
            color: z.color,
            fixtures: z.fixtures,
            rates: z.rates,
            process_loads: z.processLoads,
            line_items: z.lineItems,
            sort_order: z.sortOrder,
          })) as never
        )
      }
    }
  }

  const exportToPlumbing = async (userId: string, name: string) => {
    // Create plumbing project
    const project = createPlumbingProject(userId, name)
    
    // Convert spaces
    const plumbingSpaces = scan.extractedSpaces.map((space, index) => ({
      id: uuidv4(),
      projectId: project.id,
      name: space.name,
      sf: space.sf,
      occupancy: 0,
      fixtures: {
        water_closet_public: space.fixtures.toilets || 0,
        urinal_public: space.fixtures.urinals || 0,
        lavatory_public: space.fixtures.lavatories || 0,
        shower_public: space.fixtures.showers || 0,
        floor_drain_2in: space.fixtures.floor_drains || 0,
        drinking_fountain: space.fixtures.drinking_fountains || 0,
      } as ZoneFixtures,
      notes: `Imported from scan: ${scan.name}`,
      sortOrder: index,
    }))
    
    setPlumbingCurrentProject(project)
    setSpaces(plumbingSpaces)
    
    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      await supabase.from('plumbing_projects').insert({
        id: project.id,
        user_id: userId,
        name,
        settings: project.settings,
      } as never)
      
      if (plumbingSpaces.length > 0) {
        await supabase.from('plumbing_spaces').insert(
          plumbingSpaces.map(s => ({
            id: s.id,
            project_id: s.projectId,
            name: s.name,
            sf: s.sf,
            occupancy: s.occupancy,
            fixtures: s.fixtures,
            notes: s.notes,
            sort_order: s.sortOrder,
          })) as never
        )
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Export to Modules 📤</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Project Name */}
        <div className="mb-6">
          <label className="block text-sm text-surface-400 mb-2">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Target Selection */}
        <div className="mb-6">
          <label className="block text-sm text-surface-400 mb-3">Export To</label>
          <div className="grid grid-cols-2 gap-3">
            <TargetButton
              icon="🏗️"
              title="Concept MEP"
              selected={selectedTargets.includes('concept-mep')}
              onClick={() => toggleTarget('concept-mep')}
            />
            <TargetButton
              icon="🚿"
              title="Plumbing"
              selected={selectedTargets.includes('plumbing')}
              onClick={() => toggleTarget('plumbing')}
            />
            <TargetButton
              icon="❄️"
              title="HVAC"
              selected={selectedTargets.includes('hvac')}
              onClick={() => toggleTarget('hvac')}
            />
            <TargetButton
              icon="⚡"
              title="Electrical"
              selected={false}
              onClick={() => {}}
              disabled
            />
          </div>
        </div>

        {/* Link Option */}
        <div className="mb-6 p-4 bg-surface-700/50 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={linkProjects}
              onChange={(e) => setLinkProjects(e.target.checked)}
              className="w-5 h-5 rounded border-surface-500 bg-surface-600 text-violet-500 focus:ring-violet-500"
            />
            <div>
              <p className="text-white font-medium">Link Projects</p>
              <p className="text-sm text-surface-400">
                Changes in one module will sync to others (experimental)
              </p>
            </div>
          </label>
        </div>

        {/* Summary */}
        <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
          <p className="text-sm text-violet-300">
            <span className="font-semibold">{scan.extractedSpaces.length} spaces</span> with{' '}
            <span className="font-semibold">
              {scan.extractedSpaces.reduce((sum, s) => sum + Object.values(s.fixtures).reduce((a, b) => a + b, 0), 0)} fixtures
            </span>{' '}
            will be exported to {selectedTargets.length} module{selectedTargets.length !== 1 ? 's' : ''}.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selectedTargets.length === 0 || !projectName.trim()}
            className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <span className="animate-spin">🔄</span>
                Exporting...
              </>
            ) : (
              <>Export 🐐</>
            )}
          </button>
        </div>
      </div>
      
      {/* HVAC Space Type Matching Modal */}
      {showHVACMatching && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-700">
              <div>
                <h2 className="text-xl font-bold text-white">Match Spaces to ASHRAE 62.1 Types ❄️</h2>
                <p className="text-sm text-surface-400 mt-1">
                  Review AI suggestions and adjust space types for accurate ventilation calculations
                </p>
              </div>
              <button
                onClick={() => setShowHVACMatching(false)}
                className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {spaceTypeMappings.map((mapping, index) => {
                  const selectedType = ASHRAE62_SPACE_TYPES.find(t => t.id === mapping.selectedTypeId)
                  const extractedSpace = scan.extractedSpaces.find(s => s.id === mapping.spaceId)
                  
                  return (
                    <div 
                      key={mapping.spaceId}
                      className="flex items-center gap-4 p-4 bg-surface-700/50 rounded-xl border border-surface-600"
                    >
                      {/* Space Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">{mapping.spaceName}</span>
                          {extractedSpace?.floor && (
                            <span className="px-2 py-0.5 rounded bg-violet-600/30 text-violet-300 text-xs">
                              {extractedSpace.floor}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
                          <span>{extractedSpace?.sf?.toLocaleString() || 0} SF</span>
                          {mapping.suggestedTypeId && (
                            <span className="text-emerald-400">
                              AI suggested: {getSpaceType(mapping.suggestedTypeId)?.name || mapping.suggestedTypeId}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="text-surface-500">→</div>
                      
                      {/* ASHRAE Type Selector */}
                      <div className="w-80">
                        <select
                          value={mapping.selectedTypeId}
                          onChange={(e) => {
                            setSpaceTypeMappings(prev => prev.map((m, i) => 
                              i === index ? { ...m, selectedTypeId: e.target.value } : m
                            ))
                          }}
                          className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                        >
                          {Object.entries(spaceTypesByCategory).map(([category, types]) => (
                            <optgroup key={category} label={category}>
                              {types.map(type => (
                                <option key={type.id} value={type.id}>
                                  {type.name} (Rp: {type.Rp}, Ra: {type.Ra})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {selectedType && (
                          <div className="mt-1 text-xs text-surface-500">
                            Default: {selectedType.defaultOccupancy} people/1000 SF
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-surface-700 bg-surface-800/50">
              <div className="text-sm text-surface-400">
                {spaceTypeMappings.length} spaces ready to import
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHVACMatching(false)}
                  className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      Importing...
                    </>
                  ) : (
                    <>Import to HVAC 🐐</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TargetButton({ icon, title, selected, onClick, disabled }: {
  icon: string
  title: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-xl border text-left transition-all ${
        disabled
          ? 'bg-surface-700/30 border-surface-700 opacity-50 cursor-not-allowed'
          : selected
          ? 'bg-violet-600/20 border-violet-500'
          : 'bg-surface-700/50 border-surface-600 hover:border-surface-500'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className={`font-medium ${selected ? 'text-violet-300' : 'text-white'}`}>{title}</span>
        {selected && (
          <svg className="w-5 h-5 text-violet-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {disabled && (
          <span className="text-xs text-surface-500 ml-auto">Soon</span>
        )}
      </div>
    </button>
  )
}
