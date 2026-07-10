-- Treasury Module Database Schema
-- Financial reserve manager for the Nemex ecosystem

CREATE TABLE IF NOT EXISTS treasury_config (
    id SERIAL PRIMARY KEY,
    buy_fee DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    sell_fee DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    quote_expiration_seconds INTEGER NOT NULL DEFAULT 300,
    min_trade_amount DECIMAL(20,2) NOT NULL DEFAULT 1.00,
    max_trade_amount DECIMAL(20,2) NOT NULL DEFAULT 100000.00,
    trading_enabled BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO treasury_config (id, buy_fee, sell_fee, quote_expiration_seconds, min_trade_amount, max_trade_amount, trading_enabled)
VALUES (1, 3.00, 3.00, 300, 1.00, 100000.00, false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS treasury_wallets (
    id SERIAL PRIMARY KEY,
    asset VARCHAR(10) NOT NULL CHECK (asset IN ('TON', 'NMX')),
    wallet_address VARCHAR(255) NOT NULL,
    label VARCHAR(100) NOT NULL,
    balance DECIMAL(30,8) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'syncing')),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_transactions (
    id SERIAL PRIMARY KEY,
    asset VARCHAR(10) NOT NULL CHECK (asset IN ('TON', 'NMX')),
    amount DECIMAL(30,8) NOT NULL,
    tx_type VARCHAR(20) NOT NULL CHECK (tx_type IN ('deposit', 'withdrawal', 'fee', 'transfer', 'swap', 'adjustment')),
    transaction_hash VARCHAR(255),
    wallet_address VARCHAR(255),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (category IN ('config', 'wallet', 'transaction', 'sync', 'general')),
    details JSONB,
    performed_by UUID,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_sync_logs (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES treasury_wallets(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
    balance_snapshot DECIMAL(30,8),
    error_message TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_transactions_asset ON treasury_transactions(asset);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_type ON treasury_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_created ON treasury_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_hash ON treasury_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_treasury_audit_logs_category ON treasury_audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_treasury_audit_logs_created ON treasury_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_wallets_asset ON treasury_wallets(asset);
CREATE INDEX IF NOT EXISTS idx_treasury_sync_logs_wallet ON treasury_sync_logs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_treasury_sync_logs_status ON treasury_sync_logs(status);
