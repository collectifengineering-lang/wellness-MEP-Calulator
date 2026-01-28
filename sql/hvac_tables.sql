-- ============================================
-- HVAC MODULE DATABASE TABLES
-- Run this in Supabase SQL Editor
-- ============================================

-- =========================================== 
-- HVAC PROJECTS TABLE
-- =========================================== 
CREATE TABLE IF NOT EXISTS hvac_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  settings JSONB DEFAULT '{}',
  linked_scan_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- HVAC SPACES TABLE
-- =========================================== 
CREATE TABLE IF NOT EXISTS hvac_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Space',
  space_type TEXT DEFAULT 'office',
  area_sf INTEGER DEFAULT 500,
  ceiling_height NUMERIC DEFAULT 10,
  occupancy_override INTEGER,
  zone_id UUID,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- HVAC ZONES TABLE
-- =========================================== 
CREATE TABLE IF NOT EXISTS hvac_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Zone',
  ez NUMERIC DEFAULT 1.0,
  heating_setpoint NUMERIC DEFAULT 70,
  cooling_setpoint NUMERIC DEFAULT 75,
  system_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- HVAC SYSTEMS TABLE
-- =========================================== 
CREATE TABLE IF NOT EXISTS hvac_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled System',
  system_type TEXT DEFAULT 'vav_multi_zone',
  erv_enabled BOOLEAN DEFAULT false,
  erv_sensible NUMERIC DEFAULT 0.75,
  erv_latent NUMERIC DEFAULT 0.65,
  occupancy_diversity NUMERIC DEFAULT 0.8,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- ROW LEVEL SECURITY
-- =========================================== 
ALTER TABLE hvac_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_systems ENABLE ROW LEVEL SECURITY;

-- =========================================== 
-- POLICIES
-- =========================================== 

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users manage their hvac projects" ON hvac_projects;
DROP POLICY IF EXISTS "Users manage their hvac spaces" ON hvac_spaces;
DROP POLICY IF EXISTS "Users manage their hvac zones" ON hvac_zones;
DROP POLICY IF EXISTS "Users manage their hvac systems" ON hvac_systems;

-- HVAC Projects
CREATE POLICY "Users manage their hvac projects"
ON hvac_projects
FOR ALL
USING (user_id::text = auth.uid()::text)
WITH CHECK (user_id::text = auth.uid()::text);

-- HVAC Spaces
CREATE POLICY "Users manage their hvac spaces"
ON hvac_spaces
FOR ALL
USING (project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
WITH CHECK (project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text));

-- HVAC Zones
CREATE POLICY "Users manage their hvac zones"
ON hvac_zones
FOR ALL
USING (project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
WITH CHECK (project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text));

-- HVAC Systems
CREATE POLICY "Users manage their hvac systems"
ON hvac_systems
FOR ALL
USING (project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text))
WITH CHECK (project_id IN (SELECT id FROM hvac_projects WHERE user_id::text = auth.uid()::text));

-- =========================================== 
-- INDEXES
-- =========================================== 
CREATE INDEX IF NOT EXISTS idx_hvac_projects_user_id ON hvac_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_hvac_spaces_project_id ON hvac_spaces(project_id);
CREATE INDEX IF NOT EXISTS idx_hvac_spaces_zone_id ON hvac_spaces(zone_id);
CREATE INDEX IF NOT EXISTS idx_hvac_zones_project_id ON hvac_zones(project_id);
CREATE INDEX IF NOT EXISTS idx_hvac_zones_system_id ON hvac_zones(system_id);
CREATE INDEX IF NOT EXISTS idx_hvac_systems_project_id ON hvac_systems(project_id);

-- =========================================== 
-- COMMENTS
-- =========================================== 
COMMENT ON TABLE hvac_projects IS 'HVAC ventilation calculation projects';
COMMENT ON TABLE hvac_spaces IS 'Spaces with ASHRAE 62.1 ventilation requirements';
COMMENT ON TABLE hvac_zones IS 'Thermal zones grouping spaces with shared controls';
COMMENT ON TABLE hvac_systems IS 'Air handling systems serving multiple zones';
COMMENT ON COLUMN hvac_spaces.space_type IS 'ASHRAE 62.1 Table 6-1 space type ID';
COMMENT ON COLUMN hvac_zones.ez IS 'Zone air distribution effectiveness (Table 6-2)';
COMMENT ON COLUMN hvac_systems.system_type IS 'single_zone, vav_multi_zone, or doas_100_oa';
