const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase credentials not found. Using mock database.');
    module.exports = null;
    return;
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
supabase.from('users').select('count', { count: 'exact' })
    .then(({ error }) => {
        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
        } else {
            console.log('✅ Supabase connected successfully');
        }
    })
    .catch(error => {
        console.error('❌ Supabase connection error:', error);
    });

module.exports = supabase;