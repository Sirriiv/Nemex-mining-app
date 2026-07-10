-- Treasury Sync Configuration Migration
-- Phase 3: Add auto-sync columns to treasury_config

ALTER TABLE treasury_config
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE treasury_config
ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER NOT NULL DEFAULT 5;

-- Update existing row with defaults
UPDATE treasury_config
SET auto_sync_enabled = true, sync_interval_minutes = 5
WHERE id = 1 AND (auto_sync_enabled IS NULL OR sync_interval_minutes IS NULL);
