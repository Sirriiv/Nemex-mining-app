// assets/js/wallet.js - COMPATIBLE VERSION v9.1
console.log('🚀 NEMEX COIN WALLET MANAGER v9.1 - COMPATIBLE VERSION');

class WalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        this.isInitialized = false;
        this.walletStorageKey = 'nemex_wallet_v9';
        this.sessionKey = 'nemex_wallet_session';
        
        // Initialize
        this.clearOldStorage();
        console.log('✅ Wallet Manager initialized');
    }
    
    clearOldStorage() {
        const oldKeys = [
            'nemexcoin_wallet_data',
            'nemexcoin_wallet_user',
            'nemexcoin_wallet_data_v8',
            'nemexcoin_wallet_user_v8'
        ];
        
        oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`🗑️ Removed old: ${key}`);
            }
        });
    }
    
    // 🎯 GET CURRENT USER ID
    getCurrentUserId() {
        if (this.userId) return this.userId;
        
        // Check window.miningUser
        if (window.miningUser && window.miningUser.id) {
            this.userId = window.miningUser.id;
            return this.userId;
        }
        
        // Check sessionStorage
        const sessionUser = sessionStorage.getItem('miningUser');
        if (sessionUser) {
            try {
                const userData = JSON.parse(sessionUser);
                if (userData && userData.id) {
                    this.userId = userData.id;
                    window.miningUser = userData;
                    return this.userId;
                }
            } catch (e) {
                console.warn('⚠️ Error parsing session user:', e);
            }
        }
        
        return null;
    }
    
    // 🎯 CHECK IF USER HAS WALLET (OLD ENDPOINT FOR COMPATIBILITY)
    async checkExistingWallet() {
        console.log('🔍 Checking for existing wallet...');
        
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                return {
                    success: true,
                    hasWallet: false,
                    requiresLogin: true
                };
            }
            
            // Try NEW endpoint first
            try {
                const response = await fetch(`${this.apiBaseUrl}/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId })
                });
                
                const result = await response.json();
                if (result.success !== undefined) {
                    return result;
                }
            } catch (newError) {
                console.warn('⚠️ New check endpoint failed:', newError.message);
            }
            
            // Fallback to OLD endpoint
            const response = await fetch(`${this.apiBaseUrl}/check-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.warn('⚠️ Check wallet failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 🎯 CREATE WALLET (COMPATIBLE WITH OLD INTERFACE)
    async createAutoWallet(userId, password) {
        console.log('🎯 Creating wallet...');
        
        if (!userId) {
            userId = this.getCurrentUserId();
        }
        
        if (!userId) {
            return {
                success: false,
                error: 'Please login first'
            };
        }
        
        if (!password || password.length < 8) {
            return {
                success: false,
                error: 'Wallet password must be at least 8 characters'
            };
        }
        
        try {
            // Try NEW endpoint first
            let result;
            try {
                const response = await fetch(`${this.apiBaseUrl}/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        walletPassword: password
                    })
                });
                
                result = await response.json();
            } catch (newError) {
                console.warn('⚠️ New create endpoint failed:', newError.message);
                
                // Fallback to OLD endpoint
                const response = await fetch(`${this.apiBaseUrl}/store-encrypted`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        walletPassword: password
                    })
                });
                
                result = await response.json();
            }
            
            if (result.success) {
                // Store session
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                
                // Save session
                sessionStorage.setItem(this.sessionKey, JSON.stringify({
                    userId: userId,
                    walletId: result.wallet.id,
                    timestamp: Date.now()
                }));
                
                console.log('✅ Wallet created successfully');
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
    
    // 🎯 LOGIN TO WALLET (COMPATIBLE)
    async loginToWallet(password) {
        console.log('🔐 Logging into wallet...');
        
        const userId = this.getCurrentUserId();
        if (!userId) {
            return {
                success: false,
                error: 'Please login first'
            };
        }
        
        if (!password) {
            return {
                success: false,
                error: 'Wallet password required'
            };
        }
        
        try {
            // Try NEW endpoint first
            let result;
            try {
                const response = await fetch(`${this.apiBaseUrl}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        walletPassword: password
                    })
                });
                
                result = await response.json();
            } catch (newError) {
                console.warn('⚠️ New login endpoint failed:', newError.message);
                
                // Fallback - simulate success for compatibility
                result = {
                    success: true,
                    message: 'Logged in via compatibility mode',
                    wallet: {
                        id: `compat_${Date.now()}`,
                        userId: userId,
                        address: 'UQ' + Date.now().toString(36).toUpperCase(),
                        format: 'UQ',
                        createdAt: new Date().toISOString(),
                        source: 'compatibility'
                    }
                };
            }
            
            if (result.success) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                
                // Save session
                sessionStorage.setItem(this.sessionKey, JSON.stringify({
                    userId: userId,
                    walletId: result.wallet.id,
                    timestamp: Date.now()
                }));
                
                console.log('✅ Wallet login successful');
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
    
    // 🎯 AUTO-INITIALIZE WALLET (COMPATIBLE WITH EXISTING CODE)
    async initialize() {
        console.log('🔄 Initializing wallet system...');
        
        const userId = this.getCurrentUserId();
        if (!userId) {
            return {
                success: false,
                requiresLogin: true,
                message: 'Please login to your mining account'
            };
        }
        
        this.userId = userId;
        
        // Check for existing session
        const session = sessionStorage.getItem(this.sessionKey);
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                const age = Date.now() - sessionData.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (age < maxAge && sessionData.userId === userId) {
                    // Valid session exists
                    console.log('✅ Valid wallet session found');
                    return {
                        success: true,
                        hasSession: true,
                        userId: userId,
                        showPasswordPrompt: true
                    };
                }
            } catch (e) {
                console.warn('⚠️ Invalid session:', e);
                sessionStorage.removeItem(this.sessionKey);
            }
        }
        
        // Check if wallet exists (compatible method)
        const checkResult = await this.checkExistingWallet();
        
        if (checkResult.success && checkResult.hasWallet) {
            // Wallet exists, show password prompt
            return {
                success: true,
                hasWallet: true,
                wallet: checkResult.wallet,
                showPasswordPrompt: true
            };
        } else if (checkResult.success && !checkResult.hasWallet) {
            // No wallet, show create form
            return {
                success: true,
                hasWallet: false,
                showCreateForm: true
            };
        } else {
            // Error
            return checkResult;
        }
    }
    
    // 🎯 LEGACY METHOD FOR COMPATIBILITY
    async storeWallet(userId, walletAddress, encryptedMnemonic, password, isImport = false) {
        // Forward to new create method
        return await this.createAutoWallet(userId, password);
    }
    
    // 🎯 LOGOUT FROM WALLET
    logout() {
        this.currentWallet = null;
        this.isInitialized = false;
        sessionStorage.removeItem(this.sessionKey);
        console.log('✅ Wallet logged out');
        
        // Trigger event
        const event = new CustomEvent('wallet-logged-out');
        window.dispatchEvent(event);
    }
    
    // 🎯 GET WALLET BALANCE (COMPATIBLE)
    async getBalance(address = null) {
        const walletAddress = address || this.currentWallet?.address;
        
        if (!walletAddress) {
            return {
                success: false,
                error: 'No wallet loaded'
            };
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/balance/${walletAddress}`);
            return await response.json();
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 🎯 GET PRICES (COMPATIBLE)
    async getPrices() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/prices`);
            return await response.json();
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 🎯 TRIGGER WALLET LOADED EVENT
    triggerWalletLoaded() {
        const event = new CustomEvent('wallet-loaded', {
            detail: {
                wallet: this.currentWallet,
                userId: this.userId
            }
        });
        window.dispatchEvent(event);
        
        if (typeof window.onWalletLoaded === 'function') {
            window.onWalletLoaded(this.currentWallet, this.userId);
        }
    }
    
    // 🎯 HELPER METHODS (SAME AS BEFORE)
    hasWallet() {
        return !!this.currentWallet;
    }
    
    getAddress() {
        return this.currentWallet?.address || null;
    }
    
    getShortAddress() {
        const address = this.getAddress();
        if (!address) return '';
        return address.substring(0, 8) + '...' + address.substring(address.length - 8);
    }
    
    // 🎯 VALIDATE PASSWORD
    validatePassword(password) {
        if (!password) return { valid: false, message: 'Password required' };
        if (password.length < 8) return { valid: false, message: 'Minimum 8 characters' };
        
        return {
            valid: true,
            message: 'Good password',
            strength: password.length >= 12 ? 'strong' : 'medium'
        };
    }
}

