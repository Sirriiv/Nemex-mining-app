// Simple Main Application Initializer
class MainInitializer {
    constructor() {
        this.isInitialized = false;
    }

    async initialize() {
        console.log('🚀 Starting NEMEXCOIN Application...');
        
        try {
            // Step 1: Try to initialize Supabase (but don't block if it fails)
            await this.tryInitializeSupabase();
            
            // Step 2: Initialize countdown manager
            this.initializeCountdown();
            
            // Step 3: Initialize user data manager
            await this.initializeUserData();
            
            // Step 4: Set up basic event listeners
            this.setupBasicEventListeners();
            
            this.isInitialized = true;
            console.log('✅ NEMEXCOIN Application ready!');
            
        } catch (error) {
            console.error('❌ App initialization had issues:', error);
            // Don't throw error - we want the app to work even with issues
        }
    }

    async tryInitializeSupabase() {
        try {
            if (window.SupabaseConfig && window.SupabaseClient) {
                await window.SupabaseConfig.getConfig();
                await window.SupabaseClient.initialize();
                console.log('✅ Supabase initialized');
            } else {
                console.log('ℹ️ Supabase modules not available');
            }
        } catch (error) {
            console.warn('⚠️ Supabase initialization failed, using fallback:', error);
        }
    }

    initializeCountdown() {
        try {
            if (window.CountdownManager) {
                window.CountdownManager.initialize();
                console.log('✅ Countdown manager started');
            } else {
                console.log('ℹ️ Countdown manager not available');
            }
        } catch (error) {
            console.warn('⚠️ Countdown manager failed:', error);
        }
    }

    async initializeUserData() {
        try {
            if (window.UserDataManager) {
                await window.UserDataManager.initialize();
                console.log('✅ User data manager started');
            } else {
                console.log('ℹ️ User data manager not available');
            }
        } catch (error) {
            console.warn('⚠️ User data manager failed:', error);
        }
    }

    setupBasicEventListeners() {
        console.log('✅ Basic event listeners set up');
        // Navigation is handled by emergency fallback
    }
}

// Make it globally available
window.MainInitializer = MainInitializer;