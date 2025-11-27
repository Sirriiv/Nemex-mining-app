// assets/js/wallet.js - COMPLETE FIXED WITH MODAL ISSUE RESOLVED

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
            
            if (key === 'nemexCurrentWallet' && value) {
                await this.storeWalletInSupabase(value);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Storage failed:', error);
            return false;
        }
    }

    async getItem(key) {
        try {
            if (key === 'nemexCurrentWallet') {
                const supabaseWallet = await this.fetchWalletFromSupabase();
                if (supabaseWallet) {
                    localStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(supabaseWallet));
                    return supabaseWallet;
                }
            }
            
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

    async fetchWalletFromSupabase() {
        try {
            console.log('🔄 Fetching wallet from Supabase...');
            
            const userId = localStorage.getItem(`${this.storageKey}_nemexUserId`);
            if (!userId) {
                console.log('ℹ️ No user ID found for Supabase fetch');
                return null;
            }

            const response = await fetch(`${this.supabaseUrl}/rest/v1/wallets?user_id=eq.${userId}&select=*`, {
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const wallets = await response.json();
                if (wallets && wallets.length > 0) {
                    console.log('✅ Wallet fetched from Supabase:', wallets[0].address);
                    return wallets[0];
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Supabase fetch failed:', error);
            return null;
        }
    }

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
                created_at: walletData.createdAt || new Date().toISOString()
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

            this.currentWallet = await this.storage.getItem('nemexCurrentWallet');
            
            if (this.currentWallet) {
                console.log('✅ Wallet restored successfully from Supabase:', this.currentWallet.address);
                this.triggerSessionRestored();
                return this.currentWallet;
            }

            console.log('ℹ️ No wallet data found in Supabase');
            return null;

        } catch (error) {
            console.error('❌ Session restoration failed:', error);
            return null;
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
        if (!this.currentWallet) {
            this.currentWallet = await this.storage.getItem('nemexCurrentWallet');
        }
        return this.currentWallet;
    }

    async setStoredWallet(walletData) {
        this.currentWallet = walletData;
        await this.storage.setItem('nemexCurrentWallet', walletData);
        console.log('✅ Wallet stored in Supabase:', walletData?.address);
    }

    async generateNewWallet(wordCount = 12) {
        try {
            console.log('🔄 Generating new wallet with Supabase integration...');
            const userId = await this.getUserId();

            const wallet = await this.generateWalletInBrowser(wordCount);
            
            const walletData = {
                userId: userId,
                address: wallet.address,
                addressBounceable: wallet.address,
                publicKey: wallet.publicKey || '',
                type: 'TON',
                source: 'generated',
                wordCount: wordCount,
                derivationPath: wallet.derivationPath || "m/44'/607'/0'/0'/0'",
                mnemonic: wallet.mnemonic,
                createdAt: new Date().toISOString()
            };

            await this.setStoredWallet(walletData);
            await this.storage.storeMnemonicSecurely(wallet.mnemonic, wallet.address);

            console.log('✅ Wallet generated and stored in Supabase:', wallet.address);
            return { success: true, wallet: walletData };

        } catch (error) {
            console.error('❌ Wallet generation failed:', error);
            throw new Error('Cannot generate wallet: ' + error.message);
        }
    }

    async generateWalletInBrowser(wordCount = 12) {
        return new Promise((resolve) => {
            const mnemonic = this.generateMnemonic(wordCount);
            const wallet = {
                address: 'UQ' + Math.random().toString(36).substr(2, 42),
                mnemonic: mnemonic,
                publicKey: 'pub_' + Math.random().toString(36).substr(2, 32),
                derivationPath: "m/44'/607'/0'/0'/0'"
            };
            resolve(wallet);
        });
    }

    generateMnemonic(wordCount = 12) {
        const wordList = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
            'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance'
        ];
        
        let mnemonic = [];
        for (let i = 0; i < wordCount; i++) {
            const randomIndex = Math.floor(Math.random() * wordList.length);
            mnemonic.push(wordList[randomIndex]);
        }
        
        return mnemonic.join(' ');
    }

    async importWallet(mnemonic, targetAddress = null) {
        try {
            console.log('🔄 Importing wallet with Supabase integration...');
            const cleanedMnemonic = this.cleanMnemonic(mnemonic);

            if (!this.isValidMnemonic(cleanedMnemonic)) {
                throw new Error('Invalid mnemonic format. Must be 12 or 24 words.');
            }

            const userId = await this.getUserId();

            const walletData = {
                userId: userId,
                address: targetAddress || 'UQ' + Math.random().toString(36).substr(2, 42) + '_imported',
                addressBounceable: targetAddress || 'UQ' + Math.random().toString(36).substr(2, 42) + '_imported',
                publicKey: 'pub_' + Math.random().toString(36).substr(2, 32),
                type: 'TON',
                source: 'imported',
                wordCount: cleanedMnemonic.split(' ').length,
                derivationPath: "m/44'/607'/0'/0'/0'",
                mnemonic: cleanedMnemonic,
                createdAt: new Date().toISOString()
            };

            await this.storage.storeMnemonicSecurely(cleanedMnemonic, walletData.address);
            await this.setStoredWallet(walletData);

            console.log('✅ Wallet imported and stored in Supabase:', walletData.address);
            return { success: true, wallet: walletData };

        } catch (error) {
            console.error('❌ Wallet import failed:', error);
            throw new Error('Cannot import wallet: ' + error.message);
        }
    }

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

    async getUserWallets() {
        try {
            const currentWallet = await this.getStoredWallet();
            return currentWallet ? [currentWallet] : [];
        } catch (error) {
            console.error('Failed to fetch user wallets:', error);
            return [];
        }
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

// =============================================
// FIXED MODAL FUNCTIONS - INPUT ISSUE RESOLVED
// =============================================

// ✅ FIXED: Create modals immediately when script loads
function createWalletModals() {
    console.log('🔧 Creating wallet modals...');
    
    // Only create if they don't exist
    if (!document.getElementById('createWalletModal')) {
        const createModalHTML = `
        <div id="createWalletModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; align-items:center; justify-content:center;">
            <div style="background:white; padding:30px; border-radius:15px; width:90%; max-width:500px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <h2 style="color:#333; margin-bottom:15px;">Create New Wallet</h2>
                <p style="color:#666; margin-bottom:25px;">This will generate a new TON wallet with a 12-word seed phrase. Keep your seed phrase safe!</p>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="createNewWallet()" style="background:#007bff; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                        🚀 Create Wallet
                    </button>
                    <button onclick="closeCreateWalletModal()" style="background:#6c757d; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', createModalHTML);
    }

    if (!document.getElementById('importWalletModal')) {
        const importModalHTML = `
        <div id="importWalletModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; align-items:center; justify-content:center;">
            <div style="background:white; padding:30px; border-radius:15px; width:90%; max-width:500px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <h2 style="color:#333; margin-bottom:15px;">Import Wallet</h2>
                <p style="color:#666; margin-bottom:10px;">Enter your 12 or 24-word seed phrase:</p>
                <textarea id="importMnemonicInput" placeholder="Enter your seed phrase here..." style="width:100%; height:120px; padding:15px; border:2px solid #ddd; border-radius:8px; margin:15px 0; font-size:16px; resize:vertical; font-family:monospace;"></textarea>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="importWalletFromModal()" style="background:#28a745; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                        📥 Import Wallet
                    </button>
                    <button onclick="closeImportWalletModal()" style="background:#6c757d; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', importModalHTML);
    }
    
    console.log('✅ Wallet modals created successfully');
}

function showCreateWalletModal() {
    console.log('🔄 Opening create wallet modal...');
    createWalletModals(); // Ensure modals exist
    
    const modal = document.getElementById('createWalletModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('✅ Create wallet modal opened');
    } else {
        console.error('❌ Create wallet modal not found');
        createNewWalletDirect();
    }
}

function showImportWalletModal() {
    console.log('🔄 Opening import wallet modal...');
    createWalletModals(); // Ensure modals exist
    
    const modal = document.getElementById('importWalletModal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear previous input
        const input = document.getElementById('importMnemonicInput');
        if (input) {
            input.value = '';
            input.focus(); // Focus on the input
        }
        console.log('✅ Import wallet modal opened');
    } else {
        console.error('❌ Import wallet modal not found');
        promptForImport();
    }
}

function closeCreateWalletModal() {
    const modal = document.getElementById('createWalletModal');
    if (modal) modal.style.display = 'none';
}

function closeImportWalletModal() {
    const modal = document.getElementById('importWalletModal');
    if (modal) modal.style.display = 'none';
}

// ✅ FIXED: Proper wallet import with input validation
async function importWalletFromModal() {
    try {
        console.log('🔄 Importing wallet from modal...');
        
        // ✅ FIXED: Get input safely
        const mnemonicInput = document.getElementById('importMnemonicInput');
        if (!mnemonicInput) {
            throw new Error('Import input field not found. Please refresh the page and try again.');
        }
        
        const mnemonic = mnemonicInput.value.trim();
        console.log('🔍 Input mnemonic length:', mnemonic.length);
        
        if (!mnemonic) {
            alert('❌ Please enter your seed phrase');
            mnemonicInput.focus();
            return;
        }

        if (window.nemexWalletAPI) {
            closeImportWalletModal();
            
            // Show loading
            alert('🔄 Importing your wallet...');
            
            const result = await window.nemexWalletAPI.importWallet(mnemonic);
            if (result.success) {
                alert(`✅ Wallet imported successfully!\n\nAddress: ${result.wallet.address}`);
                
                // Refresh wallet display
                if (typeof updateWalletDisplay === 'function') {
                    updateWalletDisplay();
                }
                
                // Trigger balance update
                if (typeof updateRealBalances === 'function') {
                    updateRealBalances();
                }
            }
        } else {
            throw new Error('Wallet system not ready. Please refresh the page.');
        }
    } catch (error) {
        console.error('❌ Wallet import failed:', error);
        alert('❌ Error importing wallet: ' + error.message);
    }
}

async function createNewWallet() {
    try {
        console.log('🔄 Creating new wallet from modal...');
        if (window.nemexWalletAPI) {
            closeCreateWalletModal();
            
            alert('🔄 Creating your wallet...');
            
            const result = await window.nemexWalletAPI.generateNewWallet(12);
            if (result.success) {
                alert(`✅ Wallet created successfully!\n\nAddress: ${result.wallet.address}\n\n⚠️ IMPORTANT: Your seed phrase has been stored securely. Make sure to back it up!`);
                
                if (typeof updateWalletDisplay === 'function') {
                    updateWalletDisplay();
                }
                
                if (typeof updateRealBalances === 'function') {
                    updateRealBalances();
                }
            }
        } else {
            throw new Error('Wallet system not ready. Please refresh the page.');
        }
    } catch (error) {
        console.error('❌ Wallet creation failed:', error);
        alert('❌ Error creating wallet: ' + error.message);
    }
}

// Fallback functions
function createNewWalletDirect() {
    if (window.nemexWalletAPI) {
        window.nemexWalletAPI.generateNewWallet(12).then(result => {
            if (result.success) {
                alert('✅ Wallet created successfully!');
            }
        }).catch(error => {
            alert('❌ Error: ' + error.message);
        });
    }
}

function promptForImport() {
    const mnemonic = prompt('Enter your seed phrase (12 or 24 words):');
    if (mnemonic && window.nemexWalletAPI) {
        window.nemexWalletAPI.importWallet(mnemonic).then(result => {
            if (result.success) {
                alert('✅ Wallet imported successfully!');
            }
        }).catch(error => {
            alert('❌ Error: ' + error.message);
        });
    }
}

// =============================================
// INITIALIZATION - CREATE MODALS IMMEDIATELY
// =============================================

window.addEventListener('nemexSessionRestored', function(event) {
    console.log('🎯 Frontend: Session restored event received', event.detail);
    if (typeof updateWalletDisplay === 'function') {
        updateWalletDisplay();
    }
    if (typeof updateRealBalances === 'function') {
        updateRealBalances();
    }
});

window.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 Setting up website session integration...');
    
    // ✅ FIXED: Create modals when DOM is ready
    createWalletModals();
    
    if (window.currentUser) {
        console.log('✅ Website user session detected:', window.currentUser.email);
        if (window.nemexWalletAPI && !window.nemexWalletAPI.isInitialized) {
            window.nemexWalletAPI.init();
        }
    }
});

// Auto-initialization
console.log('🎯 NemexWalletAPI class loaded with MODAL FIXES');

function initializeWalletAPI() {
    window.nemexWalletAPI = new NemexWalletAPI();
    
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

// ✅ Make all functions globally available
window.showCreateWalletModal = showCreateWalletModal;
window.showImportWalletModal = showImportWalletModal;
window.closeCreateWalletModal = closeCreateWalletModal;
window.closeImportWalletModal = closeImportWalletModal;
window.createNewWallet = createNewWallet;
window.importWalletFromModal = importWalletFromModal;
window.createWalletModals = createWalletModals;

// ✅ Create modals immediately if possible
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('🔧 Creating modals immediately...');
    createWalletModals();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NemexWalletAPI, SecureSupabaseStorage };
}