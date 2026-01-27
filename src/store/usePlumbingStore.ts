import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { ZoneFixtures } from '../types'

// Plumbing-specific types
export interface PlumbingSpace {
  id: string
  projectId: string
  name: string
  sf: number
  fixtures: ZoneFixtures
  occupancy?: number
  notes?: string
  sortOrder: number
}

export interface PlumbingProjectSettings {
  // Pipe sizing
  coldWaterVelocityFps: number
  hotWaterVelocityFps: number
  hotWaterFlowRatio: number       // Manual HW/Total ratio (0.3-0.8)
  useCalculatedHWRatio: boolean   // If true, use ratio calculated from fixture WSFU
  // DHW - ASHRAE Parameters
  dhwHeaterType: 'gas' | 'electric'
  dhwSystemType: 'storage' | 'tankless' | 'hybrid'
  dhwBuildingType: string  // ASHRAE building type (gymnasium, hotel, etc.)
  dhwStorageTemp: number   // Storage tank temperature (°F)
  dhwDeliveryTemp: number  // Delivery/fixture temp (°F)
  coldWaterTemp: number    // Incoming cold water (°F)
  dhwPeakDuration: number  // Hours of peak demand
  dhwDemandFactor: number  // Simultaneity/diversity factor (0-1)
  dhwStorageFactor: number // Usable tank percentage (0.5-0.9)
  dhwRecoveryFactor: number // Heater sizing multiplier
  dhwGasEfficiency: number // Gas heater efficiency (0.80-0.98)
  dhwTanklessUnitBtu: number // Per-unit tankless capacity (BTU/hr)
  // Gas
  gasDiversityFactor: number
}

export interface PlumbingProject {
  id: string
  userId: string
  name: string
  settings: PlumbingProjectSettings
  linkedScanId?: string
  createdAt: Date
  updatedAt: Date
}

// Default settings
export const defaultPlumbingSettings: PlumbingProjectSettings = {
  coldWaterVelocityFps: 8,
  hotWaterVelocityFps: 5,
  hotWaterFlowRatio: 0.6,        // Manual fallback: 60% of total flow
  useCalculatedHWRatio: true,    // Default: use calculated from fixture WSFU
  // DHW defaults for Gymnasium/Health Club (most common for this app)
  dhwHeaterType: 'gas',
  dhwSystemType: 'storage',
  dhwBuildingType: 'gymnasium',
  dhwStorageTemp: 140,
  dhwDeliveryTemp: 110,
  coldWaterTemp: 55,
  dhwPeakDuration: 2.0,        // 2 hours peak
  dhwDemandFactor: 0.70,       // 70% simultaneity
  dhwStorageFactor: 0.70,      // 70% usable storage
  dhwRecoveryFactor: 1.0,      // 1.0x recovery factor
  dhwGasEfficiency: 0.82,      // Power-vented efficiency
  dhwTanklessUnitBtu: 199900,  // Navien standard unit
  gasDiversityFactor: 0.8,
}

// Default fixtures for new spaces
export const defaultFixtures: ZoneFixtures = {
  showers: 0,
  lavs: 0,
  wcs: 0,
  floorDrains: 0,
  serviceSinks: 0,
  washingMachines: 0,
  dryers: 0,
}

interface PlumbingStore {
  // Current project
  currentProject: PlumbingProject | null
  spaces: PlumbingSpace[]
  
  // Actions
  setCurrentProject: (project: PlumbingProject | null) => void
  setSpaces: (spaces: PlumbingSpace[]) => void
  
  // Project CRUD
  createProject: (userId: string, name: string) => PlumbingProject
  updateProject: (updates: Partial<PlumbingProject>) => void
  updateProjectSettings: (settings: Partial<PlumbingProjectSettings>) => void
  
  // Space CRUD
  addSpace: (name?: string, sf?: number) => void
  updateSpace: (spaceId: string, updates: Partial<PlumbingSpace>) => void
  deleteSpace: (spaceId: string) => void
  reorderSpaces: (spaces: PlumbingSpace[]) => void
  
  // Fixture updates
  updateSpaceFixtures: (spaceId: string, fixtures: Partial<ZoneFixtures>) => void
  
  // Import from scan
  importFromScan: (scanData: { name: string; sf: number; fixtures?: Partial<ZoneFixtures> }[]) => void
}

export const usePlumbingStore = create<PlumbingStore>()(
  persist(
    (set, get) => ({
      currentProject: null,
      spaces: [],
      
      setCurrentProject: (project) => set({ currentProject: project }),
      setSpaces: (spaces) => set({ spaces }),
      
      createProject: (userId, name) => {
        const project: PlumbingProject = {
          id: uuidv4(),
          userId,
          name,
          settings: { ...defaultPlumbingSettings },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set({ currentProject: project, spaces: [] })
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
      
      addSpace: (name, sf) => {
        const { currentProject, spaces } = get()
        if (!currentProject) return
        
        const newSpace: PlumbingSpace = {
          id: uuidv4(),
          projectId: currentProject.id,
          name: name || `Space ${spaces.length + 1}`,
          sf: sf || 500,
          fixtures: { ...defaultFixtures },
          sortOrder: spaces.length,
        }
        
        set({ spaces: [...spaces, newSpace] })
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
      
      reorderSpaces: (spaces) => {
        set({ spaces: spaces.map((s, i) => ({ ...s, sortOrder: i })) })
      },
      
      updateSpaceFixtures: (spaceId, fixtures) => {
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId
              ? { ...s, fixtures: { ...s.fixtures, ...fixtures } as ZoneFixtures }
              : s
          ),
        }))
      },
      
      importFromScan: (scanData) => {
        const { currentProject, spaces } = get()
        if (!currentProject) return
        
        const newSpaces: PlumbingSpace[] = scanData.map((data, index) => ({
          id: uuidv4(),
          projectId: currentProject.id,
          name: data.name,
          sf: data.sf,
          fixtures: { ...defaultFixtures, ...(data.fixtures || {}) } as ZoneFixtures,
          sortOrder: spaces.length + index,
        }))
        
        set({ spaces: [...spaces, ...newSpaces] })
      },
    }),
    {
      name: 'plumbing-store',
      partialize: () => ({
        // Don't persist - we'll load from Supabase
      }),
    }
  )
)

// Helper to create a new project
export function createPlumbingProject(userId: string, name: string): PlumbingProject {
  return {
    id: uuidv4(),
    userId,
    name,
    settings: { ...defaultPlumbingSettings },
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
