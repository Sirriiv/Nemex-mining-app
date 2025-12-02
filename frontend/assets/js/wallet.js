// wallet.js - COMPLETE DATABASE-ONLY WALLET MANAGER
console.log('🔄 Loading Nemex Database-Only Wallet System...');

class NemexWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.supabaseClient = null;
        this.tempSeedPhrase = null; // NEVER store permanently
        this.userSession = null;
        
        // 🚫 NO LOCALSTORAGE - DATABASE ONLY
        this.storageType = 'database_only';
        console.log('✅ Nemex Wallet Manager initialized - Database Only');
    }

    // Initialize Supabase client with environment variables
    initializeSupabase() {
        if (window.supabase) {
            try {
                // Get Supabase URL from environment (injected by server)
                const supabaseUrl = window.SUPABASE_URL || 
                    window.appConfig?.supabaseUrl || 
                    window.env?.SUPABASE_URL;
                
                // Get Supabase anon key from environment (injected by server)
                const supabaseKey = window.SUPABASE_ANON_KEY || 
                    window.appConfig?.supabaseAnonKey || 
                    window.env?.SUPABASE_ANON_KEY;
                
                if (!supabaseUrl || !supabaseKey) {
                    console.error('❌ Supabase credentials not found in environment');
                    console.log('💡 Configuration required:');
                    console.log('   - window.SUPABASE_URL must be set');
                    console.log('   - window.SUPABASE_ANON_KEY must be set');
                    console.log('💡 These should be injected by your server in the HTML');
                    return;
                }
                
                console.log('🔐 Initializing Supabase client with environment variables...');
                
                this.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
                console.log('✅ Supabase client initialized from environment');
                
            } catch (error) {
                console.error('❌ Failed to initialize Supabase client:', error);
                // Fallback: Try to get from window object if available
                if (window.supabaseClient) {
                    console.log('🔄 Using window.supabaseClient as fallback');
                    this.supabaseClient = window.supabaseClient;
                }
            }
        } else {
            console.warn('⚠️ Supabase library not loaded. Make sure you include it in your HTML.');
        }
    }

    // Get current user from Supabase session
    async getCurrentUser() {
        try {
            if (!this.supabaseClient) {
                this.initializeSupabase();
            }

            // Check if Supabase client is available
            if (!this.supabaseClient) {
                console.warn('⚠️ Supabase client not available - check credentials');
                return null;
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

    // Initialize wallet for current user - DATABASE ONLY
    async initialize() {
        console.log('🚀 Initializing database-only wallet for current user...');

        try {
            const currentUser = await this.getCurrentUser();

            if (!currentUser) {
                console.log('⚠️ No user logged in');
                return {
                    success: false,
                    requiresLogin: true,
                    redirectUrl: 'login.html',
                    storageType: 'database'
                };
            }

            console.log('✅ User logged in:', currentUser.id);

            // Get wallet from DATABASE ONLY
            const result = await this.getUserWallet(currentUser.id);

            if (result.success && result.wallet) {
                this.currentWallet = result.wallet;
                console.log('✅ Wallet loaded from database:', result.wallet.address);
                return {
                    success: true,
                    hasWallet: true,
                    wallet: result.wallet,
                    user: currentUser,
                    storageType: 'database',
                    databaseOnly: true
                };
            } else {
                console.log('ℹ️ No wallet found in database for user');
                return {
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found in database',
                    user: currentUser,
                    storageType: 'database',
                    databaseOnly: true
                };
            }
        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            return {
                success: false,
                error: 'Failed to load wallet from database',
                storageType: 'database'
            };
        }
    }

    // Get user's wallet from DATABASE ONLY
    async getUserWallet(userId) {
        try {
            console.log('📡 Fetching wallet from API (database)...');
            
            const response = await fetch(`${this.apiBaseUrl}/get-user-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId })
            });

            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }

            const result = await response.json();
            
            if (!result.success && result.error) {
                console.error('❌ API error response:', result.error);
            }
            
            return result;

        } catch (error) {
            console.error('❌ Get wallet failed:', error.message);
            
            // If API fails, check if we have a fallback
            return { 
                success: false, 
                error: 'Failed to fetch wallet from database: ' + error.message,
                databaseOnly: true
            };
        }
    }

    // 🔐 Create wallet with password - DATABASE ONLY
    async createWallet(userId, userPassword) {
        try {
            if (!userPassword) {
                throw new Error('Account password is required to create a wallet');
            }

            console.log('🔐 Creating wallet (database-only)...');

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

            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response. Check server logs.');
            }

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
                
                console.log('✅ Wallet created in database:', result.wallet?.address);
            } else {
                console.error('❌ Wallet creation failed:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ Create wallet failed:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to create wallet in database',
                databaseOnly: true
            };
        }
    }

    // 🔐 View seed phrase with password - DATABASE ONLY
    async viewSeedPhrase(userId, userPassword) {
        try {
            if (!userPassword) {
                throw new Error('Account password is required to view seed phrase');
            }

            console.log('🔐 Requesting seed phrase from database...');

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

            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }

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
                error: error.message || 'Failed to retrieve seed phrase from database',
                databaseOnly: true
            };
        }
    }

    // 🔐 Change seed encryption password - DATABASE ONLY
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

            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Change password failed:', error);
            return { 
                success: false, 
                error: error.message,
                databaseOnly: true 
            };
        }
    }

    // 🔐 Get wallet backup status - DATABASE ONLY
    async getBackupStatus(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/backup-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId })
            });

            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Backup status check failed:', error);
            return { 
                success: false, 
                error: error.message,
                databaseOnly: true 
            };
        }
    }

    // Import wallet with seed phrase - DATABASE ONLY
    async importWallet(userId, mnemonic) {
        try {
            console.log('📥 Importing wallet to database...');

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

            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }

            const result = await response.json();

            if (result.success) {
                this.currentWallet = result.wallet;
                console.log('✅ Wallet imported to database:', result.wallet?.address);
            }

            return result;

        } catch (error) {
            console.error('❌ Import wallet failed:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to import wallet to database',
                databaseOnly: true
            };
        }
    }

    // Delete wallet from database (for testing/reset)
    async deleteWallet(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/delete-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId })
            });

            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }

            const result = await response.json();
            
            if (result.success) {
                this.currentWallet = null;
                console.log('✅ Wallet deleted from database');
            }
            
            return result;

        } catch (error) {
            console.error('❌ Delete wallet failed:', error);
            return { 
                success: false, 
                error: error.message,
                databaseOnly: true 
            };
        }
    }

    // Get balance for address
    async getBalance(address) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/balance/${address}`);
            
            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Balance check failed:', error);
            return { 
                success: false, 
                balance: 0, 
                error: error.message,
                databaseOnly: true 
            };
        }
    }

    // Get token prices
    async getPrices() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/prices`);
            
            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Price fetch failed:', error);
            return {
                success: true,
                prices: {
                    TON: { price: 2.5, change24h: 0 },
                    NMX: { price: 0.10, change24h: 0 }
                },
                databaseOnly: true
            };
        }
    }

    // Health check
    async checkHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            
            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API returned non-JSON response:', text.substring(0, 200));
                throw new Error('API returned non-JSON response');
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return { 
                success: false, 
                error: error.message,
                databaseOnly: true 
            };
        }
    }

    // Test API connectivity
    async testAPI() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/test`);
            
            // Check response type
            const contentType = response.headers.get('content-type');
            
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ API test failed - non-JSON response:', text.substring(0, 200));
                return { 
                    success: false, 
                    error: 'API returned non-JSON response',
                    responseText: text.substring(0, 200)
                };
            }
            
            const result = await response.json();
            console.log('✅ API test result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ API test failed:', error);
            return { 
                success: false, 
                error: error.message,
                note: 'Make sure server is running and API routes are configured'
            };
        }
    }

    // Test Supabase connectivity
    async testSupabase() {
        try {
            if (!this.supabaseClient) {
                this.initializeSupabase();
            }

            if (!this.supabaseClient) {
                return {
                    success: false,
                    error: 'Supabase client not initialized',
                    note: 'Check if credentials are injected correctly'
                };
            }

            // Try a simple query to test connection
            const { data, error } = await this.supabaseClient
                .from('user_wallets')
                .select('count')
                .limit(1);

            if (error) {
                console.error('❌ Supabase test query failed:', error);
                return {
                    success: false,
                    error: 'Supabase query failed: ' + error.message,
                    note: 'Check RLS policies and table permissions'
                };
            }

            return {
                success: true,
                message: 'Supabase connection successful',
                data: data
            };

        } catch (error) {
            console.error('❌ Supabase test failed:', error);
            return {
                success: false,
                error: 'Supabase test failed: ' + error.message
            };
        }
    }

    // 🔐 Clear temporary seed phrase from memory
    clearTempSeedPhrase() {
        if (this.tempSeedPhrase) {
            console.log('🧹 Clearing temporary seed phrase from memory...');
            // Overwrite memory before clearing
            this.tempSeedPhrase = 'x'.repeat(this.tempSeedPhrase.length);
            this.tempSeedPhrase = null;
        }
    }

    // 🔐 Get temporary seed phrase (for display only)
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

    // 🔐 Validate password strength
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

        if (!hasSpecialChars) {
            return { 
                valid: true, 
                message: 'Good password (add special characters for stronger security)',
                strength: 'medium'
            };
        }

        return { 
            valid: true, 
            message: 'Strong password',
            strength: 'strong'
        };
    }

    // 🔐 Generate secure password
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

    // Clear all local data (security cleanup)
    clearAllData() {
        this.currentWallet = null;
        this.tempSeedPhrase = null;
        this.userSession = null;
        console.log('🧹 All wallet data cleared from memory');
    }

    // Get system status
    async getSystemStatus() {
        const apiTest = await this.testAPI();
        const supabaseTest = await this.testSupabase();
        const userStatus = await this.isLoggedIn();
        
        return {
            api: apiTest,
            supabase: supabaseTest,
            user: {
                loggedIn: userStatus,
                id: this.userSession?.id
            },
            wallet: {
                hasWallet: this.hasWallet(),
                address: this.getAddress()
            },
            storage: 'database_only',
            timestamp: new Date().toISOString()
        };
    }
}

