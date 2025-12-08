// assets/js/wallet.js - DATABASE SESSION VERSION v10.0
console.log('🚀 NEMEX WALLET v10.0 - DATABASE SESSIONS');

class WalletManager {
    constructor() {
        this.apiBaseUrl = '/api/wallet';
        this.currentWallet = null;
        this.userId = null;
        this.sessionToken = null;
        this.isInitialized = false;
        
        console.log('✅ Wallet Manager initialized');
    }
    
    // 🎯 GET SESSION FROM DATABASE
    async getDatabaseSession() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/session/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include' // For cookies if using them
            });
            
            const result = await response.json();
            
            if (result.success && result.session) {
                this.sessionToken = result.session.token;
                this.userId = result.session.user_id;
                this.currentWallet = result.session.wallet;
                this.isInitialized = true;
                
                console.log('✅ Database session found');
                return result.session;
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ Database session check failed:', error.message);
            return null;
        }
    }
    
    // 🎯 CREATE DATABASE SESSION
    async createDatabaseSession(walletData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/session/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    walletId: walletData.id,
                    walletAddress: walletData.address
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.sessionToken = result.session.token;
                console.log('✅ Database session created');
                return result.session;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Create session failed:', error);
            return null;
        }
    }
    
    // 🎯 DESTROY DATABASE SESSION
    async destroyDatabaseSession() {
        if (!this.sessionToken) return;
        
        try {
            await fetch(`${this.apiBaseUrl}/session/destroy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.sessionToken })
            });
            
            console.log('✅ Database session destroyed');
        } catch (error) {
            console.warn('⚠️ Destroy session failed:', error);
        }
        
        this.sessionToken = null;
        this.currentWallet = null;
        this.isInitialized = false;
    }
    
    // 🎯 CHECK IF WALLET EXISTS
    async checkWalletExists() {
        const userId = this.getCurrentUserId();
        if (!userId) return { success: false, requiresLogin: true };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });
            
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // 🎯 CREATE WALLET WITH DATABASE SESSION
    async createWallet(walletPassword) {
        const userId = this.getCurrentUserId();
        if (!userId) return { success: false, error: 'Please login first' };
        
        try {
            // 1. Create wallet
            const createResponse = await fetch(`${this.apiBaseUrl}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });
            
            const result = await createResponse.json();
            
            if (!result.success) return result;
            
            // 2. Create database session
            const session = await this.createDatabaseSession(result.wallet);
            
            if (session) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                
                console.log('✅ Wallet created with database session');
                this.triggerWalletLoaded();
            }
            
            return result;
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // 🎯 LOGIN TO WALLET WITH DATABASE SESSION
    async loginToWallet(walletPassword) {
        const userId = this.getCurrentUserId();
        if (!userId) return { success: false, error: 'Please login first' };
        
        try {
            // 1. Verify wallet password
            const loginResponse = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    walletPassword: walletPassword
                })
            });
            
            const result = await loginResponse.json();
            
            if (!result.success) return result;
            
            // 2. Create database session
            const session = await this.createDatabaseSession(result.wallet);
            
            if (session) {
                this.currentWallet = result.wallet;
                this.userId = userId;
                this.isInitialized = true;
                
                console.log('✅ Wallet login with database session');
                this.triggerWalletLoaded();
            }
            
            return result;
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // 🎯 INITIALIZE WITH DATABASE SESSION
    async initialize() {
        console.log('🔄 Initializing with database sessions...');
        
        // 1. Check for existing database session
        const session = await this.getDatabaseSession();
        
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
        
        // 2. No session, check if wallet exists
        const userId = this.getCurrentUserId();
        if (!userId) {
            return {
                success: false,
                requiresLogin: true,
                message: 'Please login to your mining account'
            };
        }
        
        this.userId = userId;
        
        const checkResult = await this.checkWalletExists();
        
        if (checkResult.success && checkResult.hasWallet) {
            // Wallet exists but no session - show login
            return {
                success: true,
                hasWallet: true,
                showPasswordPrompt: true
            };
        } else if (checkResult.success && !checkResult.hasWallet) {
            // No wallet - show create form
            return {
                success: true,
                hasWallet: false,
                showCreateForm: true
            };
        }
        
        return checkResult;
    }
    
    // 🎯 LOGOUT (DESTROY DATABASE SESSION)
    async logout() {
        await this.destroyDatabaseSession();
        console.log('✅ Wallet logged out (database session destroyed)');
        
        window.dispatchEvent(new CustomEvent('wallet-logged-out'));
    }
    
    // 🎯 Helper methods (same as before)
    getCurrentUserId() {
        if (this.userId) return this.userId;
        if (window.miningUser?.id) return window.miningUser.id;
        
        const sessionUser = sessionStorage.getItem('miningUser');
        if (sessionUser) {
            try {
                const userData = JSON.parse(sessionUser);
                if (userData?.id) {
                    this.userId = userData.id;
                    window.miningUser = userData;
                    return this.userId;
                }
            } catch (e) { /* ignore */ }
        }
        
        return null;
    }
    
    triggerWalletLoaded() {
        window.dispatchEvent(new CustomEvent('wallet-loaded', {
            detail: { wallet: this.currentWallet, userId: this.userId }
        }));
        
        if (typeof window.onWalletLoaded === 'function') {
            window.onWalletLoaded(this.currentWallet, this.userId);
        }
    }
    
    hasWallet() { return !!this.currentWallet; }
    getAddress() { return this.currentWallet?.address || null; }
    getShortAddress() {
        const addr = this.getAddress();
        return addr ? addr.substring(0, 8) + '...' + addr.substring(addr.length - 8) : '';
    }
}

// Initialize global instance
window.walletManager = new WalletManager();

console.log('✅ NEMEX WALLET v10.0 READY - Database Sessions');