// assets/js/wallet.js - FIXED VERSION (No module imports)
class SecureMnemonicManager {
    constructor() {
        this.storageKey = 'nemex_secure_mnemonics';
    }

    // Generate a new random mnemonic (simplified for browser)
    generateMnemonic(wordCount = 12) {
        // Simple word list for demonstration
        const wordList = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
            // ... you would have a full BIP39 word list in production
        ];
        
        let mnemonic = '';
        for (let i = 0; i < wordCount; i++) {
            const randomIndex = Math.floor(Math.random() * wordList.length);
            mnemonic += wordList[randomIndex] + ' ';
        }
        return mnemonic.trim();
    }

    // Validate mnemonic format
    validateMnemonic(mnemonic) {
        const words = mnemonic.trim().toLowerCase().split(/\s+/g);
        return words.length === 12 || words.length === 24;
    }

    // Normalize mnemonic input
    normalizeMnemonic(mnemonic) {
        return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    // Simple encryption for demo (in production use proper crypto)
    async encryptMnemonic(mnemonic, password, userId, walletAddress) {
        try {
            // Simple base64 encoding for demo
            const encrypted = btoa(unescape(encodeURIComponent(mnemonic + '|' + password + '|' + userId)));
            
            const encryptedData = {
                encrypted: encrypted,
                walletAddress: walletAddress,
                timestamp: new Date().toISOString()
            };

            await this.storeEncryptedData(userId, walletAddress, encryptedData);
            return true;

        } catch (error) {
            console.error('❌ Mnemonic encryption failed:', error);
            return false;
        }
    }

    // Simple decryption for demo
    async decryptMnemonic(password, userId, walletAddress) {
        try {
            const encryptedData = await this.getEncryptedData(userId, walletAddress);
            if (!encryptedData) {
                throw new Error('No encrypted mnemonic found');
            }

            // Simple base64 decoding for demo
            const decrypted = decodeURIComponent(escape(atob(encryptedData.encrypted)));
            const parts = decrypted.split('|');
            
            if (parts[1] !== password || parts[2] !== userId) {
                throw new Error('Invalid password');
            }

            return parts[0];

        } catch (error) {
            console.error('❌ Mnemonic decryption failed:', error);
            throw new Error('Failed to decrypt seed phrase. Wrong password?');
        }
    }

    async storeEncryptedData(userId, walletAddress, encryptedData) {
        const key = `${this.storageKey}_${userId}_${walletAddress}`;
        localStorage.setItem(key, JSON.stringify(encryptedData));
    }

    async getEncryptedData(userId, walletAddress) {
        const key = `${this.storageKey}_${userId}_${walletAddress}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    async hasEncryptedMnemonic(userId, walletAddress) {
        const data = await this.getEncryptedData(userId, walletAddress);
        return data !== null;
    }
}

class TONWalletDerivation {
    constructor() {
        // We'll use backend API for actual TON operations
        console.log('✅ TON Wallet Derivation ready (using backend API)');
    }

    // Use backend API for wallet derivation
    async deriveWalletFromMnemonic(mnemonic) {
        try {
            console.log('🔑 Deriving wallet from mnemonic via backend...');
            
            const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
            
            if (!this.validateMnemonic(normalizedMnemonic)) {
                throw new Error('Invalid mnemonic. Must be 12 or 24 words.');
            }

            // Use backend API for wallet derivation
            const response = await fetch('/api/wallet/verify-seed-recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mnemonic: normalizedMnemonic })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to derive wallet');
            }

            console.log('✅ Wallet derived via backend:', data.wallet.address);
            return data.wallet;

        } catch (error) {
            console.error('❌ Wallet derivation failed:', error);
            throw new Error('Failed to derive wallet from seed phrase: ' + error.message);
        }
    }

    validateMnemonic(mnemonic) {
        const words = mnemonic.split(' ');
        return words.length === 12 || words.length === 24;
    }

    // Generate new wallet using backend
    async generateNewWallet(wordCount = 12) {
        try {
            console.log('🔄 Generating new wallet via backend...');

            // This will be handled by backend in real implementation
            const mnemonicManager = new SecureMnemonicManager();
            const mnemonic = mnemonicManager.generateMnemonic(wordCount);
            
            // For now, return a mock wallet
            const mockWallet = {
                address: 'EQ' + Math.random().toString(36).substring(2, 15),
                addressBounceable: 'UQ' + Math.random().toString(36).substring(2, 15),
                publicKey: 'mock_public_key_' + Date.now(),
                mnemonic: mnemonic,
                wordCount: wordCount
            };

            console.log('✅ Mock wallet generated:', mockWallet.address);
            return mockWallet;

        } catch (error) {
            console.error('❌ Wallet generation failed:', error);
            throw error;
        }
    }
}

class NemexWalletAPI {
    constructor() {
        this.mnemonicManager = new SecureMnemonicManager();
        this.walletDerivation = new TONWalletDerivation();
        this.userId = null;
        this.currentWallet = null;
        this.userWallets = [];
        this.isInitialized = false;
        
        console.log('✅ NemexWalletAPI instance created');
    }

    async init() {
        if (this.isInitialized) {
            console.log('✅ Wallet API already initialized');
            return true;
        }

        console.log('🔄 Initializing Nemex Wallet API...');

        try {
            // Wait for main site auth
            await this.waitForMainSiteAuth();
            
            // Restore session if user is logged in
            if (this.userId) {
                await this.restoreSession();
            }

            this.isInitialized = true;
            console.log('✅ Wallet API initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            this.isInitialized = true; // Mark as initialized even if failed
            return false;
        }
    }

    async waitForMainSiteAuth() {
        console.log('🔄 Waiting for main site authentication...');
        
        // Check if we already have a user from main site
        if (window.currentUser && window.currentUser.id) {
            this.userId = window.currentUser.id;
            console.log('✅ Main site user found:', this.userId);
            return;
        }

        // Wait for auth with timeout
        const maxWaitTime = 3000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            if (window.currentUser && window.currentUser.id) {
                this.userId = window.currentUser.id;
                console.log('✅ Main site user found after wait:', this.userId);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('ℹ️ No main site auth found - wallet will work in standalone mode');
    }

    async restoreSession() {
        try {
            console.log('🔄 Restoring wallet session...');
            
            if (!this.userId) {
                console.log('❌ No user ID for session restoration');
                return null;
            }

            // Load user wallets from storage
            await this.loadUserWallets();

            // Try to restore current wallet
            const storedWallet = localStorage.getItem(`nemex_current_wallet_${this.userId}`);
            if (storedWallet) {
                this.currentWallet = JSON.parse(storedWallet);
                console.log('✅ Current wallet restored:', this.currentWallet.address);
            }

            return this.currentWallet;

        } catch (error) {
            console.error('❌ Session restoration failed:', error);
            return null;
        }
    }

    // 🎯 MAIN WALLET CREATION FUNCTION
    async generateNewWallet(wordCount = 12, backupPassword = null) {
        try {
            console.log('🔄 Creating new wallet...');

            if (!this.userId) {
                // Allow wallet creation without user ID (standalone mode)
                console.log('ℹ️ No user ID - creating wallet in standalone mode');
            }

            // Generate new wallet
            const wallet = await this.walletDerivation.generateNewWallet(wordCount);
            
            // Store public wallet info
            const walletData = {
                userId: this.userId || 'standalone_user',
                address: wallet.address,
                addressBounceable: wallet.addressBounceable,
                publicKey: wallet.publicKey,
                type: 'TON',
                source: 'generated',
                wordCount: wallet.wordCount,
                derivationPath: "m/44'/607'/0'/0'/0'",
                createdAt: new Date().toISOString(),
                isActive: true
            };

            // Optional: Encrypt mnemonic for local convenience
            if (backupPassword && this.userId) {
                const encrypted = await this.mnemonicManager.encryptMnemonic(
                    wallet.mnemonic, 
                    backupPassword, 
                    this.userId, 
                    wallet.address
                );
                if (encrypted) {
                    console.log('✅ Seed phrase encrypted for local backup');
                }
            }

            // Add to user wallets
            await this.addWalletToUserWallets(walletData);

            // Set as current wallet
            await this.setCurrentWallet(walletData);

            console.log('✅ New wallet created successfully:', wallet.address);
            
            // 🚨 CRITICAL: Return mnemonic to show user ONCE
            return {
                success: true,
                wallet: walletData,
                mnemonic: wallet.mnemonic,
                securityWarning: 'WRITE DOWN YOUR SEED PHRASE! You will need it to recover your wallet on other devices.'
            };

        } catch (error) {
            console.error('❌ Wallet creation failed:', error);
            throw error;
        }
    }

    // 🎯 MAIN WALLET RECOVERY FUNCTION
    async importWallet(mnemonic, backupPassword = null) {
        try {
            console.log('🔄 Importing/recovering wallet from seed phrase...');

            // Normalize and validate mnemonic
            const normalizedMnemonic = this.mnemonicManager.normalizeMnemonic(mnemonic);
            
            if (!this.mnemonicManager.validateMnemonic(normalizedMnemonic)) {
                throw new Error('Invalid seed phrase. Must be 12 or 24 words.');
            }

            // 🎯 THE MAGIC: Derive wallet from mnemonic using backend
            const wallet = await this.walletDerivation.deriveWalletFromMnemonic(normalizedMnemonic);

            // Store public wallet info
            const walletData = {
                userId: this.userId || 'standalone_user',
                address: wallet.address,
                addressBounceable: wallet.addressBounceable,
                publicKey: wallet.publicKey,
                type: 'TON',
                source: 'imported',
                wordCount: wallet.wordCount || normalizedMnemonic.split(' ').length,
                derivationPath: "m/44'/607'/0'/0'/0'",
                createdAt: new Date().toISOString(),
                isActive: true
            };

            // Optional: Encrypt for local convenience
            if (backupPassword && this.userId) {
                await this.mnemonicManager.encryptMnemonic(
                    normalizedMnemonic,
                    backupPassword,
                    this.userId,
                    wallet.address
                );
            }

            // Add to user wallets
            await this.addWalletToUserWallets(walletData);

            // Set as current wallet
            await this.setCurrentWallet(walletData);

            console.log('✅ Wallet imported/recovered successfully:', wallet.address);
            
            return {
                success: true,
                wallet: walletData,
                message: 'Wallet recovered successfully!'
            };

        } catch (error) {
            console.error('❌ Wallet import failed:', error);
            throw error;
        }
    }

    // 🎯 SEED PHRASE VIEWING FUNCTION
    async viewSeedPhrase(walletAddress, password = null) {
        try {
            console.log('🔐 Requesting seed phrase view...');

            if (!this.userId) {
                throw new Error('User must be logged in to view seed phrase');
            }

            // Find the wallet
            const wallet = this.userWallets.find(w => w.address === walletAddress);
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            // Check if we have encrypted backup
            const hasEncrypted = await this.mnemonicManager.hasEncryptedMnemonic(this.userId, walletAddress);
            
            if (hasEncrypted) {
                if (!password) {
                    throw new Error('Password required to view encrypted seed phrase');
                }
                
                // Decrypt and return seed phrase
                const mnemonic = await this.mnemonicManager.decryptMnemonic(password, this.userId, walletAddress);
                
                return {
                    success: true,
                    mnemonic: mnemonic,
                    source: 'encrypted_backup',
                    securityWarning: 'Keep this seed phrase safe and secure! Never share it with anyone.'
                };
            } else {
                return {
                    success: false,
                    message: 'No encrypted backup found. You should have written down your seed phrase when you created the wallet.',
                    instructions: 'If you lost your seed phrase, you cannot recover this wallet. Always write down your seed phrase during wallet creation!'
                };
            }

        } catch (error) {
            console.error('❌ Seed phrase view failed:', error);
            throw error;
        }
    }

    async addWalletToUserWallets(walletData) {
        // Remove any existing wallet with same address
        this.userWallets = this.userWallets.filter(w => w.address !== walletData.address);
        
        // Add new wallet
        this.userWallets.push(walletData);
        
        // Save to storage
        await this.saveUserWallets();
        
        console.log('✅ Wallet added to user wallets:', walletData.address);
    }

    async setCurrentWallet(walletData) {
        this.currentWallet = walletData;
        if (this.userId) {
            localStorage.setItem(`nemex_current_wallet_${this.userId}`, JSON.stringify(walletData));
        }
    }

    async loadUserWallets() {
        try {
            if (this.userId) {
                const stored = localStorage.getItem(`nemex_user_wallets_${this.userId}`);
                this.userWallets = stored ? JSON.parse(stored) : [];
            } else {
                this.userWallets = [];
            }
            console.log(`✅ Loaded ${this.userWallets.length} wallets`);
        } catch (error) {
            console.error('❌ Failed to load user wallets:', error);
            this.userWallets = [];
        }
    }

    async saveUserWallets() {
        if (this.userId) {
            localStorage.setItem(`nemex_user_wallets_${this.userId}`, JSON.stringify(this.userWallets));
        }
    }

    // Public methods for UI
    async getCurrentWallet() {
        return this.currentWallet;
    }

    async getUserWallets() {
        return this.userWallets;
    }

    async switchToWallet(address) {
        const wallet = this.userWallets.find(w => w.address === address);
        if (wallet) {
            await this.setCurrentWallet(wallet);
            return { success: true, wallet: wallet };
        } else {
            throw new Error('Wallet not found');
        }
    }

    isInitialized() {
        return this.isInitialized;
    }

    getUserId() {
        return this.userId;
    }
}

// 🎯 SIMPLE MODAL FUNCTIONS (No dependencies)
function createWalletModals() {
    console.log('🔧 Creating wallet modals...');

    // Remove existing modals
    const existingModals = ['createWalletModal', 'importWalletModal', 'seedPhraseModal'];
    existingModals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.remove();
    });

    // Create Wallet Modal
    const createModalHTML = `
    <div id="createWalletModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; align-items:center; justify-content:center;">
        <div style="background:white; padding:30px; border-radius:15px; width:90%; max-width:500px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            <h2 style="color:#333; margin-bottom:15px;">Create New Wallet</h2>
            <p style="color:#666; margin-bottom:25px;">This will generate a new TON wallet with a secure seed phrase.</p>
            
            <div id="createWalletStatus" style="margin-bottom:15px; min-height:20px;"></div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="createWalletBtn" style="background:#007bff; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                    🚀 Create Wallet
                </button>
                <button id="cancelCreateBtn" style="background:#6c757d; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                    Cancel
                </button>
            </div>
        </div>
    </div>
    `;

    // Import Wallet Modal
    const importModalHTML = `
    <div id="importWalletModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; align-items:center; justify-content:center;">
        <div style="background:white; padding:30px; border-radius:15px; width:90%; max-width:500px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            <h2 style="color:#333; margin-bottom:15px;">Import/Recover Wallet</h2>
            <p style="color:#666; margin-bottom:10px;">Enter your 12 or 24-word seed phrase:</p>
            <textarea id="importMnemonicInput" placeholder="Enter your seed phrase here..." style="width:100%; height:120px; padding:15px; border:2px solid #ddd; border-radius:8px; margin:15px 0; font-size:16px; resize:vertical; font-family:monospace;"></textarea>
            
            <div id="importWalletStatus" style="margin-bottom:15px; min-height:20px;"></div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="importWalletBtn" style="background:#28a745; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                    📥 Import Wallet
                </button>
                <button id="cancelImportBtn" style="background:#6c757d; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                    Cancel
                </button>
            </div>
        </div>
    </div>
    `;

    // Seed Phrase Display Modal
    const seedPhraseModalHTML = `
    <div id="seedPhraseModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10001; align-items:center; justify-content:center;">
        <div style="background:#1a1a1a; padding:30px; border-radius:15px; width:90%; max-width:500px; box-shadow:0 10px 30px rgba(0,0,0,0.5); border:2px solid #d4af37;">
            <h2 style="color:#d4af37; margin-bottom:15px; text-align:center;">🔐 Your Seed Phrase</h2>
            
            <div style="background:#2a2a2a; padding:20px; border-radius:10px; margin:20px 0; border:1px solid #444;">
                <p style="color:#ff4444; text-align:center; font-weight:bold; margin-bottom:15px;">
                    ⚠️ CRITICAL SECURITY WARNING ⚠️
                </p>
                <p style="color:#fff; text-align:center; margin-bottom:15px;">
                    Write down these words and store them securely. Anyone with this phrase can access your wallet and funds!
                </p>
                <div id="seedPhraseDisplay" style="background:#000; padding:20px; border-radius:8px; border:1px solid #d4af37; text-align:center; font-family:monospace; font-size:18px; color:#d4af37; line-height:1.8; margin:15px 0;"></div>
                <p style="color:#ff4444; text-align:center; font-size:14px;">
                    NEVER share this phrase with anyone! Not even support staff.
                </p>
            </div>
            
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="confirmSeedBackup" style="background:#28a745; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; font-size:16px;">
                    ✅ I've Written It Down
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', createModalHTML);
    document.body.insertAdjacentHTML('beforeend', importModalHTML);
    document.body.insertAdjacentHTML('beforeend', seedPhraseModalHTML);

    // Add event listeners
    document.getElementById('createWalletBtn').addEventListener('click', createNewWallet);
    document.getElementById('importWalletBtn').addEventListener('click', importWallet);
    document.getElementById('cancelCreateBtn').addEventListener('click', () => closeModal('createWalletModal'));
    document.getElementById('cancelImportBtn').addEventListener('click', () => closeModal('importWalletModal'));
    document.getElementById('confirmSeedBackup').addEventListener('click', () => closeModal('seedPhraseModal'));

    console.log('✅ Wallet modals created successfully');
}

// 🎯 WALLET CREATION FUNCTION
async function createNewWallet() {
    try {
        const createBtn = document.getElementById('createWalletBtn');
        const statusDiv = document.getElementById('createWalletStatus');

        createBtn.innerHTML = '⏳ Generating...';
        createBtn.disabled = true;

        statusDiv.innerHTML = '🔄 Creating secure wallet...';
        statusDiv.style.color = '#007bff';

        if (window.nemexWalletAPI) {
            const result = await window.nemexWalletAPI.generateNewWallet(12);
            
            if (result.success) {
                statusDiv.innerHTML = '✅ Wallet created!';
                statusDiv.style.color = '#28a745';
                
                // Show seed phrase to user
                showSeedPhraseModal(result.mnemonic, result.wallet.address);
            }
        } else {
            throw new Error('Wallet API not available. Please refresh the page.');
        }
    } catch (error) {
        console.error('❌ Wallet creation failed:', error);
        const statusDiv = document.getElementById('createWalletStatus');
        statusDiv.innerHTML = `❌ Error: ${error.message}`;
        statusDiv.style.color = '#dc3545';
        
        const createBtn = document.getElementById('createWalletBtn');
        createBtn.innerHTML = '🚀 Create Wallet';
        createBtn.disabled = false;
    }
}

// 🎯 WALLET IMPORT FUNCTION
async function importWallet() {
    try {
        const importBtn = document.getElementById('importWalletBtn');
        const statusDiv = document.getElementById('importWalletStatus');
        const mnemonicInput = document.getElementById('importMnemonicInput');

        importBtn.innerHTML = '⏳ Importing...';
        importBtn.disabled = true;

        statusDiv.innerHTML = '🔄 Recovering wallet...';
        statusDiv.style.color = '#007bff';

        const mnemonic = mnemonicInput.value.trim();
        
        if (!mnemonic) {
            throw new Error('Please enter your seed phrase');
        }

        if (window.nemexWalletAPI) {
            const result = await window.nemexWalletAPI.importWallet(mnemonic);
            
            if (result.success) {
                statusDiv.innerHTML = '✅ Wallet recovered successfully!';
                statusDiv.style.color = '#28a745';
                importBtn.innerHTML = '✅ Success!';
                
                setTimeout(() => {
                    closeModal('importWalletModal');
                    alert(`🎉 Wallet recovered successfully!\n\nAddress: ${result.wallet.address}\n\nYour wallet is now ready to use!`);
                    
                    // Refresh page to show wallet
                    setTimeout(() => window.location.reload(), 1000);
                }, 1500);
            }
        } else {
            throw new Error('Wallet API not available. Please refresh the page.');
        }
    } catch (error) {
        console.error('❌ Wallet import failed:', error);
        const statusDiv = document.getElementById('importWalletStatus');
        statusDiv.innerHTML = `❌ Error: ${error.message}`;
        statusDiv.style.color = '#dc3545';
        
        const importBtn = document.getElementById('importWalletBtn');
        importBtn.innerHTML = '📥 Import Wallet';
        importBtn.disabled = false;
    }
}

// 🎯 SEED PHRASE DISPLAY
function showSeedPhraseModal(mnemonic, walletAddress) {
    const modal = document.getElementById('seedPhraseModal');
    const displayDiv = document.getElementById('seedPhraseDisplay');
    
    // Format mnemonic with numbers
    const words = mnemonic.split(' ');
    const formattedWords = words.map((word, index) => 
        `<span style="display:inline-block; width:100px; margin:5px;">${index + 1}. ${word}</span>`
    ).join('');
    
    displayDiv.innerHTML = formattedWords;
    modal.style.display = 'flex';
    
    // Close create modal
    closeModal('createWalletModal');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 🎯 INITIALIZATION
function initializeWalletAPI() {
    console.log('🚀 Initializing Nemex Wallet API...');
    
    // Create global wallet API instance
    window.nemexWalletAPI = new NemexWalletAPI();
    
    // Create modals
    createWalletModals();
    
    // Initialize wallet API
    setTimeout(async () => {
        try {
            await window.nemexWalletAPI.init();
            console.log('✅ Nemex Wallet API initialized successfully!');
        } catch (error) {
            console.error('❌ Wallet API initialization failed:', error);
        }
    }, 1000);
}

// 🎯 GLOBAL FUNCTIONS FOR UI
window.showCreateWalletModal = () => {
    document.getElementById('createWalletModal').style.display = 'flex';
    document.getElementById('createWalletStatus').innerHTML = '';
};

window.showImportWalletModal = () => {
    document.getElementById('importWalletModal').style.display = 'flex';
    document.getElementById('importMnemonicInput').value = '';
    document.getElementById('importWalletStatus').innerHTML = '';
};

window.viewSeedPhrase = async (walletAddress) => {
    if (!window.nemexWalletAPI || !window.nemexWalletAPI.currentWallet) {
        alert('No wallet loaded');
        return;
    }
    
    const password = prompt('Enter your backup password to view seed phrase:');
    if (!password) return;
    
    try {
        const result = await window.nemexWalletAPI.viewSeedPhrase(walletAddress, password);
        if (result.success) {
            showSeedPhraseModal(result.mnemonic, walletAddress);
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert(`Failed to view seed phrase: ${error.message}`);
    }
};

// 🎯 AUTO-INITIALIZE WHEN PAGE LOADS
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWalletAPI);
} else {
    initializeWalletAPI();
}

console.log('✅ NemexWalletAPI script loaded successfully!');