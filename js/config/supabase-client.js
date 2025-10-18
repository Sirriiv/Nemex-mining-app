// Supabase Client Initialization
// Uses configuration from SupabaseConfig to create the client

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isInitialized = false;
    }

    async initialize() {
        console.log('Initializing Supabase client...');
        
        // Get configuration first
        const config = await window.SupabaseConfig.getConfig();
        
        if (!config) {
            console.warn('No Supabase configuration available. Client will not be initialized.');
            return false;
        }

        try {
            // Initialize Supabase client
            this.client = window.supabase.createClient(config.url, config.anonKey);
            this.isInitialized = true;
            
            console.log('Supabase client initialized successfully');
            console.log('Configuration source:', config.source);
            
            return true;
            
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            this.isInitialized = false;
            return false;
        }
    }

    getClient() {
        return this.client;
    }

    isReady() {
        return this.isInitialized && this.client !== null;
    }
}

// Create and initialize instance
window.SupabaseClient = new SupabaseClient();
