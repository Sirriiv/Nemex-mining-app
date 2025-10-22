// Supabase Configuration
const SUPABASE_URL = 'https://bjulifvbfogymoduxnzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';

// Initialize Supabase PROPERLY
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase initialized:', !!supabase);
console.log('✅ Auth available:', !!supabase.auth);
console.log('✅ SignUp available:', !!supabase.auth.signUp);
console.log('✅ SignIn available:', !!supabase.auth.signInWithPassword);

// Export for global use
window.supabaseClient = supabase;

// Supabase Functions
async function getUserBalance(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
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
    try {
        const { error } = await supabase
            .from('users')
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