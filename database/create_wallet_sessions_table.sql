-- Create wallet_sessions table for persistent login
CREATE TABLE IF NOT EXISTS wallet_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on session_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_token ON wallet_sessions(session_token);

-- Create index on user_id for cleanup
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_user ON wallet_sessions(user_id);

-- Create index on expires_at for cleanup of old sessions
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_expires ON wallet_sessions(expires_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE wallet_sessions ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role full access
CREATE POLICY "Allow service role full access" ON wallet_sessions
    FOR ALL
    USING (true);
