-- Add mnemonic_salt column to user_wallets for Argon2 per-user salt
ALTER TABLE IF EXISTS user_wallets
    ADD COLUMN IF NOT EXISTS mnemonic_salt TEXT;

-- Optional: index for quick lookup (not unique)
CREATE INDEX IF NOT EXISTS idx_user_wallets_mnemonic_salt ON user_wallets(mnemonic_salt);
