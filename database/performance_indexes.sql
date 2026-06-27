-- Performance indexes for high-traffic auth, sessions, and notifications queries
-- Run this in Supabase SQL Editor or your database management tool.

CREATE INDEX IF NOT EXISTS idx_wallet_sessions_user_token_expires
    ON public.wallet_sessions (user_id, session_token, expires_at);

CREATE INDEX IF NOT EXISTS idx_wallet_sessions_token_expires
    ON public.wallet_sessions (session_token, expires_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON public.notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_profiles_id_balance
    ON public.profiles (id, balance);

CREATE INDEX IF NOT EXISTS idx_profiles_email
    ON public.profiles (email);

CREATE INDEX IF NOT EXISTS idx_transactions_user_status_created
    ON public.transactions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_created
    ON public.transactions (wallet_address, created_at DESC);
