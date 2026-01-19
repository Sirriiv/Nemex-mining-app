-- NMX Trading System Database Schema

-- Table to store locked NMX balance for each user
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS locked_nmx_balance DECIMAL(20,2) DEFAULT 0;

-- Table to store all NMX trades
CREATE TABLE IF NOT EXISTS nmx_trades (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ton_spent DECIMAL(20,8) NOT NULL,
    nmx_received DECIMAL(20,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL DEFAULT 2000,
    status VARCHAR(20) DEFAULT 'completed',
    transaction_hash VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT positive_ton CHECK (ton_spent > 0),
    CONSTRAINT positive_nmx CHECK (nmx_received > 0)
);

-- Table to track daily purchase limits
CREATE TABLE IF NOT EXISTS nmx_daily_limits (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_nmx_today DECIMAL(20,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_date UNIQUE(user_id, trade_date)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_nmx_trades_user_id ON nmx_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_nmx_trades_created_at ON nmx_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_nmx_daily_limits_user_date ON nmx_daily_limits(user_id, trade_date);

-- Function to update daily limits
CREATE OR REPLACE FUNCTION update_daily_limit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO nmx_daily_limits (user_id, trade_date, total_nmx_today)
    VALUES (NEW.user_id, CURRENT_DATE, NEW.nmx_received)
    ON CONFLICT (user_id, trade_date)
    DO UPDATE SET 
        total_nmx_today = nmx_daily_limits.total_nmx_today + NEW.nmx_received,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update daily limits
DROP TRIGGER IF EXISTS trigger_update_daily_limit ON nmx_trades;
CREATE TRIGGER trigger_update_daily_limit
AFTER INSERT ON nmx_trades
FOR EACH ROW
EXECUTE FUNCTION update_daily_limit();

COMMENT ON TABLE nmx_trades IS 'Stores all NMX token purchases with TON';
COMMENT ON TABLE nmx_daily_limits IS 'Tracks daily NMX purchase limits per user (5000 NMX/day)';
COMMENT ON COLUMN profiles.locked_nmx_balance IS 'Total locked NMX tokens awaiting distribution';
