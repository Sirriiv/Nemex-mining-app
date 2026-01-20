-- =============================================
-- EMERGENCY: DISABLE RLS ON ALL TABLES
-- Run this if your website hangs after enabling RLS
-- =============================================

-- This will restore full access to all tables
-- You can then re-enable RLS table by table to diagnose issues

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_network DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE approved_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE balance_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE chain_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mining_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE nmx_daily_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE nmx_trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE rejection_reasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE token_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchase_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE vip_benefits DISABLE ROW LEVEL SECURITY;
ALTER TABLE vip_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;

-- Drop all policies (optional - use if you want to start fresh)
-- DO $$ 
-- DECLARE 
--     r RECORD;
-- BEGIN
--     FOR r IN 
--         SELECT schemaname, tablename, policyname 
--         FROM pg_policies 
--         WHERE schemaname = 'public'
--     LOOP
--         EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
--                        r.policyname, r.schemaname, r.tablename);
--     END LOOP;
-- END $$;
