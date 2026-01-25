// assets/js/supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Use YOUR exact credentials from login.html
const supabaseUrl = 'https://bjulifvbfogymoduxnzl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';

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