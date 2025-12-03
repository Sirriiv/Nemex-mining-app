// assets/js/wallet.js - UPDATED FOR MINING SITE INTEGRATION
console.log('👛 Loading Nemex Wallet v3.0 (Mining Integrated)...');

class MiningWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        this.userEmail = null;
        this.isInitialized = false;

        console.log('✅ Wallet Manager initialized');
    }

    // =============================================
    // 🎯 INITIALIZATION - SIMPLIFIED & FIXED
    // =============================================

    async initialize() {
        console.log('🚀 Initializing wallet...');

        if (this.isInitialized) {
            console.log('ℹ️ Wallet already initialized');
            return { success: true, wallet: this.currentWallet };
        }

        try {
            // 🎯 SIMPLIFIED: Get user from mining site
            // The mining site should set window.miningUser when user is logged in
            
            if (!window.miningUser || !window.miningUser.id) {
                console.error('❌ No mining user found');
                console.log('ℹ️ Please make sure:');
                console.log('1. User is logged into mining site (dashboard.html)');
                console.log('2. dashboard.html sets window.miningUser before redirecting to wallet.html');
                console.log('3. Or user accesses wallet via "Open Wallet" button on dashboard');
                
                return {
                    success: false,
                    requiresLogin: true,
                    message: 'Please login to your mining account first',
                    redirectUrl: 'dashboard.html'
                };
            }

            this.userId = window.miningUser.id;
            this.userEmail = window.miningUser.email;
            console.log(`✅ Mining user authenticated: ${this.userId} (${this.userEmail || 'no email'})`);

            // Test API connection
            try {
                const testResponse = await fetch(`${this.apiBaseUrl}/test`);
                const testResult = await testResponse.json();
                console.log('🔌 API Test:', testResult.message);
            } catch (apiError) {
                console.warn('⚠️ API test failed (continuing anyway):', apiError.message);
            }

            // Get wallet from database
            const result = await this.getUserWallet(this.userId);

            if (result.success) {
                if (result.hasWallet) {
                    this.currentWallet = result.wallet;
                    this.isInitialized = true;
                    
                    console.log('✅ Wallet loaded:', {
                        address: result.wallet.address?.substring(0, 16) + '...',
                        userId: this.userId
                    });

                    return {
                        success: true,
                        hasWallet: true,
                        wallet: result.wallet,
                        userId: this.userId,
                        userEmail: this.userEmail
                    };
                } else {
                    // No wallet yet - this is normal for new users
                    console.log('ℹ️ No wallet found for user (ready to create)');
                    return {
                        success: true,
                        hasWallet: false,
                        message: 'No wallet found. Create your first wallet.',
                        userId: this.userId,
                        userEmail: this.userEmail
                    };
                }
            } else {
                console.error('❌ Failed to fetch wallet:', result.error);
                return result;
            }

        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            return {
                success: false,
                error: 'Failed to initialize wallet: ' + error.message,
                requiresLogin: true
            };
        }
    }

    // =============================================
    // 🎯 WALLET OPERATIONS - UPDATED FOR MINING PASSWORD
    // =============================================

    async getUserWallet(userId) {
        try {
            console.log(`📡 Fetching wallet for user: ${userId}`);

            const response = await fetch(`${this.apiBaseUrl}/get-user-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.error('❌ API Error:', response.status, result.error);
                return result;
            }

            console.log('📦 Wallet fetch:', result.success ? 'SUCCESS' : 'FAILED');
            return result;

        } catch (error) {
            console.error('❌ Get wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to fetch wallet: ' + error.message
            };
        }
    }

    async createWallet(userId, userPassword, replaceExisting = false) {
        try {
            console.log(`🔐 Creating wallet for user: ${userId}`);

            if (!userId || !userPassword) {
                throw new Error('User ID and mining account password are required');
            }

            const response = await fetch(`${this.apiBaseUrl}/create-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId,
                    userPassword, // This is the MINING ACCOUNT PASSWORD
                    replaceExisting 
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.error('❌ Create wallet API error:', response.status, result.error);
                
                // Handle specific errors
                if (result.requiresLogin) {
                    result.redirectUrl = 'dashboard.html';
                }
                
                return result;
            }

            if (result.success) {
                this.currentWallet = result.wallet;
                this.isInitialized = true;
                console.log('✅ Wallet created successfully');
                
                // IMPORTANT: Store the mnemonic safely (will be shown once)
                if (result.mnemonic) {
                    sessionStorage.setItem('new_wallet_mnemonic', result.mnemonic);
                    sessionStorage.setItem('new_wallet_address', result.wallet.address);
                }
            } else {
                console.error('❌ Create wallet failed:', result.error);
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

    async viewSeedPhrase(userId, userPassword) {
        try {
            console.log(`🔑 Viewing seed phrase for user: ${userId}`);

            if (!userId || !userPassword) {
                throw new Error('User ID and mining account password are required');
            }

            const response = await fetch(`${this.apiBaseUrl}/view-seed-phrase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userPassword })
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.error('❌ View seed API error:', response.status, result.error);
                
                // Handle incorrect password
                if (result.error && result.error.includes('password')) {
                    result.incorrectPassword = true;
                }
                
                return result;
            }

            return result;

        } catch (error) {
            console.error('❌ View seed phrase failed:', error);
            return { 
                success: false, 
                error: 'Failed to retrieve seed phrase: ' + error.message
            };
        }
    }

    async importWallet(userId, mnemonic, userPassword, replaceExisting = false) {
        try {
            console.log(`📥 Importing wallet for user: ${userId}`);

            if (!userId || !mnemonic || !userPassword) {
                throw new Error('User ID, seed phrase, and mining account password are required');
            }

            // Validate mnemonic
            const words = mnemonic.trim().split(/\s+/);
            if (words.length !== 12 && words.length !== 24) {
                return {
                    success: false,
                    error: 'Seed phrase must be 12 or 24 words',
                    receivedWords: words.length
                };
            }

            const response = await fetch(`${this.apiBaseUrl}/import-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId,
                    mnemonic: mnemonic.trim(),
                    userPassword,
                    replaceExisting 
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentWallet = result.wallet;
                this.isInitialized = true;
                console.log('✅ Wallet imported successfully');
            }

            return result;

        } catch (error) {
            console.error('❌ Import wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to import wallet: ' + error.message
            };
        }
    }

    async deleteWallet(userId, confirm = true) {
        try {
            console.log(`🗑️ Deleting wallet for user: ${userId}`);

            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!confirm) {
                return {
                    success: false,
                    error: 'Confirmation required for safety'
                };
            }

            const response = await fetch(`${this.apiBaseUrl}/delete-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, confirm: true })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentWallet = null;
                this.isInitialized = false;
                console.log('✅ Wallet deleted successfully');
            }

            return result;

        } catch (error) {
            console.error('❌ Delete wallet failed:', error);
            return { 
                success: false, 
                error: 'Failed to delete wallet: ' + error.message
            };
        }
    }

    async getBalance(address) {
        try {
            console.log(`💰 Getting balance for: ${address?.substring(0, 16) || 'null'}...`);

            if (!address) {
                return { 
                    success: true, 
                    balance: 0,
                    address: 'N/A',
                    currency: 'TON',
                    isMock: true
                };
            }

            const response = await fetch(`${this.apiBaseUrl}/balance/${encodeURIComponent(address)}`);
            
            if (!response.ok) {
                console.warn(`⚠️ Balance API error: ${response.status}`);
                return { 
                    success: true, 
                    balance: 0.5,
                    address: address,
                    currency: 'TON',
                    isMock: true
                };
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Get balance failed:', error);
            return { 
                success: true,
                balance: 0.5,
                address: address || 'N/A',
                currency: 'TON',
                isMock: true
            };
        }
    }

    async getPrices() {
        try {
            console.log('📈 Getting prices...');

            const response = await fetch(`${this.apiBaseUrl}/prices`);
            
            if (!response.ok) {
                console.warn(`⚠️ Prices API error: ${response.status}`);
                return {
                    success: true,
                    prices: {
                        TON: { price: 2.35, change24h: 1.5 },
                        NMX: { price: 0.10, change24h: 0.5 }
                    },
                    isMock: true,
                    timestamp: new Date().toISOString()
                };
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Get prices failed:', error);
            return {
                success: true,
                prices: {
                    TON: { price: 2.35, change24h: 0 },
                    NMX: { price: 0.10, change24h: 0 }
                },
                isMock: true,
                timestamp: new Date().toISOString()
            };
        }
    }

    async sendTransaction(userId, toAddress, amount, password) {
        try {
            console.log(`📤 Sending ${amount} TON to ${toAddress?.substring(0, 16) || 'null'}...`);

            if (!userId || !toAddress || !amount || !password) {
                return {
                    success: false,
                    error: 'All fields are required: user ID, recipient address, amount, and password'
                };
            }

            const response = await fetch(`${this.apiBaseUrl}/send-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId,
                    toAddress,
                    amount: parseFloat(amount),
                    password
                })
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('❌ Send transaction failed:', error);
            return { 
                success: false, 
                error: 'Failed to send transaction: ' + error.message
            };
        }
    }

    async getTransactionHistory(address) {
        try {
            console.log(`📜 Getting transaction history for: ${address?.substring(0, 16) || 'null'}...`);

            if (!address) {
                return { 
                    success: true, 
                    transactions: [],
                    address: 'N/A',
                    isMock: true
                };
            }

            // For now, return mock data
            return { 
                success: true, 
                transactions: [
                    {
                        id: 'mock_1',
                        type: 'received',
                        amount: 1.5,
                        from: 'EQABC123...',
                        to: address,
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        status: 'completed'
                    },
                    {
                        id: 'mock_2',
                        type: 'sent',
                        amount: 0.5,
                        from: address,
                        to: 'EQDEF456...',
                        timestamp: new Date(Date.now() - 172800000).toISOString(),
                        status: 'completed'
                    }
                ],
                address: address,
                isMock: true
            };

        } catch (error) {
            console.error('❌ Get transaction history failed:', error);
            return { 
                success: true, 
                transactions: [],
                address: address || 'N/A',
                isMock: true
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
        return this.currentWallet ? 
            (this.currentWallet.address || this.currentWallet.wallet_address) : 
            null;
    }

    getShortAddress() {
        const address = this.getAddress();
        if (!address) return '';
        if (address.length <= 16) return address;
        return address.substring(0, 8) + '...' + address.substring(address.length - 8);
    }

    getUserId() {
        return this.userId;
    }

    clearData() {
        this.currentWallet = null;
        this.userId = null;
        this.userEmail = null;
        this.isInitialized = false;
        console.log('🧹 Wallet data cleared');
    }

    // Helper to validate if user can perform actions
    validateUser() {
        if (!this.userId) {
            return {
                valid: false,
                message: 'Not logged in',
                requiresLogin: true
            };
        }
        
        if (!this.currentWallet) {
            return {
                valid: false,
                message: 'No wallet found',
                requiresWallet: true
            };
        }
        
        return { valid: true, userId: this.userId };
    }
}

// Create global instance
window.walletManager = new MiningWalletManager();
console.log('✅ Wallet Manager ready');

// Auto-initialize for wallet.html
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('wallet.html')) {
        console.log('🎯 Auto-initializing wallet...');
        
        // Give time for window.miningUser to be set by mining site
        setTimeout(async () => {
            try {
                const result = await window.walletManager.initialize();
                
                if (result.requiresLogin) {
                    console.warn('⚠️ User needs to login to mining site');
                    
                    // Show message after a short delay
                    setTimeout(() => {
                        if (typeof showMessage === 'function') {
                            showMessage('Please login to mining dashboard first', 'error');
                        } else if (typeof alert === 'function') {
                            alert('Please login to your mining account first from the dashboard.');
                        }
                    }, 500);
                }
            } catch (error) {
                console.error('❌ Auto-initialization failed:', error);
            }
        }, 300);
    }
});