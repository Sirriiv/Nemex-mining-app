// assets/js/wallet.js - UPDATED FOR @ton/ton LIBRARY
console.log('🚀 NEMEX WALLET - UPDATED FOR @ton/ton LIBRARY');

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

        // Initialize @ton/ton client
        this.tonClient = null;
        this.initTonClient();

        console.log('✅ Wallet Manager initialized with @ton/ton library');
    }

    // 🎯 INITIALIZE @ton/ton CLIENT
    initTonClient() {
        try {
            if (typeof window.Ton !== 'undefined') {
                // Create a TON client with mainnet endpoint
                this.tonClient = new window.Ton.TonClient({
                    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
                    apiKey: '' // Optional: Add your API key if needed
                });
                console.log('✅ @ton/ton client initialized');
            } else {
                console.warn('⚠️ @ton/ton library not loaded');
            }
        } catch (error) {
            console.error('❌ Failed to initialize @ton/ton client:', error);
        }
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
                headers: { 'Content-Type': 'application/json' },
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

    // 🎯 CREATE WALLET - UPDATED FOR @ton/ton
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });

            const result = await createResponse.json();
            console.log('📦 Create wallet result:', result);

            if (!result.success) {
                console.log('🔄 Trying legacy endpoint...');
                return await this.legacyCreateWallet(userId, walletPassword, buttonElement);
            }

            // ✅ WALLET CREATED - STORE IN MEMORY ONLY
            if (result.wallet && result.wallet.address) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;

                console.log('✅ Wallet created successfully!');

                // ✅ SHOW SUCCESS AND CLOSE MODAL
                this.handleWalletCreationSuccess(buttonElement);

                return {
                    success: true,
                    wallet: result.wallet,
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

    // 🎯 LOGIN TO WALLET - CREATE DATABASE SESSION
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

            // ✅ CREATE DATABASE SESSION AFTER SUCCESSFUL LOGIN
            let sessionToken = null;
            try {
                sessionToken = await this.createDatabaseSession(result.wallet);
                if (sessionToken) {
                    console.log('✅ Database session created and stored');
                } else {
                    console.warn('⚠️ Session creation returned no token');
                }
            } catch (sessionError) {
                console.warn('⚠️ Session creation failed:', sessionError);
                // Continue anyway - user is logged in memory
            }

            // Store wallet in memory
            if (result.wallet && result.wallet.address) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;

                console.log('✅ Wallet login successful!');

                // ✅ SHOW SUCCESS AND CLOSE MODAL
                this.handleWalletLoginSuccess(buttonElement);

                return {
                    success: true,
                    wallet: result.wallet,
                    sessionCreated: !!sessionToken
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

    // 🎯 CREATE DATABASE SESSION (Backend should create in database)
    async createDatabaseSession(walletData) {
        try {
            console.log('📝 Requesting database session creation...');

            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('No user ID for session creation');
            }

            const response = await fetch(`${this.apiBaseUrl}/session/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    walletAddress: walletData.address,
                    action: 'login'
                })
            });

            console.log('📦 Session create response status:', response.status);

            if (!response.ok) {
                console.warn(`⚠️ Session create failed with status: ${response.status}`);
                const errorText = await response.text();
                console.warn('Error response:', errorText);
                return null;
            }

            const result = await response.json();
            console.log('📦 Create session result:', result);

            if (result.success && result.session && result.session.token) {
                this.sessionToken = result.session.token;
                // Store token in localStorage for future automatic login
                localStorage.setItem('nemex_wallet_session', this.sessionToken);
                console.log('✅ Database session token stored');
                return this.sessionToken;
            }

            console.warn('❌ Create session failed (no token in response):', result);
            return null;
        } catch (error) {
            console.error('❌ Create session failed (network error):', error.message);
            return null;
        }
    }

    // 🎯 CHECK DATABASE SESSION (Fetch from database)
    async checkDatabaseSession() {
        try {
            console.log('🔍 Checking database session...');

            // Get token from localStorage
            const storedToken = localStorage.getItem('nemex_wallet_session');
            if (!storedToken) {
                console.log('📭 No session token in localStorage');
                return null;
            }

            this.sessionToken = storedToken;

            // Ask backend to validate session from database
            const response = await fetch(`${this.apiBaseUrl}/session/check`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Session-Token': this.sessionToken
                },
                body: JSON.stringify({ 
                    sessionToken: this.sessionToken,
                    checkOnly: true
                })
            });

            const result = await response.json();
            console.log('📦 Session check result:', result);

            if (result.success && result.hasSession && result.session) {
                // ✅ Session is valid in database
                this.sessionToken = result.session.token;
                this.userId = result.session.user_id;

                // Get wallet data from session
                this.currentWallet = {
                    id: `session_${Date.now()}`,
                    address: result.session.wallet_address || result.session.wallet?.address,
                    format: 'UQ',
                    createdAt: result.session.wallet?.createdAt || new Date().toISOString(),
                    source: 'database_session'
                };

                this.isInitialized = true;
                console.log('✅ Valid database session found');
                return result.session;
            } else {
                // ❌ Session invalid or expired
                console.log('❌ Session invalid or expired, clearing token');
                localStorage.removeItem('nemex_wallet_session');
                this.sessionToken = null;
                return null;
            }

        } catch (error) {
            console.warn('⚠️ Database session check failed:', error.message);
            return null;
        }
    }

    // 🎯 INITIALIZE WALLET - PROPER FLOW
    async initialize() {
        console.log('🔄 Initializing wallet system...');

        try {
            // 1. FIRST: Check for valid database session
            const session = await this.checkDatabaseSession();
            if (session) {
                console.log('✅ Wallet loaded from database session');
                this.triggerWalletLoaded();

                return {
                    success: true,
                    hasWallet: true,
                    hasSession: true,
                    wallet: this.currentWallet
                };
            }

            // 2. NO SESSION: Check if wallet exists in database
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

            const checkResult = await this.checkWalletExists();
            console.log('📋 Wallet check result:', checkResult);

            if (checkResult.success && checkResult.hasWallet) {
                // Wallet exists but no session - user needs to login
                console.log('🔐 Wallet exists, showing password prompt');
                return {
                    success: true,
                    hasWallet: true,
                    wallet: checkResult.wallet,
                    showPasswordPrompt: true
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

    // ============================================
    // 🎯 SEND TRANSACTION FUNCTIONALITY - UPDATED FOR @ton/ton
    // ============================================

    // 🎯 SEND TON TRANSACTION - SIMPLIFIED VERSION
    async sendTransaction(toAddress, amount, memo = '', password = null) {
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

            if (!amount || parseFloat(amount) <= 0) {
                throw new Error('Amount must be a positive number');
            }

            // Validate address format
            if (!toAddress.startsWith('EQ') && !toAddress.startsWith('UQ')) {
                throw new Error('Invalid TON address format. Must start with EQ or UQ');
            }

            // Get password for transaction
            let walletPassword = password;
            if (!walletPassword) {
                // Prompt for password if not provided
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

            // Call backend send endpoint (backend handles @ton/ton operations)
            const response = await fetch(`${this.apiBaseUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            if (!result.success) {
                throw new Error(result.error || 'Transaction failed');
            }

            // Clear password from memory
            walletPassword = null;

            // Refresh balance and history
            setTimeout(() => {
                this.triggerBalanceUpdate();
                this.triggerHistoryUpdate();
            }, 2000);

            return {
                success: true,
                transaction: result.data,
                message: 'Transaction sent successfully!'
            };

        } catch (error) {
            console.error('❌ Send transaction failed:', error);
            return {
                success: false,
                error: error.message || 'Transaction failed. Please try again.'
            };
        }
    }

    // 🎯 PROMPT FOR PASSWORD
    async promptForPassword() {
        return new Promise((resolve) => {
            // Create a password prompt modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99999;
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background: #121212;
                padding: 30px;
                border-radius: 16px;
                width: 90%;
                max-width: 400px;
                text-align: center;
                border: 2px solid #D4AF37;
            `;

            content.innerHTML = `
                <div style="color: #D4AF37; font-size: 20px; font-weight: 700; margin-bottom: 16px;">
                    🔐 Confirm Transaction
                </div>
                <div style="color: #F5F5F5; margin-bottom: 20px; font-size: 14px;">
                    Enter your wallet password to confirm this transaction
                </div>
                <input type="password" id="transactionPassword" 
                       placeholder="Enter wallet password" 
                       style="width: 100%; padding: 12px 16px; 
                              background: rgba(255, 255, 255, 0.05); 
                              border: 1px solid rgba(255, 255, 255, 0.1); 
                              border-radius: 8px; 
                              color: #F5F5F5; 
                              font-size: 16px; 
                              margin-bottom: 20px;">
                <div id="passwordError" style="color: #FF4444; font-size: 12px; margin-bottom: 15px; min-height: 18px;"></div>
                <div style="display: flex; gap: 12px;">
                    <button id="confirmPasswordBtn" 
                            style="flex: 1; 
                                   background: #D4AF37; 
                                   color: #0A0A0A; 
                                   border: none; 
                                   padding: 12px; 
                                   border-radius: 8px; 
                                   font-weight: 600; 
                                   cursor: pointer;">
                        Confirm
                    </button>
                    <button id="cancelPasswordBtn" 
                            style="flex: 1; 
                                   background: transparent; 
                                   color: #D4AF37; 
                                   border: 2px solid #D4AF37; 
                                   padding: 12px; 
                                   border-radius: 8px; 
                                   font-weight: 600; 
                                   cursor: pointer;">
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

            // Confirm button click
            confirmBtn.onclick = () => {
                const password = passwordInput.value.trim();
                if (!password) {
                    errorElement.textContent = 'Password is required';
                    return;
                }
                if (password.length < this.passwordMinLength) {
                    errorElement.textContent = `Password must be at least ${this.passwordMinLength} characters`;
                    return;
                }
                document.body.removeChild(modal);
                resolve(password);
            };

            // Cancel button click
            cancelBtn.onclick = () => {
                document.body.removeChild(modal);
                resolve(null);
            };

            // Enter key press
            passwordInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            };
        });
    }

    // ============================================
    // 🎯 TRANSACTION HISTORY FUNCTIONALITY
    // ============================================

    // 🎯 GET TRANSACTION HISTORY
    async getTransactionHistory(limit = 100, includeReceived = true) {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('Please login to your mining account');
            }

            console.log('📜 Fetching transaction history for user:', userId);

            this.isLoading = true;
            this.triggerLoadingState(true);

            const response = await fetch(`${this.apiBaseUrl}/transactions/${userId}?limit=${limit}&include_received=${includeReceived}`);
            
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
                count: result.count || 0,
                walletAddress: result.walletAddress
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

    // 🎯 SYNC RECEIVED TRANSACTIONS
    async syncReceivedTransactions() {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('Please login to your mining account');
            }

            console.log('🔄 Syncing received transactions...');

            const response = await fetch(`${this.apiBaseUrl}/transactions/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });

            const result = await response.json();
            console.log('📦 Sync result:', result);

            if (!result.success) {
                throw new Error(result.error || 'Sync failed');
            }

            return {
                success: true,
                message: result.message,
                syncedCount: result.syncedCount || 0
            };

        } catch (error) {
            console.error('❌ Sync received transactions failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // 🎯 PRICE & BALANCE FUNCTIONS
    // ============================================

    // 🎯 GET PRICES
    async getPrices() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/price/ton`);
            const result = await response.json();

            if (!result.success) {
                throw new Error('Failed to get prices');
            }

            // Also get NMX price
            const nmxResponse = await fetch(`${this.apiBaseUrl}/price/nmx`).catch(() => null);
            let nmxPrice = { price: 0.01, source: 'default' };

            if (nmxResponse) {
                try {
                    const nmxResult = await nmxResponse.json();
                    if (nmxResult.success) {
                        nmxPrice = { price: nmxResult.price, source: nmxResult.source };
                    }
                } catch (e) {
                    console.warn('⚠️ Failed to parse NMX price:', e);
                }
            }

            return {
                success: true,
                prices: {
                    TON: { 
                        price: parseFloat(result.price) || 2.35,
                        change24h: 0,
                        source: result.source || 'default'
                    },
                    NMX: {
                        price: parseFloat(nmxPrice.price) || 0.01,
                        change24h: 0,
                        source: nmxPrice.source
                    }
                }
            };

        } catch (error) {
            console.error('❌ Get prices failed:', error);
            return {
                success: false,
                error: error.message,
                prices: {
                    TON: { price: 2.35, change24h: 0, source: 'fallback' },
                    NMX: { price: 0.01, change24h: 0, source: 'fallback' }
                }
            };
        }
    }

    // 🎯 GET REAL BALANCE
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

            return {
                success: true,
                balance: parseFloat(result.balance) || 0,
                valueUSD: parseFloat(result.valueUSD) || 0,
                tonPrice: parseFloat(result.tonPrice) || 2.35,
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
    // 🎯 EVENT TRIGGERS
    // ============================================

    // 🎯 TRIGGER BALANCE UPDATE EVENT
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

    // 🎯 TRIGGER HISTORY UPDATE EVENT
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

    // 🎯 TRIGGER LOADING STATE
    triggerLoadingState(isLoading) {
        const event = new CustomEvent('loading-state', {
            detail: { isLoading: isLoading }
        });
        window.dispatchEvent(event);
    }

    // 🎯 HANDLE WALLET CREATION SUCCESS
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
        if (typeof window.showToast === 'function') {
            window.showToast('✅ Wallet created successfully!', 'success');
        } else if (typeof window.showMessage === 'function') {
            window.showMessage('✅ Wallet created successfully!', 'success');
        } else {
            alert('✅ Wallet created successfully!');
        }

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

    // 🎯 HANDLE WALLET LOGIN SUCCESS
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
        if (typeof window.showToast === 'function') {
            window.showToast('✅ Wallet login successful!', 'success');
        }

        // 5. Trigger wallet loaded event
        this.triggerWalletLoaded();

        // 6. Call initWallet if it exists
        setTimeout(() => {
            if (typeof window.initWallet === 'function') {
                window.initWallet();
            }
        }, 1000);
    }

    // 🎯 RESET BUTTON STATE
    resetButton(buttonElement) {
        if (buttonElement) {
            const isCreateBtn = buttonElement.id === 'createWalletBtn';
            buttonElement.textContent = isCreateBtn ? 'Create Wallet' : 'Unlock Wallet';
            buttonElement.disabled = false;
            console.log('✅ Button reset to normal state');
        }
    }

    // 🎯 LEGACY CREATE WALLET
    async legacyCreateWallet(userId, walletPassword, buttonElement = null) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/store-encrypted`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;

                this.handleWalletCreationSuccess(buttonElement);
            } else {
                this.resetButton(buttonElement);
            }

            return result;
        } catch (error) {
            console.error('❌ Legacy create wallet failed:', error);
            this.resetButton(buttonElement);
            return {
                success: false,
                error: 'Wallet creation failed'
            };
        }
    }

    // 🎯 TRIGGER WALLET LOADED EVENT
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

    // 🎯 DELETE WALLET
    async deleteWallet(userId, requirePassword = false) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });

            const result = await response.json();

            if (result.success) {
                // Clear local state
                this.currentWallet = null;
                this.userId = null;
                this.isInitialized = false;
                localStorage.removeItem('nemex_wallet_session');
                
                return {
                    success: true,
                    message: 'Wallet deleted successfully'
                };
            }

            return {
                success: false,
                error: result.error || 'Failed to delete wallet'
            };

        } catch (error) {
            console.error('❌ Delete wallet failed:', error);
            return {
                success: false,
                error: 'Delete failed: ' + error.message
            };
        }
    }

    // 🎯 HELPER METHODS
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

    // 🎯 LOGOUT - CLEAR SESSION FROM DATABASE
    async logout() {
        if (this.sessionToken) {
            try {
                await fetch(`${this.apiBaseUrl}/session/destroy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: this.sessionToken })
                });
            } catch (error) {
                console.warn('⚠️ Session destroy failed:', error);
            }
        }

        // Clear localStorage
        localStorage.removeItem('nemex_wallet_session');

        // Reset state
        this.sessionToken = null;
        this.currentWallet = null;
        this.isInitialized = false;
        this.transactionHistory = [];
        this.tonClient = null;

        console.log('✅ Wallet logged out');

        // Reload page
        setTimeout(() => window.location.reload(), 500);
    }
}

