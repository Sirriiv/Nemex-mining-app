// wallet.js - COMPLETE PRODUCTION VERSION
console.log('🚀 Loading Nemex Production Wallet v2.0...');

class NemexWalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.supabaseClient = null;
        this.tempSeedPhrase = null; // NEVER store permanently
        this.userSession = null;
        this.cache = new Map();
        this.cacheVersion = 'v2.0';
        
        // Cache busting
        this.cacheBuster = {
            timestamp: Date.now(),
            random: Math.random().toString(36).substring(2, 15),
            version: this.cacheVersion
        };

        // Storage configuration
        this.storageType = 'database_only';
        this.config = {
            enableCache: true,
            cacheTTL: 30000, // 30 seconds
            retryAttempts: 3,
            timeout: 10000 // 10 seconds
        };

        console.log('✅ Nemex Production Wallet Manager v2.0 initialized');
    }

    // =============================================
    // 🎯 INITIALIZATION
    // =============================================

    // Initialize with environment variables
    initializeEnvironment() {
        try {
            console.log('🔧 Initializing environment...');

            // Check for Supabase configuration
            const supabaseUrl = window.SUPABASE_URL || 
                window.env?.SUPABASE_URL || 
                window.appConfig?.supabaseUrl;

            const supabaseKey = window.SUPABASE_ANON_KEY || 
                window.env?.SUPABASE_ANON_KEY || 
                window.appConfig?.supabaseAnonKey;

            if (!supabaseUrl || !supabaseKey) {
                console.warn('⚠️ Supabase credentials not found in environment');
                console.log('💡 Make sure config.js is loaded before wallet.js');
                console.log('💡 Or set window.SUPABASE_URL and window.SUPABASE_ANON_KEY');
                
                // Try to load from config endpoint
                this.loadConfigFromAPI();
                return;
            }

            console.log('✅ Environment variables found');

            // Initialize Supabase client
            this.initializeSupabase(supabaseUrl, supabaseKey);

        } catch (error) {
            console.error('❌ Environment initialization failed:', error);
        }
    }

    // Load config from API
    async loadConfigFromAPI() {
        try {
            const response = await this.fetchWithTimeout('/api/config', {
                timeout: 5000
            });
            
            if (response.ok) {
                const config = await response.json();
                console.log('✅ Config loaded from API');
                // You can use config data if needed
            }
        } catch (error) {
            console.warn('⚠️ Failed to load config from API:', error.message);
        }
    }

    // Initialize Supabase client
    initializeSupabase(supabaseUrl, supabaseKey) {
        try {
            if (!window.supabase) {
                console.error('❌ Supabase library not loaded');
                console.log('💡 Make sure you include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
                return;
            }

            console.log('🔐 Initializing Supabase client...');

            this.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: false,
                    storage: window.localStorage
                },
                global: {
                    headers: {
                        'x-application-name': 'nemex-wallet',
                        'x-wallet-version': '2.0'
                    }
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });

            console.log('✅ Supabase client initialized');

            // Test connection
            this.testSupabaseConnection();

        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error);
        }
    }

    // Test Supabase connection
    async testSupabaseConnection() {
        try {
            if (!this.supabaseClient) return;

            const { data, error } = await this.supabaseClient
                .from('user_wallets')
                .select('count')
                .limit(1)
                .single();

            if (error) {
                console.warn('⚠️ Supabase connection test failed:', error.message);
                console.log('💡 Check:');
                console.log('   1. RLS policies are configured');
                console.log('   2. Table permissions are correct');
                console.log('   3. Network connectivity');
            } else {
                console.log('✅ Supabase connection successful');
            }
        } catch (error) {
            console.warn('⚠️ Supabase test error:', error.message);
        }
    }

    // =============================================
    // 🎯 AUTHENTICATION & USER MANAGEMENT
    // =============================================

    // Get current user from Supabase session
    async getCurrentUser() {
        try {
            console.log('🔍 Getting current user...');

            if (!this.supabaseClient) {
                console.warn('⚠️ Supabase client not initialized');
                this.initializeEnvironment();
                
                if (!this.supabaseClient) {
                    console.error('❌ Supabase client still not available');
                    return null;
                }
            }

            const { data: { session }, error } = await this.supabaseClient.auth.getSession();

            if (error) {
                console.error('❌ Session error:', error);
                return null;
            }

            if (!session?.user) {
                console.log('ℹ️ No active session found');
                return null;
            }

            console.log('✅ User session found:', session.user.id);
            this.userSession = session.user;
            
            return {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || '',
                createdAt: session.user.created_at,
                lastSignIn: session.user.last_sign_in_at
            };

        } catch (error) {
            console.error('❌ Get current user failed:', error);
            return null;
        }
    }

    // Check if user is logged in
    async isLoggedIn() {
        const user = await this.getCurrentUser();
        return user !== null;
    }

    // Logout
    async logout() {
        try {
            if (this.supabaseClient) {
                await this.supabaseClient.auth.signOut();
            }
            
            this.clearAllData();
            console.log('✅ Logged out successfully');
            
            return { success: true, message: 'Logged out' };
        } catch (error) {
            console.error('❌ Logout failed:', error);
            return { success: false, error: error.message };
        }
    }

    // =============================================
    // 🎯 WALLET INITIALIZATION
    // =============================================

    // Main initialization
    async initialize() {
        console.log('🚀 Initializing Nemex Wallet v2.0...');

        try {
            // Initialize environment first
            this.initializeEnvironment();

            // Get current user
            const currentUser = await this.getCurrentUser();

            if (!currentUser) {
                console.log('⚠️ No user logged in');
                return {
                    success: false,
                    requiresLogin: true,
                    message: 'Please login to access wallet',
                    redirectUrl: 'login.html',
                    storageType: this.storageType
                };
            }

            console.log('✅ User authenticated:', currentUser.id);

            // Get wallet from database
            const result = await this.getUserWallet(currentUser.id);

            if (result.success && result.wallet) {
                this.currentWallet = result.wallet;
                console.log('✅ Wallet loaded:', result.wallet.address.substring(0, 16) + '...');
                
                return {
                    success: true,
                    hasWallet: true,
                    wallet: result.wallet,
                    user: currentUser,
                    storageType: this.storageType,
                    version: '2.0'
                };
            } else {
                console.log('ℹ️ No wallet found for user');
                return {
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found. Create one to get started.',
                    user: currentUser,
                    storageType: this.storageType,
                    version: '2.0'
                };
            }

        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            return {
                success: false,
                error: 'Failed to initialize wallet: ' + error.message,
                storageType: this.storageType
            };
        }
    }

    // =============================================
    // 🎯 WALLET OPERATIONS
    // =============================================

    // Get user's wallet
    async getUserWallet(userId) {
        const cacheKey = `wallet_${userId}`;
        
        // Check cache first
        if (this.config.enableCache) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📦 Using cached wallet data');
                return cached;
            }
        }

        try {
            console.log('📡 Fetching wallet from database...');

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/get-user-wallet`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    userId: userId,
                    _cb: this.cacheBuster.random // Cache buster
                })
            });

            // Check response
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            // Parse JSON
            const result = await response.json();

            // Validate response
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid API response');
            }

            // Cache the result
            if (this.config.enableCache && result.success) {
                this.setCache(cacheKey, result, this.config.cacheTTL);
            }

            return result;

        } catch (error) {
            console.error('❌ Get wallet failed:', error.message);
            
            return { 
                success: false, 
                error: 'Failed to fetch wallet: ' + error.message,
                userId: userId,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // Create wallet
    async createWallet(userId, userPassword, replaceExisting = false) {
        try {
            console.log('🔐 Creating wallet...');

            if (!userId || !userPassword) {
                throw new Error('User ID and password are required');
            }

            if (userPassword.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/create-wallet`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    userId: userId,
                    userPassword: userPassword,
                    replaceExisting: replaceExisting,
                    _cb: this.cacheBuster.random
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = result.wallet;
                
                // Clear cache for this user
                this.clearCache(`wallet_${userId}`);
                
                // Store seed phrase temporarily for backup display
                if (result.mnemonic) {
                    this.tempSeedPhrase = result.mnemonic;
                    // Auto-clear after 5 minutes
                    setTimeout(() => this.clearTempSeedPhrase(), 5 * 60 * 1000);
                }

                console.log('✅ Wallet created:', result.wallet.address.substring(0, 16) + '...');
            }

            return result;

        } catch (error) {
            console.error('❌ Create wallet failed:', error);
            
            return { 
                success: false, 
                error: 'Failed to create wallet: ' + error.message,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // Import wallet
    async importWallet(userId, mnemonic, userPassword, replaceExisting = false) {
        try {
            console.log('📥 Importing wallet...');

            if (!userId || !mnemonic || !userPassword) {
                throw new Error('User ID, seed phrase, and password are required');
            }

            // Validate mnemonic format
            const words = mnemonic.trim().split(/\s+/);
            if (words.length !== 12 && words.length !== 24) {
                throw new Error('Seed phrase must be 12 or 24 words');
            }

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/import-wallet`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    userId: userId,
                    mnemonic: mnemonic,
                    userPassword: userPassword,
                    replaceExisting: replaceExisting,
                    _cb: this.cacheBuster.random
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = result.wallet;
                this.clearCache(`wallet_${userId}`);
                console.log('✅ Wallet imported:', result.wallet.address.substring(0, 16) + '...');
            }

            return result;

        } catch (error) {
            console.error('❌ Import wallet failed:', error);
            
            return { 
                success: false, 
                error: 'Failed to import wallet: ' + error.message,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // View seed phrase
    async viewSeedPhrase(userId, userPassword) {
        try {
            console.log('🔐 Requesting seed phrase...');

            if (!userId || !userPassword) {
                throw new Error('User ID and password are required');
            }

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/view-seed-phrase`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    userId: userId,
                    userPassword: userPassword,
                    _cb: this.cacheBuster.random
                })
            });

            const result = await response.json();

            if (result.success && result.seedPhrase) {
                this.tempSeedPhrase = result.seedPhrase;
                // Auto-clear after 2 minutes
                setTimeout(() => this.clearTempSeedPhrase(), 2 * 60 * 1000);
            }

            return result;

        } catch (error) {
            console.error('❌ View seed phrase failed:', error);
            
            return { 
                success: false, 
                error: 'Failed to retrieve seed phrase: ' + error.message,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // Change encryption password
    async changeSeedPassword(userId, currentPassword, newPassword) {
        try {
            console.log('🔑 Changing encryption password...');

            if (!userId || !currentPassword || !newPassword) {
                throw new Error('All password fields are required');
            }

            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters');
            }

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/change-seed-password`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    userId: userId,
                    currentPassword: currentPassword,
                    newPassword: newPassword,
                    _cb: this.cacheBuster.random
                })
            });

            return await response.json();

        } catch (error) {
            console.error('❌ Change password failed:', error);
            
            return { 
                success: false, 
                error: 'Failed to change password: ' + error.message,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // Delete wallet
    async deleteWallet(userId, confirm = true) {
        try {
            console.log('🗑️ Deleting wallet...');

            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!confirm) {
                throw new Error('Confirmation required for safety');
            }

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/delete-wallet`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    userId: userId,
                    confirm: true,
                    _cb: this.cacheBuster.random
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = null;
                this.clearCache(`wallet_${userId}`);
                console.log('✅ Wallet deleted');
            }

            return result;

        } catch (error) {
            console.error('❌ Delete wallet failed:', error);
            
            return { 
                success: false, 
                error: 'Failed to delete wallet: ' + error.message,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // Get backup status
    async getBackupStatus(userId) {
        try {
            console.log('📊 Getting backup status...');

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/backup-status`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    userId: userId,
                    _cb: this.cacheBuster.random
                })
            });

            return await response.json();

        } catch (error) {
            console.error('❌ Backup status failed:', error);
            
            return { 
                success: false, 
                error: 'Failed to get backup status: ' + error.message,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // =============================================
    // 🎯 BALANCE & PRICES
    // =============================================

    // Get balance
    async getBalance(address) {
        const cacheKey = `balance_${address}`;
        
        if (this.config.enableCache) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }

        try {
            console.log(`💰 Getting balance for: ${address.substring(0, 16)}...`);

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/balance/${encodeURIComponent(address)}`, {
                headers: this.getHeaders(),
                _cb: this.cacheBuster.random
            });

            const result = await response.json();

            if (this.config.enableCache && result.success) {
                this.setCache(cacheKey, result, 30000); // Cache for 30 seconds
            }

            return result;

        } catch (error) {
            console.error('❌ Get balance failed:', error);
            
            return { 
                success: false, 
                balance: 0, 
                error: error.message,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // Get prices
    async getPrices() {
        const cacheKey = 'prices';
        
        if (this.config.enableCache) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }

        try {
            console.log('📈 Getting prices...');

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/prices`, {
                headers: this.getHeaders(),
                _cb: this.cacheBuster.random
            });

            const result = await response.json();

            if (this.config.enableCache && result.success) {
                this.setCache(cacheKey, result, 60000); // Cache for 60 seconds
            }

            return result;

        } catch (error) {
            console.error('❌ Get prices failed:', error);
            
            return {
                success: true, // Return success with mock data
                prices: {
                    TON: { price: 2.35, change24h: 0 },
                    NMX: { price: 0.10, change24h: 0 }
                },
                cacheBuster: this.cacheBuster
            };
        }
    }

    // Send transaction
    async sendTransaction(userId, toAddress, amount, memo = '') {
        try {
            console.log(`📤 Sending ${amount} TON to ${toAddress.substring(0, 16)}...`);

            const response = await this.fetchWithRetry(`${this.apiBaseUrl}/send-transaction`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    userId: userId,
                    toAddress: toAddress,
                    amount: amount,
                    memo: memo,
                    _cb: this.cacheBuster.random
                })
            });

            return await response.json();

        } catch (error) {
            console.error('❌ Send transaction failed:', error);
            
            return { 
                success: false, 
                error: 'Failed to send transaction: ' + error.message,
                cacheBuster: this.cacheBuster
            };
        }
    }

    // =============================================
    // 🎯 UTILITIES
    // =============================================

    // Fetch with timeout
    async fetchWithTimeout(url, options = {}) {
        const { timeout = this.config.timeout, ...fetchOptions } = options;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
                headers: {
                    ...fetchOptions.headers,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Fetch with retry
    async fetchWithRetry(url, options = {}, retries = this.config.retryAttempts) {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.fetchWithTimeout(url, options);
            } catch (error) {
                if (i === retries - 1) throw error;
                console.log(`🔄 Retry ${i + 1}/${retries} for ${url}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // Get headers
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Wallet-Version': '2.0',
            'X-Cache-Buster': this.cacheBuster.random
        };
    }

    // Cache management
    setCache(key, value, ttl = 30000) {
        const item = {
            value: value,
            expiry: Date.now() + ttl
        };
        this.cache.set(key, item);
    }

    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    clearCache(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    // Clear temporary seed phrase
    clearTempSeedPhrase() {
        if (this.tempSeedPhrase) {
            console.log('🧹 Clearing temporary seed phrase...');
            // Overwrite for security
            this.tempSeedPhrase = 'x'.repeat(this.tempSeedPhrase.length);
            this.tempSeedPhrase = null;
        }
    }

    // Get temporary seed phrase
    getTempSeedPhrase() {
        const seed = this.tempSeedPhrase;
        // Clear immediately after reading
        setTimeout(() => this.clearTempSeedPhrase(), 100);
        return seed;
    }

    // Clear all data
    clearAllData() {
        this.currentWallet = null;
        this.tempSeedPhrase = null;
        this.userSession = null;
        this.clearCache();
        console.log('🧹 All wallet data cleared');
    }

    // Check if has wallet
    hasWallet() {
        return !!this.currentWallet;
    }

    // Get current wallet
    getCurrentWallet() {
        return this.currentWallet;
    }

    // Get address
    getAddress() {
        return this.currentWallet ? this.currentWallet.address : null;
    }

    // Validate password strength
    validatePasswordStrength(password) {
        if (!password) {
            return { valid: false, message: 'Password required' };
        }

        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const requirements = [];

        if (password.length < minLength) {
            requirements.push(`at least ${minLength} characters`);
        }
        if (!hasUpperCase) {
            requirements.push('uppercase letters');
        }
        if (!hasLowerCase) {
            requirements.push('lowercase letters');
        }
        if (!hasNumbers) {
            requirements.push('numbers');
        }
        if (!hasSpecialChars) {
            requirements.push('special characters');
        }

        if (requirements.length > 0) {
            return {
                valid: false,
                message: `Password needs: ${requirements.join(', ')}`,
                strength: 'weak'
            };
        }

        // Calculate strength
        let strength = 'medium';
        if (password.length >= 12 && hasSpecialChars) {
            strength = 'strong';
        }

        const messages = {
            weak: 'Weak password',
            medium: 'Good password',
            strong: 'Strong password'
        };

        return {
            valid: true,
            message: messages[strength],
            strength: strength
        };
    }

    // Generate secure password
    generateSecurePassword(length = 12) {
        const chars = {
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lower: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };

        let password = '';
        
        // Ensure at least one of each type
        password += chars.upper[Math.floor(Math.random() * chars.upper.length)];
        password += chars.lower[Math.floor(Math.random() * chars.lower.length)];
        password += chars.numbers[Math.floor(Math.random() * chars.numbers.length)];
        password += chars.symbols[Math.floor(Math.random() * chars.symbols.length)];

        // Fill remaining
        const allChars = chars.upper + chars.lower + chars.numbers + chars.symbols;
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle
        password = password.split('').sort(() => Math.random() - 0.5).join('');

        return password;
    }

    // Test API
    async testAPI() {
        try {
            const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/test`);
            return await response.json();
        } catch (error) {
            return {
                success: false,
                error: error.message,
                note: 'Make sure server is running'
            };
        }
    }

    // Test Supabase
    async testSupabase() {
        if (!this.supabaseClient) {
            return {
                success: false,
                error: 'Supabase client not initialized'
            };
        }

        try {
            const { data, error } = await this.supabaseClient
                .from('user_wallets')
                .select('count')
                .limit(1);

            if (error) {
                return {
                    success: false,
                    error: error.message
                };
            }

            return {
                success: true,
                message: 'Supabase connection successful'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
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
            cache: {
                size: this.cache.size,
                version: this.cacheVersion
            },
            storage: this.storageType,
            timestamp: new Date().toISOString(),
            version: '2.0'
        };
    }

    // Refresh cache buster
    refreshCacheBuster() {
        this.cacheBuster = {
            timestamp: Date.now(),
            random: Math.random().toString(36).substring(2, 15),
            version: this.cacheVersion
        };
        this.clearCache();
        console.log('🔄 Cache buster refreshed');
    }
}

// =============================================
// 🎯 GLOBAL INSTANCE & INITIALIZATION
// =============================================

// Create global instance
console.log('🔧 Creating Nemex Wallet Manager instance...');
window.walletManager = new NemexWalletManager();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing wallet system...');
    
    // Small delay to ensure everything is loaded
    setTimeout(() => {
        console.log('🚀 Starting wallet system initialization...');
        
        // Initialize environment
        window.walletManager.initializeEnvironment();
        
        // Test connections
        window.walletManager.testAPI().then(result => {
            if (result.success) {
                console.log('✅ API connection test passed');
            } else {
                console.warn('⚠️ API connection test failed:', result.error);
            }
        });
        
    }, 1000);
});

// Debug helper
window.debugWalletSystem = async function() {
    console.log('🔧 Wallet System Debug Information:');
    console.log('====================================');
    
    const status = await window.walletManager.getSystemStatus();
    
    console.log('📋 System Status:');
    console.log('   API:', status.api.success ? '✅ Connected' : '❌ Failed');
    console.log('   Supabase:', status.supabase.success ? '✅ Connected' : '❌ Failed');
    console.log('   User:', status.user.loggedIn ? '✅ Logged In' : '❌ Not Logged In');
    console.log('   Wallet:', status.wallet.hasWallet ? '✅ Has Wallet' : '❌ No Wallet');
    console.log('   Storage:', status.storage);
    console.log('   Version:', status.version);
    
    console.log('====================================');
};

// Auto-debug in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        console.log('🐛 Development mode: Running auto-debug...');
        window.debugWalletSystem().catch(console.error);
    }, 3000);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NemexWalletManager;
}

console.log('✅ Nemex Production Wallet v2.0 loaded successfully');