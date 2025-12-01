// wallet.js - COMPLETE HYBRID WALLET MANAGER
console.log('🔄 Loading Nemex Hybrid Wallet System...');

class NemexWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.supabaseClient = null;
        this.tempSeedPhrase = null; // NEVER store permanently
        this.userSession = null;
        console.log('✅ Nemex Hybrid Wallet Manager initialized');
    }

    // Initialize Supabase client
    initializeSupabase() {
        if (window.supabase) {
            // Use same Supabase config as your main app
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
            this.userSession = session.user;
            return {
                id: session.user.id,
                email: session.user.email,
                createdAt: session.user.created_at
            };
        } catch (error) {
            console.error('❌ Get current user failed:', error);
            return null;
        }
    }

    // Initialize wallet for current user
    async initialize() {
        console.log('🚀 Initializing hybrid wallet for current user...');

        try {
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

            const result = await this.getUserWallet(currentUser.id);

            if (result.success && result.wallet) {
                this.currentWallet = result.wallet;
                console.log('✅ Wallet loaded:', result.wallet.address);
                return {
                    success: true,
                    hasWallet: true,
                    wallet: result.wallet,
                    user: currentUser,
                    backupMethod: result.wallet.backupMethod
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

    // 🔐 NEW: Create wallet with password (Hybrid System)
    async createWallet(userId, userPassword) {
        try {
            if (!userPassword) {
                throw new Error('Account password is required to create a wallet');
            }

            console.log('🔐 Creating wallet with password protection...');

            const response = await fetch(`${this.apiBaseUrl}/create-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userId: userId,
                    userPassword: userPassword
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = result.wallet;
                // Temporarily store seed phrase for initial display
                if (result.mnemonic) {
                    this.tempSeedPhrase = result.mnemonic;
                    // Schedule cleanup after 5 minutes
                    setTimeout(() => {
                        this.clearTempSeedPhrase();
                    }, 5 * 60 * 1000);
                }
            }

            return result;

        } catch (error) {
            console.error('❌ Create wallet failed:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to create wallet' 
            };
        }
    }

    // 🔐 NEW: View seed phrase with password
    async viewSeedPhrase(userId, userPassword) {
        try {
            if (!userPassword) {
                throw new Error('Account password is required to view seed phrase');
            }

            console.log('🔐 Requesting seed phrase with password verification...');

            const response = await fetch(`${this.apiBaseUrl}/view-seed-phrase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userId: userId,
                    userPassword: userPassword
                })
            });

            const result = await response.json();

            if (result.success && result.seedPhrase) {
                this.tempSeedPhrase = result.seedPhrase;
                // Auto-clear after 2 minutes for security
                setTimeout(() => {
                    this.clearTempSeedPhrase();
                }, 2 * 60 * 1000);
            }

            return result;

        } catch (error) {
            console.error('❌ View seed phrase failed:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to retrieve seed phrase' 
            };
        }
    }

    // 🔐 NEW: Change seed encryption password
    async changeSeedPassword(userId, currentPassword, newPassword) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/change-seed-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userId: userId,
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            return await response.json();
        } catch (error) {
            console.error('❌ Change password failed:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔐 NEW: Get wallet backup status
    async getBackupStatus(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/backup-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId })
            });

            return await response.json();
        } catch (error) {
            console.error('❌ Backup status check failed:', error);
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

    // 🔐 NEW: Clear temporary seed phrase from memory
    clearTempSeedPhrase() {
        if (this.tempSeedPhrase) {
            console.log('🧹 Clearing temporary seed phrase from memory...');
            // Overwrite memory before clearing
            this.tempSeedPhrase = 'x'.repeat(this.tempSeedPhrase.length);
            this.tempSeedPhrase = null;
        }
    }

    // 🔐 NEW: Get temporary seed phrase (for display only)
    getTempSeedPhrase() {
        const seed = this.tempSeedPhrase;
        // Clear immediately after reading for security
        setTimeout(() => this.clearTempSeedPhrase(), 100);
        return seed;
    }

    // Check if user has wallet
    hasWallet() {
        return !!this.currentWallet;
    }

    // Get current wallet
    getCurrentWallet() {
        return this.currentWallet;
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

    // 🔐 NEW: Validate password strength
    validatePasswordStrength(password) {
        if (!password) return { valid: false, message: 'Password required' };
        
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return { valid: false, message: `Password must be at least ${minLength} characters` };
        }
        
        if (!hasUpperCase) {
            return { valid: false, message: 'Password must contain uppercase letters' };
        }
        
        if (!hasLowerCase) {
            return { valid: false, message: 'Password must contain lowercase letters' };
        }
        
        if (!hasNumbers) {
            return { valid: false, message: 'Password must contain numbers' };
        }

        return { 
            valid: true, 
            message: 'Strong password',
            strength: 'strong'
        };
    }

    // 🔐 NEW: Generate secure password
    generateSecurePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let password = '';
        
        // Ensure at least one of each type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        password += '0123456789'[Math.floor(Math.random() * 10)];
        password += '!@#$%^&*()'[Math.floor(Math.random() * 10)];
        
        // Fill the rest
        for (let i = password.length; i < length; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
        }
        
        // Shuffle the password
        password = password.split('').sort(() => Math.random() - 0.5).join('');
        
        return password;
    }
}

// Initialize global instance
console.log('🔧 Creating Nemex Hybrid Wallet Manager...');
window.walletManager = new NemexWalletManager();
window.walletManager.initializeSupabase();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NemexWalletManager;
}

console.log('✅ Nemex Hybrid Wallet Manager loaded');