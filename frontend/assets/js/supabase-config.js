// Supabase Configuration - FIXED VERSION
console.log('🔄 Loading Supabase configuration...');

const SUPABASE_URL = 'https://bjulifvbfogymoduxnzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';

// Initialize Supabase client
let supabase;

try {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        });
        console.log('✅ Supabase client initialized successfully');
        console.log('✅ Auth available:', !!supabase.auth);
    } else {
        console.error('❌ Supabase JS library not loaded properly');
    }
} catch (error) {
    console.error('❌ Error initializing Supabase:', error);
}

// Make globally available
window.supabase = supabase;
window.supabaseClient = supabase;

// Export functions (UPDATED FOR profile TABLE)
async function getUserBalance(userId) {
    if (!supabase) {
        console.error('Supabase not initialized in getUserBalance');
        return 0;
    }

    try {
        const { data, error } = await supabase
            .from('profile')  // ✅ CHANGED: Using your profile table
            .select('balance')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching balance:', error);
            return 0;
        }
        
        return data?.balance || 0;
    } catch (error) {
        console.error('Error in getUserBalance:', error);
        return 0;
    }
}

async function updateUserBalance(userId, newBalance) {
    if (!supabase) {
        console.error('Supabase not initialized in updateUserBalance');
        return false;
    }

    try {
        const { error } = await supabase
            .from('profile')  // ✅ CHANGED: Using your profile table
            .update({ 
                balance: newBalance,
                last_claim: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            console.error('Error updating balance:', error);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error in updateUserBalance:', error);
        return false;
    }
}

async function saveClaimHistory(userId, amount) {
    if (!supabase) {
        console.error('Supabase not initialized in saveClaimHistory');
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

        if (error) {
            console.error('Error saving claim history:', error);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error in saveClaimHistory:', error);
        return false;
    }
}

// NEW: Get user profile
async function getUserProfile(userId) {
    if (!supabase) {
        console.error('Supabase not initialized in getUserProfile');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('profile')  // ✅ CHANGED: Using your profile table
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        return null;
    }
}

console.log('🎯 Supabase config loaded with profile table, client:', !!supabase);