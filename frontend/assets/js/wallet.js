// assets/js/wallet.js - FIXED WITH PROPER BUTTON RESET
console.log('🚀 NEMEX WALLET v10.4 - BUTTON RESET FIX');

class WalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        this.sessionToken = null;
        this.isInitialized = false;
        this.passwordMinLength = 6;

        console.log('✅ Wallet Manager initialized');
    }

    // 🎯 GET CURRENT USER ID
    getCurrentUserId() {
        if (this.userId) return this.userId;
        
        if (window.miningUser && window.miningUser.id) {
            this.userId = window.miningUser.id;
            console.log('✅ User ID from window.miningUser:', this.userId);
            return this.userId;
        }
        
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
        
        console.warn('❌ No user ID found');
        return null;
    }

    // 🎯 CHECK IF WALLET EXISTS
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
            
            const response = await fetch(`${this.apiBaseUrl}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });

            return await response.json();
        } catch (error) {
            console.warn('⚠️ Check wallet failed:', error.message);
            return { 
                success: false, 
                error: 'Failed to check wallet: ' + error.message
            };
        }
    }

    // 🎯 CREATE WALLET - WITH PROPER BUTTON RESET
    async createWallet(walletPassword, buttonElement = null) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Please login to your mining account first' 
            };
        }

        if (!walletPassword || walletPassword.length < this.passwordMinLength) {
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: `Wallet password must be at least ${this.passwordMinLength} characters` 
            };
        }

        try {
            console.log('🎯 Creating wallet for user:', userId);
            
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
                console.log('🔄 Trying legacy endpoint...');
                return await this.legacyCreateWallet(userId, walletPassword, buttonElement);
            }

            // Create session
            const session = await this.createDatabaseSession(result.wallet);

            if (session) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;

                console.log('✅ Wallet created with database session');
                
                // ✅ DIRECT UI UPDATE - Don't rely on callbacks
                this.handleWalletCreationSuccess(buttonElement);
                
                return result;
            } else {
                this.resetButton(buttonElement);
                return {
                    success: false,
                    error: 'Failed to create session'
                };
            }

        } catch (error) {
            console.error('❌ Create wallet failed:', error);
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Failed to create wallet: ' + error.message 
            };
        }
    }

    // 🎯 HANDLE WALLET CREATION SUCCESS (DIRECT UI UPDATE)
    handleWalletCreationSuccess(buttonElement) {
        console.log('🎯 Handling wallet creation success');
        
        // 1. Reset the button immediately
        this.resetButton(buttonElement);
        
        // 2. Close the create modal
        const createModal = document.getElementById('createWalletModal');
        if (createModal) {
            createModal.style.display = 'none';
            console.log('✅ Create modal closed');
        }
        
        // 3. Clear password fields
        const passwordInputs = document.querySelectorAll('#createWalletModal input[type="password"]');
        passwordInputs.forEach(input => input.value = '');
        
        // 4. Show success message
        if (typeof window.showToast === 'function') {
            window.showToast('✅ Wallet created successfully!', 'success');
        } else if (typeof window.showMessage === 'function') {
            window.showMessage('✅ Wallet created successfully!', 'success');
        } else {
            alert('✅ Wallet created successfully!');
        }
        
        // 5. Trigger wallet reload
        setTimeout(() => {
            if (typeof window.initWallet === 'function') {
                console.log('🔄 Calling initWallet()...');
                window.initWallet();
            } else {
                console.log('🔄 Reloading page...');
                window.location.reload();
            }
        }, 1500);
    }

    // 🎯 RESET BUTTON STATE
    resetButton(buttonElement) {
        if (buttonElement) {
            buttonElement.textContent = 'Create Wallet';
            buttonElement.disabled = false;
            console.log('✅ Button reset to normal state');
        }
    }

    // 🎯 CREATE DATABASE SESSION
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

    // 🎯 GET DATABASE SESSION
    async getDatabaseSession() {
        try {
            console.log('🔍 Checking database session...');
            
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
                
                localStorage.setItem('nemex_wallet_session', this.sessionToken);
                
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

    // 🎯 LOGIN TO WALLET
    async loginToWallet(walletPassword, buttonElement = null) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Please login to your mining account first' 
            };
        }

        if (!walletPassword || walletPassword.length < this.passwordMinLength) {
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: `Wallet password must be at least ${this.passwordMinLength} characters` 
            };
        }

        try {
            console.log('🔐 Logging into wallet for user:', userId);
            
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
                this.resetButton(buttonElement);
                return { 
                    success: false, 
                    error: result.error || 'Invalid wallet password' 
                };
            }

            // Create session
            const session = await this.createDatabaseSession(result.wallet);

            if (session) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;

                console.log('✅ Wallet login with database session');
                
                // ✅ DIRECT UI UPDATE
                this.handleWalletLoginSuccess(buttonElement);
            }

            return result;

        } catch (error) {
            console.error('❌ Wallet login failed:', error);
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Login failed: ' + error.message 
            };
        }
    }

    // 🎯 HANDLE WALLET LOGIN SUCCESS
    handleWalletLoginSuccess(buttonElement) {
        console.log('🎯 Handling wallet login success');
        
        // 1. Reset the button
        this.resetButton(buttonElement);
        
        // 2. Close the login modal
        const loginModal = document.getElementById('walletLoginModal');
        if (loginModal) {
            loginModal.style.display = 'none';
            console.log('✅ Login modal closed');
        }
        
        // 3. Clear password field
        const passwordInput = document.getElementById('walletPasswordLogin');
        if (passwordInput) passwordInput.value = '';
        
        // 4. Show success message
        if (typeof window.showToast === 'function') {
            window.showToast('✅ Wallet login successful!', 'success');
        }
        
        // 5. Trigger wallet reload
        setTimeout(() => {
            if (typeof window.initWallet === 'function') {
                window.initWallet();
            } else {
                window.location.reload();
            }
        }, 1000);
    }

    // 🎯 LEGACY CREATE WALLET
    async legacyCreateWallet(userId, walletPassword, buttonElement = null) {
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
                // Create session
                await this.createDatabaseSession(result.wallet);
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                
                // ✅ DIRECT UI UPDATE
                this.handleWalletCreationSuccess(buttonElement);
            } else {
                this.resetButton(buttonElement);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Legacy create wallet failed:', error);
            this.resetButton(buttonElement);
            return {
                success: false,
                error: 'Wallet creation failed'
            };
        }
    }

    // 🎯 INITIALIZE WALLET
    async initialize() {
        console.log('🔄 Initializing wallet system...');
        
        try {
            // Check for existing session
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
            
            // No session, check if wallet exists
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
                // Wallet exists but no session
                console.log('🔐 Wallet exists, showing password prompt');
                return {
                    success: true,
                    hasWallet: true,
                    wallet: checkResult.wallet,
                    showPasswordPrompt: true
                };
            } else if (checkResult.success && !checkResult.hasWallet) {
                // No wallet
                console.log('📭 No wallet found, showing create form');
                return {
                    success: true,
                    hasWallet: false,
                    showCreateForm: true
                };
            } else {
                // Error
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

// 🎯 GLOBAL HELPER FOR BUTTON CLICKS
window.createWalletFromButton = async function(button) {
    console.log('🎯 Create wallet button clicked');
    
    const password = document.getElementById('walletPassword')?.value;
    const confirmPassword = document.getElementById('confirmWalletPassword')?.value;
    const statusElement = document.getElementById('createWalletStatus');
    
    // Validate
    if (!password || !confirmPassword) {
        showStatusMessage('Please enter and confirm password', 'error', statusElement);
        return;
    }

    if (password.length < 6) {
        showStatusMessage('Password must be at least 6 characters', 'error', statusElement);
        return;
    }

    if (password !== confirmPassword) {
        showStatusMessage('Passwords do not match', 'error', statusElement);
        return;
    }
    
    // Set button to loading state
    button.textContent = 'Creating...';
    button.disabled = true;
    
    // Clear previous status
    if (statusElement) {
        statusElement.innerHTML = '';
    }
    
    // Create wallet
    const result = await window.walletManager.createWallet(password, button);
    
    // Handle errors
    if (!result.success) {
        showStatusMessage(`❌ Error: ${result.error}`, 'error', statusElement);
        button.textContent = 'Create Wallet';
        button.disabled = false;
    }
    // Success is handled by handleWalletCreationSuccess()
};

// 🎯 GLOBAL HELPER FOR LOGIN BUTTON
window.loginWalletFromButton = async function(button) {
    console.log('🎯 Login wallet button clicked');
    
    const password = document.getElementById('walletPasswordLogin')?.value;
    const statusElement = document.getElementById('walletLoginStatus');
    
    // Validate
    if (!password) {
        showStatusMessage('Please enter wallet password', 'error', statusElement);
        return;
    }

    if (password.length < 6) {
        showStatusMessage('Password must be at least 6 characters', 'error', statusElement);
        return;
    }
    
    // Set button to loading state
    button.textContent = 'Unlocking...';
    button.disabled = true;
    
    // Clear previous status
    if (statusElement) {
        statusElement.innerHTML = '';
    }
    
    // Login to wallet
    const result = await window.walletManager.loginToWallet(password, button);
    
    // Handle errors
    if (!result.success) {
        showStatusMessage(`❌ Error: ${result.error}`, 'error', statusElement);
        button.textContent = 'Unlock Wallet';
        button.disabled = false;
    }
    // Success is handled by handleWalletLoginSuccess()
};

// 🎯 SHOW STATUS MESSAGE FUNCTION
function showStatusMessage(message, type = 'info', element) {
    if (!element) return;
    
    const colors = {
        loading: '#007bff',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    const icon = {
        loading: '🔄',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    element.innerHTML = `
        <div style="color: ${colors[type] || colors.info}; padding: 10px; border-radius: 5px; background: ${colors[type]}10; margin: 10px 0;">
            ${icon[type] || ''} ${message}
        </div>
    `;
}

// 🎯 AUTO-INITIALIZE ON PAGE LOAD
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM Content Loaded - Setting up wallet system');
    
    // Check if we're on a wallet-related page
    const isWalletPage = window.location.pathname.includes('wallet.html') || 
                        window.location.pathname.includes('/wallet') ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');
    
    if (isWalletPage) {
        console.log('🎯 Auto-initializing wallet system...');
        
        // Listen for wallet loaded events
        window.addEventListener('wallet-loaded', function(event) {
            console.log('🎯 Wallet loaded event received:', event.detail);
            if (typeof window.initWallet === 'function') {
                console.log('🔄 Calling initWallet() from wallet-loaded event');
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
                        // Show login modal
                        const loginModal = document.getElementById('walletLoginModal');
                        if (loginModal) {
                            loginModal.style.display = 'flex';
                        }
                    } else if (result.showCreateForm) {
                        console.log('📭 No wallet - showing create form');
                        // Show create modal
                        const createModal = document.getElementById('createWalletModal');
                        if (createModal) {
                            createModal.style.display = 'flex';
                        }
                    }
                } else if (result.requiresLogin) {
                    console.warn('⚠️ User needs to login');
                    // Show welcome screen with login message
                    const welcomeScreen = document.getElementById('welcomeScreen');
                    if (welcomeScreen) {
                        welcomeScreen.innerHTML = `
                            <div class="welcome-title">🔒 Please Log In</div>
                            <div class="welcome-subtitle">
                                You need to be logged into your Nemex account to access the wallet.
                            </div>
                            <div class="welcome-actions">
                                <button class="welcome-btn primary" onclick="window.location.href='dashboard.html'">
                                    Go to Mining Dashboard
                                </button>
                            </div>
                        `;
                        welcomeScreen.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('❌ Initialization failed:', error);
            }
        }, 1000);
    }
});

console.log('✅ NEMEX WALLET READY - Fixed button reset issue');