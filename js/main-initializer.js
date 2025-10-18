// Main Application Initializer - UPDATED WITH PROFILE & NAVIGATION FIXES
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

            // Step 6: Set up enhanced navigation with loading
            this.setupEnhancedNavigation();

            // Step 7: Set up basic event listeners
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
                
                // Update profile immediately after auth loads
                this.updateUserProfileUI();
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
                
                // Update profile with user data
                this.updateUserProfileUI();
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

    setupEnhancedNavigation() {
        console.log('🔄 Setting up enhanced navigation...');
        
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.section');
        
        navButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const targetSection = button.getAttribute('data-section');
                
                // Show loading state
                this.showSectionLoading(targetSection);
                
                // Add a small delay for smooth transition
                setTimeout(() => {
                    // Update navigation
                    navButtons.forEach(btn => btn.classList.remove('active'));
                    sections.forEach(section => section.classList.remove('active'));
                    
                    button.classList.add('active');
                    document.getElementById(`${targetSection}-section`).classList.add('active');
                    
                    // Hide loading
                    this.hideSectionLoading();
                    
                    console.log(`✅ Switched to ${targetSection} section`);
                }, 300);
            });
        });
        
        console.log('✅ Enhanced navigation setup complete');
    }

    showSectionLoading(section) {
        console.log(`🔄 Loading ${section} section...`);
        
        // Add visual loading state
        const activeSection = document.querySelector('.section.active');
        if (activeSection) {
            activeSection.style.opacity = '0.6';
            activeSection.style.transition = 'opacity 0.3s ease';
        }
        
        // You can add a loading spinner here if needed
        const targetElement = document.getElementById(`${section}-section`);
        if (targetElement) {
            targetElement.style.opacity = '0.6';
        }
    }

    hideSectionLoading() {
        // Remove loading states
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.opacity = '1';
            section.style.transition = 'opacity 0.3s ease';
        });
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
        console.log('🔄 Updating profile UI...');
        
        const userData = window.UserDataManager ? window.UserDataManager.getUserData() : null;
        const auth = window.AuthManager;
        
        if (userData && auth) {
            // Calculate days since member joined
            const joinDate = auth.currentUser.joinDate ? new Date(auth.currentUser.joinDate) : new Date();
            const today = new Date();
            const daysMining = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)) + 1;
            
            // Update profile section elements
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const profileUserId = document.getElementById('profileUserId');
            const profileMiningDays = document.getElementById('profileMiningDays');
            const profileMemberSince = document.getElementById('profileMemberSince');
            
            if (profileName) {
                profileName.textContent = userData.username || auth.currentUser.name || 'User';
                profileName.style.color = 'var(--gold)';
            }
            
            if (profileEmail) {
                profileEmail.textContent = userData.email || auth.currentUser.email || 'Not set';
                profileEmail.style.color = 'var(--gold)';
            }
            
            if (profileUserId) {
                profileUserId.textContent = userData.id || auth.currentUser.id || 'Unknown';
                profileUserId.style.color = 'var(--gold)';
            }
            
            if (profileMiningDays) {
                profileMiningDays.textContent = `${daysMining} day${daysMining !== 1 ? 's' : ''}`;
                profileMiningDays.style.color = 'var(--gold)';
            }
            
            if (profileMemberSince) {
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                profileMemberSince.textContent = joinDate.toLocaleDateString(undefined, options);
                profileMemberSince.style.color = 'var(--gold)';
            }
            
            console.log('✅ Profile UI updated with user data');
        } else {
            console.warn('⚠️ No user data available for profile UI, setting demo data');
            this.setDemoProfileData();
        }
    }

    setDemoProfileData() {
        // Set demo data for profile section
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileUserId = document.getElementById('profileUserId');
        const profileMiningDays = document.getElementById('profileMiningDays');
        const profileMemberSince = document.getElementById('profileMemberSince');
        
        if (profileName) profileName.textContent = 'Demo User';
        if (profileEmail) profileEmail.textContent = 'demo@nemexcoin.com';
        if (profileUserId) profileUserId.textContent = 'demo-user-123';
        if (profileMiningDays) profileMiningDays.textContent = '1 day';
        if (profileMemberSince) {
            const today = new Date();
            profileMemberSince.textContent = today.toLocaleDateString(undefined, { 
                year: 'numeric', month: 'long', day: 'numeric' 
            });
        }
    }

    updateDemoModeUI() {
        // Show demo mode indicator if needed
        console.log('🔸 Running in demo mode');
        this.setDemoProfileData();
    }

    setupBasicEventListeners() {
        console.log('✅ Setting up basic event listeners...');

        // Update claim button to use real auth
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.addEventListener('click', async () => {
                if (!claimButton.disabled) {
                    try {
                        const result = await window.UserDataManager.claimReward();
                        if (result.success) {
                            alert(`Successfully claimed ${result.claimedAmount} NMX!`);
                            // Refresh the countdown
                            if (window.CountdownManager) {
                                window.CountdownManager.restart();
                            }
                        } else {
                            alert('Failed to claim reward: ' + result.error);
                        }
                    } catch (error) {
                        console.error('❌ Claim error:', error);
                        alert('Error claiming reward. Please try again.');
                    }
                }
            });
        }

        // Ensure settings modal works
        const settingsButton = document.getElementById('settingsButton');
        const settingsModal = document.getElementById('settingsModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const closeSettings = document.getElementById('closeSettings');

        if (settingsButton && settingsModal) {
            settingsButton.addEventListener('click', () => {
                settingsModal.style.display = 'block';
                modalOverlay.style.display = 'block';
            });

            if (closeSettings) {
                closeSettings.addEventListener('click', () => {
                    settingsModal.style.display = 'none';
                    modalOverlay.style.display = 'none';
                    if (typeof backToMainSettings === 'function') {
                        backToMainSettings();
                    }
                });
            }

            if (modalOverlay) {
                modalOverlay.addEventListener('click', () => {
                    settingsModal.style.display = 'none';
                    modalOverlay.style.display = 'none';
                    if (typeof backToMainSettings === 'function') {
                        backToMainSettings();
                    }
                });
            }
        }

        console.log('✅ Basic event listeners set up');
    }
}

// Make it globally available
window.MainInitializer = MainInitializer;