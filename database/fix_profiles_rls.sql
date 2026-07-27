-- =============================================
-- FIX: PROFILES RLS POLICY - REDIRECT LOOP
-- =============================================
-- Problem: setup_rls_policies.sql uses "auth.uid()::text = user_id"
-- for the profiles SELECT policy, but the profiles table uses "id"
-- (not "user_id") as the column matching auth.users.id.
-- 
-- This causes new users to get PGRST116 on their own profile,
-- which triggers redirectToAuthPage() → infinite redirect loop.
-- =============================================

-- STEP 1: Check current state (diagnostic)
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if user_id column exists on profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('id', 'user_id');

-- STEP 2: Create helper function (idempotent)
CREATE OR REPLACE FUNCTION public.get_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- STEP 3: Fix profiles policies - drop old, create new
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = public.get_user_id());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = public.get_user_id());

-- STEP 4: Verify fix
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

DO $$ 
BEGIN
    RAISE NOTICE '✅ Profiles RLS policies fixed - using id = public.get_user_id()';
    RAISE NOTICE '✅ New users should now be able to access their profile on dashboard';
END $$;
