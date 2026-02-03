-- =========================================== 
-- DUCTWORK PRESSURE DROP CALCULATOR TABLES
-- Run this in Supabase SQL Editor
-- =========================================== 

-- =========================================== 
-- DUCT SYSTEMS TABLE
-- Stores duct system configurations
-- =========================================== 
CREATE TABLE IF NOT EXISTS duct_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,
  personal_calc_id UUID REFERENCES personal_calculations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Duct System',
  system_type TEXT NOT NULL DEFAULT 'supply', -- 'supply', 'return', 'exhaust', 'outside_air'
  total_cfm NUMERIC DEFAULT 1000,
  altitude_ft NUMERIC DEFAULT 0,
  temperature_f NUMERIC DEFAULT 70,
  safety_factor NUMERIC DEFAULT 0.15, -- 15% default
  max_velocity_fpm NUMERIC, -- optional velocity constraint
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure system belongs to either a project OR personal calc, not both
  CONSTRAINT duct_system_ownership CHECK (
    (project_id IS NOT NULL AND personal_calc_id IS NULL) OR
    (project_id IS NULL AND personal_calc_id IS NOT NULL) OR
    (project_id IS NULL AND personal_calc_id IS NULL)
  )
);

-- =========================================== 
-- DUCT SECTIONS TABLE
-- Individual duct runs and equipment
-- =========================================== 
CREATE TABLE IF NOT EXISTS duct_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES duct_systems(id) ON DELETE CASCADE,
  name TEXT,
  section_type TEXT NOT NULL DEFAULT 'straight', -- 'straight', 'flex', 'equipment'
  cfm NUMERIC NOT NULL DEFAULT 1000,
  
  -- Duct Shape & Dimensions
  shape TEXT DEFAULT 'rectangular', -- 'rectangular', 'round', 'oval'
  width_in NUMERIC DEFAULT 12, -- for rectangular/oval
  height_in NUMERIC DEFAULT 12, -- for rectangular
  diameter_in NUMERIC DEFAULT 12, -- for round
  
  -- Properties
  length_ft NUMERIC DEFAULT 10,
  material TEXT DEFAULT 'galvanized', -- 'galvanized', 'aluminum', 'stainless', 'fiberglass', 'flex'
  liner TEXT DEFAULT 'none', -- 'none', '0.75', '1.0' (inches)
  
  -- For equipment sections (coils, filters, AHU internals)
  equipment_type TEXT, -- 'coil', 'filter', 'silencer', 'vav_box', 'ahu_internal'
  fixed_pressure_drop NUMERIC, -- in. WC - for equipment with known dP
  filter_merv INT, -- MERV rating for filters
  filter_condition TEXT DEFAULT 'clean', -- 'clean', 'dirty'
  coil_rows INT, -- number of rows for coils
  
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- DUCT SECTION FITTINGS TABLE
-- Fittings attached to duct sections
-- =========================================== 
CREATE TABLE IF NOT EXISTS duct_section_fittings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES duct_sections(id) ON DELETE CASCADE,
  fitting_type TEXT NOT NULL, -- references fitting library ID
  fitting_category TEXT, -- 'elbow', 'transition', 'tee', 'damper', 'terminal'
  quantity INT DEFAULT 1,
  
  -- Override values (when user needs to input custom values)
  c_coefficient_override NUMERIC, -- Loss coefficient override
  fixed_dp_override NUMERIC, -- Fixed pressure drop in. WC (for terminals, louvers)
  
  -- Fitting-specific parameters
  elbow_radius_ratio NUMERIC, -- R/W ratio for elbows
  has_turning_vanes BOOLEAN DEFAULT false,
  damper_position_percent NUMERIC DEFAULT 100, -- For dampers: 0-100%
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- INDEXES FOR PERFORMANCE
-- =========================================== 
CREATE INDEX IF NOT EXISTS idx_duct_systems_project ON duct_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_duct_systems_personal_calc ON duct_systems(personal_calc_id);
CREATE INDEX IF NOT EXISTS idx_duct_sections_system ON duct_sections(system_id);
CREATE INDEX IF NOT EXISTS idx_duct_sections_sort ON duct_sections(system_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_duct_fittings_section ON duct_section_fittings(section_id);

-- =========================================== 
-- ROW LEVEL SECURITY
-- =========================================== 
ALTER TABLE duct_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE duct_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE duct_section_fittings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users manage their duct systems" ON duct_systems;
DROP POLICY IF EXISTS "Users manage duct sections" ON duct_sections;
DROP POLICY IF EXISTS "Users manage duct fittings" ON duct_section_fittings;

-- Duct Systems Policy
-- Users can manage systems that are:
-- 1. Linked to their HVAC projects
-- 2. Linked to their personal calculations
CREATE POLICY "Users manage their duct systems"
ON duct_systems
FOR ALL
USING (
  (project_id IS NOT NULL AND project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
  OR
  (personal_calc_id IS NOT NULL AND personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text))
)
WITH CHECK (
  (project_id IS NOT NULL AND project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
  OR
  (personal_calc_id IS NOT NULL AND personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text))
);

-- Duct Sections Policy
-- Users can manage sections belonging to systems they own
CREATE POLICY "Users manage duct sections"
ON duct_sections
FOR ALL
USING (
  system_id IN (
    SELECT id FROM duct_systems WHERE
      (project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
      OR
      (personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text))
  )
)
WITH CHECK (
  system_id IN (
    SELECT id FROM duct_systems WHERE
      (project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
      OR
      (personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text))
  )
);

-- Duct Fittings Policy
-- Users can manage fittings belonging to sections they own
CREATE POLICY "Users manage duct fittings"
ON duct_section_fittings
FOR ALL
USING (
  section_id IN (
    SELECT ds.id FROM duct_sections ds
    JOIN duct_systems sys ON ds.system_id = sys.id
    WHERE
      (sys.project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
      OR
      (sys.personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text))
  )
)
WITH CHECK (
  section_id IN (
    SELECT ds.id FROM duct_sections ds
    JOIN duct_systems sys ON ds.system_id = sys.id
    WHERE
      (sys.project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
      OR
      (sys.personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text))
  )
);
