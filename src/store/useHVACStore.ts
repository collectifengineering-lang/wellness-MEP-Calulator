import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// HVAC Module Types
// ============================================

export interface HVACSpace {
  id: string
  projectId: string
  name: string
  spaceType: string           // Reference to ASHRAE 62.1 space type
  areaSf: number
  ceilingHeightFt: number
  occupancyOverride?: number  // Manual override for occupancy
  zoneId?: string             // Which zone this space belongs to
  notes?: string
  sortOrder: number
  
  // Ventilation Rate Overrides (if set, override ASHRAE 62.1 defaults)
  rpOverride?: number         // CFM/person override
  raOverride?: number         // CFM/SF override
  
  // ACH-based ventilation (alternative to Rp/Ra)
  ventilationAch?: number     // Ventilation air changes per hour
  exhaustAch?: number         // Exhaust air changes per hour  
  supplyAch?: number          // Forced supply ACH (overrides calculated)
  
  // Standalone Fan Tagging
  exhaustFanTag?: string      // Tag for standalone exhaust fan (e.g., "EF-1")
  supplyFanTag?: string       // Tag for standalone supply fan (e.g., "SF-1")
}

export interface HVACZone {
  id: string
  projectId: string
  name: string
  ez: number                  // Zone air distribution effectiveness (default 1.0)
  heatingSetpoint: number     // °F (default 70)
  coolingSetpoint: number     // °F (default 75)
  systemId?: string           // Which system this zone belongs to
  sortOrder: number
}

export interface HVACSystem {
  id: string
  projectId: string
  name: string
  systemType: 'single_zone' | 'vav_multi_zone' | 'doas_100_oa'
  // ERV Settings
  ervEnabled: boolean
  ervSensibleEfficiency: number  // 0-1 (e.g., 0.75 = 75%)
  ervLatentEfficiency: number    // 0-1
  // Diversity
  occupancyDiversity: number     // 0-1 (default 1.0 for single zone, 0.8 for multi)
  sortOrder: number
}

// Standalone fans (exhaust or supply) not part of main HVAC systems
export interface StandaloneFan {
  id: string
  projectId: string
  tag: string                    // e.g., "EF-1", "SF-2"
  name: string                   // e.g., "Restroom Exhaust", "Kitchen Supply"
  fanType: 'exhaust' | 'supply'
  cfm: number                    // Calculated from tagged spaces
  notes?: string
}

export interface HVACProjectSettings {
  // Location & Climate
  locationId: string | null           // Reference to ASHRAELocation
  customLocation?: {
    name: string
    cooling_04_db: number
    cooling_04_mcwb: number
    cooling_1_db: number
    cooling_1_mcwb: number
    heating_99_db: number
    heating_996_db: number
    elevation_ft: number
  }
  // Design condition selection
  coolingDesignCondition: '0.4%' | '1%'   // Which cooling condition to use
  heatingDesignCondition: '99%' | '99.6%' // Which heating condition to use
  // Indoor Design Conditions
  summerIndoorDb: number              // Default 75°F
  summerIndoorRh: number              // Default 50%
  winterIndoorDb: number              // Default 70°F
  winterIndoorRh: number              // Default 30%
  // Corrections
  altitudeCorrection: boolean         // Auto-apply density correction
}

export interface HVACProject {
  id: string
  userId: string
  name: string
  settings: HVACProjectSettings
  linkedScanId?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// Default Values
// ============================================

export const defaultHVACProjectSettings: HVACProjectSettings = {
  locationId: null,
  coolingDesignCondition: '0.4%',
  heatingDesignCondition: '99%',
  summerIndoorDb: 75,
  summerIndoorRh: 50,
  winterIndoorDb: 70,
  winterIndoorRh: 30,
  altitudeCorrection: true,
}

export const defaultHVACSpace: Omit<HVACSpace, 'id' | 'projectId' | 'sortOrder'> = {
  name: 'New Space',
  spaceType: 'office',
  areaSf: 500,
  ceilingHeightFt: 10,
}

export const defaultHVACZone: Omit<HVACZone, 'id' | 'projectId' | 'sortOrder'> = {
  name: 'New Zone',
  ez: 1.0,
  heatingSetpoint: 70,
  coolingSetpoint: 75,
}

export const defaultHVACSystem: Omit<HVACSystem, 'id' | 'projectId' | 'sortOrder'> = {
  name: 'New System',
  systemType: 'vav_multi_zone',
  ervEnabled: false,
  ervSensibleEfficiency: 0.75,
  ervLatentEfficiency: 0.65,
  occupancyDiversity: 0.8,
}

// ============================================
// Store Interface
// ============================================

interface HVACStore {
  // Current project data
  currentProject: HVACProject | null
  spaces: HVACSpace[]
  zones: HVACZone[]
  systems: HVACSystem[]
  
