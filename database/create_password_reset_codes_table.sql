-- Password reset OTP codes (email recovery, delivered via Brevo)
-- Run once in the Supabase SQL editor.
--
-- The plaintext code is NEVER stored: the backend stores only a SHA-256 hash
-- (peppered with APP_ENCRYPTION_KEY), so a database leak cannot be replayed.
-- One active code per email - issuing a new one overwrites the previous row.
-- Row Level Security is enabled with no policies, so the table is only
-- reachable through the service-role key on the server.

CREATE TABLE IF NOT EXISTS password_reset_codes (
    email       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    code_hash   TEXT NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_codes_expires_at_idx
    ON password_reset_codes (expires_at);

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Optional housekeeping: delete codes that are older than an hour.
-- (Safe to run at any time; expired codes are rejected by the API regardless.)
-- DELETE FROM password_reset_codes WHERE created_at < NOW() - INTERVAL '1 hour';
