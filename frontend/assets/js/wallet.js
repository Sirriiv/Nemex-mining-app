// assets/js/wallet.js - PROPER DATABASE SESSION FLOW
console.log('🚀 NEMEX WALLET - PROPER DATABASE SESSION FLOW');

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

    // 🎯 CREATE WALLET - SIMPLE, NO SESSION
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

            // ✅ WALLET CREATED - STORE IN MEMORY ONLY
            if (result.wallet && result.wallet.address) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                
                console.log('✅ Wallet created successfully!');
                
                // ✅ SHOW SUCCESS AND CLOSE MODAL
                this.handleWalletCreationSuccess(buttonElement);
                
                return {
                    success: true,
                    wallet: result.wallet,
                    message: 'Wallet created successfully!'
                };
            } else {
                this.resetButton(buttonElement);
                return {
                    success: false,
                    error: 'Wallet creation succeeded but no wallet data returned'
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

    // 🎯 LOGIN TO WALLET - CREATE DATABASE SESSION
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

            // ✅ CREATE DATABASE SESSION AFTER SUCCESSFUL LOGIN
            let sessionToken = null;
            try {
                sessionToken = await this.createDatabaseSession(result.wallet);
                if (sessionToken) {
                    console.log('✅ Database session created and stored');
                } else {
                    console.warn('⚠️ Session creation returned no token');
                }
            } catch (sessionError) {
                console.warn('⚠️ Session creation failed:', sessionError);
                // Continue anyway - user is logged in memory
            }

            // Store wallet in memory
            if (result.wallet && result.wallet.address) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                
                console.log('✅ Wallet login successful!');
                
                // ✅ SHOW SUCCESS AND CLOSE MODAL
                this.handleWalletLoginSuccess(buttonElement);
                
                return {
                    success: true,
                    wallet: result.wallet,
                    sessionCreated: !!sessionToken
                };
            } else {
                this.resetButton(buttonElement);
                return {
                    success: false,
                    error: 'Login succeeded but no wallet data returned'
                };
            }

        } catch (error) {
            console.error('❌ Wallet login failed:', error);
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Login failed: ' + error.message 
            };
        }
    }

    // 🎯 CREATE DATABASE SESSION (Backend should create in database)
    async createDatabaseSession(walletData) {
        try {
            console.log('📝 Requesting database session creation...');
            
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('No user ID for session creation');
            }
            
            const response = await fetch(`${this.apiBaseUrl}/session/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    walletAddress: walletData.address,
                    action: 'login'
                })
            });

            console.log('📦 Session create response status:', response.status);
            
            if (!response.ok) {
                console.warn(`⚠️ Session create failed with status: ${response.status}`);
                const errorText = await response.text();
                console.warn('Error response:', errorText);
                return null;
            }

            const result = await response.json();
            console.log('📦 Create session result:', result);

            if (result.success && result.session && result.session.token) {
                this.sessionToken = result.session.token;
                // Store token in localStorage for future automatic login
                localStorage.setItem('nemex_wallet_session', this.sessionToken);
                console.log('✅ Database session token stored');
                return this.sessionToken;
            }

            console.warn('❌ Create session failed (no token in response):', result);
            return null;
        } catch (error) {
            console.error('❌ Create session failed (network error):', error.message);
            return null;
        }
    }

    // 🎯 CHECK DATABASE SESSION (Fetch from database)
    async checkDatabaseSession() {
        try {
            console.log('🔍 Checking database session...');
            
            // Get token from localStorage
            const storedToken = localStorage.getItem('nemex_wallet_session');
            if (!storedToken) {
                console.log('📭 No session token in localStorage');
                return null;
            }
            
            this.sessionToken = storedToken;
            
            // Ask backend to validate session from database
            const response = await fetch(`${this.apiBaseUrl}/session/check`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Session-Token': this.sessionToken
                },
                body: JSON.stringify({ 
                    sessionToken: this.sessionToken,
                    checkOnly: true
                })
            });

            const result = await response.json();
            console.log('📦 Session check result:', result);

            if (result.success && result.hasSession && result.session) {
                // ✅ Session is valid in database
                this.sessionToken = result.session.token;
                this.userId = result.session.user_id;
                
                // Get wallet data from session
                this.currentWallet = {
                    id: `session_${Date.now()}`,
                    address: result.session.wallet_address || result.session.wallet?.address,
                    format: 'UQ',
                    createdAt: result.session.wallet?.createdAt || new Date().toISOString(),
                    source: 'database_session'
                };
                
                this.isInitialized = true;
                console.log('✅ Valid database session found');
                return result.session;
            } else {
                // ❌ Session invalid or expired
                console.log('❌ Session invalid or expired, clearing token');
                localStorage.removeItem('nemex_wallet_session');
                this.sessionToken = null;
                return null;
            }

        } catch (error) {
            console.warn('⚠️ Database session check failed:', error.message);
            return null;
        }
    }

    // 🎯 INITIALIZE WALLET - PROPER FLOW
    async initialize() {
        console.log('🔄 Initializing wallet system...');
        
        try {
            // 1. FIRST: Check for valid database session
            const session = await this.checkDatabaseSession();
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
            
            // 2. NO SESSION: Check if wallet exists in database
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
                // Wallet exists but no session - user needs to login
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

    // 🎯 HANDLE WALLET CREATION SUCCESS
    handleWalletCreationSuccess(buttonElement) {
        console.log('🎯 Handling wallet creation success');
        
        // 1. Reset the button
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
        
        // 5. Trigger wallet loaded event
        this.triggerWalletLoaded();
        
        // 6. Call initWallet if it exists
        setTimeout(() => {
            if (typeof window.initWallet === 'function') {
                console.log('🔄 Calling initWallet()...');
                window.initWallet();
            }
        }, 1000);
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
        
        // 5. Trigger wallet loaded event
        this.triggerWalletLoaded();
        
        // 6. Call initWallet if it exists
        setTimeout(() => {
            if (typeof window.initWallet === 'function') {
                window.initWallet();
            }
        }, 1000);
    }

    // 🎯 RESET BUTTON STATE
    resetButton(buttonElement) {
        if (buttonElement) {
            const isCreateBtn = buttonElement.id === 'createWalletBtn';
            buttonElement.textContent = isCreateBtn ? 'Create Wallet' : 'Unlock Wallet';
            buttonElement.disabled = false;
            console.log('✅ Button reset to normal state');
        }
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
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                
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
    
    // 🎯 LOGOUT - CLEAR SESSION FROM DATABASE
    async logout() {
        if (this.sessionToken) {
            try {
                await fetch(`${this.apiBaseUrl}/session/destroy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: this.sessionToken })
                });
            } catch (error) {
                console.warn('⚠️ Session destroy failed:', error);
            }
        }
        
        // Clear localStorage
        localStorage.removeItem('nemex_wallet_session');
        
        // Reset state
        this.sessionToken = null;
        this.currentWallet = null;
        this.isInitialized = false;
        
        console.log('✅ Wallet logged out');
        
        // Reload page
        setTimeout(() => window.location.reload(), 500);
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
                        console.log('✅ Wallet loaded from database session');
                        if (typeof window.initWallet === 'function') {
                            setTimeout(() => window.initWallet(), 500);
                        }
                    } else if (result.showPasswordPrompt) {
                        console.log('🔐 Wallet exists, showing password prompt');
                        const loginModal = document.getElementById('walletLoginModal');
                        if (loginModal) {
                            loginModal.style.display = 'flex';
                        }
                    } else if (result.showCreateForm) {
                        console.log('📭 No wallet found, showing create form');
                        const createModal = document.getElementById('createWalletModal');
                        if (createModal) {
                            createModal.style.display = 'flex';
                        }
                    }
                } else if (result.requiresLogin) {
                    console.warn('⚠️ User needs to login to mining account');
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

console.log('✅ NEMEX WALLET READY - Proper database session flow');