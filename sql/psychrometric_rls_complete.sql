-- =====================================================
-- COMPLETE PSYCHROMETRIC RLS FIX
-- Matches the HVAC project sharing pattern
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 0: FIX FOREIGN KEY CONSTRAINT
-- The table was incorrectly referencing "projects" instead of "hvac_projects"
-- =====================================================

-- Drop the incorrect foreign key constraint if it exists
ALTER TABLE IF EXISTS psychrometric_systems 
DROP CONSTRAINT IF EXISTS psychrometric_systems_project_id_fkey;

-- Add the correct foreign key to hvac_projects
-- First check if the constraint already points to hvac_projects, if not add it
DO $$
BEGIN
  -- Try to add constraint, ignore if already exists or conflicts
  BEGIN
    ALTER TABLE psychrometric_systems 
    ADD CONSTRAINT psychrometric_systems_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES hvac_projects(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key to hvac_projects';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Foreign key already exists';
  WHEN foreign_key_violation THEN
    -- Orphaned records exist, clean them up first
    DELETE FROM psychrometric_systems WHERE project_id IS NOT NULL 
      AND project_id NOT IN (SELECT id FROM hvac_projects);
    ALTER TABLE psychrometric_systems 
    ADD CONSTRAINT psychrometric_systems_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES hvac_projects(id) ON DELETE CASCADE;
    RAISE NOTICE 'Cleaned orphans and added foreign key';
  END;
END $$;

-- =====================================================
-- STEP 1: DISABLE RLS AND DROP ALL EXISTING POLICIES
-- =====================================================
ALTER TABLE IF EXISTS psychrometric_systems DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS psychrometric_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS psychrometric_processes DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for psychrometric_systems
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'psychrometric_systems'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON psychrometric_systems', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies for psychrometric_points
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'psychrometric_points'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON psychrometric_points', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies for psychrometric_processes
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'psychrometric_processes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON psychrometric_processes', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: ENSURE TABLES EXIST WITH CORRECT COLUMNS
-- =====================================================

-- Add system_cfm column if missing
ALTER TABLE psychrometric_systems 
ADD COLUMN IF NOT EXISTS system_cfm REAL DEFAULT 10000;

-- Add label and description columns if missing
ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS label TEXT;

ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add OA/RA mixing columns if missing
ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS oa_point_id UUID REFERENCES psychrometric_points(id) ON DELETE SET NULL;

ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS ra_point_id UUID REFERENCES psychrometric_points(id) ON DELETE SET NULL;

ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS oa_cfm REAL;

ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS ra_cfm REAL;

-- Add equipment_type column if missing
ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS equipment_type TEXT;

-- =====================================================
-- STEP 3: RE-ENABLE RLS
-- =====================================================
ALTER TABLE psychrometric_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychrometric_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychrometric_processes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE NEW POLICIES FOR SYSTEMS
-- Pattern: All authenticated users can READ, but only owner can modify
-- =====================================================

-- SELECT: All authenticated users can read all psychrometric systems
-- This matches the HVAC project sharing pattern
CREATE POLICY "psychrometric_systems_select_all"
ON psychrometric_systems
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only the owner (user_id matches auth.uid())
CREATE POLICY "psychrometric_systems_insert"
ON psychrometric_systems
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Only the owner
CREATE POLICY "psychrometric_systems_update"
ON psychrometric_systems
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Only the owner
CREATE POLICY "psychrometric_systems_delete"
ON psychrometric_systems
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- STEP 5: CREATE NEW POLICIES FOR POINTS
-- =====================================================

-- SELECT: All authenticated users can read
CREATE POLICY "psychrometric_points_select_all"
ON psychrometric_points
FOR SELECT
TO authenticated
USING (true);

-- INSERT: User must own the parent system
CREATE POLICY "psychrometric_points_insert"
ON psychrometric_points
FOR INSERT
TO authenticated
WITH CHECK (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

-- UPDATE: User must own the parent system
CREATE POLICY "psychrometric_points_update"
ON psychrometric_points
FOR UPDATE
TO authenticated
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
)
WITH CHECK (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

-- DELETE: User must own the parent system
CREATE POLICY "psychrometric_points_delete"
ON psychrometric_points
FOR DELETE
TO authenticated
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

-- =====================================================
-- STEP 6: CREATE NEW POLICIES FOR PROCESSES
-- =====================================================

-- SELECT: All authenticated users can read
CREATE POLICY "psychrometric_processes_select_all"
ON psychrometric_processes
FOR SELECT
TO authenticated
USING (true);

-- INSERT: User must own the parent system
CREATE POLICY "psychrometric_processes_insert"
ON psychrometric_processes
FOR INSERT
TO authenticated
WITH CHECK (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

-- UPDATE: User must own the parent system
CREATE POLICY "psychrometric_processes_update"
ON psychrometric_processes
FOR UPDATE
TO authenticated
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
)
WITH CHECK (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

-- DELETE: User must own the parent system
CREATE POLICY "psychrometric_processes_delete"
ON psychrometric_processes
FOR DELETE
TO authenticated
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

-- =====================================================
-- STEP 7: CREATE/REFRESH INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_psychrometric_systems_project ON psychrometric_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_psychrometric_systems_personal_calc ON psychrometric_systems(personal_calc_id);
CREATE INDEX IF NOT EXISTS idx_psychrometric_systems_user ON psychrometric_systems(user_id);
CREATE INDEX IF NOT EXISTS idx_psychrometric_points_system ON psychrometric_points(system_id);
CREATE INDEX IF NOT EXISTS idx_psychrometric_processes_system ON psychrometric_processes(system_id);

-- =====================================================
-- STEP 8: VERIFY DATA EXISTS
-- =====================================================
SELECT 
  'Systems' as table_name,
  COUNT(*) as total_count 
FROM psychrometric_systems
UNION ALL
SELECT 
  'Points' as table_name,
  COUNT(*) as total_count 
FROM psychrometric_points
UNION ALL
SELECT 
  'Processes' as table_name,
  COUNT(*) as total_count 
FROM psychrometric_processes;

-- Show confirmation
SELECT '✅ PSYCHROMETRIC RLS POLICIES UPDATED SUCCESSFULLY!' as result;
