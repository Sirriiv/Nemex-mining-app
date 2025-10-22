// Supabase Configuration
const SUPABASE_URL =
const SUPABASE_ANON_KEY = 'your-anon-key-here';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase Functions
async function getUserBalance(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error fetching balance:', error);
        return 0;
    }
    
    return data.balance;
}

async function updateUserBalance(userId, newBalance) {
    const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);
    
    if (error) {
        console.error('Error updating balance:', error);
        return false;
    }
    
    return true;
}

async function saveClaimHistory(userId, amount) {
    const { error } = await supabase
        .from('claim_history')
        .insert([
            { user_id: userId, amount: amount, claimed_at: new Date() }
        ]);
    
    if (error) {
        console.error('Error saving claim history:', error);
        return false;
    }
    
    return true;
}