  // Actions
  setCurrentProject: (project: HVACProject | null) => void
  setSpaces: (spaces: HVACSpace[]) => void
  setZones: (zones: HVACZone[]) => void
  setSystems: (systems: HVACSystem[]) => void
  
  // Project CRUD
  createProject: (userId: string, name: string) => HVACProject
  updateProject: (updates: Partial<HVACProject>) => void
  updateProjectSettings: (settings: Partial<HVACProjectSettings>) => void
  
  // Space CRUD
  addSpace: (space?: Partial<HVACSpace>) => HVACSpace
  updateSpace: (spaceId: string, updates: Partial<HVACSpace>) => void
  deleteSpace: (spaceId: string) => void
  
  // Zone CRUD
  addZone: (zone?: Partial<HVACZone>) => HVACZone
  updateZone: (zoneId: string, updates: Partial<HVACZone>) => void
  deleteZone: (zoneId: string) => void
  
  // System CRUD
  addSystem: (system?: Partial<HVACSystem>) => HVACSystem
  updateSystem: (systemId: string, updates: Partial<HVACSystem>) => void
  deleteSystem: (systemId: string) => void
  
  // Organization actions
  assignSpaceToZone: (spaceId: string, zoneId: string | null) => void
  assignZoneToSystem: (zoneId: string, systemId: string | null) => void
  
  // Bulk operations
  importSpacesFromScan: (scanData: Array<{ name: string; areaSf: number; spaceType?: string }>) => void
  
