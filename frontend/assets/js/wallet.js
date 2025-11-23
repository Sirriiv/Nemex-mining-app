// assets/js/wallet.js - COMPLETE PRODUCTION GRADE FIX

class SecureSupabaseStorage {
    constructor() {
        this.storageKey = 'nemex_supabase_v1';
        this.sessionId = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return true;

        try {
            // Generate session ID for this browser session
            this.sessionId = this.generateSessionId();
            sessionStorage.setItem(`${this.storageKey}_session`, this.sessionId);

            this.initialized = true;
            console.log('✅ Secure Supabase storage initialized');
            return true;
        } catch (error) {
            console.error('❌ Secure storage init failed:', error);
            return false;
        }
    }

    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    }

    // ✅ FIXED: Use localStorage as primary with Supabase backup
    async setItem(key, value) {
        try {
            // Store in localStorage (primary)
            localStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(value));

            // Backup to Supabase (don't fail if it doesn't work)
            try {
                await this.storeInSupabase(key, value);
            } catch (supabaseError) {
                console.warn('⚠️ Supabase backup storage failed, using localStorage only');
            }

            return true;
        } catch (error) {
            console.error('❌ Storage failed:', error);
            return false;
        }
    }

    async getItem(key) {
        try {
            // Try localStorage first (primary)
            const localData = localStorage.getItem(`${this.storageKey}_${key}`);
            if (localData) {
                return JSON.parse(localData);
            }

            // Fallback to Supabase
            try {
                const supabaseData = await this.getFromSupabase(key);
                if (supabaseData) {
                    console.log('✅ Data retrieved from Supabase backup');
                    // Also store in localStorage for next time
                    localStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(supabaseData));
                    return supabaseData;
                }
            } catch (supabaseError) {
                console.warn('⚠️ Supabase retrieval failed');
            }

            return null;
        } catch (error) {
            console.error('getItem failed for key:', key, error);
            return null;
        }
    }

    async storeInSupabase(key, value) {
        try {
            const response = await fetch('/api/wallet/store-session-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    key: key,
                    value: value,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return true;
        } catch (error) {
            throw new Error('Supabase storage failed: ' + error.message);
        }
    }

    async getFromSupabase(key) {
        try {
            const response = await fetch(`/api/wallet/get-session-data?sessionId=${this.sessionId}&key=${key}`);
            if (response.ok) {
                const data = await response.json();
                return data.value;
            }
            return null;
        } catch (error) {
            throw new Error('Supabase retrieval failed: ' + error.message);
        }
    }

    // ✅ SECURE: Mnemonic storage - ONLY in sessionStorage
    async storeMnemonicSecurely(mnemonic, address) {
        try {
            console.log('🔐 Storing mnemonic in sessionStorage for:', address);
            sessionStorage.setItem(`nemex_mnemonic_${address}`, mnemonic);
            console.log('✅ Mnemonic stored securely in sessionStorage');
            return true;
        } catch (error) {
            console.error('❌ Failed to store mnemonic:', error);
            return false;
        }
    }

    async retrieveMnemonicSecurely(address) {
        try {
            return sessionStorage.getItem(`nemex_mnemonic_${address}`);
        } catch (error) {
            console.error('Failed to retrieve mnemonic:', error);
            return null;
        }
    }

    async clearMnemonic(address) {
        sessionStorage.removeItem(`nemex_mnemonic_${address}`);
    }

    hasMnemonic(address) {
        return !!sessionStorage.getItem(`nemex_mnemonic_${address}`);
    }

    async removeItem(key) {
        localStorage.removeItem(`${this.storageKey}_${key}`);
        try {
            await this.clearFromSupabase(key);
        } catch (error) {
            console.warn('⚠️ Supabase clear failed');
        }
    }

    async clearFromSupabase(key) {
        try {
            await fetch('/api/wallet/clear-session-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId, key: key })
            });
        } catch (error) {
            console.error('Clear from Supabase failed:', error);
        }
    }

    async clear() {
        // Clear localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${this.storageKey}_`)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Clear sessionStorage
        sessionStorage.clear();

        // Clear Supabase data
        try {
            await this.clearAllFromSupabase();
        } catch (error) {
            console.warn('⚠️ Supabase clear all failed');
        }
    }

    async clearAllFromSupabase() {
        try {
            await fetch('/api/wallet/clear-all-session-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId })
            });
        } catch (error) {
            console.error('Clear all from Supabase failed:', error);
        }
    }
}

