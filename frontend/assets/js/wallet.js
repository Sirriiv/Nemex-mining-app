// assets/js/wallet.js - SIMPLIFIED WORKING VERSION
console.log('🚀 NEMEX WALLET - SIMPLIFIED WORKING VERSION');

class WalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        this.sessionToken = null;
        this.isInitialized = false;
        this.passwordMinLength = 6;
        this.transactionHistory = [];
        this.isLoading = false;
        this.lastBalance = 0;
        this.tonPrice = 2.35;
        this.priceChange24h = 0;

        console.log('✅ Wallet Manager initialized');
    }

    // 🎯 GET CURRENT USER ID
    getCurrentUserId() {
        if (this.userId) return this.userId;

        if (window.miningUser && window.miningUser.id) {
            this.userId = window.miningUser.id;
            console.log('✅ User ID from window.miningUser:', this.userId);
            return this.userId;
        }

        const sessionUser = sessionStorage.getItem('miningUser');
        if (sessionUser) {
            try {
                const userData = JSON.parse(sessionUser);
                if (userData && userData.id) {
                    this.userId = userData.id;
                    window.miningUser = userData;
                    console.log('✅ User ID from sessionStorage:', this.userId);
                    return this.userId;
                }
            } catch (e) {
                console.warn('⚠️ Error parsing session user:', e);
            }
        }

        console.warn('❌ No user ID found');
        return null;
    }

    // 🎯 CHECK IF WALLET EXISTS
    async checkWalletExists() {
        const userId = this.getCurrentUserId();
        if (!userId) {
            return { 
                success: false, 
                requiresLogin: true,
                error: 'Please login to your mining account first'
            };
        }

        try {
            console.log('🔍 Checking if wallet exists for user:', userId);

            const response = await fetch(`${this.apiBaseUrl}/check`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: userId })
            });

            return await response.json();
        } catch (error) {
            console.warn('⚠️ Check wallet failed:', error.message);
            return { 
                success: false, 
                error: 'Failed to check wallet: ' + error.message
            };
        }
    }

    // 🎯 CREATE WALLET
    async createWallet(walletPassword, buttonElement = null) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Please login to your mining account first' 
            };
        }

        if (!walletPassword || walletPassword.length < this.passwordMinLength) {
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: `Wallet password must be at least ${this.passwordMinLength} characters` 
            };
        }

        try {
            console.log('🎯 Creating wallet for user:', userId);

            const createResponse = await fetch(`${this.apiBaseUrl}/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });

            const result = await createResponse.json();
            console.log('📦 Create wallet result:', result);

            if (!result.success) {
                this.resetButton(buttonElement);
                return { 
                    success: false, 
                    error: result.error || 'Failed to create wallet'
                };
            }

            // ✅ WALLET CREATED
            if (result.wallet && result.wallet.address) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                this.tonPrice = result.tonPrice || 2.35;
                this.priceChange24h = result.priceChange24h || 0;

                console.log('✅ Wallet created successfully!');

                // ✅ SHOW SUCCESS AND CLOSE MODAL
                this.handleWalletCreationSuccess(buttonElement);

                return {
                    success: true,
                    wallet: result.wallet,
                    tonPrice: this.tonPrice,
                    priceChange24h: this.priceChange24h,
                    message: 'Wallet created successfully!'
                };
            } else {
                this.resetButton(buttonElement);
                return {
                    success: false,
                    error: 'Wallet creation succeeded but no wallet data returned'
                };
            }

        } catch (error) {
            console.error('❌ Create wallet failed:', error);
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Failed to create wallet: ' + error.message 
            };
        }
    }

    // 🎯 LOGIN TO WALLET
    async loginToWallet(walletPassword, buttonElement = null) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Please login to your mining account first' 
            };
        }

        if (!walletPassword || walletPassword.length < this.passwordMinLength) {
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: `Wallet password must be at least ${this.passwordMinLength} characters` 
            };
        }

        try {
            console.log('🔐 Logging into wallet for user:', userId);

            const loginResponse = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });

            const result = await loginResponse.json();
            console.log('📦 Login result:', result);

            if (!result.success) {
                this.resetButton(buttonElement);
                return { 
                    success: false, 
                    error: result.error || 'Invalid wallet password' 
                };
            }

            // ✅ LOGIN SUCCESSFUL
            if (result.wallet && result.wallet.address) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                this.tonPrice = result.tonPrice || 2.35;
                this.priceChange24h = result.priceChange24h || 0;

                console.log('✅ Wallet login successful!');

                // ✅ SHOW SUCCESS AND CLOSE MODAL
                this.handleWalletLoginSuccess(buttonElement);

                return {
                    success: true,
                    wallet: result.wallet,
                    tonPrice: this.tonPrice,
                    priceChange24h: this.priceChange24h
                };
            } else {
                this.resetButton(buttonElement);
                return {
                    success: false,
                    error: 'Login succeeded but no wallet data returned'
                };
            }

        } catch (error) {
            console.error('❌ Wallet login failed:', error);
            this.resetButton(buttonElement);
            return { 
                success: false, 
                error: 'Login failed: ' + error.message 
            };
        }
    }

    // ============================================
    // 🎯 SEND TRANSACTION - SIMPLIFIED
    // ============================================

    async sendTransaction(toAddress, amount, memo = '') {
        console.log('🚀 SEND TRANSACTION - SIMPLIFIED');
        console.log('📋 Send details:', { toAddress, amount, memo });

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('Please login to your mining account first');
            }

            if (!this.currentWallet || !this.currentWallet.address) {
                throw new Error('No wallet found. Please create or login to a wallet first');
            }

            if (!toAddress || !toAddress.trim()) {
                throw new Error('Recipient address is required');
            }

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error('Amount must be a positive number');
            }

            if (amountNum < 0.001) {
                throw new Error('Minimum send amount is 0.001 TON');
            }

            // Validate address format
            if (!toAddress.startsWith('EQ') && !toAddress.startsWith('UQ')) {
                throw new Error('Invalid TON address format. Must start with EQ or UQ');
            }

            // Prompt for password
            const walletPassword = await this.promptForPassword();
            if (!walletPassword) {
                throw new Error('Transaction cancelled - password required');
            }

            console.log('📤 Sending transaction:', {
                from: this.currentWallet.address,
                to: toAddress,
                amount: amount,
                memo: memo
            });

            // Show loading
            this.showLoading('Sending transaction...');

            // Call backend send endpoint
            const response = await fetch(`${this.apiBaseUrl}/send`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword,
                    toAddress: toAddress.trim(),
                    amount: amount,
                    memo: memo || ''
                })
            });

            const result = await response.json();
            console.log('📦 Send transaction result:', result);

            // Hide loading
            this.hideLoading();

            // 🚨 Check if success is actually true
            if (!result.success) {
                throw new Error(result.error || 'Transaction failed');
            }

            // ✅ Transaction successful
            console.log('✅✅✅ Transaction SUCCESS!');
            
            // Refresh balance
            setTimeout(() => {
                this.triggerBalanceUpdate();
            }, 2000);

            return {
                success: true,
                transaction: result.data || result,
                message: result.message || 'Transaction sent successfully!'
            };

        } catch (error) {
            console.error('❌❌❌ Send transaction failed:', error);
            
            // Hide loading if still showing
            this.hideLoading();
            
            // Show error to user
            this.showError(error.message);
            
            return {
                success: false,
                error: error.message || 'Transaction failed. Please try again.',
                showError: true
            };
        }
    }

    // 🎯 PROMPT FOR PASSWORD
    async promptForPassword() {
        return new Promise((resolve) => {
            // Create simple prompt
            const password = prompt('🔐 Enter your wallet password to confirm transaction:');
            resolve(password || null);
        });
    }

    // ============================================
    // 🎯 TRANSACTION HISTORY
    // ============================================

    async getTransactionHistory(limit = 100) {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('Please login to your mining account');
            }

            console.log('📜 Fetching transaction history for user:', userId);

            const response = await fetch(`${this.apiBaseUrl}/transactions/${userId}?limit=${limit}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load transaction history');
            }

            this.transactionHistory = result.transactions || [];
            console.log(`✅ Loaded ${this.transactionHistory.length} transactions`);

            return {
                success: true,
                transactions: this.transactionHistory,
                count: result.count || 0
            };

        } catch (error) {
            console.error('❌ Get transaction history failed:', error);
            return {
                success: false,
                error: error.message,
                transactions: [],
                count: 0
            };
        }
    }

    // ============================================
    // 🎯 PRICE & BALANCE FUNCTIONS
    // ============================================

    async getPrices() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/price/ton`);
            const result = await response.json();

            if (result.success) {
                this.tonPrice = parseFloat(result.price) || 2.35;
                this.priceChange24h = parseFloat(result.change24h) || 0;
                
                return {
                    success: true,
                    prices: {
                        TON: { 
                            price: this.tonPrice,
                            change24h: this.priceChange24h,
                            source: result.source || 'default',
                            changePercent: result.change24hPercent || '0.00%'
                        }
                    }
                };
            }

            throw new Error('Failed to get prices');

        } catch (error) {
            console.error('❌ Get prices failed:', error);
            return {
                success: false,
                error: error.message,
                prices: {
                    TON: { price: 2.35, change24h: 0, source: 'fallback', changePercent: '0.00%' }
                }
            };
        }
    }

    async getRealBalance(address = null) {
        try {
            const walletAddress = address || this.getAddress();
            if (!walletAddress) {
                throw new Error('No wallet address available');
            }

            console.log('💰 Getting real balance for:', walletAddress);

            const response = await fetch(`${this.apiBaseUrl}/balance/${walletAddress}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to get balance');
            }

            // Update price if available
            if (result.tonPrice) {
                this.tonPrice = parseFloat(result.tonPrice);
                this.priceChange24h = parseFloat(result.priceChange24h) || 0;
            }

            this.lastBalance = parseFloat(result.balance) || 0;

            return {
                success: true,
                balance: this.lastBalance,
                valueUSD: parseFloat(result.valueUSD) || 0,
                tonPrice: this.tonPrice,
                priceChange24h: this.priceChange24h,
                isActive: result.isActive || false,
                status: result.status || 'unknown',
                address: result.address,
                format: result.format
            };

        } catch (error) {
            console.error('❌ Get real balance failed:', error);
            return {
                success: false,
                error: error.message,
                balance: 0,
                valueUSD: 0,
                isActive: false
            };
        }
    }

    // ============================================
    // 🎯 UI HELPER FUNCTIONS
    // ============================================

    showLoading(message = 'Loading...') {
        console.log('⏳ Loading:', message);
        // Simple console log for now
    }

    hideLoading() {
        console.log('✅ Loading complete');
    }

    showSuccess(message) {
        console.log('✅ Success:', message);
        alert(message);
    }

    showError(message) {
        console.error('❌ Error:', message);
        alert('❌ ' + message);
    }

    // ============================================
    // 🎯 EVENT TRIGGERS
    // ============================================

    triggerBalanceUpdate() {
        console.log('🎯 Triggering balance update event');
        // Simple implementation
        if (typeof window.updateWalletDisplay === 'function') {
            setTimeout(() => window.updateWalletDisplay(), 1000);
        }
    }

    // ============================================
    // 🎯 WALLET SUCCESS HANDLERS
    // ============================================

    handleWalletCreationSuccess(buttonElement) {
        console.log('🎯 Handling wallet creation success');

        // Reset the button
        this.resetButton(buttonElement);

        // Close the create modal
        const createModal = document.getElementById('createWalletModal');
        if (createModal) {
            createModal.style.display = 'none';
        }

        // Clear password fields
        const passwordInputs = document.querySelectorAll('#createWalletModal input[type="password"]');
        passwordInputs.forEach(input => input.value = '');

        // Show success message
        this.showSuccess('✅ Wallet created successfully!');

        // Reload page to refresh wallet state
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }

    handleWalletLoginSuccess(buttonElement) {
        console.log('🎯 Handling wallet login success');

        // Reset the button
        this.resetButton(buttonElement);

        // Close the login modal
        const loginModal = document.getElementById('walletLoginModal');
        if (loginModal) {
            loginModal.style.display = 'none';
        }

        // Clear password field
        const passwordInput = document.getElementById('walletPasswordLogin');
        if (passwordInput) passwordInput.value = '';

        // Show success message
        this.showSuccess('✅ Wallet login successful!');

        // Reload page to refresh wallet state
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }

    // ============================================
    // 🎯 HELPER METHODS
    // ============================================

    resetButton(buttonElement) {
        if (buttonElement) {
            const isCreateBtn = buttonElement.id === 'createWalletBtn';
            buttonElement.textContent = isCreateBtn ? 'Create Wallet' : 'Unlock Wallet';
            buttonElement.disabled = false;
        }
    }

    hasWallet() {
        return !!this.currentWallet;
    }

    getAddress() {
        return this.currentWallet?.address || null;
    }

    getShortAddress() {
        const address = this.getAddress();
        if (!address) return '';
        if (address.length <= 16) return address;
        return address.substring(0, 8) + '...' + address.substring(address.length - 8);
    }

    getBalance() {
        return this.lastBalance;
    }

    getBalanceUSD() {
        return (this.lastBalance * this.tonPrice).toFixed(2);
    }

    // 🎯 INITIALIZE WALLET - SIMPLIFIED
    async initialize() {
        console.log('🔄 Initializing wallet system...');

        try {
            // Check if user is logged in
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.log('❌ No user ID - requires login');
                return {
                    success: false,
                    requiresLogin: true,
                    message: 'Please login to your mining account'
                };
            }

            this.userId = userId;

            // Check if wallet exists
            const checkResult = await this.checkWalletExists();
            console.log('📋 Wallet check result:', checkResult);

            if (checkResult.success && checkResult.hasWallet) {
                // Wallet exists - get fresh balance
                const balanceResult = await this.getRealBalance(checkResult.wallet.address);
                const priceResult = await this.getPrices();
                
                this.currentWallet = {
                    ...checkResult.wallet,
                    balance: balanceResult.balance,
                    isActive: balanceResult.isActive
                };
                
                this.tonPrice = priceResult.prices?.TON?.price || 2.35;
                this.priceChange24h = priceResult.prices?.TON?.change24h || 0;
                
                console.log('✅ Wallet loaded successfully');
                
                return {
                    success: true,
                    hasWallet: true,
                    wallet: this.currentWallet,
                    showPasswordPrompt: false
                };
            } else if (checkResult.success && !checkResult.hasWallet) {
                // No wallet - show create form
                console.log('📭 No wallet found, showing create form');
                return {
                    success: true,
                    hasWallet: false,
                    showCreateForm: true
                };
            } else {
                // Error
                console.error('❌ Wallet check failed:', checkResult.error);
                return checkResult;
            }

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            return {
                success: false,
                error: 'Wallet initialization failed: ' + error.message
            };
        }
    }
}

