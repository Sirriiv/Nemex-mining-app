// wallet.js - INTEGRATED WALLET MANAGER FOR NEMEX WEBSITE
console.log('🔄 Loading Nemex Integrated Wallet System...');

class NemexWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        console.log('✅ Nemex Wallet Manager initialized');
    }

    // Set user ID from website session
    setCurrentUser(userId) {
        console.log('👤 Setting current user:', userId);
        this.userId = userId;
    }

    // Initialize wallet for current user
    async initialize() {
        console.log('🚀 Initializing wallet for user:', this.userId);
        
        if (!this.userId) {
            console.log('⚠️ No user ID set - user might not be logged in');
            return {
                success: false,
                requiresLogin: true
            };
        }

        try {
            // Get user's wallet
            const result = await this.getUserWallet(this.userId);
            
            if (result.success && result.wallet) {
                this.currentWallet = result.wallet;
                console.log('✅ Wallet loaded:', result.wallet.address);
                return {
                    success: true,
                    hasWallet: true,
                    wallet: result.wallet
                };
            } else {
                console.log('ℹ️ No wallet found for user');
                return {
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found'
                };
            }
        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            return {
                success: false,
                error: 'Failed to load wallet'
            };
        }
    }

    // Check if user exists in database
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

    // Get user's wallet from database
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

    // Create wallet for current user
    async createWallet() {
        if (!this.userId) {
            throw new Error('User must be logged in');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/create-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: this.userId })
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

    // Import wallet with seed phrase
    async importWallet(mnemonic) {
        if (!this.userId) {
            throw new Error('User must be logged in');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
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

    // Get balance for address
    async getBalance(address) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/balance/${address}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Balance check failed:', error);
            return { success: false, balance: 0, error: error.message };
        }
    }

    // Send TON transaction
    async sendTON(fromAddress, toAddress, amount, memo = '') {
        if (!this.userId || !this.currentWallet) {
            throw new Error('User must have a wallet');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/send-ton`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    fromAddress: fromAddress,
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

    // Get token prices
    async getPrices() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/prices`);
            return await response.json();
        } catch (error) {
            console.error('❌ Price fetch failed:', error);
            return {
                success: true,
                prices: {
                    TON: { price: 2.5, change24h: 0 },
                    NMX: { price: 0.10, change24h: 0 }
                }
            };
        }
    }

    // Check if user has wallet
    hasWallet() {
        return !!this.currentWallet;
    }

    // Get current wallet
    getCurrentWallet() {
        return this.currentWallet;
    }

    // Health check
    async checkHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            return await response.json();
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get wallet address
    getAddress() {
        return this.currentWallet ? this.currentWallet.address : null;
    }

    // Get address in bounceable format
    getBounceableAddress() {
        return this.currentWallet ? (this.currentWallet.addressBounceable || this.currentWallet.address) : null;
    }
}

// Initialize global instance
console.log('🔧 Creating Nemex Wallet Manager...');
window.walletManager = new NemexWalletManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NemexWalletManager;
}

console.log('✅ Nemex Wallet Manager loaded');