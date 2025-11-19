// assets/js/wallet.js - FIXED WITH MULTI-PATH IMPORT SUPPORT
class NemexWalletAPI {
    constructor() {
        this.baseURL = window.location.origin + '/api/wallet';
        this.userId = this.getUserId();
        this.currentWallet = this.getStoredWallet();
        this.isInitialized = false;
        this.pendingImport = null; // Store pending import data
    }

    getUserId() {
        let userId = localStorage.getItem('nemexUserId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('nemexUserId', userId);
        }
        return userId;
    }

    getStoredWallet() {
        try {
            const walletData = localStorage.getItem('nemexCurrentWallet');
            return walletData ? JSON.parse(walletData) : null;
        } catch (error) {
            console.error('Error reading stored wallet:', error);
            return null;
        }
    }

    setStoredWallet(walletData) {
        try {
            if (walletData) {
                localStorage.setItem('nemexCurrentWallet', JSON.stringify(walletData));
                this.currentWallet = walletData;
            } else {
                localStorage.removeItem('nemexCurrentWallet');
                this.currentWallet = null;
            }
        } catch (error) {
            console.error('Error storing wallet:', error);
        }
    }

    async init() {
        if (this.isInitialized) return true;

        console.log('🔄 Initializing Nemex Wallet API...');
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

    async restoreSession() {
        try {
            console.log('🔄 Restoring wallet session...');
            
            if (this.currentWallet) {
                console.log('✅ Found stored wallet:', this.currentWallet.address);
                return this.currentWallet;
            }

            const activeWalletResponse = await fetch(`${this.baseURL}/active-wallet/${this.userId}`);
            const activeData = await activeWalletResponse.json();

            if (activeData.success && activeData.activeWallet) {
                console.log('✅ Found active wallet in database:', activeData.activeWallet);
                
                const walletsResponse = await fetch(`${this.baseURL}/user-wallets/${this.userId}`);
                const walletsData = await walletsResponse.json();

                if (walletsData.success && walletsData.wallets) {
                    const wallet = walletsData.wallets.find(w => w.address === activeData.activeWallet);
                    if (wallet) {
                        this.setStoredWallet(wallet);
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
            
            const response = await fetch(`${this.baseURL}/set-active-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    address: address
                })
            });

            const data = await response.json();

            if (data.success) {
                const walletsResponse = await fetch(`${this.baseURL}/user-wallets/${this.userId}`);
                const walletsData = await walletsResponse.json();

                if (walletsData.success && walletsData.wallets) {
                    const wallet = walletsData.wallets.find(w => w.address === address);
                    if (wallet) {
                        this.setStoredWallet(wallet);
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
            const response = await fetch(`${this.baseURL}/user-wallets/${this.userId}`);
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

            const response = await fetch(`${this.baseURL}/generate-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
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

    // ✅ ENHANCED IMPORT WITH MULTI-PATH SUPPORT
    async importWallet(mnemonic, targetAddress = null) {
        try {
            console.log('🔄 Importing wallet with multi-path support...');
            console.log('🔍 Target address:', targetAddress);

            const cleanedMnemonic = this.cleanMnemonic(mnemonic);

            if (!this.isValidMnemonic(cleanedMnemonic)) {
                throw new Error('Invalid mnemonic format. Must be 12 or 24 words.');
            }

            const response = await fetch(`${this.baseURL}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
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
                return data; // Return with wallets for selection
            }

            // ✅ SINGLE WALLET FOUND
            if (data.success && data.wallet) {
                console.log('✅ Single wallet imported via API:', data.wallet.address);
                await this.setActiveWallet(data.wallet.address);
                this.pendingImport = null; // Clear pending import
                return data;
            }

            throw new Error(data.error || 'Failed to import wallet');

        } catch (error) {
            console.error('❌ Wallet import failed:', error);
            throw error;
        }
    }

    // ✅ SELECT SPECIFIC WALLET FROM MULTIPLE OPTIONS
    async selectWalletForImport(selectedPath) {
        try {
            if (!this.pendingImport) {
                throw new Error('No pending import found');
            }

            console.log('🔄 Selecting wallet with path:', selectedPath);

            const response = await fetch(`${this.baseURL}/import-wallet-select`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
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
                this.pendingImport = null; // Clear pending import
                return data;
            }

            throw new Error(data.error || 'Failed to import selected wallet');

        } catch (error) {
            console.error('❌ Wallet selection failed:', error);
            throw error;
        }
    }

    // ✅ GET PENDING IMPORT DATA
    getPendingImport() {
        return this.pendingImport;
    }

    // ✅ CLEAR PENDING IMPORT
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

    // Check if user has any wallets
    async hasWallets() {
        const wallets = await this.getUserWallets();
        return wallets.length > 0;
    }

    // Get current active wallet address
    getCurrentWalletAddress() {
        return this.currentWallet ? this.currentWallet.address : null;
    }

    // Clear session (logout)
    clearSession() {
        this.setStoredWallet(null);
        this.pendingImport = null;
        console.log('✅ Session cleared');
    }

    // Check if wallet is loaded
    isWalletLoaded() {
        return this.currentWallet !== null;
    }

    // Check if there's a pending import
    hasPendingImport() {
        return this.pendingImport !== null;
    }
}

// Initialize the API when the script loads
window.nemexWalletAPI = new NemexWalletAPI();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Nemex Wallet API Initializing...');
    window.nemexWalletAPI.init().then(success => {
        if (success) {
            console.log('✅ Nemex Wallet API Ready!');
            
            document.dispatchEvent(new CustomEvent('walletReady', {
                detail: { 
                    hasWallet: window.nemexWalletAPI.isWalletLoaded(),
                    walletAddress: window.nemexWalletAPI.getCurrentWalletAddress(),
                    hasPendingImport: window.nemexWalletAPI.hasPendingImport()
                }
            }));
        } else {
            console.error('❌ Nemex Wallet API Failed to Initialize');
        }
    });
});