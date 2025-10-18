// Main Application Initializer - UPDATED FOR AUTH
class MainInitializer {
    constructor() {
        this.isInitialized = false;
    }

    async initialize() {
        console.log('🚀 Starting NEMEXCOIN Application...');
        
        try {
            // Step 1: Initialize Supabase
            await this.tryInitializeSupabase();
            
            // Step 2: Initialize Auth Manager
            await this.initializeAuth();
            
            // Step 3: Initialize user data manager
            await this.initializeUserData();
            
            // Step 4: Initialize countdown manager
            this.initializeCountdown();
            
            // Step 5: Set up UI based on auth status
            this.updateUIForAuthStatus();
            
            // Step 6: Set up basic event listeners
            this.setupBasicEventListeners();
            
            this.isInitialized = true;
            console.log('✅ NEMEXCOIN Application ready!');
            
        } catch (error) {
            console.error('❌ App initialization had issues:', error);
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

    async initializeAuth() {
        try {
            if (window.AuthManager) {
                await window.AuthManager.initialize();
                console.log('✅ Auth manager initialized');
            } else {
                console.log('ℹ️ Auth manager not available');
            }
        } catch (error) {
            console.warn('⚠️ Auth manager failed:', error);
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

    updateUIForAuthStatus() {
        const auth = window.AuthManager;
        if (auth && auth.isAuthenticated) {
            console.log('👤 User is authenticated:', auth.currentUser.email);
            // Update UI to show real user data
            this.updateUserProfileUI();
        } else {
            console.log('👤 User is in demo mode');
            // Update UI to show demo mode
            this.updateDemoModeUI();
        }
    }

    updateUserProfileUI() {
        // Update username, email, etc. in the UI
        const userData = window.UserDataManager.getUserData();
        if (userData) {
            // Update profile section in settings
            const profileSection = document.querySelector('#settingsProfile');
            if (profileSection) {
                const usernameElement = profileSection.querySelector('[data-username]');
                const emailElement = profileSection.querySelector('[data-email]');
                
                if (usernameElement) usernameElement.textContent = userData.username;
                if (emailElement) emailElement.textContent = userData.email;
            }
        }
    }

    updateDemoModeUI() {
        // Show demo mode indicator if needed
        console.log('🔸 Running in demo mode');
    }

    setupBasicEventListeners() {
        console.log('✅ Basic event listeners set up');
        
        // Update claim button to use real auth
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.addEventListener('click', async () => {
                if (!claimButton.disabled) {
                    const result = await window.UserDataManager.claimReward();
                    if (result.success) {
                        alert(`Successfully claimed ${result.claimedAmount} NMX!`);
                        // Refresh the countdown
                        window.CountdownManager.restart();
                    } else {
                        alert('Failed to claim reward: ' + result.error);
                    }
                }
            });
        }
    }
}

// Make it globally available
window.MainInitializer = MainInitializer;