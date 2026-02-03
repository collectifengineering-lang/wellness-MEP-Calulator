-- =====================================================
-- HVAC Project Sharing: Enable all users to see all projects
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can read their own hvac_projects" ON hvac_projects;
DROP POLICY IF EXISTS "Users can manage their hvac_projects" ON hvac_projects;

-- Create new policy: All authenticated users can READ all HVAC projects
CREATE POLICY "All users can read hvac_projects" 
ON hvac_projects 
FOR SELECT 
TO authenticated 
USING (true);

-- Keep insert restricted to authenticated users (they become the owner)
CREATE POLICY "Users can insert hvac_projects" 
ON hvac_projects 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own projects OR if they're an admin
CREATE POLICY "Users can update hvac_projects" 
ON hvac_projects 
FOR UPDATE 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM app_admins WHERE email = auth.jwt() ->> 'email')
)
WITH CHECK (
  user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM app_admins WHERE email = auth.jwt() ->> 'email')
);

-- Allow users to delete their own projects OR if they're an admin
CREATE POLICY "Users can delete hvac_projects" 
ON hvac_projects 
FOR DELETE 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM app_admins WHERE email = auth.jwt() ->> 'email')
);

-- Also update related tables to follow the same pattern

-- HVAC Spaces
DROP POLICY IF EXISTS "Users can manage hvac_spaces" ON hvac_spaces;
CREATE POLICY "All users can read hvac_spaces" 
ON hvac_spaces FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage hvac_spaces" 
ON hvac_spaces 
FOR ALL 
TO authenticated 
USING (
  project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM app_admins WHERE email = auth.jwt() ->> 'email')
);

-- HVAC Zones
DROP POLICY IF EXISTS "Users can manage hvac_zones" ON hvac_zones;
CREATE POLICY "All users can read hvac_zones" 
ON hvac_zones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage hvac_zones" 
ON hvac_zones 
FOR ALL 
TO authenticated 
USING (
  project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM app_admins WHERE email = auth.jwt() ->> 'email')
);

-- HVAC Systems
DROP POLICY IF EXISTS "Users can manage hvac_systems" ON hvac_systems;
CREATE POLICY "All users can read hvac_systems" 
ON hvac_systems FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage hvac_systems" 
ON hvac_systems 
FOR ALL 
TO authenticated 
USING (
  project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM app_admins WHERE email = auth.jwt() ->> 'email')
);

-- Success message
SELECT 'HVAC project sharing policies updated successfully!' as status;
