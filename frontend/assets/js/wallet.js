// assets/js/wallet.js - COMPLETE REWRITE WITH PROPER SEED PHRASE RECOVERY
import { mnemonicToSeedSync } from 'bip39';
import { fromSeed } from 'bip32';
import { mnemonicToWalletKey } from '@ton/crypto';
import TonWeb from 'tonweb';

class SecureMnemonicManager {
    constructor() {
        this.storageKey = 'nemex_secure_mnemonics';
    }

    // Generate a new random mnemonic
    generateMnemonic(wordCount = 12) {
        const entropyBits = wordCount === 12 ? 128 : 256;
        const entropy = crypto.getRandomValues(new Uint8Array(entropyBits / 8));
        return mnemonicToSeedSync(entropy);
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

    // Optional: Encrypt mnemonic for local storage (convenience feature)
    async encryptMnemonic(mnemonic, password, userId, walletAddress) {
        try {
            if (!password) {
                throw new Error('Password required for encryption');
            }

            // Derive encryption key from password
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            // Encrypt the mnemonic
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GGM',
                    iv: iv
                },
                key,
                new TextEncoder().encode(mnemonic)
            );

            // Store encrypted data
            const encryptedData = {
                encrypted: Array.from(new Uint8Array(encrypted)),
                salt: Array.from(salt),
                iv: Array.from(iv),
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

    // Decrypt mnemonic (for viewing)
    async decryptMnemonic(password, userId, walletAddress) {
        try {
            const encryptedData = await this.getEncryptedData(userId, walletAddress);
            if (!encryptedData) {
                throw new Error('No encrypted mnemonic found');
            }

            // Derive key from password
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: new Uint8Array(encryptedData.salt),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            // Decrypt
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: new Uint8Array(encryptedData.iv)
                },
                key,
                new Uint8Array(encryptedData.encrypted)
            );

            return new TextDecoder().decode(decrypted);

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

    // Check if encrypted mnemonic exists
    async hasEncryptedMnemonic(userId, walletAddress) {
        const data = await this.getEncryptedData(userId, walletAddress);
        return data !== null;
    }
}

class TONWalletDerivation {
    constructor() {
        this.tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
    }

    // 🎯 THE MAGIC: Derive wallet from mnemonic (works everywhere!)
    async deriveWalletFromMnemonic(mnemonic, derivationPath = "m/44'/607'/0'/0'/0'") {
        try {
            console.log('🔑 Deriving wallet from mnemonic...');
            
            const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
            
            if (!this.validateMnemonic(normalizedMnemonic)) {
                throw new Error('Invalid mnemonic. Must be 12 or 24 words.');
            }

            // Derive key pair from mnemonic
            const keyPair = await mnemonicToWalletKey(normalizedMnemonic.split(' '));
            
            // Create TON wallet
            const WalletClass = this.tonweb.wallet.all.v4R2;
            const wallet = new WalletClass(this.tonweb.provider, {
                publicKey: keyPair.publicKey,
                wc: 0
            });

            // Get wallet address
            const walletAddress = await wallet.getAddress();
            const address = walletAddress.toString(true, true, false);
            const addressBounceable = walletAddress.toString(true, true, true);

            console.log('✅ Wallet derived successfully:', address);

            return {
                address: address,
                addressBounceable: addressBounceable,
                publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
                privateKey: TonWeb.utils.bytesToHex(keyPair.secretKey),
                mnemonic: normalizedMnemonic,
                derivationPath: derivationPath,
                wordCount: normalizedMnemonic.split(' ').length
            };

        } catch (error) {
            console.error('❌ Wallet derivation failed:', error);
            throw new Error('Failed to derive wallet from seed phrase: ' + error.message);
        }
    }

    validateMnemonic(mnemonic) {
        const words = mnemonic.split(' ');
        return words.length === 12 || words.length === 24;
    }

    // Generate new wallet with random mnemonic
    async generateNewWallet(wordCount = 12) {
        try {
            console.log('🔄 Generating new wallet...');
            
            const mnemonicManager = new SecureMnemonicManager();
            const mnemonic = mnemonicManager.generateMnemonic(wordCount);
            
            // Derive wallet from the new mnemonic
            const wallet = await this.deriveWalletFromMnemonic(mnemonic);
            
            console.log('✅ New wallet generated:', wallet.address);
            return wallet;

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
    }

    async init() {
        if (this.isInitialized) return true;

        console.log('🔄 Initializing Nemex Wallet with proper seed recovery...');

        try {
            // Wait for main site auth
            await this.waitForMainSiteAuth();
            
            // Restore session if user is logged in
            if (this.userId) {
                await this.restoreSession();
            }

            this.isInitialized = true;
            console.log('✅ Wallet API initialized with proper seed recovery');
            return true;

        } catch (error) {
            console.error('❌ Wallet initialization failed:', error);
            this.isInitialized = true;
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
        const maxWaitTime = 5000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            if (window.currentUser && window.currentUser.id) {
                this.userId = window.currentUser.id;
                console.log('✅ Main site user found after wait:', this.userId);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('ℹ️ No main site auth found');
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
            console.log('🔄 Creating new wallet with proper seed recovery...');

            if (!this.userId) {
                throw new Error('User must be logged in to create wallet');
            }

            // Generate new wallet with random mnemonic
            const wallet = await this.walletDerivation.generateNewWallet(wordCount);
            
            // Store public wallet info (never private keys!)
            const walletData = {
                userId: this.userId,
                address: wallet.address,
                addressBounceable: wallet.addressBounceable,
                publicKey: wallet.publicKey,
                type: 'TON',
                source: 'generated',
                wordCount: wallet.wordCount,
                derivationPath: wallet.derivationPath,
                createdAt: new Date().toISOString(),
                isActive: true
            };

            // Optional: Encrypt mnemonic for local convenience
            if (backupPassword) {
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
                mnemonic: wallet.mnemonic, // Show this to user!
                securityWarning: 'WRITE DOWN YOUR SEED PHRASE! You will need it to recover your wallet on other devices.'
            };

        } catch (error) {
            console.error('❌ Wallet creation failed:', error);
            throw error;
        }
    }

    // 🎯 MAIN WALLET RECOVERY FUNCTION (Works on any device!)
    async importWallet(mnemonic, backupPassword = null) {
        try {
            console.log('🔄 Importing/recovering wallet from seed phrase...');

            if (!this.userId) {
                throw new Error('User must be logged in to import wallet');
            }

            // Normalize and validate mnemonic
            const normalizedMnemonic = this.mnemonicManager.normalizeMnemonic(mnemonic);
            
            if (!this.mnemonicManager.validateMnemonic(normalizedMnemonic)) {
                throw new Error('Invalid seed phrase. Must be 12 or 24 words.');
            }

            // 🎯 THE MAGIC: Derive wallet from mnemonic
            const wallet = await this.walletDerivation.deriveWalletFromMnemonic(normalizedMnemonic);

            // Store public wallet info
            const walletData = {
                userId: this.userId,
                address: wallet.address,
                addressBounceable: wallet.addressBounceable,
                publicKey: wallet.publicKey,
                type: 'TON',
                source: 'imported',
                wordCount: wallet.wordCount,
                derivationPath: wallet.derivationPath,
                createdAt: new Date().toISOString(),
                isActive: true
            };

            // Optional: Encrypt for local convenience
            if (backupPassword) {
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

    // 🎯 SEED PHRASE VIEWING FUNCTION (Secure)
    async viewSeedPhrase(walletAddress, password = null) {
        try {
            console.log('🔐 Requesting seed phrase view...');

            if (!this.userId) {
                throw new Error('User must be logged in');
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
                // If no encrypted backup, user must have written it down
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

    // 🎯 WALLET RECOVERY VERIFICATION (For new devices)
    async verifySeedPhraseRecovery(mnemonic) {
        try {
            console.log('🔍 Verifying seed phrase recovery...');

            // Derive wallet from mnemonic
            const wallet = await this.walletDerivation.deriveWalletFromMnemonic(mnemonic);
            
            // Check if this wallet exists in our system (optional)
            const existsInSystem = await this.checkWalletExistsInSystem(wallet.address);
            
            return {
                success: true,
                wallet: {
                    address: wallet.address,
                    publicKey: wallet.publicKey
                },
                existsInSystem: existsInSystem,
                message: existsInSystem ? 
                    'Wallet recovered successfully! This wallet exists in our system.' :
                    'Wallet derived successfully! This appears to be a new wallet.'
            };

        } catch (error) {
            console.error('❌ Seed phrase verification failed:', error);
            throw error;
        }
    }

    async checkWalletExistsInSystem(address) {
        // Check if wallet is registered in your database
        try {
            const response = await fetch(`/api/wallet/check-exists/${encodeURIComponent(address)}`);
            const data = await response.json();
            return data.exists || false;
        } catch (error) {
            console.error('Wallet existence check failed:', error);
            return false;
        }
    }

    async addWalletToUserWallets(walletData) {
        // Remove any existing wallet with same address
        this.userWallets = this.userWallets.filter(w => w.address !== walletData.address);
        
        // Add new wallet
        this.userWallets.push(walletData);
        
        // Save to storage
        await this.saveUserWallets();
        
        // Store in Supabase (public info only!)
        await this.storeWalletInSupabase(walletData);
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

    async storeWalletInSupabase(walletData) {
        try {
            const response = await fetch('/api/wallet/store-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(walletData)
            });
            
            if (!response.ok) {
                console.warn('⚠️ Supabase wallet storage failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Supabase storage failed:', error);
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

// 🎯 ENHANCED MODAL FUNCTIONS WITH SEED PHRASE SECURITY
function createEnhancedWalletModals() {
    console.log('🔧 Creating enhanced wallet modals with seed security...');

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
            
            <div class="form-group">
                <label style="display:block; margin-bottom:8px; color:#333;">Backup Password (Optional)</label>
                <input type="password" id="backupPassword" placeholder="Encrypt seed phrase for local backup" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px;">
                <small style="color:#666;">This password will encrypt your seed phrase on this device only</small>
            </div>
            
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
            
            <div class="form-group">
                <label style="display:block; margin-bottom:8px; color:#333;">Backup Password (Optional)</label>
                <input type="password" id="importBackupPassword" placeholder="Encrypt seed phrase for local backup" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px;">
            </div>
            
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

    // Seed Phrase Display Modal (SECURE)
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
    document.getElementById('createWalletBtn').addEventListener('click', createNewWalletWithSeedSecurity);
    document.getElementById('importWalletBtn').addEventListener('click', importWalletWithSeedSecurity);
    document.getElementById('cancelCreateBtn').addEventListener('click', () => closeModal('createWalletModal'));
    document.getElementById('cancelImportBtn').addEventListener('click', () => closeModal('importWalletModal'));
    document.getElementById('confirmSeedBackup').addEventListener('click', () => closeModal('seedPhraseModal'));

    console.log('✅ Enhanced wallet modals created with seed security');
}

// 🎯 ENHANCED WALLET CREATION WITH SEED PHRASE DISPLAY
async function createNewWalletWithSeedSecurity() {
    try {
        const createBtn = document.getElementById('createWalletBtn');
        const statusDiv = document.getElementById('createWalletStatus');
        const backupPassword = document.getElementById('backupPassword').value;

        createBtn.innerHTML = '⏳ Generating...';
        createBtn.disabled = true;

        statusDiv.innerHTML = '🔄 Creating secure wallet...';
        statusDiv.style.color = '#007bff';

        if (window.nemexWalletAPI) {
            const result = await window.nemexWalletAPI.generateNewWallet(12, backupPassword || null);
            
            if (result.success) {
                statusDiv.innerHTML = '✅ Wallet created!';
                statusDiv.style.color = '#28a745';
                
                // 🚨 CRITICAL: Show seed phrase to user
                showSeedPhraseSecurityModal(result.mnemonic, result.wallet.address);
                
                // Don't close modal yet - wait for user to confirm backup
            }
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

// 🎯 SECURE SEED PHRASE DISPLAY
function showSeedPhraseSecurityModal(mnemonic, walletAddress) {
    const modal = document.getElementById('seedPhraseModal');
    const displayDiv = document.getElementById('seedPhraseDisplay');
    
    // Format mnemonic with numbers
    const words = mnemonic.split(' ');
    const formattedWords = words.map((word, index) => 
        `<span style="display:inline-block; width:100px; margin:5px;">${index + 1}. ${word}</span>`
    ).join('');
    
    displayDiv.innerHTML = formattedWords;
    modal.style.display = 'flex';
    
    // Close other modals
    closeModal('createWalletModal');
    closeModal('importWalletModal');
}

// 🎯 ENHANCED WALLET IMPORT
async function importWalletWithSeedSecurity() {
    try {
        const importBtn = document.getElementById('importWalletBtn');
        const statusDiv = document.getElementById('importWalletStatus');
        const mnemonicInput = document.getElementById('importMnemonicInput');
        const backupPassword = document.getElementById('importBackupPassword').value;

        importBtn.innerHTML = '⏳ Importing...';
        importBtn.disabled = true;

        statusDiv.innerHTML = '🔄 Recovering wallet...';
        statusDiv.style.color = '#007bff';

        const mnemonic = mnemonicInput.value.trim();
        
        if (!mnemonic) {
            throw new Error('Please enter your seed phrase');
        }

        if (window.nemexWalletAPI) {
            const result = await window.nemexWalletAPI.importWallet(mnemonic, backupPassword || null);
            
            if (result.success) {
                statusDiv.innerHTML = '✅ Wallet recovered successfully!';
                statusDiv.style.color = '#28a745';
                importBtn.innerHTML = '✅ Success!';
                
                setTimeout(() => {
                    closeModal('importWalletModal');
                    alert(`🎉 Wallet recovered successfully!\n\nAddress: ${result.wallet.address}\n\nYour wallet is now ready to use!`);
                    
                    // Refresh UI
                    if (typeof updateWalletDisplay === 'function') {
                        updateWalletDisplay();
                    }
                    if (typeof updateRealBalances === 'function') {
                        updateRealBalances();
                    }
                    
                    // Reload to ensure everything updates
                    setTimeout(() => window.location.reload(), 1000);
                }, 1500);
            }
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

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 🎯 INITIALIZATION
function initializeWalletAPI() {
    window.nemexWalletAPI = new NemexWalletAPI();
    
    // Create enhanced modals
    createEnhancedWalletModals();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('📄 DOM ready, initializing wallet with seed recovery...');
            await window.nemexWalletAPI.init();
        });
    } else {
        setTimeout(async () => {
            await window.nemexWalletAPI.init();
        }, 1000);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NemexWalletAPI, SecureMnemonicManager, TONWalletDerivation };
}

// Auto-initialize
initializeWalletAPI();

// Global functions for UI
window.showCreateWalletModal = () => {
    document.getElementById('createWalletModal').style.display = 'flex';
    document.getElementById('backupPassword').value = '';
    document.getElementById('createWalletStatus').innerHTML = '';
};

window.showImportWalletModal = () => {
    document.getElementById('importWalletModal').style.display = 'flex';
    document.getElementById('importMnemonicInput').value = '';
    document.getElementById('importBackupPassword').value = '';
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
            showSeedPhraseSecurityModal(result.mnemonic, walletAddress);
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert(`Failed to view seed phrase: ${error.message}`);
    }
};

console.log('🎯 NemexWalletAPI loaded with PROPER seed phrase recovery!');