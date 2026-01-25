import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Project, Zone, DHWSettings, ResultAdjustments, ClimateType, ZoneType, LineItem, ZoneFixtures, ZoneProcessLoads } from '../types'
import { getZoneColor, calculateFixturesFromSF, type ZoneDefaults } from '../data/zoneDefaults'
import { useSettingsStore } from './useSettingsStore'
import { getDefaultDHWSettings, getDefaultResultAdjustments, getDefaultElectricalSettings } from '../data/defaults'

// Default process loads (all zeros)
const defaultProcessLoads: ZoneProcessLoads = {
  fixed_kw: 0,
  gas_mbh: 0,
  ventilation_cfm: 0,
  exhaust_cfm: 0,
  pool_heater_mbh: 0,
  dehumid_lb_hr: 0,
  flue_size_in: 0,
  ceiling_height_ft: 10,
}

// Calculate process loads from zone defaults and square footage
export function calculateProcessLoads(defaults: ZoneDefaults, sf: number, subType: 'electric' | 'gas'): ZoneProcessLoads {
  const ceilingHeight = defaults.ceiling_height_ft || 10
  
  // Calculate fixed_kw for zones with kw_per_cubic_meter (electric saunas, steam rooms)
  let fixed_kw = defaults.fixed_kw || 0
  if (defaults.kw_per_cubic_meter && subType === 'electric') {
    // SF × height (ft) → cubic feet → cubic meters × kW/m³
    const cubicFeet = sf * ceilingHeight
    const cubicMeters = cubicFeet * 0.0283168 // 1 cubic foot = 0.0283168 m³
    fixed_kw = Math.round(cubicMeters * defaults.kw_per_cubic_meter)
  }
  
  // Calculate gas_mbh 
  let gas_mbh = defaults.gas_mbh || 0
  if (defaults.gas_mbh_per_sf && subType === 'gas') {
    gas_mbh = sf * defaults.gas_mbh_per_sf
  }
  
  return {
    fixed_kw,
    gas_mbh,
    ventilation_cfm: defaults.ventilation_cfm || 0,
    exhaust_cfm: defaults.exhaust_cfm || 0,
    pool_heater_mbh: defaults.pool_heater_gas_mbh || 0,
    dehumid_lb_hr: defaults.dehumidification_lb_hr || 0,
    flue_size_in: defaults.flue_size_in || 0,
    ceiling_height_ft: ceilingHeight,
  }
}

interface ProjectState {
  // Current project
  currentProject: Project | null
  zones: Zone[]
  
  // Project actions
  setCurrentProject: (project: Project | null) => void
  updateProject: (updates: Partial<Project>) => void
  
  // Zone actions
  setZones: (zones: Zone[]) => void
  addZone: (type: ZoneType, name?: string, sf?: number) => void
  updateZone: (zoneId: string, updates: Partial<Zone>) => void
  deleteZone: (zoneId: string) => void
  reorderZones: (startIndex: number, endIndex: number) => void
  
  // Line item actions
  addLineItem: (zoneId: string, lineItem: Omit<LineItem, 'id'>) => void
  updateLineItem: (zoneId: string, lineItemId: string, updates: Partial<LineItem>) => void
  deleteLineItem: (zoneId: string, lineItemId: string) => void
  
  // DHW settings
  updateDHWSettings: (settings: Partial<DHWSettings>) => void
  
  // Result adjustments
  updateResultAdjustments: (adjustments: Partial<ResultAdjustments>) => void
  
  // Computed values
  getTotalSF: () => number
  getAggregatedFixtures: () => ZoneFixtures
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  zones: [],
  
  setCurrentProject: (project) => set({ currentProject: project }),
  
  updateProject: (updates) => set((state) => ({
    currentProject: state.currentProject 
      ? { ...state.currentProject, ...updates, updatedAt: new Date() }
      : null
  })),
  
  setZones: (zones) => set({ zones }),
  
  addZone: (type, name, sf) => {
    // Get defaults from settings store (which includes custom overrides)
    const settingsStore = useSettingsStore.getState()
    const defaults = settingsStore.getZoneDefaults(type)
    const zoneSF = sf || defaults.defaultSF || 1000
    const subType = defaults.defaultSubType || 'electric'
    
    // Auto-calculate fixtures for restroom/locker_room based on SF
    const autoFixtures = calculateFixturesFromSF(type, zoneSF)
    
    // Calculate process loads (fixed_kw, gas_mbh, etc.) based on SF
    const processLoads = calculateProcessLoads(defaults, zoneSF, subType)
    
    const newZone: Zone = {
      id: uuidv4(),
      projectId: get().currentProject?.id || '',
      name: name || defaults.displayName,
      type,
      subType,
      sf: zoneSF,
      color: getZoneColor(type),
      fixtures: { ...defaults.defaultFixtures, ...autoFixtures },
      rates: { ...defaults.defaultRates },
      processLoads,
      lineItems: [],
      sortOrder: get().zones.length,
    }
    set((state) => ({ zones: [...state.zones, newZone] }))
  },
  
