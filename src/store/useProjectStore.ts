import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Project, Zone, DHWSettings, ResultAdjustments, ClimateType, ZoneType, LineItem, ZoneFixtures, ZoneProcessLoads, PoolRoomDesign, MechanicalElectricalSettings } from '../types'
import { getZoneColor, calculateFixturesFromSF, type ZoneDefaults } from '../data/zoneDefaults'
import { useSettingsStore } from './useSettingsStore'
import { getDefaultDHWSettings, getDefaultResultAdjustments, getDefaultElectricalSettings, getDefaultMechanicalSettings } from '../data/defaults'

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

/**
 * Generate default LINE ITEMS from zone defaults
 * ALL equipment loads are now LINE ITEMS - visible, editable, simple math!
 * 
 * Priority:
 * 1. If zone has customized `defaultEquipment`, use that
 * 2. Otherwise, generate from legacy fixed load fields
 */
export function generateDefaultLineItems(
  defaults: ZoneDefaults, 
  sf: number, 
  subType: 'electric' | 'gas',
  _zoneName?: string  // Reserved for future use
): LineItem[] {
  // If zone type has custom default equipment defined, use that!
  if (defaults.defaultEquipment && defaults.defaultEquipment.length > 0) {
    return defaults.defaultEquipment.map(item => ({
      id: uuidv4(),
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      value: item.value,
      notes: item.notes,
    }))
  }

  // Otherwise, generate from legacy fields (backwards compatibility)
  const items: LineItem[] = []
  const ceilingHeight = defaults.ceiling_height_ft || 10
  
  // 1. Fixed electrical equipment (heaters, chillers, etc.)
  let fixed_kw = defaults.fixed_kw || 0
  if (defaults.kw_per_cubic_meter && subType === 'electric') {
    const cubicFeet = sf * ceilingHeight
    const cubicMeters = cubicFeet * 0.0283168
    fixed_kw = Math.round(cubicMeters * defaults.kw_per_cubic_meter * 10) / 10
  }
  if (fixed_kw > 0) {
    items.push({
      id: uuidv4(),
      category: 'power',
      name: `${defaults.displayName} - Electric Equipment`,
      quantity: 1,
      unit: 'kW',
      value: fixed_kw,
      notes: defaults.kw_per_cubic_meter ? `${defaults.kw_per_cubic_meter} kW/m³ × ${sf} SF × ${ceilingHeight}ft ceiling` : 'Fixed equipment load'
    })
  }
  
  // 2. Gas equipment (banya, sauna burners, etc.)
  let gas_mbh = defaults.gas_mbh || 0
  if (defaults.gas_mbh_per_sf && subType === 'gas') {
    gas_mbh = Math.round(sf * defaults.gas_mbh_per_sf)
  }
  if (gas_mbh > 0 && subType === 'gas') {
    items.push({
      id: uuidv4(),
      category: 'gas',
      name: `${defaults.displayName} - Gas Burner/Heater`,
      quantity: 1,
      unit: 'MBH',
      value: gas_mbh,
      notes: defaults.source_notes?.split(';')[0] || 'Gas equipment'
    })
  }
  
  // 3. Pool heater
  if (defaults.pool_heater_gas_mbh && defaults.pool_heater_gas_mbh > 0) {
    items.push({
      id: uuidv4(),
      category: 'gas',
      name: 'Pool Heater',
      quantity: 1,
      unit: 'MBH',
      value: defaults.pool_heater_gas_mbh,
      notes: 'Gas pool heater - can switch to electric heat pump'
    })
  }
  
  // 4. Fixed ventilation (for special spaces like thermal rooms)
  if (defaults.ventilation_cfm && defaults.ventilation_cfm > 0) {
    items.push({
      id: uuidv4(),
      category: 'ventilation',
      name: 'Make-Up Air (Fixed)',
      quantity: 1,
      unit: 'CFM',
      value: defaults.ventilation_cfm,
      notes: 'Fixed outdoor air requirement'
    })
  }
  
  // 5. Fixed exhaust (for thermal rooms, etc.)
  if (defaults.exhaust_cfm && defaults.exhaust_cfm > 0) {
    items.push({
      id: uuidv4(),
      category: 'exhaust',
      name: 'Exhaust Fan (Fixed)',
      quantity: 1,
      unit: 'CFM',
      value: defaults.exhaust_cfm,
      notes: 'Fixed exhaust requirement'
    })
  }
  
  // 6. Dehumidification for pools
  if (defaults.dehumidification_lb_hr && defaults.dehumidification_lb_hr > 0) {
    items.push({
      id: uuidv4(),
      category: 'other',
      name: 'Pool Dehumidifier',
      quantity: 1,
      unit: 'lb/hr',
      value: defaults.dehumidification_lb_hr,
      notes: 'Pool area dehumidification capacity'
    })
  }
  
  // 7. Kitchen MAU (make-up air for hood)
  if (defaults.mau_cfm && defaults.mau_cfm > 0) {
    items.push({
      id: uuidv4(),
      category: 'ventilation',
      name: 'Kitchen MAU (for Type I Hood)',
      quantity: 1,
      unit: 'CFM',
      value: defaults.mau_cfm,
      notes: 'Make-up air for kitchen exhaust hood'
    })
  }
  
  // 8. LAUNDRY EQUIPMENT - Generate from default fixture counts
  if (defaults.laundry_equipment) {
    const washers = defaults.defaultFixtures.washingMachines || 0
    const dryers = defaults.defaultFixtures.dryers || 0
    const equipment = defaults.laundry_equipment
    
    // Washers (always electric)
    if (washers > 0 && equipment.washer_kw) {
      items.push({
        id: uuidv4(),
        category: 'power',
        name: 'Commercial Washers',
        quantity: washers,
        unit: 'kW',
        value: equipment.washer_kw,
        notes: `${washers}x washers @ ${equipment.washer_kw} kW each`
      })
    }
    
    // Dryers - Gas or Electric based on subType
    if (dryers > 0) {
      if (subType === 'gas' && equipment.dryer_gas_mbh) {
        // Gas dryers (stacked = 2 pockets per unit)
        const pockets = dryers * 2
        items.push({
          id: uuidv4(),
          category: 'gas',
          name: 'Gas Dryers (Stacked)',
          quantity: pockets,
          unit: 'MBH',
          value: equipment.dryer_gas_mbh,
          notes: `${dryers} stacked units = ${pockets} pockets @ ${equipment.dryer_gas_mbh} MBH each`
        })
      } else if (equipment.dryer_kw_electric) {
        // Electric dryers
        items.push({
          id: uuidv4(),
          category: 'power',
          name: 'Electric Dryers',
          quantity: dryers,
          unit: 'kW',
          value: equipment.dryer_kw_electric,
          notes: `${dryers}x dryers @ ${equipment.dryer_kw_electric} kW each`
        })
      }
      
      // Dryer exhaust
      if (equipment.dryer_exhaust_cfm) {
        items.push({
          id: uuidv4(),
          category: 'exhaust',
          name: 'Dryer Exhaust',
          quantity: dryers,
          unit: 'CFM',
          value: equipment.dryer_exhaust_cfm,
          notes: `${dryers}x dryers @ ${equipment.dryer_exhaust_cfm} CFM each`
        })
      }
    }
  }
  
  return items
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
  
  // Mechanical settings
  updateMechanicalSettings: (settings: Partial<MechanicalElectricalSettings>) => void
  
  // Result adjustments
  updateResultAdjustments: (adjustments: Partial<ResultAdjustments>) => void
  
  // Pool room design
  updatePoolRoomDesign: (design: PoolRoomDesign | undefined) => void
  
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
    const zoneName = name || defaults.displayName
    
    // Auto-calculate fixtures for restroom/locker_room based on SF
    const autoFixtures = calculateFixturesFromSF(type, zoneSF)
    
    // Calculate process loads (still used for backwards compatibility)
    const processLoads = calculateProcessLoads(defaults, zoneSF, subType)
    
    // Generate LINE ITEMS from defaults - ALL equipment is now visible!
    const defaultLineItems = generateDefaultLineItems(defaults, zoneSF, subType, zoneName)
    
    const newZone: Zone = {
      id: uuidv4(),
      projectId: get().currentProject?.id || '',
      name: zoneName,
      type,
      subType,
      sf: zoneSF,
      color: getZoneColor(type),
      fixtures: { ...defaults.defaultFixtures, ...autoFixtures },
      rates: { ...defaults.defaultRates },
      processLoads,
      lineItems: defaultLineItems,  // Pre-populated with default equipment!
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
  
  updateMechanicalSettings: (settings) => set((state) => ({
    currentProject: state.currentProject 
      ? { 
          ...state.currentProject, 
          mechanicalSettings: { ...state.currentProject.mechanicalSettings, ...settings },
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
  
  updatePoolRoomDesign: (design) => set((state) => ({
    currentProject: state.currentProject 
      ? { 
          ...state.currentProject, 
          poolRoomDesign: design,
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
    mechanicalSettings: getDefaultMechanicalSettings(),
    contingency: 0.25,
    resultAdjustments: getDefaultResultAdjustments(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
