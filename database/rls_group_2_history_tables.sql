-- =============================================
-- GROUP 2: HISTORY & MINING TABLES (5 tables)
-- =============================================
-- Run AFTER Group 1
-- Tables: balance_history, chain_transactions, conversions,
--         mining_sessions, nmx_daily_limits

-- =============================================
-- 6. BALANCE_HISTORY TABLE
-- =============================================
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own balance history" ON balance_history;
CREATE POLICY "Users can view own balance history" ON balance_history
  FOR SELECT USING (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own balance history" ON balance_history;
CREATE POLICY "Users can insert own balance history" ON balance_history
  FOR INSERT WITH CHECK (user_id = public.get_user_id());

-- =============================================
-- 7. CHAIN_TRANSACTIONS TABLE
-- =============================================
ALTER TABLE chain_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chain transactions" ON chain_transactions;
CREATE POLICY "Users can view own chain transactions" ON chain_transactions
  FOR SELECT USING (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own chain transactions" ON chain_transactions;
CREATE POLICY "Users can insert own chain transactions" ON chain_transactions
  FOR INSERT WITH CHECK (user_id = public.get_user_id());

-- =============================================
-- 8. CONVERSIONS TABLE
-- =============================================
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversions" ON conversions;
CREATE POLICY "Users can view own conversions" ON conversions
  FOR SELECT USING (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own conversions" ON conversions;
CREATE POLICY "Users can insert own conversions" ON conversions
  FOR INSERT WITH CHECK (user_id = public.get_user_id());

-- =============================================
-- 9. MINING_SESSIONS TABLE
-- =============================================
ALTER TABLE mining_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mining sessions" ON mining_sessions;
CREATE POLICY "Users can view own mining sessions" ON mining_sessions
  FOR SELECT USING (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own mining sessions" ON mining_sessions;
CREATE POLICY "Users can insert own mining sessions" ON mining_sessions
  FOR INSERT WITH CHECK (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can update own mining sessions" ON mining_sessions;
CREATE POLICY "Users can update own mining sessions" ON mining_sessions
  FOR UPDATE USING (user_id = public.get_user_id());

-- =============================================
-- 10. NMX_DAILY_LIMITS TABLE
-- =============================================
ALTER TABLE nmx_daily_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own nmx limits" ON nmx_daily_limits;
CREATE POLICY "Users can view own nmx limits" ON nmx_daily_limits
  FOR SELECT USING (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can insert own nmx limits" ON nmx_daily_limits;
CREATE POLICY "Users can insert own nmx limits" ON nmx_daily_limits
  FOR INSERT WITH CHECK (user_id = public.get_user_id());

DROP POLICY IF EXISTS "Users can update own nmx limits" ON nmx_daily_limits;
CREATE POLICY "Users can update own nmx limits" ON nmx_daily_limits
  FOR UPDATE USING (user_id = public.get_user_id());

-- =============================================
-- VERIFY GROUP 2
-- =============================================
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('balance_history', 'chain_transactions', 'conversions',
                    'mining_sessions', 'nmx_daily_limits');
