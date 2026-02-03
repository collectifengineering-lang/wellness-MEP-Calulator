-- ============================================
-- ADMIN USERS TABLE
-- Stores which users have admin privileges
-- ============================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can read admins" ON app_admins;
DROP POLICY IF EXISTS "Admins can manage admins" ON app_admins;
DROP POLICY IF EXISTS "Admins can insert" ON app_admins;
DROP POLICY IF EXISTS "Admins can update" ON app_admins;
DROP POLICY IF EXISTS "Admins can delete" ON app_admins;

CREATE TABLE IF NOT EXISTS app_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  added_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER function to check admin status
-- This bypasses RLS to avoid infinite recursion
-- ============================================
CREATE OR REPLACE FUNCTION is_admin(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_admins WHERE email = lower(check_email)
  );
$$;

-- Anyone authenticated can read (needed to check admin status)
CREATE POLICY "Authenticated users can read admins"
  ON app_admins FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert (uses SECURITY DEFINER function)
CREATE POLICY "Admins can insert"
  ON app_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Only admins can update
CREATE POLICY "Admins can update"
  ON app_admins FOR UPDATE
  TO authenticated
  USING (
    is_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Only admins can delete
CREATE POLICY "Admins can delete"
  ON app_admins FOR DELETE
  TO authenticated
  USING (
    is_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_app_admins_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_app_admins_timestamp ON app_admins;
CREATE TRIGGER update_app_admins_timestamp
  BEFORE UPDATE ON app_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_app_admins_timestamp();

-- ============================================
-- BOOTSTRAP: Add initial admin
-- ============================================
INSERT INTO app_admins (email, name, added_by)
VALUES ('rafael@collectif.nyc', 'Rafael', 'System Bootstrap')
ON CONFLICT (email) DO NOTHING;

-- Verify
SELECT * FROM app_admins;
