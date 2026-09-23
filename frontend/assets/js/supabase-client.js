// assets/js/supabase-client.js
// Credentials come from server-injected /app-config.js (no secrets in source).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

if (!window.APP_CONFIG || !window.APP_CONFIG.supabaseUrl || !window.APP_CONFIG.supabaseAnonKey) {
    throw new Error('APP_CONFIG missing. Load /app-config.js before this module.');
}

const supabaseUrl = window.APP_CONFIG.supabaseUrl;
const supabaseKey = window.APP_CONFIG.supabaseAnonKey;

// Create ONE global instance
if (!window.supabase) {
    window.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        }
    });
    console.log('✅ Global Supabase client initialized');
} else {
    console.log('✅ Using existing global Supabase client');
}

// Optional: Export if using modules elsewhere
export default window.supabase;
