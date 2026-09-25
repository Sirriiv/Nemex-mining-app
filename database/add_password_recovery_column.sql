-- Adds the server-key-encrypted recovery envelope column to user_wallets.
-- The envelope allows password reset via verified email OTP (Supabase Auth)
-- without requiring the 24-word recovery phrase.
--
-- The column is filled lazily by the backend on successful wallet login
-- (the plaintext password is only available at that moment).
--
-- Run this once in the Supabase SQL editor before deploying the new backend.

ALTER TABLE user_wallets
    ADD COLUMN IF NOT EXISTS password_recovery TEXT;