  updateZone: (zoneId, updates) => set((state) => ({
    zones: state.zones.map((z) => {
      if (z.id !== zoneId) return z
      
      const settingsStore = useSettingsStore.getState()
      const newSF = updates.sf ?? z.sf
      const zoneType = updates.type ?? z.type
      const subType = updates.subType ?? z.subType
      const defaults = settingsStore.getZoneDefaults(zoneType)
      
      // If SF changed and this is a fixture-per-SF zone, recalculate fixtures
      let fixtureUpdates = {}
      if (updates.sf && (zoneType === 'restroom' || zoneType === 'locker_room')) {
        fixtureUpdates = calculateFixturesFromSF(zoneType, newSF)
      }
      
      // If SF or subType changed, recalculate process loads for zones with kw_per_cubic_meter
      let processLoadsUpdates: Partial<ZoneProcessLoads> = {}
      if ((updates.sf || updates.subType) && defaults.kw_per_cubic_meter) {
        const newProcessLoads = calculateProcessLoads(defaults, newSF, subType)
        // Only auto-update fixed_kw if it was calculated from kw_per_cubic_meter
        // Don't override user's manual edits unless they changed SF
        if (updates.sf) {
          processLoadsUpdates = { fixed_kw: newProcessLoads.fixed_kw }
        }
        if (updates.subType) {
          // Switching between electric/gas changes fixed_kw vs gas_mbh
          processLoadsUpdates = {
            fixed_kw: newProcessLoads.fixed_kw,
            gas_mbh: newProcessLoads.gas_mbh,
          }
        }
      }
      
      return { 
        ...z, 
        ...updates,
        fixtures: { ...z.fixtures, ...updates.fixtures, ...fixtureUpdates },
        processLoads: { 
          ...(z.processLoads || defaultProcessLoads), 
          ...updates.processLoads, 
          ...processLoadsUpdates 
        }
      }
    })
  })),
  
  deleteZone: (zoneId) => set((state) => ({
    zones: state.zones.filter((z) => z.id !== zoneId)
  })),
  
  reorderZones: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.zones)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return { zones: result.map((z, i) => ({ ...z, sortOrder: i })) }
  }),
  
  addLineItem: (zoneId, lineItem) => set((state) => ({
    zones: state.zones.map((z) => 
      z.id === zoneId 
        ? { ...z, lineItems: [...z.lineItems, { ...lineItem, id: uuidv4() }] }
        : z
    )
  })),
  
  updateLineItem: (zoneId, lineItemId, updates) => set((state) => ({
    zones: state.zones.map((z) => 
      z.id === zoneId 
        ? { 
            ...z, 
            lineItems: z.lineItems.map((li) => 
              li.id === lineItemId ? { ...li, ...updates } : li
            )
          }
        : z
    )
  })),
  
  deleteLineItem: (zoneId, lineItemId) => set((state) => ({
    zones: state.zones.map((z) => 
      z.id === zoneId 
        ? { ...z, lineItems: z.lineItems.filter((li) => li.id !== lineItemId) }
        : z
    )
  })),
  
  updateDHWSettings: (settings) => set((state) => ({
    currentProject: state.currentProject 
      ? { 
          ...state.currentProject, 
          dhwSettings: { ...state.currentProject.dhwSettings, ...settings },
          updatedAt: new Date()
        }
      : null
  })),
  
  updateResultAdjustments: (adjustments) => set((state) => ({
    currentProject: state.currentProject 
      ? { 
          ...state.currentProject, 
          resultAdjustments: { ...state.currentProject.resultAdjustments, ...adjustments },
          updatedAt: new Date()
        }
      : null
  })),
  
  getTotalSF: () => {
    return get().zones.reduce((sum, z) => sum + (z.sf || 0), 0)
  },
  
  getAggregatedFixtures: () => {
    const zones = get().zones
    return zones.reduce(
      (acc, z) => ({
        showers: acc.showers + (z.fixtures.showers || 0),
        lavs: acc.lavs + (z.fixtures.lavs || 0),
        wcs: acc.wcs + (z.fixtures.wcs || 0),
        floorDrains: acc.floorDrains + (z.fixtures.floorDrains || 0),
        serviceSinks: acc.serviceSinks + (z.fixtures.serviceSinks || 0),
        washingMachines: acc.washingMachines + (z.fixtures.washingMachines || 0),
        dryers: acc.dryers + (z.fixtures.dryers || 0),
      }),
      { showers: 0, lavs: 0, wcs: 0, floorDrains: 0, serviceSinks: 0, washingMachines: 0, dryers: 0 }
    )
  },
}))

// Helper function to create a new project
export function createNewProject(
  userId: string,
  name: string,
  targetSF: number,
  climate: ClimateType,
  electricPrimary: boolean
): Project {
  return {
    id: uuidv4(),
    userId,
    name,
    targetSF,
    climate,
    electricPrimary,
    dhwSettings: getDefaultDHWSettings(climate),
    electricalSettings: getDefaultElectricalSettings(),
    contingency: 0.25,
    resultAdjustments: getDefaultResultAdjustments(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
