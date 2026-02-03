-- =========================================== 
-- PERSONAL CALCULATIONS TABLE
-- Stores named calculation workspaces for users
-- Run this in Supabase SQL Editor
-- =========================================== 

-- =========================================== 
-- PERSONAL CALCULATIONS TABLE
-- =========================================== 
CREATE TABLE IF NOT EXISTS personal_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Calculation',
  calc_type TEXT NOT NULL, -- 'hydronic', 'pool_dehum', etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================== 
-- ADD PERSONAL_CALC_ID TO HYDRONIC_SYSTEMS
-- =========================================== 
ALTER TABLE hydronic_systems 
ADD COLUMN IF NOT EXISTS personal_calc_id UUID REFERENCES personal_calculations(id) ON DELETE CASCADE;

-- =========================================== 
-- ROW LEVEL SECURITY FOR PERSONAL_CALCULATIONS
-- =========================================== 
ALTER TABLE personal_calculations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users manage their personal calculations" ON personal_calculations;

-- Users can only see/manage their own personal calculations
CREATE POLICY "Users manage their personal calculations"
ON personal_calculations
FOR ALL
USING (user_id::text = auth.uid()::text)
WITH CHECK (user_id::text = auth.uid()::text);

-- =========================================== 
-- UPDATE HYDRONIC_SYSTEMS RLS POLICY
-- Now includes personal_calc_id ownership check
-- =========================================== 

-- Drop existing policy
DROP POLICY IF EXISTS "Users manage their hydronic systems" ON hydronic_systems;

-- Recreate with personal_calc_id support
-- Users can manage systems that are:
-- 1. Linked to their projects (project_id IN user's projects)
-- 2. Linked to their personal calculations (personal_calc_id IN user's personal_calculations)
CREATE POLICY "Users manage their hydronic systems"
ON hydronic_systems
FOR ALL
USING (
  (project_id IS NOT NULL AND project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text))
  OR
  (personal_calc_id IS NOT NULL AND personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text))
)
WITH CHECK (
  (project_id IS NOT NULL AND project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text))
  OR
  (personal_calc_id IS NOT NULL AND personal_calc_id IN (SELECT id FROM personal_calculations WHERE user_id::text = auth.uid()::text))
);

-- =========================================== 
-- INDEXES FOR PERFORMANCE
-- =========================================== 
CREATE INDEX IF NOT EXISTS idx_personal_calculations_user ON personal_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_calculations_type ON personal_calculations(calc_type);
CREATE INDEX IF NOT EXISTS idx_hydronic_systems_personal_calc ON hydronic_systems(personal_calc_id);
