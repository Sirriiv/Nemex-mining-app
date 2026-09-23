// js/supabase.js - SIMPLIFIED VERSION
// Credentials come from server-injected /app-config.js (no secrets in source).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.1/+esm'

if (!window.APP_CONFIG || !window.APP_CONFIG.supabaseUrl || !window.APP_CONFIG.supabaseAnonKey) {
    throw new Error('APP_CONFIG missing. Load /app-config.js before this module.');
}

const supabaseUrl = window.APP_CONFIG.supabaseUrl;
const supabaseKey = window.APP_CONFIG.supabaseAnonKey;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple auth functions
const supabaseAuth = {
    async getCurrentUser() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user || null;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    }
};

// Export for global use
window.supabase = supabase;
window.supabaseAuth = supabaseAuth;

console.log('✅ Supabase initialized successfully');
