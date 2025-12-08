// assets/js/wallet.js - DATABASE SESSION VERSION v10.1 - FIXED
console.log('🚀 NEMEX WALLET v10.1 - FIXED DATABASE SESSIONS');

class WalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        this.sessionToken = null;
        this.isInitialized = false;

        console.log('✅ Wallet Manager initialized');
    }

    // 🎯 GET CURRENT USER ID
    getCurrentUserId() {
        if (this.userId) return this.userId;
        
        // 1. Check window.miningUser
        if (window.miningUser && window.miningUser.id) {
            this.userId = window.miningUser.id;
            console.log('✅ User ID from window.miningUser:', this.userId);
            return this.userId;
        }
        
        // 2. Check sessionStorage
        const sessionUser = sessionStorage.getItem('miningUser');
        if (sessionUser) {
            try {
                const userData = JSON.parse(sessionUser);
                if (userData && userData.id) {
                    this.userId = userData.id;
                    window.miningUser = userData;
                    console.log('✅ User ID from sessionStorage:', this.userId);
                    return this.userId;
                }
            } catch (e) {
                console.warn('⚠️ Error parsing session user:', e);
            }
        }
        
        // 3. Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');
        if (userParam) {
            try {
                const userData = JSON.parse(decodeURIComponent(userParam));
                if (userData && userData.id) {
                    this.userId = userData.id;
                    window.miningUser = userData;
                    console.log('✅ User ID from URL params:', this.userId);
                    return this.userId;
                }
            } catch (e) {
                console.warn('⚠️ Error parsing URL user param:', e);
            }
        }
        
        console.warn('❌ No user ID found');
        return null;
    }

    // 🎯 GET DATABASE SESSION - FIXED
    async getDatabaseSession() {
        try {
            console.log('🔍 Checking database session...');
            
            // Get any existing session token from localStorage
            const storedToken = localStorage.getItem('nemex_wallet_session');
            if (storedToken) {
                this.sessionToken = storedToken;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/session/check`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Session-Token': this.sessionToken || ''
                },
                body: JSON.stringify({ sessionToken: this.sessionToken })
            });

            const result = await response.json();
            console.log('📦 Session check result:', result);

            if (result.success && result.hasSession && result.session) {
                this.sessionToken = result.session.token;
                this.userId = result.session.user_id;
                
                // Store token for next time
                localStorage.setItem('nemex_wallet_session', this.sessionToken);
                
                // Create wallet object from session data
                this.currentWallet = {
                    id: `session_${Date.now()}`,
                    address: result.session.wallet_address || result.session.wallet?.address,
                    format: 'UQ',
                    createdAt: result.session.wallet?.createdAt || new Date().toISOString(),
                    source: 'database_session'
                };
                
                this.isInitialized = true;
                console.log('✅ Database session found');
                return result.session;
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Database session check failed:', error.message);
            return null;
        }
    }

    // 🎯 CREATE DATABASE SESSION - FIXED
    async createDatabaseSession(walletData) {
        try {
            console.log('📝 Creating database session...');
            
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('No user ID for session creation');
            }
            
            const response = await fetch(`${this.apiBaseUrl}/session/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletId: walletData.id || 0,
                    walletAddress: walletData.address
                })
            });

            const result = await response.json();
            console.log('📦 Create session result:', result);

            if (result.success && result.session) {
                this.sessionToken = result.session.token;
                localStorage.setItem('nemex_wallet_session', this.sessionToken);
                console.log('✅ Database session created');
                return result.session;
            }

            console.warn('❌ Create session failed:', result.error);
            return null;
        } catch (error) {
            console.error('❌ Create session failed:', error);
            return null;
        }
    }

    // 🎯 DESTROY DATABASE SESSION
    async destroyDatabaseSession() {
        if (!this.sessionToken) return;

        try {
            await fetch(`${this.apiBaseUrl}/session/destroy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.sessionToken })
            });

            console.log('✅ Database session destroyed');
        } catch (error) {
            console.warn('⚠️ Destroy session failed:', error);
        }

        // Clear local storage
        localStorage.removeItem('nemex_wallet_session');
        this.sessionToken = null;
        this.currentWallet = null;
        this.isInitialized = false;
    }

    // 🎯 CHECK IF WALLET EXISTS - FIXED WITH FALLBACK
    async checkWalletExists() {
        const userId = this.getCurrentUserId();
        if (!userId) {
            return { 
                success: false, 
                requiresLogin: true,
                error: 'Please login to your mining account first'
            };
        }

        try {
            console.log('🔍 Checking if wallet exists for user:', userId);
            
            // Try new endpoint first
            const response = await fetch(`${this.apiBaseUrl}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });

            const result = await response.json();
            
            // If endpoint not found, try legacy endpoint
            if (response.status === 404) {
                console.log('🔄 Trying legacy check-wallet endpoint...');
                return await this.legacyCheckWallet(userId);
            }
            
            return result;
        } catch (error) {
            console.warn('⚠️ Check wallet failed:', error.message);
            return { 
                success: false, 
                error: 'Failed to check wallet: ' + error.message
            };
        }
    }

    // 🎯 LEGACY CHECK FOR COMPATIBILITY
    async legacyCheckWallet(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/check-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });
            
            return await response.json();
        } catch (error) {
            console.warn('⚠️ Legacy check also failed:', error.message);
            return {
                success: true,
                hasWallet: false,
                message: 'Wallet check service unavailable'
            };
        }
    }

    // 🎯 CREATE WALLET WITH DATABASE SESSION - FIXED
    async createWallet(walletPassword) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            return { 
                success: false, 
                error: 'Please login to your mining account first' 
            };
        }

        if (!walletPassword || walletPassword.length < 8) {
            return { 
                success: false, 
                error: 'Wallet password must be at least 8 characters' 
            };
        }

        try {
            console.log('🎯 Creating wallet for user:', userId);
            
            // 1. Create wallet
            const createResponse = await fetch(`${this.apiBaseUrl}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });

            const result = await createResponse.json();
            console.log('📦 Create wallet result:', result);

            if (!result.success) {
                // Try legacy endpoint
                console.log('🔄 Trying legacy store-encrypted endpoint...');
                return await this.legacyCreateWallet(userId, walletPassword);
            }

            // 2. Create database session
            const session = await this.createDatabaseSession(result.wallet);

            if (session) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;

                console.log('✅ Wallet created with database session');
                this.triggerWalletLoaded();
            }

            return result;

        } catch (error) {
            console.error('❌ Create wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to create wallet: ' + error.message 
            };
        }
    }

    // 🎯 LEGACY CREATE WALLET FOR COMPATIBILITY
    async legacyCreateWallet(userId, walletPassword) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/store-encrypted`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Create session with legacy data
                await this.createDatabaseSession(result.wallet);
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                this.triggerWalletLoaded();
            }
            
            return result;
        } catch (error) {
            console.error('❌ Legacy create wallet failed:', error);
            return {
                success: false,
                error: 'Wallet creation failed'
            };
        }
    }

    // 🎯 LOGIN TO WALLET WITH DATABASE SESSION - FIXED
    async loginToWallet(walletPassword) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            return { 
                success: false, 
                error: 'Please login to your mining account first' 
            };
        }

        if (!walletPassword) {
            return { 
                success: false, 
                error: 'Wallet password required' 
            };
        }

        try {
            console.log('🔐 Logging into wallet for user:', userId);
            
            // 1. Verify wallet password
            const loginResponse = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });

            const result = await loginResponse.json();
            console.log('📦 Login result:', result);

            if (!result.success) {
                // Try auto-login as fallback
                console.log('🔄 Trying auto-login as fallback...');
                return await this.tryAutoLogin(userId);
            }

            // 2. Create database session
            const session = await this.createDatabaseSession(result.wallet);

            if (session) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;

                console.log('✅ Wallet login with database session');
                this.triggerWalletLoaded();
            }

            return result;

        } catch (error) {
            console.error('❌ Wallet login failed:', error);
            return { 
                success: false, 
                error: 'Login failed: ' + error.message 
            };
        }
    }

    // 🎯 AUTO-LOGIN FALLBACK
    async tryAutoLogin(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auto-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });
            
            const result = await response.json();
            
            if (result.success && result.hasWallet) {
                // Create session
                await this.createDatabaseSession(result.wallet);
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                this.triggerWalletLoaded();
            }
            
            return result;
        } catch (error) {
            return {
                success: false,
                error: 'Auto-login failed'
            };
        }
    }

    // 🎯 INITIALIZE WITH DATABASE SESSION - FIXED
    async initialize() {
        console.log('🔄 Initializing wallet system...');
        
        try {
            // 1. Check for existing database session
            const session = await this.getDatabaseSession();
            
            if (session) {
                console.log('✅ Wallet loaded from database session');
                this.triggerWalletLoaded();
                
                return {
                    success: true,
                    hasWallet: true,
                    hasSession: true,
                    wallet: this.currentWallet
                };
            }
            
            // 2. No session, check if wallet exists
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.log('❌ No user ID - requires login');
                return {
                    success: false,
                    requiresLogin: true,
                    message: 'Please login to your mining account'
                };
            }
            
            this.userId = userId;
            
            const checkResult = await this.checkWalletExists();
            console.log('📋 Wallet check result:', checkResult);
            
            if (checkResult.success && checkResult.hasWallet) {
                // Wallet exists but no session - show login
                console.log('🔐 Wallet exists, showing password prompt');
                return {
                    success: true,
                    hasWallet: true,
                    wallet: checkResult.wallet,
                    showPasswordPrompt: true
                };
            } else if (checkResult.success && !checkResult.hasWallet) {
                // No wallet - show create form
                console.log('📭 No wallet found, showing create form');
                return {
                    success: true,
                    hasWallet: false,
                    showCreateForm: true
                };
            } else {
                // Error occurred
                console.error('❌ Wallet check failed:', checkResult.error);
                return checkResult;
            }
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            return {
                success: false,
                error: 'Wallet initialization failed: ' + error.message
            };
        }
    }

    // 🎯 LOGOUT (DESTROY DATABASE SESSION)
    async logout() {
        await this.destroyDatabaseSession();
        console.log('✅ Wallet logged out');
        
        window.dispatchEvent(new CustomEvent('wallet-logged-out'));
    }

    // 🎯 TRIGGER WALLET LOADED EVENT
    triggerWalletLoaded() {
        console.log('🎯 Triggering wallet loaded event');
        
        const event = new CustomEvent('wallet-loaded', {
            detail: {
                wallet: this.currentWallet,
                userId: this.userId,
                hasWallet: true,
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(event);
        
        if (typeof window.onWalletLoaded === 'function') {
            window.onWalletLoaded(this.currentWallet, this.userId);
        }
    }

    // 🎯 HELPER METHODS
    hasWallet() {
        return !!this.currentWallet;
    }
    
    getAddress() {
        return this.currentWallet?.address || null;
    }
    
    getShortAddress() {
        const address = this.getAddress();
        if (!address) return '';
        if (address.length <= 16) return address;
        return address.substring(0, 8) + '...' + address.substring(address.length - 8);
    }
}

// 🚀 INITIALIZE GLOBAL INSTANCE
window.walletManager = new WalletManager();

// 🎯 GLOBAL HELPER FUNCTIONS
window.getCurrentUserId = function() {
    return window.walletManager.getCurrentUserId();
};

window.showCreateWalletModal = function() {
    console.log('🎯 showCreateWalletModal called');
    
    const userId = window.walletManager.getCurrentUserId();
    if (!userId) {
        console.error('❌ User not logged in');
        if (typeof window.showMessage === 'function') {
            window.showMessage('Please login to your mining account first', 'error');
        }
        return;
    }
    
    // Find and show modal
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.style.display = 'none');
    
    const createModal = document.getElementById('createWalletModal');
    if (createModal) {
        createModal.style.display = 'flex';
        console.log('✅ Create wallet modal opened');
    }
};

// 🎯 GLOBAL CALLBACK FOR WALLET CREATION
window.onWalletCreated = function(walletData) {
    console.log('🎯 Wallet created callback:', walletData);
    
    const createModal = document.getElementById('createWalletModal');
    if (createModal) {
        createModal.style.display = 'none';
    }
    
    if (typeof window.showMessage === 'function') {
        window.showMessage('✅ Wallet created successfully!', 'success');
    }
    
    setTimeout(() => {
        if (typeof window.initWallet === 'function') {
            window.initWallet();
        }
    }, 1000);
};

// 🎯 AUTO-INITIALIZE ON PAGE LOAD
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a wallet-related page
    const isWalletPage = window.location.pathname.includes('wallet.html') || 
                        window.location.pathname.includes('/wallet') ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');
    
    if (isWalletPage) {
        console.log('🎯 Auto-initializing wallet system v10.1...');
        
        // Listen for wallet loaded events
        window.addEventListener('wallet-loaded', function(event) {
            console.log('🎯 Wallet loaded event received:', event.detail);
            if (typeof window.initWallet === 'function') {
                setTimeout(() => window.initWallet(), 500);
            }
        });
        
        // Initialize after a short delay
        setTimeout(async () => {
            try {
                console.log('🔄 Starting wallet initialization...');
                const result = await window.walletManager.initialize();
                
                console.log('📊 Initialization result:', result);
                
                if (result.success) {
                    if (result.hasWallet && result.hasSession) {
                        console.log('✅ Wallet loaded from session');
                        if (typeof window.initWallet === 'function') {
                            setTimeout(() => window.initWallet(), 500);
                        }
                    } else if (result.showPasswordPrompt) {
                        console.log('🔐 Showing password prompt');
                        // Show password input modal
                        if (typeof window.showWalletLoginModal === 'function') {
                            window.showWalletLoginModal();
                        }
                    } else if (result.showCreateForm) {
                        console.log('📭 No wallet - showing create form');
                        // Show create wallet form
                        if (typeof window.showWelcomeScreen === 'function') {
                            window.showWelcomeScreen();
                        }
                    }
                } else if (result.requiresLogin) {
                    console.warn('⚠️ User needs to login');
                    if (typeof window.showMessage === 'function') {
                        window.showMessage('Please login to your mining account first', 'warning');
                    }
                }
            } catch (error) {
                console.error('❌ Initialization failed:', error);
            }
        }, 1500);
    }
});

// 🎯 WALLET LOGIN MODAL HELPER (if not defined elsewhere)
if (typeof window.showWalletLoginModal === 'undefined') {
    window.showWalletLoginModal = function() {
        console.log('🔐 showWalletLoginModal called');
        // You should implement this in your UI
        alert('Please implement showWalletLoginModal() in your UI manager');
    };
}

console.log('✅ NEMEX WALLET v10.1 READY - Fixed Database Sessions');