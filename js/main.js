// Main Application Controller
class NemexApp {
    constructor() {
        this.currentUser = null;
        this.balance = 0;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing NEMEXCOIN App...');
            
            // Check authentication
            await this.checkAuth();
            
            // Initialize modules
            await this.initializeModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('✅ NEMEXCOIN App initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Failed to initialize app');
        }
    }

    async checkAuth() {
        const token = localStorage.getItem('nemex_token');
        if (token) {
            try {
                // Verify token with backend
                const userData = await window.apiService.verifyToken(token);
                this.currentUser = userData;
                this.showMainApp();
            } catch (error) {
                console.log('Invalid token, redirecting to login');
                localStorage.removeItem('nemex_token');
                this.redirectToLogin();
            }
        } else {
            this.redirectToLogin();
        }
    }

    showMainApp() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }

    redirectToLogin() {
        if (!window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('register.html')) {
            window.location.href = 'login.html';
        }
    }

    async initializeModules() {
        // Initialize all core modules
        if (typeof window.navigation !== 'undefined') {
            window.navigation.init();
        }
        
        if (typeof window.sectionLoader !== 'undefined') {
            window.sectionLoader.init();
        }
    }

    setupEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settingsButton');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', this.toggleSettings.bind(this));
        }

        // Global error handler
        window.addEventListener('error', this.handleGlobalError.bind(this));
    }

    toggleSettings() {
        const modal = document.getElementById('settingsModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            modal.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    }

    async loadInitialData() {
        if (this.currentUser) {
            try {
                // Load user balance
                const balanceData = await window.apiService.getBalance();
                this.balance = balanceData.balance;
                this.updateBalanceDisplay();
                
                // Load notifications
                await this.loadNotifications();
                
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        }
    }

    updateBalanceDisplay() {
        const balanceEl = document.getElementById('balanceAmount');
        if (balanceEl) {
            balanceEl.textContent = this.balance.toString().padStart(2, '0');
        }
    }

    async loadNotifications() {
        try {
            const notifications = await window.apiService.getNotifications();
            if (typeof window.notificationManager !== 'undefined') {
                window.notificationManager.displayNotifications(notifications);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        this.showError('Something went wrong');
    }

    showError(message) {
        // Create error toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--error);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideDown 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    logout() {
        localStorage.removeItem('nemex_token');
        window.location.href = 'login.html';
    }
}

// Utility function to copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nemexApp = new NemexApp();
});