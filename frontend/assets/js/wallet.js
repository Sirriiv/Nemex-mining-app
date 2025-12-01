// wallet.js - COMPLETE SECURE VERSION - NO HARDCODED KEYS
console.log('🔄 Loading Secure Wallet System...');

class TONWalletManager {
    constructor() {
        this.supabase = null;
        this.currentWallet = null;
        this.isInitialized = false;
        this.apiBaseUrl = '/api/wallet';
        console.log('🚀 Secure Supabase initialization...');
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
                
                // Test the connection
                const { data: { session }, error } = await this.supabase.auth.getSession();
                if (error) {
                    console.warn('⚠️ Supabase session test failed:', error.message);
                } else {
                    console.log('✅ Supabase connection successful');
                    if (session) {
                        console.log('✅ Active session found:', session.user.id);
                    } else {
                        console.log('ℹ️ No active session - user needs to sign in');
                    }
                }

                this.setupAuthListener();
                
            } else {
                throw new Error('Failed to load configuration from backend');
            }

        } catch (error) {
            console.error('❌ Failed to initialize Supabase with backend config:', error);
            console.log('🔄 Creating secure fallback Supabase client - no keys available');
            
            // Create a minimal fallback client
            this.supabase = {
                auth: {
                    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
                    signOut: () => Promise.resolve({ error: null }),
                    onAuthStateChange: (callback) => { 
                        console.log('🔄 Fallback auth state change listener');
                        // Simulate signed out state
                        setTimeout(() => {
                            callback('SIGNED_OUT', null);
                        }, 100);
                        return { data: { subscription: { unsubscribe: () => {} } } };
                    }
                },
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: null, error: { message: 'Fallback mode' } }),
                            limit: () => Promise.resolve({ data: [], error: null })
                        }),
                        insert: () => Promise.resolve({ data: null, error: { message: 'Fallback mode' } }),
                        upsert: () => Promise.resolve({ data: null, error: { message: 'Fallback mode' } }),
                        update: () => Promise.resolve({ data: null, error: { message: 'Fallback mode' } }),
                        delete: () => Promise.resolve({ data: null, error: { message: 'Fallback mode' } })
                    })
                })
            };
            
            console.log('✅ Fallback Supabase client created');
        }
    }

    setupAuthListener() {
        if (!this.supabase || !this.supabase.auth) {
            console.log('🔄 Setting up fallback auth listener');
            return;
        }

        console.log('🔑 Setting up Supabase auth listener...');
        
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔑 Supabase Auth State Change: ${event}`, session ? 'User: ' + session.user.id : 'No session');
            
            switch (event) {
                case 'SIGNED_IN':
                    console.log('✅ User signed in:', session.user.id);
                    await this.handleUserSignedIn(session.user);
                    break;
                    
                case 'SIGNED_OUT':
                    console.log('ℹ️ User signed out, clearing wallet from memory...');
                    await this.clearWallet();
                    break;
                    
                case 'USER_UPDATED':
                    console.log('🔄 User updated:', session.user.id);
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token refreshed');
                    break;
            }
        });
    }

    async handleUserSignedIn(user) {
        console.log('🔄 Handling user sign in:', user.id);
        try {
            // Check if user has existing wallet
            const existingWallet = await this.getUserWallet(user.id);
            if (existingWallet) {
                console.log('✅ Existing wallet found for user:', existingWallet.address);
                this.currentWallet = existingWallet;
                await this.updateWalletDisplay();
            } else {
                console.log('ℹ️ No existing wallet found for user');
                this.currentWallet = null;
            }
        } catch (error) {
            console.error('❌ Error handling user sign in:', error);
        }
    }

    async clearWallet() {
        console.log('🔄 Clearing wallet data...');
        this.currentWallet = null;
        this.isInitialized = false;
        
        // Clear from localStorage
        localStorage.removeItem('nemex_current_wallet');
        localStorage.removeItem('nemex_user_session');
        
        // Update UI
        await this.updateWalletDisplay();
        console.log('✅ Wallet cleared from memory');
    }

    async updateWalletDisplay() {
        // This will be called by the main wallet system
        if (typeof window.updateWalletUI === 'function') {
            window.updateWalletUI(this.currentWallet);
        }
    }

    async initializeWalletAPI() {
        console.log('🚀 SECURE: Initializing TON Wallet API...');
        
        try {
            // Test backend connection
            const testResponse = await fetch(`${this.apiBaseUrl}/test`);
            const testData = await testResponse.json();
            console.log('✅ Backend API is accessible:', testData.message);

            // Check for existing session
            let session = null;
            if (this.supabase && this.supabase.auth) {
                const sessionResult = await this.supabase.auth.getSession();
                session = sessionResult.data.session;
            }

            if (session && session.user) {
                console.log('✅ Active session found, loading wallet...');
                await this.handleUserSignedIn(session.user);
            } else {
                console.log('ℹ️ No active session - wallet system ready for login');
                this.isInitialized = true;
            }

            console.log('✅ TON Wallet Manager initialized successfully');
            return { success: true, message: 'Wallet system ready' };

        } catch (error) {
            console.error('❌ Wallet API initialization failed:', error);
            this.isInitialized = true; // Still mark as initialized to allow wallet creation
            return { success: false, error: error.message };
        }
    }

    async hasWallet() {
        if (!this.isInitialized) {
            console.log('⚠️ Wallet system not initialized');
            return false;
        }

        // Check if we have a current wallet in memory
        if (this.currentWallet) {
            return true;
        }

        // Check for user session and wallet in database
        try {
            if (this.supabase && this.supabase.auth) {
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session && session.user) {
                    const wallet = await this.getUserWallet(session.user.id);
                    return !!wallet;
                }
            }
        } catch (error) {
            console.log('ℹ️ Session check failed, checking localStorage...');
        }

        // Check localStorage as fallback
        const storedWallet = localStorage.getItem('nemex_current_wallet');
        if (storedWallet) {
            try {
                this.currentWallet = JSON.parse(storedWallet);
                return true;
            } catch (e) {
                console.error('❌ Error parsing stored wallet:', e);
            }
        }

        return false;
    }

    async getCurrentWallet() {
        if (this.currentWallet) {
            return this.currentWallet;
        }

        // Try to load from user session
        try {
            if (this.supabase && this.supabase.auth) {
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session && session.user) {
                    const wallet = await this.getUserWallet(session.user.id);
                    if (wallet) {
                        this.currentWallet = wallet;
                        return wallet;
                    }
                }
            }
        } catch (error) {
            console.log('ℹ️ Session wallet load failed, trying localStorage...');
        }

        // Try localStorage as fallback
        const storedWallet = localStorage.getItem('nemex_current_wallet');
        if (storedWallet) {
            try {
                this.currentWallet = JSON.parse(storedWallet);
                return this.currentWallet;
            } catch (e) {
                console.error('❌ Error parsing stored wallet:', e);
            }
        }

        return null;
    }

    async getUserWallet(userId) {
        if (!userId) {
            console.log('⚠️ No user ID provided for wallet lookup');
            return null;
        }

        try {
            console.log('🔍 Looking up wallet for user:', userId);

            // Try backend API first
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
                console.log('✅ Wallet found via API:', result.wallet.address);
                return result.wallet;
            } else {
                console.log('ℹ️ No wallet found via API for user:', userId);
                return null;
            }

        } catch (error) {
            console.error('❌ Error fetching user wallet:', error);
            return null;
        }
    }

    async createNewWallet() {
        console.log('🔄 Creating new wallet...');

        try {
            // Get current user session
            let userId = 'demo-user-' + Date.now();
            let authMethod = 'demo_session';

            if (this.supabase && this.supabase.auth) {
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session && session.user) {
                    userId = session.user.id;
                    authMethod = 'supabase_session';
                    console.log('✅ Using authenticated user:', userId);
                }
            }

            // Call backend to generate wallet
            const response = await fetch(`${this.apiBaseUrl}/generate-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    wordCount: 12,
                    authMethod: authMethod
                })
            });

            const result = await response.json();

            if (result.success && result.wallet) {
                console.log('✅ Wallet created successfully:', result.wallet.address);
                
                // Store wallet locally
                this.currentWallet = result.wallet;
                localStorage.setItem('nemex_current_wallet', JSON.stringify(result.wallet));
                
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
        console.log('🔄 Importing wallet from mnemonic...');

        try {
            // Get current user session
            let userId = 'demo-user-' + Date.now();
            let authMethod = 'demo_session';

            if (this.supabase && this.supabase.auth) {
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session && session.user) {
                    userId = session.user.id;
                    authMethod = 'supabase_session';
                    console.log('✅ Using authenticated user:', userId);
                }
            }

            // Call backend to import wallet
            const response = await fetch(`${this.apiBaseUrl}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    mnemonic: mnemonic,
                    authMethod: authMethod
                })
            });

            const result = await response.json();

            if (result.success && result.wallet) {
                console.log('✅ Wallet imported successfully:', result.wallet.address);
                
                // Store wallet locally
                this.currentWallet = result.wallet;
                localStorage.setItem('nemex_current_wallet', JSON.stringify(result.wallet));
                
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
        console.log('🔄 Sending transaction...');

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
                    memo: memo
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
console.log('🔧 Initializing Secure TON Wallet Manager...');
window.tonWalletManager = new TONWalletManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TONWalletManager;
}

console.log('✅ TON Wallet Manager loaded - Secure Version');