// Initialize global instance
console.log('🔧 Creating Nemex Database-Only Wallet Manager...');
window.walletManager = new NemexWalletManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NemexWalletManager;
}

console.log('✅ Nemex Database-Only Wallet Manager loaded');

// Auto-test API connection on load
setTimeout(async () => {
    console.log('🔍 Testing system connectivity...');
    
    try {
        // Test API first
        const apiResult = await window.walletManager.testAPI();
        
        if (apiResult.success) {
            console.log('✅ API connection successful');
            
            // Then test Supabase if API works
            const supabaseResult = await window.walletManager.testSupabase();
            if (supabaseResult.success) {
                console.log('✅ Supabase connection successful');
            } else {
                console.warn('⚠️ Supabase connection issues:', supabaseResult.error);
                console.log('💡 Make sure:');
                console.log('   1. window.SUPABASE_URL is set correctly');
                console.log('   2. window.SUPABASE_ANON_KEY is set correctly');
                console.log('   3. RLS policies allow necessary operations');
            }
        } else {
            console.error('❌ API connection failed:', apiResult.error);
            console.log('💡 Make sure:');
            console.log('   1. Server is running (node server.js)');
            console.log('   2. API routes are mounted in server.js');
            console.log('   3. /api/wallet/test endpoint exists');
        }
    } catch (error) {
        console.error('❌ Connectivity test failed:', error);
    }
}, 1000);

