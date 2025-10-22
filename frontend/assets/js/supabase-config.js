// Supabase Configuration - FIXED VERSION
console.log('🔄 Loading Supabase configuration...');

// Wait for Supabase to be available
function initializeSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase JS library not loaded');
        return null;
    }
    
    const SUPABASE_URL = 'https://bjulifvbfogymoduxnzl.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';

    try {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Test if auth is available
        if (supabase && supabase.auth) {
            console.log('✅ Supabase initialized successfully');
            console.log('✅ Auth module available');
            return supabase;
        } else {
            console.error('❌ Supabase auth not available');
            return null;
        }
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        return null;
    }
}

// Initialize and make globally available
const supabase = initializeSupabase();
window.supabaseClient = supabase;

// Export functions
async function getUserBalance(userId) {
    if (!supabase) {
        console.error('Supabase not initialized');
        return 0;
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data?.balance || 0;
    } catch (error) {
        console.error('Error fetching balance:', error);
        return 0;
    }
}

async function updateUserBalance(userId, newBalance) {
    if (!supabase) {
        console.error('Supabase not initialized');
        return false;
    }
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ 
                balance: newBalance,
                last_claim: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating balance:', error);
        return false;
    }
}

async function saveClaimHistory(userId, amount) {
    if (!supabase) {
        console.error('Supabase not initialized');
        return false;
    }
    
    try {
        const { error } = await supabase
            .from('claim_history')
            .insert([
                { 
                    user_id: userId, 
                    amount: amount, 
                    claimed_at: new Date().toISOString() 
                }
            ]);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error saving claim history:', error);
        return false;
    }
}