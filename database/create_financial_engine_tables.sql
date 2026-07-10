-- Nemex Financial Engine – Phase 2 Schema
-- Middleware between Treasury and Wallet (no blockchain yet)

-- Quotes table: every quote request is recorded for auditing
CREATE TABLE IF NOT EXISTS fe_quotes (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    quote_type VARCHAR(4) NOT NULL CHECK (quote_type IN ('buy', 'sell')),
    asset_from VARCHAR(10) NOT NULL,
    asset_to VARCHAR(10) NOT NULL,
    amount_requested DECIMAL(30,8) NOT NULL,
    rate DECIMAL(20,8) NOT NULL,
    fee_percent DECIMAL(5,2) NOT NULL,
    fee_amount DECIMAL(30,8) NOT NULL,
    amount_receivable DECIMAL(30,8) NOT NULL,
    reference_value DECIMAL(20,8) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'consumed', 'cancelled')),
    treasury_ton_reserve DECIMAL(30,8) NOT NULL DEFAULT 0,
    treasury_nmx_reserve DECIMAL(30,8) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table: submitted trade requests
CREATE TABLE IF NOT EXISTS fe_trades (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    quote_id INTEGER REFERENCES fe_quotes(id),
    trade_type VARCHAR(4) NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    asset_from VARCHAR(10) NOT NULL,
    asset_to VARCHAR(10) NOT NULL,
    amount_from DECIMAL(30,8) NOT NULL,
    amount_to DECIMAL(30,8) NOT NULL,
    rate DECIMAL(20,8) NOT NULL,
    fee_percent DECIMAL(5,2) NOT NULL,
    fee_amount DECIMAL(30,8) NOT NULL,
    reference_value DECIMAL(20,8) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'processing', 'completed', 'failed', 'cancelled', 'rejected')),
    validation_errors JSONB,
    treasury_ton_before DECIMAL(30,8),
    treasury_nmx_before DECIMAL(30,8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial ledger: immutable audit trail of all engine events
CREATE TABLE IF NOT EXISTS fe_ledger (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('quote_requested', 'trade_submitted', 'trade_validated', 'trade_rejected', 'trade_completed', 'trade_failed', 'trade_cancelled')),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('quote', 'trade')),
    entity_id INTEGER NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fe_quotes_user ON fe_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_fe_quotes_status ON fe_quotes(status);
CREATE INDEX IF NOT EXISTS idx_fe_quotes_type ON fe_quotes(quote_type);
CREATE INDEX IF NOT EXISTS idx_fe_quotes_expires ON fe_quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_fe_trades_user ON fe_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_fe_trades_status ON fe_trades(status);
CREATE INDEX IF NOT EXISTS idx_fe_trades_type ON fe_trades(trade_type);
CREATE INDEX IF NOT EXISTS idx_fe_ledger_user ON fe_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_fe_ledger_event ON fe_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_fe_ledger_entity ON fe_ledger(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fe_ledger_created ON fe_ledger(created_at);