// 🚀 INITIALIZE GLOBAL INSTANCE
window.walletManager = new WalletManager();

// ============================================
// 🎯 GLOBAL HELPER FUNCTIONS
// ============================================

// 🎯 GLOBAL HELPER FOR CREATE WALLET BUTTON
window.createWalletFromButton = async function(button) {
    console.log('🎯 Create wallet button clicked');

    const password = document.getElementById('walletPassword')?.value;
    const confirmPassword = document.getElementById('confirmWalletPassword')?.value;

    // Validate
    if (!password || !confirmPassword) {
        alert('Please enter and confirm password');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    // Set button to loading state
    button.textContent = 'Creating...';
    button.disabled = true;

    // Create wallet
    const result = await window.walletManager.createWallet(password, button);

    // Handle errors
    if (!result.success) {
        alert(`❌ Error: ${result.error}`);
        button.textContent = 'Create Wallet';
        button.disabled = false;
    }
};

// 🎯 GLOBAL HELPER FOR LOGIN BUTTON
window.loginWalletFromButton = async function(button) {
    console.log('🎯 Login wallet button clicked');

    const password = document.getElementById('walletPasswordLogin')?.value;

    // Validate
    if (!password) {
        alert('Please enter wallet password');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    // Set button to loading state
    button.textContent = 'Unlocking...';
    button.disabled = true;

    // Login to wallet
    const result = await window.walletManager.loginToWallet(password, button);

    // Handle errors
    if (!result.success) {
        alert(`❌ Error: ${result.error}`);
        button.textContent = 'Unlock Wallet';
        button.disabled = false;
    }
};

// 🎯 GLOBAL SEND TRANSACTION HELPER
window.sendTransaction = async function(toAddress, amount, memo = '') {
    console.log('🎯 Global send transaction called');

    try {
        if (!window.walletManager) {
            throw new Error('Wallet manager not initialized');
        }

        const result = await window.walletManager.sendTransaction(toAddress, amount, memo);

        if (result.success) {
            alert('✅ Transaction sent successfully!');
            return result;
        } else {
            throw new Error(result.error || 'Transaction failed');
        }
    } catch (error) {
        console.error('❌ Global send transaction failed:', error);
        alert(`❌ ${error.message}`);
        return { 
            success: false, 
            error: error.message
        };
    }
};

// 🎯 GLOBAL GET BALANCE HELPER
window.getWalletBalance = async function() {
    console.log('🎯 Global get wallet balance called');

    try {
        if (!window.walletManager) {
            throw new Error('Wallet manager not initialized');
        }

        const result = await window.walletManager.getRealBalance();

        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Failed to get balance');
        }
    } catch (error) {
        console.error('❌ Global get balance failed:', error);
        return { success: false, error: error.message, balance: 0, valueUSD: 0 };
    }
};

// 🎯 AUTO-INITIALIZE ON PAGE LOAD
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM Content Loaded - Setting up wallet system');

    setTimeout(async () => {
        try {
            console.log('🔄 Starting wallet initialization...');
            const result = await window.walletManager.initialize();

            console.log('📊 Initialization result:', result);

            if (result.success) {
                if (result.hasWallet && !result.showPasswordPrompt) {
                    console.log('✅ Wallet loaded successfully');
                    // Update UI if function exists
                    if (typeof window.updateWalletDisplay === 'function') {
                        window.updateWalletDisplay();
                    }
                } else if (result.showPasswordPrompt) {
                    console.log('🔐 Wallet exists, showing password prompt');
                    const loginModal = document.getElementById('walletLoginModal');
                    if (loginModal) {
                        loginModal.style.display = 'flex';
                    }
                } else if (result.showCreateForm) {
                    console.log('📭 No wallet found, showing create form');
                    const createModal = document.getElementById('createWalletModal');
                    if (createModal) {
                        createModal.style.display = 'flex';
                    }
                }
            } else if (result.requiresLogin) {
                console.warn('⚠️ User needs to login to mining account');
                // Show login message
            }
        } catch (error) {
            console.error('❌ Initialization failed:', error);
        }
    }, 1000);
});

console.log('✅ NEMEX WALLET READY - SIMPLIFIED & WORKING');