-- =========================================== 
-- HYDRONIC PUMP CALCULATOR TABLES
-- Run this in Supabase SQL Editor
-- =========================================== 

-- =========================================== 
-- HYDRONIC SYSTEMS TABLE
-- =========================================== 
CREATE TABLE IF NOT EXISTS hydronic_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled System',
  system_type TEXT NOT NULL DEFAULT 'closed', -- 'closed' or 'open'
  fluid_type TEXT NOT NULL DEFAULT 'water', -- 'water', 'propylene_glycol', 'ethylene_glycol'
  glycol_concentration NUMERIC DEFAULT 0, -- 0-60%
  fluid_temp_f NUMERIC DEFAULT 180, -- operating temperature
  static_head_ft NUMERIC DEFAULT 0, -- for open systems only
  safety_factor NUMERIC DEFAULT 0.15, -- Default 15%
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- HYDRONIC PIPE SECTIONS TABLE
-- =========================================== 
CREATE TABLE IF NOT EXISTS hydronic_pipe_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES hydronic_systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Section',
  flow_gpm NUMERIC NOT NULL DEFAULT 10,
  pipe_material TEXT NOT NULL DEFAULT 'copper_type_l',
  pipe_size_nominal TEXT NOT NULL DEFAULT '1',
  length_ft NUMERIC NOT NULL DEFAULT 10,
  sort_order INTEGER DEFAULT 0,
  -- Calculated values (stored for reference)
  velocity_fps NUMERIC,
  reynolds_number NUMERIC,
  friction_factor NUMERIC,
  head_loss_ft NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- HYDRONIC SECTION FITTINGS TABLE
-- =========================================== 
CREATE TABLE IF NOT EXISTS hydronic_section_fittings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES hydronic_pipe_sections(id) ON DELETE CASCADE,
  fitting_type TEXT NOT NULL, -- from fittings library
  quantity INTEGER DEFAULT 1,
  cv_override NUMERIC, -- optional manual Cv override
  dp_override_ft NUMERIC, -- optional manual dP override for equipment
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- ROW LEVEL SECURITY
-- =========================================== 
ALTER TABLE hydronic_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydronic_pipe_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydronic_section_fittings ENABLE ROW LEVEL SECURITY;

-- =========================================== 
-- POLICIES
-- =========================================== 

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users manage their hydronic systems" ON hydronic_systems;
DROP POLICY IF EXISTS "Users manage their hydronic pipe sections" ON hydronic_pipe_sections;
DROP POLICY IF EXISTS "Users manage their hydronic fittings" ON hydronic_section_fittings;

-- Hydronic Systems - users can manage systems linked to their projects
CREATE POLICY "Users manage their hydronic systems"
ON hydronic_systems
FOR ALL
USING (
  project_id IS NULL OR 
  project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
)
WITH CHECK (
  project_id IS NULL OR 
  project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
);

-- Hydronic Pipe Sections - users can manage sections in their systems
CREATE POLICY "Users manage their hydronic pipe sections"
ON hydronic_pipe_sections
FOR ALL
USING (
  system_id IN (
    SELECT id FROM hydronic_systems 
    WHERE project_id IS NULL OR project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  )
)
WITH CHECK (
  system_id IN (
    SELECT id FROM hydronic_systems 
    WHERE project_id IS NULL OR project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  )
);

-- Hydronic Section Fittings - users can manage fittings in their sections
CREATE POLICY "Users manage their hydronic fittings"
ON hydronic_section_fittings
FOR ALL
USING (
  section_id IN (
    SELECT ps.id FROM hydronic_pipe_sections ps
    JOIN hydronic_systems hs ON ps.system_id = hs.id
    WHERE hs.project_id IS NULL OR hs.project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  )
)
WITH CHECK (
  section_id IN (
    SELECT ps.id FROM hydronic_pipe_sections ps
    JOIN hydronic_systems hs ON ps.system_id = hs.id
    WHERE hs.project_id IS NULL OR hs.project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  )
);

-- =========================================== 
-- INDEXES FOR PERFORMANCE
-- =========================================== 
CREATE INDEX IF NOT EXISTS idx_hydronic_systems_project ON hydronic_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_hydronic_pipe_sections_system ON hydronic_pipe_sections(system_id);
CREATE INDEX IF NOT EXISTS idx_hydronic_section_fittings_section ON hydronic_section_fittings(section_id);