  // Reset
  resetProject: () => void
}

// ============================================
// Zustand Store
// ============================================

export const useHVACStore = create<HVACStore>()(
  persist(
    (set, get) => ({
      currentProject: null,
      spaces: [],
      zones: [],
      systems: [],
      
      setCurrentProject: (project) => set({ currentProject: project }),
      setSpaces: (spaces) => set({ spaces }),
      setZones: (zones) => set({ zones }),
      setSystems: (systems) => set({ systems }),
      
      // Project CRUD
      createProject: (userId, name) => {
        const project: HVACProject = {
          id: uuidv4(),
          userId,
          name,
          settings: { ...defaultHVACProjectSettings },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set({ 
          currentProject: project, 
          spaces: [], 
          zones: [], 
          systems: [] 
        })
        return project
      },
      
      updateProject: (updates) => {
        const { currentProject } = get()
        if (!currentProject) return
        set({
          currentProject: {
            ...currentProject,
            ...updates,
            updatedAt: new Date(),
          },
        })
      },
      
      updateProjectSettings: (settings) => {
        const { currentProject } = get()
        if (!currentProject) return
        set({
          currentProject: {
            ...currentProject,
            settings: { ...currentProject.settings, ...settings },
            updatedAt: new Date(),
          },
        })
      },
      
      // Space CRUD
      addSpace: (spaceData) => {
        const { currentProject, spaces } = get()
        if (!currentProject) throw new Error('No project selected')
        
        const newSpace: HVACSpace = {
          id: uuidv4(),
          projectId: currentProject.id,
          ...defaultHVACSpace,
          ...spaceData,
          sortOrder: spaces.length,
        }
        
        set({ spaces: [...spaces, newSpace] })
        return newSpace
      },
      
      updateSpace: (spaceId, updates) => {
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId ? { ...s, ...updates } : s
          ),
        }))
      },
      
      deleteSpace: (spaceId) => {
        set((state) => ({
          spaces: state.spaces.filter((s) => s.id !== spaceId),
        }))
      },
      
      // Zone CRUD
      addZone: (zoneData) => {
        const { currentProject, zones } = get()
        if (!currentProject) throw new Error('No project selected')
        
        const newZone: HVACZone = {
          id: uuidv4(),
          projectId: currentProject.id,
          ...defaultHVACZone,
          ...zoneData,
          sortOrder: zones.length,
        }
        
        set({ zones: [...zones, newZone] })
        return newZone
      },
      
      updateZone: (zoneId, updates) => {
        set((state) => ({
          zones: state.zones.map((z) =>
            z.id === zoneId ? { ...z, ...updates } : z
          ),
        }))
      },
      
      deleteZone: (zoneId) => {
        // Also unassign any spaces from this zone
        set((state) => ({
          zones: state.zones.filter((z) => z.id !== zoneId),
          spaces: state.spaces.map((s) =>
            s.zoneId === zoneId ? { ...s, zoneId: undefined } : s
          ),
        }))
      },
      
      // System CRUD
      addSystem: (systemData) => {
        const { currentProject, systems } = get()
        if (!currentProject) throw new Error('No project selected')
        
        const newSystem: HVACSystem = {
          id: uuidv4(),
          projectId: currentProject.id,
          ...defaultHVACSystem,
          ...systemData,
          sortOrder: systems.length,
        }
        
        set({ systems: [...systems, newSystem] })
        return newSystem
      },
      
      updateSystem: (systemId, updates) => {
        set((state) => ({
          systems: state.systems.map((sys) =>
            sys.id === systemId ? { ...sys, ...updates } : sys
          ),
        }))
      },
      
      deleteSystem: (systemId) => {
        // Also unassign any zones from this system
        set((state) => ({
          systems: state.systems.filter((sys) => sys.id !== systemId),
          zones: state.zones.map((z) =>
            z.systemId === systemId ? { ...z, systemId: undefined } : z
          ),
        }))
      },
      
      // Organization actions
      assignSpaceToZone: (spaceId, zoneId) => {
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId ? { ...s, zoneId: zoneId ?? undefined } : s
          ),
        }))
      },
      
      assignZoneToSystem: (zoneId, systemId) => {
        set((state) => ({
          zones: state.zones.map((z) =>
            z.id === zoneId ? { ...z, systemId: systemId ?? undefined } : z
          ),
        }))
      },
      
      // Bulk operations
      importSpacesFromScan: (scanData) => {
        const { currentProject, spaces } = get()
        if (!currentProject) return
        
        const newSpaces: HVACSpace[] = scanData.map((data, index) => ({
          id: uuidv4(),
          projectId: currentProject.id,
          name: data.name,
          spaceType: data.spaceType || 'office',
          areaSf: data.areaSf,
          ceilingHeightFt: 10,
          sortOrder: spaces.length + index,
        }))
        
        set({ spaces: [...spaces, ...newSpaces] })
      },
      
      // Reset
      resetProject: () => {
        set({
          currentProject: null,
          spaces: [],
          zones: [],
          systems: [],
        })
      },
    }),
    {
      name: 'hvac-store',
      partialize: () => ({}), // Don't persist - load from Supabase
    }
  )
)

// ============================================
// Helper Functions
// ============================================

export function createHVACProject(userId: string, name: string): HVACProject {
  return {
    id: uuidv4(),
    userId,
    name,
    settings: { ...defaultHVACProjectSettings },
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Get spaces for a specific zone
export function getSpacesInZone(spaces: HVACSpace[], zoneId: string): HVACSpace[] {
  return spaces.filter(s => s.zoneId === zoneId)
}

// Get zones for a specific system
export function getZonesInSystem(zones: HVACZone[], systemId: string): HVACZone[] {
  return zones.filter(z => z.systemId === systemId)
}

// Get unassigned spaces (not in any zone)
export function getUnassignedSpaces(spaces: HVACSpace[]): HVACSpace[] {
  return spaces.filter(s => !s.zoneId)
}

// Get unassigned zones (not in any system)
export function getUnassignedZones(zones: HVACZone[]): HVACZone[] {
  return zones.filter(z => !z.systemId)
}
