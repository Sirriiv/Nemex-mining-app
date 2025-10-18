// Simple & Reliable Supabase Client
class SupabaseClient {
    constructor() {
        this.client = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing Supabase client...');
            
            // Get configuration first
            const config = await window.SupabaseConfig.getConfig();
            
            if (!config || !config.url || !config.anonKey) {
                throw new Error('Invalid Supabase configuration');
            }

            console.log('🔌 Creating Supabase client...');
            
            // Initialize Supabase client
            this.client = supabase.createClient(config.url, config.anonKey);
            
            console.log('✅ Supabase client created');
            
            // Test connection with a simple query
            console.log('🔍 Testing Supabase connection...');
            const { data, error } = await this.client
                .from('users')
                .select('count')
                .limit(1);

            if (error) {
                console.warn('⚠️ Supabase connection test warning:', error.message);
                // Don't throw - we can continue with limited functionality
            } else {
                console.log('✅ Supabase connection successful!');
            }
            
            this.isInitialized = true;
            return this.client;
            
        } catch (error) {
            console.error('❌ Supabase client initialization failed:', error);
            this.isInitialized = false;
            // Don't throw - we want the app to work even without Supabase
            return null;
        }
    }

    getClient() {
        if (!this.isInitialized) {
            console.warn('⚠️ Supabase client not initialized');
            return null;
        }
        return this.client;
    }

    isReady() {
        return this.isInitialized && this.client !== null;
    }
}

// Create global instance
window.SupabaseClient = new SupabaseClient();