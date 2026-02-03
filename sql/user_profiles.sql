-- ============================================
-- USER PROFILES TABLE
-- Automatically tracks all users who sign in
-- ============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  avatar_url text,
  first_login_at timestamptz DEFAULT now(),
  last_login_at timestamptz DEFAULT now(),
  login_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read profiles
CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Allow inserts from trigger (service role)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TRIGGER: Auto-create profile on sign up
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    last_login_at = now(),
    login_count = profiles.login_count + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- BACKFILL: Add existing users to profiles
-- ============================================
INSERT INTO profiles (id, email, name, first_login_at)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data ->> 'name',
    raw_user_meta_data ->> 'full_name',
    split_part(email, '@', 1)
  ),
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIX: Update app_admins policies to use auth.jwt()
-- ============================================
DROP POLICY IF EXISTS "Admins can insert" ON app_admins;
DROP POLICY IF EXISTS "Admins can update" ON app_admins;
DROP POLICY IF EXISTS "Admins can delete" ON app_admins;

CREATE POLICY "Admins can insert"
  ON app_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.jwt() ->> 'email')
  );

CREATE POLICY "Admins can update"
  ON app_admins FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.jwt() ->> 'email')
  );

CREATE POLICY "Admins can delete"
  ON app_admins FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.jwt() ->> 'email')
  );

-- ============================================
-- VERIFY
-- ============================================
SELECT 'Profiles:' as table_name, count(*) as count FROM profiles
UNION ALL
SELECT 'Admins:', count(*) FROM app_admins;

-- Show all users with admin status
SELECT 
  p.email,
  p.name,
  p.last_login_at,
  p.login_count,
  CASE WHEN a.email IS NOT NULL THEN 'Yes' ELSE 'No' END as is_admin
FROM profiles p
LEFT JOIN app_admins a ON lower(p.email) = lower(a.email)
ORDER BY p.last_login_at DESC;
