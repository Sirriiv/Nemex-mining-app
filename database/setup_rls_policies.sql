-- =============================================
-- RLS POLICIES FOR ALL TABLES
-- Safe setup that won't break the website
-- Backend service role bypasses RLS automatically
-- =============================================

-- NOTE: Your backend uses the service_role key which bypasses RLS
-- These policies are for direct database access and frontend queries

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid()::text = user_id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- =============================================
-- 2. REFERRAL_NETWORK TABLE
-- =============================================
ALTER TABLE referral_network ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral network
CREATE POLICY "Users can view own referrals"
ON referral_network FOR SELECT
USING (auth.uid()::text = user_id OR auth.uid()::text = referred_by);

-- System can insert referrals (usually done by backend)
CREATE POLICY "Service can insert referrals"
ON referral_network FOR INSERT
WITH CHECK (true);

-- =============================================
-- 3. PENDING_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending transactions
CREATE POLICY "Users can view own pending transactions"
ON pending_transactions FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
ON pending_transactions FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- =============================================
-- 4. ADMIN_SETTINGS TABLE
-- =============================================
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no user policies)
-- This table is admin-only, accessed via backend

-- =============================================
-- 5. APPROVED_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE approved_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own approved transactions
CREATE POLICY "Users can view own approved transactions"
ON approved_transactions FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 6. BALANCE_HISTORY TABLE
-- =============================================
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own balance history
CREATE POLICY "Users can view own balance history"
ON balance_history FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 7. CHAIN_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE chain_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own chain transactions
CREATE POLICY "Users can view own chain transactions"
ON chain_transactions FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 8. CONVERSIONS TABLE
-- =============================================
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversions
CREATE POLICY "Users can view own conversions"
ON conversions FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 9. MINING_SESSIONS TABLE
-- =============================================
ALTER TABLE mining_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own mining sessions
CREATE POLICY "Users can view own mining sessions"
ON mining_sessions FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can insert their own mining sessions
CREATE POLICY "Users can insert own mining sessions"
ON mining_sessions FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own mining sessions
CREATE POLICY "Users can update own mining sessions"
ON mining_sessions FOR UPDATE
USING (auth.uid()::text = user_id);

-- =============================================
-- 10. NMX_DAILY_LIMITS TABLE
-- =============================================
ALTER TABLE nmx_daily_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own daily limits
CREATE POLICY "Users can view own nmx daily limits"
ON nmx_daily_limits FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 11. NMX_TRADES TABLE
-- =============================================
ALTER TABLE nmx_trades ENABLE ROW LEVEL SECURITY;

-- Users can view their own trades
CREATE POLICY "Users can view own nmx trades"
ON nmx_trades FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 12. NOTIFICATIONS TABLE
-- =============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid()::text = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid()::text = user_id);

-- =============================================
-- 13. PENDING_PAYMENTS TABLE
-- =============================================
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending payments
CREATE POLICY "Users can view own pending payments"
ON pending_payments FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 14. REJECTION_REASONS TABLE
-- =============================================
ALTER TABLE rejection_reasons ENABLE ROW LEVEL SECURITY;

-- Everyone can read rejection reasons (for displaying in UI)
CREATE POLICY "Anyone can view rejection reasons"
ON rejection_reasons FOR SELECT
USING (true);

-- =============================================
-- 15. SETTINGS TABLE
-- =============================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
ON settings FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
ON settings FOR UPDATE
USING (auth.uid()::text = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
ON settings FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- =============================================
-- 16. TOKEN_PRICES TABLE
-- =============================================
ALTER TABLE token_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can read token prices (public data)
CREATE POLICY "Anyone can view token prices"
ON token_prices FOR SELECT
USING (true);

-- =============================================
-- 17. TRANSACTIONS TABLE
-- =============================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 18. USER_PURCHASE_HISTORY TABLE
-- =============================================
ALTER TABLE user_purchase_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchase history
CREATE POLICY "Users can view own purchase history"
ON user_purchase_history FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 19. USER_SESSIONS TABLE
-- =============================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON user_sessions FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 20. USER_TASKS TABLE
-- =============================================
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
ON user_tasks FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks"
ON user_tasks FOR UPDATE
USING (auth.uid()::text = user_id);

-- =============================================
-- 21. USER_WALLETS TABLE
-- =============================================
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallets
CREATE POLICY "Users can view own wallets"
ON user_wallets FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can insert their own wallets
CREATE POLICY "Users can insert own wallets"
ON user_wallets FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own wallets
CREATE POLICY "Users can update own wallets"
ON user_wallets FOR UPDATE
USING (auth.uid()::text = user_id);

-- =============================================
-- 22. VIP_BENEFITS TABLE
-- =============================================
ALTER TABLE vip_benefits ENABLE ROW LEVEL SECURITY;

-- Everyone can read VIP benefits (public information)
CREATE POLICY "Anyone can view vip benefits"
ON vip_benefits FOR SELECT
USING (true);

-- =============================================
-- 23. VIP_CUSTOMERS TABLE
-- =============================================
ALTER TABLE vip_customers ENABLE ROW LEVEL SECURITY;

-- Users can view their own VIP status
CREATE POLICY "Users can view own vip status"
ON vip_customers FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- 24. WALLET_SESSIONS TABLE
-- =============================================
ALTER TABLE wallet_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet sessions
CREATE POLICY "Users can view own wallet sessions"
ON wallet_sessions FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can insert their own wallet sessions
CREATE POLICY "Users can insert own wallet sessions"
ON wallet_sessions FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own wallet sessions
CREATE POLICY "Users can update own wallet sessions"
ON wallet_sessions FOR UPDATE
USING (auth.uid()::text = user_id);

-- Users can delete their own wallet sessions
CREATE POLICY "Users can delete own wallet sessions"
ON wallet_sessions FOR DELETE
USING (auth.uid()::text = user_id);

-- =============================================
-- 25. WALLET_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet transactions
CREATE POLICY "Users can view own wallet transactions"
ON wallet_transactions FOR SELECT
USING (auth.uid()::text = user_id);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check which tables have RLS enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- Check policies for a specific table
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- =============================================
-- NOTES:
-- =============================================
-- 1. Your backend uses service_role key which BYPASSES RLS
--    So all backend operations will work normally
--
-- 2. These policies protect direct database access and
--    any frontend queries using anon or authenticated keys
--
-- 3. Public tables (token_prices, vip_benefits, rejection_reasons)
--    allow anyone to read
--
-- 4. Admin tables (admin_settings) have RLS enabled but no
--    user policies - only accessible via service role (backend)
--
-- 5. All user data tables restrict access to user_id = auth.uid()
--
-- 6. To temporarily disable RLS on a table for testing:
--    ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
--
-- 7. To drop all policies on a table:
--    DROP POLICY IF EXISTS "policy_name" ON table_name;
