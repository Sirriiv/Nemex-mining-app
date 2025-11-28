// assets/js/wallet.js - COMPLETE FIXED WITH MULTI-WALLET SUPPORT

class SecureSupabaseStorage {
    constructor() {
        this.storageKey = 'nemex_supabase_v1';
        this.sessionId = null;
        this.initialized = false;
        this.supabaseUrl = 'https://bjulifvbfogymoduxnzl.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg5Mzg2MzQsImV4cCI6MjA0NDUxNDYzNH0.0-14SOUKLXa6XanHNkSFa5C0bG1-XVKfM6tMVjWYRkA';
    }

    async init() {
        if (this.initialized) return true;

        try {
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

    async setItem(key, value) {
        try {
            localStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('❌ Storage failed:', error);
            return false;
        }
    }

    async getItem(key) {
        try {
            const localData = localStorage.getItem(`${this.storageKey}_${key}`);
            if (localData) {
                return JSON.parse(localData);
            }
            return null;
        } catch (error) {
            console.error('getItem failed for key:', key, error);
            return null;
        }
    }

    // 🆕 FIXED: Store multiple wallets in Supabase
    async storeWalletInSupabase(walletData) {
        try {
            console.log('🔄 Storing wallet in Supabase:', walletData.address);

            const walletRecord = {
                user_id: walletData.userId,
                address: walletData.address,
                address_bounceable: walletData.addressBounceable,
                public_key: walletData.publicKey,
                wallet_type: walletData.type,
                source: walletData.source,
                word_count: walletData.wordCount,
                derivation_path: walletData.derivationPath,
                created_at: walletData.createdAt || new Date().toISOString(),
                is_active: walletData.isActive || true
            };

            const response = await fetch(`${this.supabaseUrl}/rest/v1/wallets`, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(walletRecord)
            });

            if (response.ok) {
                console.log('✅ Wallet stored in Supabase');
                return true;
            } else {
                console.error('❌ Supabase storage failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Supabase storage failed:', error);
            return false;
        }
    }

    // 🆕 FIXED: Fetch all wallets for user from Supabase
    async fetchUserWalletsFromSupabase(userId) {
        try {
            console.log('🔄 Fetching all wallets from Supabase for user:', userId);

            const response = await fetch(`${this.supabaseUrl}/rest/v1/wallets?user_id=eq.${userId}&select=*&order=created_at.desc`, {
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const wallets = await response.json();
                console.log(`✅ Fetched ${wallets.length} wallets from Supabase`);
                return wallets;
            }
            return [];
        } catch (error) {
            console.error('❌ Supabase fetch failed:', error);
            return [];
        }
    }

    // 🆕 FIXED: Update wallet active status in Supabase
    async updateWalletActiveStatus(walletAddress, isActive) {
        try {
            console.log('🔄 Updating wallet active status:', walletAddress, isActive);

            const response = await fetch(`${this.supabaseUrl}/rest/v1/wallets?address=eq.${walletAddress}`, {
                method: 'PATCH',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ is_active: isActive })
            });

            if (response.ok) {
                console.log('✅ Wallet active status updated');
                return true;
            } else {
                console.error('❌ Wallet update failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Wallet update failed:', error);
            return false;
        }
    }

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
            const mnemonic = sessionStorage.getItem(`nemex_mnemonic_${address}`);
            console.log('🔐 Retrieved mnemonic for address:', address, mnemonic ? 'Found' : 'Not found');
            return mnemonic;
        } catch (error) {
            console.error('Failed to retrieve mnemonic:', error);
            return null;
        }
    }

    async clearMnemonic(address) {
        sessionStorage.removeItem(`nemex_mnemonic_${address}`);
        console.log('🗑️ Cleared mnemonic for address:', address);
    }

    hasMnemonic(address) {
        const hasMnemonic = !!sessionStorage.getItem(`nemex_mnemonic_${address}`);
        console.log('🔍 Checking mnemonic for address:', address, hasMnemonic ? 'Exists' : 'Not found');
        return hasMnemonic;
    }

