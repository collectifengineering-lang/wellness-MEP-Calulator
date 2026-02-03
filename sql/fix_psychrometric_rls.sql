-- =========================================== 
-- FIX PSYCHROMETRIC RLS POLICIES
-- Run this to fix the "Failed to save system" error
-- =========================================== 

-- First, disable RLS temporarily to clean up
ALTER TABLE psychrometric_systems DISABLE ROW LEVEL SECURITY;
ALTER TABLE psychrometric_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE psychrometric_processes DISABLE ROW LEVEL SECURITY;

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

-- Re-enable RLS
ALTER TABLE psychrometric_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychrometric_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychrometric_processes ENABLE ROW LEVEL SECURITY;

-- =========================================== 
-- CREATE SIMPLE POLICIES FOR SYSTEMS
-- Using proper UUID comparison
-- =========================================== 
CREATE POLICY "psychrometric_systems_select"
ON psychrometric_systems
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "psychrometric_systems_insert"
ON psychrometric_systems
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "psychrometric_systems_update"
ON psychrometric_systems
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "psychrometric_systems_delete"
ON psychrometric_systems
FOR DELETE
USING (user_id = auth.uid());

-- =========================================== 
-- CREATE SIMPLE POLICIES FOR POINTS
-- =========================================== 
CREATE POLICY "psychrometric_points_select"
ON psychrometric_points
FOR SELECT
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

CREATE POLICY "psychrometric_points_insert"
ON psychrometric_points
FOR INSERT
WITH CHECK (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

CREATE POLICY "psychrometric_points_update"
ON psychrometric_points
FOR UPDATE
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
)
WITH CHECK (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

CREATE POLICY "psychrometric_points_delete"
ON psychrometric_points
FOR DELETE
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

-- =========================================== 
-- CREATE SIMPLE POLICIES FOR PROCESSES
-- =========================================== 
CREATE POLICY "psychrometric_processes_select"
ON psychrometric_processes
FOR SELECT
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

CREATE POLICY "psychrometric_processes_insert"
ON psychrometric_processes
FOR INSERT
WITH CHECK (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

CREATE POLICY "psychrometric_processes_update"
ON psychrometric_processes
FOR UPDATE
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
)
WITH CHECK (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

CREATE POLICY "psychrometric_processes_delete"
ON psychrometric_processes
FOR DELETE
USING (
  system_id IN (SELECT id FROM psychrometric_systems WHERE user_id = auth.uid())
);

SELECT 'RLS policies fixed successfully!' as result;
