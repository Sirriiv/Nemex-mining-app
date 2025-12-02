// assets/js/wallet.js - SIMPLIFIED FOR MINING SITE INTEGRATION
console.log('👛 Loading Nemex Wallet for Mining Site...');

class MiningWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null; // Will be set from mining session
        this.userEmail = null;
        this.isInitialized = false;
        
        console.log('✅ Wallet Manager for Mining Site initialized');
    }

    // =============================================
    // 🎯 INITIALIZATION (FOR MINING SITE)
    // =============================================

    async initialize() {
        if (this.isInitialized) {
            console.log('ℹ️ Wallet already initialized');
            return { success: true, wallet: this.currentWallet };
        }

        console.log('🚀 Initializing wallet for mining user...');

        try {
            // Get user from mining site integration
            if (!window.miningUser) {
                console.error('❌ No mining user found in window object');
                
                // Try to get from hidden input (added by wallet.html)
                const userIdInput = document.getElementById('miningUserId');
                if (userIdInput && userIdInput.value) {
                    this.userId = userIdInput.value;
                    console.log('✅ Got user from hidden input:', this.userId);
                } else {
                    // Try to get from sessionStorage
                    const sessionUser = sessionStorage.getItem('miningUser');
                    if (sessionUser) {
                        const user = JSON.parse(sessionUser);
                        this.userId = user.id;
                        this.userEmail = user.email;
                        console.log('✅ Got user from sessionStorage:', this.userId);
                    } else {
                        return {
                            success: false,
                            requiresLogin: true,
                            message: 'Please login to your mining account first',
                            redirectUrl: 'dashboard.html'
                        };
                    }
                }
            } else {
                this.userId = window.miningUser.id;
                this.userEmail = window.miningUser.email;
                console.log('✅ Got user from window.miningUser:', this.userId);
            }

            if (!this.userId) {
                console.error('❌ No user ID available');
                return {
                    success: false,
                    requiresLogin: true,
                    message: 'User authentication failed'
                };
            }

            console.log(`✅ Mining user authenticated: ${this.userId} (${this.userEmail || 'no email'})`);

            // Get wallet from database
            const result = await this.getUserWallet(this.userId);

            if (result.success && result.wallet) {
                this.currentWallet = result.wallet;
                this.isInitialized = true;
                console.log('✅ Wallet loaded:', {
                    address: result.wallet.address.substring(0, 12) + '...',
                    hasPrivateKey: !!result.wallet.encryptedPrivateKey
                });
                
                return {
                    success: true,
                    hasWallet: true,
                    wallet: result.wallet,
                    userId: this.userId,
                    userEmail: this.userEmail,
                    storageType: 'database'
                };
            } else if (result.success) {
                console.log('ℹ️ No wallet found for mining user');
                return {
                    success: true,
                    hasWallet: false,
                    message: 'Create your first wallet',
                    userId: this.userId,
                    userEmail: this.userEmail,
                    storageType: 'database'
                };
            } else {
                console.error('❌ Failed to fetch wallet:', result.error);
                return result;
            }

        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            return {
                success: false,
                error: 'Failed to load wallet: ' + error.message
            };
        }
    }

    // =============================================
    // 🎯 WALLET OPERATIONS
    // =============================================

    async getUserWallet(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/get-user-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId,
                    _cb: Date.now() // Cache buster
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Get wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to fetch wallet'
            };
        }
    }

    async createWallet(userId, userPassword, replaceExisting = false) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/create-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId,
                    userPassword: userPassword,
                    replaceExisting: replaceExisting,
                    _cb: Date.now()
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = result.wallet;
                this.isInitialized = true;
                console.log('✅ Wallet created');
            }

            return result;
        } catch (error) {
            console.error('❌ Create wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to create wallet'
            };
        }
    }

    async viewSeedPhrase(userId, userPassword) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/view-seed-phrase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId,
                    userPassword: userPassword,
                    _cb: Date.now()
                })
            });

            return await response.json();
        } catch (error) {
            console.error('❌ View seed phrase failed:', error);
            return { 
                success: false, 
                error: 'Failed to retrieve seed phrase'
            };
        }
    }

    async importWallet(userId, mnemonic, userPassword, replaceExisting = false) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/import-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId,
                    mnemonic: mnemonic,
                    userPassword: userPassword,
                    replaceExisting: replaceExisting,
                    _cb: Date.now()
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = result.wallet;
                this.isInitialized = true;
            }

            return result;
        } catch (error) {
            console.error('❌ Import wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to import wallet'
            };
        }
    }

    async deleteWallet(userId, confirm = true) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/delete-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId,
                    confirm: confirm,
                    _cb: Date.now()
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = null;
                this.isInitialized = false;
            }

            return result;
        } catch (error) {
            console.error('❌ Delete wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to delete wallet'
            };
        }
    }

    async getBalance(address) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/balance/${encodeURIComponent(address)}?_cb=${Date.now()}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get balance failed:', error);
            return { 
                success: false, 
                balance: 0 
            };
        }
    }

    async getPrices() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/prices?_cb=${Date.now()}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get prices failed:', error);
            return {
                success: true,
                prices: {
                    TON: { price: 2.35, change24h: 0 },
                    NMX: { price: 0.10, change24h: 0 }
                }
            };
        }
    }

    async sendTransaction(userId, toAddress, amount, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/send-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId,
                    toAddress: toAddress,
                    amount: amount,
                    password: password,
                    _cb: Date.now()
                })
            });

            return await response.json();
        } catch (error) {
            console.error('❌ Send transaction failed:', error);
            return { 
                success: false, 
                error: 'Failed to send transaction'
            };
        }
    }

    async getTransactionHistory(address) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/transactions/${encodeURIComponent(address)}?_cb=${Date.now()}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get transaction history failed:', error);
            return { 
                success: false, 
                transactions: []
            };
        }
    }

    // =============================================
    // 🎯 UTILITIES
    // =============================================

    hasWallet() {
        return !!this.currentWallet;
    }

    getCurrentWallet() {
        return this.currentWallet;
    }

    getAddress() {
        return this.currentWallet ? this.currentWallet.address : null;
    }

    getShortAddress() {
        const address = this.getAddress();
        if (!address) return '';
        if (address.length <= 16) return address;
        return address.substring(0, 8) + '...' + address.substring(address.length - 8);
    }

    validatePasswordStrength(password) {
        if (!password) return { valid: false, message: 'Password required' };
        if (password.length < 6) return { valid: false, message: 'Minimum 6 characters' };
        
        let strength = 'medium';
        if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
            strength = 'strong';
        }
        
        return { 
            valid: true, 
            message: strength === 'strong' ? 'Strong password' : 'Good password',
            strength: strength
        };
    }

    clearData() {
        this.currentWallet = null;
        this.userId = null;
        this.userEmail = null;
        this.isInitialized = false;
        console.log('🧹 Wallet data cleared');
    }

    getUserId() {
        return this.userId;
    }
}

// Create global instance
window.walletManager = new MiningWalletManager();
console.log('✅ Wallet Manager ready for mining site integration');

// Auto-initialize when DOM loads (for wallet.html)
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, checking for auto-initialization...');
    
    // Only auto-init if we're on wallet.html
    if (window.location.pathname.includes('wallet.html')) {
        console.log('🎯 Auto-initializing wallet for wallet.html...');
        
        // Small delay to ensure everything is loaded
        setTimeout(async () => {
            try {
                const result = await window.walletManager.initialize();
                console.log('🔧 Auto-initialization result:', result.success ? '✅ Success' : '❌ Failed');
                
                if (result.requiresLogin) {
                    console.warn('⚠️ User needs to login to mining site first');
                    // Optionally show a message or redirect
                }
            } catch (error) {
                console.error('❌ Auto-initialization error:', error);
            }
        }, 1000);
    }
});