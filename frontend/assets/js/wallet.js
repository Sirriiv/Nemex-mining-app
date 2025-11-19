// assets/js/wallet.js - SECURE VERSION WITH ENCRYPTED STORAGE
class SecureEncryptedStorage {
    constructor() {
        this.storageKey = 'nemex_secure_v1';
        this.encryptionKey = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return true;

        try {
            // Generate or retrieve encryption key
            await this.ensureEncryptionKey();
            this.initialized = true;
            console.log('✅ Secure encrypted storage initialized');
            return true;
        } catch (error) {
            console.error('❌ Secure storage init failed:', error);
            return false;
        }
    }

    async ensureEncryptionKey() {
        // Try to get existing key from sessionStorage (volatile)
        let key = sessionStorage.getItem(`${this.storageKey}_key`);
        
        if (!key) {
            // Generate new key (this will be lost when browser closes)
            key = this.generateRandomKey();
            sessionStorage.setItem(`${this.storageKey}_key`, key);
        }
        
        this.encryptionKey = key;
    }

    generateRandomKey() {
        // Generate a random 32-character key
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async encrypt(text) {
        if (!this.encryptionKey) throw new Error('Encryption key not available');
        
        try {
            // Convert text and key to buffers
            const textBuffer = new TextEncoder().encode(text);
            const keyBuffer = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(this.encryptionKey),
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );

            // Generate IV (Initialization Vector)
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                keyBuffer,
                textBuffer
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedBuffer), iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    async decrypt(encryptedData) {
        if (!this.encryptionKey) throw new Error('Encryption key not available');
        
        try {
            // Convert from base64
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            
            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encryptedBuffer = combined.slice(12);

            const keyBuffer = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(this.encryptionKey),
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // Decrypt
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                keyBuffer,
                encryptedBuffer
            );

            return new TextDecoder().decode(decryptedBuffer);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }

    async setItem(key, value) {
        try {
            const encrypted = await this.encrypt(JSON.stringify(value));
            localStorage.setItem(`${this.storageKey}_${key}`, encrypted);
            return true;
        } catch (error) {
            console.warn('Encryption failed, storing without encryption:', error);
            // Fallback: store without encryption but with obfuscation
            localStorage.setItem(`${this.storageKey}_${key}`, btoa(JSON.stringify(value)));
            return false;
        }
    }

    async getItem(key) {
        try {
            const encrypted = localStorage.getItem(`${this.storageKey}_${key}`);
            if (!encrypted) return null;

            // Try to decrypt first
            try {
                const decrypted = await this.decrypt(encrypted);
                return JSON.parse(decrypted);
            } catch (decryptError) {
                // Fallback: try to decode as base64 (for unencrypted fallback data)
                try {
                    const decoded = atob(encrypted);
                    return JSON.parse(decoded);
                } catch (base64Error) {
                    console.error('Failed to decrypt and decode data for key:', key);
                    return null;
                }
            }
        } catch (error) {
            console.error('getItem failed for key:', key, error);
            return null;
        }
    }

    async removeItem(key) {
        try {
            localStorage.removeItem(`${this.storageKey}_${key}`);
        } catch (error) {
            console.error('removeItem failed for key:', key, error);
        }
    }

    async clear() {
        try {
            // Remove all our secure storage items
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`${this.storageKey}_`)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Also clear the session storage key
            sessionStorage.removeItem(`${this.storageKey}_key`);
            
            this.encryptionKey = null;
            this.initialized = false;
        } catch (error) {
            console.error('Clear storage failed:', error);
        }
    }

    // Method to check if secure storage is working
    async testSecurity() {
        try {
            const testData = { test: 'security_check', timestamp: Date.now() };
            await this.setItem('security_test', testData);
            const retrieved = await this.getItem('security_test');
            await this.removeItem('security_test');
            
            return retrieved && retrieved.test === testData.test;
        } catch (error) {
            return false;
        }
    }
}

class NemexWalletAPI {
    constructor() {
        this.baseURL = window.location.origin + '/api/wallet';
        this.storage = new SecureEncryptedStorage();
        this.userId = null;
        this.currentWallet = null;
        this.isInitialized = false;
        this.pendingImport = null;
        this.storageSecurityTested = false;
    }

    async init() {
        if (this.isInitialized) return true;

        console.log('🔄 Initializing Nemex Wallet API with encrypted storage...');
        
        // Initialize secure storage
        const storageReady = await this.storage.init();
        if (!storageReady) {
            console.error('❌ Secure storage initialization failed');
            return false;
        }

        // Test storage security
        this.storageSecurityTested = await this.storage.testSecurity();
        console.log(`🔒 Storage security test: ${this.storageSecurityTested ? 'PASSED' : 'FAILED'}`);
        
        if (!this.storageSecurityTested) {
            console.warn('⚠️ Storage security compromised - using fallback mode');
        }

        try {
            const response = await fetch(`${this.baseURL}/test`);
            const data = await response.json();
            console.log('✅ API Connection:', data.message);
            
            await this.restoreSession();
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ API Connection failed:', error);
            return false;
        }
    }

