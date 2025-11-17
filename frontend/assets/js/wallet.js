// frontend/assets/js/wallet.js - FIXED VERSION (NO DEMO FALLBACKS)
class NemexWalletAPI {
    constructor() {
        this.apiBase = '/api/wallet';
        this.currentUser = null;
    }

    async init() {
        return await this.checkAuthentication();
    }

    async checkAuthentication() {
        try {
            if (window.supabase) {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (user) {
                    this.currentUser = user;
                    console.log('✅ User authenticated:', user.id);
                    return true;
                }
            }
            console.log('⚠️ Please log in to use full wallet features');
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    async generateNewWallet(wordCount = 24) {
        try {
            const response = await fetch(`${this.apiBase}/generate-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser?.id || 'user_' + Date.now(),
                    wordCount: wordCount
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (error) {
            console.error('API: Wallet generation failed:', error);
            throw new Error('Wallet generation failed. Please check your backend connection.');
        }
    }

    async importWallet(mnemonic) {
        try {
            const response = await fetch(`${this.apiBase}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser?.id || 'user_imported_' + Date.now(),
                    mnemonic: mnemonic
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (error) {
            console.error('API: Wallet import failed:', error);
            throw new Error('Wallet import failed. Please check your recovery phrase and backend connection.');
        }
    }

    async getRealBalance(address) {
        try {
            console.log('🔄 Fetching TON balance for:', address);
            
            const response = await fetch(`${this.apiBase}/real-balance/${address}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }

            console.log('✅ TON Balance fetched:', result.balance, 'TON');
            return result;
        } catch (error) {
            console.error('API: TON balance fetch failed:', error);
            throw new Error(`Failed to fetch TON balance: ${error.message}`);
        }
    }

    async getNMXBalance(address) {
        try {
            console.log('🔄 Fetching NMX balance for:', address);
            
            const response = await fetch(`${this.apiBase}/nmx-balance/${address}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            console.log('✅ NMX Balance fetched:', result.balance, 'NMX');
            return result;
        } catch (error) {
            console.error('API: NMX balance fetch failed:', error);
            throw new Error(`Failed to fetch NMX balance: ${error.message}`);
        }
    }

    async getAllBalances(address) {
        try {
            console.log('🔄 Fetching all balances for:', address);
            
            const response = await fetch(`${this.apiBase}/all-balances/${address}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }

            console.log('✅ All balances fetched:', result.balances);
            return result;
        } catch (error) {
            console.error('API: All balances fetch failed:', error);
            throw new Error(`Failed to fetch balances: ${error.message}`);
        }
    }

    async validateAddress(address) {
        try {
            const response = await fetch(`${this.apiBase}/validate-address/${address}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API: Address validation failed:', error);
            throw error;
        }
    }

    async getSupportedTokens() {
        try {
            const response = await fetch(`${this.apiBase}/supported-tokens`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API: Tokens fetch failed:', error);
            throw error;
        }
    }

    // REMOVED ALL DEMO FALLBACK FUNCTIONS - Using real API only
}

// Initialize global API instance
window.nemexWalletAPI = new NemexWalletAPI();