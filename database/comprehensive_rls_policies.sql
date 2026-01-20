-- =============================================
-- COMPREHENSIVE RLS POLICIES FOR ALL TABLES
-- =============================================
-- Run this script to enable Row Level Security
-- Your backend (service role) will bypass RLS automatically
-- Frontend (anon role) will follow these policies

-- =============================================
-- SAFETY FIRST: Create helper function
-- =============================================
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ LANGUAGE SQL STABLE;

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.user_id());

-- =============================================
-- 2. REFERRAL_NETWORK TABLE
-- =============================================
ALTER TABLE referral_network ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON referral_network;
CREATE POLICY "Users can view own referrals" ON referral_network
  FOR SELECT USING (user_id = auth.user_id() OR referred_by = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own referrals" ON referral_network;
CREATE POLICY "Users can insert own referrals" ON referral_network
  FOR INSERT WITH CHECK (user_id = auth.user_id());

-- =============================================
-- 3. PENDING_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pending transactions" ON pending_transactions;
CREATE POLICY "Users can view own pending transactions" ON pending_transactions
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own pending transactions" ON pending_transactions;
CREATE POLICY "Users can insert own pending transactions" ON pending_transactions
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own pending transactions" ON pending_transactions;
CREATE POLICY "Users can update own pending transactions" ON pending_transactions
  FOR UPDATE USING (user_id = auth.user_id());

-- =============================================
-- 4. ADMIN_SETTINGS TABLE (Admin only - no policies needed)
-- =============================================
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- No policies: Only service role (backend) can access
-- This ensures admins must go through backend API

-- =============================================
-- 5. APPROVED_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE approved_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own approved transactions" ON approved_transactions;
CREATE POLICY "Users can view own approved transactions" ON approved_transactions
  FOR SELECT USING (user_id = auth.user_id());

-- =============================================
-- 6. BALANCE_HISTORY TABLE
-- =============================================
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own balance history" ON balance_history;
CREATE POLICY "Users can view own balance history" ON balance_history
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own balance history" ON balance_history;
CREATE POLICY "Users can insert own balance history" ON balance_history
  FOR INSERT WITH CHECK (user_id = auth.user_id());

-- =============================================
-- 7. CHAIN_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE chain_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chain transactions" ON chain_transactions;
CREATE POLICY "Users can view own chain transactions" ON chain_transactions
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own chain transactions" ON chain_transactions;
CREATE POLICY "Users can insert own chain transactions" ON chain_transactions
  FOR INSERT WITH CHECK (user_id = auth.user_id());

-- =============================================
-- 8. CONVERSIONS TABLE
-- =============================================
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversions" ON conversions;
CREATE POLICY "Users can view own conversions" ON conversions
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own conversions" ON conversions;
CREATE POLICY "Users can insert own conversions" ON conversions
  FOR INSERT WITH CHECK (user_id = auth.user_id());

-- =============================================
-- 9. MINING_SESSIONS TABLE
-- =============================================
ALTER TABLE mining_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mining sessions" ON mining_sessions;
CREATE POLICY "Users can view own mining sessions" ON mining_sessions
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own mining sessions" ON mining_sessions;
CREATE POLICY "Users can insert own mining sessions" ON mining_sessions
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own mining sessions" ON mining_sessions;
CREATE POLICY "Users can update own mining sessions" ON mining_sessions
  FOR UPDATE USING (user_id = auth.user_id());

-- =============================================
-- 10. NMX_DAILY_LIMITS TABLE
-- =============================================
ALTER TABLE nmx_daily_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own nmx limits" ON nmx_daily_limits;
CREATE POLICY "Users can view own nmx limits" ON nmx_daily_limits
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own nmx limits" ON nmx_daily_limits;
CREATE POLICY "Users can insert own nmx limits" ON nmx_daily_limits
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own nmx limits" ON nmx_daily_limits;
CREATE POLICY "Users can update own nmx limits" ON nmx_daily_limits
  FOR UPDATE USING (user_id = auth.user_id());

-- =============================================
-- 11. NMX_TRADES TABLE
-- =============================================
ALTER TABLE nmx_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own nmx trades" ON nmx_trades;
CREATE POLICY "Users can view own nmx trades" ON nmx_trades
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own nmx trades" ON nmx_trades;
CREATE POLICY "Users can insert own nmx trades" ON nmx_trades
  FOR INSERT WITH CHECK (user_id = auth.user_id());

-- =============================================
-- 12. NOTIFICATIONS TABLE
-- =============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.user_id());

-- =============================================
-- 13. PENDING_PAYMENTS TABLE
-- =============================================
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pending payments" ON pending_payments;
CREATE POLICY "Users can view own pending payments" ON pending_payments
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own pending payments" ON pending_payments;
CREATE POLICY "Users can insert own pending payments" ON pending_payments
  FOR INSERT WITH CHECK (user_id = auth.user_id());

-- =============================================
-- 14. REJECTION_REASONS TABLE (Admin only)
-- =============================================
ALTER TABLE rejection_reasons ENABLE ROW LEVEL SECURITY;