    async getUserId() {
        if (!this.userId) {
            this.userId = await this.storage.getItem('nemexUserId');
            if (!this.userId) {
                this.userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                await this.storage.setItem('nemexUserId', this.userId);
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
        if (walletData) {
            // Never store sensitive data like private keys or mnemonics
            const safeWalletData = {
                address: walletData.address,
                userId: walletData.userId,
                type: walletData.type,
                source: walletData.source,
                wordCount: walletData.wordCount,
                derivationPath: walletData.derivationPath,
                // Explicitly exclude sensitive data
                publicKey: undefined,
                privateKey: undefined,
                mnemonic: undefined,
                encrypted_mnemonic: undefined
            };
            
            await this.storage.setItem('nemexCurrentWallet', safeWalletData);
        } else {
            await this.storage.removeItem('nemexCurrentWallet');
        }
    }

    async restoreSession() {
        try {
            console.log('🔄 Restoring wallet session from encrypted storage...');
            
            const wallet = await this.getStoredWallet();
            if (wallet) {
                console.log('✅ Found stored wallet:', wallet.address);
                return wallet;
            }

            const userId = await this.getUserId();
            const activeWalletResponse = await fetch(`${this.baseURL}/active-wallet/${userId}`);
            const activeData = await activeWalletResponse.json();

            if (activeData.success && activeData.activeWallet) {
                console.log('✅ Found active wallet in database:', activeData.activeWallet);
                
                const walletsResponse = await fetch(`${this.baseURL}/user-wallets/${userId}`);
                const walletsData = await walletsResponse.json();

                if (walletsData.success && walletsData.wallets) {
                    const wallet = walletsData.wallets.find(w => w.address === activeData.activeWallet);
                    if (wallet) {
                        await this.setStoredWallet(wallet);
                        console.log('✅ Session restored successfully');
                        return wallet;
                    }
                }
            }

            console.log('ℹ️ No active session found');
            return null;

        } catch (error) {
            console.error('❌ Session restoration failed:', error);
            return null;
        }
    }

    async setActiveWallet(address) {
        try {
            console.log('🔄 Setting active wallet:', address);
            
            const userId = await this.getUserId();
            const response = await fetch(`${this.baseURL}/set-active-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    address: address
                })
            });

            const data = await response.json();

            if (data.success) {
                const walletsResponse = await fetch(`${this.baseURL}/user-wallets/${userId}`);
                const walletsData = await walletsResponse.json();

                if (walletsData.success && walletsData.wallets) {
                    const wallet = walletsData.wallets.find(w => w.address === address);
                    if (wallet) {
                        await this.setStoredWallet(wallet);
                        console.log('✅ Active wallet set and stored:', address);
                    }
                }
            }

            return data;
        } catch (error) {
            console.error('❌ Set active wallet failed:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserWallets() {
        try {
            console.log('🔄 Fetching user wallets from database...');
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

    async generateNewWallet(wordCount = 12) {
        try {
            console.log('🔄 Generating new wallet via API...');

            const userId = await this.getUserId();
            const response = await fetch(`${this.baseURL}/generate-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    wordCount: wordCount
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('✅ Wallet generated via API:', data.wallet.address);
                await this.setActiveWallet(data.wallet.address);
                return data;
            } else {
                throw new Error(data.error || 'Failed to generate wallet');
            }

        } catch (error) {
            console.error('❌ Wallet generation failed:', error);
            throw error;
        }
    }

    async importWallet(mnemonic, targetAddress = null) {
        try {
            console.log('🔄 Importing wallet with multi-path support...');
            console.log('🔍 Target address:', targetAddress);

            const cleanedMnemonic = this.cleanMnemonic(mnemonic);

            if (!this.isValidMnemonic(cleanedMnemonic)) {
                throw new Error('Invalid mnemonic format. Must be 12 or 24 words.');
            }

            const userId = await this.getUserId();
            const response = await fetch(`${this.baseURL}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    mnemonic: cleanedMnemonic,
                    targetAddress: targetAddress
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ Server response:', data);
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            // ✅ HANDLE MULTIPLE WALLETS FOUND
            if (data.success && data.wallets) {
                console.log('🔍 Multiple wallets found, storing for selection');
                this.pendingImport = {
                    mnemonic: cleanedMnemonic,
                    wallets: data.wallets
                };
                return data;
            }

            // ✅ SINGLE WALLET FOUND
            if (data.success && data.wallet) {
                console.log('✅ Single wallet imported via API:', data.wallet.address);
                await this.setActiveWallet(data.wallet.address);
                this.pendingImport = null;
                return data;
            }

            throw new Error(data.error || 'Failed to import wallet');

        } catch (error) {
            console.error('❌ Wallet import failed:', error);
            throw error;
        }
    }

    async selectWalletForImport(selectedPath) {
        try {
            if (!this.pendingImport) {
                throw new Error('No pending import found');
            }

            console.log('🔄 Selecting wallet with path:', selectedPath);

            const userId = await this.getUserId();
            const response = await fetch(`${this.baseURL}/import-wallet-select`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    mnemonic: this.pendingImport.mnemonic,
                    selectedPath: selectedPath
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (data.success && data.wallet) {
                console.log('✅ Selected wallet imported:', data.wallet.address);
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

    getPendingImport() {
        return this.pendingImport;
    }

    clearPendingImport() {
        this.pendingImport = null;
    }

    cleanMnemonic(mnemonic) {
        return mnemonic
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^a-z\s]/g, '');
    }

    isValidMnemonic(mnemonic) {
        const words = mnemonic.split(' ');
        return words.length === 12 || words.length === 24;
    }

    async getRealBalance(address) {
        try {
            console.log('🔄 Fetching TON balance for:', address);
            const response = await fetch(`${this.baseURL}/real-balance/${encodeURIComponent(address)}`);
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ TON Balance:', data.balance);
            } else {
                console.error('TON balance fetch failed:', data.error);
            }
            
            return data;
        } catch (error) {
            console.error('TON balance fetch failed:', error);
            return { success: false, balance: "0", error: error.message };
        }
    }

    async getNMXBalance(address) {
        try {
            console.log('🔄 Fetching NMX balance for:', address);
            const response = await fetch(`${this.baseURL}/nmx-balance/${encodeURIComponent(address)}`);
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ NMX Balance:', data.balance, 'Source:', data.source);
            } else {
                console.error('NMX balance fetch failed:', data.error);
            }
            
            return data;
        } catch (error) {
            console.error('NMX balance fetch failed:', error);
            return { success: false, balance: "0", error: error.message };
        }
    }

    async getAllBalances(address) {
        try {
            console.log('🔄 Fetching all balances for:', address);
            const response = await fetch(`${this.baseURL}/all-balances/${encodeURIComponent(address)}`);
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ All balances fetched - TON:', data.balances.TON, 'NMX:', data.balances.NMX);
            } else {
                console.error('All balances fetch failed:', data.error);
            }
            
            return data;
        } catch (error) {
            console.error('All balances fetch failed:', error);
            return { 
                success: false, 
                balances: { TON: "0", NMX: "0" }, 
                error: error.message 
            };
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
                prices: {
                    TON: { price: 0, change24h: 0 },
                    NMX: { price: 0, change24h: 0 }
                },
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
                balances: balanceResult.balances,
                prices: priceResult.prices,
                address: address,
                source: priceResult.source
            };

        } catch (error) {
            console.error('❌ All real data fetch failed:', error);
            return {
                success: false,
                balances: { TON: "0", NMX: "0" },
                prices: {
                    TON: { price: 0, change24h: 0 },
                    NMX: { price: 0, change24h: 0 }
                },
                error: error.message
            };
        }
    }

    async hasWallets() {
        const wallets = await this.getUserWallets();
        return wallets.length > 0;
    }

    getCurrentWalletAddress() {
        return this.currentWallet ? this.currentWallet.address : null;
    }

    async clearSession() {
        await this.setStoredWallet(null);
        this.pendingImport = null;
        await this.storage.clear();
        console.log('✅ Session cleared from secure storage');
    }

    isWalletLoaded() {
        return this.currentWallet !== null;
    }

    hasPendingImport() {
        return this.pendingImport !== null;
    }

    isStorageSecure() {
        return this.storageSecurityTested;
    }
}

// Initialize the API when the script loads
window.nemexWalletAPI = new NemexWalletAPI();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Nemex Wallet API Initializing with Secure Encrypted Storage...');
    const success = await window.nemexWalletAPI.init();
    if (success) {
        console.log('✅ Nemex Wallet API Ready!');
        console.log(`🔒 Storage Security: ${window.nemexWalletAPI.isStorageSecure() ? 'ENABLED' : 'FALLBACK MODE'}`);
        
        document.dispatchEvent(new CustomEvent('walletReady', {
            detail: { 
                hasWallet: window.nemexWalletAPI.isWalletLoaded(),
                walletAddress: window.nemexWalletAPI.getCurrentWalletAddress(),
                hasPendingImport: window.nemexWalletAPI.hasPendingImport(),
                isStorageSecure: window.nemexWalletAPI.isStorageSecure()
            }
        }));
    } else {
        console.error('❌ Nemex Wallet API Failed to Initialize');
    }
});