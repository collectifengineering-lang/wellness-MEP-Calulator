-- =========================================== 
-- PSYCHROMETRIC CALCULATOR TABLES
-- Run this in Supabase SQL Editor
-- =========================================== 

-- =========================================== 
-- PSYCHROMETRIC SYSTEMS TABLE
-- Stores calculation sessions with settings
-- =========================================== 
CREATE TABLE IF NOT EXISTS psychrometric_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  personal_calc_id UUID REFERENCES personal_calculations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Psychrometric Analysis',
  
  -- Atmospheric conditions
  altitude_ft REAL NOT NULL DEFAULT 0,
  barometric_pressure_psia REAL, -- Calculated from altitude if not specified
  
  -- Unit preferences
  temp_unit TEXT NOT NULL DEFAULT 'F', -- 'F' or 'C'
  humidity_unit TEXT NOT NULL DEFAULT 'grains', -- 'grains' or 'lb'
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- PSYCHROMETRIC STATE POINTS TABLE
-- Individual air state points (A, B, Mixed, etc.)
-- =========================================== 
CREATE TABLE IF NOT EXISTS psychrometric_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES psychrometric_systems(id) ON DELETE CASCADE NOT NULL,
  
  -- Point identification
  point_label TEXT NOT NULL DEFAULT 'A', -- 'A', 'B', 'Mixed', 'Entering', 'Leaving', etc.
  point_type TEXT NOT NULL DEFAULT 'state', -- 'state', 'entering', 'leaving', 'mixed'
  
  -- Input mode - which two properties were specified
  input_mode TEXT NOT NULL DEFAULT 'db_wb', -- 'db_wb', 'db_rh', 'db_dp', 'db_w'
  
  -- State properties (stored in base units: °F, grains/lb, Btu/lb, ft³/lb)
  dry_bulb_f REAL,
  wet_bulb_f REAL,
  dew_point_f REAL,
  relative_humidity REAL, -- 0-100%
  humidity_ratio_grains REAL, -- grains/lb dry air
  enthalpy_btu_lb REAL, -- Btu/lb dry air
  specific_volume_ft3_lb REAL, -- ft³/lb dry air
  
  -- For mixing/process calculations
  cfm REAL, -- Cubic feet per minute
  
  -- Display position on chart (normalized 0-1)
  chart_x REAL,
  chart_y REAL,
  
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- PSYCHROMETRIC PROCESSES TABLE
-- HVAC processes between state points
-- =========================================== 
CREATE TABLE IF NOT EXISTS psychrometric_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES psychrometric_systems(id) ON DELETE CASCADE NOT NULL,
  
  -- Process identification
  name TEXT NOT NULL DEFAULT 'Process 1',
  process_type TEXT NOT NULL DEFAULT 'custom',
  -- Types: 'sensible_heating', 'sensible_cooling', 'evaporative_cooling', 
  --        'steam_humidification', 'dx_dehumidification', 'desiccant_dehumidification', 
  --        'mixing', 'custom'
  
  -- Points
  start_point_id UUID REFERENCES psychrometric_points(id) ON DELETE CASCADE,
  end_point_id UUID REFERENCES psychrometric_points(id) ON DELETE CASCADE,
  
  -- For mixing processes
  point_a_id UUID REFERENCES psychrometric_points(id) ON DELETE SET NULL,
  point_b_id UUID REFERENCES psychrometric_points(id) ON DELETE SET NULL,
  mixed_point_id UUID REFERENCES psychrometric_points(id) ON DELETE SET NULL,
  
  -- Flow rate
  cfm REAL NOT NULL DEFAULT 1000,
  
  -- Calculated loads (stored after calculation)
  total_load_btuh REAL,
  sensible_load_btuh REAL,
  latent_load_btuh REAL,
  total_load_tons REAL,
  moisture_lb_hr REAL,
  
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- ROW LEVEL SECURITY
-- =========================================== 

-- Enable RLS on all tables
ALTER TABLE psychrometric_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychrometric_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychrometric_processes ENABLE ROW LEVEL SECURITY;

-- =========================================== 
-- POLICIES FOR psychrometric_systems
-- =========================================== 
DROP POLICY IF EXISTS "Users manage their psychrometric systems" ON psychrometric_systems;
CREATE POLICY "Users manage their psychrometric systems"
ON psychrometric_systems
FOR ALL
USING (user_id::text = auth.uid()::text)
WITH CHECK (user_id::text = auth.uid()::text);

-- =========================================== 
-- POLICIES FOR psychrometric_points
-- =========================================== 
DROP POLICY IF EXISTS "Users manage their psychrometric points" ON psychrometric_points;
CREATE POLICY "Users manage their psychrometric points"
ON psychrometric_points
FOR ALL
USING (
  system_id IN (
    SELECT id FROM psychrometric_systems 
    WHERE user_id::text = auth.uid()::text
    OR project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
    OR personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text)
  )
)
WITH CHECK (
  system_id IN (
    SELECT id FROM psychrometric_systems 
    WHERE user_id::text = auth.uid()::text
  )
);

-- =========================================== 
-- POLICIES FOR psychrometric_processes
-- =========================================== 
DROP POLICY IF EXISTS "Users manage their psychrometric processes" ON psychrometric_processes;
CREATE POLICY "Users manage their psychrometric processes"
ON psychrometric_processes
FOR ALL
USING (
  system_id IN (
    SELECT id FROM psychrometric_systems 
    WHERE user_id::text = auth.uid()::text
    OR project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
    OR personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text)
  )
)
WITH CHECK (
  system_id IN (
    SELECT id FROM psychrometric_systems 
    WHERE user_id::text = auth.uid()::text
  )
);

-- =========================================== 
-- UPDATE personal_calculations TO INCLUDE 'psychrometric' TYPE
-- =========================================== 
-- The calc_type column already accepts any TEXT, so 'psychrometric' works automatically

-- =========================================== 
-- INDEXES FOR PERFORMANCE
-- =========================================== 
CREATE INDEX IF NOT EXISTS idx_psychrometric_systems_project ON psychrometric_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_psychrometric_systems_personal_calc ON psychrometric_systems(personal_calc_id);
CREATE INDEX IF NOT EXISTS idx_psychrometric_systems_user ON psychrometric_systems(user_id);
CREATE INDEX IF NOT EXISTS idx_psychrometric_points_system ON psychrometric_points(system_id);
CREATE INDEX IF NOT EXISTS idx_psychrometric_processes_system ON psychrometric_processes(system_id);