// Add helper functions for debugging
window.debugWalletSystem = async function() {
    console.log('🔧 Wallet System Debug Information:');
    console.log('====================================');
    
    // Check if Supabase credentials are set
    console.log('📋 Environment Check:');
    console.log('   window.SUPABASE_URL:', window.SUPABASE_URL ? '✅ Set' : '❌ Not Set');
    console.log('   window.SUPABASE_ANON_KEY:', window.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set');
    console.log('   window.supabase library:', window.supabase ? '✅ Loaded' : '❌ Not Loaded');
    
    // Test API
    console.log('📡 API Test:');
    const apiTest = await window.walletManager.testAPI();
    console.log('   Status:', apiTest.success ? '✅ Working' : '❌ Failed');
    if (!apiTest.success) console.log('   Error:', apiTest.error);
    
    // Test Supabase
    console.log('🗄️ Supabase Test:');
    const supabaseTest = await window.walletManager.testSupabase();
    console.log('   Status:', supabaseTest.success ? '✅ Working' : '❌ Failed');
    if (!supabaseTest.success) console.log('   Error:', supabaseTest.error);
    
    // Check user session
    console.log('👤 User Session:');
    const user = await window.walletManager.getCurrentUser();
    console.log('   Status:', user ? '✅ Logged In' : '❌ Not Logged In');
    if (user) console.log('   User ID:', user.id);
    
    console.log('====================================');
};

// Auto-debug on page load (only in development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        console.log('🐛 Development mode: Running auto-debug...');
        window.debugWalletSystem().catch(console.error);
    }, 2000);
}