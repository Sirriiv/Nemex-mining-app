-- =============================================
-- GROUP 1: CORE TABLES (5 tables)
-- =============================================
-- Run this FIRST - creates helper function
-- Tables: profiles, referral_network, pending_transactions, 
--         admin_settings, approved_transactions

-- =============================================
-- HELPER FUNCTION (only needed once)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = public.get_user_id());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = public.get_user_id());

-- =============================================
-- 2. REFERRAL_NETWORK TABLE
-- =============================================
ALTER TABLE referral_network ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON referral_network;
CREATE POLICY "Users can view own referrals" ON referral_network
  FOR SELECT USING (user_id = public.get_user_id() OR referred_by = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own referrals" ON referral_network;
CREATE POLICY "Users can insert own referrals" ON referral_network
  FOR INSERT WITH CHECK (user_id = public.get_user_id());

-- =============================================
-- 3. PENDING_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pending transactions" ON pending_transactions;
CREATE POLICY "Users can view own pending transactions" ON pending_transactions
  FOR SELECT USING (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own pending transactions" ON pending_transactions;
CREATE POLICY "Users can insert own pending transactions" ON pending_transactions
  FOR INSERT WITH CHECK (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can update own pending transactions" ON pending_transactions;
CREATE POLICY "Users can update own pending transactions" ON pending_transactions
  FOR UPDATE USING (user_id = public.get_user_id());

-- =============================================
-- 4. ADMIN_SETTINGS TABLE (Backend only)
-- =============================================
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
-- No policies: Only service role can access

-- =============================================
-- 5. APPROVED_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE approved_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own approved transactions" ON approved_transactions;
CREATE POLICY "Users can view own approved transactions" ON approved_transactions
  FOR SELECT USING (user_id = public.get_user_id());

-- =============================================
-- VERIFY GROUP 1
-- =============================================
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'referral_network', 'pending_transactions', 
                    'admin_settings', 'approved_transactions');
