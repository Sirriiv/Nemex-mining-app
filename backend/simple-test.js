console.log('🔍 Starting Supabase test...');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('✅ Packages loaded successfully!');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Supabase URL:', supabaseUrl ? '✅ PRESENT' : '❌ MISSING');
console.log('Supabase Key:', supabaseKey ? '✅ PRESENT' : '❌ MISSING');

if (supabaseUrl && supabaseKey) {
  console.log('🎯 Testing database connection...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  supabase.from('User').select('*').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Database error:', error.message);
      } else {
        console.log('✅ Database connected! Found', data.length, 'users');
      }
    })
    .catch(err => {
      console.log('❌ Connection failed:', err.message);
    });
} else {
  console.log('❌ Missing Supabase credentials in .env file');
}
