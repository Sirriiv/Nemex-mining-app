// Navigation Management
class Navigation {
    constructor() {
        this.isLoading = false;
        this.initializeNavigation();
    }

    initializeNavigation() {
        this.createNavigationHTML();
        this.setupNavigationEvents();
    }

    createNavigationHTML() {
        const navHTML = `
            <button class="nav-item active" data-section="home">
                <div class="nav-icon">🏠</div>
                <div class="nav-label">Home</div>
            </button>
            <button class="nav-item" data-section="tasks">
                <div class="nav-icon">📋</div>
                <div class="nav-label">Tasks</div>
            </button>
            <button class="nav-item" data-section="buy">
                <div class="nav-icon">🛒</div>
                <div class="nav-label">Buy</div>
            </button>
            <button class="nav-item" data-section="referrals">
                <div class="nav-icon">👥</div>
                <div class="nav-label">Referrals</div>
            </button>
            <button class="nav-item" data-section="wallet">
                <div class="nav-icon">💰</div>
                <div class="nav-label">Wallet</div>
            </button>
        `;
        
        document.getElementById('mainNav').innerHTML = navHTML;
    }

    setupNavigationEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (this.isLoading) return;
                
                this.switchSection(e.currentTarget);
            });
        });
    }

    switchSection(clickedItem) {
        const target = clickedItem.getAttribute('data-section');
        
        // Disable navigation
        this.isLoading = true;
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.style.pointerEvents = 'none';
        });
        
        window.nemexApp.showLoading('Loading...');
        
        setTimeout(() => {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            clickedItem.classList.add('active');
            
            setTimeout(() => {
                window.nemexApp.hideLoading();
                // Re-enable navigation
                this.isLoading = false;
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.style.pointerEvents = 'auto';
                });
            }, 300);
        }, 1500);
    }
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new Navigation();
});