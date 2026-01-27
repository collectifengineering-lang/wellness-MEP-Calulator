import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanProject } from '../../store/useScannerStore'
import { useProjectStore, createNewProject } from '../../store/useProjectStore'
import { usePlumbingStore, createPlumbingProject } from '../../store/usePlumbingStore'
import { useAuthStore } from '../../store/useAuthStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import type { ZoneFixtures, ZoneType, Zone } from '../../types'
import { zoneDefaults, defaultRates } from '../../data/zoneDefaults'

interface ExportModalProps {
  scan: ScanProject
  onClose: () => void
}

type ExportTarget = 'concept-mep' | 'plumbing' | 'hvac' | 'electrical'

export default function ExportModal({ scan, onClose }: ExportModalProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setCurrentProject: setMEPCurrentProject, setZones } = useProjectStore()
  const { setCurrentProject: setPlumbingCurrentProject, setSpaces } = usePlumbingStore()
  
  const [selectedTargets, setSelectedTargets] = useState<ExportTarget[]>(['concept-mep'])
  const [projectName, setProjectName] = useState(scan.name)
  const [linkProjects, setLinkProjects] = useState(false)
  const [exporting, setExporting] = useState(false)

  const toggleTarget = (target: ExportTarget) => {
    setSelectedTargets(prev =>
      prev.includes(target)
        ? prev.filter(t => t !== target)
        : [...prev, target]
    )
  }

  const handleExport = async () => {
    if (selectedTargets.length === 0 || !projectName.trim()) return
    
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
      
      // Navigate to the first selected target
      if (selectedTargets.includes('concept-mep')) {
        navigate('/concept-mep')
      } else if (selectedTargets.includes('plumbing')) {
        navigate('/plumbing')
      }
      
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
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
              selected={false}
              onClick={() => {}}
              disabled
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
