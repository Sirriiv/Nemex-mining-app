-- Add idempotency_key column to transactions to support idempotent sends
ALTER TABLE IF EXISTS transactions
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Index only for non-null values to enforce uniqueness when provided
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_idx
    ON transactions (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
