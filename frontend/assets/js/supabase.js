// js/supabase.js - SIMPLIFIED VERSION
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.1/+esm'

// Your Supabase configuration
const supabaseUrl = 'https://bjulifvbfogymoduxnzl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';

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