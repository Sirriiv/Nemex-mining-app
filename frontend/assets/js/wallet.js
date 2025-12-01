// wallet.js - COMPLETE SUPABASE AUTH VERSION
console.log('🔄 Loading Secure Wallet System with Supabase Auth...');

class TONWalletManager {
    constructor() {
        this.supabase = null;
        this.currentWallet = null;
        this.isInitialized = false;
        this.apiBaseUrl = '/api/wallet';
        this.isAuthenticated = false;
        this.currentUser = null;
        
        console.log('🚀 Initializing TON Wallet Manager with Supabase Auth...');
        this.initializeSupabase();
    }

    async initializeSupabase() {
        try {
            console.log('🔄 Getting Supabase configuration from backend...');
            
            // Get configuration from backend first
            const configResponse = await fetch(`${this.apiBaseUrl}/config`);
            const config = await configResponse.json();
            
            if (config.success && config.supabase) {
                console.log('✅ Backend configuration loaded:', {
                    url: config.supabase.url ? '***configured***' : 'missing',
                    anonKey: config.supabase.anonKey ? '***configured***' : 'missing'
                });

                // Create Supabase client with backend configuration
                this.supabase = supabase.createClient(config.supabase.url, config.supabase.anonKey, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: false,
                        storage: window.localStorage
                    }
                });

                console.log('✅ Supabase client created with backend configuration');
                
                // Set up auth listener
                this.setupAuthListener();
                
                // Check initial auth state
                await this.checkAuthState();
                
            } else {
                throw new Error('Failed to load configuration from backend');
            }

        } catch (error) {
            console.error('❌ Failed to initialize Supabase with backend config:', error);
            throw new Error('Supabase configuration required. Please ensure backend is running with proper environment variables.');
        }
    }

    async checkAuthState() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ Error checking auth state:', error);
                this.isAuthenticated = false;
                this.currentUser = null;
                this.currentWallet = null;
                return;
            }
            
            if (session) {
                console.log('✅ User authenticated:', session.user.id);
                this.isAuthenticated = true;
                this.currentUser = session.user;
                
                // Load user's wallet
                await this.loadUserWallet(session.user.id);
            } else {
                console.log('ℹ️ No active session - user needs to sign in');
                this.isAuthenticated = false;
                this.currentUser = null;
                this.currentWallet = null;
            }
        } catch (error) {
            console.error('❌ Auth state check failed:', error);
            this.isAuthenticated = false;
            this.currentUser = null;
            this.currentWallet = null;
        }
    }

    setupAuthListener() {
        if (!this.supabase || !this.supabase.auth) {
            console.error('❌ Supabase auth not available');
            return;
        }

        console.log('🔑 Setting up Supabase auth listener...');
        
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔑 Supabase Auth State Change: ${event}`, session ? `User: ${session.user.id}` : 'No session');
            
            switch (event) {
                case 'SIGNED_IN':
                    console.log('✅ User signed in:', session.user.id);
                    this.isAuthenticated = true;
                    this.currentUser = session.user;
                    await this.loadUserWallet(session.user.id);
                    break;
                    
                case 'SIGNED_OUT':
                    console.log('🔒 User signed out');
                    this.isAuthenticated = false;
                    this.currentUser = null;
                    this.currentWallet = null;
                    this.clearWalletUI();
                    break;
                    
                case 'USER_UPDATED':
                    console.log('🔄 User updated:', session.user.id);
                    this.currentUser = session.user;
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token refreshed');
                    break;
                    
                case 'USER_DELETED':
                    console.log('🗑️ User deleted');
                    this.isAuthenticated = false;
                    this.currentUser = null;
                    this.currentWallet = null;
                    this.clearWalletUI();
                    break;
            }
        });
    }

    async loadUserWallet(userId) {
        if (!userId) {
            console.log('⚠️ No user ID provided for wallet load');
            return;
        }

        try {
            console.log('🔍 Loading wallet for user:', userId);
            
            // Call backend to get user's wallet
            const response = await fetch(`${this.apiBaseUrl}/get-user-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userId: userId,
                    authMethod: 'supabase_session'
                })
            });

            const result = await response.json();

            if (result.success && result.wallet) {
                console.log('✅ Wallet loaded successfully:', result.wallet.address);
                this.currentWallet = result.wallet;
                this.updateWalletUI();
            } else {
                console.log('ℹ️ No wallet found for user');
                this.currentWallet = null;
                this.updateWalletUI();
            }

        } catch (error) {
            console.error('❌ Error loading user wallet:', error);
            this.currentWallet = null;
        }
    }

    clearWalletUI() {
        this.currentWallet = null;
        if (typeof window.clearWalletDisplay === 'function') {
            window.clearWalletDisplay();
        }
    }

    updateWalletUI() {
        if (typeof window.updateWalletDisplay === 'function') {
            window.updateWalletDisplay(this.currentWallet);
        }
    }

    async initializeWalletAPI() {
        console.log('🚀 Initializing TON Wallet API with Supabase Auth...');
        
        try {
            // Test backend connection
            const testResponse = await fetch(`${this.apiBaseUrl}/health`);
            const testData = await testResponse.json();
            
            if (!testData.success) {
                throw new Error('Backend API not available');
            }

            console.log('✅ Backend API is accessible:', testData.message);

            // Wait for Supabase initialization
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            // Check if user is authenticated
            await this.checkAuthState();

            console.log('✅ TON Wallet Manager initialized successfully');
            
            return { 
                success: true, 
                message: 'Wallet system ready',
                authenticated: this.isAuthenticated,
                hasWallet: !!this.currentWallet
            };

        } catch (error) {
            console.error('❌ Wallet API initialization failed:', error);
            return { 
                success: false, 
                error: error.message,
                requiresAuth: true
            };
        }
    }

    async hasWallet() {
        return !!this.currentWallet && this.isAuthenticated;
    }

    async getCurrentWallet() {
        if (!this.isAuthenticated) {
            console.log('⚠️ User not authenticated');
            return null;
        }
        return this.currentWallet;
    }

    async getUserWallet(userId) {
        if (!userId || !this.isAuthenticated) {
            console.log('⚠️ User not authenticated or no user ID');
            return null;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/get-user-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userId: userId,
                    authMethod: 'supabase_session'
                })
            });

            const result = await response.json();

            if (result.success && result.wallet) {
                return result.wallet;
            } else {
                return null;
            }

        } catch (error) {
            console.error('❌ Error fetching user wallet:', error);
            return null;
        }
    }

    async createNewWallet() {
        if (!this.isAuthenticated || !this.currentUser) {
            throw new Error('User must be authenticated to create a wallet');
        }

        console.log('🔄 Creating new wallet for user:', this.currentUser.id);

        try {
            // Call backend to generate wallet
            const response = await fetch(`${this.apiBaseUrl}/generate-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    wordCount: 12,
                    authMethod: 'supabase_session'
                })
            });

            const result = await response.json();

            if (result.success && result.wallet) {
                console.log('✅ Wallet created successfully:', result.wallet.address);
                
                // Update current wallet
                this.currentWallet = result.wallet;
                this.updateWalletUI();
                
                // Return both wallet and mnemonic
                return {
                    success: true,
                    wallet: result.wallet,
                    mnemonic: result.mnemonic
                };
            } else {
                throw new Error(result.error || 'Failed to create wallet');
            }

        } catch (error) {
            console.error('❌ Wallet creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async importWalletFromMnemonic(mnemonic) {
        if (!this.isAuthenticated || !this.currentUser) {
            throw new Error('User must be authenticated to import a wallet');
        }

        console.log('🔄 Importing wallet for user:', this.currentUser.id);

        try {
            // Call backend to import wallet
            const response = await fetch(`${this.apiBaseUrl}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    mnemonic: mnemonic,
                    authMethod: 'supabase_session'
                })
            });

            const result = await response.json();

            if (result.success && result.wallet) {
                console.log('✅ Wallet imported successfully:', result.wallet.address);
                
                // Update current wallet
                this.currentWallet = result.wallet;
                this.updateWalletUI();
                
                return {
                    success: true,
                    wallet: result.wallet
                };
            } else {
                throw new Error(result.error || 'Failed to import wallet');
            }

        } catch (error) {
            console.error('❌ Wallet import failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getBalances(address) {
        if (!address) {
            console.log('⚠️ No address provided for balance check');
            return null;
        }

        try {
            console.log('💰 Getting balances for:', address);

            const response = await fetch(`${this.apiBaseUrl}/get-balances`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address: address })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Balances retrieved successfully');
                return result.balances;
            } else {
                console.warn('⚠️ Balance fetch failed:', result.error);
                return {
                    ton: { balance: '0', usdValue: '0' },
                    nmx: { balance: '0', usdValue: '0' }
                };
            }

        } catch (error) {
            console.error('❌ Balance check failed:', error);
            return {
                ton: { balance: '0', usdValue: '0' },
                nmx: { balance: '0', usdValue: '0' }
            };
        }
    }

    async sendTransaction(fromAddress, toAddress, amount, memo = '') {
        if (!this.isAuthenticated) {
            throw new Error('User must be authenticated to send transactions');
        }

        console.log('🔄 Sending transaction from:', fromAddress);

        try {
            const response = await fetch(`${this.apiBaseUrl}/send-ton`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fromAddress: fromAddress,
                    toAddress: toAddress,
                    amount: amount,
                    memo: memo,
                    userId: this.currentUser.id
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Transaction sent successfully:', result.transaction.hash);
                return result;
            } else {
                throw new Error(result.error || 'Transaction failed');
            }

        } catch (error) {
            console.error('❌ Transaction failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async signInWithEmail(email, password) {
        try {
            console.log('🔐 Signing in with email:', email);
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            
            return { success: true, user: data.user };
            
        } catch (error) {
            console.error('❌ Sign in failed:', error);
            return { success: false, error: error.message };
        }
    }

    async signUpWithEmail(email, password) {
        try {
            console.log('📝 Signing up with email:', email);
            
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password
            });

            if (error) throw error;
            
            return { success: true, user: data.user };
            
        } catch (error) {
            console.error('❌ Sign up failed:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            console.log('🚪 Signing out...');
            
            const { error } = await this.supabase.auth.signOut();
            
            if (error) throw error;
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Helper method to check backend status
    async checkBackendStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Backend health check failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize when script loads
console.log('🔧 Initializing TON Wallet Manager with Supabase Auth...');
window.tonWalletManager = new TONWalletManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TONWalletManager;
}

console.log('✅ TON Wallet Manager loaded - Full Supabase Auth Version');