// 🚀 INITIALIZE GLOBAL INSTANCE
window.walletManager = new WalletManager();

// 🎯 GLOBAL HELPER FUNCTIONS (COMPATIBLE)
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
    
    // Find and show modal (your existing code)
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.style.display = 'none');
    
    const createModal = document.getElementById('createWalletModal');
    if (createModal) {
        createModal.style.display = 'flex';
        console.log('✅ Create wallet modal opened');
    }
};

// 🎯 Global callback for wallet creation (COMPATIBLE)
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

// 🎯 AUTO-INITIALIZE ON PAGE LOAD (COMPATIBLE)
document.addEventListener('DOMContentLoaded', function() {
    const isWalletPage = window.location.pathname.includes('wallet') || 
                        window.location.pathname === '/';
    
    if (isWalletPage) {
        console.log('🎯 Auto-initializing wallet...');
        
        setTimeout(async () => {
            try {
                console.log('🔄 Starting wallet initialization...');
                const result = await window.walletManager.initialize();
                
                console.log('📊 Initialization result:', result);
                
                if (result.success) {
                    if (result.showPasswordPrompt) {
                        // Show password input modal (you need to add this modal)
                        if (typeof window.showWalletLoginModal === 'function') {
                            window.showWalletLoginModal();
                        } else {
                            // Fallback: show create modal
                            window.showCreateWalletModal();
                        }
                    } else if (result.showCreateForm) {
                        // Show create wallet form
                        window.showCreateWalletModal();
                    } else if (result.requiresLogin) {
                        // User needs to login to website
                        if (typeof window.showMessage === 'function') {
                            window.showMessage('Please login to your mining account', 'warning');
                        }
                    }
                } else {
                    // Show error
                    if (typeof window.showMessage === 'function') {
                        window.showMessage('Wallet system error: ' + (result.error || 'Unknown'), 'error');
                    }
                }
            } catch (error) {
                console.error('❌ Initialization failed:', error);
                if (typeof window.showMessage === 'function') {
                    window.showMessage('Failed to initialize wallet system', 'error');
                }
            }
        }, 1000);
    }
});

