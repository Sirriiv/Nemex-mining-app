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
            
            // Show main app
            this.showMainApp();
            
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
                // In a real app, verify token with backend
                this.currentUser = JSON.parse(localStorage.getItem('nemex_user'));
                console.log('✅ User authenticated:', this.currentUser?.email);
            } catch (error) {
                console.log('Invalid token, redirecting to login');
                localStorage.removeItem('nemex_token');
                localStorage.removeItem('nemex_user');
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

    logout() {
        localStorage.removeItem('nemex_token');
        localStorage.removeItem('nemex_user');
        window.location.href = 'login.html';
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nemexApp = new NemexApp();
});