/**
 * Seed Script - Generate SQL INSERT statements from hardcoded data
 * 
 * Run with: npx ts-node sql/seed_ashrae_data.ts > sql/seed_data.sql
 * 
 * This script exports all hardcoded ASHRAE space types and zone type defaults
 * to SQL INSERT statements for seeding the Supabase database.
 */

import { ASHRAE62_SPACE_TYPES, ASHRAE170_SPACES } from '../src/data/ashrae62'
import { zoneDefaults } from '../src/data/zoneDefaults'

function escapeString(str: string | undefined): string {
  if (!str) return 'NULL'
  return `'${str.replace(/'/g, "''")}'`
}

function toNumeric(val: number | undefined): string {
  if (val === undefined || val === null) return 'NULL'
  return val.toString()
}

function toBool(val: boolean | undefined): string {
  if (val === undefined) return 'FALSE'
  return val ? 'TRUE' : 'FALSE'
}

function toJsonb(val: any): string {
  if (!val || Object.keys(val).length === 0) return "'{}'::JSONB"
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::JSONB`
}

console.log('-- ============================================')
console.log('-- Seed Data for ASHRAE Space Types and Zone Defaults')
console.log('-- Generated from hardcoded values')
console.log('-- ============================================')
console.log('')
console.log('-- Clear existing data (optional - comment out if appending)')
console.log('-- TRUNCATE ashrae_space_types CASCADE;')
console.log('-- TRUNCATE zone_type_defaults CASCADE;')
console.log('')

// ============================================
// ASHRAE 62.1 Space Types
// ============================================
console.log('-- ============================================')
console.log('-- ASHRAE 62.1 Space Types')
console.log('-- ============================================')
console.log('')

for (const st of ASHRAE62_SPACE_TYPES) {
  console.log(`INSERT INTO ashrae_space_types (
  id, category, name, display_name, standard,
  rp, ra, default_occupancy, air_class,
  exhaust_cfm_sf, exhaust_cfm_unit, exhaust_unit_type, exhaust_cfm_min, exhaust_cfm_max,
  exhaust_min_per_room, exhaust_notes, exhaust_fixtures_per_sf, notes
) VALUES (
  ${escapeString(st.id)}, ${escapeString(st.category)}, ${escapeString(st.name)}, ${escapeString(st.displayName)}, 'ashrae62',
  ${toNumeric(st.Rp)}, ${toNumeric(st.Ra)}, ${toNumeric(st.defaultOccupancy)}, ${toNumeric(st.airClass)},
  ${toNumeric(st.exhaustCfmSf)}, ${toNumeric(st.exhaustCfmUnit)}, ${escapeString(st.exhaustUnitType)}, ${toNumeric(st.exhaustCfmMin)}, ${toNumeric(st.exhaustCfmMax)},
  ${toNumeric(st.exhaustMinPerRoom)}, ${escapeString(st.exhaustNotes)}, ${toJsonb(st.exhaustFixturesPerSf)}, ${escapeString(st.notes)}
) ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  rp = EXCLUDED.rp,
  ra = EXCLUDED.ra,
  default_occupancy = EXCLUDED.default_occupancy,
  air_class = EXCLUDED.air_class,
  exhaust_cfm_sf = EXCLUDED.exhaust_cfm_sf,
  exhaust_cfm_unit = EXCLUDED.exhaust_cfm_unit,
  exhaust_unit_type = EXCLUDED.exhaust_unit_type,
  exhaust_cfm_min = EXCLUDED.exhaust_cfm_min,
  exhaust_cfm_max = EXCLUDED.exhaust_cfm_max,
  exhaust_min_per_room = EXCLUDED.exhaust_min_per_room,
  exhaust_notes = EXCLUDED.exhaust_notes,
  exhaust_fixtures_per_sf = EXCLUDED.exhaust_fixtures_per_sf,
  notes = EXCLUDED.notes;
`)
}

console.log('')

// ============================================
// ASHRAE 170 Healthcare Space Types
// ============================================
console.log('-- ============================================')
console.log('-- ASHRAE 170 Healthcare Space Types')
console.log('-- ============================================')
console.log('')

for (const st of ASHRAE170_SPACES) {
  console.log(`INSERT INTO ashrae_space_types (
  id, category, name, display_name, standard,
  min_total_ach, min_oa_ach, pressure_relationship, all_air_exhaust, recirculated, notes
) VALUES (
  ${escapeString(st.id)}, 'Healthcare', ${escapeString(st.spaceType)}, ${escapeString(st.spaceType)}, 'ashrae170',
  ${toNumeric(st.minTotalACH)}, ${toNumeric(st.minOAach)}, ${escapeString(st.pressureRelationship)}, ${toBool(st.allAirExhaust)}, ${toBool(st.recirculated)}, ${escapeString(st.notes)}
) ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  min_total_ach = EXCLUDED.min_total_ach,
  min_oa_ach = EXCLUDED.min_oa_ach,
  pressure_relationship = EXCLUDED.pressure_relationship,
  all_air_exhaust = EXCLUDED.all_air_exhaust,
  recirculated = EXCLUDED.recirculated,
  notes = EXCLUDED.notes;
`)
}

console.log('')

// ============================================
// Zone Type Defaults
// ============================================
console.log('-- ============================================')
console.log('-- Zone Type Defaults')
console.log('-- ============================================')
console.log('')

for (const [zoneType, zd] of Object.entries(zoneDefaults)) {
  console.log(`INSERT INTO zone_type_defaults (
  id, display_name, category, default_sf, switchable,
  ashrae_space_type_id,
  lighting_w_sf, receptacle_va_sf, cooling_sf_ton, heating_btuh_sf,
  fixed_kw, gas_mbh, ventilation_cfm, exhaust_cfm, pool_heater_gas_mbh,
  latent_adder, occupants_per_1000sf,
  default_fixtures, visible_fixtures, default_equipment,
  requires_standby_power, requires_type1_hood, source_notes
) VALUES (
  ${escapeString(zoneType)}, ${escapeString(zd.displayName)}, ${escapeString(zd.category)}, ${toNumeric(zd.defaultSF)}, ${toBool(zd.switchable)},
  ${escapeString(zd.defaultVentilationSpaceType)},
  ${toNumeric(zd.defaultRates?.lighting_w_sf)}, ${toNumeric(zd.defaultRates?.receptacle_va_sf)}, ${toNumeric(zd.defaultRates?.cooling_sf_ton)}, ${toNumeric(zd.defaultRates?.heating_btuh_sf)},
  ${toNumeric(zd.fixed_kw)}, ${toNumeric(zd.gas_mbh)}, ${toNumeric(zd.ventilation_cfm)}, ${toNumeric(zd.exhaust_cfm)}, ${toNumeric(zd.pool_heater_gas_mbh)},
  ${toNumeric(zd.latent_adder)}, ${toNumeric(zd.occupants_per_1000sf)},
  ${toJsonb(zd.defaultFixtures)}, ${toJsonb(zd.visibleFixtures)}, ${toJsonb(zd.defaultEquipment)},
  ${toBool(zd.requires_standby_power)}, ${toBool(zd.requires_type1_hood)}, ${escapeString(zd.source_notes)}
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  default_sf = EXCLUDED.default_sf,
  switchable = EXCLUDED.switchable,
  ashrae_space_type_id = EXCLUDED.ashrae_space_type_id,
  lighting_w_sf = EXCLUDED.lighting_w_sf,
  receptacle_va_sf = EXCLUDED.receptacle_va_sf,
  cooling_sf_ton = EXCLUDED.cooling_sf_ton,
  heating_btuh_sf = EXCLUDED.heating_btuh_sf,
  fixed_kw = EXCLUDED.fixed_kw,
  gas_mbh = EXCLUDED.gas_mbh,
  ventilation_cfm = EXCLUDED.ventilation_cfm,
  exhaust_cfm = EXCLUDED.exhaust_cfm,
  pool_heater_gas_mbh = EXCLUDED.pool_heater_gas_mbh,
  latent_adder = EXCLUDED.latent_adder,
  occupants_per_1000sf = EXCLUDED.occupants_per_1000sf,
  default_fixtures = EXCLUDED.default_fixtures,
  visible_fixtures = EXCLUDED.visible_fixtures,
  default_equipment = EXCLUDED.default_equipment,
  requires_standby_power = EXCLUDED.requires_standby_power,
  requires_type1_hood = EXCLUDED.requires_type1_hood,
  source_notes = EXCLUDED.source_notes;
`)
}

console.log('')
console.log('-- ============================================')
console.log('-- Seed complete!')
console.log('-- ============================================')