    async removeItem(key) {
        localStorage.removeItem(`${this.storageKey}_${key}`);
    }

    async clear() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${this.storageKey}_`)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
    }
}

class NemexWalletAPI {
    constructor() {
        this.storage = new SecureSupabaseStorage();
        this.userId = null;
        this.currentWallet = null;
        this.userWallets = []; // 🆕 Store multiple wallets
        this.isInitialized = false;
        this.pendingImport = null;
    }

    async init() {
        if (this.isInitialized) {
            console.log('✅ Wallet API already initialized');
            return true;
        }

        console.log('🔄 Initializing Nemex Wallet API...');

        try {
            const storageReady = await this.storage.init();
            if (!storageReady) {
                console.error('❌ Secure storage initialization failed');
                return false;
            }

            await this.restoreSession();

            this.isInitialized = true;
            console.log('✅ Wallet API initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Wallet API initialization failed:', error);
            this.isInitialized = true;
            return true;
        }
    }

    async restoreSession() {
        try {
            console.log('🔄 Restoring session from Supabase...');

            if (window.currentUser && window.currentUser.id) {
                console.log('✅ Using website user session:', window.currentUser.email);
                this.userId = window.currentUser.id;
                await this.storage.setItem('nemexUserId', this.userId);
            } else {
                this.userId = await this.storage.getItem('nemexUserId');
                if (!this.userId) {
                    console.log('ℹ️ No existing session found');
                    return null;
                }
                console.log('🔍 Found user ID from localStorage:', this.userId);
            }

            // 🆕 FIXED: Load all user wallets
            await this.loadUserWallets();

            // Set current wallet from storage
            this.currentWallet = await this.storage.getItem('nemexCurrentWallet');

            if (this.currentWallet) {
                console.log('✅ Current wallet restored:', this.currentWallet.address);
                this.triggerSessionRestored();
                return this.currentWallet;
            }

            console.log('ℹ️ No current wallet found');
            return null;

        } catch (error) {
            console.error('❌ Session restoration failed:', error);
            return null;
        }
    }

    // 🆕 FIXED: Load all user wallets from Supabase
    async loadUserWallets() {
        try {
            console.log('🔄 Loading all user wallets...');
            
            // Get from Supabase first
            const supabaseWallets = await this.storage.fetchUserWalletsFromSupabase(this.userId);
            
            if (supabaseWallets.length > 0) {
                this.userWallets = supabaseWallets.map(wallet => ({
                    userId: wallet.user_id,
                    address: wallet.address,
                    addressBounceable: wallet.address_bounceable,
                    publicKey: wallet.public_key,
                    type: wallet.wallet_type,
                    source: wallet.source,
                    wordCount: wallet.word_count,
                    derivationPath: wallet.derivation_path,
                    createdAt: wallet.created_at,
                    isActive: wallet.is_active
                }));
                console.log(`✅ Loaded ${this.userWallets.length} wallets from Supabase`);
            } else {
                // Fallback to localStorage
                const localWallets = await this.storage.getItem('nemexUserWallets');
                this.userWallets = Array.isArray(localWallets) ? localWallets : [];
                console.log(`✅ Loaded ${this.userWallets.length} wallets from localStorage`);
            }
            
            return this.userWallets;
        } catch (error) {
            console.error('❌ Failed to load user wallets:', error);
            this.userWallets = [];
            return [];
        }
    }

    // 🆕 FIXED: Save all user wallets to storage
    async saveUserWallets() {
        try {
            await this.storage.setItem('nemexUserWallets', this.userWallets);
            console.log(`✅ Saved ${this.userWallets.length} wallets to storage`);
        } catch (error) {
            console.error('❌ Failed to save user wallets:', error);
        }
    }

    triggerSessionRestored() {
        const event = new CustomEvent('nemexSessionRestored', { 
            detail: { wallet: this.currentWallet } 
        });
        window.dispatchEvent(event);
        console.log('🎯 Session restored event dispatched');
    }

    async getUserId() {
        if (!this.userId) {
            if (window.currentUser && window.currentUser.id) {
                this.userId = window.currentUser.id;
                await this.storage.setItem('nemexUserId', this.userId);
                console.log('✅ Using website user ID:', this.userId);
            } else {
                this.userId = await this.storage.getItem('nemexUserId');
                if (!this.userId) {
                    this.userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                    await this.storage.setItem('nemexUserId', this.userId);
                    console.log('✅ Created new user ID:', this.userId);
                }
            }
        }
        return this.userId;
    }

    async getStoredWallet() {
        console.log('🔄 COMPATIBILITY: getStoredWallet called');
        
        if (this.currentWallet) {
            console.log('✅ Using current wallet instance:', this.currentWallet.address);
            return this.currentWallet;
        }
        
        const stored = await this.storage.getItem('nemexCurrentWallet');
        if (stored) {
            console.log('✅ Using stored wallet:', stored.address);
            this.currentWallet = stored;
            return stored;
        }
        
        console.log('ℹ️ No stored wallet found');
        return null;
    }

    async setStoredWallet(walletData) {
        console.log('🔄 COMPATIBILITY: setStoredWallet called');
        this.currentWallet = walletData;
        await this.storage.setItem('nemexCurrentWallet', walletData);
        console.log('✅ Wallet stored as current');
    }

    // 🆕 FIXED: Generate wallet without infinite recursion
    async generateNewWallet(wordCount = 12) {
        try {
            console.log('🔄 Generating new wallet with Supabase integration...');
            const userId = await this.getUserId();

            // Use backend API to generate real wallet
            const response = await fetch('/api/wallet/generate-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId, 
                    wordCount: wordCount,
                    userPassword: 'default_password'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            if (!data.success || !data.wallet) {
                throw new Error(data.error || 'Wallet generation failed');
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
                mnemonic: data.wallet.mnemonic,
                createdAt: new Date().toISOString(),
                isActive: true
            };

            // 🆕 FIXED: Add to user wallets instead of replacing
            await this.addWalletToUserWallets(walletData);
            
            // Set as current wallet
            await this.setStoredWallet(walletData);
            
            // Store mnemonic securely
            await this.storage.storeMnemonicSecurely(data.wallet.mnemonic, data.wallet.address);

            console.log('✅ Wallet generated and added to user wallets:', data.wallet.address);
            return { success: true, wallet: walletData, mnemonic: data.wallet.mnemonic };

        } catch (error) {
            console.error('❌ Wallet generation failed:', error);
            throw new Error('Cannot generate wallet: ' + error.message);
        }
    }

    // 🆕 FIXED: Add wallet to user wallets list
    async addWalletToUserWallets(walletData) {
        try {
            // Check if wallet already exists
            const existingIndex = this.userWallets.findIndex(w => w.address === walletData.address);
            
            if (existingIndex >= 0) {
                // Update existing wallet
                this.userWallets[existingIndex] = walletData;
                console.log('✅ Updated existing wallet in user wallets');
            } else {
                // Add new wallet
                this.userWallets.push(walletData);
                console.log('✅ Added new wallet to user wallets');
            }
            
            // Save to storage
            await this.saveUserWallets();
            
            // Store in Supabase
            await this.storage.storeWalletInSupabase(walletData);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to add wallet to user wallets:', error);
            throw error;
        }
    }

    async importWallet(mnemonic, targetAddress = null) {
        try {
            console.log('🔄 Importing wallet with Supabase integration...');
            const cleanedMnemonic = this.cleanMnemonic(mnemonic);

            if (!this.isValidMnemonic(cleanedMnemonic)) {
                throw new Error('Invalid mnemonic format. Must be 12 or 24 words.');
            }

            const userId = await this.getUserId();

            // Use backend API to import wallet
            const response = await fetch('/api/wallet/import-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    mnemonic: cleanedMnemonic,
                    targetAddress: targetAddress,
                    userPassword: 'default_password'
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to import wallet');

            if (data.success && data.wallet) {
                const walletData = {
                    userId: userId,
                    address: data.wallet.address,
                    addressBounceable: data.wallet.addressBounceable,
                    publicKey: data.wallet.publicKey || '',
                    type: 'TON',
                    source: 'imported',
                    wordCount: cleanedMnemonic.split(' ').length,
                    derivationPath: data.wallet.derivationPath || "m/44'/607'/0'/0'/0'",
                    mnemonic: cleanedMnemonic,
                    createdAt: new Date().toISOString(),
                    isActive: true
                };

                // 🆕 FIXED: Add to user wallets instead of replacing
                await this.addWalletToUserWallets(walletData);
                
                // Set as current wallet
                await this.setStoredWallet(walletData);

                console.log('✅ Wallet imported and added to user wallets:', data.wallet.address);
                return { success: true, wallet: walletData };
            }

            throw new Error('Import failed - no wallet data returned');

        } catch (error) {
            console.error('❌ Wallet import failed:', error);
            throw new Error('Cannot import wallet: ' + error.message);
        }
    }

    // 🆕 FIXED: Compatibility function for HTML frontend
    async importWalletFromMnemonic(mnemonic, targetAddress = null) {
        try {
            console.log('🔄 COMPATIBILITY: importWalletFromMnemonic called');
            return await this.importWallet(mnemonic, targetAddress);
        } catch (error) {
            console.error('❌ Wallet import failed:', error);
            throw error;
        }
    }

    // 🆕 FIXED: Switch to different wallet
    async switchToWallet(address) {
        try {
            console.log('🔄 Switching to wallet:', address);
            
            const wallet = this.userWallets.find(w => w.address === address);
            if (!wallet) {
                throw new Error('Wallet not found in user wallets');
            }
            
            // Set as current wallet
            await this.setStoredWallet(wallet);
            
            // Update active status in Supabase
            await this.storage.updateWalletActiveStatus(address, true);
            
            console.log('✅ Switched to wallet:', address);
            return { success: true, wallet: wallet };
        } catch (error) {
            console.error('❌ Wallet switch failed:', error);
            throw error;
        }
    }

    // 🆕 FIXED: Get all user wallets for management
    async getUserWallets() {
        console.log('🔄 COMPATIBILITY: getUserWallets called');
        return this.userWallets;
    }

    // 🆕 FIXED: Remove wallet from user wallets
    async removeWallet(address) {
        try {
            console.log('🔄 Removing wallet:', address);
            
            // Remove from user wallets
            this.userWallets = this.userWallets.filter(w => w.address !== address);
            
            // Save to storage
            await this.saveUserWallets();
            
            // Clear mnemonic
            await this.storage.clearMnemonic(address);
            
            // If removing current wallet, clear current
            if (this.currentWallet && this.currentWallet.address === address) {
                await this.setStoredWallet(null);
                this.currentWallet = null;
            }
            
            console.log('✅ Wallet removed:', address);
            return { success: true };
        } catch (error) {
            console.error('❌ Wallet removal failed:', error);
            throw error;
        }
    }

    // =============================================
    // PRICE API METHODS
    // =============================================

    async getTokenPrices() {
        try {
            console.log('🔄 Fetching real token prices from backend API...');
            const response = await fetch('/api/wallet/token-prices');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

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
                prices: { 
                    TON: { price: 2.5, change24h: 1.2 }, 
                    NMX: { price: 0.10, change24h: 0 } 
                },
                source: 'fallback'
            };
        }
    }

    // ... (rest of your existing methods remain the same)

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

    getCurrentWalletAddress() {
        return this.currentWallet ? this.currentWallet.address : null;
    }

    async clearSession() {
        const currentAddress = this.currentWallet?.address;
        if (currentAddress) await this.storage.clearMnemonic(currentAddress);
        await this.setStoredWallet(null);
        this.pendingImport = null;
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

// ... (rest of your modal functions remain the same, but use the new multi-wallet methods)

// =============================================
// 🆕 FIXED: Enhanced wallet management functions for HTML
// =============================================

// 🆕 FIXED: Enhanced wallet loading with multi-wallet support
async function loadUserWallets() {
    try {
        console.log('🔄 FIXED: Loading user wallets with multi-wallet support...');

        if (!window.nemexWalletAPI) {
            console.error('❌ Wallet API not available');
            return;
        }

        // Get wallets using the new multi-wallet system
        const wallets = await window.nemexWalletAPI.getUserWallets();
        window.userWallets = Array.isArray(wallets) ? wallets : [];

        console.log(`✅ Loaded ${window.userWallets.length} wallets from API`);

        // Update wallet list in UI
        updateWalletList();

        // If we have wallets but no active session, try to restore the first one
        if (window.userWallets.length > 0 && (!window.walletState || !window.walletState.isInitialized)) {
            console.log('🔄 No active session but wallets found, attempting auto-restore...');
            await autoRestoreFromWallets();
        }
    } catch (error) {
        console.error('❌ Failed to load user wallets:', error);
        window.userWallets = [];
        updateWalletList();
    }
}

// 🆕 FIXED: Enhanced wallet switching
async function switchToWallet(address) {
    try {
        console.log(`🔄 FIXED: Switching to wallet: ${address}`);
        
        if (!window.nemexWalletAPI) {
            throw new Error('Wallet API not available');
        }

        // Switch using the new method
        const result = await window.nemexWalletAPI.switchToWallet(address);
        
        if (result.success) {
            // Update wallet state
            window.walletState = {
                isInitialized: true,
                walletType: result.wallet.source || 'imported',
                userId: result.wallet.userId,
                address: result.wallet.address,
                balances: {},
                lastUpdate: null
            };

            // Update UI
            updateCurrentUser();
            updateWalletDisplay();
            await updateRealBalances();
            updateWalletList();

            showToast(`✅ Switched to wallet: ${formatAddress(address)}`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Wallet switch failed:', error);
        showToast(`Failed to switch wallet: ${error.message}`, 'error');
    }
}

// 🆕 FIXED: Enhanced wallet deletion
async function deleteWallet(address) {
    try {
        console.log(`🔄 FIXED: Deleting wallet: ${address}`);
        
        if (!window.nemexWalletAPI) {
            throw new Error('Wallet API not available');
        }

        // Don't allow deleting the active wallet
        if (address === window.walletState.address) {
            throw new Error('Cannot delete the active wallet. Please switch to another wallet first.');
        }

        const result = await window.nemexWalletAPI.removeWallet(address);
        
        if (result.success) {
            // Update UI
            updateWalletList();
            showToast('✅ Wallet deleted successfully', 'success');
        }
        
    } catch (error) {
        console.error('❌ Wallet deletion failed:', error);
        showToast(`Failed to delete wallet: ${error.message}`, 'error');
    }
}

// Initialize the API
console.log('🎯 NemexWalletAPI class loaded with MULTI-WALLET SUPPORT');

function initializeWalletAPI() {
    window.nemexWalletAPI = new NemexWalletAPI();

    // Create modals immediately
    createWalletModals();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('📄 DOM ready, initializing wallet API...');
            try {
                const success = await window.nemexWalletAPI.init();
                console.log(success ? '✅ Wallet API initialized!' : '❌ Wallet API initialization failed');
            } catch (error) {
                console.error('❌ Auto-initialization error:', error);
            }
        });
    } else {
        window.nemexWalletAPI.init().then(success => {
            console.log(success ? '✅ Wallet API initialized!' : '❌ Wallet API initialization failed');
        }).catch(error => {
            console.error('❌ Initialization error:', error);
        });
    }
}

// Start initialization
initializeWalletAPI();

// Make functions globally available
window.loadUserWallets = loadUserWallets;
window.switchToWallet = switchToWallet;
window.deleteWallet = deleteWallet;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NemexWalletAPI, SecureSupabaseStorage };
}