// 🚀 INITIALIZE GLOBAL INSTANCE
window.walletManager = new WalletManager();

// ============================================
// 🎯 GLOBAL HELPER FUNCTIONS FOR FRONTEND
// ============================================

// 🎯 GLOBAL HELPER FOR BUTTON CLICKS
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

// 🎯 GLOBAL SEND TRANSACTION HELPER
window.sendTransaction = async function(toAddress, amount, memo = '') {
    console.log('🎯 Global send transaction called');

    try {
        if (!window.walletManager) {
            throw new Error('Wallet manager not initialized');
        }

        const result = await window.walletManager.sendTransaction(toAddress, amount, memo);

        if (result.success) {
            if (typeof window.showToast === 'function') {
                window.showToast('✅ Transaction sent successfully!', 'success');
            }
            return result;
        } else {
            throw new Error(result.error || 'Transaction failed');
        }
    } catch (error) {
        console.error('❌ Global send transaction failed:', error);
        if (typeof window.showToast === 'function') {
            window.showToast(`❌ ${error.message}`, 'error');
        }
        return { success: false, error: error.message };
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

// 🎯 GLOBAL SYNC TRANSACTIONS HELPER
window.syncTransactions = async function() {
    console.log('🎯 Global sync transactions called');

    try {
        if (!window.walletManager) {
            throw new Error('Wallet manager not initialized');
        }

        const result = await window.walletManager.syncReceivedTransactions();

        if (result.success) {
            if (typeof window.showToast === 'function') {
                window.showToast(`✅ ${result.message}`, 'success');
            }
            return result;
        } else {
            throw new Error(result.error || 'Sync failed');
        }
    } catch (error) {
        console.error('❌ Global sync failed:', error);
        if (typeof window.showToast === 'function') {
            window.showToast(`❌ ${error.message}`, 'error');
        }
        return { success: false, error: error.message };
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
                    if (result.hasWallet && result.hasSession) {
                        console.log('✅ Wallet loaded from database session');
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

console.log('✅ NEMEX WALLET READY - Updated for @ton/ton library');