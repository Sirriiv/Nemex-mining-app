// assets/js/wallet.js - SEPARATE PASSWORD SYSTEM v9.0
console.log('🚀 NEMEX COIN WALLET MANAGER v9.0 - SEPARATE PASSWORD SYSTEM');

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
    
    // 🎯 CHECK IF USER HAS WALLET
    async checkWalletExists() {
        const userId = this.getCurrentUserId();
        if (!userId) {
            return {
                success: false,
                requiresLogin: true
            };
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/check`, {
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
    
    // 🎯 CREATE WALLET (with separate password)
    async createWallet(walletPassword) {
        console.log('🎯 Creating wallet...');
        
        const userId = this.getCurrentUserId();
        if (!userId) {
            return {
                success: false,
                error: 'Please login first'
            };
        }
        
        if (!walletPassword || walletPassword.length < 8) {
            return {
                success: false,
                error: 'Wallet password must be at least 8 characters'
            };
        }
        
        try {
            // Call backend to create wallet
            const response = await fetch(`${this.apiBaseUrl}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });
            
            const result = await response.json();
            
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
    
    // 🎯 LOGIN TO WALLET
    async loginToWallet(walletPassword) {
        console.log('🔐 Logging into wallet...');
        
        const userId = this.getCurrentUserId();
        if (!userId) {
            return {
                success: false,
                error: 'Please login first'
            };
        }
        
        if (!walletPassword) {
            return {
                success: false,
                error: 'Wallet password required'
            };
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/login`, {
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
    
    // 🎯 AUTO-INITIALIZE WALLET
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
        
        // Check if wallet exists
        const checkResult = await this.checkWalletExists();
        
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
    
    // 🎯 GET WALLET BALANCE
    async getBalance() {
        if (!this.currentWallet) {
            return {
                success: false,
                error: 'No wallet loaded'
            };
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/balance/${this.currentWallet.address}`);
            return await response.json();
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 🎯 GET PRICES
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

// 🎯 GLOBAL HELPER FUNCTIONS
window.showWalletLoginModal = function() {
    const modal = document.getElementById('walletLoginModal');
    if (modal) modal.style.display = 'flex';
};

window.showCreateWalletModal = function() {
    const modal = document.getElementById('createWalletModal');
    if (modal) modal.style.display = 'flex';
};

// 🎯 AUTO-INITIALIZE ON PAGE LOAD
document.addEventListener('DOMContentLoaded', function() {
    const isWalletPage = window.location.pathname.includes('wallet') || 
                        window.location.pathname === '/';
    
    if (isWalletPage) {
        console.log('🎯 Auto-initializing wallet...');
        
        setTimeout(async () => {
            const result = await window.walletManager.initialize();
            console.log('📊 Initialization result:', result);
            
            if (result.success) {
                if (result.showPasswordPrompt) {
                    // Show password input modal
                    window.showWalletLoginModal();
                } else if (result.showCreateForm) {
                    // Show create wallet form
                    window.showCreateWalletModal();
                } else if (result.requiresLogin) {
                    // User needs to login to website
                    if (typeof window.showMessage === 'function') {
                        window.showMessage('Please login to your mining account', 'warning');
                    }
                }
            }
        }, 1000);
    }
});

console.log('✅ NEMEX WALLET v9.0 READY - Separate Password System');