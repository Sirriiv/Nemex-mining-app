// Main Application Initializer
// Coordinates all modules and manages startup sequence

class MainInitializer {
    constructor() {
        this.modules = [];
        this.isInitialized = false;
    }

    async initialize() {
        console.log('🚀 Starting NEMEXCOIN Application Initialization...');
        
        try {
            // Step 1: Initialize Supabase configuration
            console.log('1. Loading Supabase configuration...');
            await this.initializeSupabase();
            
            // Step 2: Initialize Countdown Manager
            console.log('2. Starting countdown manager...');
            this.initializeCountdown();
            
            // Step 3: Initialize User Manager
            console.log('3. Starting user manager...');
            await this.initializeUserManager();
            
            // Step 4: Set up event listeners
            console.log('4. Setting up event listeners...');
            this.setupEventListeners();
            
            // Step 5: Hide loading screen
            console.log('5. Hiding loading screen...');
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ NEMEXCOIN Application initialized successfully!');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeSupabase() {
        // First, initialize the configuration
        await window.SupabaseConfig.getConfig();
        
        // Then initialize the client
        const success = await window.SupabaseClient.initialize();
        
        if (success) {
            console.log('✅ Supabase initialized successfully');
        } else {
            console.log('ℹ️ Supabase not available, using localStorage fallback');
        }
    }

    initializeCountdown() {
        window.CountdownManager.initialize();
        console.log('✅ Countdown manager started');
    }

    async initializeUserManager() {
        await window.UserManager.initialize();
        console.log('✅ User manager started');
        console.log('Data source:', window.UserManager.isUsingSupabase() ? 'Supabase' : 'localStorage');
    }

    setupEventListeners() {
        this.setupClaimButton();
        this.setupNavigation();
        this.setupSettings();
        console.log('✅ Event listeners set up');
    }

    setupClaimButton() {
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.addEventListener('click', async () => {
                await this.handleClaim();
            });
        }
    }

    async handleClaim() {
        const claimButton = document.getElementById('claimButton');
        if (claimButton.disabled) return;
        
        try {
            // Get current balance
            const currentBalance = window.UserManager.getBalance();
            const newBalance = currentBalance + 30;
            
            // Update balance
            await window.UserManager.updateBalance(newBalance);
            
            // Show success message
            alert('30 NMX claimed successfully!');
            
            // Reset countdown
            window.CountdownManager.resetCountdown();
            
            console.log('✅ NMX claimed successfully. New balance:', newBalance);
            
        } catch (error) {
            console.error('Error claiming NMX:', error);
            alert('Error claiming NMX. Please try again.');
        }
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.section');
        
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetSection = button.getAttribute('data-section');
                
                // Remove active class from all buttons and sections
                navButtons.forEach(btn => btn.classList.remove('active'));
                sections.forEach(section => section.classList.remove('active'));
                
                // Add active class to clicked button and target section
                button.classList.add('active');
                document.getElementById(`${targetSection}-section`).classList.add('active');
                
                console.log('Navigated to:', targetSection);
            });
        });
    }

    setupSettings() {
        const settingsButton = document.getElementById('settingsButton');
        const settingsModal = document.getElementById('settingsModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const closeSettings = document.getElementById('closeSettings');
        
        if (settingsButton && settingsModal) {
            settingsButton.addEventListener('click', () => {
                settingsModal.style.display = 'block';
                modalOverlay.style.display = 'block';
            });
            
            closeSettings.addEventListener('click', this.closeSettingsModal);
            modalOverlay.addEventListener('click', this.closeSettingsModal);
        }
    }

    closeSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (settingsModal && modalOverlay) {
            settingsModal.style.display = 'none';
            modalOverlay.style.display = 'none';
            this.backToMainSettings();
        }
    }

    backToMainSettings() {
        document.querySelectorAll('.settings-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById('settingsMain').classList.add('active');
    }

    hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
                console.log('✅ Loading screen hidden');
            }
        }, 2000);
    }

    handleInitializationError(error) {
        // Even if initialization fails, hide loading screen and use fallbacks
        this.hideLoadingScreen();
        console.log('ℹ️ Application running with fallback mode');
    }
}

// Create and initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    const app = new MainInitializer();
    await app.initialize();
});
