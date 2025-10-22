// Supabase Configuration - SIMPLIFIED & FIXED
console.log('🎯 Supabase config loading...');

const SUPABASE_URL = 'https://bjulifvbfogymoduxnzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';

// Wait for Supabase to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing Supabase...');
    
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase not loaded from CDN');
        return;
    }
    
    try {
        // Create Supabase client
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
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