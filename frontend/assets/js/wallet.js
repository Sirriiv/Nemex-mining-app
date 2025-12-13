// assets/js/wallet.js - COMPLETE FIXED VERSION
console.log('🚀 NEMEX WALLET - COMPLETE FIXED VERSION');

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
    // 🎯 SEND TRANSACTION - COMPLETELY FIXED
    // ============================================

    async sendTransaction(toAddress, amount, memo = '', password = null) {
        console.log('🚀 SEND TRANSACTION - FIXED VERSION');
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

            // Get password for transaction
            let walletPassword = password;
            if (!walletPassword) {
                walletPassword = await this.promptForPassword();
                if (!walletPassword) {
                    throw new Error('Transaction cancelled - password required');
                }
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

            // Clear password from memory
            walletPassword = null;

            // 🚨 FIXED: Check if success is actually true
            if (!result.success) {
                // Show specific error messages
                let errorMsg = result.error || 'Transaction failed';
                
                if (result.errorType === 'wallet_not_activated') {
                    errorMsg = `❌ ${errorMsg}\n\n💡 Fix: ${result.fix || 'Send 0.05 TON to your wallet to activate it first'}`;
                } else if (result.errorType === 'insufficient_balance') {
                    errorMsg = `❌ ${errorMsg}\n\n💡 Fix: ${result.fix || 'Add more TON to your wallet'}`;
                } else if (result.errorType === 'wrong_password') {
                    errorMsg = `❌ ${errorMsg}\n\n💡 Fix: ${result.fix || 'Enter the correct wallet password'}`;
                }
                
                throw new Error(errorMsg);
            }

            // ✅ Transaction successful
            console.log('✅✅✅ Transaction SUCCESS!');
            
            // Refresh balance and history
            setTimeout(() => {
                this.triggerBalanceUpdate();
                this.triggerHistoryUpdate();
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
            
            return {
                success: false,
                error: error.message || 'Transaction failed. Please try again.',
                showError: true
            };
        }
    }

    // 🎯 PROMPT FOR PASSWORD - IMPROVED UI
    async promptForPassword() {
        return new Promise((resolve) => {
            // Create modal
            const modal = document.createElement('div');
            modal.id = 'passwordPromptModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                backdrop-filter: blur(5px);
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%);
                padding: 30px;
                border-radius: 20px;
                width: 90%;
                max-width: 400px;
                text-align: center;
                border: 2px solid #D4AF37;
                box-shadow: 0 10px 30px rgba(212, 175, 55, 0.3);
            `;

            content.innerHTML = `
                <div style="color: #D4AF37; font-size: 22px; font-weight: 700; margin-bottom: 16px;">
                    🔐 Confirm Transaction
                </div>
                <div style="color: #F5F5F5; margin-bottom: 20px; font-size: 14px; line-height: 1.5;">
                    Enter your wallet password to confirm this transaction.
                    <div style="font-size: 12px; color: #888; margin-top: 8px;">
                        Required for security
                    </div>
                </div>
                <input type="password" id="transactionPassword" 
                       placeholder="Enter wallet password" 
                       autocomplete="off"
                       style="width: 100%; padding: 14px 16px; 
                              background: rgba(255, 255, 255, 0.05); 
                              border: 1px solid rgba(255, 255, 255, 0.1); 
                              border-radius: 10px; 
                              color: #F5F5F5; 
                              font-size: 16px; 
                              margin-bottom: 20px;
                              outline: none;
                              transition: border-color 0.3s;">
                <div id="passwordError" style="color: #FF4444; font-size: 12px; margin-bottom: 15px; min-height: 18px;"></div>
                <div style="display: flex; gap: 12px;">
                    <button id="confirmPasswordBtn" 
                            style="flex: 1; 
                                   background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%);
                                   color: #0A0A0A; 
                                   border: none; 
                                   padding: 14px; 
                                   border-radius: 10px; 
                                   font-weight: 600; 
                                   cursor: pointer;
                                   font-size: 16px;
                                   transition: transform 0.2s, opacity 0.2s;">
                        Confirm
                    </button>
                    <button id="cancelPasswordBtn" 
                            style="flex: 1; 
                                   background: transparent; 
                                   color: #D4AF37; 
                                   border: 2px solid #D4AF37; 
                                   padding: 14px; 
                                   border-radius: 10px; 
                                   font-weight: 600; 
                                   cursor: pointer;
                                   font-size: 16px;
                                   transition: transform 0.2s, opacity 0.2s;">
                        Cancel
                    </button>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            const passwordInput = content.querySelector('#transactionPassword');
            const confirmBtn = content.querySelector('#confirmPasswordBtn');
            const cancelBtn = content.querySelector('#cancelPasswordBtn');
            const errorElement = content.querySelector('#passwordError');

            // Focus input
            setTimeout(() => passwordInput.focus(), 100);

            // Button hover effects
            confirmBtn.onmouseenter = () => confirmBtn.style.transform = 'translateY(-2px)';
            confirmBtn.onmouseleave = () => confirmBtn.style.transform = 'translateY(0)';
            cancelBtn.onmouseenter = () => cancelBtn.style.transform = 'translateY(-2px)';
            cancelBtn.onmouseleave = () => cancelBtn.style.transform = 'translateY(0)';

            // Confirm button click
            confirmBtn.onclick = () => {
                const password = passwordInput.value.trim();
                if (!password) {
                    errorElement.textContent = 'Password is required';
                    passwordInput.style.borderColor = '#FF4444';
                    return;
                }
                if (password.length < this.passwordMinLength) {
                    errorElement.textContent = `Password must be at least ${this.passwordMinLength} characters`;
                    passwordInput.style.borderColor = '#FF4444';
                    return;
                }
                
                // Success animation
                confirmBtn.style.opacity = '0.7';
                confirmBtn.disabled = true;
                
                setTimeout(() => {
                    document.body.removeChild(modal);
                    resolve(password);
                }, 300);
            };

            // Cancel button click
            cancelBtn.onclick = () => {
                cancelBtn.style.opacity = '0.7';
                setTimeout(() => {
                    document.body.removeChild(modal);
                    resolve(null);
                }, 300);
            };

            // Enter key press
            passwordInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            };

            // Clear error on input
            passwordInput.oninput = () => {
                errorElement.textContent = '';
                passwordInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            };
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

            this.isLoading = true;
            this.triggerLoadingState(true);

            const response = await fetch(`${this.apiBaseUrl}/transactions/${userId}?limit=${limit}`);

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load transaction history');
            }

            this.transactionHistory = result.transactions || [];
            console.log(`✅ Loaded ${this.transactionHistory.length} transactions`);

            this.isLoading = false;
            this.triggerLoadingState(false);

            return {
                success: true,
                transactions: this.transactionHistory,
                count: result.count || 0
            };

        } catch (error) {
            console.error('❌ Get transaction history failed:', error);
            this.isLoading = false;
            this.triggerLoadingState(false);
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

    // 🎯 CHECK WALLET ACTIVATION
    async checkWalletActivation(address = null) {
        try {
            const walletAddress = address || this.getAddress();
            if (!walletAddress) {
                throw new Error('No wallet address available');
            }

            console.log('🔍 Checking wallet activation for:', walletAddress);

            const response = await fetch(`${this.apiBaseUrl}/activation/${walletAddress}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to check activation');
            }

            return {
                success: true,
                isActive: result.isActive || false,
                canSend: result.canSend || false,
                message: result.message || '',
                currentBalance: result.currentBalance || '0',
                requiredBalance: result.requiredBalance || '0'
            };

        } catch (error) {
            console.error('❌ Check wallet activation failed:', error);
            return {
                success: false,
                error: error.message,
                isActive: false,
                canSend: false
            };
        }
    }

    // ============================================
    // 🎯 UI HELPER FUNCTIONS
    // ============================================

    showLoading(message = 'Loading...') {
        // Create or show loading overlay
        let loadingOverlay = document.getElementById('walletLoadingOverlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'walletLoadingOverlay';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 99998;
                backdrop-filter: blur(5px);
            `;
            
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 50px;
                height: 50px;
                border: 3px solid rgba(212, 175, 55, 0.3);
                border-top: 3px solid #D4AF37;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
            
            const text = document.createElement('div');
            text.id = 'loadingText';
            text.style.cssText = `
                color: #D4AF37;
                margin-top: 20px;
                font-size: 16px;
                font-weight: 600;
            `;
            text.textContent = message;
            
            loadingOverlay.appendChild(spinner);
            loadingOverlay.appendChild(text);
            document.body.appendChild(loadingOverlay);
            
            // Add CSS animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        } else {
            loadingOverlay.style.display = 'flex';
            const text = document.getElementById('loadingText');
            if (text) text.textContent = message;
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('walletLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // 🎯 SHOW SUCCESS NOTIFICATION
    showSuccess(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        } else if (typeof window.showMessage === 'function') {
            window.showMessage(message, 'success');
        } else {
            // Create custom notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            notification.innerHTML = `✅ ${message}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
            
            // Add CSS animations
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 🎯 SHOW ERROR NOTIFICATION
    showError(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else if (typeof window.showMessage === 'function') {
            window.showMessage(message, 'error');
        } else {
            // Create custom notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
                word-wrap: break-word;
            `;
            notification.innerHTML = `❌ ${message}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 5000);
        }
    }

    // ============================================
    // 🎯 EVENT TRIGGERS
    // ============================================

    triggerBalanceUpdate() {
        console.log('🎯 Triggering balance update event');

        const event = new CustomEvent('balance-updated', {
            detail: {
                wallet: this.currentWallet,
                userId: this.userId,
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(event);
    }

    triggerHistoryUpdate() {
        console.log('🎯 Triggering history update event');

        const event = new CustomEvent('history-updated', {
            detail: {
                transactions: this.transactionHistory,
                count: this.transactionHistory.length,
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(event);
    }

    triggerLoadingState(isLoading) {
        const event = new CustomEvent('loading-state', {
            detail: { isLoading: isLoading }
        });
        window.dispatchEvent(event);
    }

    triggerWalletLoaded() {
        console.log('🎯 Triggering wallet loaded event');

        const event = new CustomEvent('wallet-loaded', {
            detail: {
                wallet: this.currentWallet,
                userId: this.userId,
                hasWallet: true,
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(event);

        if (typeof window.onWalletLoaded === 'function') {
            window.onWalletLoaded(this.currentWallet, this.userId);
        }
    }

    // ============================================
    // 🎯 WALLET SUCCESS HANDLERS
    // ============================================

    handleWalletCreationSuccess(buttonElement) {
        console.log('🎯 Handling wallet creation success');

        // 1. Reset the button
        this.resetButton(buttonElement);

        // 2. Close the create modal
        const createModal = document.getElementById('createWalletModal');
        if (createModal) {
            createModal.style.display = 'none';
            console.log('✅ Create modal closed');
        }

        // 3. Clear password fields
        const passwordInputs = document.querySelectorAll('#createWalletModal input[type="password"]');
        passwordInputs.forEach(input => input.value = '');

        // 4. Show success message
        this.showSuccess('✅ Wallet created successfully!');

        // 5. Trigger wallet loaded event
        this.triggerWalletLoaded();

        // 6. Call initWallet if it exists
        setTimeout(() => {
            if (typeof window.initWallet === 'function') {
                console.log('🔄 Calling initWallet()...');
                window.initWallet();
            }
        }, 1000);
    }

    handleWalletLoginSuccess(buttonElement) {
        console.log('🎯 Handling wallet login success');

        // 1. Reset the button
        this.resetButton(buttonElement);

        // 2. Close the login modal
        const loginModal = document.getElementById('walletLoginModal');
        if (loginModal) {
            loginModal.style.display = 'none';
            console.log('✅ Login modal closed');
        }

        // 3. Clear password field
        const passwordInput = document.getElementById('walletPasswordLogin');
        if (passwordInput) passwordInput.value = '';

        // 4. Show success message
        this.showSuccess('✅ Wallet login successful!');

        // 5. Trigger wallet loaded event
        this.triggerWalletLoaded();

        // 6. Call initWallet if it exists
        setTimeout(() => {
            if (typeof window.initWallet === 'function') {
                window.initWallet();
            }
        }, 1000);
    }

    // ============================================
    // 🎯 HELPER METHODS
    // ============================================

    resetButton(buttonElement) {
        if (buttonElement) {
            const isCreateBtn = buttonElement.id === 'createWalletBtn';
            buttonElement.textContent = isCreateBtn ? 'Create Wallet' : 'Unlock Wallet';
            buttonElement.disabled = false;
            console.log('✅ Button reset to normal state');
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

    async logout() {
        // Clear state
        this.sessionToken = null;
        this.currentWallet = null;
        this.isInitialized = false;
        this.transactionHistory = [];
        this.lastBalance = 0;

        console.log('✅ Wallet logged out');

        // Show message
        this.showSuccess('Logged out successfully');

        // Reload page after delay
        setTimeout(() => {
            if (typeof window.location !== 'undefined') {
                window.location.reload();
            }
        }, 1500);
    }

    // 🎯 INITIALIZE WALLET - PROPER FLOW
    async initialize() {
        console.log('🔄 Initializing wallet system...');

        try {
            // 1. Check if user is logged in
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

            // 2. Check if wallet exists
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
                this.triggerWalletLoaded();

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
// 🎯 GLOBAL HELPER FUNCTIONS FOR FRONTEND
// ============================================

// 🎯 GLOBAL HELPER FOR CREATE WALLET BUTTON
window.createWalletFromButton = async function(button) {
    console.log('🎯 Create wallet button clicked');

    const password = document.getElementById('walletPassword')?.value;
    const confirmPassword = document.getElementById('confirmWalletPassword')?.value;
    const statusElement = document.getElementById('createWalletStatus');

    // Validate
    if (!password || !confirmPassword) {
        showStatusMessage('Please enter and confirm password', 'error', statusElement);
        return;
    }

    if (password.length < 6) {
        showStatusMessage('Password must be at least 6 characters', 'error', statusElement);
        return;
    }

    if (password !== confirmPassword) {
        showStatusMessage('Passwords do not match', 'error', statusElement);
        return;
    }

    // Set button to loading state
    button.textContent = 'Creating...';
    button.disabled = true;

    // Clear previous status
    if (statusElement) {
        statusElement.innerHTML = '';
    }

    // Create wallet
    const result = await window.walletManager.createWallet(password, button);

    // Handle errors
    if (!result.success) {
        showStatusMessage(`❌ Error: ${result.error}`, 'error', statusElement);
        button.textContent = 'Create Wallet';
        button.disabled = false;
    }
};

// 🎯 GLOBAL HELPER FOR LOGIN BUTTON
window.loginWalletFromButton = async function(button) {
    console.log('🎯 Login wallet button clicked');

    const password = document.getElementById('walletPasswordLogin')?.value;
    const statusElement = document.getElementById('walletLoginStatus');

    // Validate
    if (!password) {
        showStatusMessage('Please enter wallet password', 'error', statusElement);
        return;
    }

    if (password.length < 6) {
        showStatusMessage('Password must be at least 6 characters', 'error', statusElement);
        return;
    }

    // Set button to loading state
    button.textContent = 'Unlocking...';
    button.disabled = true;

    // Clear previous status
    if (statusElement) {
        statusElement.innerHTML = '';
    }

    // Login to wallet
    const result = await window.walletManager.loginToWallet(password, button);

    // Handle errors
    if (!result.success) {
        showStatusMessage(`❌ Error: ${result.error}`, 'error', statusElement);
        button.textContent = 'Unlock Wallet';
        button.disabled = false;
    }
};

// 🎯 GLOBAL SEND TRANSACTION HELPER - COMPLETELY FIXED
window.sendTransaction = async function(toAddress, amount, memo = '', showNotifications = true) {
    console.log('🎯 Global send transaction called');

    try {
        if (!window.walletManager) {
            throw new Error('Wallet manager not initialized');
        }

        // First check wallet activation
        const activationCheck = await window.walletManager.checkWalletActivation();
        if (showNotifications && activationCheck.success && !activationCheck.canSend) {
            window.walletManager.showError(`❌ Cannot send: ${activationCheck.message}`);
            return { 
                success: false, 
                error: activationCheck.message,
                activationRequired: !activationCheck.isActive
            };
        }

        // Send transaction
        const result = await window.walletManager.sendTransaction(toAddress, amount, memo);

        if (result.success) {
            if (showNotifications) {
                window.walletManager.showSuccess('✅ Transaction sent successfully!');
            }
            return result;
        } else {
            throw new Error(result.error || 'Transaction failed');
        }
    } catch (error) {
        console.error('❌ Global send transaction failed:', error);
        if (showNotifications && window.walletManager) {
            window.walletManager.showError(`❌ ${error.message}`);
        }
        return { 
            success: false, 
            error: error.message,
            showError: true
        };
    }
};

// 🎯 GLOBAL GET HISTORY HELPER
window.getTransactionHistory = async function(limit = 100) {
    console.log('🎯 Global get transaction history called');

    try {
        if (!window.walletManager) {
            throw new Error('Wallet manager not initialized');
        }

        const result = await window.walletManager.getTransactionHistory(limit);

        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Failed to load history');
        }
    } catch (error) {
        console.error('❌ Global get history failed:', error);
        return { success: false, error: error.message, transactions: [], count: 0 };
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

// 🎯 GLOBAL GET PRICES HELPER
window.getPrices = async function() {
    console.log('🎯 Global get prices called');

    try {
        if (!window.walletManager) {
            throw new Error('Wallet manager not initialized');
        }

        const result = await window.walletManager.getPrices();

        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Failed to get prices');
        }
    } catch (error) {
        console.error('❌ Global get prices failed:', error);
        return { 
            success: false, 
            error: error.message, 
            prices: { TON: { price: 2.35, change24h: 0, source: 'fallback' } } 
        };
    }
};

// 🎯 SHOW STATUS MESSAGE FUNCTION
function showStatusMessage(message, type = 'info', element) {
    if (!element) return;

    const colors = {
        loading: '#007bff',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    const icon = {
        loading: '🔄',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    element.innerHTML = `
        <div style="color: ${colors[type] || colors.info}; padding: 10px; border-radius: 5px; background: ${colors[type]}10; margin: 10px 0;">
            ${icon[type] || ''} ${message}
        </div>
    `;
}

// 🎯 AUTO-INITIALIZE ON PAGE LOAD
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM Content Loaded - Setting up wallet system');

    const isWalletPage = window.location.pathname.includes('wallet.html') || 
                        window.location.pathname.includes('/wallet') ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');

    if (isWalletPage) {
        console.log('🎯 Auto-initializing wallet system...');

        // Listen for wallet loaded events
        window.addEventListener('wallet-loaded', function(event) {
            console.log('🎯 Wallet loaded event received:', event.detail);
            if (typeof window.initWallet === 'function') {
                console.log('🔄 Calling initWallet() from wallet-loaded event');
                setTimeout(() => window.initWallet(), 500);
            }
        });

        // Listen for balance updates
        window.addEventListener('balance-updated', function() {
            console.log('💰 Balance updated event received');
            if (typeof window.updateWalletDisplay === 'function') {
                window.updateWalletDisplay();
            }
        });

        // Listen for history updates
        window.addEventListener('history-updated', function(event) {
            console.log('📜 History updated event received:', event.detail.count, 'transactions');
            if (typeof window.displayTransactionHistory === 'function') {
                window.displayTransactionHistory(event.detail.transactions);
            }
        });

        // Listen for loading state
        window.addEventListener('loading-state', function(event) {
            const isLoading = event.detail.isLoading;
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = isLoading ? 'flex' : 'none';
            }
        });

        // Initialize after a short delay
        setTimeout(async () => {
            try {
                console.log('🔄 Starting wallet initialization...');
                const result = await window.walletManager.initialize();

                console.log('📊 Initialization result:', result);

                if (result.success) {
                    if (result.hasWallet && !result.showPasswordPrompt) {
                        console.log('✅ Wallet loaded successfully');
                        if (typeof window.initWallet === 'function') {
                            setTimeout(() => window.initWallet(), 500);
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
                    const welcomeScreen = document.getElementById('welcomeScreen');
                    if (welcomeScreen) {
                        welcomeScreen.innerHTML = `
                            <div class="welcome-title">🔒 Please Log In</div>
                            <div class="welcome-subtitle">
                                You need to be logged into your Nemex account to access the wallet.
                            </div>
                            <div class="welcome-actions">
                                <button class="welcome-btn primary" onclick="window.location.href='dashboard.html'">
                                    Go to Mining Dashboard
                                </button>
                            </div>
                        `;
                        welcomeScreen.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('❌ Initialization failed:', error);
            }
        }, 1000);
    }
});

console.log('✅ NEMEX WALLET READY - ALL FIXES APPLIED');