// wallet.js - SIMPLIFIED INTEGRATED WALLET
console.log('🔄 Loading Integrated Wallet System...');

class IntegratedWalletManager {
    constructor() {
        this.currentUserId = null;
        this.currentWallet = null;
        this.apiBaseUrl = '/api/wallet';
        console.log('✅ Integrated Wallet Manager initialized');
    }

    // Set current user from your website's session
    setCurrentUser(userId) {
        console.log('👤 Setting current user:', userId);
        this.currentUserId = userId;
    }

    async initialize() {
        console.log('🚀 Initializing Integrated Wallet...');
        
        try {
            if (!this.currentUserId) {
                console.log('ℹ️ No user ID set - user needs to be logged in');
                return {
                    success: false,
                    requiresLogin: true
                };
            }

            // Check if user exists
            const userCheck = await this.checkUser(this.currentUserId);
            if (!userCheck.success) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            // Get user's wallet
            const walletResult = await this.getUserWallet(this.currentUserId);
            
            return {
                success: true,
                hasWallet: !!walletResult.wallet,
                wallet: walletResult.wallet
            };

        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkUser(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/check-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId })
            });

            return await response.json();
        } catch (error) {
            console.error('❌ User check failed:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserWallet(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/get-user-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId })
            });

            return await response.json();
        } catch (error) {
            console.error('❌ Get wallet failed:', error);
            return { success: false, error: error.message };
        }
    }

    async createWallet() {
        if (!this.currentUserId) {
            throw new Error('User must be logged in');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/create-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: this.currentUserId })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentWallet = result.wallet;
            }
            
            return result;

        } catch (error) {
            console.error('❌ Create wallet failed:', error);
            return { success: false, error: error.message };
        }
    }

    async importWallet(mnemonic) {
        if (!this.currentUserId) {
            throw new Error('User must be logged in');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/import-wallet`, {
                method: POST,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUserId,
                    mnemonic: mnemonic
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentWallet = result.wallet;
            }
            
            return result;

        } catch (error) {
            console.error('❌ Import wallet failed:', error);
            return { success: false, error: error.message };
        }
    }

    async getBalance(address) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/balance/${address}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Balance check failed:', error);
            return { success: false, balance: 0, error: error.message };
        }
    }

    async sendTON(toAddress, amount, memo = '') {
        if (!this.currentUserId || !this.currentWallet) {
            throw new Error('User must have a wallet');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/send-ton`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUserId,
                    fromAddress: this.currentWallet.address,
                    toAddress: toAddress,
                    amount: amount,
                    memo: memo
                })
            });

            return await response.json();
        } catch (error) {
            console.error('❌ Send transaction failed:', error);
            return { success: false, error: error.message };
        }
    }

    async getPrices() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/prices`);
            return await response.json();
        } catch (error) {
            console.error('❌ Price fetch failed:', error);
            return {
                success: false,
                prices: {
                    TON: { price: 2.5, change24h: 0 },
                    NMX: { price: 0.10, change24h: 0 }
                }
            };
        }
    }

    async hasWallet() {
        return !!this.currentWallet;
    }

    async getCurrentWallet() {
        return this.currentWallet;
    }
}

// Initialize global instance
console.log('🔧 Creating Integrated Wallet Manager...');
window.walletManager = new IntegratedWalletManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegratedWalletManager;
}

console.log('✅ Integrated Wallet Manager loaded - Simple Version');