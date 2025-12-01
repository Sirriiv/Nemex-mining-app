// wallet.js - INTEGRATED WALLET MANAGER FOR NEMEX WEBSITE
console.log('🔄 Loading Nemex Integrated Wallet System...');

class NemexWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.supabaseClient = null;
        console.log('✅ Nemex Wallet Manager initialized');
    }

    // Initialize Supabase client
    initializeSupabase() {
        if (window.supabase) {
            const supabaseUrl = 'https://bjulifvbfogymoduxnzl.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';
            
            this.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            console.log('✅ Supabase client initialized');
        }
    }

    // Get current user from Supabase session
    async getCurrentUser() {
        try {
            if (!this.supabaseClient) {
                this.initializeSupabase();
            }

            const { data: { session }, error } = await this.supabaseClient.auth.getSession();
            
            if (error) {
                console.error('❌ Session error:', error);
                return null;
            }

            if (!session?.user) {
                console.log('❌ No user session found');
                return null;
            }

            console.log('✅ User session found:', session.user.id);
            return {
                id: session.user.id,
                email: session.user.email
            };
        } catch (error) {
            console.error('❌ Get current user failed:', error);
            return null;
        }
    }

    // Initialize wallet for current user
    async initialize() {
        console.log('🚀 Initializing wallet for current user...');

        try {
            // Get current user from Supabase
            const currentUser = await this.getCurrentUser();
            
            if (!currentUser) {
                console.log('⚠️ No user logged in - redirecting to login');
                return {
                    success: false,
                    requiresLogin: true,
                    redirectUrl: 'login.html'
                };
            }

            console.log('✅ User logged in:', currentUser.id);

            // Get user's wallet
            const result = await this.getUserWallet(currentUser.id);
            
            if (result.success && result.wallet) {
                this.currentWallet = result.wallet;
                console.log('✅ Wallet loaded:', result.wallet.address);
                return {
                    success: true,
                    hasWallet: true,
                    wallet: result.wallet,
                    user: currentUser
                };
            } else {
                console.log('ℹ️ No wallet found for user');
                return {
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found',
                    user: currentUser
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
    async createWallet(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/create-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId })
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
    async importWallet(userId, mnemonic) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
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
    async sendTON(userId, fromAddress, toAddress, amount, memo = '') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/send-ton`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
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

    // Check if user is logged in via Supabase
    async isLoggedIn() {
        const user = await this.getCurrentUser();
        return user !== null;
    }
}

// Initialize global instance
console.log('🔧 Creating Nemex Wallet Manager...');
window.walletManager = new NemexWalletManager();
window.walletManager.initializeSupabase(); // Initialize Supabase client

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NemexWalletManager;
}

console.log('✅ Nemex Wallet Manager loaded');