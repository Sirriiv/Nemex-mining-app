// Supabase Configuration - loads credentials from server-injected /app-config.js
// No secrets are hardcoded in source. The server injects SUPABASE_URL and the
// public anon key from environment variables at /app-config.js.
console.log('🎯 Supabase config loading...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing Supabase...');

    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase not loaded from CDN');
        return;
    }

    if (!window.APP_CONFIG || !window.APP_CONFIG.supabaseUrl || !window.APP_CONFIG.supabaseAnonKey) {
        console.error('❌ APP_CONFIG missing or incomplete. Ensure /app-config.js is loaded before this script.');
        return;
    }

    try {
        // Create Supabase client
        const supabaseClient = supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseAnonKey);

        // Make globally available
        window.supabase = supabaseClient;
        window.supabaseClient = supabaseClient;

        console.log('✅ Supabase client initialized:', !!supabaseClient);
        console.log('✅ Auth available:', !!supabaseClient.auth);

    } catch (error) {
        console.error('❌ Error creating Supabase client:', error);
    }
});

// Export functions
async function getUserBalance(userId) {
    if (!window.supabaseClient) {
        console.error('Supabase not initialized');
        return 0;
    }
    // ... rest of your functions remain the same
}
