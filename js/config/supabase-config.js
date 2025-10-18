// Supabase Configuration Manager
class SupabaseConfig {
    constructor() {
        this.supabaseUrl = null;
        this.supabaseAnonKey = null;
        this.isConfigured = false;
    }

    async getConfig() {
        try {
            // Try to get from meta tags first
            const urlMeta = document.querySelector('meta[name="supabase-url"]');
            const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
            
            if (urlMeta && keyMeta) {
                this.supabaseUrl = urlMeta.getAttribute('content');
                this.supabaseAnonKey = keyMeta.getAttribute('content');
                console.log('✅ Supabase config loaded from meta tags');
            } else {
                // Fallback to direct values
                this.supabaseUrl = 'https://bjulifvbfogymoduxnzl.supabase.co';
                this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';
                console.log('✅ Supabase config loaded from hardcoded values');
            }

            if (!this.supabaseUrl || !this.supabaseAnonKey) {
                throw new Error('Missing Supabase configuration');
            }

            this.isConfigured = true;
            return {
                url: this.supabaseUrl,
                anonKey: this.supabaseAnonKey
            };
        } catch (error) {
            console.error('❌ Supabase config error:', error);
            this.isConfigured = false;
            throw error;
        }
    }
}

// Create global instance
window.SupabaseConfig = new SupabaseConfig();