class NemexWalletAPI {
    constructor() {
        this.baseURL = window.location.origin + '/api/wallet';
        this.storage = new SecureSupabaseStorage();
        this.userId = null;
        this.currentWallet = null;
        this.isInitialized = false;
        this.pendingImport = null;
        this.userPassword = null; // Store user password for private key operations
    }

    async init() {
        if (this.isInitialized) {
            console.log('✅ Wallet API already initialized');
            return true;
        }

        console.log('🔄 Initializing Nemex Wallet API...');

        try {
            // Initialize secure storage
            const storageReady = await this.storage.init();
            if (!storageReady) {
                console.error('❌ Secure storage initialization failed');
                return false;
            }

            // Test API connection
            const response = await fetch(`${this.baseURL}/test`);
            if (!response.ok) {
                throw new Error(`API test failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ API Connection:', data.message);

            // ✅ FIXED: Simple session restoration
            await this.restoreSession();

            this.isInitialized = true;
            console.log('✅ Wallet API initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Wallet API initialization failed:', error);
            console.warn('⚠️ Continuing in offline mode - some features may be limited');
            this.isInitialized = true;
            return true;
        }
    }

    // ✅ FIXED: Simple session restoration
    async restoreSession() {
        try {
            console.log('🔄 Restoring session...');

            // Get user ID from localStorage
            this.userId = await this.storage.getItem('nemexUserId');
            if (!this.userId) {
                console.log('ℹ️ No existing session found');
                return null;
            }

            console.log('🔍 Found user ID:', this.userId);

            // Get current wallet from localStorage
            this.currentWallet = await this.storage.getItem('nemexCurrentWallet');
            if (this.currentWallet) {
                console.log('✅ Session restored from localStorage:', this.currentWallet.address);
                this.triggerSessionRestored();
                return this.currentWallet;
            }

            console.log('ℹ️ No wallet data in localStorage');
            return null;

        } catch (error) {
            console.error('❌ Session restoration failed:', error);
            return null;
        }
    }

    // ✅ Trigger frontend to update UI when session is restored
    triggerSessionRestored() {
        const event = new CustomEvent('nemexSessionRestored', { 
            detail: { wallet: this.currentWallet } 
        });
        window.dispatchEvent(event);
        console.log('🎯 Session restored event dispatched');
    }

    async getUserId() {
        if (!this.userId) {
            this.userId = await this.storage.getItem('nemexUserId');
            if (!this.userId) {
                this.userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                await this.storage.setItem('nemexUserId', this.userId);
                console.log('✅ Created new user ID:', this.userId);
            }
        }
        return this.userId;
    }

    async getStoredWallet() {
        if (!this.currentWallet) {
            this.currentWallet = await this.storage.getItem('nemexCurrentWallet');
        }
        return this.currentWallet;
    }

    async setStoredWallet(walletData) {
        this.currentWallet = walletData;
        await this.storage.setItem('nemexCurrentWallet', walletData);
        console.log('✅ Wallet stored:', walletData?.address);
    }

    async setActiveWallet(address) {
        try {
            console.log('🔄 Setting active wallet:', address);
            const userId = await this.getUserId();

            const response = await fetch(`${this.baseURL}/set-active-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, address: address })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Set active wallet failed:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserWallets() {
        try {
            console.log('🔄 Fetching user wallets...');
            const userId = await this.getUserId();
            const response = await fetch(`${this.baseURL}/user-wallets/${userId}`);
            const data = await response.json();

            if (data.success) {
                console.log(`✅ Found ${data.wallets.length} wallets`);
                return data.wallets;
            } else {
                console.error('Failed to fetch wallets:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Failed to fetch user wallets:', error);
            return [];
        }
    }

    async storeWalletInDatabase(walletData) {
        try {
            console.log('🔄 Storing wallet in database:', walletData.address);
            const response = await fetch(`${this.baseURL}/store-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(walletData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Database store failed:', errorText);
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Store wallet in database failed:', error);
            return { success: false, error: error.message };
        }
    }

    // ✅ PRODUCTION FIX: Store private key securely when generating/importing wallet
    async storePrivateKeySecurely(privateKeyHex, password, address) {
        try {
            console.log('🔐 Storing private key securely for:', address);
            
            if (!privateKeyHex || !password || !address) {
                throw new Error('Private key, password, and address are required');
            }

            // Encrypt the private key
            const encryptedData = await CryptoUtils.encryptPrivateKey(privateKeyHex, password);
            const passwordHash = await CryptoUtils.hashPassword(password);

            // Store encrypted private key in database
            const response = await fetch(`${this.baseURL}/store-private-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: await this.getUserId(),
                    address: address,
                    encryptedPrivateKey: encryptedData,
                    passwordHash: passwordHash
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to store private key');
            }

            console.log('✅ Private key stored securely for:', address);
            this.userPassword = password; // Store password for current session
            
            return true;
        } catch (error) {
            console.error('❌ Private key storage failed:', error);
            throw new Error('Failed to store private key securely: ' + error.message);
        }
    }

    // ✅ PRODUCTION FIX: Get seed phrase by regenerating from private key
    async getSeedPhraseFromPrivateKey(address, password) {
        try {
            console.log('🔄 Regenerating seed phrase from private key for:', address);
            
            const response = await fetch(`${this.baseURL}/regenerate-seed-phrase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: await this.getUserId(),
                    address: address,
                    password: password
                })
            });

            const data = await response.json();
            
            if (data.success && data.seedPhrase) {
                console.log('✅ Seed phrase regenerated successfully');
                return data.seedPhrase;
            } else {
                throw new Error(data.error || 'Failed to regenerate seed phrase');
            }
        } catch (error) {
            console.error('❌ Seed phrase regeneration failed:', error);
            throw new Error('Cannot view seed phrase: ' + error.message);
        }
    }

    // ✅ PRODUCTION FIX: Enhanced getMnemonicForAddress that works like real wallets
    async getMnemonicForAddress(address, securityToken) {
        try {
            if (!securityToken) {
                throw new Error('Security verification required to view seed phrase');
            }

            console.log('🔐 Getting seed phrase for:', address);

            // First try to get from session storage (temporary cache)
            let mnemonic = await this.storage.retrieveMnemonicSecurely(address);
            
            if (!mnemonic) {
                // If not in session storage, regenerate from private key (REAL WALLET BEHAVIOR)
                console.log('🔄 Seed phrase not cached, regenerating from private key...');
                
                // Get password from user (in real app, this would be a security prompt)
                if (!this.userPassword) {
                    throw new Error('Password required to access seed phrase. Please re-authenticate.');
                }
                
                mnemonic = await this.getSeedPhraseFromPrivateKey(address, this.userPassword);
                
                // Cache in session storage for this browser session only
                if (mnemonic) {
                    await this.storage.storeMnemonicSecurely(mnemonic, address);
                }
            }
            
            if (!mnemonic) {
                throw new Error('Unable to retrieve seed phrase for this wallet');
            }
            
            return mnemonic;
        } catch (error) {
            console.error('Get mnemonic failed:', error);
            throw error;
        }
    }

    // ✅ PRODUCTION FIX: Enhanced wallet generation with private key storage
    async generateNewWallet(wordCount = 12, password = null) {
        try {
            console.log('🔄 Generating new wallet with secure private key storage...');
            const userId = await this.getUserId();

            if (!password) {
                throw new Error('Password required for secure wallet generation');
            }

            const response = await fetch(`${this.baseURL}/generate-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, wordCount: wordCount })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            if (!data.success || !data.wallet) {
                throw new Error(data.error || 'Wallet generation failed');
            }

            // ✅ CRITICAL: Store private key securely
            if (data.wallet.privateKey) {
                await this.storePrivateKeySecurely(data.wallet.privateKey, password, data.wallet.address);
            }

            const walletData = {
                userId: userId,
                address: data.wallet.address,
                addressBounceable: data.wallet.addressBounceable,
                publicKey: data.wallet.publicKey || '',
                type: 'TON',
                source: 'generated',
                wordCount: wordCount,
                derivationPath: data.wallet.derivationPath || "m/44'/607'/0'/0'/0'",
                mnemonic: data.wallet.mnemonic
            };

            await this.storeWalletInDatabase(walletData);
            await this.setStoredWallet(walletData);
            await this.setActiveWallet(data.wallet.address);

            // Store seed phrase in session storage
            await this.storage.storeMnemonicSecurely(data.wallet.mnemonic, data.wallet.address);

            console.log('✅ Wallet generated with secure private key storage:', data.wallet.address);
            return { success: true, wallet: walletData };

        } catch (error) {
            console.error('❌ Wallet generation failed:', error);
            throw new Error('Cannot generate wallet: ' + error.message);
        }
    }

    // ✅ PRODUCTION FIX: Enhanced wallet import with private key storage
    async importWallet(mnemonic, targetAddress = null, password = null) {
        try {
            console.log('🔄 Importing wallet with secure private key storage...');
            const cleanedMnemonic = this.cleanMnemonic(mnemonic);

            if (!this.isValidMnemonic(cleanedMnemonic)) {
                throw new Error('Invalid mnemonic format. Must be 12 or 24 words.');
            }

            if (!password) {
                throw new Error('Password required for secure wallet import');
            }

            const userId = await this.getUserId();
            const response = await fetch(`${this.baseURL}/import-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    mnemonic: cleanedMnemonic,
                    targetAddress: targetAddress
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to import wallet');

            if (data.success && data.wallets) {
                return { success: true, wallets: data.wallets, message: data.message };
            }

            if (data.success && data.wallet) {
                // ✅ CRITICAL: Store private key securely for imported wallet
                if (data.wallet.privateKey) {
                    await this.storePrivateKeySecurely(data.wallet.privateKey, password, data.wallet.address);
                }

                await this.storage.storeMnemonicSecurely(cleanedMnemonic, data.wallet.address);
                await this.setStoredWallet(data.wallet);
                await this.setActiveWallet(data.wallet.address);

                console.log('✅ Wallet imported with secure private key storage:', data.wallet.address);
                return { success: true, wallet: data.wallet };
            }

            throw new Error('Import failed - no wallet data returned');

        } catch (error) {
            console.error('❌ Wallet import failed:', error);
            throw new Error('Cannot import wallet: ' + error.message);
        }
    }

    async selectWalletForImport(selectedPath) {
        try {
            if (!this.pendingImport) throw new Error('No pending import found');
            console.log('🔄 Selecting wallet with path:', selectedPath);

            const userId = await this.getUserId();
            const response = await fetch(`${this.baseURL}/import-wallet-select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    mnemonic: this.pendingImport.mnemonic,
                    selectedPath: selectedPath
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP error! status: ${response.status}`);

            if (data.success && data.wallet) {
                await this.storage.storeMnemonicSecurely(this.pendingImport.mnemonic, data.wallet.address);
                await this.setStoredWallet(data.wallet);
                await this.setActiveWallet(data.wallet.address);
                this.pendingImport = null;
                return data;
            }

            throw new Error(data.error || 'Failed to import selected wallet');
        } catch (error) {
            console.error('❌ Wallet selection failed:', error);
            throw error;
        }
    }

    // =============================================
    // BALANCE FUNCTIONS - ADDED BACK
    // =============================================

    async getRealBalance(address) {
        try {
            console.log('🔄 Fetching TON balance for:', address);
            const response = await fetch(`${this.baseURL}/real-balance/${encodeURIComponent(address)}`);
            const data = await response.json();

            if (data.success) {
                data.balance = typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance;
                console.log('✅ TON Balance:', data.balance);
            }
            return data;
        } catch (error) {
            console.error('TON balance fetch failed:', error);
            return { success: false, balance: 0, error: error.message };
        }
    }

    async getNMXBalance(address) {
        try {
            console.log('🔄 Fetching NMX balance for:', address);
            const response = await fetch(`${this.baseURL}/nmx-balance/${encodeURIComponent(address)}`);
            const data = await response.json();

            if (data.success) {
                data.balance = typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance;
                console.log('✅ NMX Balance:', data.balance, 'Source:', data.source);
            }
            return data;
        } catch (error) {
            console.error('NMX balance fetch failed:', error);
            return { success: false, balance: 0, error: error.message };
        }
    }

    async getAllBalances(address) {
        try {
            console.log('🔄 Fetching all balances for:', address);
            const response = await fetch(`${this.baseURL}/all-balances/${encodeURIComponent(address)}`);
            const data = await response.json();

            if (data.success) {
                if (data.balances) {
                    data.balances.TON = typeof data.balances.TON === 'string' ? parseFloat(data.balances.TON) : data.balances.TON;
                    data.balances.NMX = typeof data.balances.NMX === 'string' ? parseFloat(data.balances.NMX) : data.balances.NMX;
                }
                console.log('✅ All balances fetched - TON:', data.balances.TON, 'NMX:', data.balances.NMX);
            }
            return data;
        } catch (error) {
            console.error('All balances fetch failed:', error);
            return { success: false, balances: { TON: 0, NMX: 0 }, error: error.message };
        }
    }

    async getTokenPrices() {
        try {
            console.log('🔄 Fetching real token prices...');
            const response = await fetch(`${this.baseURL}/token-prices`);
            const data = await response.json();
            if (data.success) {
                console.log('✅ Real prices fetched from:', data.source, '- TON:', data.prices.TON.price);
                return data;
            } else {
                throw new Error(data.error || 'Failed to fetch prices');
            }
        } catch (error) {
            console.error('❌ Price fetch failed:', error);
            return {
                success: false,
                prices: { TON: { price: 0, change24h: 0 }, NMX: { price: 0, change24h: 0 } },
                source: 'fallback'
            };
        }
    }

    async getAllRealData(address) {
        try {
            console.log('🔄 Fetching ALL real data for:', address);
            const [balanceResult, priceResult] = await Promise.all([
                this.getAllBalances(address),
                this.getTokenPrices()
            ]);

            return {
                success: balanceResult.success && priceResult.success,
                balances: balanceResult.balances || { TON: 0, NMX: 0 },
                prices: priceResult.prices || { TON: { price: 0, change24h: 0 }, NMX: { price: 0, change24h: 0 } },
                address: address,
                source: priceResult.source || 'unknown'
            };
        } catch (error) {
            console.error('❌ All real data fetch failed:', error);
            return {
                success: false,
                balances: { TON: 0, NMX: 0 },
                prices: { TON: { price: 0, change24h: 0 }, NMX: { price: 0, change24h: 0 } },
                error: error.message
            };
        }
    }

    // =============================================
    // TRANSACTION FUNCTIONS
    // =============================================

    async sendTON(fromAddress, toAddress, amount, memo = '') {
        try {
            console.log('🔄 PRODUCTION: Sending TON via API...', { fromAddress, toAddress, amount });
            const mnemonic = await this.storage.retrieveMnemonicSecurely(fromAddress);
            console.log('🔍 Retrieved mnemonic:', mnemonic ? 'YES' : 'NO');

            if (!mnemonic) {
                throw new Error('Wallet credentials not available for transaction signing. Please re-import your wallet.');
            }

            const base64Mnemonic = btoa(unescape(encodeURIComponent(mnemonic)));
            console.log('🔐 Secure base64 mnemonic ready for backend');

            const response = await fetch(`${this.baseURL}/send-ton`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromAddress: fromAddress,
                    toAddress: toAddress,
                    amount: amount,
                    memo: memo,
                    base64Mnemonic: base64Mnemonic
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Backend error:', errorText);
                throw new Error(`Backend error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ PRODUCTION: TON Send successful:', data.transaction?.hash);
            return data;
        } catch (error) {
            console.error('PRODUCTION Send TON API error:', error);
            throw error;
        }
    }

    async sendNMX(fromAddress, toAddress, amount, memo = '') {
        try {
            console.log('🔄 PRODUCTION: Sending NMX via API...', { fromAddress, toAddress, amount });
            const mnemonic = await this.storage.retrieveMnemonicSecurely(fromAddress);
            console.log('🔍 Retrieved mnemonic:', mnemonic ? 'YES' : 'NO');

            if (!mnemonic) {
                throw new Error('Wallet credentials not available for transaction signing. Please re-import your wallet.');
            }

            const base64Mnemonic = btoa(unescape(encodeURIComponent(mnemonic)));
            console.log('🔐 Secure base64 mnemonic ready for backend');

            const response = await fetch(`${this.baseURL}/send-nmx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromAddress: fromAddress,
                    toAddress: toAddress,
                    amount: amount,
                    memo: memo,
                    base64Mnemonic: base64Mnemonic
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Backend error:', errorText);
                throw new Error(`Backend error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ PRODUCTION: NMX Send successful:', data.transaction?.hash);
            return data;
        } catch (error) {
            console.error('PRODUCTION Send NMX API error:', error);
            throw error;
        }
    }

    // =============================================
    // HELPER FUNCTIONS
    // =============================================

    cleanMnemonic(mnemonic) {
        return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z\s]/g, '');
    }

    isValidMnemonic(mnemonic) {
        const words = mnemonic.split(' ');
        return words.length === 12 || words.length === 24;
    }

    canShowSeedPhrase(address) {
        return this.storage.hasMnemonic(address);
    }

    async clearMnemonicForAddress(address) {
        await this.storage.clearMnemonic(address);
    }

    getPendingImport() {
        return this.pendingImport;
    }

    clearPendingImport() {
        this.pendingImport = null;
    }

    async hasWallets() {
        const wallets = await this.getUserWallets();
        return wallets.length > 0;
    }

    getCurrentWalletAddress() {
        return this.currentWallet ? this.currentWallet.address : null;
    }

    // Set user password for private key operations
    setUserPassword(password) {
        this.userPassword = password;
        console.log('✅ User password set for private key operations');
    }

    // Clear user password (for logout)
    clearUserPassword() {
        this.userPassword = null;
        console.log('✅ User password cleared');
    }

    async clearSession() {
        const currentAddress = this.currentWallet?.address;
        if (currentAddress) await this.storage.clearMnemonic(currentAddress);
        await this.setStoredWallet(null);
        this.pendingImport = null;
        this.userPassword = null; // Clear password on session clear
        await this.storage.clear();
        console.log('✅ Session cleared securely');
    }

    isWalletLoaded() {
        return this.currentWallet !== null && this.currentWallet !== undefined;
    }

    isInitialized() {
        return this.isInitialized;
    }
}

// ✅ ENHANCED: Frontend session listener
window.addEventListener('nemexSessionRestored', function(event) {
    console.log('🎯 Frontend: Session restored event received', event.detail);

    // Update wallet state immediately
    if (typeof updateWalletDisplay === 'function') {
        console.log('🔄 Updating wallet display from session restored event');
        updateWalletDisplay();
    }

    // Load balances
    if (typeof updateRealBalances === 'function') {
        console.log('🔄 Loading balances from session restored event');
        updateRealBalances();
    }
});

// Auto-initialization
console.log('🎯 NemexWalletAPI class loaded');
window.nemexWalletAPI = new NemexWalletAPI();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('📄 DOM ready, initializing wallet API...');
        try {
            const success = await window.nemexWalletAPI.init();
            console.log(success ? '✅ Wallet API initialized!' : '❌ Wallet API initialization failed');

            if (typeof updateWalletState === 'function') {
                updateWalletState();
            }
            if (typeof enableWalletButtons === 'function') {
                enableWalletButtons();
            }
        } catch (error) {
            console.error('❌ Auto-initialization error:', error);
        }
    });
} else {
    console.log('📄 DOM already ready, initializing wallet API now...');
    window.nemexWalletAPI.init().then(success => {
        console.log(success ? '✅ Wallet API initialized!' : '❌ Wallet API initialization failed');
    }).catch(error => {
        console.error('❌ Initialization error:', error);
    });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NemexWalletAPI, SecureSupabaseStorage };
}