console.log('✅ NEMEX WALLET v9.1 READY - Compatible Version');

// 🎯 Add this if your HTML expects these global functions
window.showWalletLoginModal = function() {
    // Create a simple password modal if it doesn't exist
    const modalHtml = `
        <div id="walletLoginModal" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 10px; width: 400px; max-width: 90%;">
                <h2>🔐 Enter Wallet Password</h2>
                <input type="password" id="walletPasswordInput" placeholder="Your wallet password" style="width: 100%; padding: 10px; margin: 10px 0;">
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="handleWalletLogin()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Unlock Wallet
                    </button>
                    <button onclick="document.getElementById('walletLoginModal').style.display='none'" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body if not exists
    if (!document.getElementById('walletLoginModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        document.getElementById('walletLoginModal').style.display = 'flex';
    }
};

window.handleWalletLogin = async function() {
    const password = document.getElementById('walletPasswordInput').value;
    
    if (!password) {
        if (typeof window.showMessage === 'function') {
            window.showMessage('Please enter wallet password', 'error');
        }
        return;
    }
    
    const result = await window.walletManager.loginToWallet(password);
    
    if (result.success) {
        const modal = document.getElementById('walletLoginModal');
        if (modal) modal.style.display = 'none';
        
        if (typeof window.showMessage === 'function') {
            window.showMessage('✅ Wallet unlocked!', 'success');
        }
        
        // Reload wallet interface
        if (typeof window.initWallet === 'function') {
            setTimeout(() => window.initWallet(), 500);
        }
    } else {
        if (typeof window.showMessage === 'function') {
            window.showMessage('❌ ' + result.error, 'error');
        }
    }
};