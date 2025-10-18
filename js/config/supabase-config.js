// Hybrid Supabase Configuration
// Tries multiple sources to get Supabase credentials

class SupabaseConfig {
    constructor() {
        this.sources = [
            this.tryApiEndpoint.bind(this),
            this.tryEnvFile.bind(this),
            this.tryMetaTags.bind(this)
        ];
        this.config = null;
    }

    // Try to get config from backend API
    async tryApiEndpoint() {
        try {
            console.log('Trying to fetch config from API...');
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                console.log('Config loaded from API');
                return {
                    url: config.supabaseUrl,
                    anonKey: config.supabaseAnonKey,
                    source: 'api'
                };
            }
        } catch (error) {
            console.log('API endpoint not available');
        }
        return null;
    }

    // Try to get config from build-time environment variables
    tryEnvFile() {
        console.log('Trying to get config from environment variables...');
        // If using a build process that injects environment variables
        if (typeof window !== 'undefined' && window.__ENV__) {
            console.log('Config loaded from build environment');
            return {
                url: window.__ENV__.SUPABASE_URL,
                anonKey: window.__ENV__.SUPABASE_ANON_KEY,
                source: 'build_env'
            };
        }
        return null;
    }

    // Try to get config from HTML meta tags
    tryMetaTags() {
        console.log('Trying to get config from meta tags...');
        const urlMeta = document.querySelector('meta[name="supabase-url"]');
        const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
        
        if (urlMeta && keyMeta) {
            const url = urlMeta.getAttribute('content');
            const anonKey = keyMeta.getAttribute('content');
            
            if (url && anonKey) {
                console.log('Config loaded from meta tags');
                return {
                    url: url,
                    anonKey: anonKey,
                    source: 'meta_tags'
                };
            }
        }
        return null;
    }

    // Get configuration from available sources
    async getConfig() {
        for (const source of this.sources) {
            const config = await source();
            if (config && config.url && config.anonKey) {
                this.config = config;
                console.log(`Supabase configuration loaded from: ${config.source}`);
                return config;
            }
        }
        
        console.warn('No Supabase configuration found in any source');
        return null;
    }

    // Check if we have valid configuration
    isValid() {
        return this.config !== null;
    }

    // Get the source of the configuration
    getSource() {
        return this.config ? this.config.source : 'none';
    }
}

// Create and export instance
window.SupabaseConfig = new SupabaseConfig();
