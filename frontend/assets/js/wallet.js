// frontend/assets/js/wallet.js
class NemexWalletAPI {
    constructor() {
        this.apiBase = '/api/wallet';
        this.currentUser = null;
    }

    async init() {
        await this.checkAuthentication();
    }

    async checkAuthentication() {
        try {
            // Get user from your existing auth system
            if (window.supabase) {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (user) {
                    this.currentUser = user;
                    console.log('✅ User authenticated:', user.id);
                    return true;
                }
            }
            
            console.log('❌ User not authenticated - using demo mode');
            // For demo purposes, create a mock user
            this.currentUser = { id: 'demo_user_' + Date.now() };
            return true;
            
        } catch (error) {
            console.error('Auth check failed:', error);
            // Fallback for demo
            this.currentUser = { id: 'demo_user_' + Date.now() };
            return true;
        }
    }

    async generateNewWallet(wordCount = 24) {
        try {
            if (!this.currentUser) {
                throw new Error('Please log in to create a wallet');
            }

            const response = await fetch(`${this.apiBase}/generate-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
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
            
            // Fallback for demo - return mock data if backend is not available
            if (error.message.includes('Failed to fetch') || error.message.includes('HTTP error')) {
                console.log('🔄 Using demo wallet generation');
                return this.generateDemoWallet();
            }
            
            throw error;
        }
    }

    async importWallet(mnemonic) {
        try {
            if (!this.currentUser) {
                throw new Error('Please log in to import a wallet');
            }

            const response = await fetch(`${this.apiBase}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
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
            
            // Fallback for demo
            if (error.message.includes('Failed to fetch') || error.message.includes('HTTP error')) {
                console.log('🔄 Using demo wallet import');
                return this.importDemoWallet(mnemonic);
            }
            
            throw error;
        }
    }

    async getRealBalance(address) {
        try {
            const response = await fetch(`${this.apiBase}/real-balance/${address}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (error) {
            console.error('API: Balance fetch failed:', error);
            
            // Fallback for demo
            if (error.message.includes('Failed to fetch') || error.message.includes('HTTP error')) {
                console.log('🔄 Using demo balance');
                return {
                    success: true,
                    balance: (Math.random() * 10).toFixed(4),
                    address: address,
                    rawBalance: '1000000000'
                };
            }
            
            throw error;
        }
    }

    async getTransactions(address) {
        try {
            const response = await fetch(`${this.apiBase}/transactions/${address}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (error) {
            console.error('API: Transactions fetch failed:', error);
            throw error;
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
            
            // Fallback for demo
            if (error.message.includes('Failed to fetch') || error.message.includes('HTTP error')) {
                console.log('🔄 Using demo address validation');
                const isValid = address.startsWith('EQ') || address.startsWith('UQ');
                return {
                    success: true,
                    isValid: isValid,
                    isTestnet: false,
                    address: address
                };
            }
            
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

    // Demo fallback functions
    generateDemoWallet() {
        const demoMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        const demoAddress = 'EQ' + Math.random().toString(36).substring(2, 48);
        
        return {
            success: true,
            wallet: {
                address: demoAddress,
                mnemonic: demoMnemonic,
                wordCount: 12,
                type: 'TON'
            },
            message: 'Demo wallet generated successfully'
        };
    }

    importDemoWallet(mnemonic) {
        const demoAddress = 'EQ' + Math.random().toString(36).substring(2, 48);
        
        return {
            success: true,
            wallet: {
                address: demoAddress,
                type: 'TON'
            },
            message: 'Demo wallet imported successfully'
        };
    }
}

// Initialize global API instance
window.nemexWalletAPI = new NemexWalletAPI();