-- No policies: Only service role can access
-- Users view rejections through their transactions

-- =============================================
-- 15. SETTINGS TABLE (Public read)
-- =============================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON settings;
CREATE POLICY "Anyone can read settings" ON settings
  FOR SELECT USING (true);

-- Only backend can modify settings

-- =============================================
-- 16. TOKEN_PRICES TABLE (Public read)
-- =============================================
ALTER TABLE token_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read token prices" ON token_prices;
CREATE POLICY "Anyone can read token prices" ON token_prices
  FOR SELECT USING (true);

-- Only backend can update prices

-- =============================================
-- 17. TRANSACTIONS TABLE
-- =============================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (user_id = auth.user_id());

-- =============================================
-- 18. USER_PURCHASE_HISTORY TABLE
-- =============================================
ALTER TABLE user_purchase_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchase history" ON user_purchase_history;
CREATE POLICY "Users can view own purchase history" ON user_purchase_history
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own purchase history" ON user_purchase_history;
CREATE POLICY "Users can insert own purchase history" ON user_purchase_history
  FOR INSERT WITH CHECK (user_id = auth.user_id());

-- =============================================
-- 19. USER_SESSIONS TABLE
-- =============================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
CREATE POLICY "Users can delete own sessions" ON user_sessions
  FOR DELETE USING (user_id = auth.user_id());

-- =============================================
-- 20. USER_TASKS TABLE
-- =============================================
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON user_tasks;
CREATE POLICY "Users can view own tasks" ON user_tasks
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own tasks" ON user_tasks;
CREATE POLICY "Users can insert own tasks" ON user_tasks
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own tasks" ON user_tasks;
CREATE POLICY "Users can update own tasks" ON user_tasks
  FOR UPDATE USING (user_id = auth.user_id());

-- =============================================
-- 21. USER_WALLETS TABLE
-- =============================================
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallets" ON user_wallets;
CREATE POLICY "Users can view own wallets" ON user_wallets
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own wallets" ON user_wallets;
CREATE POLICY "Users can insert own wallets" ON user_wallets
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own wallets" ON user_wallets;
CREATE POLICY "Users can update own wallets" ON user_wallets
  FOR UPDATE USING (user_id = auth.user_id());

-- =============================================
-- 22. VIP_BENEFITS TABLE (Public read)
-- =============================================
ALTER TABLE vip_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read vip benefits" ON vip_benefits;
CREATE POLICY "Anyone can read vip benefits" ON vip_benefits
  FOR SELECT USING (true);

-- Only backend can modify VIP benefits

-- =============================================
-- 23. VIP_CUSTOMERS TABLE
-- =============================================
ALTER TABLE vip_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vip status" ON vip_customers;
CREATE POLICY "Users can view own vip status" ON vip_customers
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own vip status" ON vip_customers;
CREATE POLICY "Users can insert own vip status" ON vip_customers
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own vip status" ON vip_customers;
CREATE POLICY "Users can update own vip status" ON vip_customers
  FOR UPDATE USING (user_id = auth.user_id());

-- =============================================
-- 24. WALLET_SESSIONS TABLE
-- =============================================
ALTER TABLE wallet_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet sessions" ON wallet_sessions;
CREATE POLICY "Users can view own wallet sessions" ON wallet_sessions
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own wallet sessions" ON wallet_sessions;
CREATE POLICY "Users can insert own wallet sessions" ON wallet_sessions
  FOR INSERT WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own wallet sessions" ON wallet_sessions;
CREATE POLICY "Users can update own wallet sessions" ON wallet_sessions
  FOR UPDATE USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can delete own wallet sessions" ON wallet_sessions;
CREATE POLICY "Users can delete own wallet sessions" ON wallet_sessions
  FOR DELETE USING (user_id = auth.user_id());

-- =============================================
-- 25. WALLET_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions" ON wallet_transactions
  FOR SELECT USING (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can insert own wallet transactions" ON wallet_transactions
  FOR INSERT WITH CHECK (user_id = auth.user_id());

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Run this to verify all tables have RLS enabled:
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'referral_network', 'pending_transactions', 'admin_settings',
    'approved_transactions', 'balance_history', 'chain_transactions', 'conversions',
    'mining_sessions', 'nmx_daily_limits', 'nmx_trades', 'notifications',
    'pending_payments', 'rejection_reasons', 'settings', 'token_prices',
    'transactions', 'user_purchase_history', 'user_sessions', 'user_tasks',
    'user_wallets', 'vip_benefits', 'vip_customers', 'wallet_sessions',
    'wallet_transactions'
  )
ORDER BY tablename;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ RLS POLICIES APPLIED SUCCESSFULLY';
    RAISE NOTICE '✅ Backend (service role) bypasses RLS automatically';
    RAISE NOTICE '✅ Frontend users can only access their own data';
    RAISE NOTICE '⚠️  If website hangs, run disable_rls_emergency.sql';
END $$;
